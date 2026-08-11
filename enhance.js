/* ============================================================
   FitRecord v4 增强包（原创作品）
   后加载，覆盖 app.js 中同名函数
   © 2026 Acffx · 原创 · 保留所有权利
   未经许可禁止商用、二次发布、去除版权标识
   ============================================================ */
'use strict';

/* ---------- 动作配图（AI 生成，本地文件，离线可用） ---------- */
const EX_IMG = {
  press:'img/ex_press.jpg', fly:'img/ex_fly.jpg', row:'img/ex_row.jpg',
  pulldown:'img/ex_pulldown.jpg', squat:'img/ex_squat.jpg', legpress:'img/ex_legpress.jpg',
  legcurl:'img/ex_legcurl.jpg', ohp:'img/ex_ohp.jpg', latraise:'img/ex_latraise.jpg',
  curl:'img/ex_curl.jpg', triext:'img/ex_triext.jpg', hipthrust:'img/ex_hipthrust.jpg',
  crunch:'img/ex_crunch.jpg', cardio:'img/ex_cardio.jpg', hipab:'img/ex_hipab.jpg',
  facepull:'img/ex_facepull.jpg', hyper:'img/ex_hyper.jpg', calf:'img/ex_calf.jpg',
  pullup:'img/ex_pullup.jpg', hangleg:'img/ex_hangleg.jpg', kb:'img/ex_kb.jpg',
  band:'img/ex_band.jpg'
};
const PART_IMG = {
  '胸':'img/ex_press.jpg','背':'img/ex_pullup.jpg','腿':'img/ex_squat.jpg','臀':'img/ex_hipthrust.jpg',
  '肩':'img/ex_ohp.jpg','手臂':'img/ex_curl.jpg','核心':'img/ex_crunch.jpg','有氧':'img/ex_cardio.jpg',
  '全身':'img/hero_gym.jpg','拉伸':'img/ex_band.jpg'
};

/* ---------- 后台训练持久化：state 字段初始化 ---------- */
try{
  if(state){
    if(!('currentWorkout' in state)) state.currentWorkout = null;
    if(!('collapsedEx' in state)) state.collapsedEx = {};
    if(!('sheetLock' in state)) state.sheetLock = false;
  }
}catch(e){}
function exImgHTML(ex, fallbackColor){
  if(ex && ex.img) return '<img src="'+ex.img+'" alt="" loading="lazy">';
  const key = ex && ex.svg;
  if(key && EX_IMG[key]) return '<img src="'+EX_IMG[key]+'" alt="" loading="lazy">';
  return EX_SVG[(ex&&ex.svg)||'band'] || '';
}

/* ---------- 计划封面：换真图 ---------- */
function planArt(plan){
  const first = plan.items && plan.items.length ? resolveEx(plan.items[0]) : null;
  const src = (first && first.img) || (first && EX_IMG[first.svg]) || PART_IMG[first ? first.part : '全身'] || PART_IMG['全身'];
  return '<img class="art-img" src="'+src+'" alt="" loading="lazy">';
}

/* ---------- 训练页头图（包装原函数，避免同名声明提升问题） ---------- */
const _openWorkoutBase = openWorkout;
openWorkout = function(){
  // 开始新训练时清掉后台残留（如有）
  if(state && state.currentWorkout){
    state.currentWorkout = null;
    try{save();}catch(e){}
  }
  _openWorkoutBase();
  const hero = $('#workout-hero');
  hero.style.background = 'linear-gradient(180deg,rgba(10,14,24,.25),rgba(10,14,24,.55)),url("img/hero_gym.jpg") center 28%/cover no-repeat,#141a26';
  // 绑定折叠 / 长按拖动
  setTimeout(bindWorkoutListUI, 0);
};

/* ---------- closeWorkout：保留 session 到 state.currentWorkout ---------- */
const _closeWorkoutBase = closeWorkout;
closeWorkout = function(){
  // 不停掉计时器，session 不清空；只藏视图 + 保存后台
  $('#workout-view').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  if(currentTab!=='train') $('#topbar').classList.remove('hidden');
  if(state){ state.currentWorkout = session; try{save();}catch(e){} }
  render();
};

/* ---------- finishWorkout：完成时清理后台 ---------- */
const _finishWorkoutBase = finishWorkout;
finishWorkout = function(){
  _finishWorkoutBase();
  if(state){ state.currentWorkout = null; try{save();}catch(e){} }
};

