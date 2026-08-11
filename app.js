/* ============================================================
   FitRecord · 训练记录（v3 升级版）
   纯前端 PWA，离线可用，本地存储
   © 2026 Acffx · 原创 · 保留所有权利
   未经许可禁止商用、二次发布、去除版权标识
   新增：计划分组 / RPE快捷录入 / 上次成绩预填 / 自动进阶 /
        PR实时检测 / 周量柱状图 / 力量曲线 / 历史补录 / 有氧记录 /
        AI分析 / 身体数据全屏页
   ============================================================ */
'use strict';

const DB_KEY = 'fitrecord_v3';
const DAY_MS = 86400000;

/* ---------- 动作库来自 exercises.js ---------- */
const EX_BY_ID = Object.fromEntries(BUILTIN.map(e => [e.id, e]));
const EX_BY_NAME = Object.fromEntries(BUILTIN.map(e => [e.name, e]));

const PRESETS = [
  {id:'prs_push',name:'经典胸部训练',part:'胸',level:'中级',duration:'45分钟',count:5,items:['g_bench','g_incline_db','g_machine_press','g_fly','g_tri_push']},
  {id:'prs_pull',name:'经典背部训练',part:'背',level:'中级',duration:'50分钟',count:5,items:['g_pullup','g_bb_row','g_lat_pd','g_seated_row','g_bb_curl']},
  {id:'prs_legs',name:'经典腿部训练',part:'腿',level:'中级',duration:'55分钟',count:6,items:['g_squat','g_legpress','g_rdl','g_leg_ext','g_leg_curl','g_calf_raise']},
  {id:'prs_shoulders',name:'经典肩部训练',part:'肩',level:'初级',duration:'40分钟',count:5,items:['g_ohp','g_db_lat','g_front_raise','g_facepull_sh','g_arnold']},
  {id:'prs_full',name:'全身入门训练',part:'全身',level:'初级',duration:'50分钟',count:5,items:['g_squat','g_bench','g_pullup','g_ohp','g_plank']},
];

const DEFAULT_FOLDERS = [
  {id:'fld_ppl', name:'推拉腿循环A'},
];
const DEFAULT_PLANS = [
  {id:'plan_push',name:'推日（胸肩三头）',folderId:'fld_ppl',items:['g_bench','g_incline_db','g_machine_press','g_ohp','g_db_lat','g_tri_push']},
  {id:'plan_pull',name:'拉日（背二头）',folderId:'fld_ppl',items:['g_pullup','g_bb_row','g_lat_pd','g_seated_row','g_bb_curl','g_hammer']},
  {id:'plan_legs',name:'腿日（股四腘绳臀）',folderId:'fld_ppl',items:['g_squat','g_legpress','g_rdl','g_bulgarian','g_leg_ext','g_leg_curl','g_calf_raise']},
  {id:'plan_upper',name:'上肢综合',folderId:null,items:['g_bench','g_lat_pd','g_ohp','g_tri_push','g_bb_curl']},
];

const CARDIO_TYPES = ['跑步','爬坡走','骑行','游泳','椭圆机','跳绳','划船机','其他'];

/* ---------- 状态 ---------- */
let state = loadState();
let currentTab = 'train';
let statsSub = 'history';
let statsMonth = new Date();
let session = null;
let durInterval = null;
let restInterval = null;
let restSec = 60;
let pickerPart = '全部';
let pickerQuery = '';
let libPart = '全部';
let libTarget = '全部';
let libQuery = '';
let activeDetail = null;
let activeFolder = null;
let exProgId = '';

function defaultState(){
  return {
    version:3,
    profile:{name:'',height:170,weight:65,age:25,goal:'增肌',regDate:todayStr()},
    folders:DEFAULT_FOLDERS.map(f=>({...f})),
    plans:DEFAULT_PLANS.map(p=>({...p})),
    workouts:[],
    bodyLog:[],
    checkins:[],
    points:0,
    customEx:[],
    settings:{restSec:60}
  };
}
function loadState(){
  let raw = null;
  try{ raw = localStorage.getItem(DB_KEY); }catch(e){}
  if(raw){
    try{ return normalize(JSON.parse(raw)); }catch(e){}
  }
  // 迁移 v2 / v1
  for(const key of ['fitrecord_v2','fitrecord_v1']){
    try{
      const old = localStorage.getItem(key);
      if(!old) continue;
      const v = JSON.parse(old);
      const s = defaultState();
      s.profile = Object.assign(s.profile, v.profile || {});
      if(v.plans && v.plans.length) s.plans = v.plans.map(p=>({id:p.id,name:p.name,items:p.items||[],folderId:p.folderId||null}));
      if(v.folders) s.folders = v.folders;
      s.workouts = (v.workouts || []).map(w => ({
        type:'strength', notes:'', programWeek:1, prs:[], ...w,
        items:(w.items||[]).map(it=>({...it, sets:(it.sets||[]).map(st=>({weight:st.weight||0,reps:st.reps||0,rpe:st.rpe||'',done:!!st.done}))}))
      }));
      s.bodyLog = v.bodyLog || [];
      s.checkins = v.checkins || [];
      s.points = v.points || 0;
      s.settings = Object.assign(s.settings, v.settings || {});
      return s;
    }catch(e){}
  }
  return defaultState();
}
function normalize(s){
  s.folders = s.folders || [];
  s.plans = (s.plans||[]).map(p=>({folderId:null, ...p}));
  s.workouts = (s.workouts||[]).map(w=>({type:'strength', notes:'', prs:[], ...w}));
  s.bodyLog = s.bodyLog || [];
  s.checkins = s.checkins || [];
  s.customEx = s.customEx || [];
  s.settings = Object.assign({restSec:60}, s.settings||{});
  return s;
}
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }

/* ---------- 工具 ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
function todayStr(d=new Date()){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}
function fmtClock(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  return (h? h+'小时':'') + m + '分钟';
}
function fmtShortDur(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  if(h) return h+'小时'+(m?(m+'分'):'');
  return m+'分钟';
}
function fmtDate(iso){
  const d = new Date(iso.length===10 ? iso+'T12:00:00' : iso);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}
function fmtMD(iso){
  const d = new Date(iso.length===10 ? iso+'T12:00:00' : iso);
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function toast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'),2200);
}
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(){ return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function resolveEx(ref){
  return EX_BY_ID[ref] || EX_BY_NAME[ref] || (state.customEx||[]).find(e=>e.id===ref||e.name===ref) || null;
}
function allExercises(){
  return [...BUILTIN, ...(state.customEx||[])];
}
function partColor(part){
  const map={'胸':'#ef4444','背':'#3b82f6','腿':'#22c55e','肩':'#f59e0b','手臂':'#a855f7','核心':'#14b8a6','有氧':'#ec4899','全身':'#6366f1'};
  return map[part] || '#6b7280';
}
function shade(hex, f){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(r*f); g=Math.round(g*f); b=Math.round(b*f);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function estimate1RM(w, r){ if(!w || !r) return 0; return Math.round(w * (1 + r/30)); }
function estimateKcal(durationSec, totalReps){ return Math.round(durationSec/60 * 8 + totalReps * 0.5); }
function daysSince(d){ return Math.floor((Date.now() - new Date(d).getTime()) / DAY_MS); }
function lastBodyWeight(){ return state.bodyLog.length ? state.bodyLog[state.bodyLog.length-1].weight : state.profile.weight; }
function bodyWeightOn(dateStr){
  for(let i=state.bodyLog.length-1;i>=0;i--){
    if(state.bodyLog[i].date <= dateStr) return state.bodyLog[i].weight;
  }
  return state.profile.weight;
}
function muscleVolume(workout){
  const vol={};
  (workout.items||[]).forEach(it=>{
    const ex=resolveEx(it.exId);
    const part = ex ? ex.part : (it.part || '其他');
    const target = ex ? ex.target : part;
    const v = (it.sets||[]).reduce((a,s)=>a+((+s.weight||0)*(+s.reps||0)),0);
    vol[part] = (vol[part]||0)+v;
    if(target && target!==part) vol[target] = (vol[target]||0)+v*0.5;
  });
  return vol;
}
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }

/* ============================================================
   彩色主题图片（内联 SVG，离线可用）
   ============================================================ */
