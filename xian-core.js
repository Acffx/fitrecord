/* ============================================================
   FitRecord · 健体修仙录 核心模块（独立页 xian.html 与 SPA 共用）
   严格遵循《健体修仙小游戏·全套完整系统》文档，数值/文案/公式一字不改
   © 2026 Acffx · 原创 · 保留所有权利
   对外暴露 window.XianCore：init / renderTo / syncAll / autoSettle / getRoot
   ============================================================ */
(function(global){
'use strict';

/* ============================================================
   config：全部常量（数值、文案、色值、门槛——不可修改）
   ============================================================ */
var CONFIG = {
  BASE_HEIGHT: 184,
  DAOS: {
    tian:   { name:'天罡推道',  color:'#7cf0a9', check:'push',   unlock:'天罡推道：掌印之道开启，侧重打磨上肢推力，适合偏爱胸肩训练的你。' },
    xuan:   { name:'玄元拉道',  color:'#63b8ff', check:'pull',   unlock:'玄元拉道：擒龙之道开启，侧重打磨背部拉力，打造宽厚身形。' },
    houtu:  { name:'后土腿道',  color:'#e6b450', check:'leg',    unlock:'后土腿道：镇岳之道开启，侧重下肢根基，下肢力量稳步增长。' },
    hunyuan:{ name:'混元均衡道',color:'#ffd700', check:'all',    unlock:'混元均衡道：混元道开启，三系同修额外提升修炼收益，均衡发展更强！' }
  },
  ROOTS: [
    {name:'凡灵根',  max:17.5, mult:1.00, fx:'周身灰白微光',       up:'微弱白光闪烁；资质普通也没关系，坚持训练灵根会稳步提升'},
    {name:'下品灵根',max:19.0, mult:1.08, fx:'淡青色全身光晕',     up:'青芒粒子环绕；灵根初步觉醒，日常训练收益小幅提升'},
    {name:'中品灵根',max:20.5, mult:1.18, fx:'翠绿色经脉流光',     up:'绿光喷涌；肉身经脉充盈，训练效率明显提高'},
    {name:'上品灵根',max:22.0, mult:1.30, fx:'蓝色旋转灵气环',     up:'蓝光结界炸开；天生优质肉身底子，增肌塑形事半功倍'},
    {name:'极品灵根',max:23.5, mult:1.45, fx:'金蓝交织霞光',       up:'金蓝花瓣粒子盘旋；万中无一的肉身天赋，稍加训练即可快速蜕变'},
    {name:'先天道体',max:99,   mult:1.60, fx:'永久紫金护体粒子',   up:'全屏紫金霞光+天地道纹；肉身抵达凡人巅峰，修炼效率拉满！'}
  ],
  ROOT_COLOR: { '凡灵根':'#9ca3af','下品灵根':'#5eead4','中品灵根':'#4ade80','上品灵根':'#60a5fa','极品灵根':'#fbbf24','先天道体':'#a78bfa' },
  DEBUFF_WEAK:  {ffmi:15, mult:0.85, msg:'目前肌肉储备较少，循序渐进抗阻训练即可慢慢固本，无需急于增重'},
  DEBUFF_FAT:   {bodyFat:28, msg:'体脂偏高暂时小幅削弱灵根收益，优先增肌，减脂缓慢进行即可，不用焦虑'},
  REALMS: [
    {name:'凡俗境', str:{push:36,pull:52,leg:46}, body:{weight:47,chest:61,arm:19,waist:86,thigh:35}, anim:'白光淡闪', sub:'炼气启脉，肉身初修', foot:'踏出训练第一步，未来可期'},
    {name:'炼气境', str:{push:52,pull:81,leg:72}, body:{weight:51,chest:66,arm:22,waist:83,thigh:39}, anim:'淡青经脉流光', sub:'筑基凝肉，筋骨初成', foot:'规律训练初见成效'},
    {name:'筑基境', str:{push:68,pull:111,leg:98}, body:{weight:55,chest:72,arm:24,waist:80,thigh:43}, anim:'地面青色灵阵', sub:'金丹铸躯，肉身蕴力', foot:'坚持训练一年左右即可达成'},
    {name:'金丹境', str:{push:85,pull:140,leg:124}, body:{weight:59,chest:75,arm:27,waist:77,thigh:46}, anim:'胸腹金色丹光', sub:'元婴塑体，形体天成', foot:'系统训练的完美回报'},
    {name:'元婴境', str:{push:98,pull:163,leg:146}, body:{weight:62,chest:79,arm:29,waist:74,thigh:49}, anim:'蓝色护体结界', sub:'化神炼骨，脱凡入圣', foot:'长期自律训练的馈赠'},
    {name:'化神境', str:{push:111,pull:185,leg:169}, body:{weight:65,chest:82,arm:31,waist:72,thigh:51}, anim:'全身金光贯顶', sub:'炼虚融身，力纳天地', foot:'资深爱好者专属里程碑'},
    {name:'炼虚境', str:{push:124,pull:208,leg:192}, body:{weight:68,chest:85,arm:32,waist:70,thigh:54}, anim:'深蓝漫天粒子', sub:'合体归一，肉身无敌', foot:'力量与形体均衡大成'},
    {name:'合体境', str:{push:137,pull:231,leg:215}, body:{weight:72,chest:87,arm:34,waist:68,thigh:57}, anim:'金蓝全屏柔光', sub:'大乘极境，赛场称尊！', foot:'业余健身顶尖水准'},
    {name:'大乘境', str:{push:150,pull:254,leg:237}, body:{weight:75,chest:90,arm:35,waist:66,thigh:59}, anim:'金色道纹全覆盖', sub:'大乘极境，挑战自我极限！', foot:''},
    {name:'渡劫境', str:{push:166,pull:280,leg:260}, body:{weight:78,chest:92,arm:37,waist:64,thigh:62}, anim:'紫金雷电全屏震动', sub:'⚡渡劫封神，肉身超脱凡俗！', foot:'长期坚持的终极远景'}
  ],
  SKILL_LV: [
    {lv:1, name:'初窥门径', bonus:0.00, need:0,     anim:'图标微光点亮', msg:'《{skillName}》初窥门径，正式开启这条修炼之路，慢慢来就好。'},
    {lv:2, name:'略有小成', bonus:0.01, need:1000,  anim:'图标淡光粒子', msg:'《{skillName}》略有小成，发力技巧慢慢熟练，换算效率小幅提升。'},
    {lv:3, name:'登堂入室', bonus:0.02, need:2500,  anim:'道途色系环绕光', msg:'《{skillName}》登堂入室，肌肉记忆逐步成型，驾驭力量更轻松。'},
    {lv:4, name:'融会贯通', bonus:0.03, need:4500,  anim:'光圈旋转扩散', msg:'《{skillName}》融会贯通，常规训练已经很难限制你的进步空间。'},
    {lv:5, name:'炉火纯青', bonus:0.04, need:7000,  anim:'图标镀金结界', msg:'《{skillName}》炉火纯青，动作标准稳定，长期坚持收益更高。'},
    {lv:6, name:'技近乎道', bonus:0.05, need:10000, anim:'全屏微光纹路', msg:'《{skillName}》技近乎道，熟练掌握发力精髓，突破会越来越轻松。'},
    {lv:7, name:'肉身印记', bonus:0.06, need:14000, anim:'肌群动态流光', msg:'《{skillName}》肉身印记，力量传导更加顺畅，同等负重收获更多修为。'},
    {lv:8, name:'道印凝形', bonus:0.07, need:19000, anim:'悬浮旋转道印', msg:'《{skillName}》道印凝形，距离功法圆满只差最后一段积累。'},
    {lv:9, name:'圆满通玄', bonus:0.08, need:25000, anim:'霞光永久锁定', msg:'✨《{skillName}》【圆满通玄】！这门功法你已修炼至极致，可多尝试其他动作拓宽路子。'}
  ],
  SKILLS: [
    {id:'t_juli',  dao:'tian', name:'巨力印',   app:'杠铃平板卧推', coeff:1.00, icon:'🖐️', desc:'推道基础至尊功法，淬炼胸肌本源巨力，刚猛霸道', fx:'胸口白光巨印，发力冲击波扩散'},
    {id:'t_xuanyan',dao:'tian', name:'玄岩掌',  app:'哑铃平板卧推', coeff:0.80, icon:'✋', desc:'哑铃打磨胸肌细节，夯实肉身根基', fx:'淡岩色手掌粒子飘散'},
    {id:'t_lingyun',dao:'tian', name:'凌云推山',app:'杠铃上斜卧推', coeff:0.92, icon:'⛰️', desc:'专攻上胸，塑造挺拔胸型', fx:'金色向上流光升腾'},
    {id:'t_qingyun',dao:'tian', name:'青云掌',  app:'哑铃上斜卧推', coeff:0.76, icon:'☁️', desc:'轻柔雕琢上胸肌理', fx:'青云云朵环绕双臂'},
    {id:'t_qingtian',dao:'tian',name:'擎天法',  app:'站姿杠铃推举', coeff:0.85, icon:'🌄', desc:'撑开肩颈骨架气度', fx:'头顶天光，双肩光盾'},
    {id:'t_zhengyue',dao:'tian',name:'镇岳擎天',app:'阿诺德推举',   coeff:0.72, icon:'🏔️', desc:'完善上肢轮廓，塑形增肌', fx:'山岳虚影覆双臂'},
    {id:'t_xuanjiao',dao:'tian',name:'玄蛟腾跃',app:'双杠臂屈伸',   coeff:0.65, icon:'🐉', desc:'活化下胸三头经脉', fx:'蓝色蛟纹周身流转'},
    {id:'t_chansi', dao:'tian', name:'缠丝劲',  app:'绳索夹胸',     coeff:0.45, icon:'🕸️', desc:'雕琢胸肌中缝', fx:'银丝汇聚胸腔中心'},
    {id:'t_yunyi',  dao:'tian', name:'云翼展',  app:'哑铃飞鸟',     coeff:0.40, icon:'🪽', desc:'拓宽胸腔筋膜', fx:'双翼柔光开合'},
    {id:'t_leimang',dao:'tian', name:'雷蟒鞭',  app:'绳索三头下压', coeff:0.35, icon:'⚡', desc:'收紧上肢线条', fx:'细碎电光手臂流动'},
    {id:'t_fentian',dao:'tian', name:'焚天肘',  app:'哑铃颈后臂屈伸',coeff:0.33,icon:'🔥', desc:'深挖三头维度', fx:'橙火手肘环绕'},
    {id:'t_fumo',   dao:'tian', name:'伏魔推',  app:'坐姿器械推胸', coeff:0.70, icon:'🛡️', desc:'稳定基础胸力', fx:'固形光墙平稳推送'},
    {id:'l_qinlong',dao:'xuan', name:'擒龙诀',  app:'传统硬拉',     coeff:1.00, icon:'🐲', desc:'拉道根基，淬炼腰背巨力', fx:'地面金龙冲天光柱'},
    {id:'l_xuanmang',dao:'xuan',name:'玄蟒探渊',app:'罗马尼亚硬拉', coeff:0.78, icon:'🐍', desc:'拉伸臀腿后侧筋膜', fx:'黑紫蟒纹沿后背流动'},
    {id:'l_heishui',dao:'xuan', name:'黑水缚兽',app:'杠铃划船',     coeff:0.82, icon:'🌊', desc:'打造宽厚背肌', fx:'黑水波纹扩散后背'},
    {id:'l_gujiao', dao:'xuan', name:'孤蛟汲浪',app:'绳索单臂划船', coeff:0.74, icon:'🐉', desc:'修正背部左右不对称', fx:'单侧蓝光蛟影拉扯'},
    {id:'l_cangying',dao:'xuan',name:'苍鹰攀崖',app:'引体向上',     coeff:0.70, icon:'🦅', desc:'极致拓宽背阔', fx:'鹰翼白光向上炸开'},
    {id:'l_xinghe', dao:'xuan', name:'星河垂索',app:'高位下拉',     coeff:0.66, icon:'✨', desc:'拓宽背阔维度', fx:'星光从天落向背部'},
    {id:'l_canglan',dao:'xuan', name:'沧澜回涌',app:'坐姿划船',     coeff:0.63, icon:'🌊', desc:'紧致背部线条', fx:'蓝色浪潮往返冲刷'},
    {id:'l_jinjiao',dao:'xuan', name:'金蛟卷腕',app:'杠铃弯举',     coeff:0.34, icon:'💪', desc:'打造二头爆发力', fx:'金色纹路缠绕手臂'},
    {id:'l_lingshe',dao:'xuan', name:'灵蛇卷臂',app:'哑铃弯举',     coeff:0.32, icon:'🐍', desc:'均衡双臂肌肉', fx:'银蛇光影交替游走'},
    {id:'l_xuangui',dao:'xuan', name:'玄龟负山',app:'坐式低拉背',   coeff:0.60, icon:'🐢', desc:'稳定背部基础力量', fx:'土黄色厚重光甲'},
    {id:'l_zhuoyun',dao:'xuan', name:'追云手',  app:'直臂下压',     coeff:0.38, icon:'☁️', desc:'细化背阔下沿', fx:'流云垂直下坠'},
    {id:'l_qiansi', dao:'xuan', name:'千丝缚',  app:'绳索面拉',     coeff:0.30, icon:'🪢', desc:'改善圆肩体态', fx:'千缕银丝拉扯肩后'},
    {id:'h_zhendi', dao:'houtu', name:'镇地法',  app:'杠铃深蹲',     coeff:1.00, icon:'⛰️', desc:'下肢本源根基功法', fx:'地面大地灵阵震动'},
    {id:'h_xuanxiang',dao:'houtu',name:'玄象踏山',app:'哑铃箭步蹲',  coeff:0.75, icon:'🐘', desc:'夯实下肢基础', fx:'土黄光韵踏步震纹'},
    {id:'h_liedi',  dao:'houtu', name:'裂地步',  app:'保加利亚分腿蹲',coeff:0.68, icon:'💥', desc:'平衡单侧下肢力量', fx:'落脚地裂微光'},
    {id:'h_wanjun', dao:'houtu', name:'万钧承躯',app:'腿举',         coeff:0.83, icon:'🏋️', desc:'快速提升腿围', fx:'双腿承压蓝光护盾'},
    {id:'h_yanshan',dao:'houtu', name:'岩山固守',app:'哈克深蹲',     coeff:0.80, icon:'🪨', desc:'精准刺激股四头肌', fx:'岩石纹路覆盖双腿'},
    {id:'h_chihu',  dao:'houtu', name:'赤虎伸足',app:'坐姿腿屈伸',   coeff:0.42, icon:'🐯', desc:'细化大腿前侧', fx:'赤虎红光舒展双腿'},
    {id:'h_xuanbao',dao:'houtu', name:'玄豹收足',app:'俯卧腿弯举',   coeff:0.40, icon:'🐆', desc:'均衡腘绳肌', fx:'墨色豹纹收拢后侧'},
    {id:'h_hanyue', dao:'houtu', name:'撼岳拱',  app:'杠铃臀推',     coeff:0.62, icon:'🏔️', desc:'强化臀腿合力', fx:'腰臀金色山岳虚影'},
    {id:'h_benlei', dao:'houtu', name:'奔雷踏',  app:'哑铃箭步蹲',   coeff:0.66, icon:'⚡', desc:'突破单腿力量瓶颈', fx:'踏步雷光闪烁'},
    {id:'h_juxiang',dao:'houtu', name:'巨象提踵',app:'站姿提踵',     coeff:0.25, icon:'🐘', desc:'完善小腿维度', fx:'脚踝星光弹跳'},
    {id:'h_panshi', dao:'houtu', name:'磐石蹲',  app:'深蹲机',       coeff:0.90, icon:'🪨', desc:'安全稳定下肢训练', fx:'磐石光壁包裹全身'}
  ],
  MAIN_MAX: 3, MAIN_BONUS: 0.20,
  MAIN_MSG_ON: '{skillName}设为主修，后续训练修为收益提升20%。',
  MAIN_MSG_OFF: '已取消《{skillName}》主修身份，可更换其他动作专精。',
  MAIN_MSG_LIMIT: '最多同时选择3门主修功法，请先取消一门再添加。',
  TOAST: {
    syncDone: '全部未结算训练已同步，修为更新完毕，继续加油！',
    noNew: '暂无新增训练记录，抽空多练几组积攒底蕴吧。',
    noBody: '请完善身高、体重、各项围度数据，即可测算你的肉身灵根资质。',
    badVal: '输入数值不合法，重量、围度不可为负数，请重新填写。',
    offline: '当前离线，训练记录临时缓存，联网后自动同步修为。',
    loading: '正在同步训练数据，请稍候，无需重复点击。',
    normal: '功法修为汇入肉身，坚持训练日积月累，本次获取修为：{expAmount}',
    main: '主修功法加持，修炼收益提升20%，本次获取修为：{expAmount}',
    dunwu: '⚡灵光顿悟！对《{skillName}》感悟加深，本次修为翻倍！本次获取修为：{expAmount}'
  },
  BOTTLENECK: '【境界桎梏】\n当前{realmName}九层圆满，积攒了充足修炼底蕴。力量与形体提升本就是循序渐进的过程，不用急于求成，慢慢突破负重、打磨身形，积蓄足够底蕴就能顺利突破下一重境界。',
  BOTTLENECK_DAYS: 7,
  HELP: '🏯 健体修仙录 · 修炼说明\n\n『双体系』肉身境界与功法等级互不互通：肉身境界靠「力量+形体」双条件突破；功法等级独立积累经验，提升换算加成。\n\n『灵根』由 FFMI 判定，影响修炼倍率；完善身高体重与五围数据即可测算。\n\n『道途』决定突破校验侧重：天罡推道查推力、玄元拉道查拉力、后土腿道查腿力，混元均衡道需三系全达标（元婴境解锁）。\n\n『主修』最多3门，主修功法修炼收益+20%。\n\n『同步』训练完成自动结算修为；断网训练本地缓存，联网后自动同步即可。\n\n所有数值规则完全透明，无抽卡、无隐藏机制。'
};

/* ============================================================
   存储联动模块（复用 fitrecord_v3，零新建独立存储）
   ============================================================ */
var DB_KEY = 'fitrecord_v3';
var state = null;
var xian = null;
var animRunning = false;
var fxEnabled = true;

function loadState(){
  try{
    var raw = localStorage.getItem(DB_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return null;
}
function save(){ try{ localStorage.setItem(DB_KEY, JSON.stringify(state)); }catch(e){} }
function ensureXian(){
  if(!state) return;
  if(!state.xianJian){
    state.xianJian = { realm:0, layer:1, dao:'tian', main:[], skills:{}, body:{arm:'',thigh:''}, lastBreakAt:0, bottleneckDays:0 };
  }
  xian = state.xianJian;
  CONFIG.SKILLS.forEach(function(s){
    if(!xian.skills[s.id]) xian.skills[s.id] = {exp:0, lv:1};
  });
}
function num(v, def){
  var n = +v;
  if(v === null || v === undefined || v === '' || !isFinite(n) || n < 0) return def;
  return n;
}

/* ============================================================
   FFMI 灵根计算模块
   ============================================================ */
function getProfile(){ return state.profile || {}; }
function getBodyLatest(){
  var log = state.bodyLog || [];
  return log.length ? log[log.length-1] : null;
}
/* v8.16: FFMI 公式严格按用户指定公式
   FFM = 体重 × (1 - 体脂率)
   标准FFMI = FFM ÷ (身高 × 身高)    —— 身高单位是米
   校正FFMI = 标准FFMI + 6.1 × (1.8 - 身高米)
*/
function computeFFMI(){
  var p = getProfile();
  var b = getBodyLatest() || {};
  var h = num(p.height, 0);                  // cm
  var w = num(b.weight, 0) || num(p.weight, 0);
  var waist = num(b.waist, 0);
  var arm = num(b.arm, 0) || num(xian.body.arm, 0);
  var thigh = num(b.thigh, 0) || num(b.thigh, 0);
  var chest = num(b.chest, 0);
  var directFat = num(b.bodyFat, 0);
  if(!h || !w) return null;
  /* 1. 体脂率 */
  var estFatPct = 0;
  if(directFat > 0){
    estFatPct = directFat;
  } else if(waist > 0){
    var raw = 0.75 * (waist/h*100) - (arm+thigh)/h * 8;
    estFatPct = Math.max(2, Math.min(45, raw));
  } else {
    estFatPct = 15;
  }
  /* 2. FFM = 体重 × (1 - 体脂率) */
  var ffm = w * (1 - estFatPct/100);
  /* 3. 标准FFMI = FFM / (身高米)² */
  var hm = h / 100;
  var ffmi = ffm / (hm * hm);
  /* 4. 校正FFMI = 标准FFMI + 6.1 × (1.8 - 身高米) */
  var ffmiAdj = ffmi + 6.1 * (1.8 - hm);
  return {
    ffmi: ffmi,
    ffmiAdj: ffmiAdj,
    ffm: ffm,
    estFat: estFatPct / 100,                // 内部单位统一为小数
    weight: w,
    height: h,
    waist: waist,
    arm: arm,
    thigh: thigh,
    chest: chest,
    hasBody: !!(waist || arm || thigh || chest || directFat)
  };
}
function getRoot(){
  var r = computeFFMI();
  if(!r) return {name:'未测算', mult:1.0, color:'#9ca3af', fx:'', up:'请完善身高体重数据', debuffs:[]};
  /* v8.16: 灵根判定用校正FFMI（更准确反映体型） */
  var idx = 0;
  for(var i=0;i<CONFIG.ROOTS.length;i++) if(r.ffmiAdj > CONFIG.ROOTS[i].max) idx = i+1;
  if(idx >= CONFIG.ROOTS.length) idx = CONFIG.ROOTS.length-1;
  var root = CONFIG.ROOTS[idx];
  var mult = root.mult;
  var debuffs = [];
  /* v8.16: 同步用校正FFMI判断"肉身枯萎" */
  if(r.ffmiAdj < CONFIG.DEBUFF_WEAK.ffmi){ mult *= CONFIG.DEBUFF_WEAK.mult; debuffs.push({name:'肉身枯萎', color:'#6b7280', msg:CONFIG.DEBUFF_WEAK.msg}); }
  if(r.estFat*100 > CONFIG.DEBUFF_FAT.bodyFat){
    var tmpIdx = Math.max(0, idx-1);
    mult = CONFIG.ROOTS[tmpIdx].mult;
    debuffs.push({name:'浊脂淤灵', color:'#a8a29e', msg:CONFIG.DEBUFF_FAT.msg});
  }
  return {name:root.name, mult:mult, color:CONFIG.ROOT_COLOR[root.name]||'#9ca3af', fx:root.fx, up:root.up, debuffs:debuffs, ffmi:r.ffmi, ffmiAdj:r.ffmiAdj, rawRoot:root.name};
}

/* ============================================================
   修为结算模块
   ============================================================ */
function skillOfApp(appName){
  for(var i=0;i<CONFIG.SKILLS.length;i++){
    if(CONFIG.SKILLS[i].app === appName) return CONFIG.SKILLS[i];
  }
  return null;
}
function skillLevel(skillId){ return xian.skills[skillId] || {exp:0, lv:1}; }
function skillBonus(skillId){
  var s = skillLevel(skillId);
  var lvCfg = CONFIG.SKILL_LV[Math.min(s.lv, CONFIG.SKILL_LV.length)-1];
  return lvCfg ? lvCfg.bonus : 0;
}
function effForce(skill){
  var maxW = 0;
  (state.workouts||[]).forEach(function(w){
    (w.items||[]).forEach(function(it){
      if(it.name !== skill.app) return;
      (it.sets||[]).forEach(function(s){
        var wt = num(s.weight, 0);
        if(wt > maxW) maxW = wt;
      });
    });
  });
  return maxW * skill.coeff * (1 + skillBonus(skill.id));
}
function daoForce(dao){
  var total = 0;
  CONFIG.SKILLS.forEach(function(s){ if(s.dao === dao) total += effForce(s); });
  return total;
}
function bodyMet(realmIdx){
  var r = computeFFMI();
  if(!r || !r.hasBody) return false;
  var std = CONFIG.REALMS[realmIdx].body;
  return r.weight >= std.weight && r.chest >= std.chest && r.arm >= std.arm &&
    (r.waist > 0 && r.waist <= std.waist) && r.thigh >= std.thigh;
}
function forceMet(realmIdx){
  var dao = CONFIG.DAOS[xian.dao];
  var std = CONFIG.REALMS[realmIdx].str;
  var push = daoForce('tian'), pull = daoForce('xuan'), leg = daoForce('houtu');
  if(dao.check === 'push') return push >= std.push;
  if(dao.check === 'pull') return pull >= std.pull;
  if(dao.check === 'leg')  return leg >= std.leg;
  return push >= std.push && pull >= std.pull && leg >= std.leg;
}
function settleWorkout(w, mult, silent){
  var gained = {};
  var lvlUps = [];
  (w.items||[]).forEach(function(it){
    var sk = skillOfApp(it.name);
    if(!sk) return;
    var totalW = 0, totalR = 0;
    (it.sets||[]).forEach(function(s){
      totalW += num(s.weight, 0);
      totalR += num(s.reps, 0);
    });
    if(totalW <= 0 || totalR <= 0) return;
    var isMain = xian.main.indexOf(sk.id) !== -1;
    var base = totalW * totalR * mult * (isMain ? (1+CONFIG.MAIN_BONUS) : 1);
    var dunwu = Math.random() < 0.05;
    var exp = Math.round(base * (dunwu ? 2 : 1));
    gained[sk.id] = {exp:exp, dunwu:dunwu, main:isMain};
  });
  Object.keys(gained).forEach(function(id){
    var g = gained[id];
    var s = xian.skills[id];
    s.exp += g.exp;
    var next = CONFIG.SKILL_LV[s.lv];
    if(next && s.exp >= next.need && s.lv < 9){
      s.lv = next.lv;
      var sk = CONFIG.SKILLS.filter(function(x){return x.id===id;})[0];
      lvlUps.push({id:id, cfg:next, name:sk.name, msg:next.msg.replace('{skillName}', sk.name)});
    }
    if(!silent){
      var msg = g.main ? CONFIG.TOAST.main.replace('{expAmount}', g.exp) : CONFIG.TOAST.normal.replace('{expAmount}', g.exp);
      if(g.dunwu){
        var skName = CONFIG.SKILLS.filter(function(x){return x.id===id;})[0].name;
        msg = CONFIG.TOAST.dunwu.replace('{skillName}', skName).replace('{expAmount}', g.exp);
      }
      toastQ(msg);
    }
  });
  return lvlUps;
}
function checkBreak(){
  var realm = xian.realm;
  var layer = xian.layer;
  var std = CONFIG.REALMS[realm];
  var next = CONFIG.REALMS[realm+1];
  if(!next) return null;
  var fMet = forceMet(realm+1);
  var bMet = bodyMet(realm+1);
  if(layer >= 9){
    if(fMet && bMet){
      xian.realm = realm+1; xian.layer = 1; xian.bottleneckDays = 0;
      return {break:true, realm:next};
    } else {
      xian.bottleneckDays++;
      return {bottleneck:true, realm:std, fMet:fMet, bMet:bMet};
    }
  } else {
    if(fMet && bMet){
      xian.layer++;
      return {layerUp:true, realm:std, layer:xian.layer};
    }
  }
  return null;
}

/* ============================================================
   动画 / Toast
   ============================================================ */
function spawnParticles(color, count, root){
  if(!fxEnabled || animRunning) return;
  var layer = document.getElementById('fxLayer');
  if(!layer){ layer = document.createElement('div'); layer.className='fx-layer'; layer.id='fxLayer'; document.body.appendChild(layer); }
  for(var i=0;i<count;i++){
    var p = document.createElement('div');
    p.className='particle';
    var size = 4 + Math.random()*6;
    p.style.cssText = 'width:'+size+'px;height:'+size+'px;background:'+(color||'#fbbf24')+';left:'+(Math.random()*100)+'%;top:'+(50+Math.random()*40)+'%;animation-duration:'+(1+Math.random())+'s;opacity:'+(0.5+Math.random()*0.5);
    layer.appendChild(p);
    (function(el){ setTimeout(function(){ el && el.remove(); }, 2200); })(p);
  }
}
function lockAnimation(ms){ animRunning = true; setTimeout(function(){ animRunning = false; }, ms || 1600); }
function showShade(title, sub, foot, color, ms, root){
  lockAnimation(ms || 2000);
  var sh = document.createElement('div');
  sh.className='fx-shade';
  sh.innerHTML = '<div class="fx-card" style="border-color:'+(color||'#fbbf24')+';">'+
    '<div class="fx-t1" style="color:'+(color||'#fbbf24')+';">'+title+'</div>'+
    '<div class="fx-t2">'+(sub||'')+'</div><div class="fx-t3">'+(foot||'')+'</div></div>';
  document.body.appendChild(sh);
  if(fxEnabled){
    var ring = document.createElement('div');
    ring.className='break-ring'; ring.style.borderColor = color || '#fbbf24';
    document.body.appendChild(ring);
    setTimeout(function(){ ring.classList.add('show'); }, 30);
    setTimeout(function(){ ring.remove(); }, 2000);
  }
  setTimeout(function(){ sh.remove(); }, ms || 2000);
}
function showBottleneck(brk){
  lockAnimation(2000);
  var sh = document.createElement('div');
  sh.className='bottleneck-shade';
  sh.innerHTML = '<div class="bn-card"><div class="bn-t1">🔒 境界桎梏</div>'+
    '<div class="bn-t2">'+CONFIG.BOTTLENECK.replace('{realmName}', brk.realm.name).replace(/\n/g,'<br>')+
    '</div><div style="margin-top:12px;display:flex;gap:8px;">'+
    '<div style="flex:1;font-size:11px;color:#9ca3af;text-align:center;">力量'+(brk.fMet?'✓':'✗')+'</div>'+
    '<div style="flex:1;font-size:11px;color:#9ca3af;text-align:center;">五围'+(brk.bMet?'✓':'✗')+'</div>'+
    '</div></div>';
  document.body.appendChild(sh);
  setTimeout(function(){ sh.remove(); }, 2400);
}
var toastQueue = [];
var toastBusy = false;
function toastQ(msg){
  toastQueue.push(msg);
  if(!toastBusy) nextToast();
}
function nextToast(){
  if(!toastQueue.length){ toastBusy=false; return; }
  toastBusy = true;
  var msg = toastQueue.shift();
  var el = document.getElementById('toast');
  if(!el){ toastBusy=false; return; }
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(function(){
    el.classList.add('hidden');
    setTimeout(nextToast, 250);
  }, 2300);
}

/* ============================================================
   渲染：主视图（总览模块化）+ 系内详情
   ============================================================ */
function realmIcon(r){ return ['🌱','💨','🪨','✨','👶','🔥','⚡','👑','🐉','🌩️'][r] || '🌱'; }
function daoIcon(d){ return {tian:'🖐️', xuan:'🐲', houtu:'⛰️', hunyuan:'☯️'}[d] || '☯️'; }
function layerCn(n){ return ['一','二','三','四','五','六','七','八','九'][n-1] || n; }

function skillCard(sk){
  var lv = skillLevel(sk.id);
  var lvCfg = CONFIG.SKILL_LV[Math.min(lv.lv, CONFIG.SKILL_LV.length)-1];
  var daoColor = CONFIG.DAOS[sk.dao].color;
  var next = CONFIG.SKILL_LV[Math.min(lv.lv, CONFIG.SKILL_LV.length-1)+1];
  var need = lvCfg.need, nextNeed = next ? next.need : need;
  var pct = nextNeed>need ? Math.min(100, Math.round((lv.exp-need)/(nextNeed-need)*100)) : 100;
  var isMain = xian.main.indexOf(sk.id)!==-1;
  return '<div class="skill-card">'+
    '<div class="skill-head">'+
      '<div class="skill-ic" style="border:1px solid '+daoColor+'44;">'+sk.icon+'<span class="lv-badge">Lv'+lv.lv+'</span></div>'+
      '<div class="skill-info">'+
        '<div class="skill-name">《'+sk.name+'》 <span style="font-size:10px;color:'+daoColor+';">'+lvCfg.name+'</span></div>'+
        '<div class="skill-meta">'+sk.app+' · 系数×'+sk.coeff+' · 加成+'+(lvCfg.bonus*100)+'%</div>'+
        '<div class="skill-exp"><div class="skill-exp-fill" style="width:'+pct+'%;background:'+daoColor+';"></div></div>'+
        '<div class="skill-exp-txt"><span>修为 '+Math.round(lv.exp)+'</span><span>'+(next?next.name:'圆满')+' '+(next?next.need:'—')+'</span></div>'+
      '</div>'+
      '<button class="main-btn '+(isMain?'on':'')+'" data-main="'+sk.id+'">'+(isMain?'主修✓':'设主修')+'</button>'+
    '</div>'+
    '<div class="skill-effect">✨ 训练特效：'+sk.fx+'</div>'+
  '</div>';
}
function daoSummaryCard(daoKey, count){
  var dao = CONFIG.DAOS[daoKey];
  var force = daoForce(daoKey);
  var list = CONFIG.SKILLS.filter(function(s){ return s.dao===daoKey; });
  var totalLv = 0, maxLv = 1;
  list.forEach(function(s){
    var lv = skillLevel(s.id).lv;
    totalLv += lv;
    if(lv > maxLv) maxLv = lv;
  });
  var avg = list.length ? (totalLv/list.length) : 1;
  return '<div class="dao-module" data-dao="'+daoKey+'" style="--dao:'+dao.color+';">'+
    '<div class="dm-top"><div class="dm-ic">'+daoIcon(daoKey)+'</div>'+
      '<div class="dm-info"><div class="dm-name">'+dao.name+'</div>'+
      '<div class="dm-sub">'+count+' 门功法 · 平均 Lv'+avg.toFixed(1)+'</div></div>'+
      '<div class="dm-go">查看 ›</div>'+
    '</div>'+
    '<div class="dm-bar"><div class="dm-bar-fill" style="width:'+Math.min(100, force)+'%;background:'+dao.color+';"></div></div>'+
    '<div class="dm-foot">等效力量 <b>'+Math.round(force)+'</b> kg</div>'+
  '</div>';
}

function renderMain(container){
  try{
    var root = getRoot();
    var realm = CONFIG.REALMS[xian.realm];
    var dao = CONFIG.DAOS[xian.dao];
    var nextRealm = CONFIG.REALMS[xian.realm+1];
    var prog = nextRealm ? (xian.layer-1)/8*100 : 100;
    var cr = computeFFMI();
    var ffmiTxt = cr ? 'FFMI：'+cr.ffmiAdj.toFixed(1) : 'FFMI：--';
    var dbg = (root.debuffs||[]).map(function(d){ return '<span class="debuff-tag">'+d.name+'</span>'; }).join('');
    /* v8.5: 兼容 state.settings.restSec（防御 undefined） */
    var restSecVal = (state.settings && state.settings.restSec) ? state.settings.restSec : 60;

  /* === v8.9 简化肉身档案：只显示核心 6 字段（身高/体重/BMI/胸围/肩宽/臂围） === */
  var p = getProfile();
  var b = getBodyLatest() || {};
  var h = num(p.height, 0);
  var w = num(b.weight, 0) || num(p.weight, 0);
  var chest = num(b.chest, 0) || num(xian.body.chest, 0);
  /* v8.15: 优先用最新 bodyLog 数据，再 fallback 到 xian.body 缓存 */
  var shoulder = num(b.shoulder, 0) || num(xian.body.shoulder, 0);
  var arm = num(b.arm, 0) || num(xian.body.arm, 0);
  /* 自动计算 BMI */
  var bmi = (h>0 && w>0) ? (w / Math.pow(h/100, 2)) : 0;
  var bmiLevel = !bmi ? '--' : (bmi<18.5?'偏瘦':bmi<24?'正常':bmi<28?'超重':'肥胖');
  /* LBM + 预估体脂率 */
  /* v8.16: estFat 已是小数（0.15 表示 15%），不再 *100 */
  var estFat = (cr && cr.estFat != null) ? cr.estFat : 0;
  /* v8.16: LBM = FFM（瘦体重）= 体重 × (1 - 体脂率) */
  var ffmReal = (cr && cr.ffm != null) ? cr.ffm : 0;
  var lbm = (w>0 && estFat>0) ? w*(1-estFat) : ffmReal;

  /* v8.15: 胸围/肩宽/臂围支持点击独立编辑（路径A 单项快速修改） */
  var cell = function(label, val, unit, field){
    var has = val !== '' && val != null && val !== 0;
    /* 只允许已知字段触发编辑 */
    var editable = ['height','weight','chest','shoulder','arm','bodyFat','waist','hip'].indexOf(field) >= 0;
    if(editable){
      return '<div class="bd-cell bd-clickable" data-act="bdEditField" data-field="'+field+'">'+
        '<div class="k">'+label+'</div>'+
        '<div class="n">'+(has?val:'<span class="not-set">未设置</span>')+(has?('<span class="u"> '+unit+'</span>'):'')+' <span class="bd-arrow">›</span></div>'+
      '</div>';
    }
    return '<div class="bd-cell"><div class="k">'+label+'</div><div class="n">'+(has?val:'<span class="not-set">未设置</span>')+(has?('<span class="u"> '+unit+'</span>'):'')+'</div></div>';
  };
  /* 6 字段布局：2 行 × 3 列（自由编辑 + BMI 自动算） */
  var bodyGrid = '<div class="bd-grid-3">'+
    cell('身高', h, 'cm', 'height')+
    cell('体重', w, 'kg', 'weight')+
    cell('BMI', bmi?bmi.toFixed(1):'--', bmiLevel, 'bmi')+  /* BMI 自动算不可编辑 */
  '</div>'+
  '<div class="bd-grid-3" style="margin-top:8px;">'+
    cell('胸围', chest, 'cm', 'chest')+
    cell('肩宽', shoulder, 'cm', 'shoulder')+
    cell('臂围', arm, 'cm', 'arm')+
  '</div>';
  /* v8.16: FFMI/LBM/体脂率 + 灵根倍率（用校正FFMI） */
  var ffmiSummary = '<div class="ffmi-summary">'+
    '<div class="ffmi-item"><div class="ffmi-k">FFMI（校正）</div><div class="ffmi-v" style="color:'+root.color+';">'+(cr&&cr.ffmiAdj?cr.ffmiAdj.toFixed(1):'--')+'</div></div>'+
    '<div class="ffmi-item"><div class="ffmi-k">FFM 瘦体重</div><div class="ffmi-v">'+(lbm?lbm.toFixed(1):'--')+' kg</div></div>'+
    '<div class="ffmi-item"><div class="ffmi-k">预估体脂率</div><div class="ffmi-v">'+(estFat?(estFat*100).toFixed(1):'--')+'%</div></div>'+
    '<div class="ffmi-item"><div class="ffmi-k">灵根 倍率</div><div class="ffmi-v" style="color:'+root.color+';">×'+root.mult.toFixed(2)+'</div></div>'+
  '</div>';

  /* v8.17: 动态打坐人物模块（按境界切换 emoji + 光晕 + 进度条）
     注意：emoji 在部分浏览器下渲染可能异常，用 SVG 兜底 */
  var realmEmojis = ['🌱', '🌿', '🌳', '⚡', '🌙', '✨', '☀️', '🌟', '🌌', '🌈'];
  var realmGlow = ['#475569', '#7cf0a9', '#38bdf8', '#a78bfa', '#f59e0b', '#ef4444', '#ec4899a', '#06b6d4', '#8b5cf6', '#f97316'];
  var realmGlowColor = realmGlow[xian.realm] || '#475569';
  var cultivatorIcon = realmEmojis[xian.realm] || '🌱';
  var realmTitle = realm.name+' · '+layerCn(xian.layer)+'层';
  var daoIcon = dao.icon || '⚔️';
  /* 静态 HTML 不用变量拼接避免渲染异常 */
  var cultivationAvatar = '<div class="cv-avatar-wrap">'+
    '<div class="cv-avatar" style="--glow:'+realmGlowColor+';">'+
      '<div class="cv-avatar-glow"></div>'+
      '<div class="cv-avatar-icon">'+cultivatorIcon+'</div>'+
      '<div class="cv-avatar-ring"></div>'+
      '<div class="cv-avatar-particles">'+
        '<span class="cv-p p1">✨</span><span class="cv-p p2">✨</span><span class="cv-p p3">✨</span>'+
        '<span class="cv-p p4">✨</span><span class="cv-p p5">✨</span>'+
      '</div>'+
    '</div>'+
  '</div>';

  container.innerHTML =
    '<div class="xc-page">'+
      /* ① 动态打坐人物模块（v8.16 新增：基于境界/道途切换形象 + 光晕特效） */
      '<div class="cultivation-avatar" style="--glow:'+realmGlow+';">'+
        cultivationAvatar+
        '<div class="cv-info">'+
          '<div class="cv-title">'+realmTitle+'</div>'+
          '<div class="cv-sub">'+
            '<span class="cv-dao">'+daoIcon+' '+dao.name+'</span>'+
            '<span class="cv-root" style="color:'+root.color+';">'+root.name+'（×'+root.mult.toFixed(2)+'）</span>'+
          '</div>'+
          '<div class="cv-progress">'+
            '<div class="cv-progress-bar">'+
              '<div class="cv-progress-fill" style="width:'+prog+'%;background:'+dao.color+';"></div>'+
            '</div>'+
            '<div class="cv-progress-info">'+
              '<span class="cv-progress-val">'+Math.round(prog)+'%</span>'+
              '<span class="cv-progress-txt">'+(nextRealm?('距 '+nextRealm.name+'：力量 + 五围达标'):'已达肉身巅峰')+'</span>'+
            '</div>'+
          '</div>'+
          (dbg ? '<div class="cv-debuffs">'+dbg+'</div>' : '')+
        '</div>'+
      '</div>'+
      /* ② 灵根条 */
      '<div class="root-strip">'+
        '<span class="root-badge" style="background:'+root.color+'22;color:'+root.color+';">'+root.name+'</span>'+
        '<span class="root-ffmi">校正FFMI：'+(cr&&cr.ffmiAdj?cr.ffmiAdj.toFixed(1):'--')+'</span>'+dbg+
      '</div>'+
      /* ③ 肉身档案（v8.9 精简到 6 字段） */
      '<div class="sec-title">🧬 肉身档案 <span class="sub">核心 6 字段 · 自动算 FFMI/BMI/LBM</span></div>'+
      '<div class="body-card">'+
        bodyGrid + ffmiSummary +
      '</div>'+
      /* ④ 道途 4 卡 */
      '<div class="sec-title">⚔️ 修炼道途 <span class="sub">点击切换</span></div>'+
      '<div class="dao-grid">'+daoGridHTML()+'</div>'+
      /* ⑤ 功法修为：3 张模块化总览卡 */
      '<div class="sec-title">📜 功法修为 <span class="sub">点击进入系内功法（35 套）</span></div>'+
      '<div class="dao-modules">'+
        daoSummaryCard('tian', 12)+daoSummaryCard('xuan', 12)+daoSummaryCard('houtu', 11)+
      '</div>'+
      /* ⑥ 系统说明按钮化（v8.10 删除大段文字，只））保留按钮） */
      '<div class="sec-title">📖 帮助说明</div>'+
      '<button class="action-btn ghost" data-act="openHelp" style="margin-bottom:14px;">📖 查看系统说明</button>'+
      /* ⑦ 必要功能操作（v8.10 体测记录红色 + 精简 8 项） */
      '<div class="sec-title">⚙️ 必要功能</div>'+
      '<div class="action-grid">'+
        '<button class="action-btn red" data-act="openBodyData">📊 体测记录</button>'+
        '<button class="action-btn gold" data-act="syncAll">🔄 同步训练修为</button>'+
        '<button class="action-btn ghost" data-act="exportData">📤 导出数据</button>'+
        '<button class="action-btn ghost" data-act="openPerms">🔐 权限说明</button>'+
        '<button class="action-btn ghost" data-act="openAbout">ℹ️ 关于我们</button>'+
        '<button class="action-btn ghost" data-act="openFeedback">💬 意见反馈</button>'+
        '<button class="action-btn ghost" data-act="openPrivacy">🛡️ 隐私协议</button>'+
      '</div>'+
      '<div style="height:100px;"></div>'+
    '</div>';
  } catch(err){
    try{
      console.error('[renderMain] err:', err);
      container.innerHTML = '<div style="padding:40px;color:#ef4444;text-align:center;">⚠ 仙途页渲染失败<br><small style="color:#64748b;">'+escapeHtml(String(err.message||err))+'</small><br><br><button onclick="window.location.reload()" style="padding:8px 16px;border-radius:8px;background:#1a2540;color:#7cf0a9;border:1px solid #475569;">🔄 刷新页面</button></div>';
    }catch(_){}
  }
}
function daoGridHTML(){
  var html = '';
  Object.keys(CONFIG.DAOS).forEach(function(kk){
    var d = CONFIG.DAOS[kk];
    var unlocked = kk!=='hunyuan' || xian.realm >= 4;
    var active = xian.dao===kk;
    html += '<div class="dao-card '+(active?'active':'')+'" data-dao="'+kk+'" style="'+(active?'border-color:'+d.color+';':'')+'">'+
      '<div class="dc-ic">'+daoIcon(kk)+'</div>'+
      '<div class="dc-name" style="color:'+(active?d.color:'')+'">'+d.name+'</div>'+
      '<div class="dc-val">'+(kk==='hunyuan'?(unlocked?'已解锁':'元婴解锁'):'突破校验')+'</div>'+
    '</div>';
  });
  return html;
}
function renderDaoDetail(container, daoKey){
  var dao = CONFIG.DAOS[daoKey];
  var list = CONFIG.SKILLS.filter(function(s){ return s.dao===daoKey; });
  /* v8.11: 返回按钮单独一行，标题下一行（不重叠） */
  var html = '<div class="xc-page">'+
    '<div class="detail-head" style="--dao:'+dao.color+';display:block;padding:14px;">'+
      '<button class="back-btn" data-act="backOverview" style="display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:20px;background:#1a2540;border:1px solid #475569;color:#7cf0a9;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:10px;">‹ 返回功法总览</button>'+
      '<div class="dh-name" style="font-size:18px;font-weight:800;color:#e2e8f0;">'+dao.name+'</div>'+
      '<div class="dh-sub" style="font-size:12px;color:#8fa3bf;margin-top:2px;">'+list.length+' 门功法 · 等效力量 '+Math.round(daoForce(daoKey))+'kg</div>'+
    '</div>'+
    '<div class="skills-list">'+list.map(skillCard).join('')+'</div>'+
    '<div style="height:80px;"></div></div>';
  container.innerHTML = html;
}

/* ============================================================
   交互绑定（容器内事件委托）
   ============================================================ */
var lastClick = {};
function debounce(key, fn){
  var now = Date.now();
  if(lastClick[key] && now - lastClick[key] < 300) return;
  lastClick[key] = now;
  fn();
}
function switchDao(dao, container){
  debounce('dao', function(){
    if(animRunning){ toastQ('动画播放中，请稍候'); return; }
    if(dao === 'hunyuan' && xian.realm < 4){
      toastQ(CONFIG.DAOS.hunyuan.unlock);
      toastQ('当前境界暂未解锁混元道，稳步修炼至元婴境即可开启。');
      return;
    }
    xian.dao = dao; save();
    spawnParticles(CONFIG.DAOS[dao].color, 20);
    toastQ('道途更迭，调整修炼侧重，稳步打磨属于你的肉身！');
    toastQ(CONFIG.DAOS[dao].unlock);
    renderMain(container);
  });
}
function toggleMain(skillId, container){
  debounce('main', function(){
    var idx = xian.main.indexOf(skillId);
    var sk = CONFIG.SKILLS.filter(function(x){return x.id===skillId;})[0];
    if(idx !== -1){
      xian.main.splice(idx,1); save();
      toastQ(CONFIG.MAIN_MSG_OFF.replace('{skillName}', sk.name));
    } else {
      if(xian.main.length >= CONFIG.MAIN_MAX){ toastQ(CONFIG.MAIN_MSG_LIMIT); return; }
      xian.main.push(skillId); save();
      toastQ(CONFIG.MAIN_MSG_ON.replace('{skillName}', sk.name));
    }
    renderMain(container);
  });
}
function openBodyEditor(container){
  if(animRunning){ toastQ('动画播放中，请稍候'); return; }
  var p = getProfile();
  var b = getBodyLatest() || {};
  var m = document.createElement('div');
  m.className='modal';
  /* v8.9: 简化身体数据表单，只保留核心 6 项：身高/体重/体脂/胸围/肩宽/臂围 */
  m.innerHTML = '<div class="modal-card"><h3>🧬 修改身体数据（核心 6 项）</h3>'+
    '<p style="font-size:12px;color:#8fa3bf;margin:-8px 0 12px;">填写后自动算 BMI/FFMI/灵根<br>详细历史请用底部「身体数据历史」</p>'+
    '<div class="form-grid">'+
      '<div class="form-field"><label>身高 cm（基准184）</label><input id="edHeight" type="number" inputmode="decimal" step="0.1" min="100" max="230" value="'+(p.height||'')+'" style="pointer-events:auto !important;"/></div>'+
      '<div class="form-field"><label>空腹体重 kg</label><input id="edWeight" type="number" inputmode="decimal" step="0.1" min="20" max="200" value="'+(num(b.weight,0)||num(p.weight,0)||'')+'"/></div>'+
      '<div class="form-field"><label>体脂率 %（可选）</label><input id="edBodyFat" type="number" inputmode="decimal" step="0.1" min="3" max="50" value="'+(num(b.bodyFat,0)||num(xian.body.bodyFat,0)||'')+'"/></div>'+
    '</div>'+
    '<div class="form-grid" style="margin-top:8px;">'+
      '<div class="form-field"><label>胸围 cm</label><input id="edChest" type="number" inputmode="decimal" step="0.1" value="'+(num(b.chest,0)||'')+'"/></div>'+
      '<div class="form-field"><label>肩宽 cm</label><input id="edShoulder" type="number" inputmode="decimal" step="0.1" value="'+(num(xian.body.shoulder,0)||num(b.shoulder,0)||'')+'"/></div>'+
      '<div class="form-field"><label>放松臂围 cm</label><input id="edArm" type="number" inputmode="decimal" step="0.1" value="'+(num(xian.body.arm,0)||num(b.arm,0)||'')+'"/></div>'+
    '</div>'+
    '<div class="form-actions"><button class="btn ghost" data-act="bodyCancel">取消</button>'+
    '<button class="btn primary" data-act="bodySave">保存并重算</button></div></div>';
  document.body.appendChild(m);
  m.addEventListener('click', function(e){
    if(e.target.dataset.act==='bodyCancel') m.remove();
    if(e.target.dataset.act==='bodySave'){
      var h = num(document.getElementById('edHeight').value, 0);
      var w = num(document.getElementById('edWeight').value, 0);
      var chest = num(document.getElementById('edChest').value, 0);
      var arm = num(document.getElementById('edArm').value, 0);
      var shoulder = num(document.getElementById('edShoulder').value, 0);
      var bodyFat = num(document.getElementById('edBodyFat').value, 0);
      if(h<=0 || w<=0){ toastQ(CONFIG.TOAST.badVal); return; }
      if(h<100 || h>230){ toastQ('身高范围 100-230cm，请重新输入'); return; }
      if(w<20 || w>200){ toastQ('体重范围 20-200kg，请重新输入'); return; }
      state.profile = state.profile || {};
      state.profile.height = h;
      if(!state.bodyLog) state.bodyLog = [];
      var d = new Date();
      var ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      var entry = {date:ds, weight:w, bodyFat:bodyFat||'', chest:chest||''};
      var idx = state.bodyLog.findIndex(function(x){return x.date===ds;});
      if(idx>=0) state.bodyLog[idx] = Object.assign(state.bodyLog[idx], entry);
      else state.bodyLog.push(entry);
      /* 修仙模块私有补充字段（肩宽 + 臂围） */
      xian.body.shoulder = shoulder;
      xian.body.arm = arm;
      if(bodyFat) xian.body.bodyFat = bodyFat;
      save(); m.remove();
      var root = getRoot();
      if(root && root.ffmi){
        toastQ('灵根已更新：'+root.name+'（FFMI '+root.ffmi.toFixed(1)+'）');
      } else {
        toastQ('数据已保存');
      }
      var brk = checkBreak();
      if(brk && brk.break) showShade('✨ 突破！'+brk.realm.name, brk.realm.sub, brk.realm.foot, CONFIG.DAOS[xian.dao].color, 2200);
      if(container) renderMain(container);
    }
  });
}
function bindEvents(container){
  container.addEventListener('click', function(e){
    var act = e.target.closest('[data-act]');
    var daoEl = e.target.closest('[data-dao]');
    var mainEl = e.target.closest('[data-main]');
    /* v8.5: 原"我的"页所有 data-act（openAIReport/exportData/gotoLibrary/setRest/...
       clearAll 等）由 app.js 的 document click 监听器统一处理；
       这里**不阻止冒泡**，事件自然冒泡到 document，app.js 接住 */
    var handledHere = false;
    /* v8.17: 仙途页 bdEditField 直接处理（不依赖 document 委托） */
    if(act && act.dataset.act === 'bdEditField'){
      handledHere = true;
      /* 让事件冒泡到 document，app.js 主委托也会接住 */
    }
    if(act && act.dataset.act === 'editBody'){ openBodyEditor(container); handledHere=true; }
    else if(act && act.dataset.act === 'backOverview'){ renderMain(container); handledHere=true; }
    else if(act && act.dataset.act === 'syncAll'){
      /* 手动同步修为 */
      var pending = (state.workouts||[]).filter(function(w){return !w.cultivationSettled;});
      if(!pending.length){ toastQ(CONFIG.TOAST.noNew); }
      else {
        var r = API.autoSettle(false);
        toastQ(r.settled>0?CONFIG.TOAST.syncDone:CONFIG.TOAST.noNew);
        if(container) renderMain(container);
      }
      handledHere = true;
    }
    else if(act && act.dataset.act === 'openHelp'){
      openHelpSheet(container);
      handledHere = true;
    }
    else if(act && act.dataset.act === 'openBodyHistory'){
      openBodyHistory(container);
      handledHere = true;
    }
    else if(act && act.dataset.act === 'addBodyLogRow'){
      /* 兜底：通常被 modal 内 click 截获 */
      var openModals = document.querySelectorAll('.body-history-modal');
      if(openModals.length){ openModals[openModals.length-1].remove(); }
      openAddBodyLog(container);
      handledHere = true;
    }
    /* handledHere 的 act 阻止冒泡（避免重复触发 app.js 同名 handler），
       其他 act（passthrough）放行冒泡 */
    if(handledHere){ e.stopPropagation(); return; }
    if(daoEl){
      var dk = daoEl.dataset.dao;
      if(daoEl.classList.contains('dao-module')){ renderDaoDetail(container, dk); return; }
      switchDao(dk, container); return;
    }
    if(mainEl){ toggleMain(mainEl.dataset.main, container); return; }
  });
  /* 粒子开关 */
  var fxBox = document.getElementById('xianFxSwitch');
  if(fxBox && !fxBox.dataset.bound){
    fxBox.dataset.bound = '1';
    fxBox.addEventListener('change', function(){
      fxEnabled = this.checked;
      document.body.classList.toggle('no-fx', !fxEnabled);
      try{ localStorage.setItem('fitrecord_xian_fx', fxEnabled?'1':'0'); }catch(e){}
      toastQ(fxEnabled?'粒子动画已开启':'粒子动画已关闭');
    });
  }
}
function openHelpSheet(container){
  var m = document.createElement('div');
  m.className='modal';
  m.innerHTML = '<div class="modal-card"><h3>📖 健体修仙录 · 系统说明</h3>'+
    CONFIG.HELP.replace(/\n/g,'<br>')+
    '<div class="form-actions"><button class="btn primary" data-act="closeHelp">关闭</button></div></div>';
  document.body.appendChild(m);
  m.addEventListener('click', function(e){
    if(e.target.dataset.act==='closeHelp') m.remove();
  });
}

/* v8.8 身体数据历史模块：全屏 sheet 列出所有 bodyLog + 添加新记录（每日追加不覆盖） */
function openBodyHistory(container){
  /* 防御 state.bodyLog undefined */
  if(!state.bodyLog) state.bodyLog = [];
  /* 按日期降序 */
  var logs = state.bodyLog.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||''); });
  var rowsHtml = '';
  if(logs.length === 0){
    rowsHtml = '<div style="text-align:center;padding:30px;color:#8fa3bf;font-size:14px;">还没有身体数据记录<br>点击下方"📝 添加新记录"开始追踪</div>';
  } else {
    rowsHtml = logs.map(function(b, i){
      var fields = [
        ['体重', b.weight, 'kg'], ['胸围', b.chest, 'cm'], ['腰围', b.waist, 'cm'],
        ['臀围', b.hip, 'cm'], ['臂围', b.arm, 'cm'], ['大腿', b.thigh, 'cm'],
        ['小腿', b.calf, 'cm'], ['颈围', b.neck, 'cm'],
        ['握力L', b.gripL, 'kg'], ['握力R', b.gripR, 'kg'],
        ['体脂', b.bodyFat, '%'], ['骨骼肌', b.skeletal, '%'], ['内脏脂肪', b.visceral, '']
      ].filter(function(f){return f[1] && +f[1] > 0;}).map(function(f){
        return '<span style="display:inline-block;margin:2px 4px;padding:2px 8px;background:#1a2540;border-radius:6px;font-size:12px;color:#cbd5e1;"><b>'+f[0]+'</b> '+f[1]+f[2]+'</span>';
      }).join('');
      return '<div class="bh-row" data-date="'+b.date+'">'+
        '<div class="bh-head"><span class="bh-date">'+b.date+'</span>'+(i===0?'<span class="bh-tag">最新</span>':'')+
          '<span class="bh-act"><button data-act="delBodyLog" data-date="'+b.date+'" style="background:transparent;color:#ef4444;border:0;cursor:pointer;font-size:14px;">🗑️</button></span>'+
        '</div>'+
        '<div class="bh-fields">'+ (fields||'<span style="color:#64748b;font-size:12px;">无数据</span>') +'</div>'+
      '</div>';
    }).join('');
  }
  var m = document.createElement('div');
  m.className='modal body-history-modal';
  m.innerHTML = '<div class="modal-card" style="max-height:90vh;overflow:hidden;display:flex;flex-direction:column;">'+
    '<h3 style="flex:0 0 auto;">📊 身体数据历史 <span style="font-size:12px;color:#8fa3bf;font-weight:400;">共 '+logs.length+' 条</span></h3>'+
    '<div style="flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;">'+ rowsHtml +'</div>'+
    '<div class="form-actions" style="flex:0 0 auto;">'+
      '<button class="btn ghost" data-act="closeBodyHistory">关闭</button>'+
      '<button class="btn primary" data-act="addBodyLogRow">📝 添加新记录</button>'+
    '</div></div>';
  document.body.appendChild(m);
  m.addEventListener('click', function(e){
    var a = e.target.dataset.act;
    if(a === 'closeBodyHistory'){ m.remove(); return; }
    if(a === 'addBodyLogRow'){ m.remove(); openAddBodyLog(container); return; }
    if(a === 'delBodyLog'){
      var d = e.target.dataset.date;
      if(!d) return;
      if(!confirm('确认删除 '+d+' 的记录？')) return;
      state.bodyLog = state.bodyLog.filter(function(x){return x.date !== d;});
      save(); m.remove(); openBodyHistory(container);
      toastQ('已删除 '+d);
      return;
    }
  });
}
function openAddBodyLog(container){
  var today = new Date();
  var ds = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  var m = document.createElement('div');
  m.className='modal';
  m.innerHTML = '<div class="modal-card" style="max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">'+
    '<h3>📝 添加新身体数据记录</h3>'+
    '<p style="font-size:12px;color:#8fa3bf;margin:6px 0 12px;">记录保存后追加到历史，不覆盖其他日期数据</p>'+
    '<div class="form-field"><label>📅 日期</label><input id="bh_date" type="date" value="'+ds+'"/></div>'+
    '<div class="form-grid">'+
      '<div class="form-field"><label>体重 kg</label><input id="bh_weight" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>胸围 cm</label><input id="bh_chest" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>腰围 cm</label><input id="bh_waist" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>臀围 cm</label><input id="bh_hip" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>放松臂围 cm</label><input id="bh_arm" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>大腿围 cm</label><input id="bh_thigh" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>小腿围 cm</label><input id="bh_calf" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>颈围 cm</label><input id="bh_neck" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>握力 左 kg</label><input id="bh_gripL" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>握力 右 kg</label><input id="bh_gripR" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>体脂率 %</label><input id="bh_bodyFat" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>骨骼肌 %</label><input id="bh_skeletal" type="number" step="0.1"/></div>'+
      '<div class="form-field"><label>内脏脂肪</label><input id="bh_visceral" type="number" step="0.1"/></div>'+
    '</div>'+
    '<div class="form-actions">'+
      '<button class="btn ghost" data-act="cancelAddBodyLog">取消</button>'+
      '<button class="btn primary" data-act="saveBodyLog">保存记录</button>'+
    '</div></div>';
  document.body.appendChild(m);
  m.addEventListener('click', function(e){
    var a = e.target.dataset.act;
    if(a === 'cancelAddBodyLog'){ m.remove(); openBodyHistory(container); return; }
    if(a === 'saveBodyLog'){
      var d = document.getElementById('bh_date').value;
      if(!d){ toastQ('请选择日期'); return; }
      var entry = {date: d};
      ['weight','chest','waist','hip','arm','thigh','calf','neck','gripL','gripR','bodyFat','skeletal','visceral'].forEach(function(k){
        var v = +document.getElementById('bh_'+k).value;
        if(v > 0) entry[k] = v;
      });
      if(Object.keys(entry).length < 2){ toastQ('请至少填写 1 个数据'); return; }
      /* 防御 + 去重（同日期覆盖最新一条） */
      if(!state.bodyLog) state.bodyLog = [];
      var idx = state.bodyLog.findIndex(function(x){return x.date === d;});
      if(idx >= 0){
        state.bodyLog[idx] = Object.assign({}, state.bodyLog[idx], entry);
      } else {
        state.bodyLog.push(entry);
      }
      state.bodyLog.sort(function(x,y){return (x.date||'').localeCompare(y.date||'');});
      save();
      /* 同步刷新 xian.body 缓存字段 */
      var latest = state.bodyLog[state.bodyLog.length-1] || {};
      ['arm','thigh','calf','neck','gripL','gripR'].forEach(function(k){
        if(latest[k]) xian.body[k] = latest[k];
      });
      save();
      m.remove();
      openBodyHistory(container);
      toastQ('已保存 '+d+' 的身体数据');
      return;
    }
  });
}

/* ============================================================
   对外 API
   ============================================================ */
/* 自注入修仙页样式（xian.html 与 SPA 双入口共用） */
function injectStyle(){
  if(document.getElementById('xian-core-style')) return;
  var st = document.createElement('style');
  st.id = 'xian-core-style';
  st.textContent = [
    '.xc-page{padding:4px 16px 20px;max-width:100vw;box-sizing:border-box;}',
    '.realm-strip{display:flex;align-items:center;gap:10px;margin-top:4px;background:var(--card,#131c31);border:1px solid var(--line,#26314d);border-radius:14px;padding:12px;}',
    '.realm-ic{font-size:30px;line-height:1;filter:drop-shadow(0 0 8px var(--dao,#fbbf24));}',
    '.realm-info{flex:1;min-width:0;}',
    '.realm-name{font-size:17px;font-weight:800;}',
    '.realm-sub{font-size:11px;color:var(--muted,#8fa3bf);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;}',
    '.realm-prog{height:8px;background:#1a2540;border-radius:8px;margin-top:8px;overflow:hidden;}',
    '.realm-prog-fill{height:100%;border-radius:8px;transition:width .4s;}',
    '.realm-prog-txt{font-size:10px;color:var(--muted,#8fa3bf);margin-top:4px;text-align:right;}',
    '.root-strip{display:flex;align-items:center;gap:8px;margin-top:8px;background:var(--card,#131c31);border-radius:12px;padding:8px 12px;}',
    '.root-badge{font-size:13px;font-weight:800;padding:3px 10px;border-radius:20px;white-space:nowrap;}',
    '.root-ffmi{font-size:12px;color:var(--muted,#8fa3bf);margin-left:auto;}',
    '.debuff-tag{font-size:11px;color:#f59e0b;margin-left:8px;}',
    '.sec-title{display:flex;align-items:baseline;gap:8px;font-size:15px;font-weight:800;margin:16px 2px 10px;}',
    '.sec-title .sub{font-size:11px;color:var(--muted,#8fa3bf);font-weight:400;}',
    '.dao-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.dao-card{border-radius:14px;padding:10px;background:var(--card,#131c31);border:1px solid var(--line,#26314d);text-align:center;cursor:pointer;}',
    '.dao-card.active{border-color:var(--dao,#fbbf24);box-shadow:0 0 10px var(--dao,#fbbf24)33;}',
    '.dao-card .dc-ic{font-size:22px;margin-bottom:4px;}',
    '.dao-card .dc-name{font-size:13px;font-weight:800;margin-bottom:4px;}',
    '.dao-card .dc-val{font-size:11px;color:var(--muted,#8fa3bf);}',
    '.dao-modules{display:flex;flex-direction:column;gap:10px;}',
    '.dao-module{background:var(--card,#131c31);border:1px solid var(--line,#26314d);border-left:4px solid var(--dao,#fbbf24);border-radius:14px;padding:12px;cursor:pointer;}',
    '.dao-module .dm-top{display:flex;align-items:center;gap:10px;}',
    '.dao-module .dm-ic{font-size:26px;}',
    '.dao-module .dm-info{flex:1;min-width:0;}',
    '.dao-module .dm-name{font-size:15px;font-weight:800;}',
    '.dao-module .dm-sub{font-size:11px;color:var(--muted,#8fa3bf);margin-top:2px;}',
    '.dao-module .dm-go{font-size:13px;color:var(--dao,#fbbf24);font-weight:700;}',
    '.dao-module .dm-bar{height:6px;background:#1a2540;border-radius:6px;margin:10px 0 6px;overflow:hidden;}',
    '.dao-module .dm-bar-fill{height:100%;border-radius:6px;}',
    '.dao-module .dm-foot{font-size:11px;color:var(--muted,#8fa3bf);}',
    '.dao-module .dm-foot b{color:var(--dao,#fbbf24);font-size:14px;}',
    '.skills-list{display:flex;flex-direction:column;gap:10px;}',
    '.skill-card{background:var(--card,#131c31);border-radius:14px;padding:12px;margin-bottom:10px;border:1px solid var(--line,#26314d);}',
    '.skill-head{display:flex;align-items:center;gap:10px;}',
    '.skill-ic{width:38px;height:38px;border-radius:10px;background:#1a2540;display:flex;align-items:center;justify-content:center;font-size:18px;flex:0 0 auto;position:relative;}',
    '.skill-ic .lv-badge{position:absolute;bottom:-4px;right:-4px;background:#fbbf24;color:#111;font-size:9px;font-weight:800;border-radius:8px;padding:0 4px;}',
    '.skill-info{flex:1;min-width:0;}',
    '.skill-name{font-size:14px;font-weight:800;}',
    '.skill-meta{font-size:11px;color:var(--muted,#8fa3bf);margin-top:2px;}',
    '.skill-exp{height:5px;background:#1a2540;border-radius:4px;margin-top:6px;overflow:hidden;}',
    '.skill-exp-fill{height:100%;border-radius:4px;transition:width .4s;}',
    '.skill-exp-txt{font-size:10px;color:var(--muted,#8fa3bf);margin-top:4px;display:flex;justify-content:space-between;}',
    '.main-btn{flex:0 0 auto;border:1px solid var(--line,#26314d);background:#1a2540;color:var(--text,#e2e8f0);border-radius:10px;padding:6px 10px;font-size:11px;}',
    '.main-btn.on{background:linear-gradient(90deg,#f59e0b,#fbbf24);color:#111;border-color:transparent;font-weight:700;}',
    '.skill-effect{font-size:10px;color:#7f9cbd;margin-top:6px;font-style:italic;}',
    '.body-card{background:var(--card,#131c31);border-radius:14px;padding:12px;}',
    '.body-grid,.bd-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}',
    '.bd-cell{background:#1a2540;border-radius:10px;padding:8px;text-align:center;}',
    '.bd-cell .k{font-size:10px;color:var(--muted,#8fa3bf);}',
    '.bd-cell .n{font-size:14px;font-weight:800;margin-top:2px;}',
    '.bd-cell .u{font-size:10px;color:var(--muted,#8fa3bf);font-weight:400;}',
    /* FFMI 自动计算摘要 */
    '.ffmi-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;padding-top:10px;border-top:1px dashed #26314d;}',
    '.ffmi-item{background:linear-gradient(135deg,#1a2540,#26314d);border-radius:10px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;}',
    '.ffmi-item .ffmi-k{font-size:11px;color:#8fa3bf;}',
    '.ffmi-item .ffmi-v{font-size:15px;font-weight:800;color:#fbbf24;font-variant-numeric:tabular-nums;}',
    /* 必要功能按钮区 */
    '.action-grid{display:flex;flex-direction:column;gap:10px;}',
    '.action-btn{border:0;border-radius:12px;padding:13px;font-size:14px;font-weight:700;width:100%;}',
    '.action-btn.primary{background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff;}',
    '.action-btn.gold{background:linear-gradient(90deg,#f59e0b,#ef4444);color:#fff;}',
    '.action-btn.ghost{background:#1a2540;color:#e2e8f0;border:1px solid #26314d;}',
    '.action-btn.danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid #7f1d1d;}',
    /* v8.10: 体测记录按钮红色（跟同步训练修为一致醒目） */
    '.action-btn.red{background:linear-gradient(90deg,#ef4444,#dc2626);color:#fff;border:0;font-weight:800;box-shadow:0 4px 12px rgba(239,68,68,.35);}',
    /* v8.10: 超级组 set-row 双侧输入样式（参考截图9） */
    '.set-row-sup .set-val-pair{display:inline-flex;align-items:center;gap:4px;}',
    '.set-val-pair-item{padding:4px 8px;min-width:42px;height:30px;border-radius:8px;border:1px solid #c7d2fe;background:#eef2ff;color:#312e81;font-size:13px;font-weight:700;font-family:monospace;cursor:pointer;}',
    '.set-val-pair-item.empty{color:#a8a8a8;border-color:#e5e7eb;background:#f9fafb;}',
    '.set-val-divider{color:#6366f1;font-weight:700;font-size:14px;}',
    /* v8.8 身体数据历史模块样式 */
    '.bh-row{background:rgba(124,240,169,.04);border:1px solid #1e293b;border-radius:10px;padding:10px;margin-bottom:8px;}',
    '.bh-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}',
    '.bh-date{font-size:14px;font-weight:700;color:#7cf0a9;font-family:monospace;}',
    '.bh-tag{background:#7cf0a9;color:#0b1120;font-size:10px;padding:1px 6px;border-radius:6px;font-weight:700;}',
    '.bh-fields{line-height:1.8;}',
    '.bh-act button:active{transform:scale(.9);}',
    '.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
    '.form-grid .form-field{margin:0;}',
    '.action-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#131c31;border-radius:12px;border:1px solid #26314d;}',
    '.bd-cell{background:#1a2540;border-radius:10px;padding:8px;text-align:center;}',
    '.bd-cell .k{font-size:10px;color:var(--muted,#8fa3bf);}',
    '.bd-cell .n{font-size:15px;font-weight:800;margin-top:2px;}',
    '.bd-cell .u{font-size:10px;color:var(--muted,#8fa3bf);font-weight:400;}',
    '.body-edit{margin-top:10px;width:100%;border:1px solid var(--line,#26314d);background:#1a2540;color:var(--text,#e2e8f0);border-radius:10px;padding:9px;font-size:13px;}',
    '.help-card{background:var(--card,#131c31);border-radius:14px;padding:14px;font-size:12px;color:#b6c6dc;line-height:1.8;}',
    '.detail-head{display:flex;align-items:center;gap:12px;background:var(--card,#131c31);border:1px solid var(--line,#26314d);border-radius:14px;padding:12px;margin:4px 0 14px;}',
    '.detail-head .back-btn{width:32px;height:32px;border-radius:50%;background:#1a2540;border:0;color:var(--text,#e2e8f0);font-size:18px;}',
    '.detail-head .dh-name{font-size:16px;font-weight:800;}',
    '.detail-head .dh-sub{font-size:11px;color:var(--muted,#8fa3bf);margin-top:2px;}',
    '.btn-locked{opacity:.55;pointer-events:none;transform:scale(.98);}',
    ''
  ].join('\n');
  document.head.appendChild(st);
}

var API = {
  init: function(){
    injectStyle();
    state = loadState();
    if(!state){
      toastQ('未检测到训练数据，请先在 FitRecord 中记录训练');
      state = {profile:{height:175}, bodyLog:[], workouts:[], plans:[], folders:[], customEx:[]};
    }
    ensureXian();
    if(state.xian && state.xian.dao && CONFIG.DAOS[state.xian.dao]) xian.dao = state.xian.dao;
    return xian;
  },
  renderTo: function(container){
    if(!xian) this.init();
    renderMain(container);
    bindEvents(container);
    if(!navigator.onLine) toastQ(CONFIG.TOAST.offline);
  },
  /* 自动结算：训练完成后调用，同步全部未结算 */
  autoSettle: function(silent){
    if(!state || !xian) return;
    var root = getRoot();
    var mult = root ? root.mult : 1.0;
    var pending = (state.workouts||[]).filter(function(w){ return !w.cultivationSettled; });
    if(!pending.length) return;
    var lvlUps = [];
    pending.forEach(function(w){
      var ups = settleWorkout(w, mult, !!silent);
      lvlUps = lvlUps.concat(ups);
      w.cultivationSettled = true;
    });
    save();
    lvlUps.forEach(function(u){
      if(!silent){
        toastQ(u.msg);
        spawnParticles(CONFIG.DAOS[CONFIG.SKILLS.filter(function(x){return x.id===u.id;})[0].dao].color, 20);
      }
    });
    var brk = checkBreak();
    if(brk && brk.break){
      showShade('✨ 突破！'+brk.realm.name, brk.realm.sub, brk.realm.foot, CONFIG.DAOS[xian.dao].color, 2400);
      spawnParticles(CONFIG.DAOS[xian.dao].color, 40);
    } else if(brk && brk.bottleneck){
      showBottleneck(brk);
    } else if(brk && brk.layerUp){
      spawnParticles(CONFIG.DAOS[xian.dao].color, 25);
      toastQ('修为精进！'+brk.realm.name+' · '+layerCn(brk.layer)+'层');
    }
    return {settled: pending.length, lvlUps: lvlUps.length, broken: !!(brk && brk.break)};
  },
  syncAll: function(container){
    /* 手动同步（保留） */
    if(animRunning){ toastQ('动画播放中，请稍候'); return; }
    var pending = (state.workouts||[]).filter(function(w){ return !w.cultivationSettled; });
    if(!pending.length){ toastQ(CONFIG.TOAST.noNew); return; }
    var r = API.autoSettle(false);
    toastQ(r.settled > 0 ? CONFIG.TOAST.syncDone : CONFIG.TOAST.noNew);
    if(container) renderMain(container);
  },
  getRoot: getRoot,
  CONFIG: CONFIG
};
global.XianCore = API;
})(window);