/* ---------- 顶栏：动作库页也隐藏（用页内搜索条） ---------- */
function setTab(tab){
  currentTab = tab;
  $$('#tabbar .tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  $('#topbar').classList.toggle('hidden', tab === 'train' || tab === 'library');
  if(tab !== 'train' && tab !== 'library'){
    const titles={stats:'统计',me:'我的'};
    $('#topbar-title').textContent = titles[tab] || 'FitRecord';
  }
  render();
}

/* ============================================================
   首页：唯一「新建计划」入口
   ============================================================ */
function renderHome(){
  const folders = state.folders.map(folderCardHTML).join('');
  const solo = state.plans.filter(p=>!p.folderId || !state.folders.find(f=>f.id===p.folderId)).map(planCardHTML).join('');

  // 计算"我的训练计划"总数，决定缩略网格列数
  const soloCount = state.plans.filter(p=>!p.folderId || !state.folders.find(f=>f.id===p.folderId)).length;
  const totalItems = state.folders.length + soloCount;
  let colsClass = 'cols-1';
  if(totalItems === 2) colsClass = 'cols-2';
  else if(totalItems >= 3) colsClass = 'cols-many';

  const newPlanCard = `
    <div class="new-plan-card" data-act="newPlan">
      <span class="np-ic">+</span>新建计划
    </div>`;
  const libCards = PRESETS.map(pr=>`
    <div class="lib-card" data-act="startPreset" data-id="${pr.id}">
      <div class="lib-bg"><img class="art-img" src="${PART_IMG[pr.part]||PART_IMG['全身']}" alt="" loading="lazy"></div>
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

  // 训练中缩略卡（若有后台训练）
  const mini = activeMiniHTML();
  return `
    ${mini}
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
      </div>
    </div>
    <div class="date-str">${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日</div>
    <div class="section-title">
      <h2>我的训练计划 <span style="font-size:18px;">🔥</span></h2>
    </div>
    ${(folders || solo) ? `<div class="plans-folders ${colsClass}">${folders}${solo || ''}</div>` : ''}
    ${newPlanCard}
    <div class="section-title"><h2>系统内置训练库 <span style="font-size:18px;">🚩</span></h2></div>
    <div class="lib-scroll">${libCards}</div>
  `;
}

/* ============================================================
   动作库 v2（侧栏解剖部位 + 器械筛选 + 列表 + 新建动作）
   ============================================================ */
const LIB_CATS = [
  {key:'全身', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.6" r="2.1"/><path d="M12 7.4v5.2M12 9.4L7.2 12M12 9.4l4.8 2.6M12 12.6L8.6 20M12 12.6L15.4 20"/></svg>'},
  {key:'胸部', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8c2-1.4 4.5-2 8-2s6 .6 8 2c-.6 4-2.4 6.4-4.6 7.4-.8-2-1.7-3-3.4-3s-2.6 1-3.4 3C6.4 14.4 4.6 12 4 8z"/><path d="M12 6v12"/></svg>'},
  {key:'背部', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5C7.5 6 9.5 6.6 12 6.6s4.5-.6 7-2.1c-1 3.2-2 5.4-3.4 7L12 19l-3.6-7.5C7 9.9 6 7.7 5 4.5z"/><path d="M12 6.6V19"/></svg>'},
  {key:'腹部', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="7" y="4" width="10" height="16" rx="3"/><path d="M12 4v16M7 9.3h10M7 14.6h10"/></svg>'},
  {key:'腿部', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3.5c.6 4 .4 7-.6 9.6-.9 2.4-1 4.4-.2 6.4M15 3.5c-.6 4-.4 7 .6 9.6.9 2.4 1 4.4.2 6.4"/></svg>'},
  {key:'臀部', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 6c-4 0-7 2.4-7 6s3 6 5 6c.8-1.4 1.2-2.8 2-4 .8 1.2 1.2 2.6 2 4 2 0 5-2.4 5-6s-3-6-7-6z"/></svg>'},
  {key:'肩部', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 14c0-5 3.6-8 8-8s8 3 8 8"/><path d="M4 14c2.5 1.6 5 1.6 8 0 3 1.6 5.5 1.6 8 0"/><path d="M12 6v12"/></svg>'},
  {key:'手臂', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V11c0-3 2-5 4.5-5S15 8 15 10.5 13.5 15 11 15"/><path d="M15 10.5L19 8l1.5 2.5L16 14"/></svg>'},
  {key:'有氧', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5h4l2-4.5 3 8 2.5-5.5H21"/></svg>'},
  {key:'拉伸', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5.5" r="1.8"/><path d="M8.5 8c2.5.5 4.5 2 5.5 4.5M8.5 8C7 11 6 14 6 20M8.5 8l-4 3M14 12.5l6-1.5"/></svg>'}
];
const LIB_EQUIPS = ['全部','杠铃','哑铃','器械','徒手','其他'];
let libCat = '全身';
let libEquip = '全部';

function equipGroup(eq){
  eq = eq || '';
  if(/杠铃|奥杆|曲杆|T杠/.test(eq)) return '杠铃';
  if(/哑铃/.test(eq)) return '哑铃';
  if(/瑜伽垫|双杠|引体向上架|徒手|自重/.test(eq)) return '徒手';
  if(/弹力带|泡沫轴|战绳|壶铃/.test(eq)) return '其他';
  return '器械';
}
function libMatchCat(ex, cat){
  switch(cat){
    case '全身': return true;
    case '胸部': return ex.part==='胸';
    case '背部': return ex.part==='背';
    case '腹部': return ex.part==='核心';
    case '腿部': return ex.part==='腿' && !/臀/.test(ex.target+ex.name);
    case '臀部': return /臀/.test(ex.target+ex.name);
    case '肩部': return ex.part==='肩';
    case '手臂': return ex.part==='手臂';
    case '有氧': return ex.part==='有氧';
    case '拉伸': return ex.part==='拉伸';
    default: return true;
  }
}
function renderLibrary(){
  const list = allExercises().filter(ex=>{
    if(!libMatchCat(ex, libCat)) return false;
    if(libEquip!=='全部' && equipGroup(ex.equip)!==libEquip) return false;
    const q = libQuery.toLowerCase();
    if(q && !(ex.name.toLowerCase().includes(q) || (ex.equip||'').toLowerCase().includes(q) || (ex.target||'').toLowerCase().includes(q))) return false;
    return true;
  });
  const side = LIB_CATS.map(c=>`
    <div class="libv2-cat ${libCat===c.key?'active':''}" data-act="libCat" data-cat="${c.key}">
      ${c.icon}<span>${c.key}</span>
    </div>`).join('');
  const chips = LIB_EQUIPS.map(t=>`<button class="libv2-chip ${libEquip===t?'active':''}" data-act="libEquip" data-eq="${t}">${t}</button>`).join('');
  const rows = list.map(ex=>{
    const typeTxt = ex.part==='有氧' ? '有氧训练' : '力量训练';
    return `<div class="libv2-row" data-act="libDetail" data-id="${ex.id}">
      <div class="libv2-thumb">${exImgHTML(ex)}</div>
      <div class="libv2-info">
        <div class="libv2-name">${escapeHtml(ex.name)}</div>
        <div class="libv2-meta"><b>${escapeHtml(ex.level||'初级')}</b><b>${escapeHtml(ex.equip||'')}</b>${typeTxt}</div>
      </div>
    </div>`;
  }).join('');
  return `
    <div style="padding-top:8px;"></div>
    <div class="libv2">
      <aside class="libv2-side">${side}</aside>
      <div class="libv2-main">
        <div class="libv2-topbar">
          <div class="libv2-search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input type="text" id="lib-search" placeholder="搜索动作" value="${escapeHtml(libQuery)}"/>
          </div>
          <button class="libv2-add" data-act="openCreateEx" title="创建动作">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div class="libv2-chips">${chips}</div>
        <div>${rows || '<div class="empty" style="padding:30px 0;">没有匹配动作，点右上角 + 创建一个</div>'}</div>
      </div>
    </div>
  `;
}

/* ============================================================
   创建动作页
   ============================================================ */
let createForm = null;
const CREATE_PARTS = [
  {label:'胸部', part:'胸', target:'胸大肌'},
  {label:'背部', part:'背', target:'背阔肌'},
  {label:'肩部', part:'肩', target:'三角肌'},
  {label:'手臂', part:'手臂', target:'肱二头肌'},
  {label:'腹部', part:'核心', target:'腹直肌'},
  {label:'臀部', part:'腿', target:'臀大肌'},
  {label:'腿部', part:'腿', target:'股四头肌'},
  {label:'全身/有氧', part:'有氧', target:'心肺耐力'},
  {label:'拉伸放松', part:'拉伸', target:'筋膜放松'}
];
const CREATE_EQUIPS = ['杠铃','哑铃','固定器械','龙门架','绳索','史密斯机','徒手','弹力带','壶铃','其他'];

function openCreateEx(){
  createForm = {img:'', name:'', partLabel:'', part:'', target:'', equip:'', type:'strength'};
  $('#create-view').classList.remove('hidden');
  $('#tabbar').classList.add('hidden');
  renderCreateEx();
}
function closeCreateEx(){
  $('#create-view').classList.add('hidden');
  if(!session) $('#tabbar').classList.remove('hidden');
}
function renderCreateEx(){
  const f = createForm;
  $('#create-view').innerHTML = `
    <div class="create-head">
      <button class="back2" data-act="closeCreateEx">‹</button>
      <span class="ttl">创建动作</span>
      <button class="done-pill" data-act="saveCreateEx">完成</button>
    </div>
    <div class="create-body">
      <div class="create-tip">
        <span class="tip-ic">💡</span>
        <span><b>创建小贴士</b><br>正确录入动作信息，有助于我们更精准地为您提供历史数据分析</span>
      </div>
      <div class="create-upload" data-act="pickCreateImg">
        ${f.img
          ? `<img src="${f.img}" alt=""><div class="up-s" style="margin-top:10px;">点击重新上传</div>`
          : `<div class="cam"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg></div>
             <div class="up-t">点击上传动作图片</div>
             <div class="up-s">支持 JPG、PNG、GIF 格式</div>`}
      </div>
      <div class="create-field">
        <div class="cf-l">动作名称</div>
        <input id="ce-name" placeholder="请输入动作名称" value="${escapeHtml(f.name)}" maxlength="20"/>
      </div>
      <div class="create-sel" data-act="pickCreatePart">
        <span class="cs-l">训练部位</span>
        <span class="cs-v ${f.partLabel?'has':''}">${f.partLabel||'请选择训练的身体部位'} ›</span>
      </div>
      <div class="create-sel" data-act="pickCreateEquip">
        <span class="cs-l">选择器械</span>
        <span class="cs-v ${f.equip?'has':''}">${f.equip||'请选择训练器械'} ›</span>
      </div>
      <div class="create-field">
        <div class="cf-l">选择动作类型</div>
        <div class="create-types">
          <div class="create-type ${f.type==='strength'?'active':''}" data-act="createType" data-t="strength">
            <div class="ct-ic">🏋️</div>
            <div class="ct-n">力量训练</div>
            <div class="ct-s">记录次数+重量</div>
          </div>
          <div class="create-type ${f.type==='cardio'?'active':''}" data-act="createType" data-t="cardio">
            <div class="ct-ic">🏃</div>
            <div class="ct-n">有氧训练</div>
            <div class="ct-s">记录时间+距离</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function compressImage(file, cb){
  const reader = new FileReader();
  reader.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{
      const max = 480;
      let w = img.width, h = img.height;
      if(w > max || h > max){ const r = Math.min(max/w, max/h); w = Math.round(w*r); h = Math.round(h*r); }
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = ()=>cb(reader.result);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function saveCreateEx(){
  createForm.name = ($('#ce-name') && $('#ce-name').value.trim()) || createForm.name;
  const f = createForm;
  if(!f.name){ toast('请输入动作名称'); return; }
  if(!f.part){ toast('请选择训练部位'); return; }
  if(!f.equip){ toast('请选择训练器械'); return; }
  const ex = {
    id:'c_'+uid(), name:f.name,
    part: f.type==='cardio' ? '有氧' : f.part,
    target: f.type==='cardio' ? '心肺耐力' : f.target,
    equip:f.equip, level:'自定义',
    tip:'我的自定义动作', svg:'',
    img:f.img || '', custom:true
  };
  state.customEx.push(ex);
  try{ save(); }catch(e){ state.customEx.pop(); toast('存储空间不足，图片过大'); return; }
  closeCreateEx();
  render();
  toast('已创建动作「'+ex.name+'」');
}

/* ============================================================
   训练进行页：组列表（左滑操作 + 滚轮选值）
   ============================================================ */
function renderWorkoutList(){
  const list = $('#workout-list');
  if(!session) return;
  /* v8.12: 超级组已弃用，单卡渲染 */
  list.innerHTML = session.items.map((it,i)=>{
    const last = lastSetsForEx(it.exId);
    const sugg = suggestForEx(it.exId);
    const unit = it.lb ? 'LB' : 'KG';
    const conv = w => it.lb ? (w/0.4536).toFixed(1) : w;
    const refHtml = last ? `<div class="prev-ref">上次（${fmtMD(last.date)}）：${last.sets.map(s=>`${conv(s.weight)}×${s.reps}`).join(' / ')}<button class="fill-last" data-act="fillLast" data-ex="${i}">填入上次</button></div>` : '';
    const suggHtml = sugg ? `<div class="sugg-row">⚡ 自动进阶：${conv(sugg.weight)}${unit} × ${sugg.reps}（${sugg.reason}）<button data-act="applySugg" data-ex="${i}">应用</button></div>` : '';
    const restTag = it.restSec>0 ? `<span class="tag grey" style="margin-left:4px;">休息${it.restSec}s</span>` : '';
    const supTag = it.supersetWith!==null && it.supersetWith!==undefined ? `<span class="tag warn" style="margin-left:4px;">超级组</span>` : '';
    const notesTag = it.notes ? `<div style="font-size:11px;color:var(--accent);padding:2px 0 4px 4px;">📝 ${escapeHtml(it.notes)}</div>` : '';
    const isSupCard = false; /* v8.12 弃用：超级组功能删除 */
    const rows = it.sets.map((s,j)=>{
      const refSet = last && last.sets[j];
      const wTxt = (s.weight!==''&&s.weight!==null&&s.weight!==undefined&&+s.weight>0) ? conv(s.weight) : (refSet?conv(refSet.weight):'0');
      const rTxt = (+s.reps>0) ? s.reps : (refSet?refSet.reps:'0');
      const wEmpty = !(+s.weight>0), rEmpty = !(+s.reps>0);
      return `
      <div class="set-swipe">
        <div class="set-actions">
          <button class="sa-copy" data-act="setCopyDown" data-ex="${i}" data-set="${j}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>向下复制
          </button>
          <button class="sa-warm" data-act="setWarmup" data-ex="${i}" data-set="${j}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v3M12 8c-2 2-4 3.5-4 6a4 4 0 0 0 8 0c0-2.5-2-4-4-6z"/></svg>${s.warmup?'取消热身':'热身组'}
          </button>
          <button class="sa-del" data-act="setDelConfirm" data-ex="${i}" data-set="${j}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>删除
          </button>
        </div>
        <div class="set-row ${s.warmup?'warmup-row':''}">
          <span class="set-no">${j+1}${s.warmup?'<span class="wu">热身</span>':''}</span>
          <button class="set-val ${wEmpty?'empty':''}" data-act="wheelW" data-ex="${i}" data-set="${j}">${wTxt}</button>
          <button class="set-val ${rEmpty?'empty':''}" data-act="wheelR" data-ex="${i}" data-set="${j}">${rTxt}</button>
          <button class="rpe-btn ${s.rpe?'hot':''}" data-act="rpeOpen" data-ex="${i}" data-set="${j}">${s.rpe||'—'}</button>
          <button class="set-done-btn ${s.done?'completed':''}" data-act="doneSet" data-ex="${i}" data-set="${j}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="set-act-btn" data-act="setMenu" data-ex="${i}" data-set="${j}" title="组操作">⋮</button>
        </div>
      </div>`;
    }).join('');
    const exObj = resolveEx(it.exId) || it;
    const collapsedCls = (state.collapsedEx && state.collapsedEx[it.exId]) ? ' collapsed' : '';
    const cardHTML = renderSingleExCard({
      it, exObj, i, unit, conv, last, sugg, collapsedCls,
      supTag, restTag, notesTag, refHtml, suggHtml, rows
    });
    return cardHTML;
  }).join('');
  // 重新绑定折叠 / 长按拖动
  setTimeout(bindWorkoutListUI, 0);
}

/* v8.9: 单卡片渲染辅助函数（供单卡 + 超级组配对复用） */
function renderSingleExCard(o){
  const it = o.it, exObj = o.exObj, i = o.i, unit = o.unit, collapsedCls = o.collapsedCls||'';
  const supTag = o.supTag||'', restTag = o.restTag||'', notesTag = o.notesTag||'';
  const refHtml = o.refHtml||'', suggHtml = o.suggHtml||'', rows = o.rows||'', compact = !!o.compact;
  const isSup = it.supersetWith!==null && it.supersetWith!==undefined;
  const innerHead =
    '<div class="ex-thumb" style="background:#f3f6fb;overflow:hidden;padding:0;">' + exImgHTML(exObj) + '</div>' +
    '<div class="ex-info">' +
      '<div class="ex-name">' + escapeHtml(it.name) + supTag + '</div>' +
      '<div class="ex-meta">' + it.part + ' · ' + it.equip + restTag + '</div>' +
    '</div>' +
    '<button class="set-done-btn" data-act="exMenu" data-ex="' + i + '" title="动作设置" style="color:var(--accent);border-color:var(--accent-light);background:var(--accent-light);">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
    '</button>';
  const progress = (()=>{
    const done = it.sets.filter(s=>s.done).length;
    const total = it.sets.length;
    const pct = total ? Math.round(done/total*100) : 0;
    return '<div class="ex-progress"><div class="ex-progress-bar"><div class="ex-progress-bar-fill" style="width:'+pct+'%"></div></div><span class="ex-progress-text">'+done+'/'+total+'</span></div>';
  })();
  const setsHead = compact ? '' : '<div class="sets-head"><span>组</span><span>'+unit+'</span><span>次</span><span>RPE</span><span>完成</span><span></span></div>';
  const addBtn = compact ? '' : '<button class="add-set-btn" data-act="addSet" data-ex="'+i+'">+ 添加一组</button>';
  return '<div class="ex-card '+(isSup?'superset-card':'')+collapsedCls+' '+(compact?'superset-card-compact':'')+'" data-ex="'+i+'" data-ex-id="'+escapeHtml(it.exId)+'"><div class="ex-head">'+innerHead+'</div>'+progress+refHtml+suggHtml+notesTag+setsHead+rows+addBtn+'</div>';
}

/* ---------- 滚轮选择器 ---------- */
let wheelCtx = null;
function openWheel(title, unit, values, current, cb){
  wheelCtx = {values, cb, idx:0};
  let best = 0, bd = Infinity;
  values.forEach((v,k)=>{ const d = Math.abs(v-(+current||0)); if(d<bd){bd=d;best=k;} });
  wheelCtx.idx = best;
  openSheet(`
    <h3 style="text-align:center;">${escapeHtml(title)}</h3>
    <div class="wheel-wrap">
      <div class="wheel-band"></div>
      <div class="wheel-unit">${escapeHtml(unit)}</div>
      <div class="wheel" id="wheel">
        ${values.map((v,k)=>`<div class="wheel-opt ${k===best?'cur':''}" data-wi="${k}">${Number.isInteger(v)?v:v.toFixed(1)}</div>`).join('')}
      </div>
    </div>
    <button class="btn block primary" data-act="wheelOk">确定</button>
  `);
  const wheel = $('#wheel');
  requestAnimationFrame(()=>{ wheel.scrollTop = best*44; });
  let st = null;
  wheel.addEventListener('scroll', ()=>{
    clearTimeout(st);
    st = setTimeout(()=>{
      const idx = Math.max(0, Math.min(values.length-1, Math.round(wheel.scrollTop/44)));
      wheelCtx.idx = idx;
      $$('.wheel-opt', wheel).forEach((el,k)=>el.classList.toggle('cur', k===idx));
    }, 70);
  });
  wheel.addEventListener('click', e=>{
    const opt = e.target.closest('.wheel-opt');
    if(opt){ wheel.scrollTo({top:(+opt.dataset.wi)*44, behavior:'smooth'}); }
  });
}
function openWheelFor(i, j, field){
  const it = session.items[i];
  const s = it.sets[j];
  if(field==='weight'){
    const unit = it.lb ? 'LB' : 'KG';
    const conv = w => it.lb ? (w/0.4536) : w;
    const step = it.lb ? 5 : 2.5;
    const max = it.lb ? 445 : 200;
    const values = [];
    for(let v=0; v<=max; v+=step) values.push(+v.toFixed(1));
    const cur = (+s.weight>0) ? conv(+s.weight) : 0;
    openWheel('第'+(j+1)+'组 · '+it.name, unit, values, cur, v=>{
      s.weight = it.lb ? +(v*0.4536).toFixed(1) : v;
      renderWorkoutList();
    });
  } else if(field==='reps'){
    const values = [];
    for(let v=1; v<=100; v++) values.push(v);
    openWheel('第'+(j+1)+'组 · '+it.name, '次', values, +s.reps||12, v=>{
      s.reps = v;
      renderWorkoutList();
    });
  } else if(field==='_w2'){
    /* v8.12 弃用：超级组功能删除，但兼容老数据（不报错） */
    toast('该字段已弃用');
    return;
  } else if(field==='_r2'){
    /* v8.12 弃用 */
    toast('该字段已弃用');
    return;
  }
}

/* ---------- 左滑手势 ---------- */
let swipeSt = null;
let swipeSwallow = false;
function closeAllSwipes(except){
  $$('.set-row').forEach(r=>{
    if(r!==except){ r.style.transform=''; delete r.dataset.open; }
  });
}
document.addEventListener('touchstart', e=>{
  const row = e.target.closest('.set-row');
  if(!row){
    if(!e.target.closest('.set-swipe')) closeAllSwipes();
    return;
  }
  closeAllSwipes(row);
  swipeSt = {row, x:e.touches[0].clientX, y:e.touches[0].clientY, active:false, moved:false};
}, {passive:true});
document.addEventListener('touchmove', e=>{
  if(!swipeSt) return;
  const dx = e.touches[0].clientX - swipeSt.x;
  const dy = e.touches[0].clientY - swipeSt.y;
  const row = swipeSt.row;
  if(!swipeSt.active && Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.4){
    swipeSt.active = true;
    row.classList.add('no-anim');
    closeAllSwipes(row);
  }
  if(swipeSt.active){
    swipeSt.moved = true;
    const base = row.dataset.open==='1' ? -216 : 0;
    let nx = Math.max(-216, Math.min(0, base+dx));
    row.style.transform = 'translateX('+nx+'px)';
    if(e.cancelable) e.preventDefault();
  }
}, {passive:false});
document.addEventListener('touchend', ()=>{
  if(!swipeSt) return;
  const row = swipeSt.row;
  row.classList.remove('no-anim');
  if(swipeSt.active){
    const m = (row.style.transform.match(/-?[\d.]+/)||[0])[0];
    const cur = parseFloat(m);
    if(cur < -108){ row.style.transform='translateX(-216px)'; row.dataset.open='1'; }
    else { row.style.transform=''; delete row.dataset.open; }
    swipeSwallow = true;
    setTimeout(()=>{ swipeSwallow=false; }, 120);
  }
  swipeSt = null;
});
document.addEventListener('click', e=>{
  if(swipeSwallow && e.target.closest('.set-swipe')){
    e.stopPropagation(); e.preventDefault(); swipeSwallow = false;
  }
}, true);

/* ============================================================
   动作菜单（撸铁记同款）
   ============================================================ */
function openExMenu(i){
  const it = session.items[i];
  const isSup = it.supersetWith!==null && it.supersetWith!==undefined;
  openSheet(`
    <h3 style="text-align:left;">动作菜单</h3>
    <div class="ex-menu-list">
      <div class="ex-menu-item hero-item" data-act="exReplace" data-ex="${i}">
        <div class="ex-menu-ic" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#fff;">🤖</div>
        <div class="ex-menu-t"><div class="n">替换动作 <span class="tag" style="background:#8b5cf6;color:#fff;font-size:9px;">推荐</span></div><div class="s">换个同部位动作，保留已填组数</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exDelete" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#fee2e2;color:#ef4444;">🗑</div>
        <div class="ex-menu-t"><div class="n">删除动作</div><div class="s">从当前计划中移除此动作</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exSort" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#eff6ff;color:#2563eb;">↕️</div>
        <div class="ex-menu-t"><div class="n">动作排序</div><div class="s">调整动作在训练中的顺序</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exTimer" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#eff6ff;color:#2563eb;">⏱</div>
        <div class="ex-menu-t"><div class="n">计时设置</div><div class="s">设置组间休息倒计时秒数（当前${it.restSec>0?it.restSec+'秒':'默认'+state.settings.restSec+'秒'}）</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exNotes" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#fffbeb;color:#f59e0b;">💡</div>
        <div class="ex-menu-t"><div class="n">记录想法</div><div class="s">记录训练心得与动作备注</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="exLB" data-ex="${i}">
        <div class="ex-menu-ic" style="background:#f0f9ff;color:#0ea5e9;">⚖️</div>
        <div class="ex-menu-t"><div class="n">${it.lb?'修改为KG':'修改为LB'}</div><div class="s">将本动作重量单位切换为${it.lb?'千克':'磅'}</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
    </div>
  `);
}
function openExSortSheet(i){
  const rows = session.items.map((x,k)=>`
    <div class="sort-row">
      <span class="sr-name">${k+1}. ${escapeHtml(x.name)}${k===i?' <span class="tag">当前</span>':''}</span>
      <button class="sr-btn" data-act="exMove" data-ex="${k}" data-dir="-1" ${k===0?'disabled':''}>↑</button>
      <button class="sr-btn" data-act="exMove" data-ex="${k}" data-dir="1" ${k===session.items.length-1?'disabled':''}>↓</button>
    </div>`).join('');
  $('#sheet').innerHTML = `
    <h3>动作排序</h3>
    <p style="font-size:12px;color:var(--muted);margin-top:-6px;">点箭头调整顺序，完成后返回</p>
    ${rows}
    <div style="margin-top:14px;"><button class="btn block primary" data-act="exSortDone" data-ex="${i}">完成</button></div>
  `;
}
function openSetMenu(i, j){
  const s = session.items[i].sets[j];
  openSheet(`
    <h3>第${j+1}组 · ${escapeHtml(session.items[i].name)}</h3>
    <div class="ex-menu-list">
      <div class="ex-menu-item" data-act="setCopyDown" data-ex="${i}" data-set="${j}">
        <div class="ex-menu-ic" style="background:#fffbeb;color:#f59e0b;">📋</div>
        <div class="ex-menu-t"><div class="n">向下复制</div><div class="s">在下方插入相同的一组</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="setWarmup" data-ex="${i}" data-set="${j}">
        <div class="ex-menu-ic" style="background:#eff6ff;color:#3b82f6;">🔥</div>
        <div class="ex-menu-t"><div class="n">${s.warmup?'取消热身':'热身组'}</div><div class="s">标记为热身组（不计入正式组）</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
      <div class="ex-menu-item" data-act="setDelConfirm" data-ex="${i}" data-set="${j}">
        <div class="ex-menu-ic" style="background:#fee2e2;color:#ef4444;">🗑</div>
        <div class="ex-menu-t"><div class="n" style="color:#ef4444;">删除</div><div class="s">删除当前这一组数据</div></div>
        <span class="ex-menu-arrow">›</span>
      </div>
    </div>
    <div style="margin-top:12px;"><button class="btn block" data-act="closeSheet">关闭</button></div>
  `);
}
function openExTimerSheet(i){
  const it = session.items[i];
  const opts = [30,45,60,90,120,180];
  openSheet(`
    <h3>计时设置 · ${escapeHtml(it.name)}</h3>
    <p style="font-size:12px;color:var(--muted);margin-top:-6px;">完成一组后自动按此时长倒计时</p>
    <div class="rest-chips">
      ${opts.map(v=>`<button class="rest-chip ${it.restSec===v?'active':''}" data-act="exTimerSet" data-ex="${i}" data-v="${v}">${v}s</button>`).join('')}
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn block" data-act="exTimerSet" data-ex="${i}" data-v="0">跟随默认（${state.settings.restSec}s）</button>
    </div>
    <div class="field" style="margin-top:12px;"><label>自定义秒数</label>
      <div style="display:flex;gap:10px;"><input id="ex-rest-custom" type="number" inputmode="numeric" placeholder="如 75" style="flex:1;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font-size:15px;"/>
      <button class="btn primary" data-act="exTimerCustom" data-ex="${i}">确定</button></div>
    </div>
  `);
}
function openExNotesSheet(i){
  const it = session.items[i];
  openSheet(`
    <h3>记录想法 · ${escapeHtml(it.name)}</h3>
    <div class="field"><textarea id="ex-notes-inp" rows="4" placeholder="如：今天左肩有点紧，下放幅度减小">${escapeHtml(it.notes||'')}</textarea></div>
    <div style="display:flex;gap:10px;"><button class="btn block" data-act="closeSheet">取消</button><button class="btn block primary" data-act="exNotesSave" data-ex="${i}">保存</button></div>
  `);
}
function openExReplaceSheet(i){
  const cur = session.items[i];
  const list = allExercises().filter(ex=>ex.id!==cur.exId);
  list.sort((a,b)=>((b.part===cur.part)-(a.part===cur.part)) || a.part.localeCompare(b.part,'zh'));
  openSheet(`
    <h3>替换动作</h3>
    <p style="font-size:12px;color:var(--muted);margin-top:-6px;">替换后保留已填写的组数数据，同部位动作排在前面</p>
    <div style="max-height:56vh;overflow-y:auto;">
      ${list.map(ex=>`
        <div class="ex-menu-item" style="padding:9px 10px;" data-act="exReplaceDo" data-ex="${i}" data-id="${ex.id}">
          <div class="ex-menu-ic" style="width:40px;height:40px;flex:0 0 40px;border-radius:10px;background:#f3f6fb;overflow:hidden;padding:0;">${exImgHTML(ex)}</div>
          <div class="ex-menu-t"><div class="n" style="font-size:14px;">${escapeHtml(ex.name)}</div><div class="s">${ex.part} · ${ex.equip}${ex.part===cur.part?' · 同部位':''}</div></div>
        </div>`).join('')}
    </div>
    <div style="margin-top:12px;"><button class="btn block" data-act="closeSheet">取消</button></div>
  `);
}

/* ---------- 动作库详情（真图 + 自定义可删除） ---------- */
function openLibDetailV2(ex){
  const inSession = !!session;
  const typeTxt = ex.part==='有氧' ? '有氧训练' : '力量训练';
  openSheet(`
    <div style="text-align:center;margin-bottom:14px;">
      <div style="width:100%;height:180px;background:#f3f6fb;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;overflow:hidden;">${exImgHTML(ex)}</div>
      <div style="font-size:18px;font-weight:700;">${escapeHtml(ex.name)}</div>
      <div style="font-size:13px;color:var(--muted);margin-top:4px;">${ex.part} · ${ex.target||ex.part} · ${ex.equip} · ${ex.level||'初级'} · ${typeTxt}</div>
    </div>
    <div style="background:#f9fafb;border-radius:12px;padding:12px;font-size:14px;line-height:1.6;margin-bottom:16px;">
      <b>动作要点：</b>${escapeHtml(ex.tip||'—')}
    </div>
    <div style="display:flex;gap:10px;">
      ${ex.custom?`<button class="btn" style="background:#fee2e2;color:#ef4444;" data-act="delCustomEx" data-id="${ex.id}">删除</button>`:''}
      <button class="btn block" data-act="closeSheet">关闭</button>
      ${inSession?`<button class="btn block primary" data-act="addLibToSession" data-id="${ex.id}">加入当前训练</button>`:`<button class="btn block primary" data-act="addLibToPlan" data-id="${ex.id}">加入计划</button>`}
    </div>
  `);
}

/* ---------- 选择器 / 计划编辑器：包含自定义动作 + 真图 ---------- */
function renderPicker(){
  $('#ep-chips').innerHTML = PARTS.map(p=>`<span class="ep-chip ${pickerPart===p?'active':''}" data-part="${p}">${p}</span>`).join('');
  const list = allExercises().filter(ex=>{
    const matchPart = pickerPart==='全部' || ex.part===pickerPart;
    const q = pickerQuery.toLowerCase();
    const matchQ = !q || ex.name.toLowerCase().includes(q) || ex.part.includes(q) || (ex.equip||'').includes(q);
    return matchPart && matchQ;
  });
  $('#ep-list').innerHTML = list.map(ex=>`
    <div class="ep-item" data-act="pickEx" data-id="${ex.id}">
      <div class="ep-thumb" style="overflow:hidden;padding:0;background:#f3f6fb;">${exImgHTML(ex)}</div>
      <div class="ep-info">
        <div class="ep-name">${escapeHtml(ex.name)}</div>
        <div class="ep-meta">${ex.part} · ${ex.equip} · ${ex.level||'初级'}</div>
      </div>
      <button class="ep-add"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
    </div>`).join('');
}
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
      ${allExercises().map(ex=>`
        <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer;">
          <input type="checkbox" class="plan-ex-chk" value="${ex.id}" ${selected.has(ex.id)?'checked':''}>
          <span style="flex:1;font-size:14px;">${escapeHtml(ex.name)} <span style="color:var(--muted);font-size:12px;">· ${ex.part}${ex.custom?' · 自定义':''}</span></span>
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

/* ---------- 会话条目：带上图片 ---------- */
function addExerciseToSession(exId){
  const ex = resolveEx(exId);
  if(!ex || !session) return;
  session.items.push({exId:ex.id,name:ex.name,part:ex.part,equip:ex.equip,icon:ex.icon||ex.part,svg:ex.svg,img:ex.img||'',
    sets:[{weight:'',reps:'',rpe:'',done:false,warmup:false}],
    restSec:0, notes:'', supersetWith:null, lb:false});
  renderWorkoutList();
  toast('已添加 ' + ex.name);
}

/* ============================================================
   新增事件分发
   ============================================================ */
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act]');
  if(!act) return;
  const a = act.dataset.act;

  // 动作库 v2
  if(a==='libCat'){ libCat=act.dataset.cat; render(); return; }
  if(a==='libEquip'){ libEquip=act.dataset.eq; render(); return; }
  if(a==='libDetail'){
    const ex=resolveEx(act.dataset.id); if(ex) openLibDetailV2(ex);
    return;
  }
  if(a==='delCustomEx'){
    const id = act.dataset.id;
    state.customEx = (state.customEx||[]).filter(x=>x.id!==id);
    save(); closeSheet(); render(); toast('自定义动作已删除');
    return;
  }

  // v5：训练中卡
  if(a==='resumeWorkout'){ e.stopPropagation(); e.preventDefault(); resumeWorkout(); return; }
  if(a==='discardWorkout'){ e.stopPropagation(); e.preventDefault(); discardWorkout(); return; }

  // 创建动作
  if(a==='openCreateEx'){ openCreateEx(); return; }
  if(a==='closeCreateEx'){ closeCreateEx(); return; }
  if(a==='createType'){ createForm.type = act.dataset.t; renderCreateEx(); return; }
  if(a==='pickCreateImg'){ $('#ce-file').click(); return; }
  if(a==='pickCreatePart'){
    const nm = $('#ce-name'); if(nm) createForm.name = nm.value.trim();
    openSheet(`<h3>训练部位</h3><div class="sel-list">
      ${CREATE_PARTS.map((p,k)=>`<div class="sel-item ${createForm.partLabel===p.label?'active':''}" data-act="createPartSet" data-k="${k}"><span>${p.label}</span>${createForm.partLabel===p.label?'✓':''}</div>`).join('')}
    </div>`);
    return;
  }
  if(a==='createPartSet'){
    const p = CREATE_PARTS[+act.dataset.k];
    createForm.partLabel = p.label; createForm.part = p.part; createForm.target = p.target;
    closeSheet(); renderCreateEx(); return;
  }
  if(a==='pickCreateEquip'){
    const nm = $('#ce-name'); if(nm) createForm.name = nm.value.trim();
    openSheet(`<h3>选择器械</h3><div class="sel-list">
      ${CREATE_EQUIPS.map(t=>`<div class="sel-item ${createForm.equip===t?'active':''}" data-act="createEquipSet" data-v="${t}"><span>${t}</span>${createForm.equip===t?'✓':''}</div>`).join('')}
    </div>`);
    return;
  }
  if(a==='createEquipSet'){ createForm.equip = act.dataset.v; closeSheet(); renderCreateEx(); return; }
  if(a==='saveCreateEx'){ saveCreateEx(); return; }

  // 滚轮
  if(a==='wheelW'){ openWheelFor(+act.dataset.ex, +act.dataset.set, 'weight'); return; }
  if(a==='wheelR'){ openWheelFor(+act.dataset.ex, +act.dataset.set, 'reps'); return; }
  /* v8.12 删：超级组 wheelW2/R2 彻底清除 */
  if(a==='wheelOk'){
    if(wheelCtx && wheelCtx.cb) wheelCtx.cb(wheelCtx.values[wheelCtx.idx]);
    wheelCtx = null; closeSheet(); return;
  }

  // 动作菜单
  if(a==='exMenu'){ openExMenu(+act.dataset.ex); return; }
  if(a==='setMenu'){ openSetMenu(+act.dataset.ex, +act.dataset.set); return; }
  if(a==='exTimer'){ openExTimerSheet(+act.dataset.ex); return; }
  if(a==='exTimerSet'){
    const i=+act.dataset.ex;
    session.items[i].restSec = +act.dataset.v;
    closeSheet(); renderWorkoutList();
    toast(+act.dataset.v>0 ? '该动作组间休息 '+act.dataset.v+' 秒' : '已恢复默认休息时长');
    return;
  }
  if(a==='exTimerCustom'){
    const i=+act.dataset.ex;
    const v = Math.max(10, +$('#ex-rest-custom').value||0);
    if(!v){ toast('请输入秒数'); return; }
    session.items[i].restSec = v;
    closeSheet(); renderWorkoutList(); toast('该动作组间休息 '+v+' 秒');
    return;
  }
  if(a==='exNotes'){ openExNotesSheet(+act.dataset.ex); return; }
  if(a==='exNotesSave'){
    const i=+act.dataset.ex;
    session.items[i].notes = $('#ex-notes-inp').value.trim();
    closeSheet(); renderWorkoutList(); toast('备注已保存');
    return;
  }
  if(a==='exLB'){
    const it = session.items[+act.dataset.ex];
    it.lb = !it.lb;
    closeSheet(); renderWorkoutList();
    toast('已切换为 ' + (it.lb?'LB（磅）':'KG（千克）'));
    return;
  }
  /* v8.12 删：超级组功能（用户放弃） */
  if(a==='exReplace'){ openExReplaceSheet(+act.dataset.ex); return; }
  if(a==='exReplaceDo'){
    const i = +act.dataset.ex;
    const ex = resolveEx(act.dataset.id);
    if(ex){
      const it = session.items[i];
      it.exId = ex.id; it.name = ex.name; it.part = ex.part; it.equip = ex.equip;
      it.svg = ex.svg; it.img = ex.img||''; it.icon = ex.icon||ex.part;
      closeSheet(); renderWorkoutList(); toast('已替换为「'+ex.name+'」');
    }
    return;
  }
  if(a==='exDelete'){
    const i = +act.dataset.ex;
    const name = session.items[i].name;
    closeSheet();
    delEx(i);
    // 修正超级组索引
    session.items.forEach(x=>{
      if(x.supersetWith===i) x.supersetWith = null;
      else if(x.supersetWith>i) x.supersetWith--;
    });
    renderWorkoutList();
    toast('已删除「'+name+'」');
    return;
  }
  if(a==='exSort'){ openExSortSheet(+act.dataset.ex); return; }
  if(a==='exMove'){
    const k = +act.dataset.ex, dir = +act.dataset.dir;
    const t = k + dir;
    if(t<0 || t>=session.items.length) return;
    const arr = session.items;
    const pmap = new Map(arr.map(x=>[x, (x.supersetWith!==null&&x.supersetWith!==undefined)?arr[x.supersetWith]:null]));
    [arr[k], arr[t]] = [arr[t], arr[k]];
    arr.forEach(x=>{ const p = pmap.get(x); x.supersetWith = p ? arr.indexOf(p) : null; });
    renderWorkoutList();
    openExSortSheet(t);
    return;
  }
  if(a==='exSortDone'){ closeSheet(); renderWorkoutList(); return; }

  // 组操作
  if(a==='setCopyDown'){
    const i=+act.dataset.ex, j=+act.dataset.set;
    const src = session.items[i].sets[j];
    session.items[i].sets.splice(j+1, 0, {weight:src.weight, reps:src.reps, rpe:src.rpe||'', done:false, warmup:src.warmup||false});
    closeSheet(); renderWorkoutList(); toast('已向下复制一组');
    return;
  }
  if(a==='setWarmup'){
    const i=+act.dataset.ex, j=+act.dataset.set;
    const s = session.items[i].sets[j];
    s.warmup = !s.warmup;
    closeSheet(); renderWorkoutList();
    toast(s.warmup?'已标记为热身组':'已取消热身标记');
    return;
  }
  if(a==='setDelConfirm'){
    const i=+act.dataset.ex, j=+act.dataset.set;
    closeSheet();
    delSet(i,j);
    toast('已删除该组');
    return;
  }
});

/* 创建动作：文件选择 */
document.addEventListener('change', e=>{
  if(e.target && e.target.id==='ce-file'){
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    compressImage(file, dataUrl=>{
      if(createForm){ createForm.img = dataUrl; renderCreateEx(); }
    });
    e.target.value = '';
  }
});
document.addEventListener('input', e=>{
  if(e.target && e.target.id==='ce-name' && createForm){
    createForm.name = e.target.value.trim();
  }
});

/* 首次加载：用新版函数重渲染当前页 */
try{ setTab(currentTab || 'train'); }catch(e){}

/* ============================================================
   网站访问统计（不蒜子，免费、无需注册、国内可访问）
   在「我的」页底部显示累计访问人次
   ============================================================ */
(function(){
  /* 包装 renderMe：在返回的 HTML 末尾追加统计行 */
  const _renderMeBase = renderMe;
  renderMe = function(){
    let html = _renderMeBase();
    const statLine =
      '<div style="text-align:center;color:var(--muted);font-size:12px;margin-top:8px;">' +
      '👀 本站访问 <b id="busuanzi_value_site_pv" style="color:var(--accent);font-weight:700;">…</b> 人次 · 访客 <b id="busuanzi_value_site_uv" style="color:var(--accent);font-weight:700;">…</b> 人' +
      '</div>';
    /* 插入到最后一行（版本信息）之前 */
    const marker = '<div style="text-align:center;color:var(--muted);font-size:12px;margin-top:20px;">FitRecord 网页版 · 数据仅存在本地</div>';
    if(html.indexOf(marker) !== -1) html = html.replace(marker, statLine + '\n    ' + marker);
    else html += '\n' + statLine;
    return html;
  };

  /* 页面加载时触发一次计数 + 渲染后刷新数字 */
  function refreshBusuanzi(){
    const pv = document.getElementById('busuanzi_value_site_pv');
    if(!pv) return;
    const cb = 'busuanzi_cb_' + Date.now();
    window[cb] = function(data){
      try{
        if(data && data.site_pv != null){
          const e1 = document.getElementById('busuanzi_value_site_pv');
          const e2 = document.getElementById('busuanzi_value_site_uv');
          if(e1) e1.textContent = data.site_pv;
          if(e2) e2.textContent = data.site_uv;
        }
      }catch(err){}
      delete window[cb];
    };
    const s = document.createElement('script');
    s.src = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=' + cb;
    s.onerror = function(){ delete window[cb]; };
    document.head.appendChild(s);
  }

  /* 切到「我的」tab 时刷新（包装 setTab） */
  const _setTabBase = setTab;
  setTab = function(tab){
    const ret = _setTabBase(tab);
    if(tab === 'me') setTimeout(refreshBusuanzi, 120);
    return ret;
  };
  /* 暴露给 v8.1 权威 setTab 使用 */
  window.__refreshBusuanzi = refreshBusuanzi;

  /* 首次加载时如果正好在「我的」页也刷新 */
  window.addEventListener('load', function(){
    if(currentTab === 'me') setTimeout(refreshBusuanzi, 200);
  });
})();

/* ============================================================
   v5 新增：训练中卡 · 折叠 · 拖动排序 · 上次预填 · 渐进超负荷
   ============================================================ */

/* ---------- 主页"训练中"缩略卡 ---------- */
function activeMiniHTML(){
  const w = state && state.currentWorkout;
  if(!w) return '';
  let doneSets = 0, totalSets = 0;
  w.items.forEach(it=> it.sets.forEach(s=>{ totalSets++; if(s.done) doneSets++; }));
  const dur = w.fixedDur ? w.fixedDur*60 : Math.max(0, Math.floor((Date.now() - w.startAt - (w.paused||0))/1000));
  const first = w.items[0];
  const img = first ? ((first.img) || (EX_IMG[first.svg]) || PART_IMG[first.part||'全身']) : PART_IMG['全身'];
  return `
    <div class="mini-active" data-act="resumeWorkout">
      <div class="mini-active-ic"><img src="${img}" alt="" loading="lazy"></div>
      <div class="mini-active-info">
        <div class="mini-active-title">🟢 训练中 · ${escapeHtml(w.planName)}</div>
        <div class="mini-active-meta">进度 ${doneSets}/${totalSets} · 时长 ${fmtTime(dur)}</div>
      </div>
      <button class="mini-active-del" data-act="discardWorkout" title="删除本次训练">🗑</button>
    </div>`;
}

function minimizeWorkout(){
  if(!state) return;
  state.currentWorkout = session;
  try{save();}catch(e){}
  $('#workout-view').classList.add('hidden');
  $('#tabbar').classList.remove('hidden');
  if(currentTab!=='train' && currentTab!=='library') $('#topbar').classList.remove('hidden');
  render();
  toast('训练已暂存，可随时从主页继续');
}
function resumeWorkout(){
  if(!state || !state.currentWorkout) return;
  session = state.currentWorkout;
  state.currentWorkout = null;
  try{save();}catch(e){}
  $('#workout-view').classList.remove('hidden');
  $('#tabbar').classList.add('hidden');
  $('#topbar').classList.add('hidden');
  $('#wo-title').textContent = session.planName + (session.backfillDate ? `（补录 ${fmtMD(session.backfillDate)}）` : '');
  const hero = $('#workout-hero');
  hero.style.background = 'linear-gradient(180deg,rgba(10,14,24,.25),rgba(10,14,24,.55)),url("img/hero_gym.jpg") center 28%/cover no-repeat,#141a26';
  startDur();
  renderWorkoutList();
  toast('已恢复训练');
}
function discardWorkout(){
  if(!confirm('确认删除本次训练记录？已填的组数将丢失（不会计入历史）。')) return;
  if(state){ state.currentWorkout = null; try{save();}catch(e){} }
  session = null;
  stopDur();
  render();
  toast('训练记录已删除');
}

/* ---------- 单击折叠 / 长按拖动排序 ---------- */
let dragCtx = null;
let pressTimer = null;
let pressStart = null;

function bindWorkoutListUI(){
  const list = $('#workout-list');
  if(!list) return;
  if(list.dataset.uiBound === '1') return;
  list.dataset.uiBound = '1';

  const getCard = e => {
    if(e.target.closest('[data-act="exMenu"]')) return null;
    const head = e.target.closest('.ex-head');
    if(!head) return null;
    return head.closest('.ex-card');
  };
  const beginPress = (card, x, y) => {
    if(card.classList.contains('collapsed')) return;  // 折叠时不响应拖动
    pressStart = {x, y, card};
    pressTimer = setTimeout(()=>{
      if(dragCtx) return;
      startDrag(card, x, y);
      try{ if(navigator.vibrate) navigator.vibrate(30); }catch(e){}
    }, 350);
  };
  const endPress = () => {
    clearTimeout(pressTimer); pressTimer = null; pressStart = null;
    if(dragCtx) endDrag();
  };
  const onMove = (x, y) => {
    if(dragCtx){ moveDrag(x, y); return; }
    if(pressTimer && pressStart){
      if(Math.abs(x-pressStart.x)>10 || Math.abs(y-pressStart.y)>10){
        clearTimeout(pressTimer); pressTimer = null;
      }
    }
  };
  list.addEventListener('touchstart', e=>{
    const c = getCard(e);
    if(c) beginPress(c, e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});
  list.addEventListener('touchmove', e=>{
    if(dragCtx){ moveDrag(e.touches[0].clientX, e.touches[0].clientY); if(e.cancelable) e.preventDefault(); return; }
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:false});
  list.addEventListener('touchend', endPress);
  list.addEventListener('touchcancel', endPress);

  list.addEventListener('mousedown', e=>{
    const c = getCard(e);
    if(c) beginPress(c, e.clientX, e.clientY);
  });
  list.addEventListener('mousemove', e=>{
    if(dragCtx){ moveDrag(e.clientX, e.clientY); return; }
    onMove(e.clientX, e.clientY);
  });
  list.addEventListener('mouseup', endPress);
  list.addEventListener('mouseleave', endPress);

  // 单击折叠（不与拖动冲突：拖动结束不触发 click）
  list.addEventListener('click', e=>{
    if(dragCtx) return;
    if(e.target.closest('[data-act="exMenu"]')) return;
    const head = e.target.closest('.ex-head');
    if(!head) return;
    const card = head.closest('.ex-card');
    if(!card) return;
    card.classList.toggle('collapsed');
    if(card.dataset.exId){
      if(!state.collapsedEx) state.collapsedEx = {};
      state.collapsedEx[card.dataset.exId] = card.classList.contains('collapsed');
      try{save();}catch(e){}
    }
  });
}

function startDrag(card, x, y){
  const r = card.getBoundingClientRect();
  dragCtx = {
    card, rect:r, startX:x, startY:y,
    list: card.parentNode,
    placeholder: document.createElement('div'),
    placeholderInjected:false,
  };
  dragCtx.placeholder.className = 'ex-card-placeholder';
  dragCtx.placeholder.style.height = r.height + 'px';
  card.parentNode.insertBefore(dragCtx.placeholder, card);
  dragCtx.placeholderInjected = true;
  card.classList.add('dragging');
  card.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;z-index:999;pointer-events:none;background:var(--card);border-radius:18px;margin:0;`;
  dragCtx.cards = [...card.parentNode.querySelectorAll('.ex-card:not(.dragging):not(.ex-card-placeholder)')];
}

function moveDrag(x, y){
  if(!dragCtx) return;
  const dx = x - dragCtx.startX, dy = y - dragCtx.startY;
  dragCtx.card.style.transform = `translate(${dx}px, ${dy}px) rotate(1.5deg)`;
  const cy = dragCtx.rect.top + dy + dragCtx.rect.height/2;
  // 找到手指位置所在的卡片，决定 placeholder 位置
  let target = null;
  for(const c of dragCtx.cards){
    const cr = c.getBoundingClientRect();
    if(cy > cr.top && cy < cr.bottom){ target = c; break; }
  }
  if(target){
    const tRect = target.getBoundingClientRect();
    if(cy < tRect.top + tRect.height/2){
      target.parentNode.insertBefore(dragCtx.placeholder, target);
    } else {
      target.parentNode.insertBefore(dragCtx.placeholder, target.nextSibling);
    }
  } else if(dragCtx.cards.length){
    const first = dragCtx.cards[0], last = dragCtx.cards[dragCtx.cards.length-1];
    if(cy < first.getBoundingClientRect().top){
      first.parentNode.insertBefore(dragCtx.placeholder, first);
    } else if(cy > last.getBoundingClientRect().bottom){
      last.parentNode.insertBefore(dragCtx.placeholder, last.nextSibling);
    }
  }
}

function endDrag(){
  if(!dragCtx) return;
  const card = dragCtx.card;
  const ph = dragCtx.placeholder;
  // 把 card 插入到 placeholder 位置
  if(ph.parentNode){
    ph.parentNode.insertBefore(card, ph);
  }
  ph.remove();
  card.classList.remove('dragging');
  card.style.cssText = '';

  // 重新读取 DOM 顺序，重排 session.items
  const newDomCards = [...card.parentNode.querySelectorAll('.ex-card')];
  const oldItems = session.items.slice();
  const newOrder = newDomCards.map(c=>oldItems[+c.dataset.ex]).filter(Boolean);
  if(newOrder.length === oldItems.length){
    // 重新映射 supersetWith 到新索引
    const idxOf = item => newOrder.indexOf(item);
    newOrder.forEach(it=>{
      if(it.supersetWith!==null && it.supersetWith!==undefined){
        const ref = oldItems[it.supersetWith];
        it.supersetWith = ref ? idxOf(ref) : null;
      }
    });
    session.items = newOrder;
  }
  dragCtx = null;
  renderWorkoutList();
  toast('顺序已更新');
}

/* ---------- sheet 上方空白点击关闭（v5 功能，v6 保留） ---------- */
$('#overlay').addEventListener('click', e=>{
  if(e.target === e.currentTarget){
    closeSheet();
  }
});

/* ============================================================
   v6 增量：深色模式 + 庆祝动效 + 周报 + 修仙系统（2026-08-11）
   ============================================================ */

/* ---------- 深色模式：初始化 + 跟随系统 + 开关 ---------- */
(function(){
  const KEY = 'fitrecord_theme';
  function applyTheme(mode){
    if(mode === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else if(mode === 'light') document.documentElement.removeAttribute('data-theme');
    else {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if(dark) document.documentElement.setAttribute('data-theme','dark');
      else document.documentElement.removeAttribute('data-theme');
    }
    try{ localStorage.setItem(KEY, mode || ''); }catch(e){}
  }
  let themeMode = null;
  try{ themeMode = localStorage.getItem(KEY) || null; }catch(e){}
  if(themeMode !== 'dark' && themeMode !== 'light') themeMode = null;
  applyTheme(themeMode);
  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e=>{
      if(!themeMode) applyTheme(null);
    });
  }
  window.__setTheme = function(mode){ themeMode = mode; applyTheme(mode); };

  /* 「我的」页加主题开关（包装 renderMe） */
  const _renderMeBase3 = renderMe;
  renderMe = function(){
    const html = _renderMeBase3();
    const cur = themeMode || 'auto';
    const toggle = `
      <div class="theme-row" style="background:var(--card);border-radius:14px;padding:14px;margin:12px 0;box-shadow:var(--shadow);">
        <div>
          <div style="font-weight:700;">🌗 深色模式</div>
          <div style="font-size:12px;color:var(--muted);">夜间训练不刺眼 · 跟随系统 / 手动</div>
        </div>
        <select data-act="themeSelect" style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:13px;background:var(--card);color:var(--text);">
          <option value="auto" ${cur==='auto'?'selected':''}>跟随系统</option>
          <option value="light" ${cur==='light'?'selected':''}>浅色</option>
          <option value="dark" ${cur==='dark'?'selected':''}>深色</option>
        </select>
      </div>`;
    const marker = '<div style="text-align:center;color:var(--muted);font-size:12px;margin-top:8px;">👀 本站访问';
    if(html.indexOf(marker) !== -1) html = html.replace(marker, toggle + '\n' + marker);
    else html += '\n' + toggle;
    return html;
  };
})();
document.addEventListener('change', e=>{
  if(e.target && e.target.dataset && e.target.dataset.act === 'themeSelect'){
    window.__setTheme(e.target.value);
    render();
    toast('主题已切换');
  }
});

/* ---------- 训练完成庆祝动效 ---------- */
function confettiBurst(){
  const colors = ['#f59e0b','#ef4444','#3b82f6','#22c55e','#ec4899','#8b5cf6','#14b8a6'];
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:none;overflow:hidden;';
  document.body.appendChild(layer);
  const N = 90;
  for(let i=0;i<N;i++){
    const p = document.createElement('div');
    const size = 6 + Math.random()*8;
    const left = Math.random()*100;
    const dur = 1.6 + Math.random()*1.4;
    const delay = Math.random()*0.4;
    const c = colors[Math.floor(Math.random()*colors.length)];
    const shape = Math.random()>0.5 ? 'border-radius:50%;' : '';
    p.style.cssText = `position:absolute;left:${left}%;top:-20px;width:${size}px;height:${size*0.55}px;background:${c};${shape}opacity:.95;animation:confetti-fall ${dur}s ease-in ${delay}s forwards;`;
    p.innerHTML = '';
    layer.appendChild(p);
  }
  setTimeout(()=>{ layer.remove(); }, 3400);
}
/* 注入 keyframes（一次性） */
if(!document.getElementById('confetti-style')){
  const st = document.createElement('style');
  st.id = 'confetti-style';
  st.textContent = '@keyframes confetti-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:.4}}';
  document.head.appendChild(st);
}

/* 完成训练时放彩带（包装 finishWorkout 链尾） */
(function(){
  const base = finishWorkout;
  finishWorkout = function(){
    const ret = base();
    setTimeout(confettiBurst, 120);
    return ret;
  };
})();

/* ============================================================
   修仙成就系统（v6）：境界 · 功法 · 副本 · 国风特效
   ============================================================ */
const XIAN_REALMS = [
  {name:'引气入体', fit:'健身小白',  stage:9,  icon:'🌱', color:'#84cc16', desc:'初入仙途，凡体未脱'},
  {name:'炼气',     fit:'新手入门',  stage:9,  icon:'💨', color:'#22c55e', desc:'气入百骸，身轻体健'},
  {name:'筑基',     fit:'初级健身者',stage:9,  icon:'🪨', color:'#14b8a6', desc:'道基初成，筋骨渐强'},
  {name:'金丹',     fit:'进阶健身者',stage:9,  icon:'✨', color:'#eab308', desc:'金丹凝成，力量初显'},
  {name:'元婴',     fit:'中级训练者',stage:9,  icon:'👶', color:'#f59e0b', desc:'元婴破壳，力能扛鼎'},
  {name:'化神',     fit:'高级训练者',stage:9,  icon:'🔥', color:'#ef4444', desc:'神念化形，举重若轻'},
  {name:'炼虚',     fit:'资深健身者',stage:9,  icon:'⚡', color:'#8b5cf6', desc:'虚实相生，百炼成钢'},
  {name:'合体',     fit:'精英运动员',stage:9,  icon:'👑', color:'#ec4899', desc:'灵肉合一，力随意动'},
  {name:'大乘',     fit:'专业运动员',stage:9,  icon:'🐉', color:'#dc2626', desc:'大道将成，天下无双'},
  {name:'渡劫',     fit:'准健体冠军',stage:9,  icon:'🌩️', color:'#6366f1', desc:'雷劫临身，一飞冲天'},
  {name:'飞升',     fit:'健体冠军',  stage:1,  icon:'🏆', color:'#fbbf24', desc:'肉身成圣，仙凡永隔'},
];
const XIAN_PARTS = {
  '胸':   {gongfa:'金刚伏魔诀', icon:'🛡️', desc:'胸肌为盾，硬桥硬马'},
  '背':   {gongfa:'龙象般若功', icon:'🐲', desc:'背阔如翼，力大无穷'},
  '肩':   {gongfa:'星辰锻体诀', icon:'🌟', desc:'肩承日月，稳如泰山'},
  '手臂': {gongfa:'玄铁臂法',   icon:'⚙️', desc:'铁臂如枪，力贯千钧'},
  '腿':   {gongfa:'地脉踏天功', icon:'⛰️', desc:'双腿如桩，踏碎山河'},
  '臀':   {gongfa:'蛮荒力体术', icon:'🐘', desc:'臀部为炉，爆发之源'},
  '核心': {gongfa:'玄武守元功', icon:'🐢', desc:'核心如鼎，固本培元'},
  '有氧': {gongfa:'风灵步法',   icon:'💨', desc:'身法如风，耐力绵长'},
  '拉伸': {gongfa:'柔水诀',     icon:'💧', desc:'柔能克刚，舒展筋骨'},
};
function xianState(){ return state.xian || (state.xian = {realm:0, stage:1, exp:0, totalExp:0, partLv:{}, prCount:0, wins:0, playCount:0}); }
function xianCur(){
  const x = xianState();
  const realm = XIAN_REALMS[x.realm];
  return {x, realm, stage: Math.min(x.stage, realm.stage)};
}
function xianExpNeed(x){ return 40 + x.realm * 30 + (x.stage-1) * 8; }
function xianTitle(){
  const {x, realm, stage} = xianCur();
  return stage >= realm.stage ? realm.name + '圆满' : realm.name + '·' + stage + (x.realm===0?'层':'重');
}
function xianAddExp(n, reason){
  const x = xianState();
  x.exp += n; x.totalExp += n;
  let leveled = false;
  while(x.exp >= xianExpNeed(x)){
    x.exp -= xianExpNeed(x);
    x.stage++;
    const r = XIAN_REALMS[x.realm];
    if(x.stage > r.stage){
      x.stage = 1; x.realm++;
      if(x.realm >= XIAN_REALMS.length){ x.realm = XIAN_REALMS.length-1; x.stage = 1; x.exp = 0; break; }
      leveled = true;
      const nr = XIAN_REALMS[x.realm];
      try{navigator.vibrate && navigator.vibrate([60,40,60]);}catch(e){}
      toast('✨ 突破！' + xianTitle() + '（' + nr.fit + '）');
      confettiBurst();
    } else {
      leveled = true;
      toast('🧘 ' + xianTitle() + ' 修为精进');
    }
  }
  save();
  return leveled;
}
function xianPartGrow(part){
  const x = xianState();
  const key = part || '全身';
  x.partLv[key] = (x.partLv[key]||0) + 1;
  const g = XIAN_PARTS[key];
  if(g && x.partLv[key] % 10 === 0) toast('📜 功法「'+g.gongfa+'」突破第'+(x.partLv[key]/10)+'层');
}
function xianGainFromSet(it, set){
  // 完成一组：修为 + 重量*次数/10
  const wt = +set.weight||0, rp = +set.reps||0;
  const gain = Math.max(2, Math.round((wt*rp)/10));
  xianAddExp(gain, '修炼');
  if(wt>0) xianPartGrow(it.part);
}
function xianOnPR(){
  const x = xianState();
  x.prCount = (x.prCount||0)+1;
  xianAddExp(30, '突破纪录');
}

/* 渲染修仙页 */
function renderCultivation(){
  const x = xianState();
  const {realm, stage} = xianCur();
  const need = xianExpNeed(x);
  const pct = Math.min(100, Math.round(x.exp/need*100));
  const r = realm;
  // 功法列表（按部位进度排序）
  const gongfaRows = Object.keys(XIAN_PARTS).map(k=>{
    const lv = x.partLv[k]||0;
    const g = XIAN_PARTS[k];
    const lvl = Math.floor(lv/10)+1;
    const p = lv%10;
    const isCur = session && session.items.some(it=>it.part===k);
    return `<div class="gf-row ${isCur?'gf-cur':''}">
      <div class="gf-ic">${g.icon}</div>
      <div class="gf-info">
        <div class="gf-name">${k} · ${g.gongfa}</div>
        <div class="gf-bar"><div class="gf-bar-fill" style="width:${(lv%10)*10}%"></div></div>
      </div>
      <div class="gf-lv">${gongfaLevelName(lvl)}</div>
    </div>`;
  }).join('');

  const recentPR = state.workouts.slice(-5).reverse().map(w=>{
    const prs = w.prs||[];
    return prs.length ? `<div class="pr-item">🏅 ${escapeHtml(w.planName)} · ${prs[0].name} ${prs[0].value}${prs[0].type==='weight'?'kg':'kg(1RM)'}</div>` : '';
  }).filter(Boolean).join('') || '<div class="pr-item muted">暂无纪录，去突破重量吧！</div>';

  return `
    <div class="xian-page">
      <div class="xian-hero" style="background:linear-gradient(160deg,${r.color}33,#0f172a 70%);border-top:2px solid ${r.color}66;">
        <div class="xian-realm-ic">${r.icon}</div>
        <div class="xian-realm-name" style="color:${r.color};">${xianTitle()}</div>
        <div class="xian-fit">对应：${r.fit}</div>
        <div class="xian-desc">${r.desc}</div>
        <div class="xian-exp-bar">
          <div class="xian-exp-fill" style="width:${pct}%;background:${r.color};"></div>
        </div>
        <div class="xian-exp-text">修为 ${x.exp}/${need} · 总修为 ${x.totalExp}</div>
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">🧭 境界体系 <span class="xian-sec-sub">按你的健身进度修炼</span></div>
        <div class="xian-realms">
          ${XIAN_REALMS.map((rr,i)=>`
            <div class="xian-realm-chip ${i===x.realm?'cur':(i<x.realm?'done':'')}" style="${i===x.realm?`border-color:${rr.color};color:${rr.color};`:''}">
              ${i<x.realm?'✓':rr.icon} ${rr.name}
            </div>`).join('')}
        </div>
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">📜 功法修为 <span class="xian-sec-sub">部位练得多，功法等级越高</span></div>
        ${gongfaRows}
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">🏅 突破纪录 <span class="xian-sec-sub">突破重量=突破修为（+30修为）</span></div>
        ${recentPR}
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">⚔️ 仙途副本 <span class="xian-sec-sub">解压小游戏，赢修为</span></div>
        <div class="fb-card">
          <div class="fb-ic">🗡️</div>
          <div class="fb-info">
            <div class="fb-name">灵气收集 · 凝神静气</div>
            <div class="fb-desc">30秒内点吸收集飘散的灵气，每朵+2修为，集满20朵额外+20</div>
          </div>
          <button class="fb-btn" data-act="xianPlay">进入</button>
        </div>
        <div class="fb-stats">已通关 ${x.wins||0} 次 · 游玩 ${x.playCount||0} 次 · 纪录 ${x.bestScore||0} 朵</div>
      </div>
    </div>
  `;
}
function gongfaLevelName(l){
  if(l>=10) return '圆满';
  const names=['一层','二层','三层','四层','五层','六层','七层','八层','九层','大圆满'];
  return names[l-1]||'未知';
}

/* 副本小游戏：灵气收集 */
let xianGame = null;
function xianPlay(){
  openSheet(`
    <div class="xian-game">
      <div class="xg-head">
        <span>🗡️ 灵气收集 · <span id="xg-time">30</span>s</span>
        <span id="xg-score">0 朵</span>
      </div>
      <div class="xg-area" id="xg-area"></div>
      <div class="xg-tip">点击飘动的灵气珠吸收！</div>
    </div>
  `);
  const area = $('#xg-area');
  const timeEl = $('#xg-time');
  const scoreEl = $('#xg-score');
  let time = 30, score = 0;
  const colors = ['#84cc16','#22c55e','#14b8a6','#eab308','#8b5cf6','#f59e0b'];
  const spawn = ()=>{
    if(!area || time<=0) return;
    const ball = document.createElement('div');
    ball.className = 'xg-ball';
    const size = 26 + Math.random()*22;
    const color = colors[Math.floor(Math.random()*colors.length)];
    ball.style.cssText = `width:${size}px;height:${size}px;background:radial-gradient(circle at 30% 30%, #fff3, ${color});left:${Math.random()*90}%;top:${Math.random()*90}%;animation:xg-float ${2+Math.random()*2}s ease-in-out infinite;`;
    ball.addEventListener('click', e=>{
      e.stopPropagation();
      score++;
      scoreEl.textContent = score + ' 朵';
      ball.remove();
      xianAddExp(2, '灵气');
      if(score===20) toast('🌪️ 灵气风暴！+20修为');
    });
    area.appendChild(ball);
    setTimeout(()=>{ if(ball.parentNode) ball.remove(); }, 3000);
  };
  const iv = setInterval(spawn, 400);
  const tv = setInterval(()=>{
    time--;
    timeEl.textContent = time;
    if(time<=0){
      clearInterval(iv); clearInterval(tv);
      const x = xianState();
      x.playCount++;
      if(score>=(x.bestScore||0)) x.bestScore = score;
      let extra = 0;
      if(score>=20){ extra = 20; x.wins++; }
      xianAddExp(score*2 + extra, '副本通关');
      save();
      setTimeout(()=>{
        closeSheet();
        toast('🏆 本次吸收 '+score+' 朵灵气'+(extra?'，额外 +'+extra:''));
      }, 500);
    }
  }, 1000);
}

/* 事件挂接：修仙 tab + 副本 + 完成组/PR 修为 */
(function(){
  const baseSetTab = setTab;
  setTab = function(tab){
    const ret = baseSetTab(tab);
    if(tab === 'cultivation'){ $('#topbar').classList.add('hidden'); }
    return ret;
  };
  const baseRender = render;
  render = function(){
    if(currentTab === 'cultivation'){
      $('#view').innerHTML = renderCultivation();
      return;
    }
    return baseRender();
  };
})();
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act]');
  if(!act) return;
  const a = act.dataset.act;
  if(a === 'xianPlay'){ xianPlay(); return; }
  if(a === 'doneSet'){
    const i=+act.dataset.ex, j=+act.dataset.set;
    // 修为：完成一组（值在 app.js 处理后再触发）
    setTimeout(()=>{
      if(session && session.items[i] && session.items[i].sets[j] && session.items[i].sets[j].done){
        xianGainFromSet(session.items[i], session.items[i].sets[j]);
      }
    }, 30);
    return;
  }
});
/* PR 修为（包装 checkSetPR 内 toast 之外，这里检测 PR 事件） */
(function(){
  const base = checkSetPR;
  checkSetPR = function(it, set){
    const before = state.xian ? state.xian.prCount : 0;
    const ret = base(it, set);
    const after = state.xian ? state.xian.prCount : 0;
    if(after > before) xianOnPR();
    return ret;
  };
})();

/* ============================================================
   周报 / 月报分享图（canvas 生成，可保存分享）
   ============================================================ */
function weekReportCanvas(period){
  // period: 'week' | 'month'
  const now = new Date();
  let start, label;
  if(period === 'week'){
    const dow = (now.getDay()+6)%7; // 周一为0
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate()-dow);
    label = '本周训练周报';
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    label = '本月训练月报';
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
  const ws = state.workouts.filter(w=>{
    const d = new Date(w.date+'T12:00:00');
    return d >= start && d < end;
  });
  // 统计
  const days = new Set(ws.map(w=>w.date)).size;
  const count = ws.length;
  const totalSec = ws.reduce((n,w)=>n+(w.duration||0),0);
  const volume = ws.reduce((n,w)=>n+(w.volume||0),0);
  const partVol = {};
  ws.forEach(w=>w.items.forEach(it=>{
    const v = it.sets.reduce((s,set)=>s+(+set.weight||0)*(+set.reps||0),0);
    partVol[it.part] = (partVol[it.part]||0)+v;
  }));
  // 画布
  const cv = document.createElement('canvas');
  const W = 720, H = 980;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // 背景
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0f172a'); g.addColorStop(1,'#1e3a5f');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  // 装饰星点
  for(let i=0;i<60;i++){
    ctx.fillStyle = 'rgba(255,255,255,'+(Math.random()*0.35+0.05)+')';
    ctx.beginPath(); ctx.arc(Math.random()*W, Math.random()*H, Math.random()*1.6+0.3, 0, 7); ctx.fill();
  }
  // 标题
  ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 46px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, W/2, 90);
  // 日期范围
  ctx.fillStyle = '#94a3b8'; ctx.font = '22px "PingFang SC",sans-serif';
  ctx.fillText((start.getMonth()+1)+'月'+start.getDate()+'日 — '+now.getMonth()+1+'月'+now.getDate()+'日', W/2, 130);
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60,160); ctx.lineTo(W-60,160); ctx.stroke();
  // 核心数据
  const items = [
    {v: count, k:'训练次数', unit:'次'},
    {v: days, k:'训练天数', unit:'天'},
    {v: Math.round(totalSec/60), k:'总时长', unit:'分钟'},
    {v: Math.round(volume), k:'总容量', unit:'kg'},
  ];
  const cardW = 300, cardH = 110, gap = 20, x0 = (W-2*cardW-gap)/2, y0 = 200;
  items.forEach((it,idx)=>{
    const cx = x0 + (idx%2)*(cardW+gap), cy = y0 + Math.floor(idx/2)*(cardH+gap);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    roundRect(ctx, cx, cy, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(251,191,36,.35)'; ctx.lineWidth = 1.5;
    roundRect(ctx, cx, cy, cardW, cardH, 18); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 42px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(it.v), cx+cardW/2, cy+62);
    ctx.fillStyle = '#94a3b8'; ctx.font = '20px "PingFang SC",sans-serif';
    ctx.fillText(it.k+'（'+it.unit+'）', cx+cardW/2, cy+92);
  });
  // 部位分布
  const yTitle = y0+2*cardH+gap+40;
  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 26px "PingFang SC",sans-serif';
  ctx.textAlign = 'left'; ctx.fillText('训练部位分布', 60, yTitle);
  const parts = Object.keys(partVol).sort((a,b)=>partVol[b]-partVol[a]).slice(0,6);
  const maxV = parts.length ? partVol[parts[0]] : 1;
  parts.forEach((p,i)=>{
    const by = yTitle + 44 + i*56;
    ctx.fillStyle = '#cbd5e1'; ctx.font = '20px "PingFang SC",sans-serif';
    ctx.fillText(p, 60, by+16);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    roundRect(ctx, 160, by-8, 420, 28, 14); ctx.fill();
    const w = Math.max(14, 420*partVol[p]/maxV);
    const bg = ctx.createLinearGradient(160,0,160+w,0);
    bg.addColorStop(0,'#f59e0b'); bg.addColorStop(1,'#ef4444');
    ctx.fillStyle = bg;
    roundRect(ctx, 160, by-8, w, 28, 14); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 18px "PingFang SC",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(partVol[p])+'kg', 590, by+16);
    ctx.textAlign = 'left';
  });
  // 底部激励语
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '20px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('—— FitRecord · 每一次训练都算数 ——', W/2, H-50);
  return cv;
}
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}
function openWeekReport(period){
  const cv = weekReportCanvas(period);
  const dataUrl = cv.toDataURL('image/png');
  openSheet(`
    <h3 style="text-align:center;">${period==='week'?'本周训练周报':'本月训练月报'}</h3>
    <div class="report-canvas-wrap"><img id="report-canvas" src="${dataUrl}" alt="训练周报"/></div>
    <p style="font-size:12px;color:var(--muted);text-align:center;margin:10px 0;">长按图片保存到手机，可分享到朋友圈/小红书</p>
    <div style="display:flex;gap:10px;">
      <button class="btn block" data-act="closeSheet">关闭</button>
      <button class="btn block primary" data-act="downloadReport">保存图片</button>
    </div>
  `);
}
/* 保存图片 */
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act="downloadReport"]');
  if(!act) return;
  e.stopPropagation(); e.preventDefault();
  const img = $('#report-canvas');
  if(!img) return;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = 'fitrecord_report.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('图片已保存（iOS 请长按保存）');
}, true);
/* 统计页加周报/月报入口 */
(function(){
  const base = renderStats;
  renderStats = function(){
    const html = base();
    const btnHtml = `
      <div style="display:flex;gap:10px;margin:2px 0 12px;">
        <button class="week-report-btn" style="flex:1;" data-act="weekReport">📊 本周周报</button>
        <button class="week-report-btn" style="flex:1;background:linear-gradient(90deg,#8b5cf6,#6366f1);" data-act="monthReport">📈 本月月报</button>
      </div>`;
    const marker = '<div class="month-row">';
    if(html.indexOf(marker) !== -1) html = html.replace(marker, btnHtml + marker);
    return html;
  };
})();
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act]');
  if(!act) return;
  if(act.dataset.act === 'weekReport'){ openWeekReport('week'); return; }
  if(act.dataset.act === 'monthReport'){ openWeekReport('month'); return; }
});