const ART_GLYPH = {
  '胸': `<path d="M80 96 Q150 62 220 96 Q226 142 204 168 Q150 190 96 168 Q74 142 80 96 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M150 90 L150 172" stroke="rgba(255,255,255,.5)" stroke-width="4" stroke-linecap="round"/>
    <path d="M92 110 Q120 92 146 112" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M208 110 Q180 92 154 112" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M96 136 Q122 122 146 138" stroke="rgba(255,255,255,.55)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M204 136 Q178 122 154 138" stroke="rgba(255,255,255,.55)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M118 168 Q150 158 182 168" stroke="rgba(255,255,255,.4)" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  '背': `<path d="M74 84 Q150 58 226 84 L186 200 Q150 216 114 200 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M150 74 L150 202" stroke="rgba(255,255,255,.5)" stroke-width="4" stroke-linecap="round"/>
    <path d="M88 100 Q116 150 130 190" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M212 100 Q184 150 170 190" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M118 84 Q150 70 182 84" stroke="rgba(255,255,255,.6)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M104 128 Q128 140 142 142 M196 128 Q172 140 158 142" stroke="rgba(255,255,255,.4)" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  '腿': `<path d="M112 66 Q96 140 108 214 Q124 232 140 214 Q150 140 140 66 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M188 66 Q204 140 192 214 Q176 232 160 214 Q150 140 160 66 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M122 84 Q112 140 120 200" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M178 84 Q188 140 180 200" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="126" cy="152" r="9" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4"/>
    <circle cx="174" cy="152" r="9" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4"/>`,
  '肩': `<path d="M64 136 Q60 84 116 82 Q152 82 152 122 Q152 158 106 160 Q68 160 64 136 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M236 136 Q240 84 184 82 Q148 82 148 122 Q148 158 194 160 Q232 160 236 136 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M76 118 Q86 92 118 90" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M224 118 Q214 92 182 90" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M150 96 L150 190" stroke="rgba(255,255,255,.45)" stroke-width="4" stroke-linecap="round"/>
    <path d="M128 196 Q150 188 172 196" stroke="rgba(255,255,255,.4)" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  '手臂': `<circle cx="128" cy="128" r="46" fill="rgba(255,255,255,.10)"/>
    <path d="M96 108 Q118 82 148 92" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M162 148 L224 108" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <path d="M224 108 L238 92" stroke="rgba(255,255,255,.6)" stroke-width="8" stroke-linecap="round"/>
    <path d="M100 150 Q126 164 152 152" stroke="rgba(255,255,255,.5)" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  '核心': `<g fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.7)" stroke-width="3">
    <rect x="112" y="72" width="34" height="34" rx="10"/><rect x="154" y="72" width="34" height="34" rx="10"/>
    <rect x="112" y="114" width="34" height="34" rx="10"/><rect x="154" y="114" width="34" height="34" rx="10"/>
    <rect x="112" y="156" width="34" height="34" rx="10"/><rect x="154" y="156" width="34" height="34" rx="10"/></g>`,
  '有氧': `<path d="M36 150 L96 150 L116 104 L146 196 L170 150 L264 150" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M150 96 Q138 76 118 80 Q100 84 100 102 Q100 122 150 144 Q200 122 200 102 Q200 84 182 80 Q162 76 150 96 Z" fill="rgba(255,255,255,.14)"/>`,
  '全身': `<circle cx="150" cy="72" r="16" fill="rgba(255,255,255,.14)"/>
    <path d="M150 92 L150 160" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <path d="M150 110 L106 84 M150 110 L194 84" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <path d="M82 84 L218 84" stroke="rgba(255,255,255,.7)" stroke-width="5" stroke-linecap="round"/>
    <rect x="62" y="72" width="14" height="24" rx="4" fill="rgba(255,255,255,.5)"/><rect x="224" y="72" width="14" height="24" rx="4" fill="rgba(255,255,255,.5)"/>
    <path d="M150 160 L120 214 M150 160 L180 214" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
};
function artSVG(part, seed=0){
  const c = partColor(part);
  const glyph = ART_GLYPH[part] || ART_GLYPH['全身'];
  const id = 'g' + hashStr(part+seed);
  return `<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0b1220"/><stop offset=".55" stop-color="${shade(c,.42)}"/><stop offset="1" stop-color="${shade(c,.78)}"/>
      </linearGradient>
      <radialGradient id="${id}r" cx=".78" cy=".18" r=".9">
        <stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="300" height="300" fill="url(#${id}b)"/>
    <rect width="300" height="300" fill="url(#${id}r)"/>
    <path d="M-40 330 L120 -30 M30 340 L190 -20" stroke="rgba(255,255,255,.05)" stroke-width="26"/>
    <text x="286" y="282" text-anchor="end" font-size="150" font-weight="800" fill="rgba(255,255,255,.08)" font-family="sans-serif">${part[0]||'练'}</text>
    <g>${glyph}</g>
  </svg>`;
}
function planArt(plan){
  const first = plan.items && plan.items.length ? resolveEx(plan.items[0]) : null;
  const part = first ? first.part : '全身';
  return artSVG(part, hashStr(plan.name||'')%5);
}

/* ============================================================
   路由与渲染
   ============================================================ */
function setTab(tab){
  currentTab = tab;
  $$('#tabbar .tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  $('#topbar').classList.toggle('hidden', tab === 'train');
  if(tab !== 'train'){
    const titles={library:'动作库',stats:'统计',me:'我的'};
    $('#topbar-title').textContent = titles[tab] || 'FitRecord';
  }
  render();
}
function render(){
  if(currentTab==='train') $('#view').innerHTML = renderHome();
  else if(currentTab==='library') $('#view').innerHTML = renderLibrary();
  else if(currentTab==='stats') $('#view').innerHTML = renderStats();
  else if(currentTab==='me') $('#view').innerHTML = renderMe();
}

/* ============================================================
   训练首页（分组文件夹 + 彩色图片）
   ============================================================ */
function plansInFolder(fid){ return state.plans.filter(p=>p.folderId===fid); }

function folderCardHTML(folder){
  const plans = plansInFolder(folder.id);
  const imgs = plans.slice(0,3);
  let cells = imgs.map((p,i)=>`<div class="folder-cell" ${i===0&&imgs.length>1?'style="grid-row:span 2"':''}>${planArt(p)}</div>`).join('');
  if(!imgs.length) cells = '<div class="folder-cell" style="grid-row:span 2"><div class="placeholder">＋</div></div>';
  if(imgs.length===1) cells = `<div class="folder-cell" style="grid-column:span 2">${planArt(imgs[0])}</div>`;
  if(imgs.length===2) cells += '';
  return `
    <div class="folder-card">
      <button class="plan-edit-btn" data-act="editFolder" data-id="${folder.id}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <div class="folder-grid" data-act="openFolder" data-id="${folder.id}">${cells}</div>
      <div class="folder-foot" data-act="openFolder" data-id="${folder.id}">
        <span class="folder-count">${plans.length}个计划</span>
        <span class="folder-name">${escapeHtml(folder.name)}</span>
      </div>
    </div>`;
}
function planCardHTML(p){
  return `
    <div class="folder-card">
      <button class="plan-edit-btn" data-act="editPlan" data-id="${p.id}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <div class="folder-grid single" data-act="startPlan" data-id="${p.id}"><div class="folder-cell">${planArt(p)}</div></div>
      <div class="folder-foot" data-act="startPlan" data-id="${p.id}">
        <span class="folder-count">${p.items.length}个动作</span>
        <span class="folder-name">${escapeHtml(p.name)}</span>
      </div>
    </div>`;
}
function renderHome(){
  const folders = state.folders.map(folderCardHTML).join('');
  const solo = state.plans.filter(p=>!p.folderId || !state.folders.find(f=>f.id===p.folderId)).map(planCardHTML).join('');

  const libCards = PRESETS.map(pr=>`
    <div class="lib-card" data-act="startPreset" data-id="${pr.id}">
      <div class="lib-bg">${artSVG(pr.part, 3)}</div>
      <div class="lib-overlay"></div>
      <div class="lib-body">
        <div class="lib-title">${escapeHtml(pr.name)}</div>
        <div class="lib-meta">
          <span class="level">${pr.level}</span>
          <span class="meta-pill">${pr.count}个动作</span>
          <span class="meta-pill">${pr.duration}</span>
        </div>
      </div>
    </div>`).join('');

  return `
    <div class="home-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="brand">FitRecord</div>
        <button class="notify-badge" data-act="openNotify" style="border:0;cursor:pointer;"><span style="width:7px;height:7px;border-radius:50%;background:var(--accent);display:inline-block;"></span> 新通知</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-custom" data-act="newFolder" style="display:inline-flex;align-items:center;gap:4px;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          分组
        </button>
        <button class="plus-btn" data-act="newPlan" title="新建训练计划"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
      </div>
    </div>
    <div class="date-str">${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日</div>

    <div class="section-title">
      <h2>我的训练计划 <span style="font-size:18px;">🔥</span></h2>
    </div>
    ${folders}${solo || ''}${(!folders && !solo) ? '<div class="empty">还没有训练计划，点击右上角 + 创建</div>' : ''}

    <div class="section-title"><h2>系统内置训练库 <span style="font-size:18px;">🚩</span></h2></div>
    <div class="lib-scroll">${libCards}</div>
  `;
}

/* ---------- 分组详情页 ---------- */
function openFolder(fid){
  activeFolder = fid;
  const f = state.folders.find(x=>x.id===fid);
  if(!f) return;
  $('#folder-view').classList.remove('hidden');
  $('#tabbar').classList.add('hidden');
  $('#topbar').classList.add('hidden');
  renderFolderView();
}
function closeFolderView(){
  $('#folder-view').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  if(currentTab!=='train') $('#topbar').classList.remove('hidden');
  activeFolder = null;
}
function renderFolderView(){
  const f = state.folders.find(x=>x.id===activeFolder);
  if(!f){ closeFolderView(); return; }
  const plans = plansInFolder(f.id);
  const first = plans[0];
  const art = first ? planArt(first) : artSVG('全身');
  const rows = plans.map(p=>{
    const lastW = [...state.workouts].reverse().find(w=>w.planName===p.name);
    return `<div class="plan-row">
      <div class="plan-row-img" data-act="startPlan" data-id="${p.id}">${planArt(p)}</div>
      <div class="plan-row-info" data-act="startPlan" data-id="${p.id}">
        <div class="plan-row-name">${escapeHtml(p.name)}</div>
        <div class="plan-row-meta">${p.items.length}个动作${lastW?' · 上次 '+fmtMD(lastW.date):''}</div>
      </div>
      <button class="plan-edit-btn" style="position:static;box-shadow:none;background:var(--accent-light);" data-act="editPlan" data-id="${p.id}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="plan-row-go" data-act="startPlan" data-id="${p.id}">开始</button>
    </div>`;
  }).join('');
  $('#folder-view').innerHTML = `
    <div class="detail-top">
      <div class="art-bg">${art}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button class="back" data-act="closeFolder"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button class="ai-btn" data-act="editFolder" data-id="${f.id}" style="background:rgba(255,255,255,.2);box-shadow:none;">编辑分组</button>
      </div>
      <div>
        <h2>${escapeHtml(f.name)}</h2>
        <div class="sub">${plans.length}个训练计划</div>
      </div>
    </div>
    <div class="detail-body">
      ${rows || '<div class="empty">分组里还没有计划<br>点击「编辑分组」把计划放进来</div>'}
    </div>
  `;
}

/* ============================================================
   动作库
   ============================================================ */
function renderLibrary(){
  const targets = GYM_TARGETS[libPart] || ['全部'];
  const list = BUILTIN.filter(ex=>{
    const matchPart = libPart === '全部' || ex.part === libPart;
    const matchTarget = libTarget === '全部' || ex.target === libTarget;
    const q = libQuery.toLowerCase();
    const matchQ = !q || ex.name.toLowerCase().includes(q) || ex.equip.toLowerCase().includes(q) || ex.target.toLowerCase().includes(q);
    return matchPart && matchTarget && matchQ;
  });
  const partNav = GYM_PARTS.map(p=>`
    <div class="lib-side-item ${libPart===p?'active':''}" data-act="libPart" data-part="${p}">
      <span class="lib-dot" style="background:${p==='全部'?'#9ca3af':partColor(p)}"></span>
      <span>${p}</span>
    </div>`).join('');
  const targetChips = targets.map(t=>`<span class="lib-chip ${libTarget===t?'active':''}" data-act="libTarget" data-target="${t}">${t}</span>`).join('');
  const cards = list.map(ex=>{
    const svg = EX_SVG[ex.svg] || '';
    return `<div class="lib-ex-card" data-act="libDetail" data-id="${ex.id}">
      <div class="lib-ex-img" style="background:${partColor(ex.part)+'18'}">${svg}</div>
      <div class="lib-ex-name">${escapeHtml(ex.name)}</div>
      <div class="lib-ex-tags">
        <span class="tag">${escapeHtml(ex.target)}</span>
        <span class="tag grey">${escapeHtml(ex.equip)}</span>
      </div>
    </div>`;
  }).join('');
  return `
    <div class="brand" style="padding-top:8px;margin-bottom:10px;">动作库</div>
    <div class="library-wrap">
      <aside class="lib-side">${partNav}</aside>
      <div class="lib-main">
        <div class="lib-search-bar">
          <input type="text" id="lib-search" placeholder="搜索动作名称" value="${escapeHtml(libQuery)}"/>
        </div>
        <div class="lib-targets">${targetChips}</div>
        <div class="lib-grid">
          ${cards || '<div class="empty" style="grid-column:1/3;padding:30px 0;">没有匹配动作</div>'}
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   统计页（历史记录 / 训练统计）
   ============================================================ */
function renderStats(){
  return statsSub === 'history' ? renderHistory() : renderSummary();
}

function renderHistory(){
  const y = statsMonth.getFullYear(), m = statsMonth.getMonth();
  const monthKey = `${y}-${String(m+1).padStart(2,'0')}`;
  const monthWorkouts = state.workouts.filter(w=>w.date.startsWith(monthKey));
  const days = new Set(monthWorkouts.map(w=>w.date)).size;
  const totalSec = monthWorkouts.reduce((a,w)=>a+(w.duration||0),0);

  const firstDay = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const byDate = {};
  monthWorkouts.forEach(w=>{ (byDate[w.date] = byDate[w.date]||[]).push(w); });

  let cells = '';
  for(let i=0;i<firstDay;i++) cells += '<div></div>';
  const today = todayStr();
  for(let d=1; d<=daysInMonth; d++){
    const ds = `${monthKey}-${String(d).padStart(2,'0')}`;
    const isToday = ds === today;
    const list = byDate[ds] || [];
    if(list.length){
      const total = list.reduce((a,w)=>a+(w.duration||0),0);
      const planName = list[0].type==='cardio' ? '有氧' : (list[0].planName || '训练');
      const dots = list.slice(0,3).map(w=>{
        if(w.type==='cardio') return `<span class="cal-dot" style="background:${partColor('有氧')}"></span>`;
        const counts={};
        w.items.forEach(it=>{ counts[it.part]=(counts[it.part]||0)+it.sets.length; });
        const mainPart = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '胸';
        return `<span class="cal-dot" style="background:${partColor(mainPart)}"></span>`;
      }).join('');
      cells += `
        <div class="cal-day ${isToday?'today':''}" data-act="viewDay" data-date="${ds}">
          <div class="cal-day-num">${d}</div>
          <div class="cal-dots">${dots}</div>
          <div class="cal-plan">${escapeHtml(planName)}</div>
          <div class="cal-dur">${fmtShortDur(total)}</div>
        </div>`;
    } else if(isToday){
      cells += `<div class="cal-day today" data-act="viewDay" data-date="${ds}"><div class="cal-day-num">${d}</div><div class="cal-dur">待开始</div></div>`;
    } else {
      cells += `<div class="cal-day rest" data-act="viewDay" data-date="${ds}"><div class="cal-day-num">${d}</div><span>休息</span></div>`;
    }
  }

  return `
    <div class="stat-header">
      <span class="tab-text ${statsSub==='history'?'active':''}" data-act="statHistory">历史记录</span>
      <span class="tab-text ${statsSub==='summary'?'active':''}" data-act="statSummary">训练统计</span>
    </div>
    <div class="month-row">
      <div class="month-title">${y}年${m+1}月</div>
      <div class="month-nav">
        <button class="today-btn" data-act="prevMonth">‹</button>
        <button class="today-btn" data-act="todayMonth"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 今天</button>
        <button class="today-btn" data-act="nextMonth">›</button>
      </div>
    </div>
    <div class="stat-summary">
      <div class="stat-item"><div class="v">${days}</div><div class="k">训练日</div></div>
      <div class="stat-item"><div class="v">${fmtShortDur(totalSec)}</div><div class="k">总时长</div></div>
      <div class="stat-item"><div class="v">${monthWorkouts.length}</div><div class="k">训练次数</div></div>
    </div>
    <div class="calendar">
      <div class="cal-weekdays"><div>周日</div><div>周一</div><div>周二</div><div>周三</div><div>周四</div><div>周五</div><div>周六</div></div>
      <div class="cal-days">${cells}</div>
    </div>
  `;
}

/* ---------- 某日记录弹层（含补录入口） ---------- */
/* ---------- v8.11 某日详情页（复刻截图7：记录列表 + 今日状态emoji + 添加历史/有氧/快速记录） ---------- */
function viewDay(dateStr){
  const list = state.workouts.filter(w=>w.date===dateStr);
  const d = new Date(dateStr+'T12:00:00');
  const items = list.map((w,i)=>{
    const isCardio = w.type==='cardio';
    const sub = isCardio
      ? `${fmtShortDur(w.duration||0)}${w.cardio&&w.cardio.distance?' · '+w.cardio.distance+'km':''}${w.cardio&&w.cardio.kcal?' · '+w.cardio.kcal+'kcal':''}`
      : `${fmtShortDur(w.duration||0)} · ${w.items.length}个动作 · ${w.volume}kg`;
    return `<div class="ds-row" data-act="viewWorkout" data-id="${w.id}">
      <div class="ic">${i+1}</div>
      <div class="txt"><div class="t">${escapeHtml(w.planName)}</div><div class="s">${sub}</div></div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </div>`;
  }).join('');
  const isToday = dateStr === todayStr();
  /* v8.14: 深色主题全屏 sheet + ×关闭 + 点击空白关闭 */
  openSheet(`
    <div class="day-sheet day-sheet-dark">
      <div class="ds-head">
        <button class="ds-close" data-act="daySheetClose" aria-label="关闭">×</button>
        <h3>${d.getMonth()+1}月${d.getDate()}日 记录</h3>
        <span class="ds-pick">选择查看类型</span>
      </div>
      ${isToday ? `<div class="ds-state">今日状态</div>
      <div class="ds-emojis" data-act="setStateEmoji">
        ${['😊','😄','🤩','😎','🔥','💪','😴','🤔','😢','😡','🥱','🤒'].map(function(e){return '<div class="ds-emoji" data-emoji="'+e+'">'+e+'</div>';}).join('')}
      </div>` : ''}
      ${items || ''}
      <div class="ds-row alt" data-act="dayAddHistory" data-date="${dateStr}">
        <div class="ic" style="background:transparent;border:1px dashed #3b82f6;color:#3b82f6;">+</div>
        <div class="txt"><div class="t" style="color:#3b82f6;">添加历史记录</div><div class="s">用于添加历史训练记录，不受时间限制</div></div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      <div class="ds-row alt" data-act="dayAddCardio" data-date="${dateStr}">
        <div class="ic" style="background:transparent;border:1px dashed #f59e0b;color:#f59e0b;">+</div>
        <div class="txt"><div class="t" style="color:#f59e0b;">添加有氧记录</div><div class="s">用于添加有氧训练记录，不受时间限制</div></div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  `, /* fullScreen */ true);
}
/* ---------- v8.11 快速记录页（复刻截图8：选择动作 + 提交训练） ---------- */
function dayAddHistory(dateStr){
  /* 用临时 sessions.quick 存动作列表 */
  window._quickItems = [];
  window._quickDate = dateStr;
  openSheet(`
    <div class="quick-sheet">
      <div class="qs-head">
        <span class="qs-back" data-act="viewDay" data-date="${dateStr}">‹</span>
        <span class="qs-title">快速记录</span>
      </div>
      <div class="qs-card" id="quick-times">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><div style="font-size:13px;color:#64748b;">快速训练记录</div></div>
          <div>
            <span class="qs-time-pill" data-st="0">${dateStr} 00:00</span>
            <span class="qs-time-pill" data-st="1" style="margin-left:6px;">${dateStr} 01:00</span>
          </div>
        </div>
      </div>
      <div class="qs-empty" id="quick-empty">
        <div class="ic">🏋️</div>
        <div class="t">还没有添加动作</div>
        <div class="s">点击下方按钮开始添加</div>
      </div>
      <div id="quick-list"></div>
      <div class="qs-actions">
        <button class="qs-btn" data-act="quickAddEx">+ 添加动作</button>
        <button class="qs-btn primary" data-act="quickFinish">完成训练 ✓</button>
      </div>
    </div>
  `, /* fullScreen */ true);
}
function quickRenderList(){
  const list = document.getElementById('quick-list');
  const empty = document.getElementById('quick-empty');
  if(!list) return;
  list.innerHTML = (window._quickItems||[]).map(function(it, idx){
    const ex = resolveEx(it.exId);
    return '<div class="qs-card" style="display:flex;justify-content:space-between;align-items:center;">'+
      '<div><div style="font-weight:700;">'+escapeHtml(ex?ex.name:'未知道动作')+'</div>'+
      '<div style="font-size:12px;color:#94a3b8;">'+it.sets.length+' 组</div></div>'+
      '<button data-act="quickDelEx" data-idx="'+idx+'" style="background:transparent;color:#ef4444;border:0;">🗑</button></div>';
  }).join('');
  if(empty) empty.style.display = (window._quickItems||[]).length ? 'none' : 'block';
}
function quickAddEx(){
  /* 弹动作选择器 */
  window._afterPickQuick = function(exId){
    if(!exId) return;
    window._quickItems = window._quickItems || [];
    window._quickItems.push({exId:exId, sets:[{weight:'',reps:'',done:false}], restSec:0, lb:false});
    closeSheet();
    dayAddHistory(window._quickDate);
    quickRenderList();
  };
  openPicker();
}
function quickDelEx(idx){
  window._quickItems.splice(idx, 1);
  quickRenderList();
}
function quickFinish(){
  if(!window._quickItems || !window._quickItems.length){
    toast('请先添加动作'); return;
  }
  /* 创建训练记录 */
  const date = window._quickDate;
  const items = window._quickItems.map(function(it){
    const ex = resolveEx(it.exId);
    return {exId:it.exId, name:ex?ex.name:'动作', part:ex?ex.part:'其他', equip:ex?ex.equip:'', svg:ex?ex.svg:'', restSec:it.restSec||0, notes:'', sets:it.sets, lb:it.lb||false, supersetWith:null};
  });
  const vol = items.reduce(function(n,it){return n + (it.sets||[]).reduce(function(s,set){return s + ((+set.weight||0)*(+set.reps||0));},0);},0);
  const wo = {
    id: uid(),
    planName: '快速记录',
    date: date,
    startAt: Date.now(),
    duration: 3600,
    paused: 0,
    volume: vol,
    items: items,
    notes: '',
    type: 'strength',
    cultivationSettled: false
  };
  state.workouts.push(wo);
  state.workouts.sort(function(x,y){return (x.date||'').localeCompare(y.date||'');});
  save();
  closeSheet();
  /* 标记状态 emoji */
  if(window._todayEmoji){ wo.mood = window._todayEmoji; save(); }
  toast('已添加 '+date+' 的快速训练记录');
  render();
}
/* ---------- v8.11 有氧记录页（复刻截图9：选择动作 + 时间 + 距离） ---------- */
function dayAddCardio(dateStr){
  window._cardioState = {date:dateStr, kind:'跑步', dur:30, dist:'', kcal:''};
  openSheet(`
    <div class="cardio-sheet">
      <div class="cs-head">
        <span class="cs-back" data-act="viewDay" data-date="${dateStr}">‹</span>
        <span class="cs-title">保存训练记录</span>
      </div>
      <div class="cs-card big" data-act="pickCardioKind">
        <div class="ic" id="cd-icon">🏃</div>
        <div class="t" id="cd-name">选择运动动作</div>
        <div class="s">点击选择适合的有氧运动</div>
      </div>
      <div class="cs-time">
        <div class="cs-time-card">
          <div class="ic">▶️</div>
          <div><div class="k">开始时间</div><div class="v" id="cd-start">--:--</div></div>
        </div>
        <div class="cs-time-card">
          <div class="ic">⏹</div>
          <div><div class="k">结束时间</div><div class="v" id="cd-end">--:--</div></div>
        </div>
      </div>
      <div class="cs-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span>📏</span><span style="font-weight:600;">运动距离</span></div>
        <input id="cd-dist" type="number" step="0.1" placeholder="输入您的运动距离" style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:20px;font-weight:700;text-align:center;"/>
      </div>
      <button class="cs-submit" data-act="saveCardioNew">✓ 提交记录</button>
    </div>
  `, /* fullScreen */ true);
  /* 默认时间：现在-30分钟 */
  const now = new Date();
  const end = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const startDate = new Date(now.getTime() - 30*60000);
  const start = String(startDate.getHours()).padStart(2,'0')+':'+String(startDate.getMinutes()).padStart(2,'0');
  document.getElementById('cd-start').textContent = start;
  document.getElementById('cd-end').textContent = end;
}
function pickCardioKind(){
  openSheet(`
    <h3 style="text-align:center;">选择有氧类型</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;">
    ${CARDIO_TYPES.map(function(k){
      const ic = ({'跑步':'🏃','骑行':'🚴','游泳':'🏊','跳绳':'🤸','椭圆机':'🚣','划船机':'🚣','有氧操':'💃','HIIT':'⚡','快走':'🚶','爬楼':'🪜'})[k] || '🏃';
      return '<button class="cardio-pick" data-kind="'+k+'" data-act="pickCardioItem" style="padding:18px 8px;border-radius:14px;background:#f1f5f9;border:0;cursor:pointer;text-align:center;"><div style="font-size:32px;">'+ic+'</div><div style="margin-top:6px;font-size:13px;color:#475569;">'+k+'</div></button>';
    }).join('')}
    </div>
  `);
}
function saveCardioNew(){
  const s = window._cardioState;
  const dist = +($('#cd-dist').value || 0);
  const startStr = $('#cd-start').textContent;
  const endStr = $('#cd-end').textContent;
  if(!s || !s.kind){ toast('请选择有氧类型'); return; }
  const dur = 30; /* 简化 */
  const wo = {
    id: uid(),
    planName: s.kind,
    date: s.date,
    startAt: Date.now() - dur*60000,
    duration: dur*60,
    paused: 0,
    volume: 0,
    items: [],
    notes: '',
    type: 'cardio',
    cardio: {kind:s.kind, distance:dist, kcal: s.kcal||''},
    cultivationSettled: false
  };
  state.workouts.push(wo);
  state.workouts.sort(function(x,y){return (x.date||'').localeCompare(y.date||'');});
  save();
  if(window._todayEmoji){ wo.mood = window._todayEmoji; save(); }
  closeSheet();
  toast('已保存 '+s.date+' 的有氧记录');
  render();
}
/* 旧的有氧/历史入口保留（兼容）*/
function dayAddHistory_OLD(dateStr){
  const opts = state.plans.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  const popts = PRESETS.map(p=>`<option value="preset:${p.id}">${escapeHtml(p.name)}（内置）</option>`).join('');
  openSheet(`
    <h3>添加历史训练记录</h3>
    <div class="field"><label>训练日期</label><input id="bh-date" type="date" value="${dateStr}"/></div>
    <div class="field"><label>选择计划</label><select id="bh-plan">${opts}${popts}<option value="blank">自由训练（空）</option></select></div>
    <div class="field"><label>训练时长（分钟，可留空手动计时）</label><input id="bh-dur" type="number" placeholder="如 60"/></div>
    <p style="font-size:12px;color:var(--muted);margin:4px 0 14px;">进入记录页后，每组会自动带出上次成绩作为参考，直接修改数字即可快速补录。</p>
    <div style="display:flex;gap:10px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="startBackfill">开始补录</button></div>
  `);
}
function dayAddCardio(dateStr){
  const kinds = CARDIO_TYPES.map(k=>`<option value="${k}">${k}</option>`).join('');
  openSheet(`
    <h3>添加有氧记录</h3>
    <div class="field"><label>日期</label><input id="cd-date" type="date" value="${dateStr}"/></div>
    <div class="field"><label>类型</label><select id="cd-kind">${kinds}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
      <div class="field"><label>时长(分)</label><input id="cd-dur" type="number" placeholder="30"/></div>
      <div class="field"><label>距离(km)</label><input id="cd-dist" type="number" step="0.1" placeholder="可选"/></div>
      <div class="field"><label>热量(kcal)</label><input id="cd-kcal" type="number" placeholder="可选"/></div>
    </div>
    <div class="field"><label>备注</label><input id="cd-note" placeholder="如：晨跑，体感轻松"/></div>
    <div style="display:flex;gap:10px;margin-top:6px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" style="background:var(--pink);" data-act="saveCardio">保存</button></div>
  `);
}
function saveCardio(){
  const date = $('#cd-date').value || todayStr();
  const kind = $('#cd-kind').value;
  const dur = Math.max(0, +$('#cd-dur').value || 0);
  if(!dur){ toast('请填写时长'); return; }
  const dist = +$('#cd-dist').value || 0;
  const kcal = +$('#cd-kcal').value || Math.round(dur*9);
  const note = $('#cd-note').value.trim();
  state.workouts.push({
    id:uid(), date, type:'cardio', planName:'有氧 · '+kind,
    duration:dur*60, volume:0, items:[], prs:[],
    cardio:{kind, distance:dist, kcal}, notes:note, programWeek:1
  });
  state.workouts.sort((a,b)=>a.date<b.date?-1:1);
  if(!state.checkins.includes(date)){ state.checkins.push(date); state.points += 5; }
  save(); closeSheet(); render(); toast('有氧记录已保存');
}

/* ============================================================
   训练统计（图表 + PR）
   ============================================================ */
function renderSummary(){
  const header = `<div class="stat-header"><span class="tab-text" data-act="statHistory">历史记录</span><span class="tab-text active">训练统计</span></div>`;
  if(!state.workouts.length){
    return header + `<div class="empty"><span style="font-size:30px;">📊</span><br>还没有训练数据<br>先去「训练」页开始一次训练吧</div>`;
  }
  const strength = state.workouts.filter(w=>w.type!=='cardio');
  const totalWorkouts = state.workouts.length;
  const totalSets = strength.reduce((a,w)=>a+w.items.reduce((b,it)=>b+it.sets.length,0),0);
  const totalVol = strength.reduce((a,w)=>a+(w.volume||0),0);
  const totalTime = state.workouts.reduce((a,w)=>a+(w.duration||0),0);

  // 近8周训练量柱状图
  const weeks = {};
  for(let i=7;i>=0;i--){
    const d = new Date(Date.now()-i*7*DAY_MS);
    const monday = new Date(d); monday.setDate(d.getDate()-((d.getDay()+6)%7));
    weeks[todayStr(monday)] = 0;
  }
  strength.forEach(w=>{
    const d = new Date(w.date+'T12:00:00');
    const monday = new Date(d); monday.setDate(d.getDate()-((d.getDay()+6)%7));
    const k = todayStr(monday);
    if(k in weeks) weeks[k] += (w.volume||0);
  });
  const weekData = Object.entries(weeks).map(([k,v])=>({label:fmtMD(k), value:Math.round(v)}));

  // 近12次训练量折线
  const recent = strength.slice(-12);
  const volData = recent.map(w=>({label:fmtMD(w.date), value:w.volume||0}));

  // 肌群分布
  const muscleVol = {};
  strength.forEach(w=>{
    const mv = muscleVolume(w);
    Object.entries(mv).forEach(([k,v])=>{ muscleVol[k]=(muscleVol[k]||0)+v; });
  });
  const muscleArr = Object.entries(muscleVol).sort((a,b)=>b[1]-a[1]);
  const maxMuscle = muscleArr.length ? muscleArr[0][1] : 1;

  // PR 列表
  const prs = computePRs();

  // 力量进步曲线：动作选择
  const exIds = [];
  const exNames = {};
  strength.forEach(w=>w.items.forEach(it=>{
    if(!exNames[it.exId]){ exIds.push(it.exId); exNames[it.exId]=it.name; }
  }));
  if(!exProgId || !exNames[exProgId]) exProgId = exIds[0] || '';
  let progChart = '';
  if(exProgId){
    const data = [];
    strength.forEach(w=>{
      const it = w.items.find(x=>x.exId===exProgId);
      if(!it) return;
      const mw = Math.max(...it.sets.map(s=>+s.weight||0),0);
      if(mw>0) data.push({label:fmtMD(w.date), value:mw});
    });
    progChart = data.length>=2 ? lineChart(data.slice(-14)) : '<div class="empty" style="padding:16px;">该动作记录不足，再练几次就有曲线了</div>';
  }
  const exOpts = exIds.map(id=>`<option value="${id}" ${id===exProgId?'selected':''}>${escapeHtml(exNames[id])}</option>`).join('');

  return `
    <div class="stat-header">
      <span class="tab-text" data-act="statHistory">历史记录</span>
      <span class="tab-text active">训练统计</span>
    </div>
    <div class="stat-grid">
      <div class="stat-box"><div class="v">${totalWorkouts}</div><div class="k">总次数</div></div>
      <div class="stat-box"><div class="v">${totalSets}</div><div class="k">总组数</div></div>
      <div class="stat-box"><div class="v">${Math.round(totalVol/1000)}k</div><div class="k">总训练量(kg)</div></div>
      <div class="stat-box accent"><div class="v">${fmtShortDur(totalTime)}</div><div class="k">总时长</div></div>
    </div>
    <div class="chart-wrap"><div class="chart-title">近8周训练量（kg）</div>${barChart(weekData)}</div>
    ${volData.length ? `<div class="chart-wrap"><div class="chart-title">单次训练量趋势</div>${lineChart(volData)}</div>` : ''}
    ${exIds.length ? `<div class="chart-wrap"><div class="chart-title">力量进步曲线（最大重量）</div>
      <select class="ex-select" id="ex-prog">${exOpts}</select>${progChart}</div>` : ''}
    ${bodyWeightChart()}
    <div class="chart-wrap"><div class="chart-title">肌群分布</div>
      ${muscleArr.map(([k,v])=>`
        <div class="bar-row"><div class="bar-label">${k}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/maxMuscle*100)}%;background:${partColor(k)||'#6b7280'}"></div></div>
        <div style="width:54px;text-align:right;font-size:12px;color:var(--muted)">${Math.round(v)}</div></div>`).join('')}
    </div>
    <div class="chart-wrap"><div class="chart-title">个人纪录 PR 🏆</div>
      ${prs.length ? prs.slice(0,10).map(p=>`<div class="pr-item"><span class="pr-name">${escapeHtml(p.name)}</span><span class="pr-val">${p.weight}kg ×${p.reps} <span style="color:var(--muted);font-weight:400;font-size:12px;">1RM≈${p.e1rm}</span></span></div>`).join('') : '<div class="empty">暂无PR</div>'}
    </div>
  `;
}

