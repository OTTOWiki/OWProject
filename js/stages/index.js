import { chapters as s1 } from './s1_alice.js';
import { chapters as s2 } from './s2_icebin.js';
import { chapters as s3 } from './s3_dazong.js';
import { chapters as patrol } from './s_patrol.js';
import { chapters as a4 } from './a4_menbailiang.js';
import { chapters as a5 } from './a5_rival.js';
import { chapters as a6 } from './a6_yimeige.js';
import { chapters as b4 } from './b4_duren.js';
import { chapters as b5 } from './b5_gundian.js';
import { chapters as b6 } from './b6_lastgod.js';
import { chapters as ex } from './ex_van.js';

import { stageSelectEntry as se_s1 } from './s1_alice.js';
import { stageSelectEntry as se_s2 } from './s2_icebin.js';
import { stageSelectEntry as se_s3 } from './s3_dazong.js';
import { stageSelectEntry as se_patrol } from './s_patrol.js';
import { stageSelectEntry as se_a4 } from './a4_menbailiang.js';
import { stageSelectEntry as se_a5 } from './a5_rival.js';
import { stageSelectEntry as se_a6 } from './a6_yimeige.js';
import { stageSelectEntry as se_b4 } from './b4_duren.js';
import { stageSelectEntry as se_b5 } from './b5_gundian.js';
import { stageSelectEntry as se_b6 } from './b6_lastgod.js';
import { stageSelectEntry as se_ex } from './ex_van.js';

export function buildChapterList() {
  return [
    ...s1, ...s2, ...s3, ...patrol,
    ...a4, ...a5, ...a6,
    ...b4, ...b5, ...b6,
    ...ex,
  ];
}

export function stageIntroFor(stageKey) {
  const key = String(stageKey);
  const map = {
    '1':    { label: '第1面', desc: '维基外围漂浮零散草稿与未审核错字杂鱼抵抗，测试来者编辑执念。', arc: '门构皮蒂娅' },
    '2':    { label: '第2面', desc: '系统日志捕捉高强度编辑活动，编译防火墙启动，对探访者发起阻止性校验。', arc: '门构皮蒂娅' },
    '3':    { label: '第3面', desc: '前方数据流彻底分化——左为冰冷商业铬网，右为混沌无序暖色。用编辑力打破主防火墙以获选路权。', arc: '门构皮蒂娅' },
    'patrol':{ label: '中立拦截', desc: '立场摇摆不定——全域巡查姬介入，以无差别封锁与存在抹消强制执行审判。', arc: '　' },
    'A4':   { label: 'A线 第4面', desc: '踏入门构皮蒂娅——金色方尖碑阵列缓缓旋转，客服腔嘴硬地向来客推销通行券。', arc: '门构皮蒂娅' },
    'A5':   { label: 'A线 第5面', desc: '蓝白与粉红能量涡旋对撞。昔日同伴因署名归属争执不下，编辑战在数据中炸开。', arc: '门构皮蒂娅' },
    'A6':   { label: 'A线 第6面', desc: '糖果外衣剥落，哈机密乐园扭曲崩坏。苦口婆心的言语间，埋藏着将维基变为私人领域的真实意图。', arc: '门构皮蒂娅' },
    'B4':   { label: 'B线 第4面', desc: '踏入善雅乡——独轮沿螺旋轨迹碾压，狂妄哲学臆想与"创"字诀如潮水般涌来。', arc: '善雅乡' },
    'B5':   { label: 'B线 第5面', desc: '街角暗巷霓虹闪烁，破皮鞋敲击地面。推退反问与嘴硬甩锅谱成一曲傲娇戏谑。', arc: '善雅乡' },
    'B6':   { label: 'B线 第6面', desc: '虾油黄绿迷雾弥漫，宝瓶碎裂。防御塔黑影从雾中浮现，炫妈的温度与味道遮蔽了一切。', arc: '善雅乡' },
    'EX':   { label: 'Extra', desc: 'van♂键政灌输。单关：道中 → 道中Boss → van♂。强度 0.8 · 章时减半。', arc: '键政覆写' },
  };
  return map[key] || null;
}

export function stageSelectEntries() {
  return [
    se_s1, se_s2, se_s3, se_patrol,
    se_a4, se_a5, se_a6,
    se_b4, se_b5, se_b6,
    se_ex,
  ];
}