/* ============================================================
   v6.1 修仙系统大改造（2026-08-11）
   ① 自适应境界定位（按历史训练数据）
   ② 人物角色 + 灵气光环持续动画
   ③ 打怪闯关副本
   ④ 功法按容量+次数双重升级
   ============================================================ */

/* ---------- ① 自适应境界定位 ---------- */
function xianAutoLevel(){
  const ws = state.workouts || [];
  if(!ws.length) return null;
  const total = ws.length;
  const totalVol = ws.reduce((n,w)=>n+(w.volume||0),0);
  const maxWeight = Math.max(0, ...ws.flatMap(w=>w.items.flatMap(it=>it.sets.map(s=>+s.weight||0))));
  const prCount = ws.reduce((n,w)=>n+(w.prs||[]).length,0);
  // 综合评分：训练次数×1 + 容量/1000 + 最大重量×10 + PR数×50
  const score = total + totalVol/1000 + maxWeight*10 + prCount*50;
  let realm = 0;
  if(score >= 200) realm = 1;        // 炼气
  if(score >= 800) realm = 2;        // 筑基
  if(score >= 2000) realm = 3;       // 金丹
  if(score >= 5000) realm = 4;       // 元婴
  if(score >= 12000) realm = 5;      // 化神
  if(score >= 25000) realm = 6;      // 炼虚
  if(score >= 55000) realm = 7;      // 合体
  if(score >= 110000) realm = 8;     // 大乘
  if(score >= 220000) realm = 9;     // 渡劫
  if(score >= 500000) realm = 10;    // 飞升
  return {realm, stage:1, exp:0};
}
function xianInit(){
  const x = xianState();
  if(!x.initialized){
    const auto = xianAutoLevel();
    if(auto){
      const prev = {realm:x.realm, stage:x.stage};
      x.realm = auto.realm;
      x.stage = auto.stage;
      x.exp = auto.exp;
      x.initialized = true;
      if(auto.realm > prev.realm){
        setTimeout(()=>toast('🧭 仙根已定：'+XIAN_REALMS[auto.realm].name+'（'+XIAN_REALMS[auto.realm].fit+'）'), 600);
      }
    } else {
      x.initialized = true;
    }
    // 首次：从历史 workouts 回填 partExp（按容量累计）
    (state.workouts||[]).forEach(w=>{
      (w.items||[]).forEach(it=>{
        const v = (it.sets||[]).reduce((s,set)=>s+(+set.weight||0)*(+set.reps||0),0);
        if(v>0){
          x.partExp[it.part] = (x.partExp[it.part]||0) + v;
          const lvl = Math.min(10, Math.floor((x.partExp[it.part]/1000))+1);
          if((x.partLv[it.part]||0) < lvl) x.partLv[it.part] = lvl;
        }
      });
    });
    save();
  }
}