function computePRs(){
  const best={};
  state.workouts.filter(w=>w.type!=='cardio').forEach(w=>w.items.forEach(it=>{
    it.sets.forEach(s=>{
      const wt=+s.weight||0, rp=+s.reps||0;
      if(!wt) return;
      const e = estimate1RM(wt,rp);
      const cur = best[it.exId];
      if(!cur || wt>cur.weight || (wt===cur.weight && e>cur.e1rm)){
        best[it.exId]={name:it.name, weight:wt, reps:rp, e1rm:e, date:w.date};
      } else if(cur && e>cur.e1rm){
        cur.e1rm = e;
      }
    });
  }));
  return Object.values(best).sort((a,b)=>b.weight-a.weight);
}

/* ---------- SVG 图表 ---------- */
function lineChart(data){
  if(!data.length) return '';
  const W=320,H=140,pad=28;
  const max=Math.max(...data.map(d=>d.value),1);
  const min=Math.min(...data.map(d=>d.value));
  const range=max-min||1;
  const n=data.length;
  const pts=data.map((d,i)=>{
    const x=pad+(n===1?0:(W-pad*2)*i/(n-1));
    const y=H-pad-(H-pad*2)*(d.value-min)/range;
    return [x,y];
  });
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=path+` L${pts[n-1][0].toFixed(1)} ${H-pad} L${pts[0][0].toFixed(1)} ${H-pad} Z`;
  const dots=pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--accent)"/>`).join('');
  const labels=data.map((d,i)=>(i===0||i===n-1)?`<text x="${pts[i][0].toFixed(1)}" y="${H-8}" font-size="9" fill="var(--muted)" text-anchor="middle">${d.label}</text>`:'').join('');
  const maxLab=`<text x="${pad}" y="14" font-size="9" fill="var(--muted)">${max}</text>`;
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <path d="${area}" fill="var(--accent)" opacity="0.12"/>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}${maxLab}
  </svg>`;
}
function barChart(data){
  if(!data.length) return '';
  const W=320,H=140,pad=28;
  const max=Math.max(...data.map(d=>d.value),1);
  const n=data.length;
  const bw=(W-pad*2)/n*0.56;
  const bars=data.map((d,i)=>{
    const x=pad+(W-pad*2)*(i+0.5)/n-bw/2;
    const h=(H-pad*2)*(d.value/max);
    const y=H-pad-h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,2).toFixed(1)}" rx="4" fill="${d.value>0?'var(--accent)':'#e5e7eb'}"/>`;
  }).join('');
  const labels=data.map((d,i)=>{
    if(i!==0&&i!==n-1) return '';
    const x=pad+(W-pad*2)*(i+0.5)/n;
    return `<text x="${x.toFixed(1)}" y="${H-8}" font-size="9" fill="var(--muted)" text-anchor="middle">${d.label}</text>`;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}${labels}
    <text x="${pad}" y="14" font-size="9" fill="var(--muted)">${max}</text></svg>`;
}
function bodyWeightChart(){
  if(state.bodyLog.length<2) return '';
  const data = state.bodyLog.slice(-12).map(b=>({label:fmtMD(b.date), value:b.weight}));
  return `<div class="chart-wrap"><div class="chart-title">体重趋势</div>${lineChart(data)}</div>`;
}

/* ============================================================
   训练详情页
   ============================================================ */
function openDetail(workoutId){
  const w = state.workouts.find(x=>x.id===workoutId);
  if(!w) return;
  activeDetail = workoutId;
  const el = $('#detail-view');
  el.classList.remove('hidden');
  $('#tabbar').classList.add('hidden');
  $('#topbar').classList.add('hidden');
  renderDetail(w);
}
function closeDetail(){
  $('#detail-view').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  if(currentTab!=='train') $('#topbar').classList.remove('hidden');
  activeDetail = null;
  render();
}
function renderDetail(w){
  if(w.type==='cardio'){ renderCardioDetail(w); return; }
  const totalReps = w.items.reduce((a,it)=>a+it.sets.reduce((b,s)=>b+(+s.reps||0),0),0);
  const max1RM = Math.max(...w.items.flatMap(it=>it.sets.map(s=>estimate1RM(+s.weight||0,+s.reps||0))),0);
  const kcal = estimateKcal(w.duration||0, totalReps);
  const bw = bodyWeightOn(w.date);
  const logIdx = state.bodyLog.findIndex(b=>b.date===w.date);
  const prevBw = logIdx>0 ? state.bodyLog[logIdx-1].weight : (state.bodyLog.length>1 ? state.bodyLog[state.bodyLog.length-2].weight : bw);
  const bwChange = (bw - prevBw).toFixed(1);

  const vol = muscleVolume(w);
  const heat = bodyHeatmap(vol);
  const prSet = new Set((w.prs||[]).map(p=>p.exId+':'+p.type));

  const exList = w.items.map((it)=>{
    const ex = resolveEx(it.exId);
    const svg = ex && EX_SVG[ex.svg] ? EX_SVG[ex.svg] : '';
    const hasPR = (w.prs||[]).some(p=>p.exId===it.exId);
    return `<div class="detail-ex-item">
      <div class="dex-top">
        <div class="dex-thumb" style="background:${partColor(ex?ex.part:it.part)+'22'}">${svg}</div>
        <div class="dex-name">${escapeHtml(it.name)}${hasPR?'<span class="pr-badge">🏆 PR</span>':''}</div>
        <span class="tag">${it.sets.length}组</span>
      </div>
      <div class="dex-sets">${it.sets.map((s,i)=>`
        <div class="dex-set">
          <span class="num">${i+1}</span>
          <span>${s.reps||0} × ${s.weight||0}<span style="color:var(--muted);font-size:11px;">kg</span>${s.rpe?` <span style="color:var(--muted);font-size:11px;">RPE${s.rpe}</span>`:''}</span>
          ${prSet.has(it.exId+':weight') && (+s.weight||0)===Math.max(...it.sets.map(x=>+x.weight||0)) && (+s.weight||0)>0 ? '<span class="pr-mini">🏆</span>':''}
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  const mainPart = w.items[0] ? w.items[0].part : '全身';
  const statIcons = [
    {v:Math.round((w.duration||0)/60), l:'min', svg:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'},
    {v:w.items.length, l:'个动作', svg:'<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="12" height="4" rx="1"/>'},
    {v:w.volume, l:'Kg', svg:'<path d="M6 7h12l2 13H4z"/><path d="M9 7a3 3 0 0 1 6 0"/>'},
    {v:max1RM, l:'RM', svg:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'},
    {v:kcal, l:'KCAL', svg:'<path d="M12 2c1 4-4 5-4 9a4 4 0 0 0 8 0c0-1-.5-2-1-3 3 1 5 3.5 5 6.5A8 8 0 0 1 4 14C4 8 10 6 12 2z"/>'},
  ];
  const statsHtml = statIcons.map(s=>`<div class="ds"><div class="ic"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.svg}</svg></div><div class="n">${s.v}</div><div class="l">${s.l}</div></div>`).join('');

  $('#detail-view').innerHTML = `
    <div class="detail-top">
      <div class="art-bg">${artSVG(mainPart, 1)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button class="back" data-act="closeDetail"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button class="ai-btn" data-act="aiAnalyze">✨ AI分析</button>
      </div>
      <div>
        <h2>${escapeHtml(w.planName)}</h2>
        <div class="sub">${fmtDate(w.date)} · ${fmtClock(w.duration||0)} · 第${w.programWeek||1}周</div>
      </div>
    </div>
    <div class="detail-body">
      <div id="ai-slot"></div>
      <div class="detail-stats">${statsHtml}</div>

      <div class="body-weight-card">
        <div>
          <div style="font-size:13px;font-weight:700;margin-bottom:4px;">▎体重记录</div>
          <div class="bw-main"><span class="n">${bw}</span><span class="u"> kg</span>
          <div class="change">较上次 ${bwChange>0?'↑':(bwChange<0?'↓':'—')} ${Math.abs(bwChange)} kg</div></div>
        </div>
        <button class="bw-btn" data-act="addBodyWeightFromDetail" data-date="${w.date}">点击记录今日体重 &gt;</button>
      </div>

      <div class="status-card" data-act="editDetailNotes">
        <h4>▎训练状态</h4>
        <p>${escapeHtml(w.notes || '记录今天的训练状态吧？泵感如何？有没有新的感悟？')}</p>
      </div>

      <div class="heatmap-card">
        <h4>训练热力图</h4>
        <div class="heatmap-wrap">${heat}</div>
        <div class="heatmap-legend">
          <span style="font-size:11px;color:var(--muted);">时间长</span>
          <span class="heat-dot" style="background:#1e3a8a"></span>
          <span class="heat-dot" style="background:#2563eb"></span>
          <span class="heat-dot" style="background:#60a5fa"></span>
          <span class="heat-dot" style="background:#dbeafe"></span>
          <span style="font-size:11px;color:var(--muted);">时间短</span>
        </div>
      </div>

      <div class="section-title"><h2>▎详细记录</h2></div>
      <div class="detail-ex-list">${exList}</div>

      <button class="btn block ghost" style="margin-top:18px;color:#ef4444;border-color:#fecaca;" data-act="delWorkout">删除该记录</button>
      <div style="height:20px;"></div>
    </div>
  `;
}
function renderCardioDetail(w){
  const c = w.cardio || {};
  $('#detail-view').innerHTML = `
    <div class="detail-top">
      <div class="art-bg">${artSVG('有氧', 2)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <button class="back" data-act="closeDetail"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <span class="tag pink" style="background:rgba(255,255,255,.2);color:#fff;">有氧</span>
      </div>
      <div>
        <h2>${escapeHtml(w.planName)}</h2>
        <div class="sub">${fmtDate(w.date)} · ${fmtClock(w.duration||0)}</div>
      </div>
    </div>
    <div class="detail-body">
      <div class="cardio-grid">
        <div class="cardio-cell"><div class="n">${Math.round((w.duration||0)/60)}</div><div class="l">时长(分)</div></div>
        <div class="cardio-cell"><div class="n">${c.distance||'--'}</div><div class="l">距离(km)</div></div>
        <div class="cardio-cell"><div class="n">${c.kcal||'--'}</div><div class="l">热量(kcal)</div></div>
      </div>
      <div class="status-card" data-act="editDetailNotes">
        <h4>▎备注</h4>
        <p>${escapeHtml(w.notes || '暂无备注，点击添加')}</p>
      </div>
      <button class="btn block ghost" style="margin-top:8px;color:#ef4444;border-color:#fecaca;" data-act="delWorkout">删除该记录</button>
    </div>
  `;
}
function bodyHeatmap(vol){
  const max = Math.max(...Object.values(vol),1);
  const colorFor = v => {
    const r = v/max;
    if(r>0.7) return '#1e3a8a';
    if(r>0.4) return '#2563eb';
    if(r>0.15) return '#60a5fa';
    if(r>0.01) return '#dbeafe';
    return '#eef2f7';
  };
  const F = {胸:colorFor(vol['胸']||0), 肩:colorFor(vol['肩']||0), 手臂:colorFor(vol['手臂']||0), 核心:colorFor(vol['核心']||0), 腿:colorFor(vol['腿']||0), 背:colorFor(vol['背']||0)};
  const frontSVG = `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="26" r="13" fill="#e5e7eb"/>
    <path d="M34 48 Q60 38 86 48 L82 76 Q60 84 38 76 Z" fill="${F['胸']}" stroke="white" stroke-width="1.5"/>
    <circle cx="30" cy="52" r="9" fill="${F['肩']}" stroke="white" stroke-width="1.5"/>
    <circle cx="90" cy="52" r="9" fill="${F['肩']}" stroke="white" stroke-width="1.5"/>
    <path d="M24 62 L18 100 L26 102 L33 66 Z" fill="${F['手臂']}" stroke="white" stroke-width="1.5"/>
    <path d="M96 62 L102 100 L94 102 L87 66 Z" fill="${F['手臂']}" stroke="white" stroke-width="1.5"/>
    <path d="M42 82 L78 82 L75 106 L45 106 Z" fill="${F['核心']}" stroke="white" stroke-width="1.5"/>
    <path d="M40 110 L58 110 L56 168 L42 168 Z" fill="${F['腿']}" stroke="white" stroke-width="1.5"/>
    <path d="M62 110 L80 110 L78 168 L64 168 Z" fill="${F['腿']}" stroke="white" stroke-width="1.5"/>
  </svg>`;
  const backSVG = `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="26" r="13" fill="#e5e7eb"/>
    <path d="M34 48 Q60 38 86 48 L78 84 Q60 92 42 84 Z" fill="${F['背']}" stroke="white" stroke-width="1.5"/>
    <circle cx="30" cy="52" r="9" fill="${F['肩']}" stroke="white" stroke-width="1.5"/>
    <circle cx="90" cy="52" r="9" fill="${F['肩']}" stroke="white" stroke-width="1.5"/>
    <path d="M24 62 L18 100 L26 102 L33 66 Z" fill="${F['手臂']}" stroke="white" stroke-width="1.5"/>
    <path d="M96 62 L102 100 L94 102 L87 66 Z" fill="${F['手臂']}" stroke="white" stroke-width="1.5"/>
    <path d="M44 88 L76 88 L73 106 L47 106 Z" fill="${F['核心']}" stroke="white" stroke-width="1.5"/>
    <path d="M40 110 L58 110 L56 168 L42 168 Z" fill="${F['腿']}" stroke="white" stroke-width="1.5"/>
    <path d="M62 110 L80 110 L78 168 L64 168 Z" fill="${F['腿']}" stroke="white" stroke-width="1.5"/>
  </svg>`;
  return `<div class="heatmap-fig">${frontSVG}</div><div class="heatmap-fig">${backSVG}</div>`;
}

/* ---------- AI 分析（本地规则引擎） ---------- */
function aiAnalyze(){
  const w = state.workouts.find(x=>x.id===activeDetail);
  if(!w) return;
  const lines = [];
  // 对比上次同计划
  const prev = [...state.workouts].filter(x=>x.id!==w.id && x.planName===w.planName && x.date<=w.date).pop();
  if(prev){
    const diff = (w.volume||0) - (prev.volume||0);
    const pct = prev.volume ? Math.round(diff/prev.volume*100) : 0;
    lines.push(`📈 训练量 ${w.volume}kg，比上次（${fmtMD(prev.date)}）${diff>=0?'增加':'减少'} ${Math.abs(diff)}kg（${pct>=0?'+':''}${pct}%）。${pct>5?'进阶显著，保持节奏！':pct<-10?'有所下降，注意睡眠与恢复。':'处于正常波动范围。'}`);
  } else {
    lines.push('🌱 这是该计划的首次记录，下次训练将自动生成对比分析。');
  }
  // PR
  if(w.prs && w.prs.length){
    lines.push(`🏆 本次刷新 ${w.prs.length} 项纪录：${w.prs.map(p=>p.name).join('、')}，状态出色！`);
  }
  // RPE 平均
  const rpes = w.items.flatMap(it=>it.sets.map(s=>+s.rpe||0)).filter(x=>x>0);
  if(rpes.length){
    const avg = rpes.reduce((a,b)=>a+b,0)/rpes.length;
    lines.push(`💪 平均 RPE ${avg.toFixed(1)}：${avg<=7.5?'强度偏轻，下次可加重 2.5kg 或增加次数。':avg<=8.5?'强度适中，处于高效增肌区间。':'强度偏大，注意动作质量与恢复，避免连续高强度。'}`);
  } else {
    lines.push('💡 本次未记录 RPE，下次填写后 AI 可给出更精准的强度建议。');
  }
  // 肌群覆盖
  const mv = muscleVolume(w);
  const parts = Object.keys(mv);
  lines.push(`🎯 本次主要刺激：${parts.slice(0,3).join('、')}。${parts.length<=2?'可考虑补充 1 个辅助动作提升覆盖率。':'肌群覆盖良好。'}`);
  // 频率
  const weekCount = state.workouts.filter(x=>daysSince(x.date)<=7).length;
  lines.push(`🗓 近7天训练 ${weekCount} 次，${weekCount>=4?'频率较高，留意疲劳累积。':weekCount>=2?'频率合理，继续保持。':'频率偏低，建议每周至少 3 次。'}`);

  $('#ai-slot').innerHTML = `<div class="ai-card"><h4>✨ AI 训练分析</h4>${lines.map(l=>`<p>${l}</p>`).join('')}</div>`;
  toast('分析完成');
}

/* ============================================================
   我的页
   ============================================================ */
function renderMe(){
  const p = state.profile;
  const totalTime = state.workouts.reduce((a,w)=>a+(w.duration||0),0);
  const totalWorkouts = state.workouts.length;
  const regDays = Math.max(1, daysSince(p.regDate || todayStr())+1);
  const hours = Math.round(totalTime/3600);
  const quick = [
    {act:'openAIReport', label:'AI分析', bg:'linear-gradient(135deg,#6366f1,#8b5cf6)', svg:'<path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/><path d="M18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>'},
    {act:'openBodyData', label:'体测记录', bg:'linear-gradient(135deg,#2563eb,#38bdf8)', svg:'<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>'},
    {act:'openMyStatus', label:'状态记录', bg:'linear-gradient(135deg,#f59e0b,#fb923c)', svg:'<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12C19 16.5 12 21 12 21z"/>'},
    {act:'exportData', label:'导出数据', bg:'linear-gradient(135deg,#10b981,#34d399)', svg:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>'},
  ];
  return `
    <div class="me-hero">
      <div class="me-profile">
        <div class="me-avatar">${p.name?escapeHtml(p.name[0]):'我'}</div>
        <div style="flex:1;">
          <h3>${escapeHtml(p.name||'健身爱好者')}</h3>
          <p class="bio">${escapeHtml(p.goal?('目标：'+p.goal):'这家伙很懒，什么都没留下…')}</p>
        </div>
        <button class="icon-btn" data-act="editProfile"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </div>
      <div class="me-stats">
        <span>注册时长 <b>${regDays}</b> 天</span>
        <span>训练时长 <b>${hours}</b> 小时</span>
        <span>训练 <b>${totalWorkouts}</b> 次</span>
      </div>
    </div>
    <div class="me-quick">
      ${quick.map(q=>`<div class="q" data-act="${q.act}"><div class="qic" style="background:${q.bg};"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${q.svg}</svg></div><span>${q.label}</span></div>`).join('')}
    </div>
    <div class="menu-card">
      <div class="menu-row" data-act="gotoLibrary"><div class="left"><span class="mic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/></svg></span>我的动作</div><div class="right">></div></div>
      <div class="menu-row" data-act="setRest"><div class="left"><span class="mic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>训练设置</div><div class="right">${state.settings.restSec}秒休息 ></div></div>
      <div class="menu-row" data-act="openPerms"><div class="left"><span class="mic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>权限说明</div><div class="right">></div></div>
    </div>
    <div class="menu-card">
      <div class="menu-row" data-act="openAbout"><div class="left"><span class="mic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>关于我们</div><div class="right">></div></div>
      <div class="menu-row" data-act="openFeedback"><div class="left"><span class="mic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>意见反馈</div><div class="right">></div></div>
      <div class="menu-row" data-act="openPrivacy"><div class="left"><span class="mic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>隐私协议</div><div class="right">></div></div>
    </div>
    <div class="menu-card">
      <div class="menu-row" data-act="clearAll"><div class="left" style="color:#ef4444;"><span class="mic" style="color:#ef4444;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></span>清空所有数据</div><div class="right">></div></div>
    </div>
    <div style="text-align:center;color:var(--muted);font-size:12px;margin-top:20px;">FitRecord 网页版 · 数据仅存在本地</div>
  `;
}
function openStaticSheet(title, body){
  openSheet(`<h3>${title}</h3><div style="font-size:14px;color:var(--muted);line-height:1.8;">${body}</div>
    <div style="margin-top:16px;"><button class="btn block primary" data-act="closeSheet">知道了</button></div>`);
}
function openMyStatus(){
  const noted = [...state.workouts].reverse().filter(w=>w.notes).slice(0,10);
  openSheet(`<h3>状态记录</h3>
    ${noted.length ? noted.map(w=>`<div class="status-card" style="box-shadow:none;border:1px solid var(--line);"><h4 style="font-size:13px;">${escapeHtml(w.planName)} · ${fmtMD(w.date)}</h4><p>${escapeHtml(w.notes)}</p></div>`).join('') : '<div class="empty">还没有训练状态记录<br>完成训练后在详情页点击「训练状态」即可记录</div>'}
    <div style="margin-top:10px;"><button class="btn block" data-act="closeSheet">关闭</button></div>`);
}
function openAIReport(){
  const lines = [];
  const w4 = state.workouts.filter(w=>daysSince(w.date)<=28);
  lines.push(`🗓 近4周共训练 ${w4.length} 次，总时长 ${fmtShortDur(w4.reduce((a,w)=>a+(w.duration||0),0))}。`);
  const vols = state.workouts.filter(w=>w.type!=='cardio').slice(-8).map(w=>w.volume||0);
  if(vols.length>=2){
    const trend = vols[vols.length-1]-vols[0];
    lines.push(`📈 近${vols.length}次训练量趋势${trend>=0?'上升':'下降'}（${trend>=0?'+':''}${trend}kg）。${trend>=0?'循序渐进做得不错。':"建议检查恢复与饮食，逐步回升。"}`);
  }
  const mv = {};
  w4.filter(w=>w.type!=='cardio').forEach(w=>{ const v=muscleVolume(w); Object.entries(v).forEach(([k,x])=>mv[k]=(mv[k]||0)+x); });
  const arr = Object.entries(mv).sort((a,b)=>b[1]-a[1]);
  if(arr.length){
    lines.push(`🎯 近4周重点肌群：${arr[0][0]}（占比最高）；${arr.length>1?arr[arr.length-1][0]:''}训练量最少，${arr.length>1?'可适当补强。':''}`);
  }
  if(state.bodyLog.length>=2){
    const first = state.bodyLog[0].weight, last = state.bodyLog[state.bodyLog.length-1].weight;
    lines.push(`⚖️ 体重从 ${first}kg 到 ${last}kg，${last>=first?'增重':'减重'} ${Math.abs((last-first).toFixed(1))}kg。`);
  }
  lines.push('💡 建议：同一动作连续两次全组完成且 RPE≤8 时，下次加重 2.5kg。');
  openSheet(`<h3>✨ AI 周期报告</h3>${lines.map(l=>`<p style="font-size:14px;line-height:1.7;color:#374151;">${l}</p>`).join('')}
    <div style="margin-top:10px;"><button class="btn block primary" data-act="closeSheet">关闭</button></div>`);
}

/* ============================================================
   身体数据页（全屏）
   ============================================================ */
function openBodyDataPage(){
  $('#bodydata-view').classList.remove('hidden');
  $('#tabbar').classList.add('hidden');
  $('#topbar').classList.add('hidden');
  renderBodyData();
}
function closeBodyDataPage(){
  $('#bodydata-view').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  if(currentTab!=='train') $('#topbar').classList.remove('hidden');
}
/* v8.11 复刻截图2：身体数据主页（基础数据+身体围度+身体成分+历史趋势） */
function renderBodyData(){
  const p = state.profile;
  const log = state.bodyLog;
  const latest = log.length ? log[log.length-1] : null;
  const bw = latest ? latest.weight : p.weight;
  const bf = latest && latest.bodyFat ? latest.bodyFat : '';
  const bmr = latest && latest.bmr ? latest.bmr : '';
  const ch = latest ? latest.chest : '';
  const wa = latest ? latest.waist : '';
  const hi = latest ? latest.hip : '';
  const sk = latest ? latest.skeletal : '';
  const vi = latest ? latest.visceral : '';
  const h = p.height;
  /* v8.14 单元格支持独立点击编辑（路径A 单项快速修改） + 容错显示"未设置" */
  const cell = (k,v,u,field)=>{
    return `<div class="bd-cell bd-clickable" data-act="bdEditField" data-field="${field}">`+
      `<div class="k">${k}</div>`+
      `<div class="n">${fixVal(v, u)} <span class="bd-arrow">›</span></div>`+
    `</div>`;
  };
  /* 数据概览 + 趋势图（参考截图2） */
  let overview = '';
  if(log.length>=2){
    const first = log[0], last = log[log.length-1];
    const dW = (last.weight-first.weight);
    const dF = (first.bodyFat && last.bodyFat) ? (last.bodyFat-first.bodyFat) : null;
    const data = log.slice(-12).map(b=>({label:fmtMD(b.date), value:b.weight}));
    const mini = (function(){
      const W=260,H=80,pad=8;
      const max=Math.max(...data.map(d=>d.value)), min=Math.min(...data.map(d=>d.value));
      const range=max-min||1; const n=data.length;
      const pts=data.map((d,i)=>[pad+(W-pad*2)*(n===1?0:i/(n-1)), H-pad-(H-pad*2)*(d.value-min)/range]);
      const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
      const area=path+' L'+pts[n-1][0].toFixed(1)+' '+H+' L'+pts[0][0].toFixed(1)+' '+H+' Z';
      return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:80px;display:block;margin-top:8px;">
        <path d="${area}" fill="rgba(255,255,255,.15)"/><path d="${path}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${pts[n-1][0]}" cy="${pts[n-1][1]}" r="4" fill="#fff"/></svg>`;
    })();
    overview = `
      <div class="bd-overview">
        <div class="ov-head"><span>数据概览</span><span class="go">共 ${log.length} 条记录</span></div>
        <div class="ov-row"><div class="ov-k">体重变化</div><div class="ov-v">${(isNaN(dW) || dW === undefined) ? '<span class="not-set">未设置</span>' : (dW>=0?'+':'')+dW.toFixed(1)}<span class="u">kg</span></div></div>
        ${mini}
        <div class="ov-pills">
          <span class="bd-pill">${(isNaN(dW) || dW === undefined) ? '— 无数据' : (dW>=0?'↗ 上升':'↘ 下降')}</span>
          ${dF!==null && !isNaN(dF)?'<span class="bd-pill">体脂率 '+(dF>=0?'+':'')+dF.toFixed(1)+'%</span>':''}
          <span class="bd-pill">记录周期 ${fmtMD(first.date)} ~ ${fmtMD(last.date)}</span>
        </div>
      </div>`;
  }
  /* 历史记录列表 */
  const history = log.slice().reverse().map((b,ri)=>{
    const prev = log[log.length-1-ri-1];
    let delta = '';
    if(prev){
      const d = (b.weight-prev.weight);
      delta = '<span class="delta '+(d>=0?'up':'down')+'">'+(d>=0?'↗ 上升':'↘ 下降')+' '+Math.abs(d).toFixed(1)+'</span>';
    }
    return `<div class="bd-h-item">
      <div><div class="d">${b.date}${b.date===todayStr()?' · 今天':''}</div>
        <div class="w">${fixNum(b.weight) != null ? b.weight : '<span class=\"not-set\">未设置</span>'} <span class="u">kg</span></div>${delta}</div>
      <button class="bd-h-del" data-act="delBodyLog" data-date="${b.date}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
    </div>`;
  }).join('');

  $('#bodydata-view').innerHTML = `
    <div class="bd-hero">
      <button class="icon-btn bd-back" data-act="closeBodyData"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h3 style="margin:0;flex:1;text-align:center;">身体数据</h3>
      <button class="btn primary sm" data-act="addBodyRecord">添加</button>
    </div>
    <div class="bd-weight-row">
      <div class="bd-weight bd-clickable" data-act="bdEditField" data-field="weight" style="cursor:pointer;"><span class="n">${fixNum(bw) != null ? bw : '--'}</span><span class="u">kg</span><span class="bd-arrow" style="position:static;margin-left:10px;font-size:18px;">›</span></div>
      <button class="bd-edit-btn" data-act="addBodyRecord"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 修改</button>
    </div>
    <div class="bd-section">
      <div class="bd-sec-title">基础数据</div>
      <div class="bd-3grid">${cell('身高', h, 'cm', 'height')}${cell('体脂率', bf, '%', 'bodyFat')}${cell('基础代谢', bmr, 'kcal', 'bmr')}</div>
      <div class="bd-sec-title">身体围度</div>
      <div class="bd-3grid">${cell('胸围', ch, 'cm', 'chest')}${cell('腰围', wa, 'cm', 'waist')}${cell('臀围', hi, 'cm', 'hip')}</div>
      <div class="bd-sec-title">身体成分</div>
      <div class="bd-3grid">${cell('骨骼肌', sk, 'kg', 'skeletal')}${cell('内脏脂肪', vi, '级', 'visceral')}<div></div></div>
    </div>
    ${overview}
    <div class="bd-section" style="margin-top:6px;"><div class="bd-sec-title">历史记录 <span class="bd-history-count">${log.length ? '共 '+log.length+' 条记录' : ''}</span></div></div>
    <div class="bd-history">${history || '<div class="empty">暂无记录，点击右上角「添加」</div>'}</div>
  `;
}
/* ============================================================
   v8.14 通用数字输入弹窗（彻底替代滚轮选择器）
   - 深色主题（与项目统一）
   - 单 input + 数字键盘 + min/max 校验 + 取消/保存
   - 临时输入完全独立，不会污染其他表单/弹窗
   - 关闭：×按钮 / 取消按钮 / overlay 点击空白
   ============================================================ */
