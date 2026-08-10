/* ============================================================
   FitRecord · 健身房动作库
   器械来源：自律侠共享健身 138店-齐礼阎店
   ============================================================ */
'use strict';

/* ---------- 动作示意图 SVG（内联，离线可用） ---------- */
const EX_SVG = {
  // 卧推类
  press: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="95" width="160" height="8" rx="2" fill="#e5e7eb"/><path d="M85 85 L65 55" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M115 85 L135 55" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M65 55 L135 55" stroke="#374151" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="50" r="8" fill="#1f2937"/><path d="M100 58 L100 85" stroke="#1f2937" stroke-width="5"/><path d="M100 70 L75 80 M100 70 L125 80" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 飞鸟/夹胸
  fly: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M85 80 L65 45 M115 80 L135 45" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><circle cx="65" cy="45" r="6" fill="#6b7280"/><circle cx="135" cy="45" r="6" fill="#6b7280"/><circle cx="100" cy="50" r="8" fill="#1f2937"/><path d="M100 58 L100 80" stroke="#1f2937" stroke-width="5"/></svg>`,
  // 划船类
  row: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M70 90 L80 60 L110 60 L120 90" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M110 60 L135 70 L145 55" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/><circle cx="95" cy="50" r="8" fill="#1f2937"/><path d="M60 90 L130 90" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 下拉类
  pulldown: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M100 15 L100 40" stroke="#374151" stroke-width="4"/><path d="M80 15 L120 15" stroke="#374151" stroke-width="4"/><circle cx="100" cy="48" r="7" fill="#1f2937"/><path d="M100 55 L100 85 M100 70 L80 90 M100 70 L120 90" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><circle cx="80" cy="95" r="5" fill="#6b7280"/><circle cx="120" cy="95" r="5" fill="#6b7280"/></svg>`,
  // 深蹲类
  squat: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="35" r="7" fill="#1f2937"/><path d="M100 42 L100 70" stroke="#1f2937" stroke-width="5"/><path d="M100 55 L75 65 M100 55 L125 65" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M85 75 L70 105 M115 75 L130 105" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M75 62 L125 62" stroke="#374151" stroke-width="5" stroke-linecap="round"/></svg>`,
  // 腿举/倒蹬
  legpress: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 85 L60 50 Q60 40 80 40 L120 40 Q140 40 140 50 L140 85" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/><path d="M80 85 L80 105 M120 85 L120 105" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="35" r="7" fill="#1f2937"/><path d="M80 60 L120 60" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round"/></svg>`,
  // 腿屈伸/腿弯举
  legcurl: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M70 85 L70 60 L100 60 L130 60 L130 85" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="100" cy="50" r="7" fill="#1f2937"/><path d="M130 60 L150 75" stroke="#374151" stroke-width="4" stroke-linecap="round"/><path d="M60 90 L140 90" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 推举类
  ohp: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="55" r="7" fill="#1f2937"/><path d="M100 62 L100 90" stroke="#1f2937" stroke-width="5"/><path d="M100 75 L75 70 M100 75 L125 70" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M75 35 L125 35" stroke="#374151" stroke-width="5" stroke-linecap="round"/><path d="M80 35 L80 55 M120 35 L120 55" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 侧平举
  latraise: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="55" r="7" fill="#1f2937"/><path d="M100 62 L100 90" stroke="#1f2937" stroke-width="5"/><path d="M100 70 L60 50 M100 70 L140 50" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="50" r="5" fill="#6b7280"/><circle cx="140" cy="50" r="5" fill="#6b7280"/></svg>`,
  // 弯举类
  curl: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="85" cy="45" r="7" fill="#1f2937"/><path d="M85 52 L85 90" stroke="#1f2937" stroke-width="5"/><path d="M85 65 L110 60 L120 45" stroke="#374151" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="120" cy="45" r="5" fill="#6b7280"/></svg>`,
  // 三头下压
  triext: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="35" r="7" fill="#1f2937"/><path d="M100 42 L100 70" stroke="#1f2937" stroke-width="5"/><path d="M100 55 L80 60" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M100 70 L130 90 L150 80" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/><path d="M90 10 L110 10 L105 35 L95 35 Z" fill="#6b7280"/></svg>`,
  // 臀推
  hipthrust: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 85 L80 65 L120 65 L140 85" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M90 65 L90 45" stroke="#1f2937" stroke-width="4"/><circle cx="90" cy="38" r="6" fill="#1f2937"/><path d="M80 75 L120 75" stroke="#374151" stroke-width="5" stroke-linecap="round"/></svg>`,
  // 卷腹/核心
  crunch: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 95 L80 75 L120 75 L140 95" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M110 75 L110 55" stroke="#1f2937" stroke-width="4"/><circle cx="110" cy="48" r="6" fill="#1f2937"/><path d="M120 80 L145 80" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 有氧
  cardio: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="75" width="120" height="10" rx="3" fill="#e5e7eb"/><path d="M60 75 L60 55 L80 40" stroke="#1f2937" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M110 75 L110 45 L130 35" stroke="#1f2937" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="85" cy="32" r="6" fill="#1f2937"/><path d="M75 55 L95 55" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 髋外展/内收
  hipab: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="45" r="7" fill="#1f2937"/><path d="M100 52 L100 80" stroke="#1f2937" stroke-width="5"/><path d="M100 65 L70 75 M100 65 L130 75" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M60 85 L80 75 M120 75 L140 85" stroke="#374151" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 面拉/后束
  facepull: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="55" r="7" fill="#1f2937"/><path d="M100 62 L100 90" stroke="#1f2937" stroke-width="5"/><path d="M100 70 L130 60 L150 70" fill="none" stroke="#374151" stroke-width="4" stroke-linecap="round"/><path d="M150 50 L150 90" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/></svg>`,
  // 山羊挺身/罗马椅
  hyper: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M90 90 L90 65 L110 45 L130 45" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="130" cy="38" r="6" fill="#1f2937"/><path d="M80 65 L120 65" stroke="#e5e7eb" stroke-width="5" stroke-linecap="round"/></svg>`,
  // 小腿/提踵
  calf: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="35" r="7" fill="#1f2937"/><path d="M100 42 L100 70" stroke="#1f2937" stroke-width="5"/><path d="M90 75 L85 105 M110 75 L115 105" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M75 70 L125 70" stroke="#374151" stroke-width="4" stroke-linecap="round"/></svg>`,
  // 引体/辅助引体
  pullup: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 20 L140 20" stroke="#374151" stroke-width="4" stroke-linecap="round"/><path d="M100 20 L100 45" stroke="#1f2937" stroke-width="4"/><circle cx="100" cy="52" r="7" fill="#1f2937"/><path d="M100 59 L100 85 M100 75 L80 90 M100 75 L120 90" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/></svg>`,
  // 悬垂举腿/双杠
  hangleg: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M70 20 L130 20" stroke="#374151" stroke-width="4" stroke-linecap="round"/><path d="M80 20 L80 40 M120 20 L120 40" stroke="#1f2937" stroke-width="3"/><circle cx="100" cy="50" r="7" fill="#1f2937"/><path d="M100 57 L100 85 M100 72 L80 90 M100 72 L120 90" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/></svg>`,
  // 壶铃/摇摆
  kb: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="48" r="7" fill="#1f2937"/><path d="M100 55 L100 85" stroke="#1f2937" stroke-width="5"/><path d="M100 70 L75 60 M100 70 L125 60" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/><path d="M120 60 L140 80 L150 75" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/><circle cx="145" cy="78" r="6" fill="#6b7280"/></svg>`,
  // 弹力带
  band: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 30 L60 90" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/><path d="M140 30 L140 90" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="55" r="7" fill="#1f2937"/><path d="M100 62 L100 90" stroke="#1f2937" stroke-width="5"/><path d="M100 75 L80 75 M100 75 L120 75" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/></svg>`,
};