/* ---------- ② 功法容量升级（覆盖 v6 版本） ---------- */
function xianPartGrow(part, vol){
  const x = xianState();
  const key = part || '全身';
  if(vol > 0) x.partExp[key] = (x.partExp[key]||0) + vol;
  // 升级：每 1000kg 累计容量 = 1 层（最多 10 层）
  const lvl = Math.min(10, Math.floor((x.partExp[key]||0)/1000) + 1);
  if(lvl > (x.partLv[key]||0)){
    x.partLv[key] = lvl;
    const g = XIAN_PARTS[key];
    if(g) toast('📜 '+g.gongfa+' 突破至第'+lvl+'层');
  }
}
function xianGainFromSet(it, set){
  const wt = +set.weight||0, rp = +set.reps||0;
  const gain = Math.max(2, Math.round((wt*rp)/10));
  xianAddExp(gain, '修炼');
  if(wt>0 && rp>0) xianPartGrow(it.part, wt*rp);
}

/* ---------- ③ 渲染人物动画 + 境界体系（覆盖 v6） ---------- */
function xianCharHTML(realm){
  // 修真者形象：随境界变化（头部表情+身体）+灵气光环
  const charEmoji = [xianState().realm, xianState().stage].join('-');
  // 修真者外形随境界变化
  let bodyIcon;
  if(realm.realm <= 1) bodyIcon = '🌱';          // 引气/炼气：幼苗
  else if(realm.realm <= 3) bodyIcon = '🧘';     // 筑基/金丹：修士打坐
  else if(realm.realm <= 5) bodyIcon = '👨‍🎓';   // 元婴/化神：修真者
  else if(realm.realm <= 7) bodyIcon = '⚔️';     // 炼虚/合体：剑修
  else if(realm.realm <= 9) bodyIcon = '🐉';     // 大乘/渡劫：龙气护体
  else bodyIcon = '👑';                            // 飞升：飞升成仙
  return `
    <div class="xian-stage" style="--rc:${realm.color};">
      <div class="xian-bg-particles"></div>
      <div class="xian-aura-rings">
        <div class="ring r1"></div>
        <div class="ring r2"></div>
        <div class="ring r3"></div>
      </div>
      <div class="xian-character">
        <div class="xc-body">${bodyIcon}</div>
        <div class="xc-glow"></div>
        <div class="xc-aura">${realm.icon}</div>
      </div>
      <div class="xian-souls"></div>
      <div class="xian-realm-name" style="color:${realm.color};">${xianTitle()}</div>
      <div class="xian-fit">对应：${realm.fit}</div>
      <div class="xian-desc">${realm.desc}</div>
      <div class="xian-exp-bar">
        <div class="xian-exp-fill" style="width:${Math.min(100, Math.round(xianState().exp/xianExpNeed(xianState())*100))}%;background:${realm.color};"></div>
      </div>
      <div class="xian-exp-text">修为 ${xianState().exp}/${xianExpNeed(xianState())} · 总修为 ${xianState().totalExp||0}</div>
    </div>
  `;
}