function openNumberInput(opts){
  var title = opts.title || '输入数值';
  var unit = opts.unit || '';
  var current = opts.current != null && !isNaN(opts.current) ? opts.current : '';
  var placeholder = opts.placeholder || '';
  var step = opts.step != null ? opts.step : 0.1;
  var min = opts.min != null ? opts.min : null;
  var max = opts.max != null ? opts.max : null;
  var fieldName = opts.field || 'value';
  var onSave = opts.onSave || function(){};
  var onCancel = opts.onCancel || function(){};
  /* 弹窗唯一 key，避免多弹窗临时数据冲突 */
  var key = '__ni_' + fieldName + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  var html = '<div class="ni-sheet" data-ni-key="'+key+'">'+
    '<div class="ni-head">'+
      '<button class="ni-close" data-act="niClose" aria-label="关闭">×</button>'+
      '<div class="ni-title">'+escapeHtml(title)+'</div>'+
      '<button class="ni-save" data-act="niSave">保存</button>'+
    '</div>'+
    '<div class="ni-body">'+
      '<div class="ni-input-wrap">'+
        '<input id="'+key+'-input" class="ni-input" type="number" inputmode="decimal" step="'+step+'" '+(min!=null?'min="'+min+'"':'')+(max!=null?'max="'+max+'"':'')+' placeholder="'+escapeHtml(placeholder)+'" value="'+current+'"/>'+
        (unit ? '<span class="ni-unit">'+escapeHtml(unit)+'</span>' : '')+
      '</div>'+
      '<div class="ni-tip">输入数值后点「保存」或按回车</div>'+
    '</div>'+
  '</div>';
  openSheet(html, false);
  /* 聚焦输入框 */
  setTimeout(function(){
    var inp = document.getElementById(key+'-input');
    if(inp){
      inp.focus();
      /* input 数字框本身不需要滚轮 */
    }
  }, 80);
  /* 保存事件（一次性绑定 sheet 内部委托） */
  var sheet = $('#sheet');
  var niHandler = function(e){
    var btn = e.target.closest('[data-act]');
    if(!btn) return;
    var act = btn.dataset.act;
    if(act === 'niSave'){
      e.preventDefault(); e.stopPropagation();
      var inp2 = document.getElementById(key+'-input');
      var v = inp2 ? inp2.value : '';
      var num = parseFloat(v);
      if(v === '' || isNaN(num)){
        /* 空输入 = 取消，不报错 */
        closeSheet();
        return;
      }
      if(min != null && num < min){ toast('数值不能小于 '+min); return; }
      if(max != null && num > max){ toast('数值不能大于 '+max); return; }
      closeSheet();
      onSave(num);
    } else if(act === 'niClose' || act === 'niCancel'){
      e.preventDefault(); e.stopPropagation();
      closeSheet();
      onCancel();
    }
  };
  sheet._niHandler = niHandler;
  sheet.addEventListener('click', niHandler);
  /* 回车提交 */
  var inpKey = key+'-input';
  setTimeout(function(){
    var inp3 = document.getElementById(inpKey);
    if(inp3){
      inp3.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          var btn = sheet.querySelector('.ni-save');
          if(btn) btn.click();
        }
      });
    }
  }, 100);
}

