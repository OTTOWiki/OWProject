import { chapters as s1 } from './s1_alice.js';
import { chapters as s2 } from './s2_icebin.js';
import { chapters as s3 } from './s3_dazong.js';
import { chapters as patrol } from './s_patrol.js';
import { chapters as a4 } from './a4/index.js';
import { chapters as a5 } from './a5/index.js';
import { chapters as a6 } from './a6/index.js';
import { chapters as b4 } from './b4/index.js';
import { chapters as b5 } from './b5/index.js';
import { chapters as b6 } from './b6/index.js';
import { chapters as ex } from './ex_van.js';

import { stageSelectEntry as se_s1 } from './s1_alice.js';
import { stageSelectEntry as se_s2 } from './s2_icebin.js';
import { stageSelectEntry as se_s3 } from './s3_dazong.js';
import { stageSelectEntry as se_patrol } from './s_patrol.js';
import { stageSelectEntry as se_a4 } from './a4/index.js';
import { stageSelectEntry as se_a5 } from './a5/index.js';
import { stageSelectEntry as se_a6 } from './a6/index.js';
import { stageSelectEntry as se_b4 } from './b4/index.js';
import { stageSelectEntry as se_b5 } from './b5/index.js';
import { stageSelectEntry as se_b6 } from './b6/index.js';
import { stageSelectEntry as se_ex } from './ex_van.js';

export function buildChapterList() {
  return [
    ...s1, ...s2, ...s3, ...patrol,
    ...a4, ...a5, ...a6,
    ...b4, ...b5, ...b6,
    ...ex,
  ];
}

/**
 * 关卡（面）间过渡页文案
 * poem: 诗意过场提示（可多行，用 \n 分隔）
 */
export function stageIntroFor(stageKey) {
  const key = String(stageKey);
  const map = {
    '1': {
      label: '第1面',
      arc: '门构皮蒂娅',
      poem: '草稿如落雪，在审核的边缘漂泊。\n未竟的词条低语，试探来者的执念。',
    },
    '2': {
      label: '第2面',
      arc: '门构皮蒂娅',
      poem: '日志翻涌成潮，防火墙亮起冷光。\n每一次编辑，都被系统悄悄记下。',
    },
    '3': {
      label: '第3面',
      arc: '门构皮蒂娅',
      poem: '数据在此分叉——\n一侧铬光冰冷，一侧暖色混沌。\n打破主防火墙，方能择路而行。',
    },
    patrol: {
      label: '中立拦截',
      arc: '全域巡查',
      poem: '立场未定，天平无语。\n巡查姬自虚空落下，\n以抹消之名，行无差别之审判。',
    },
    A4: {
      label: 'A线 第4面',
      arc: '门构皮蒂娅',
      poem: '金色方尖碑缓缓回转，\n客服腔的问候如蜜似刀。\n通行券的价格，写在看不见的条款里。',
    },
    A5: {
      label: 'A线 第5面',
      arc: '门构皮蒂娅',
      poem: '蓝白与粉红在涡旋中对撞。\n昔日并肩的署名，如今成为战场。\n编辑战无声，却比枪火更烈。',
    },
    A6: {
      label: 'A线 第6面',
      arc: '门构皮蒂娅',
      poem: '糖果外衣剥落，乐园露出锈迹。\n苦口婆心的言语深处，\n藏着将整座维基据为己有的野心。',
    },
    B4: {
      label: 'B线 第4面',
      arc: '善雅乡',
      poem: '独轮碾过螺旋的街巷，\n狂妄的哲思与「创」字诀\n如潮水，漫过脚踝。',
    },
    B5: {
      label: 'B线 第5面',
      arc: '善雅乡',
      poem: '暗巷霓虹一明一灭，\n破皮鞋叩地有声。\n推诿、反问与甩锅，谱成一曲傲娇的戏谑。',
    },
    B6: {
      label: 'B线 第6面',
      arc: '善雅乡',
      poem: '虾油色的雾气升起，宝瓶碎裂无声。\n防御塔的黑影自雾中浮现——\n炫妈的温度与味道，遮蔽了一切。',
    },
    EX: {
      label: 'Extra',
      arc: '键政覆写',
      poem: 'van♂的键政灌入数据洪流。\n道中、道中Boss，再到本尊——\n强度收敛，章时减半，覆写仍在继续。',
    },
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