function renderCultivation(){
  xianInit();
  const x = xianState();
  const {realm, stage} = xianCur();
  const need = xianExpNeed(x);
  const pct = Math.min(100, Math.round(x.exp/need*100));
  const r = realm;
  // 功法列表：显示容量进度 + 等级
  const gongfaRows = Object.keys(XIAN_PARTS).map(k=>{
    const exp = x.partExp[k]||0;
    const lvl = Math.min(10, Math.floor(exp/1000)+1);
    const p = ((exp%1000)/1000)*100;
    const lv10 = (lvl >= 10);
    const isCur = session && session.items.some(it=>it.part===k);
    const g = XIAN_PARTS[k];
    return `<div class="gf-row ${isCur?'gf-cur':''}">
      <div class="gf-ic">${g.icon}</div>
      <div class="gf-info">
        <div class="gf-name">${k} · ${g.gongfa}</div>
        <div class="gf-bar"><div class="gf-bar-fill" style="width:${p}%"></div></div>
        <div class="gf-meta">${Math.round(exp)}/1000 kg · 第${lvl}层${lv10?' · 圆满':''}</div>
      </div>
      <div class="gf-lv">${gongfaLevelName(lvl)}</div>
    </div>`;
  }).join('');

  const recentPR = state.workouts.slice(-5).reverse().map(w=>{
    const prs = w.prs||[];
    return prs.length ? `<div class="pr-item">🏅 ${escapeHtml(w.planName)} · ${prs[0].name} ${prs[0].value}${prs[0].type==='weight'?'kg':'kg(1RM)'}</div>` : '';
  }).filter(Boolean).join('') || '<div class="pr-item muted">暂无纪录，去突破重量吧！</div>';

  return `
    <div class="xian-page">
      ${xianCharHTML(r)}

      <div class="xian-section">
        <div class="xian-sec-title">🧭 境界体系 <span class="xian-sec-sub">按历史训练自动定位</span></div>
        <div class="xian-realms">
          ${XIAN_REALMS.map((rr,i)=>`
            <div class="xian-realm-chip ${i===x.realm?'cur':(i<x.realm?'done':'')}" style="${i===x.realm?`border-color:${rr.color};color:${rr.color};`:''}">
              ${i<x.realm?'✓':rr.icon} ${rr.name}
            </div>`).join('')}
        </div>
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">📜 功法修为 <span class="xian-sec-sub">每 1000kg 容量升一层</span></div>
        ${gongfaRows}
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">🏅 突破纪录 <span class="xian-sec-sub">突破重量=突破修为（+30修为）</span></div>
        ${recentPR}
      </div>

      <div class="xian-section">
        <div class="xian-sec-title">⚔️ 闯关副本 <span class="xian-sec-sub">修真者 VS 妖魔，30秒击败15怪即为通关</span></div>
        <div class="fb-card">
          <div class="fb-ic">⚔️</div>
          <div class="fb-info">
            <div class="fb-name">妖魔讨伐 · 修真出山</div>
            <div class="fb-desc">修真者发射灵力弹攻击妖魔，自动射击 + 点击大招，每杀一怪 +3 修为</div>
          </div>
          <button class="fb-btn" data-act="xianPlay">出战</button>
        </div>
        <div class="fb-stats">已通关 ${x.wins||0} 次 · 游玩 ${x.playCount||0} 次 · 最佳 ${x.bestKills||0} 击杀</div>
      </div>
    </div>
  `;
}