/* ============================================================
   v8.14 数据容错工具：把 NaN/undefined/null/空字符串 统一显示为 "未设置"
   ============================================================ */
function fixVal(v, unit, opts){
  opts = opts || {};
  if(v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))){
    if(opts.placeholder) return opts.placeholder;
    return '<span class="not-set">未设置</span>';
  }
  var num = +v;
  if(isNaN(num)) return '<span class="not-set">未设置</span>';
  return num + (unit ? ' <span class="u">'+unit+'</span>' : '');
}
function fixNum(v){
  if(v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) return null;
  var n = +v;
  return isNaN(n) ? null : n;
}

function bdQuickEditField(fieldName){
  /* 字段配置：title, unit, min, max, step, current, saveKey */
  var configs = {
    height:    {title:'选择身高', unit:'cm', min:100, max:230, step:0.5, saveKey:'height', storeField:'height'},
    weight:    {title:'选择体重', unit:'kg', min:20, max:200, step:0.1, saveKey:'weight', storeField:'weight'},
    bodyFat:   {title:'选择体脂率', unit:'%', min:3, max:50, step:0.1, saveKey:'bodyFat', storeField:'bodyFat'},
    bmr:       {title:'选择基础代谢', unit:'kcal', min:800, max:3000, step:1, saveKey:'bmr', storeField:'bmr'},
    chest:     {title:'选择胸围', unit:'cm', min:50, max:200, step:0.1, saveKey:'chest', storeField:'chest'},
    waist:     {title:'选择腰围', unit:'cm', min:40, max:200, step:0.1, saveKey:'waist', storeField:'waist'},
    hip:       {title:'选择臀围', unit:'cm', min:50, max:200, step:0.1, saveKey:'hip', storeField:'hip'},
    /* v8.15 新增 shoulder 字段（仙途页肉身档案使用） */
    shoulder:  {title:'选择肩宽', unit:'cm', min:20, max:80, step:0.1, saveKey:'shoulder', storeField:'shoulder'},
    skeletal:  {title:'选择骨骼肌', unit:'kg', min:5, max:80, step:0.1, saveKey:'skeletal', storeField:'skeletal'},
    visceral:  {title:'选择内脏脂肪', unit:'级', min:1, max:30, step:0.5, saveKey:'visceral', storeField:'visceral'},
  };
  var cfg = configs[fieldName];
  if(!cfg){
    toast('该字段暂不支持独立编辑');
    return;
  }
  /* 当前值：优先取最新 bodyLog，再 profile */
  var latest = (state.bodyLog && state.bodyLog.length) ? state.bodyLog[state.bodyLog.length-1] : null;
  var cur = latest && latest[cfg.saveKey] != null && latest[cfg.saveKey] !== '' ? +latest[cfg.saveKey] : (state.profile && state.profile[cfg.storeField] ? +state.profile[cfg.storeField] : (cfg.min + (cfg.max-cfg.min)/2));
  openNumberInput({
    title: cfg.title,
    field: fieldName,
    unit: cfg.unit,
    min: cfg.min, max: cfg.max, step: cfg.step,
    current: cur,
    placeholder: cfg.min + ' - ' + cfg.max,
    onSave: function(v){
      /* 保存为新历史记录（绝对不覆盖） */
      var date = todayStr();
      state.bodyLog = state.bodyLog || [];
      var entry = {date: date};
      entry[cfg.saveKey] = v;
      state.bodyLog.push(entry);
      state.bodyLog.sort(function(x,y){return (x.date||'').localeCompare(y.date||'');});
      /* 身高/体重/体脂率 同步到 profile（用于 FFMI/LBM） */
      if(fieldName === 'height' || fieldName === 'weight' || fieldName === 'bodyFat'){
        state.profile = state.profile || {};
        state.profile[fieldName] = v;
      }
      save();
      /* v8.15: 智能刷新——如果在 bodydata 主页刷 bodyData，否则如果仙途刷 renderMain，否则刷 render */
      if(!$('#bodydata-view').classList.contains('hidden')){
        renderBodyData();
      } else if(window.XianCore && document.querySelector('.xc-root')){
        var host = document.querySelector('.xc-root');
        try{ window.XianCore.renderTo(host); }catch(e){ render(); }
      } else {
        render();
      }
      toast(cfg.title.replace('设置','') + '已保存：' + v + ' ' + cfg.unit);
    }
  });
}

/* v8.13 路径B：完整表单模式
   - window._bdFormState = {mode:'fullForm', values:{height:..., weight:...}}
   - 身高/其他字段点击触发 wheelHeight → openFieldWheel 选完 → 只更新 _bdFormState.values + input，不保存
   - 用户点底部"保存" → saveBodyData 把所有 _bdFormState.values 一起写入 bodyLog（新历史）
*/
function openBodyRecordSheet(){
  const p = state.profile;
  const latest = state.bodyLog.length ? state.bodyLog[state.bodyLog.length-1] : {};
  /* 路径B 状态对象（保存用户选中的身高/体重等） */
  window._bdFormState = {
    mode: 'fullForm',
    values: {
      height: (p.height || latest.height || ''),
      weight: (latest.weight || p.weight || ''),
      bodyFat: (latest.bodyFat || ''),
      bmr: (latest.bmr || ''),
      chest: (latest.chest || ''),
      waist: (latest.waist || ''),
      hip: (latest.hip || ''),
      skeletal: (latest.skeletal || ''),
      visceral: (latest.visceral || '')
    }
  };
  const cur = (k)=> window._bdFormState.values[k] || '';
  openSheet(`
    <h3 style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">📝</span>添加身体数据</h3>
    <p style="font-size:12px;color:#8fa3bf;margin:-8px 0 12px;">填写后自动算 BMI/FFMI/预估体脂率/灵根<br>每项点开后单独选，确认后停留表单可继续填其他</p>
    <div class="bd-form-row">
      <span class="bd-icon">📅</span>
      <div class="bd-form-cell"><div class="k">日期</div><div class="v"><input id="bd-date" type="date" value="${todayStr()}"/></div></div>
    </div>
    <div class="bd-form-grid">
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">⚖️</span><span class="k">体重 kg *</span></div>
        <input id="bd-weight" type="number" step="0.1" value="${cur('weight')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">💧</span><span class="k">体脂率 %</span></div>
        <input id="bd-fat" type="number" step="0.1" value="${cur('bodyFat')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">🔥</span><span class="k">基础代谢 kcal</span></div>
        <input id="bd-bmr" type="number" value="${cur('bmr')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">📏</span><span class="k">身高 cm</span></div>
        <input id="bd-height" type="number" step="0.5" min="100" max="230" placeholder="100-230" value="${cur('height')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">🦴</span><span class="k">骨骼肌 kg</span></div>
        <input id="bd-skel" type="number" step="0.1" value="${cur('skeletal')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">👕</span><span class="k">胸围 cm</span></div>
        <input id="bd-chest" type="number" step="0.1" value="${cur('chest')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">📐</span><span class="k">腰围 cm</span></div>
        <input id="bd-waist" type="number" step="0.1" value="${cur('waist')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">🍑</span><span class="k">臀围 cm</span></div>
        <input id="bd-hip" type="number" step="0.1" value="${cur('hip')}"/>
      </div>
      <div class="bd-form-item">
        <div class="bd-item-head"><span class="bd-icon">❤️</span><span class="k">内脏脂肪 级</span></div>
        <input id="bd-visc" type="number" step="0.5" value="${cur('visceral')}"/>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn ghost" data-act="closeSheet">取消</button>
      <button class="btn primary" data-act="saveBodyData">保存</button>
    </div>
  `);
  /* v8.14: 所有输入框均为普通数字 input（彻底删除滚轮逻辑） */
}