/* ---------- 健身房动作库 ---------- */
const GYM_EXERCISES = [
  /* 胸 */
  {id:'g_bench',name:'杠铃平板卧推',part:'胸',target:'胸大肌',equip:'杠铃',level:'中级',tip:'肩胛后缩下沉，下放至胸线，推起时收紧胸肌',svg:'press'},
  {id:'g_incline_bb',name:'杠铃上斜卧推',part:'胸',target:'上胸',equip:'杠铃',level:'中级',tip:'上斜30°，杠铃下放至锁骨下方，避免耸肩',svg:'press'},
  {id:'g_decline_bb',name:'杠铃下斜卧推',part:'胸',target:'下胸',equip:'杠铃',level:'高级',tip:'下斜15-30°，重点刺激下胸',svg:'press'},
  {id:'g_db_press',name:'哑铃平板卧推',part:'胸',target:'胸大肌',equip:'哑铃',level:'中级',tip:'哑铃下放至胸两侧，推起时内旋夹胸',svg:'press'},
  {id:'g_incline_db',name:'哑铃上斜卧推',part:'胸',target:'上胸',equip:'哑铃',level:'中级',tip:'上斜30°，控制下放幅度，感受上胸拉伸',svg:'press'},
  {id:'g_fly',name:'哑铃飞鸟',part:'胸',target:'胸肌中缝',equip:'哑铃',level:'中级',tip:'微屈肘，画弧至胸口上方相触，感受胸肌拉伸与收缩',svg:'fly'},
  {id:'g_pec_deck',name:'蝴蝶机夹胸',part:'胸',target:'胸肌中缝',equip:'蝴蝶机',level:'初级',tip:'肘部贴垫，向前夹拢呼气，顶峰收缩',svg:'fly'},
  {id:'g_machine_press',name:'坐姿器械推胸',part:'胸',target:'胸大肌',equip:'推胸器械',level:'初级',tip:'握距与肩同宽，慢放快推，胸肌主动收缩',svg:'press'},
  {id:'g_incline_machine',name:'上斜推胸',part:'胸',target:'上胸',equip:'上斜推胸器械',level:'初级',tip:'背部贴紧靠垫，推起时保持肩部稳定',svg:'press'},
  {id:'g_wide_machine',name:'阔角推胸',part:'胸',target:'胸大肌外侧',equip:'阔角推胸器械',level:'初级',tip:'宽握把，控制回放，胸外侧主导发力',svg:'press'},
  {id:'g_tower_press',name:'塔式推胸',part:'胸',target:'胸大肌',equip:'塔式推胸器械',level:'初级',tip:'胸廓打开，推举轨迹稳定',svg:'press'},
  {id:'g_flat_protect',name:'平卧推胸(带保护杠)',part:'胸',target:'胸大肌',equip:'推胸训练器',level:'初级',tip:'安全保护杠调整到位，可尝试较大重量',svg:'press'},
  {id:'g_cable_fly',name:'绳索夹胸',part:'胸',target:'胸肌中缝',equip:'大龙门',level:'中级',tip:'龙门架高位，双手画弧夹胸，顶峰停顿',svg:'fly'},
  {id:'g_dip',name:'双杠臂屈伸',part:'胸',target:'下胸/三头',equip:'双杠',level:'中级',tip:'身体前倾练胸，直立练三头，下放至大臂平行',svg:'hangleg'},
  {id:'g_pushup',name:'俯卧撑',part:'胸',target:'胸大肌',equip:'瑜伽垫',level:'初级',tip:'核心收紧，身体成一条直线，胸贴近地面',svg:'press'},
  {id:'g_band_press',name:'弹力带推胸',part:'胸',target:'胸大肌',equip:'弹力带',level:'初级',tip:'固定弹力带于身后，双手前推夹胸',svg:'band'},

  /* 背 */
  {id:'g_pullup',name:'引体向上',part:'背',target:'背阔肌',equip:'引体向上架',level:'高级',tip:'握距略宽于肩，背阔肌启动把身体拉向单杠',svg:'pullup'},
  {id:'g_assisted_pullup',name:'辅助引体向上',part:'背',target:'背阔肌',equip:'辅助引体器械',level:'初级',tip:'膝盖/脚掌置于辅助垫上，背阔肌发力下拉',svg:'pullup'},
  {id:'g_lat_pd',name:'高位下拉',part:'背',target:'背阔肌',equip:'高位下拉器械',level:'初级',tip:'挺胸沉肩，下拉至锁骨，慢回防借力',svg:'pulldown'},
  {id:'g_reverse_lat',name:'反握高位下拉',part:'背',target:'背阔肌下沿',equip:'高位下拉器械',level:'中级',tip:'反握窄握，下拉至胸口，感受背阔拉伸',svg:'pulldown'},
  {id:'g_neutral_lat',name:'颈后高位下拉',part:'背',target:'上背宽度',equip:'高位下拉器械',level:'中级',tip:'颈后下拉，控制幅度，避免过度后仰',svg:'pulldown'},
  {id:'g_seated_row',name:'坐姿划船',part:'背',target:'背阔肌/中背',equip:'划船拉背器械',level:'初级',tip:'后拉时挺胸，肩胛后缩，勿耸肩',svg:'row'},
  {id:'g_low_row',name:'坐式低拉背',part:'背',target:'下背阔',equip:'低拉背训练器',level:'初级',tip:'挺胸，拉手柄至腹部，挤压背阔',svg:'row'},
  {id:'g_double_row',name:'双位拉背',part:'背',target:'背阔肌',equip:'双位拉背训练器',level:'初级',tip:'背部挺直，肩胛带动手臂后拉',svg:'row'},
  {id:'g_bb_row',name:'杠铃划船',part:'背',target:'背阔肌',equip:'杠铃',level:'中级',tip:'屈髋微屈膝，杠铃沿大腿拉向肚脐，挤压背阔',svg:'row'},
  {id:'g_tbar_row',name:'T杠划船',part:'背',target:'背阔肌厚度',equip:'T杠/T型划船训练器',level:'中级',tip:'胸口贴垫，拉向腹部，背阔主导',svg:'row'},
  {id:'g_seal_row',name:'海豹划船',part:'背',target:'中背',equip:'海豹划船训练器',level:'中级',tip:'俯卧贴紧，胸部支撑，避免借力',svg:'row'},
  {id:'g_scissor_row',name:'剪刀式拉背',part:'背',target:'背阔肌',equip:'剪刀拉背训练器',level:'中级',tip:'双臂交替拉背，保持躯干稳定',svg:'row'},
  {id:'g_standing_row',name:'站姿俯身划船',part:'背',target:'背阔肌',equip:'龙门架',level:'中级',tip:'俯身45°，绳索拉向腹部，背阔发力',svg:'row'},
  {id:'g_one_arm_cable',name:'绳索单臂划船',part:'背',target:'单侧背阔',equip:'大龙门',level:'中级',tip:'单手握把，身体微旋转，挤压单侧背阔',svg:'row'},
  {id:'g_straight_arm',name:'直臂下压',part:'背',target:'背阔肌',equip:'大龙门',level:'中级',tip:'手臂微屈锁定，背阔带动绳向下压',svg:'pulldown'},
  {id:'g_deadlift',name:'传统硬拉',part:'背',target:'竖脊肌/背阔',equip:'杠铃/硬拉台',level:'高级',tip:'全程背挺直，杠铃贴腿，髋膝协同伸展',svg:'squat'},
  {id:'g_rdl',name:'罗马尼亚硬拉',part:'背',target:'腘绳肌/下背',equip:'杠铃',level:'中级',tip:'微屈膝，髋后移下放，感受腘绳肌拉伸',svg:'squat'},
  {id:'g_db_fly_back',name:'俯身哑铃飞鸟',part:'背',target:'三角肌后束',equip:'哑铃',level:'中级',tip:'俯身45°，肘微屈向两侧抬，练后束',svg:'facepull'},
  {id:'g_facepull',name:'绳索面拉',part:'背',target:'后束/肩外旋',equip:'大龙门',level:'初级',tip:'绳索拉向额头，外旋肩，练后束',svg:'facepull'},

  /* 腿 */
  {id:'g_squat',name:'杠铃深蹲',part:'腿',target:'股四头肌',equip:'深蹲架/奥杆',level:'高级',tip:'双脚与肩同宽，下蹲至大腿平行，膝盖沿脚尖方向',svg:'squat'},
  {id:'g_front_squat',name:'前蹲',part:'腿',target:'股四头肌',equip:'奥杆',level:'高级',tip:'杠铃置于锁骨前，躯干挺直，膝盖主导下蹲',svg:'squat'},
  {id:'g_hack_squat',name:'哈克深蹲',part:'腿',target:'股四头肌',equip:'哈克深蹲机',level:'中级',tip:'肩部顶住靠垫，下蹲至大腿平行，股四主导',svg:'legpress'},
  {id:'g_rhino_squat',name:'犀牛深蹲',part:'腿',target:'股四头肌',equip:'犀牛深蹲训练器',level:'中级',tip:'跟随器械轨迹下蹲，核心稳定',svg:'legpress'},
  {id:'g_machine_squat',name:'深蹲机',part:'腿',target:'股四头肌',equip:'深蹲机',level:'初级',tip:'背部贴紧，按器械轨迹下蹲站起',svg:'legpress'},
  {id:'g_legpress',name:'腿举',part:'腿',target:'股四头肌',equip:'倒蹬机/座式蹬腿',level:'初级',tip:'双脚置于踏板中段，下放至膝约90°，勿塌腰',svg:'legpress'},
  {id:'g_hack_press',name:'倒蹬',part:'腿',target:'股四头肌',equip:'倒蹬机',level:'初级',tip:'仰卧推起负重，膝盖沿脚尖，慢放快推',svg:'legpress'},
  {id:'g_bulgarian',name:'保加利亚分腿蹲',part:'腿',target:'股四头肌/臀',equip:'哑铃/可调凳',level:'中级',tip:'后脚搭凳，前腿下蹲至大腿平行',svg:'squat'},
  {id:'g_lunge',name:'哑铃箭步蹲',part:'腿',target:'股四头肌/臀',equip:'哑铃',level:'初级',tip:'向前迈步下蹲，前膝不内扣',svg:'squat'},
  {id:'g_step_up',name:'登阶',part:'腿',target:'股四头肌/臀',equip:'可调凳',level:'初级',tip:'单脚踏凳站起，臀部发力',svg:'squat'},
  {id:'g_leg_ext',name:'坐姿腿屈伸',part:'腿',target:'股四头肌',equip:'腿屈伸插片',level:'初级',tip:'勾脚尖，慢起慢落，顶峰收缩股四头',svg:'legcurl'},
  {id:'g_leg_curl',name:'俯卧腿弯举',part:'腿',target:'腘绳肌',equip:'俯卧曲腿训练器',level:'初级',tip:'俯卧，脚跟勾向臀部，练腘绳肌',svg:'legcurl'},
  {id:'g_hip_thrust_bar',name:'杠铃臀推',part:'腿',target:'臀大肌',equip:'杠铃/儒夫垫',level:'中级',tip:'肩背贴凳，顶髋至肩髋膝一线，顶峰夹臀',svg:'hipthrust'},
  {id:'g_hip_thrust_machine',name:'臀推机',part:'腿',target:'臀大肌',equip:'臀推机/训练器',level:'初级',tip:'背部贴紧靠垫，顶髋发力',svg:'hipthrust'},
  {id:'g_glute_kick',name:'臀部训练器',part:'腿',target:'臀大肌',equip:'臀部训练器',level:'初级',tip:'髋部固定，后踢收缩臀部',svg:'hipthrust'},
  {id:'g_hip_abduction',name:'髋外展',part:'腿',target:'臀中肌',equip:'内收外展插片',level:'初级',tip:'双腿向外打开，控制回放',svg:'hipab'},
  {id:'g_hip_adduction',name:'髋内收',part:'腿',target:'大腿内侧',equip:'内收外展插片',level:'初级',tip:'双腿向内夹拢，顶峰停顿',svg:'hipab'},
  {id:'g_outer_thigh',name:'大腿外侧训练',part:'腿',target:'臀中肌',equip:'大腿外侧训练器',level:'初级',tip:'外侧发力外展，控制回放',svg:'hipab'},
  {id:'g_abductor',name:'美臀机',part:'腿',target:'臀中肌',equip:'美臀机',level:'初级',tip:'坐姿外展，感受臀部外侧发力',svg:'hipab'},
  {id:'g_calf_raise',name:'站姿提踵',part:'腿',target:'小腿',equip:'器械/史密斯',level:'初级',tip:'踮脚至顶点停顿，慢落拉伸小腿',svg:'calf'},
  {id:'g_seated_calf',name:'坐姿提踵',part:'腿',target:'比目鱼肌',equip:'小腿训练器',level:'初级',tip:'膝盖负重，脚尖发力踮起',svg:'calf'},
  {id:'g_hyper',name:'山羊挺身',part:'腿',target:'腘绳肌/下背',equip:'罗马椅',level:'中级',tip:'髋部贴垫，身体下放后挺身，腘绳主导',svg:'hyper'},
  {id:'g_good_morning',name:'早安式',part:'腿',target:'腘绳肌/下背',equip:'杠铃',level:'中级',tip:'杠铃置于斜方肌，屈髋上半身前倾',svg:'squat'},

  /* 肩 */
  {id:'g_ohp',name:'站姿杠铃推举',part:'肩',target:'三角肌前束',equip:'奥杆',level:'中级',tip:'核心收紧，杠铃沿脸前方推过头顶',svg:'ohp'},
  {id:'g_seated_ohp',name:'坐式推肩',part:'肩',target:'三角肌前束',equip:'推肩训练器',level:'初级',tip:'背部贴紧，推举轨迹稳定',svg:'ohp'},
  {id:'g_shoulder_machine',name:'推肩训练器',part:'肩',target:'三角肌',equip:'推肩训练器',level:'初级',tip:'肩部发力推举，顶峰停顿',svg:'ohp'},
  {id:'g_arsenal_press',name:'阿森纳举肩',part:'肩',target:'三角肌',equip:'阿森纳举肩器械',level:'中级',tip:'跟随器械轨迹推举，控制节奏',svg:'ohp'},
  {id:'g_incline_lateral',name:'上斜举肩',part:'肩',target:'三角肌中束',equip:'上斜举肩器械',level:'中级',tip:'上斜姿势侧举，孤立中束',svg:'latraise'},
  {id:'g_db_lat',name:'哑铃侧平举',part:'肩',target:'三角肌中束',equip:'哑铃',level:'初级',tip:'肘微屈，向两侧抬至肩高，练中束',svg:'latraise'},
  {id:'g_machine_lat',name:'器械侧平举',part:'肩',target:'三角肌中束',equip:'侧平举器械',level:'初级',tip:'肘部固定，手臂外展至肩高',svg:'latraise'},
  {id:'g_cable_lat',name:'绳索侧平举',part:'肩',target:'三角肌中束',equip:'大龙门',level:'中级',tip:'低位绳索，单臂侧举，保持身体稳定',svg:'latraise'},
  {id:'g_front_raise',name:'哑铃前平举',part:'肩',target:'三角肌前束',equip:'哑铃',level:'初级',tip:'拳心向下，抬至肩前水平',svg:'latraise'},
  {id:'g_db_rear',name:'俯身哑铃侧平举',part:'肩',target:'三角肌后束',equip:'哑铃',level:'中级',tip:'俯身，向两侧抬，孤立后束',svg:'facepull'},
  {id:'g_rev_pec',name:'反向飞鸟',part:'肩',target:'三角肌后束',equip:'蝴蝶机/反向飞鸟',level:'中级',tip:'俯身，向两侧后展，练后束',svg:'facepull'},
  {id:'g_facepull_sh',name:'面拉',part:'肩',target:'后束/肩外旋',equip:'大龙门',level:'初级',tip:'绳索拉向额头，外旋肩',svg:'facepull'},
  {id:'g_arnold',name:'阿诺德推举',part:'肩',target:'三角肌整体',equip:'哑铃',level:'中级',tip:'推起时旋转手腕，全程控制',svg:'ohp'},
  {id:'g_upright_row',name:'杠铃 upright row',part:'肩',target:'三角肌中束',equip:'杠铃',level:'中级',tip:'提拉至胸口，肘部高于手腕',svg:'ohp'},

  /* 手臂 */
  {id:'g_bb_curl',name:'杠铃弯举',part:'手臂',target:'肱二头肌',equip:'杠铃/曲杆',level:'初级',tip:'大臂贴身，弯举至胸前，慢放',svg:'curl'},
  {id:'g_db_curl',name:'哑铃弯举',part:'手臂',target:'肱二头肌',equip:'哑铃',level:'初级',tip:'大臂固定，掌心向上弯举',svg:'curl'},
  {id:'g_hammer',name:'哑铃锤式弯举',part:'手臂',target:'肱肌',equip:'哑铃',level:'初级',tip:'拳眼向上，练肱肌与肱桡肌',svg:'curl'},
  {id:'g_preacher',name:'牧师凳弯举',part:'手臂',target:'肱二头肌',equip:'牧师凳/杠铃',level:'中级',tip:'肘部固定于斜板，孤立二头',svg:'curl'},
  {id:'g_machine_curl',name:'二头肌训练器',part:'手臂',target:'肱二头肌',equip:'二头肌训练器',level:'初级',tip:'肘部固定，集中收缩二头肌',svg:'curl'},
  {id:'g_conc_curl',name:'集中弯举',part:'手臂',target:'肱二头肌',equip:'哑铃',level:'中级',tip:'肘抵大腿内侧，孤立二头',svg:'curl'},
  {id:'g_tri_push',name:'绳索三头下压',part:'手臂',target:'肱三头肌',equip:'三头下压/龙门架',level:'初级',tip:'大臂贴身，下压至手臂伸直',svg:'triext'},
  {id:'g_machine_tri',name:'三头下压训练器',part:'手臂',target:'肱三头肌',equip:'三头下压训练器',level:'初级',tip:'肘部固定，手臂下压伸直',svg:'triext'},
  {id:'g_45_tri',name:'45°三头肌训练',part:'手臂',target:'肱三头肌',equip:'45°三头肌训练器',level:'中级',tip:'俯卧，肘部固定，手臂伸直',svg:'triext'},
  {id:'g_zero_tri',name:'零度三头曲伸',part:'手臂',target:'肱三头肌',equip:'零度三头曲伸训练器',level:'中级',tip:'手臂在胸前屈伸，孤立三头',svg:'triext'},
  {id:'g_db_ext',name:'仰卧臂屈伸',part:'手臂',target:'肱三头肌',equip:'哑铃',level:'中级',tip:'双臂 overhead 弯举下放至额头，伸直三头',svg:'triext'},
  {id:'g_oh_ext',name:'过顶臂屈伸',part:'手臂',target:'肱三头肌长头',equip:'哑铃',level:'中级',tip:'单臂举过头顶，屈肘下放，练三头长头',svg:'triext'},
  {id:'g_close_bench',name:'窄距卧推',part:'手臂',target:'肱三头肌',equip:'杠铃',level:'中级',tip:'双手间距一拳，肘贴身，练三头',svg:'press'},
  {id:'g_dip_tri',name:'双杠臂屈伸',part:'手臂',target:'肱三头肌',equip:'双杠',level:'中级',tip:'身体直立，下放至大臂平行，三头发力推起',svg:'hangleg'},

  /* 核心 */
  {id:'g_crunch',name:'卷腹',part:'核心',target:'腹直肌',equip:'瑜伽垫/腹肌板',level:'初级',tip:'下背贴地，上腹卷起，颈放松',svg:'crunch'},
  {id:'g_machine_crunch',name:'卷腹机',part:'核心',target:'腹直肌',equip:'卷腹机',level:'初级',tip:'胸部贴靠垫，腹部发力卷曲',svg:'crunch'},
  {id:'g_ab_coaster',name:'腹部前屈训练器',part:'核心',target:'腹直肌',equip:'腹部前屈训练器',level:'初级',tip:'膝盖固定，上半身前屈收缩腹肌',svg:'crunch'},
  {id:'g_plank',name:'平板支撑',part:'核心',target:'腹横肌',equip:'瑜伽垫',level:'初级',tip:'肘肩垂直，身体成板，收紧核心',svg:'crunch'},
  {id:'g_hang_leg',name:'悬垂举腿',part:'核心',target:'下腹',equip:'双杠提膝',level:'中级',tip:'悬吊，骨盆后倾抬腿至水平',svg:'hangleg'},
  {id:'g_russian',name:'俄罗斯转体',part:'核心',target:'腹斜肌',equip:'瑜伽垫',level:'初级',tip:'坐姿后倾，左右转体触地',svg:'crunch'},
  {id:'g_deadbug',name:'死虫',part:'核心',target:'腹横肌',equip:'瑜伽垫',level:'初级',tip:'仰卧对侧手脚伸展，腰贴地',svg:'crunch'},
  {id:'g_mountain',name:'登山者',part:'核心',target:'腹直肌',equip:'瑜伽垫',level:'初级',tip:'平板位交替提膝至胸',svg:'crunch'},
  {id:'g_back_ext',name:'山羊挺身',part:'核心',target:'竖脊肌',equip:'罗马椅',level:'中级',tip:'髋部固定，挺身收紧下背',svg:'hyper'},

  /* 有氧/全身 */
  {id:'g_run',name:'跑步机',part:'有氧',target:'心肺耐力',equip:'跑步机',level:'初级',tip:'保持节奏，落地轻，心率Zone2-3',svg:'cardio'},
  {id:'g_elliptical',name:'椭圆仪',part:'有氧',target:'心肺耐力',equip:'椭圆仪',level:'初级',tip:'全脚掌踩实，挺胸，手脚协调',svg:'cardio'},
  {id:'g_stairs',name:'爬楼机',part:'有氧',target:'心肺/臀腿',equip:'爬楼机',level:'初级',tip:'全脚掌踩台阶，身体微前倾',svg:'cardio'},
  {id:'g_rower',name:'划船机',part:'有氧',target:'心肺/背',equip:'划船机',level:'初级',tip:'腿-核心-臂顺序发力，回程慢',svg:'row'},
  {id:'g_bike',name:'动感单车',part:'有氧',target:'心肺耐力',equip:'动感单车',level:'初级',tip:'阻力适中，踩踏顺畅',svg:'cardio'},
  {id:'g_battle_rope',name:'战绳',part:'有氧',target:'爆发力/心肺',equip:'有氧区',level:'中级',tip:'核心稳定，双臂交替波浪',svg:'cardio'},
  {id:'g_kb_swing',name:'壶铃摇摆',part:'有氧',target:'臀腿/心肺',equip:'竞技壶铃',level:'中级',tip:'髋部爆发前推，手臂被动摆动',svg:'kb'},
  {id:'g_kb_squat',name:'壶铃深蹲',part:'有氧',target:'臀腿',equip:'竞技壶铃',level:'初级',tip:'双手持壶铃于胸前，下蹲至大腿平行',svg:'kb'},
  {id:'g_foam_roll',name:'泡沫轴放松',part:'拉伸',target:'筋膜放松',equip:'泡沫轴',level:'初级',tip:'缓慢滚动，痛点停留15-30秒',svg:'band'},
];

// 辅助：部位列表
const GYM_PARTS = ['全部','胸','背','腿','肩','手臂','核心','有氧'];
const GYM_TARGETS = {
  '全部': [],
  '胸': ['全部','胸大肌','上胸','下胸','胸肌中缝'],
  '背': ['全部','背阔肌','背阔肌下沿','上背宽度','下背阔','中背','单侧背阔','竖脊肌','三角肌后束'],
  '腿': ['全部','股四头肌','腘绳肌','臀大肌','臀中肌','大腿内侧','小腿','下背'],
  '肩': ['全部','三角肌前束','三角肌中束','三角肌后束','三角肌整体'],
  '手臂': ['全部','肱二头肌','肱肌','肱三头肌','肱三头肌长头'],
  '核心': ['全部','腹直肌','腹横肌','下腹','腹斜肌','竖脊肌'],
  '有氧': ['全部','心肺耐力','臀腿','爆发力','背']
};

// 兼容别名
const BUILTIN = GYM_EXERCISES;
const PARTS = GYM_PARTS;