/* ---------- ④ 打怪副本（覆盖 v6） ---------- */
function xianPlay(){
  openSheet(`
    <div class="xian-game">
      <div class="xg-head">
        <span>⚔️ 妖魔讨伐 · <span id="xg-time">30</span>s</span>
        <span>击败 <span id="xg-kills">0</span> 怪</span>
      </div>
      <div class="xg-stage" id="xg-stage">
        <div class="xg-floor"></div>
        <div class="xg-hero" id="xg-hero">🧘</div>
      </div>
      <div class="xg-tap-tip">点击场地释放绝技大招 · 自动射击已开启</div>
    </div>
  `);
  const stage = $('#xg-stage');
  const hero = $('#xg-hero');
  let time = 30, kills = 0;
  const monsters = ['👹','👺','💀','👻','🐲','🦇','🐍','🦂','👽','🧟'];
  // 移动英雄到 hero 当前 offsetLeft
  let heroLeft = (stage.offsetWidth - 60)/2;
  hero.style.left = heroLeft + 'px';

  // 点击场地：大招（全屏横扫）
  const doBigShot = ()=>{
    if(time<=0) return;
    const flash = document.createElement('div');
    flash.className = 'xg-bigshot';
    stage.appendChild(flash);
    setTimeout(()=>flash.remove(), 400);
    stage.querySelectorAll('.xg-monster').forEach(m=>{
      kills++;
      $('#xg-kills').textContent = kills;
      xianAddExp(3, '击杀');
      const fx = document.createElement('div');
      fx.className = 'xg-hitfx';
      fx.textContent = '💥';
      fx.style.left = m.style.left;
      fx.style.top = m.style.top;
      stage.appendChild(fx);
      setTimeout(()=>fx.remove(), 350);
      m.remove();
    });
  };
  stage.addEventListener('click', doBigShot);

  // 自动射击：每 1s 发射一颗灵力弹
  const shotIv = setInterval(()=>{
    if(time<=0) return;
    if(!stage.isConnected) return;
    const b = document.createElement('div');
    b.className = 'xg-bullet';
    b.textContent = '⚡';
    b.style.left = (hero.offsetLeft + 24) + 'px';
    b.style.bottom = '40px';
    stage.appendChild(b);
    let y = 40;
    const mv = setInterval(()=>{
      if(!b.parentNode){ clearInterval(mv); return; }
      y += 7;
      b.style.bottom = y + 'px';
      if(y > stage.offsetHeight - 40){ b.remove(); clearInterval(mv); return; }
      // 命中检测
      stage.querySelectorAll('.xg-monster').forEach(m=>{
        const mr = m.getBoundingClientRect(), br = b.getBoundingClientRect();
        if(br.left < mr.right && br.right > mr.left && br.top < mr.bottom && br.bottom > mr.top){
          m.remove(); b.remove(); clearInterval(mv);
          kills++;
          $('#xg-kills').textContent = kills;
          xianAddExp(3, '击杀');
          const fx = document.createElement('div');
          fx.className = 'xg-hitfx';
          fx.textContent = '💥';
          fx.style.left = m.style.left;
          fx.style.top = m.style.top;
          stage.appendChild(fx);
          setTimeout(()=>fx.remove(), 350);
        }
      });
    }, 40);
  }, 1000);

  // 生成怪物
  const spawnIv = setInterval(()=>{
    if(time<=0) return;
    if(!stage.isConnected) return;
    const m = document.createElement('div');
    m.className = 'xg-monster';
    m.textContent = monsters[Math.floor(Math.random()*monsters.length)];
    m.style.left = (10 + Math.random()*(stage.offsetWidth - 50)) + 'px';
    m.style.top = '-40px';
    m.style.fontSize = (24 + Math.random()*12) + 'px';
    stage.appendChild(m);
    // 下落
    const fallIv = setInterval(()=>{
      if(!m.parentNode || !stage.isConnected){ clearInterval(fallIv); return; }
      let t = parseFloat(m.style.top||'-40');
      t += 1.4;
      m.style.top = t + 'px';
      // 到达底部则撞到英雄（不扣血，简单版）
      if(t > stage.offsetHeight - 60){ m.remove(); clearInterval(fallIv); }
    }, 50);
  }, 700);

  // 倒计时
  const tv = setInterval(()=>{
    time--;
    $('#xg-time').textContent = time;
    if(time<=0){
      clearInterval(shotIv); clearInterval(spawnIv); clearInterval(tv);
      stage.removeEventListener('click', doBigShot);
      const x = xianState();
      x.playCount = (x.playCount||0) + 1;
      if(kills >= 15){ x.wins = (x.wins||0) + 1; }
      if(kills > (x.bestKills||0)) x.bestKills = kills;
      xianAddExp(kills*3, '副本通关');
      save();
      setTimeout(()=>{
        closeSheet();
        const verdict = kills>=15 ? '🏆 通关！' : '💪 再接再厉';
        toast(verdict+' 击败 '+kills+' 妖魔，+'+kills*3+' 修为');
        confettiBurst();
      }, 500);
    }
  }, 1000);
}

/* ============================================================
   v5.1 增量：bug 修复 + 体验优化（2026-08-11）
   ============================================================ */

/* ---------- Bug1：finishWorkout 后 session 置空，避免动作库误判 ---------- */
const _finishWorkoutBase2 = finishWorkout;
finishWorkout = function(){
  const ret = _finishWorkoutBase2();
  session = null;
  if(state){ state.currentWorkout = null; try{save();}catch(e){} }
  return ret;
};

/* ---------- Bug2/3：返回=最小化（不再弹确认框），confirmBack=真退出 ---------- */
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act]');
  if(!act) return;
  const a = act.dataset.act;
  if(a === 'backWorkout'){
    e.stopPropagation(); e.preventDefault();
    minimizeWorkout();
    return;
  }
  if(a === 'confirmBack'){
    e.stopPropagation(); e.preventDefault();
    // 真退出：丢弃当前训练
    closeSheet();
    session = null;
    stopDur();
    if(state){ state.currentWorkout = null; try{save();}catch(e){} }
    $('#workout-view').classList.add('hidden');
    $('#tabbar').classList.remove('hidden');
    if(currentTab!=='train' && currentTab!=='library') $('#topbar').classList.remove('hidden');
    render();
    toast('已退出训练');
    return;
  }
}, true);

/* ---------- Bug4：mini 卡时长实时刷新 ---------- */
let miniTicker = null;
function startMiniTicker(){
  stopMiniTicker();
  miniTicker = setInterval(()=>{
    const meta = $('#mini-active-meta');
    if(!meta || !state || !state.currentWorkout) return;
    const w = state.currentWorkout;
    let done = 0, total = 0;
    w.items.forEach(it=>it.sets.forEach(s=>{ total++; if(s.done) done++; }));
    const dur = w.fixedDur ? w.fixedDur*60 : Math.max(0, Math.floor((Date.now() - w.startAt - (w.paused||0))/1000));
    meta.textContent = '进度 ' + done + '/' + total + ' · 时长 ' + fmtTime(dur);
  }, 1000);
}
function stopMiniTicker(){
  if(miniTicker){ clearInterval(miniTicker); miniTicker = null; }
}
/* 在 renderHome 渲染后启动；切走时无需停（元素消失即跳过） */
const _renderHomeBase2 = renderHome;
renderHome = function(){
  const html = _renderHomeBase2();
  setTimeout(startMiniTicker, 50);
  return html;
};

/* ---------- Bug5：addSet 复制组保留 warmup ---------- */
const _addSetBase = addSet;
addSet = function(i){
  const prev = session.items[i].sets[session.items[i].sets.length-1];
  session.items[i].sets.push({
    weight: prev?prev.weight:'', reps: prev?prev.reps:'',
    rpe:'', done:false, warmup: prev?!!prev.warmup:false
  });
  renderWorkoutList();
};

/* ---------- Bug6：fillLast 填入上次保留 warmup ---------- */
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act="fillLast"]');
  if(!act) return;
  e.stopPropagation(); e.preventDefault();
  const i = +act.dataset.ex;
  const ref = lastSetsForEx(session.items[i].exId);
  if(ref){
    session.items[i].sets = ref.sets.map(s=>({
      weight:s.weight, reps:s.reps, rpe:'', done:false, warmup:!!s.warmup
    }));
    renderWorkoutList();
    toast('已填入上次成绩');
  }
}, true);

/* ---------- Bug7：wheelOk 同步最新滚动位置 ---------- */
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act="wheelOk"]');
  if(!act || !wheelCtx) return;
  e.stopPropagation(); e.preventDefault();
  const w = $('#wheel');
  if(w){
    const idx = Math.max(0, Math.min(wheelCtx.values.length-1, Math.round(w.scrollTop/44)));
    wheelCtx.idx = idx;
  }
  if(wheelCtx.cb) wheelCtx.cb(wheelCtx.values[wheelCtx.idx]);
  wheelCtx = null;
  closeSheet();
}, true);

/* ---------- Bug8：删除训练用自定义确认 sheet 替代原生 confirm ---------- */
const _discardWorkoutBase = discardWorkout;
discardWorkout = function(){
  openSheet(`
    <h3>删除本次训练</h3>
    <p style="color:var(--muted);font-size:14px;line-height:1.6;">删除后本次训练的组数记录将丢弃，<b>不会计入历史</b>。确定删除吗？</p>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn block" data-act="closeSheet">取消</button>
      <button class="btn block primary" style="background:#ef4444;" data-act="confirmDiscard">删除</button>
    </div>
  `);
};
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act="confirmDiscard"]');
  if(!act) return;
  e.stopPropagation(); e.preventDefault();
  closeSheet();
  session = null;
  stopDur();
  if(state){ state.currentWorkout = null; try{save();}catch(e){} }
  render();
  toast('训练记录已删除');
}, true);

/* ---------- Bug10：resume 后立即显示当前时长（不等 500ms） ---------- */
const _resumeWorkoutBase = resumeWorkout;
resumeWorkout = function(){
  _resumeWorkoutBase();
  const el = $('#wo-time');
  if(el && session){
    const sec = session.fixedDur ? session.fixedDur*60 : Math.max(0, Math.floor((Date.now() - session.startAt - (session.paused||0))/1000));
    el.textContent = fmtTime(sec);
  }
};

/* ============================================================
   体验优化
   ============================================================ */

/* O1：完成训练后展示摘要 toast（组数/时长/容量） */
const _finishWorkoutBase3 = finishWorkout;
finishWorkout = function(){
  const ret = _finishWorkoutBase3();
  const last = state.workouts[state.workouts.length-1] || null;
  if(last && !last._toasted){
    last._toasted = true;
    const sets = last.items.reduce((n,it)=>n+it.sets.length,0);
    const min = Math.round((last.duration||0)/60);
    setTimeout(()=>{
      toast(`✅ 完成！${min}分钟 · ${sets}组 · 容量 ${last.volume||0}kg`);
    }, 600);
  }
  return ret;
};

/* O2：动作卡 head 加 data-done-badge（折叠时显示完成徽章） */
(function(){
  const base = renderWorkoutList;
  renderWorkoutList = function(){
    base();
    $$('#workout-list .ex-card').forEach(card=>{
      const exIdx = card.dataset.ex;
      if(exIdx == null) return;
      const it = session.items[+exIdx];
      if(!it) return;
      const done = it.sets.filter(s=>s.done).length;
      const total = it.sets.length;
      const head = card.querySelector('.ex-name');
      if(head) head.dataset.doneBadge = done + '/' + total;
    });
  };
})();