/* v8.14: openHeightWheel 函数保留以兼容旧调用，但内部走数字输入（不再使用滚轮） */
function openHeightWheel(currentVal, cb){
  if(typeof cb !== 'function') return;
  openNumberInput({
    title:'设置身高',
    field:'height',
    unit:'cm',
    current: currentVal,
    step: 0.5, min: 100, max: 230,
    placeholder:'100 - 230',
    onSave: cb
  });
}
function openFieldWheel_DEPRECATED_DO_NOT_USE(opts){
  /* v8.14: 此函数已废弃，所有滚轮选择器调用必须改用 openNumberInput */
  console.warn('[v8.14] openFieldWheel is deprecated, use openNumberInput instead');
}
function startPlan(id, isPreset=false, opts={}){
  let src;
  if(isPreset){
    const pr = PRESETS.find(x=>x.id===id);
    if(!pr) return;
    src = {name:pr.name, items:pr.items.map(n=>{const e=resolveEx(n); return e?e.id:null}).filter(Boolean)};
  } else {
    src = state.plans.find(x=>x.id===id);
  }
  if(!src || !src.items.length){ toast('计划为空'); return; }
  newSession(src.name, src.items, opts);
}
function newSession(name, exIds, opts={}){
  session = {
    id: uid(),
    startAt: Date.now(),
    paused: 0, pauseStart: 0,
    running: true,
    planName: name,
    backfillDate: opts.backfillDate || null,
    fixedDur: opts.fixedDur || 0,
    prsAnnounced: [],
    items: exIds.map(exId=>{
      const ex = resolveEx(exId) || {id:exId,name:'未知动作',part:'',equip:'',svg:''};
      return {exId:ex.id, name:ex.name, part:ex.part, equip:ex.equip, icon:ex.icon||ex.part, svg:ex.svg,
        sets:[{weight:'',reps:'',rpe:'',done:false,warmup:false}],
        restSec:0, notes:'', supersetWith:null, lb:false};
    })
  };
  openWorkout();
}
function openWorkout(){
  $('#workout-view').classList.remove('hidden');
  $('#tabbar').classList.add('hidden');
  $('#topbar').classList.add('hidden');
  $('#wo-title').textContent = session.planName + (session.backfillDate ? `（补录 ${fmtMD(session.backfillDate)}）` : '');
  const hero = $('#workout-hero');
  hero.style.background = '';
  const first = session.items[0];
  const c = first ? partColor(first.part) : '#2563eb';
  hero.style.background = `linear-gradient(135deg,${c} 0%,#1f2937 100%)`;
  startDur();
  renderWorkoutList();
}
function closeWorkout(){
  stopDur();
  $('#workout-view').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  if(currentTab!=='train') $('#topbar').classList.remove('hidden');
  session = null;
}

/* ---------- 上次成绩 & 自动进阶 ---------- */
function lastSetsForEx(exId){
  for(let k=state.workouts.length-1; k>=0; k--){
    const w = state.workouts[k];
    if(w.type==='cardio') continue;
    const it = w.items.find(x=>x.exId===exId);
    if(it && it.sets.length){
      return {date:w.date, sets:it.sets.map(s=>({weight:+s.weight||0, reps:+s.reps||0, rpe:s.rpe||'', done:!!s.done}))};
    }
  }
  return null;
}
function suggestForEx(exId){
  const last = lastSetsForEx(exId);
  if(!last) return null;
  const valid = last.sets.filter(s=>s.weight>0 && s.reps>0);
  if(!valid.length) return null;
  const top = valid.reduce((a,b)=>b.weight>a.weight?b:a, valid[0]);
  const rpes = valid.map(s=>+s.rpe||0).filter(x=>x>0);
  const avgRpe = rpes.length ? rpes.reduce((a,b)=>a+b,0)/rpes.length : 0;
  const minReps = Math.min(...valid.map(s=>s.reps));
  let weight = top.weight, reps = top.reps, reason = '保持上次强度';
  if(avgRpe){
    if(avgRpe<=7.5){ weight = +(top.weight+2.5).toFixed(1); reason = `上次平均RPE ${avgRpe.toFixed(1)} 偏轻，建议加重`; }
    else if(avgRpe<=8.5){ reps = top.reps+1; reason = `上次RPE ${avgRpe.toFixed(1)} 适中，建议加 1 次`; }
    else if(avgRpe>=9.5){ reason = `上次RPE ${avgRpe.toFixed(1)} 偏大，保持适应当前重量`; }
    else { reps = top.reps+1; reason = '稳步进阶，加 1 次'; }
  } else {
    if(minReps>=12){ weight = +(top.weight+2.5).toFixed(1); reason = '上次每组≥12次，可加重 2.5kg'; }
    else { reps = top.reps+1; reason = '先加次数到 12，再加重量'; }
  }
  return {weight, reps, reason};
}

/* ---------- PR 检测 ---------- */
function bestBefore(exId, beforeDate){
  let maxW = 0, maxE = 0;
  state.workouts.forEach(w=>{
    if(w.type==='cardio' || w.date >= beforeDate) return;
    const it = w.items.find(x=>x.exId===exId);
    if(!it) return;
    it.sets.forEach(s=>{
      const wt=+s.weight||0, rp=+s.reps||0;
      if(wt>maxW) maxW = wt;
      const e = estimate1RM(wt,rp);
      if(e>maxE) maxE = e;
    });
  });
  return {maxW, maxE};
}
function checkSetPR(it, set){
  const wt=+set.weight||0, rp=+set.reps||0;
  if(!wt || !rp || !session) return;
  const date = session.backfillDate || todayStr();
  const best = bestBefore(it.exId, date);
  const e = estimate1RM(wt, rp);
  const keyW = it.exId+':weight', keyE = it.exId+':e1rm';
  if(wt>best.maxW && best.maxW>0 && !session.prsAnnounced.includes(keyW)){
    session.prsAnnounced.push(keyW);
    toast(`🎉 新纪录！${it.name} ${wt}kg（原 ${best.maxW}kg）`);
  } else if(e>best.maxE && best.maxE>0 && !session.prsAnnounced.includes(keyE)){
    session.prsAnnounced.push(keyE);
    toast(`🎉 估算1RM新高！${it.name} ≈${e}kg`);
  }
}
function finalizePRs(workout){
  const prs = [];
  const date = workout.date;
  const seen = new Set();
  workout.items.forEach(it=>{
    const best = bestBefore(it.exId, date);
    it.sets.forEach(s=>{
      const wt=+s.weight||0, rp=+s.reps||0;
      if(!wt||!rp) return;
      if(wt>best.maxW && best.maxW>0 && !seen.has(it.exId+':weight')){ seen.add(it.exId+':weight'); prs.push({exId:it.exId,name:it.name,type:'weight',value:wt}); }
      const e = estimate1RM(wt,rp);
      if(e>best.maxE && best.maxE>0 && !seen.has(it.exId+':e1rm')){ seen.add(it.exId+':e1rm'); prs.push({exId:it.exId,name:it.name,type:'e1rm',value:e}); }
    });
  });
  workout.prs = prs;
}

function renderWorkoutList(){
  const list = $('#workout-list');
  if(!session) return;
  list.innerHTML = session.items.map((it,i)=>{
    const last = lastSetsForEx(it.exId);
    const sugg = suggestForEx(it.exId);
    const unit = it.lb ? 'LB' : 'KG';
    const conv = w => it.lb ? (w/0.4536).toFixed(1) : w;
    const refHtml = last ? `<div class="prev-ref">上次（${fmtMD(last.date)}）：${last.sets.map(s=>`${conv(s.weight)}×${s.reps}`).join(' / ')}<button class="fill-last" data-act="fillLast" data-ex="${i}">填入上次</button></div>` : '';
    const suggHtml = sugg ? `<div class="sugg-row">⚡ 自动进阶：${conv(sugg.weight)}${unit} × ${sugg.reps}（${sugg.reason}）<button data-act="applySugg" data-ex="${i}">应用</button></div>` : '';
    const restTag = it.restSec>0 ? `<span class="tag grey" style="margin-left:4px;">休息${it.restSec}s</span>` : '';
    const supTag = it.supersetWith!==null ? `<span class="tag warn" style="margin-left:4px;">超级组</span>` : '';
    const notesTag = it.notes ? `<div style="font-size:11px;color:var(--accent);padding:2px 0 4px 60px;">📝 ${escapeHtml(it.notes)}</div>` : '';
    const rows = it.sets.map((s,j)=>{
      const refSet = last && last.sets[j];
      const phW = refSet ? conv(refSet.weight) : '0';
      const phR = refSet ? refSet.reps : '0';
      const wLabel = s.warmup ? '<span style="font-size:9px;color:var(--warn);">热身</span>' : '';
      return `
      <tr class="${s.warmup?'warmup-row':''}">
        <td>${j+1}${wLabel}</td>
        <td><input type="number" inputmode="decimal" placeholder="${phW}" value="${s.weight}" data-ex="${i}" data-set="${j}" data-f="weight"></td>
        <td><input type="number" inputmode="numeric" placeholder="${phR}" value="${s.reps}" data-ex="${i}" data-set="${j}" data-f="reps"></td>
        <td class="rpe"><button class="rpe-btn ${s.rpe?'hot':''}" data-act="rpeOpen" data-ex="${i}" data-set="${j}">${s.rpe||'—'}</button></td>
        <td class="done-cell">
          <button class="set-done-btn ${s.done?'completed':''}" data-act="doneSet" data-ex="${i}" data-set="${j}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </td>
        <td class="set-act-cell">
          <button class="set-act-btn" data-act="setMenu" data-ex="${i}" data-set="${j}" title="组操作">⋮</button>
        </td>
      </tr>`;
    }).join('');
    return `
      <div class="ex-card ${it.supersetWith!==null?'superset-card':''}">
        <div class="ex-head">
          <div class="ex-thumb" style="background:${partColor(it.part)+'22'};color:${partColor(it.part)};overflow:hidden;padding:4px;">${EX_SVG[it.svg] || it.icon}</div>
          <div class="ex-info">
            <div class="ex-name">${escapeHtml(it.name)}${supTag}</div>
            <div class="ex-meta">${it.part} · ${it.equip}${restTag}</div>
          </div>
          <button class="set-done-btn" data-act="exMenu" data-ex="${i}" title="动作设置" style="color:var(--accent);border-color:var(--accent-light);background:var(--accent-light);">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
        ${refHtml}${suggHtml}${notesTag}
        <table class="sets-table">
          <thead><tr><th>组</th><th>${unit}</th><th>次</th><th class="rpe">RPE</th><th>完成</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="add-set-btn" data-act="addSet" data-ex="${i}">+ 添加一组</button>
      </div>`;
  }).join('');
}

/* ---------- 单动作设置菜单 ---------- */
function openExMenu(i){
  const it = session.items[i];
  const hasNext = i+1 < session.items.length;
  const isSup = it.supersetWith!==null;
  openSheet(`
    <h3>动作菜单 · ${escapeHtml(it.name)}</h3>
    <div class="ex-menu-list">
      <div class="ex-menu-item" data-act="exTimer" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#eff6ff;color:#2563eb;">⏱</div>
        <div class="ex-menu-t"><div class="n">计时设置</div><div class="s">设置该动作的组间休息秒数（当前${it.restSec>0?it.restSec+'秒':'默认'+(state.settings.restSec)+'秒'}）</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exNotes" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#fffbeb;color:#f59e0b;">💡</div>
        <div class="ex-menu-t"><div class="n">记录想法</div><div class="s">记录训练心得与动作备注</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exLB" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#f0fdf4;color:#22c55e;">⚖</div>
        <div class="ex-menu-t"><div class="n">${it.lb?'切换为KG':'修改为LB'}</div><div class="s">将本动作重量单位切换为${it.lb?'千克':'磅'}</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exSuperset" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#fdf2f8;color:#ec4899;">🔗</div>
        <div class="ex-menu-t"><div class="n">${isSup?'取消超级组':'超级组'}</div><div class="s">${isSup?'解除与下一动作的组合':'将两个力量动作组合为超级组'}</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exReplace" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#f0f9ff;color:#0ea5e9;">🔄</div>
        <div class="ex-menu-t"><div class="n">替换动作</div><div class="s">用另一个动作替换当前动作</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exDelete" data-ex="${i}" style="color:#ef4444;">
        <div class="ex-menu-ic" style="background:#fee2e2;color:#ef4444;">🗑</div>
        <div class="ex-menu-t"><div class="n" style="color:#ef4444;">删除动作</div><div class="s">从当前训练中移除此动作</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
    </div>
    <div style="margin-top:12px;"><button class="btn block" data-act="closeSheet">关闭</button></div>
  `);
}

/* ---------- 单组操作菜单 ---------- */
function openSetMenu(i, j){
  const s = session.items[i].sets[j];
  openSheet(`
    <h3>第${j+1}组 · ${escapeHtml(session.items[i].name)}</h3>
    <div class="ex-menu-list">
      <div class="ex-menu-item" data-act="setCopyDown" data-ex="${i}" data-set="${j}">
        <div class="ex-menu-ic" style="background:#eff6ff;color:#2563eb;">📋</div>
        <div class="ex-menu-t"><div class="n">向下复制</div><div class="s">在下方插入相同的一组</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="setWarmup" data-ex="${i}" data-set="${j}">
        <div class="ex-menu-ic" style="background:#fffbeb;color:#f59e0b;">🔥</div>
        <div class="ex-menu-t"><div class="n">${s.warmup?'取消热身':'标记热身'}</div><div class="s">标记为热身组（不计入正式组）</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="setDelConfirm" data-ex="${i}" data-set="${j}" style="color:#ef4444;">
        <div class="ex-menu-ic" style="background:#fee2e2;color:#ef4444;">🗑</div>
        <div class="ex-menu-t"><div class="n" style="color:#ef4444;">删除该组</div><div class="s">删除当前这一组数据</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
    </div>
    <div style="margin-top:12px;"><button class="btn block" data-act="closeSheet">关闭</button></div>
  `);
}

/* ---------- RPE 快捷选择 ---------- */
function rpeOpenSheet(i, j){
  const s = session.items[i].sets[j];
  const vals = [6,7,7.5,8,8.5,9,9.5,10];
  openSheet(`
    <h3>RPE · 第${j+1}组 ${escapeHtml(session.items[i].name)}</h3>
    <p style="font-size:12px;color:var(--muted);margin-top:-6px;">RPE = 主观强度（6 轻松 → 10 力竭），用于自动进阶建议</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0;">
      ${vals.map(v=>`<button class="rpe-chip ${+s.rpe===v?'hot':''}" style="width:auto;padding:12px 0;font-size:16px;" data-act="rpeSet" data-ex="${i}" data-set="${j}" data-v="${v}">${v}</button>`).join('')}
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn block" data-act="rpeSet" data-ex="${i}" data-set="${j}" data-v="">清除</button>
      <button class="btn block primary" data-act="closeSheet">完成</button>
    </div>
  `);
}

/* ---------- 训练计时 ---------- */
function startDur(){
  stopDur();
  durInterval = setInterval(()=>{
    if(session && session.running){
      const sec = Math.floor((Date.now() - session.startAt - session.paused)/1000);
      $('#wo-time').textContent = fmtTime(sec);
    }
  },500);
}
function stopDur(){ clearInterval(durInterval); durInterval = null; }