/* O3：训练页 hero 加"删除本次训练"按钮 */
function ensureHeroDelBtn(){
  const top = $('#workout-hero-top');
  if(!top || $('#wo-del-btn')) return;
  // 在"完成"按钮右侧插入删除按钮
  const btn = document.createElement('button');
  btn.className = 'wo-del-btn';
  btn.dataset.act = 'discardWorkout';
  btn.title = '删除本次训练';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>';
  top.appendChild(btn);
}
(function(){
  const base = openWorkout;
  openWorkout = function(){
    base();
    setTimeout(ensureHeroDelBtn, 0);
  };
})();
(function(){
  const base = resumeWorkout;
  resumeWorkout = function(){
    base();
    setTimeout(ensureHeroDelBtn, 0);
  };
})();

/* O4：主页空计划引导 */
(function(){
  const base = renderHome;
  renderHome = function(){
    let html = base();
    const hasPlans = state.plans && state.plans.length;
    if(!hasPlans){
      const guide = `
        <div class="empty-guide">
          <div style="font-size:40px;margin-bottom:10px;">🏋️</div>
          <div style="font-size:15px;font-weight:700;color:var(--text);">还没有训练计划</div>
          <div style="font-size:13px;margin-top:6px;">创建一个计划，或直接用系统内置训练库开始</div>
          <button class="eg-btn" data-act="newPlan">+ 新建计划</button>
        </div>`;
      html = html.replace(/<div class="new-plan-card"[\s\S]*?<\/div>/, guide);
    }
    return html;
  };
})();

/* O5：统计空状态引导 */
(function(){
  const base = renderStats;
  renderStats = function(){
    const html = base();
    const hasWorkouts = state.workouts && state.workouts.length;
    if(!hasWorkouts && currentTab === 'stats' && statsSub === 'history'){
      const emptyHtml = `
        <div class="stat-empty">
          <div style="font-size:40px;margin-bottom:10px;">📊</div>
          还没有训练记录<br>完成第一次训练后，这里会展示你的<br>历史记录、热力图与训练统计
        </div>`;
      return html + emptyHtml;
    }
    return html;
  };
})();

/* O6：触觉反馈——完成一组 / 删除组时轻微震动 */
(function(){
  document.addEventListener('click', e=>{
    const act = e.target.closest('[data-act]');
    if(!act) return;
    const a = act.dataset.act;
    if(a === 'doneSet' || a === 'setDelConfirm' || a === 'exDelete'){
      try{ if(navigator.vibrate) navigator.vibrate(15); }catch(err){}
    }
  }, true);
})();

/* O7：长按拖动时 toast 提示 */
(function(){
  const base = startDrag;
  startDrag = function(card, x, y){
    base(card, x, y);
    toast('拖动调整顺序');
  };
})();

/* O8：休息倒计时显示下一动作名 */
(function(){
  const base = startRest;
  startRest = function(exIdx){
    base(exIdx);
    const el = $('#rest-ex');
    if(el && session){
      // 找下一个未完成的动作
      let next = null;
      for(let k=(exIdx||0); k<session.items.length; k++){
        const it = session.items[k];
        if(it.sets.some(s=>!s.done)){ next = it; break; }
      }
      if(!next) next = session.items[session.items.length-1];
      if(next) el.textContent = '下一组：' + next.name;
    }
  };
})();

/* O10：训练中 tabbar 训练tab红点 */
(function(){
  const base = setTab;
  setTab = function(tab){
    const ret = base(tab);
    const dot = $('#tab-dot');
    const t = document.querySelector('.tab[data-tab="train"]');
    if(state && state.currentWorkout){
      if(t && !dot){
        t.style.position = 'relative';
        const d = document.createElement('span');
        d.id = 'tab-dot';
        d.style.cssText = 'position:absolute;top:4px;right:16px;width:8px;height:8px;border-radius:50%;background:#ef4444;';
        t.appendChild(d);
      }
    } else if(dot){ dot.remove(); }
    return ret;
  };
})();

/* ============================================================
   v7.0 全面修复（2026-08-11）—— 测试工程师+开发联合优化
   修复 BUG B01-B18 + 落地硬性标准 6 项 + 修仙去重
   改动位置全部追加，不删原代码（函数同名覆盖）
   ============================================================ */

/* ---------- 硬性标准 ①：防抖 + busy 锁工具 ---------- */
function debounce(fn, ms){
  let t = null;
  return function(){
    if(t) return;
    t = setTimeout(()=>{ t = null; }, ms);
    try{ fn.apply(this, arguments); }catch(err){ console.error(err); }
  };
}
function lockBtn(el, ms){
  if(!el) return;
  el.classList.add('btn-locked');
  el.style.pointerEvents = 'none';
  setTimeout(()=>{
    el.classList.remove('btn-locked');
    el.style.pointerEvents = '';
  }, ms || 300);
}

/* ---------- 硬性标准 ②：Toast 队列顺序展示（覆盖 app.js toast） ---------- */
const _toastQueue = [];
let _toastShowing = false;
function toast(msg, ms){
  _toastQueue.push({msg: msg, ms: ms || 2200});
  if(!_toastShowing) _toastNext();
}
function _toastNext(){
  if(_toastQueue.length === 0){ _toastShowing = false; return; }
  _toastShowing = true;
  const {msg, ms} = _toastQueue.shift();
  const t = $('#toast');
  if(!t){ _toastShowing = false; return; }
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window.toast_t);
  window.toast_t = setTimeout(()=>{
    t.classList.add('hidden');
    setTimeout(_toastNext, 200);
  }, ms);
}

/* ---------- 硬性标准 ⑤：数值安全工具 ---------- */
function safeNum(v, def){
  def = def === undefined ? 0 : def;
  const n = +v;
  if(!Number.isFinite(n)) return def;
  return Math.max(0, n);
}
function safeInt(v, def){
  def = def === undefined ? 0 : def;
  const n = parseInt(v, 10);
  if(!Number.isFinite(n)) return def;
  return Math.max(0, n);
}

/* ---------- 修复 BUG-T01：addSet 350ms 内不重复 ---------- */
const _addSetBusy = new Map();
function addSetBusy(i){
  const key = 'addSet:' + i;
  if(_addSetBusy.get(key)) return;
  _addSetBusy.set(key, 1);
  setTimeout(()=>_addSetBusy.delete(key), 350);
  if(!session || !session.items[i]) return;
  const prev = session.items[i].sets[session.items[i].sets.length-1];
  session.items[i].sets.push({
    weight: prev?safeNum(prev.weight):'',
    reps: prev?safeInt(prev.reps):'',
    rpe:'', done:false, warmup: prev?!!prev.warmup:false
  });
  renderWorkoutList();
}

/* ---------- 修复 BUG-T02/B06：doneSet 修为去重 + 防抖 ---------- */
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act="doneSet"]');
  if(!act) return;
  const i = +act.dataset.ex, j = +act.dataset.set;
  setTimeout(()=>{
    if(!session || !session.items[i] || !session.items[i].sets[j]) return;
    const s = session.items[i].sets[j];
    if(s._prLocked === s.done) return;
    s._prLocked = s.done;
    if(s.done) xianGainFromSet(session.items[i], s);
  }, 50);
}, true);
/* v8.12 删：超级组同步完成逻辑 */
const _doneSetBusy = new Map();
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act="doneSet"]');
  if(!act) return;
  const i = +act.dataset.ex, j = +act.dataset.set;
  const key = 'doneSet:' + i + ':' + j;
  if(_doneSetBusy.get(key)){ e.stopPropagation(); e.preventDefault(); return; }
  _doneSetBusy.set(key, 1);
  setTimeout(()=>_doneSetBusy.delete(key), 350);
}, true);

/* ---------- 修复 BUG-T09：fillLast / applySugg / setCopyDown / exDelete 防抖 ---------- */
const _actionBusy = new Map();
document.addEventListener('click', e=>{
  const act = e.target.closest('[data-act]');
  if(!act) return;
  const a = act.dataset.act;
  const BUSY_ACTIONS = ['fillLast','applySugg','setCopyDown','setDelConfirm','exDelete','exMove','exReplaceDo','setWarmup','addExercise','newPlan','newFolder','savePlan','delPlan','saveCreateEx','finishWorkout','xianPlay','weekReport','monthReport','downloadReport','resumeWorkout','discardWorkout','closeSheet','closeWorkout','closeCreateEx','closeFolder','closePicker','closeStatic','fillLast','applySugg','openReplaceEx','openReplaceSheet'];
  if(BUSY_ACTIONS.indexOf(a) === -1) return;
  const key = a + ':' + (act.dataset.id || act.dataset.ex || act.dataset.set || '');
  if(_actionBusy.get(key)){ e.stopPropagation(); e.preventDefault(); return; }
  _actionBusy.set(key, 1);
  setTimeout(()=>_actionBusy.delete(key), 400);
}, true);

/* ---------- 修复 BUG-T03/B12：finishWorkout 反馈分阶段 ---------- */
const _baseFinishWorkout = finishWorkout;
finishWorkout = function(){
  const ret = _baseFinishWorkout();
  setTimeout(()=>{
    try{ if(navigator.vibrate) navigator.vibrate([40,30,60]); }catch(e){}
    const last = state.workouts[state.workouts.length-1];
    if(last && !last._toasted){
      last._toasted = true;
      const sets = last.items.reduce((n,it)=>n+it.sets.length,0);
      const min = Math.round((last.duration||0)/60);
      toast('✅ 完成！'+min+'min · '+sets+'组 · 容量 '+Math.round(last.volume||0)+'kg');
    }
  }, 100);
  setTimeout(confettiBurst, 900);
  return ret;
};

/* ---------- 修复 BUG-B05：Tab 切换加 fade 过渡 ---------- */
const _baseSetTab = setTab;
setTab = function(tab){
  const view = $('#view');
  if(view){
    view.style.transition = 'opacity .12s ease';
    view.style.opacity = '0';
    setTimeout(()=>{
      const ret = _baseSetTab(tab);
      view.style.opacity = '1';
      return ret;
    }, 120);
    return;
  }
  return _baseSetTab(tab);
};

/* ---------- 修复 BUG-T08：rest-range 拖动实时同步倒计时 ---------- */
document.addEventListener('input', e=>{
  if(e.target && e.target.id === 'rest-range'){
    restSec = safeNum(e.target.value, 60);
    $('#rest-time').textContent = fmtTime(restSec);
    if(typeof updateRest === 'function') updateRest();
  }
}, true);

/* ---------- 修真者动画优化（减少魂魄粒子流动画距离） ---------- */
const xianStageStyle = document.createElement('style');
xianStageStyle.textContent = `
@keyframes xian-soul{0%{transform:translateY(0);opacity:.4}100%{transform:translateY(-90px);opacity:0}}
`;
try{ document.head && document.head.appendChild(xianStageStyle); }catch(e){}

/* ============================================================
   v8：健体修仙录 SPA 集成（嵌入修仙 tab + 自动结算 + 全局修仙主题）
   ============================================================ */

/* ---------- 修仙 tab 渲染健体修仙录（替换旧 renderCultivation） ---------- */
(function(){
  const baseRender = render;
  render = function(){
    if(currentTab === 'cultivation'){
      const view = $('#view');
      if(window.XianCore){
        view.innerHTML = '<div class="xc-root"></div>';
        const host = view.querySelector('.xc-root');
        XianCore.init();
        XianCore.renderTo(host);
        /* 首次进入自动结算历史遗留（静默） */
        XianCore.autoSettle(true);
      } else {
        view.innerHTML = '<div class="empty" style="padding:60px 20px;text-align:center;color:var(--muted);">修仙模块加载中…</div>';
      }
      return;
    }
    return baseRender();
  };
})();

/* ---------- 训练完成自动结算修为 ---------- */
(function(){
  const base = finishWorkout;
  finishWorkout = function(){
    const ret = base();
    /* base 已把训练存进 state.workouts；延迟触发自动结算（让完成动画先播） */
    setTimeout(function(){
      if(window.XianCore){
        XianCore.init();
        const r = XianCore.autoSettle(false);
        if(r && r.settled > 0 && r.broken){
          /* 突破提示已由 core 内处理 */
        }
      }
    }, 900);
    return ret;
  };
})();

/* ---------- 全局修仙暗色主题（与健体修仙录统一风格） ---------- */
(function(){
  const st = document.createElement('style');
  st.id = 'xian-theme';
  st.textContent = `
  /* 主题基调：暗色修仙 */
  :root{
    --bg:#0b1120; --card:#131c31; --card2:#1a2540;
    --text:#e2e8f0; --muted:#8fa3bf; --accent:#fbbf24; --accent-d:#f59e0b;
    --accent-light:#1a2540; --line:#26314d;
    --shadow:0 2px 12px rgba(0,0,0,.35);
  }
  body{background:#0b1120;}
  #app{background:#0b1120;}
  /* 顶栏修仙风 */
  #topbar{background:linear-gradient(180deg,#0b1120 60%,rgba(11,17,32,.9));}
  #topbar-title{color:#fbbf24;letter-spacing:1px;}
  /* 首页品牌 */
  .brand{color:#fbbf24;text-shadow:0 0 12px rgba(251,191,36,.35);}
  .date-str{color:#8fa3bf;}
  /* 卡片统一 */
  .folder-card,.lib-card,.plan-row,.ex-card,.libv2-row,.stat-card,
  .mini-active,.create-field,.create-sel,.create-type,.set-row{background:var(--card);}
  /* 按钮 */
  .plus-btn{background:linear-gradient(90deg,#f59e0b,#fbbf24);color:#0b1120;box-shadow:0 4px 14px rgba(251,191,36,.3);}
  .btn-custom{background:#1a2540;color:#fbbf24;border:1px solid #fbbf2433;}
  .new-plan-card{border-color:#fbbf2455;background:#1a2540;color:#fbbf24;}
  /* tabbar */
  #tabbar{background:#0d1526;border-top-color:#26314d;}
  .tab.active .lb{color:#fbbf24;}
  /* 训练页 */
  .workout-view{background:#0b1120;}
  .finish-pill{background:linear-gradient(90deg,#f59e0b,#ef4444);color:#fff;}
  .add-set-btn{background:linear-gradient(90deg,#2563eb,#7c3aed);}
  .add-set-btn:hover{opacity:.9;}
  /* sheet */
  #overlay{background:rgba(5,8,18,.72);}
  .sheet{background:var(--card);}
  .sheet h3{color:#fbbf24;}
  /* 输入框 */
  input,select,textarea{background:var(--card2);border-color:var(--line);color:var(--text);}
  /* 统计/我的 */
  .stat-header .tab-text.active{color:#fbbf24;border-bottom-color:#fbbf24;}
  .month-title{color:#fbbf24;}
  /* 通用文本 */
  h2{color:var(--text);}
  .empty{color:#8fa3bf;}
  `;
  document.head.appendChild(st);
})();

/* ============================================================
   v8.1 权威修复（2026-08-11）：setTab/render 最终覆盖
   ① 移除 v7.0 fade 延迟（白屏/卡顿/错乱根因）
   ② 修仙页底部保留 tabbar，可自由切换
   ③ 全局修仙主题完整覆盖（所有页面统一深色）
   ============================================================ */

/* ---------- setTab 权威版（同步渲染，无延迟，无 opacity 归零） ---------- */
/* 直接重定义 setTab：同步渲染 + 保留 tabbar */
setTab = function(tab){
  /* "我的" tab 已删除（v8.5 融合到仙途底部），点 me 自动跳仙途 */
  if(tab === 'me') tab = 'cultivation';
  currentTab = tab;
  $$('#tabbar .tab').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === tab); });
  /* topbar：训练/动作库/修仙页隐藏（修仙页用页内布局） */
  $('#topbar').classList.toggle('hidden', tab === 'train' || tab === 'library' || tab === 'cultivation');
  if(tab !== 'train' && tab !== 'library' && tab !== 'cultivation'){
    var titles = {stats:'统计'};
    $('#topbar-title').textContent = titles[tab] || 'FitRecord';
  }
  /* tabbar 始终可见（训练进行中会由训练视图自己隐藏） */
  $('#tabbar').classList.remove('hidden');
  render();
  /* 兼容 busuanzi 访问统计（原包装被覆盖后手动补） */
  if(tab === 'cultivation'){
    setTimeout(function(){
      try{
        if(typeof refreshBusuanzi === 'function') refreshBusuanzi();
        else if(window.__refreshBusuanzi) window.__refreshBusuanzi();
      }catch(e){}
    }, 120);
  }
};

/* ---------- render 权威版（v8.3 加强：cultivation → 健体修仙录，其余 → 增强版原渲染，try/catch 兜底防统计页面丢失） ---------- */
render = function(){
  /* 确保 tabbar 永远可见（训练视图自己隐藏） */
  try{ $('#tabbar').classList.remove('hidden'); }catch(e){}
  if(currentTab === 'cultivation'){
    var view = $('#view');
    if(window.XianCore){
      view.innerHTML = '';
      var host = document.createElement('div');
      host.className = 'xc-root';
      view.appendChild(host);
      XianCore.init();
      XianCore.renderTo(host);
      /* 首次进入自动结算历史遗留（静默） */
      if(!XianCore._settledOnce){ XianCore.autoSettle(true); XianCore._settledOnce = true; }
    } else {
      view.innerHTML = '<div class="empty" style="padding:60px 20px;text-align:center;color:#8fa3bf;">修仙模块加载中…<br><br><button class="btn block primary" onclick="location.reload()" style="padding:10px 24px;">刷新加载</button></div>';
    }
    return;
  }
  /* 其它 tab：用 try/catch 兜底防 v7.0 包装版 renderStats/renderHome 抛错导致白屏 */
  try{
    if(currentTab === 'train'){ $('#view').innerHTML = renderHome(); }
    else if(currentTab === 'library'){ $('#view').innerHTML = renderLibrary(); }
    else if(currentTab === 'stats'){ $('#view').innerHTML = renderStats(); }
    /* "我的" tab 已删除（v8.5 融合到仙途底部）：me 兜底走仙途 */
    else if(currentTab === 'me'){ setTab('cultivation'); return; }
    else if(currentTab === 'cultivation'){ /* 仙途渲染在函数顶部已处理 */ }
    else { $('#view').innerHTML = renderHome(); }
  }catch(e){
    /* 兜底：直接用 app.js 原版函数重新渲染（绕过任何 enhance 包装） */
    console.error('[render 兜底] 增强版渲染失败：', e);
    try{
      if(currentTab === 'train'){ eval('renderHome()'); }
      else if(currentTab === 'stats'){ eval('renderStats()'); }
    }catch(e2){
      $('#view').innerHTML = '<div class="empty" style="padding:60px 20px;text-align:center;color:#ef4444;">页面渲染失败<br><br><button class="btn block primary" onclick="location.reload()" style="padding:10px 24px;">刷新重试</button></div>';
    }
  }
};

/* ---------- 全局修仙主题增强版（完整覆盖所有硬编码色） ---------- */
(function(){
  if(document.getElementById('xian-theme-v8')) return;
  var st = document.createElement('style');
  st.id = 'xian-theme-v8';
  st.textContent = `
  :root, html[data-theme="dark"]{
    --bg:#0b1120; --card:#131c31; --card2:#1a2540;
    --text:#e2e8f0; --muted:#8fa3bf; --accent:#fbbf24; --accent-d:#f59e0b;
    --accent-light:#1a2540; --line:#26314d; --orange:#f59e0b; --pink:#ec4899;
    --warn:#f59e0b; --warn-light:#3b2f0e; --ok:#22c55e;
    --shadow:0 2px 12px rgba(0,0,0,.35);
  }
  html{background:#0b1120;}
  body{background:#0b1120 !important;color:#e2e8f0 !important;}
  #app{background:#0b1120 !important;}
  /* 顶栏 */
  #topbar{background:#0d1526 !important;}
  #topbar-title{color:#fbbf24 !important;}
  /* 首页品牌 */
  .brand{color:#fbbf24 !important;text-shadow:0 0 14px rgba(251,191,36,.35);}
  .date-str{color:#8fa3bf !important;}
  /* 卡片 */
  .folder-card,.lib-card,.plan-row,.ex-card,.workout-list .ex-card,
  .libv2-row,.stat-item,.stat-card,.mini-active,.create-field,.create-sel,
  .create-type,.set-row,.libv2-side,.sheet,.theme-row,.day-w-item,.day-add-row{background:#131c31 !important;border-color:#26314d !important;}
  .folder-grid,.folder-cell{background:#1a2540;}
  /* 按钮 */
  .plus-btn{background:linear-gradient(90deg,#f59e0b,#fbbf24) !important;color:#0b1120 !important;}
  .btn-custom{background:#1a2540 !important;color:#fbbf24 !important;border:1px solid #fbbf2433 !important;}
  .new-plan-card{border-color:#fbbf2455 !important;background:#1a2540 !important;color:#fbbf24 !important;}
  /* tabbar */
  #tabbar{background:#0d1526 !important;border-top-color:#26314d !important;}
  .tab.active .lb{color:#fbbf24 !important;}
  .tab.active .ic{color:#fbbf24 !important;}
  /* 文本 */
  h1,h2,h3,h4{color:#e2e8f0 !important;}
  .folder-name,.plan-row-name,.plan-name,.ex-name,.libv2-name{color:#e2e8f0 !important;}
  .folder-count{color:#fbbf24 !important;background:#1a2540 !important;}
  .notify-badge{background:#131c31 !important;border-color:#26314d !important;color:#8fa3bf !important;}
  /* 训练页 */
  .workout-view{background:#0b1120 !important;}
  .finish-pill{background:linear-gradient(90deg,#f59e0b,#ef4444) !important;color:#fff !important;}
  .add-set-btn{background:linear-gradient(90deg,#2563eb,#7c3aed) !important;}
  .set-val{background:#1a2540 !important;color:#93c5fd !important;}
  .set-val.empty{background:#1a2540 !important;color:#64748b !important;}
  .set-done-btn{background:#131c31 !important;border-color:#26314d !important;color:#8fa3bf !important;}
  .set-done-btn.completed{background:#fbbf24 !important;border-color:#fbbf24 !important;color:#0b1120 !important;}
  .rpe-btn{background:#131c31 !important;border-color:#26314d !important;color:#8fa3bf !important;}
  /* 动作库 */
  .libv2-search{background:#1a2540 !important;}
  .libv2-search input{color:#e2e8f0 !important;}
  .libv2-chip{background:#1a2540 !important;color:#b6c6dc !important;}
  .libv2-chip.active{background:#fbbf24 !important;color:#0b1120 !important;}
  .libv2-cat.active{background:#131c31 !important;color:#fbbf24 !important;}
  /* 统计 */
  .stat-header .tab-text.active{color:#fbbf24 !important;border-bottom-color:#fbbf24 !important;}
  .month-title{color:#fbbf24 !important;}
  .cal-day{background:#131c31 !important;color:#e2e8f0 !important;}
  .cal-day.today{background:#fbbf2422 !important;border-color:#fbbf24 !important;}
  /* sheet / 弹窗 */
  #overlay{background:rgba(5,8,18,.75) !important;}
  .sheet{background:#131c31 !important;}
  .sheet h3{color:#fbbf24 !important;}
  .ex-menu-item{background:#1a2540 !important;border-color:#26314d !important;}
  .ex-menu-item .n{color:#e2e8f0 !important;}
  .ex-menu-item .s{color:#8fa3bf !important;}
  .sort-row{border-color:#26314d !important;}
  .sort-row .sr-btn{background:#131c31 !important;border-color:#26314d !important;color:#fbbf24 !important;}
  .sel-item{border-color:#26314d !important;color:#e2e8f0 !important;}
  .rest-chip{background:#131c31 !important;border-color:#26314d !important;color:#e2e8f0 !important;}
  .rest-chip.active{background:#fbbf24 !important;color:#0b1120 !important;border-color:#fbbf24 !important;}
  /* 输入 */
  input,select,textarea{background:#1a2540 !important;border-color:#26314d !important;color:#e2e8f0 !important;}
  input::placeholder{color:#64748b !important;}
  .field label{color:#8fa3bf !important;}
  /* 我的页 */
  .profile-card,.menu-item,.plan-row{background:#131c31 !important;}
  /* 空状态 */
  .empty{color:#8fa3bf !important;}
  /* 分页/按钮通用 */
  .btn{background:#1a2540 !important;color:#e2e8f0 !important;border:1px solid #26314d !important;}
  .btn.primary{background:linear-gradient(90deg,#2563eb,#7c3aed) !important;color:#fff !important;border:0 !important;}
  /* 滚轮 */
  .wheel-wrap{background:#1a2540 !important;}
  .wheel-opt{color:#64748b !important;}
  .wheel-opt.cur{color:#fbbf24 !important;font-weight:800;}
  .wheel-band{background:#26314d !important;}
  `;
  document.head.appendChild(st);
})();

/* 兜底：任何可能被前面包装污染的 setTab 调用，都强制回到权威版 */
(function(){
  try{
    /* busuanzi 包装的 setTab 会再包一层，这里确保最终 setTab 是权威版 */
    var _origSetTab = setTab;
    /* 已经重定义过了，无需再包 */
  }catch(e){}
})();

/* ============================================================
   v8.3 末尾：URL hash → setTab + 启动跳转 + 统计兜底
   ============================================================ */
(function(){
  /* hash 路由：xian.html#cultivation 直接跳到修仙 tab */
  function applyHash(){
    try{
      var h = (location.hash || '').replace('#','').toLowerCase();
      var map = {train:'train', library:'library', stats:'stats', me:'cultivation', cultivation:'cultivation', xian:'cultivation', xiantu:'cultivation', fitrecord:'train'};
      var tab = map[h] || (h||null);
      if(tab && typeof setTab === 'function' && tab !== currentTab){
        setTab(tab);
        return true;
      }
    }catch(e){}
    return false;
  }
  /* 页面加载后立即按 hash 跳转 */
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(applyHash, 30);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(applyHash, 30); });
  }
  /* hash 变化时同步 */
  window.addEventListener('hashchange', applyHash);
  /* 5 tab 链接点击：更新 hash + 阻止默认跳转（除非目标 hash 不对应 SPA tab） */
  document.addEventListener('click', function(e){
    var a = e.target.closest('a.tab-link');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.indexOf('xian.html') !== -1 && href.indexOf('#') === -1){
      /* xian.html 链接不需要拦截（独立入口已删，链接应该改为 index.html） */
      e.preventDefault();
      location.href = 'index.html#cultivation';
    }
  }, true);
  /* 底部 tab 点击 → 更新 hash，便于分享/刷新 */
  document.addEventListener('click', function(e){
    var tab = e.target.closest('#tabbar .tab');
    if(!tab) return;
    var t = tab.dataset.tab;
    if(t){ try{ history.replaceState(null, '', '#'+t); }catch(err){} }
  });
})();

/* ============================================================
   v8.9 全局错误探针（仅 console 记录，不渲染到页面——避免用户看到的"乱码"）
   ============================================================ */
(function(){
  window.addEventListener('error', function(ev){
    try{
      var f = (ev.filename||'').split('/').pop();
      console.error('[FitRecord Error]', ev.message||'JS Error', f+':'+ev.lineno+':'+ev.colno);
    }catch(_){}
  });
  window.addEventListener('unhandledrejection', function(ev){
    try{
      var r = ev.reason;
      console.error('[FitRecord Promise]', r && r.message || r || 'unknown');
    }catch(_){}
  });
})();

/* ============================================================
   v8.4 最终防 BUG（2026-08-11）—— 修复统计页面加载失败
   根因：v6.1 第二个 renderStats 包装（2299 行）在 enhance.js 的
        IIFE 内访问 app.js let statsSub，跨 IIFE 不可见 →
        ReferenceError → stats tab 抛错全白屏
   修复：v8.4 追加权威 renderStats/renderHome 覆盖，
        不调用任何跨 IIFE 变量，直接读 state 渲染
   ============================================================ */

/* 1. renderStats 权威版（兜底所有失败链路，无任何跨 IIFE 依赖） */
try{
  var _v84_baseStats = renderStats;
  renderStats = function(){
    /* 检查上层包装是否安全 */
    var body = String(_v84_baseStats);
    var usesCrossIIFE = body.indexOf('statsSub') !== -1;
    if(!usesCrossIIFE){
      try{
        var out = _v84_baseStats();
        if(out && out.indexOf && out.indexOf('cal-day') !== -1) return out;
      }catch(e){
        console.warn('[v8.4] 上层 renderStats 调用失败，降级到内联版', e);
      }
    }
    /* === 内联版：纯本地变量，零跨 IIFE 依赖 === */
    var html = '';
    try{
      var safe = (typeof state !== 'undefined' && state) ? state : {workouts:[],plans:[],folders:[],customEx:[],profile:{height:170},bodyLog:[]};
      if(!safe.workouts) safe.workouts = [];
      var now = new Date();
      var y = now.getFullYear(), m = now.getMonth();
      try{ if(typeof statsMonth !== 'undefined' && statsMonth){ y = statsMonth.getFullYear(); m = statsMonth.getMonth(); } }catch(_e){}
      var monthKey = y+'-'+String(m+1).padStart(2,'0');
      var monthWorkouts = safe.workouts.filter(function(w){ return w && typeof w.date === 'string' && w.date.indexOf(monthKey) === 0; });
      var firstDay = new Date(y,m,1).getDay();
      var daysInMonth = new Date(y,m+1,0).getDate();
      var today = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
      var byDate = {};
      monthWorkouts.forEach(function(w){ if(w.date) (byDate[w.date] = byDate[w.date]||[]).push(w); });
      var cells = '';
      for(var i=0;i<firstDay;i++) cells += '<div></div>';
      for(var d=1; d<=daysInMonth; d++){
        var ds = monthKey+'-'+String(d).padStart(2,'0');
        var list = byDate[ds]||[];
        var cls = (list.length?'has-workout ':'') + (ds===today?'today':'');
        var tip = list.length ? list.length+' 次训练' : '';
        /* v8.10: 点击日历日期 → 弹 sheet（查看记录 + 添加历史/有氧），参考截图8 */
        cells += '<div class="cal-day '+cls+'" data-act="viewDay" data-date="'+ds+'" '+(tip?'title="'+tip+'"':'')+'>'+d+'</div>';
      }
      var totalWorkouts = safe.workouts.length;
      var totalSec = safe.workouts.reduce(function(a,w){ return a+(+w.duration||0); }, 0);
      var vol = safe.workouts.reduce(function(a,w){ return a+(+w.volume||0); }, 0);
      var days = Object.keys(byDate).length;
      html =
        '<div class="page-title">统计</div>'+
        '<div style="display:flex;gap:6px;margin:8px 0 12px;padding:10px;background:rgba(124,240,169,.06);border-radius:10px;">'+
          '<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;color:#7cf0a9;">'+totalWorkouts+'</div><div style="font-size:11px;color:#8fa3bf;">总训练</div></div>'+
          '<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;color:#7cf0a9;">'+days+'</div><div style="font-size:11px;color:#8fa3bf;">本月天数</div></div>'+
          '<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;color:#7cf0a9;">'+Math.round(totalSec/60)+'</div><div style="font-size:11px;color:#8fa3bf;">总分钟</div></div>'+
          '<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;color:#7cf0a9;">'+Math.round(vol)+'</div><div style="font-size:11px;color:#8fa3bf;">总容量 kg</div></div>'+
        '</div>'+
        '<div style="display:flex;gap:10px;margin:2px 0 12px;">'+
          '<button class="week-report-btn" style="flex:1;background:linear-gradient(90deg,#f59e0b,#f97316);color:#fff;border:0;padding:12px;border-radius:12px;font-weight:700;" data-act="weekReport">📊 本周周报</button>'+
          '<button class="week-report-btn" style="flex:1;background:linear-gradient(90deg,#8b5cf6,#6366f1);color:#fff;border:0;padding:12px;border-radius:12px;font-weight:700;" data-act="monthReport">📈 本月月报</button>'+
        '</div>'+
        '<div class="month-row" style="margin-bottom:10px;font-weight:700;font-size:15px;color:#e5e7eb;">'+(m+1)+'月</div>'+
        '<div class="calendar" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">'+cells+'</div>'+
        (totalWorkouts===0
          ? '<div class="stat-empty" style="padding:40px 20px;text-align:center;color:#8fa3bf;font-size:14px;line-height:1.8;">'+
            '<div style="font-size:40px;margin-bottom:10px;">📊</div>'+
            '还没有训练记录<br>完成第一次训练后，这里会展示你的<br>历史记录、热力图与训练统计'+
            '</div>'
          : '');
    }catch(innerErr){
      console.error('[v8.4] renderStats 内联失败：', innerErr);
      html = '<div class="page-title">统计</div><div style="padding:60px 20px;text-align:center;color:#fbbf24;">'+
        '统计加载遇到小问题<br><br>'+
        '<button class="btn primary" onclick="location.reload()" style="padding:10px 24px;background:#7cf0a9;color:#0b1120;border:0;border-radius:10px;font-weight:700;">🔄 刷新重试</button>'+
        '</div>';
    }
    return html;
  };
}catch(e){ console.warn('[v8.4] renderStats 兜底包装安装失败', e); }

/* 2. v8.7 删 v8.4 的 forEach 包装（renderHome/renderLibrary/renderMe） */
/* 原因：iOS Safari 对 eval(name+' = wrapped') 严格模式抛错，导致 enhance.js 加载失败白屏 */
/* v8.1 的 render 已经有 try/catch 兜底（先 eval 原版函数调用），不需要重复包装 */