function addSet(i){
  const prev = session.items[i].sets[session.items[i].sets.length-1];
  session.items[i].sets.push({weight:prev?prev.weight:'', reps:prev?prev.reps:'', rpe:'', done:false});
  renderWorkoutList();
}
function delSet(i,j){ session.items[i].sets.splice(j,1); if(!session.items[i].sets.length) addSet(i); renderWorkoutList(); }
function delEx(i){ session.items.splice(i,1); renderWorkoutList(); }
function addExerciseToSession(exId){
  const ex = resolveEx(exId);
  if(!ex || !session) return;
  session.items.push({exId:ex.id,name:ex.name,part:ex.part,equip:ex.equip,icon:ex.icon||ex.part,svg:ex.svg,
    sets:[{weight:'',reps:'',rpe:'',done:false,warmup:false}],
    restSec:0, notes:'', supersetWith:null, lb:false});
  renderWorkoutList();
  toast('已添加 ' + ex.name);
}

/* ---------- 组间休息 ---------- */
function startRest(exIdx){
  const it = (typeof exIdx === 'number' && session && session.items[exIdx]) ? session.items[exIdx] : null;
  restSec = (it && it.restSec > 0) ? it.restSec : state.settings.restSec;
  $('#rest-layer').classList.remove('hidden');
  $('#rest-time').textContent = fmtTime(restSec);
  $('#rest-range').value = restSec;
  updateRest();
}
function updateRest(){
  clearInterval(restInterval);
  let left = restSec;
  $('#rest-time').textContent = fmtTime(left);
  restInterval = setInterval(()=>{
    left--;
    $('#rest-time').textContent = fmtTime(left);
    if(left<=0){ clearInterval(restInterval); finishRest(true); }
  },1000);
}
function finishRest(alarm=false){
  clearInterval(restInterval);
  $('#rest-layer').classList.add('hidden');
  if(alarm){ try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){} toast('休息结束，开始下一组'); }
}

/* ---------- 完成训练 ---------- */
function finishWorkout(){
  if(!session) return;
  stopDur();
  const duration = session.fixedDur ? session.fixedDur*60 : Math.floor((Date.now() - session.startAt - session.paused)/1000);
  const date = session.backfillDate || todayStr();
  let volume=0;
  session.items.forEach(it=>it.sets.forEach(s=>{
    volume += (+s.weight||0)*(+s.reps||0);
  }));
  const workout = {
    id: session.id,
    date,
    type:'strength',
    planName: session.planName,
    duration,
    volume: Math.round(volume),
    items: session.items.map(it=>({
      exId: it.exId,
      name: it.name,
      part: it.part,
      equip: it.equip,
      sets: it.sets.filter(s=>s.weight||s.reps).map(s=>({weight:+s.weight||0, reps:+s.reps||0, rpe:s.rpe||'', done:!!s.done}))
    })).filter(it=>it.sets.length),
    notes: '',
    prs: [],
    programWeek: 1
  };
  if(!workout.items.length){ toast('还没有记录任何数据'); startDur(); return; }
  finalizePRs(workout);
  const samePlan = state.workouts.filter(w=>w.planName===workout.planName).length;
  workout.programWeek = Math.floor(samePlan/3)+1;
  state.workouts.push(workout);
  state.workouts.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  if(!state.checkins.includes(date)){ state.checkins.push(date); state.points += 10; }
  save();
  closeWorkout();
  currentTab = 'stats';
  statsSub = 'history';
  statsMonth = new Date(date+'T12:00:00');
  setTab('stats');
  if(workout.prs.length) toast(`训练完成 🎉 刷新 ${workout.prs.length} 项纪录！`);
  else toast('训练完成，已保存');
}

/* ============================================================
   动作选择器
   ============================================================ */
function openPicker(){
  pickerPart = '全部'; pickerQuery = '';
  $('#ex-picker').classList.remove('hidden');
  renderPicker();
  $('#ep-input').value = ''; $('#ep-input').focus();
}
function closePicker(){ $('#ex-picker').classList.add('hidden'); }
function renderPicker(){
  $('#ep-chips').innerHTML = PARTS.map(p=>`<span class="ep-chip ${pickerPart===p?'active':''}" data-part="${p}">${p}</span>`).join('');
  const list = BUILTIN.filter(ex=>{
    const matchPart = pickerPart==='全部' || ex.part===pickerPart;
    const q = pickerQuery.toLowerCase();
    const matchQ = !q || ex.name.toLowerCase().includes(q) || ex.part.includes(q) || ex.equip.includes(q);
    return matchPart && matchQ;
  });
  $('#ep-list').innerHTML = list.map(ex=>`
    <div class="ep-item" data-act="pickEx" data-id="${ex.id}">
      <div class="ep-thumb" style="background:${partColor(ex.part)+'22'};color:${partColor(ex.part)}">${EX_SVG[ex.svg] || ''}</div>
      <div class="ep-info">
        <div class="ep-name">${escapeHtml(ex.name)}</div>
        <div class="ep-meta">${ex.part} · ${ex.equip} · ${ex.level}</div>
      </div>
      <button class="ep-add"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
    </div>`).join('');
}

/* ============================================================
   计划 / 分组编辑弹窗
   ============================================================ */
function openPlanEditor(plan=null){
  const isNew = !plan;
  const p = plan || {id:uid(),name:'',items:[],folderId:null};
  const selected = new Set(p.items);
  const folderOpts = `<option value="">不分组</option>` + state.folders.map(f=>`<option value="${f.id}" ${p.folderId===f.id?'selected':''}>${escapeHtml(f.name)}</option>`).join('');
  const html = `
    <h3>${isNew?'新建训练计划':'编辑训练计划'}</h3>
    <div class="field"><label>计划名称</label><input id="plan-name" value="${escapeHtml(p.name)}" placeholder="如：胸肌轰炸"/></div>
    <div class="field"><label>所属分组</label><select id="plan-folder">${folderOpts}</select></div>
    <div class="field"><label>选择动作（已选 <span id="plan-count">${selected.size}</span> 个）</label></div>
    <div style="max-height:44vh;overflow-y:auto;padding-right:4px;">
      ${BUILTIN.map(ex=>`
        <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer;">
          <input type="checkbox" class="plan-ex-chk" value="${ex.id}" ${selected.has(ex.id)?'checked':''}>
          <span style="flex:1;font-size:14px;">${escapeHtml(ex.name)} <span style="color:var(--muted);font-size:12px;">· ${ex.part}</span></span>
        </label>
      `).join('')}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      ${isNew?'':'<button class="btn" style="background:#fee2e2;color:#ef4444;" data-act="delPlan" data-id="'+p.id+'">删除</button>'}
      <button class="btn block" data-act="closeSheet">取消</button>
      <button class="btn block primary" data-act="savePlan" data-id="${p.id}" data-new="${isNew?1:0}">保存</button>
    </div>
  `;
  openSheet(html);
}
function openFolderEditor(folder=null){
  const isNew = !folder;
  const f = folder || {id:uid(), name:''};
  const inFolder = new Set(state.plans.filter(p=>p.folderId===f.id).map(p=>p.id));
  const html = `
    <h3>${isNew?'新建分组':'编辑分组'}</h3>
    <div class="field"><label>分组名称</label><input id="folder-name" value="${escapeHtml(f.name)}" placeholder="如：推拉腿循环A"/></div>
    <div class="field"><label>选择包含的计划</label></div>
    <div style="max-height:40vh;overflow-y:auto;">
      ${state.plans.length ? state.plans.map(p=>`
        <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer;">
          <input type="checkbox" class="folder-plan-chk" value="${p.id}" ${inFolder.has(p.id)?'checked':''}>
          <span style="flex:1;font-size:14px;">${escapeHtml(p.name)} <span style="color:var(--muted);font-size:12px;">· ${p.items.length}个动作</span></span>
        </label>
      `).join('') : '<div class="empty" style="padding:16px;">还没有计划，先创建一个训练计划吧</div>'}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      ${isNew?'':'<button class="btn" style="background:#fee2e2;color:#ef4444;" data-act="dismissFolder" data-id="'+f.id+'">解散</button>'}
      <button class="btn block" data-act="closeSheet">取消</button>
      <button class="btn block primary" data-act="saveFolder" data-id="${f.id}" data-new="${isNew?1:0}">保存</button>
    </div>
  `;
  openSheet(html);
}

/* v8.13: openSheet 重构——根治"全局弹窗只能第一次打开"问题
   关键修复：
   1. 每次 openSheet 前强制清理 wheelCtx / _todayEmoji / _quickItems / _cardioState / _supersetAfterPick 等全局 sheet 状态
   2. 移除外层 overlay click 关闭——通过 sheet 内部"取消/×"按钮关闭（避免 click 路径混乱）
   3. closeSheet 强制清空 #sheet innerHTML + 清 wheelCtx
*/
function _cleanupSheetState(){
  try{
    window._todayEmoji = null;
    window._quickItems = null;
    window._quickDate = null;
    window._cardioState = null;
    window._supersetAfterPick = null;
    window._afterPickQuick = null;
    window._bdFormState = null;
    var sheet = document.getElementById('sheet');
    if(sheet && sheet._fwHandler){
      sheet.removeEventListener('click', sheet._fwHandler);
      sheet._fwHandler = null;
    }
  }catch(e){}
}
function openSheet(html, fullScreen){
  _cleanupSheetState();
  var sheet = $('#sheet');
  /* 先清空旧内容，避免 wheel listener 累积 */
  sheet.innerHTML = '';
  sheet.innerHTML = html;
  sheet.classList.remove('hidden');
  if(fullScreen){
    sheet.classList.add('fullscreen-sheet');
  } else {
    sheet.classList.remove('fullscreen-sheet');
  }
  var ov = $('#overlay');
  if(ov) ov.classList.remove('hidden');
}
function closeSheet(){
  /* 强制清空所有 sheet 状态 + 隐藏 */
  _cleanupSheetState();
  var sheet = $('#sheet');
  if(sheet){
    sheet.classList.add('hidden');
    sheet.innerHTML = '';
  }
  var ov = $('#overlay');
  if(ov) ov.classList.add('hidden');
}

/* ============================================================
   事件处理
   ============================================================ */
document.addEventListener('click', e=>{
  const tab = e.target.closest('.tab');
  if(tab){ setTab(tab.dataset.tab); return; }

  const act = e.target.closest('[data-act]');
  if(!act) return;
  const a = act.dataset.act;

  // 首页
  if(a==='startPlan'){ closeFolderView(); startPlan(act.dataset.id); return; }
  if(a==='startPreset'){ startPlan(act.dataset.id, true); return; }
  if(a==='newPlan'){ openPlanEditor(); return; }
  if(a==='editPlan'){ const p=state.plans.find(x=>x.id===act.dataset.id); if(p) openPlanEditor(p); return; }
  if(a==='delPlan'){
    const id = act.dataset.id;
    state.plans = state.plans.filter(p=>p.id!==id);
    save(); closeSheet(); render(); if(activeFolder) renderFolderView();
    toast('计划已删除'); return;
  }
  if(a==='newFolder'){ openFolderEditor(); return; }
  if(a==='editFolder'){ const f=state.folders.find(x=>x.id===act.dataset.id); if(f) openFolderEditor(f); return; }
  if(a==='openFolder'){ openFolder(act.dataset.id); return; }
  if(a==='closeFolder'){ closeFolderView(); return; }
  if(a==='dismissFolder'){
    const id = act.dataset.id;
    state.plans.forEach(p=>{ if(p.folderId===id) p.folderId=null; });
    state.folders = state.folders.filter(f=>f.id!==id);
    save(); closeSheet(); closeFolderView(); render();
    toast('分组已解散，计划保留'); return;
  }
  if(a==='openNotify'){
    const streak = (function(){ let s=0; const d=new Date(); while(state.checkins.includes(todayStr(d))){ s++; d.setDate(d.getDate()-1); } return s; })();
    openStaticSheet('通知中心', `🏅 当前积分 <b style="color:var(--accent);">${state.points}</b><br>🔥 连续打卡 <b style="color:var(--accent);">${streak}</b> 天<br>📅 累计打卡 ${state.checkins.length} 天<br><br>每完成一次力量训练 +10 分，有氧 +5 分。继续加油！`);
    return;
  }

  // 动作库
  if(a==='libPart'){ libPart=act.dataset.part; libTarget='全部'; render(); return; }
  if(a==='libTarget'){ libTarget=act.dataset.target; render(); return; }
  if(a==='libDetail'){
    const ex=resolveEx(act.dataset.id); if(!ex) return;
    const svg = EX_SVG[ex.svg] || '';
    const inSession = !!session;
    openSheet(`
      <div style="text-align:center;margin-bottom:14px;">
        <div style="width:100%;height:140px;background:${partColor(ex.part)+'18'};border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;">${svg}</div>
        <div style="font-size:18px;font-weight:700;">${escapeHtml(ex.name)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px;">${ex.part} · ${ex.target} · ${ex.equip} · ${ex.level}</div>
      </div>
      <div style="background:#f9fafb;border-radius:12px;padding:12px;font-size:14px;line-height:1.6;margin-bottom:16px;">
        <b>动作要点：</b>${escapeHtml(ex.tip)}
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn block" data-act="closeSheet">关闭</button>
        ${inSession?`<button class="btn block primary" data-act="addLibToSession" data-id="${ex.id}">加入当前训练</button>`:`<button class="btn block primary" data-act="addLibToPlan" data-id="${ex.id}">加入计划</button>`}
      </div>
    `);
    return;
  }
  if(a==='addLibToSession'){ addExerciseToSession(act.dataset.id); closeSheet(); return; }
  if(a==='addLibToPlan'){
    const ex=resolveEx(act.dataset.id); if(!ex) return;
    const opts = state.plans.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    openSheet(`
      <h3>加入计划</h3>
      <div class="field"><label>选择计划</label><select id="lp-plan">${opts}</select></div>
      <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="confirmAddToPlan" data-ex="${ex.id}">确定</button></div>
    `);
    return;
  }
  if(a==='confirmAddToPlan'){
    const pid=$('#lp-plan').value;
    const p=state.plans.find(x=>x.id===pid);
    const exId=act.dataset.ex;
    if(p){ p.items.push(exId); save(); closeSheet(); render(); toast('已加入计划'); }
    return;
  }

  // 统计
  if(a==='statHistory'){ statsSub='history'; render(); return; }
  if(a==='statSummary'){ statsSub='summary'; render(); return; }
  if(a==='prevMonth'){ statsMonth.setMonth(statsMonth.getMonth()-1); render(); return; }
  if(a==='nextMonth'){ statsMonth.setMonth(statsMonth.getMonth()+1); render(); return; }
  if(a==='todayMonth'){ statsMonth=new Date(); render(); return; }
  if(a==='viewDay'){ viewDay(act.dataset.date); return; }
  if(a==='viewWorkout'){ closeSheet(); openDetail(act.dataset.id); return; }
  if(a==='dayAddHistory'){ dayAddHistory(act.dataset.date); return; }
  if(a==='dayAddCardio'){ dayAddCardio(act.dataset.date); return; }
  if(a==='startBackfill'){
    const date = $('#bh-date').value || todayStr();
    const planVal = $('#bh-plan').value;
    const dur = Math.max(0, +$('#bh-dur').value || 0);
    closeSheet();
    if(planVal==='blank'){ newSession('自由训练', [], {backfillDate:date, fixedDur:dur}); }
    else if(planVal.startsWith('preset:')){ startPlan(planVal.slice(7), true, {backfillDate:date, fixedDur:dur}); }
    else { startPlan(planVal, false, {backfillDate:date, fixedDur:dur}); }
    return;
  }
  if(a==='saveCardio'){ saveCardio(); return; }

  // 详情页
  if(a==='closeDetail'){ closeDetail(); return; }
  if(a==='aiAnalyze'){ aiAnalyze(); return; }
  if(a==='delWorkout'){
    openSheet(`<h3>删除该记录</h3><p style="color:var(--muted);font-size:14px;">删除后不可恢复，确定吗？</p>
      <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" style="background:#ef4444;" data-act="confirmDelWorkout">确定删除</button></div>`);
    return;
  }
  if(a==='confirmDelWorkout'){
    state.workouts = state.workouts.filter(w=>w.id!==activeDetail);
    save(); closeSheet(); closeDetail(); toast('已删除'); return;
  }
  if(a==='editDetailNotes'){
    const w=state.workouts.find(x=>x.id===activeDetail); if(!w) return;
    openSheet(`<h3>编辑训练状态</h3>
      <div class="field"><textarea id="wo-notes" placeholder="泵感如何？有没有新的感悟？">${escapeHtml(w.notes||'')}</textarea></div>
      <div style="display:flex;gap:10px;margin-top:12px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="saveDetailNotes">保存</button></div>`);
    return;
  }
  if(a==='saveDetailNotes'){
    const w=state.workouts.find(x=>x.id===activeDetail); if(w){ w.notes=$('#wo-notes').value.trim(); save(); closeSheet(); renderDetail(w); toast('已保存'); }
    return;
  }
  if(a==='addBodyWeightFromDetail'){
    openSheet(`<h3>记录体重</h3>
      <div class="field"><input id="bw-inp" type="number" step="0.1" value="${lastBodyWeight()}"/></div>
      <div style="display:flex;gap:10px;margin-top:12px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="saveBodyWeight" data-date="${act.dataset.date}">保存</button></div>`);
    return;
  }
  if(a==='saveBodyWeight'){
    const val=+$('#bw-inp').value; if(!val){ toast('请输入体重'); return; }
    const date=act.dataset.date||todayStr();
    const idx=state.bodyLog.findIndex(b=>b.date===date);
    if(idx>=0) state.bodyLog[idx].weight=val; else state.bodyLog.push({date,weight:val,bodyFat:'',bmr:'',chest:'',waist:'',hip:'',skeletal:'',visceral:''});
    state.bodyLog.sort((x,y)=>x.date<y.date?-1:1);
    save(); closeSheet();
    const w=state.workouts.find(x=>x.id===activeDetail); if(w) renderDetail(w);
    toast('体重已记录'); return;
  }

  // 我的
  if(a==='editProfile'){
    const p=state.profile;
    openSheet(`<h3>编辑资料</h3>
      <div class="field"><label>昵称</label><input id="p-name" value="${escapeHtml(p.name)}"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field"><label>身高 cm</label><input id="p-h" type="number" value="${p.height}"/></div><div class="field"><label>体重 kg</label><input id="p-w" type="number" value="${p.weight}"/></div></div>
      <div class="field"><label>健身目标</label><input id="p-goal" value="${escapeHtml(p.goal)}"/></div>
      <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="saveProfile">保存</button></div>`);
    return;
  }
  if(a==='setRest'){
    openSheet(`<h3>默认休息时长</h3>
      <div class="field"><input id="rest-input" type="number" value="${state.settings.restSec}"/> 秒</div>
      <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="saveRest">保存</button></div>`);
    return;
  }
  if(a==='openBodyData'){ openBodyDataPage(); return; }
  if(a==='closeBodyData'){ closeBodyDataPage(); return; }
  if(a==='addBodyRecord'){ openBodyRecordSheet(); return; }
  if(a==='delBodyLog'){
    state.bodyLog = state.bodyLog.filter(b=>b.date!==act.dataset.date);
    save(); renderBodyData(); toast('已删除'); return;
  }
  if(a==='gotoLibrary'){ setTab('library'); return; }
  if(a==='openMyStatus'){ openMyStatus(); return; }
  if(a==='openAIReport'){ openAIReport(); return; }
  if(a==='openPerms'){ openStaticSheet('权限说明','FitRecord 为纯本地应用：<br><br>· 所有训练与身体数据仅存储在您设备的浏览器本地存储中<br>· 不需要网络权限即可完整使用（离线可用）<br>· 不访问相册、位置、通讯录等任何系统权限<br>· 建议定期使用「导出数据」备份'); return; }
  if(a==='openAbout'){ openStaticSheet('关于我们','FitRecord 网页版 v3.0<br><br>一款专注力量训练记录的轻量工具：训练计划、RPE 强度管理、自动进阶建议、PR 纪录追踪、身体数据管理。<br><br>练得明白，进步看得见。'); return; }
  if(a==='openFeedback'){ openStaticSheet('意见反馈','使用中遇到问题或有功能建议？<br><br>· 直接在对话中告诉我即可<br>· 常见问题：若页面显示异常，可尝试下拉刷新或清除浏览器缓存<br><br>📱 微信：<b style="color:#7cf0a9;font-size:18px;">hs468564247</b><br><small style="color:#94a3b8;">（搜索或长按复制均可，长期接收反馈与建议）</small><br><br>感谢反馈，让 FitRecord 变得更好。'); return; }
  if(a==='openPrivacy'){ openStaticSheet('隐私协议','1. 本应用不收集、上传任何个人数据<br>2. 训练记录、身体数据均保存在本机浏览器 localStorage<br>3. 清除浏览器数据会导致记录丢失，请定期导出备份<br>4. 不接入第三方统计或广告 SDK'); return; }
  if(a==='exportData'){ exportCSV(); return; }
  if(a==='clearAll'){
    openSheet(`<h3>清空所有数据</h3><p style="color:var(--muted);font-size:14px;">此操作不可恢复，确定吗？建议先导出 CSV 备份。</p>
      <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" style="background:#ef4444;" data-act="confirmClear">确定清空</button></div>`);
    return;
  }

  // 训练进行页
  if(a==='backWorkout'){
    openSheet(`<h3>退出训练</h3><p style="color:var(--muted);font-size:14px;">退出后当前训练数据将不保存</p>
      <div style="display:flex;gap:10px;margin-top:16px;"><button class="btn block" data-act="closeSheet">继续训练</button><button class="btn block primary" style="background:#ef4444;" data-act="confirmBack">退出</button></div>`);
    return;
  }
  if(a==='toggleTimer'){
    if(session.running){ session.pauseStart=Date.now(); session.running=false; }
    else { session.paused += Date.now()-session.pauseStart; session.running=true; }
    return;
  }
  if(a==='finishWorkout'){ finishWorkout(); return; }
  if(a==='addExercise'){ openPicker(); return; }
  if(a==='doneSet'){
    const i=+act.dataset.ex, j=+act.dataset.set;
    const set = session.items[i].sets[j];
    if(!set.done && !set.weight && !set.reps){
      const ref = lastSetsForEx(session.items[i].exId);
      if(ref && ref.sets[j]){ set.weight = ref.sets[j].weight; set.reps = ref.sets[j].reps; }
    }
    set.done = !set.done;
    if(set.done){ checkSetPR(session.items[i], set); startRest(i); }
    renderWorkoutList();
    return;
  }
  if(a==='addSet'){ addSet(+act.dataset.ex); return; }
  if(a==='delSet'){ delSet(+act.dataset.ex, +act.dataset.set); return; }
  if(a==='delEx'){ delEx(+act.dataset.ex); return; }
  if(a==='fillLast'){
    const i=+act.dataset.ex;
    const ref = lastSetsForEx(session.items[i].exId);
    if(ref){
      session.items[i].sets = ref.sets.map(s=>({weight:s.weight, reps:s.reps, rpe:'', done:false}));
      renderWorkoutList(); toast('已填入上次成绩');
    }
    return;
  }
  if(a==='applySugg'){
    const i=+act.dataset.ex, s=suggestForEx(session.items[i].exId);
    if(s){ session.items[i].sets.forEach(set=>{ set.weight=s.weight; set.reps=s.reps; }); renderWorkoutList(); toast('已应用进阶建议'); }
    return;
  }
  if(a==='rpeOpen'){ rpeOpenSheet(+act.dataset.ex, +act.dataset.set); return; }
  if(a==='rpeSet'){
    const i=+act.dataset.ex, j=+act.dataset.set;
    session.items[i].sets[j].rpe = act.dataset.v;
    closeSheet(); renderWorkoutList(); return;
  }

  // 动作选择器
  if(a==='closePicker'){ closePicker(); return; }
  if(a==='pickEx'){ addExerciseToSession(act.dataset.id); closePicker(); return; }

  // 休息倒计时
  if(a==='restSkip'){ finishRest(false); return; }
  if(a==='restAdd15'){ restSec+=15; updateRest(); return; }
  if(a==='restSub10'){ restSec=Math.max(10,restSec-10); updateRest(); return; }

  // Sheet 内通用
  if(a==='closeSheet'){ closeSheet(); return; }
  if(a==='confirmBack'){ closeSheet(); closeWorkout(); return; }
  /* v8.11 新增事件绑定（统计点击日期/快速记录/有氧记录） */
  if(a==='viewDay'){ viewDay(act.dataset.date); return; }
  if(a==='dayAddHistory'){ dayAddHistory(act.dataset.date); return; }
  if(a==='dayAddCardio'){ dayAddCardio(act.dataset.date); return; }
  if(a==='quickAddEx'){ quickAddEx(); return; }
  if(a==='quickFinish'){ quickFinish(); return; }
  if(a==='quickDelEx'){ quickDelEx(+act.dataset.idx); return; }
  if(a==='pickCardioKind'){ pickCardioKind(); return; }
  if(a==='pickCardioItem'){
    var k = act.dataset.kind;
    if(window._cardioState){
      window._cardioState.kind = k;
      var nameEl = document.getElementById('cd-name');
      var iconEl = document.getElementById('cd-icon');
      if(nameEl) nameEl.textContent = k;
      if(iconEl){
        var icMap = {'跑步':'🏃','骑行':'🚴','游泳':'🏊','跳绳':'🤸','椭圆机':'🚣','划船机':'🚣','有氧操':'💃','HIIT':'⚡','快走':'🚶','爬楼':'🪜'};
        iconEl.textContent = icMap[k] || '🏃';
      }
    }
    closeSheet();
    return;
  }
  if(a==='saveCardioNew'){ saveCardioNew(); return; }
  /* v8.14: 每日记录弹窗深色主题关闭按钮 */
  if(a==='daySheetClose'){ closeSheet(); return; }
  /* v8.13 路径A：主页单项独立点击编辑 */
  if(a==='bdEditField'){
    e.preventDefault();
    var fieldName = act.dataset.field;
    bdQuickEditField(fieldName);
    return;
  }
  /* v8.14: fwOk/fwCancel/fwClose 已废弃（彻底删除滚轮） */
  if(a==='saveProfile'){
    state.profile.name = $('#p-name').value;
    state.profile.height = +$('#p-h').value || 170;
    state.profile.weight = +$('#p-w').value || 65;
    state.profile.goal = $('#p-goal').value;
    save(); closeSheet(); render(); toast('已保存'); return;
  }
  if(a==='saveRest'){
    state.settings.restSec = Math.max(10, +$('#rest-input').value || 60);
    save(); closeSheet(); render(); toast('已保存'); return;
  }
  if(a==='savePlan'){
    const name = $('#plan-name').value.trim();
    if(!name){ toast('请输入计划名称'); return; }
    const items = Array.from($$('.plan-ex-chk:checked')).map(ch=>ch.value);
    const folderId = $('#plan-folder').value || null;
    const id = act.dataset.id;
    const idx = state.plans.findIndex(p=>p.id===id);
    const plan = {id,name,items,folderId};
    if(idx>=0) state.plans[idx]=plan; else state.plans.push(plan);
    save(); closeSheet(); render(); if(activeFolder) renderFolderView();
    toast('计划已保存'); return;
  }
  if(a==='saveFolder'){
    const name = $('#folder-name').value.trim();
    if(!name){ toast('请输入分组名称'); return; }
    const id = act.dataset.id;
    const idx = state.folders.findIndex(f=>f.id===id);
    if(idx>=0) state.folders[idx].name = name; else state.folders.push({id, name});
    const chosen = new Set($$('.folder-plan-chk:checked').map(ch=>ch.value));
    state.plans.forEach(p=>{
      if(chosen.has(p.id)) p.folderId = id;
      else if(p.folderId===id) p.folderId = null;
    });
    save(); closeSheet(); render(); if(activeFolder) renderFolderView();
    toast('分组已保存'); return;
  }
  if(a==='confirmClear'){ localStorage.removeItem(DB_KEY); localStorage.removeItem('fitrecord_v2'); localStorage.removeItem('fitrecord_v1'); state=defaultState(); save(); closeSheet(); render(); toast('数据已清空'); return; }
  if(a==='saveBodyData'){
    /* v8.14: 完整表单批量保存——所有字段均为 input number */
    var weightInput = +($('#bd-weight').value || 0);
    if(!weightInput){ toast('请输入体重'); return; }
    var date = $('#bd-date').value || todayStr();
    var heightInput = +($('#bd-height').value || 0);
    var newEntry = {
      date: date,
      weight: weightInput,
      height: heightInput || undefined,
      bodyFat: $('#bd-fat').value || '',
      bmr: $('#bd-bmr').value || '',
      chest: $('#bd-chest').value || '',
      waist: $('#bd-waist').value || '',
      hip: $('#bd-hip').value || '',
      skeletal: $('#bd-skel').value || '',
      visceral: $('#bd-visc').value || ''
    };
    if(!newEntry.height) delete newEntry.height;
    state.bodyLog = state.bodyLog || [];
    state.bodyLog.push(newEntry);
    state.bodyLog.sort(function(x,y){return (x.date||'').localeCompare(y.date||'');});
    if(heightInput > 0){
      state.profile = state.profile || {};
      state.profile.height = heightInput;
    }
    save();
    window._bdFormState = null;
    closeSheet();
    if(!$('#bodydata-view').classList.contains('hidden')) renderBodyData();
    else render();
    toast('已保存 '+date+' 的身体数据');
    return;
  }
});

// 动作选择器分类
document.addEventListener('click', e=>{
  const chip = e.target.closest('.ep-chip[data-part]');
  if(chip){ pickerPart=chip.dataset.part; renderPicker(); return; }
});
document.addEventListener('input', e=>{
  if(e.target.id==='ep-input'){ pickerQuery=e.target.value.trim(); renderPicker(); return; }
  if(e.target.id==='lib-search'){ libQuery=e.target.value.trim(); render(); return; }
});

/* v8.11: 今日状态 emoji 选择（统计页点击日期） */
document.addEventListener('click', function(e){
  var em = e.target && e.target.closest ? e.target.closest('.ds-emoji[data-emoji]') : null;
  if(!em) return;
  e.stopPropagation();
  var emo = em.dataset.emoji;
  window._todayEmoji = emo;
  document.querySelectorAll('.ds-emoji').forEach(function(x){
    x.classList.toggle('active', x.dataset.emoji === emo);
  });
  var today = todayStr();
  state.workouts.forEach(function(w){
    if(w.date === today) w.mood = emo;
  });
  state.mood = state.mood || {};
  state.mood[today] = emo;
  save();
  toast('已记录今日状态：' + emo);
});

// 训练输入实时保存
document.addEventListener('input', e=>{
  const t=e.target;
  if(t.dataset && t.dataset.ex!==undefined && session && t.dataset.f){
    const i=+t.dataset.ex, j=+t.dataset.set, f=t.dataset.f;
    session.items[i].sets[j][f]=t.value;
  }
});
// 力量曲线动作切换
document.addEventListener('change', e=>{
  if(e.target.id==='ex-prog'){ exProgId=e.target.value; render(); return; }
  if(e.target.id==='rest-range'){ updateRest(); }
  if(e.target.classList && e.target.classList.contains('plan-ex-chk')){
    const n = $$('.plan-ex-chk:checked').length;
    const el = $('#plan-count'); if(el) el.textContent = n;
  }
});

// 休息时长拖动
document.addEventListener('input', e=>{
  if(e.target.id==='rest-range'){
    restSec = +e.target.value;
    $('#rest-time').textContent = fmtTime(restSec);
  }
});

/* ============================================================
   CSV 导出
   ============================================================ */
function exportCSV(){
  let rows = [['date','type','plan','exercise','part','set','weight','reps','rpe','duration_min','distance_km','kcal','done']];
  state.workouts.forEach(w=>{
    if(w.type==='cardio'){
      rows.push([w.date,'cardio',w.planName,w.cardio?w.cardio.kind:'','','','','','',Math.round((w.duration||0)/60),w.cardio?w.cardio.distance:'',w.cardio?w.cardio.kcal:'','1']);
      return;
    }
    w.items.forEach(it=>{
      it.sets.forEach((s,idx)=>{
        rows.push([w.date,'strength',w.planName,it.name,it.part,idx+1,s.weight,s.reps,s.rpe||'',Math.round((w.duration||0)/60),'','',s.done?'1':'0']);
      });
    });
  });
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='fitrecord_workouts.csv'; a.click();
  URL.revokeObjectURL(url); toast('已导出 CSV');
}

/* ============================================================
   启动
   ============================================================ */
function init(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  setTab('train');
}
init();