/**
 * 立绘 / Boss 贴图策略（T18）
 */
import {
  PORTRAIT_PATHS, PORTRAIT_HIDDEN_OK, portraitFor, hasPortrait, isPortraitPolicyOk,
} from '../js/assets.js';
import {
  DEDICATED_BOSS_BY_KIND, PLACEHOLDER_BOSS_SPRITES,
  spriteKeyForEnemy, isPlaceholderBossKind, isGeometryBossKind,
} from '../js/sprites.js';
import { getDialogues } from '../js/dialogue.js';
import { SPEAKER_COLORS } from '../js/config.js';
import { test, assert, assertEqual } from './assert.js';

const DYNAMIC_SPEAKERS = new Set(['饮泉思源', '誓约沙玛']); // me / partner 随自机

function collectDialogueSpeakers() {
  const names = new Set();
  for (const pid of ['yinquan', 'shama']) {
    const bag = getDialogues(pid);
    for (const lines of Object.values(bag)) {
      if (!Array.isArray(lines)) continue;
      for (const line of lines) {
        if (line?.name) names.add(line.name);
      }
    }
  }
  return names;
}

test('PORTRAIT_PATHS 与 HIDDEN_OK 无重叠；portraitFor 无借图', () => {
  for (const name of Object.keys(PORTRAIT_PATHS)) {
    assert(!PORTRAIT_HIDDEN_OK.has(name), `${name} cannot be both path and hidden-ok`);
    assert(hasPortrait(name));
    assert(portraitFor(name)?.startsWith('assets/portraits/'));
  }
  assertEqual(portraitFor('门百梁'), null);
  assertEqual(portraitFor('系统'), null);
  assertEqual(portraitFor('不存在角色'), null);
  assert(isPortraitPolicyOk('门百梁'));
  assert(isPortraitPolicyOk('爱丽丝'));
  assert(!isPortraitPolicyOk('未登记新角色XYZ'));
});

test('对话说话人满足立绘策略（有图或 HIDDEN_OK 或自机动态名）', () => {
  const speakers = collectDialogueSpeakers();
  assert(speakers.size > 10, 'too few speakers');
  for (const name of speakers) {
    if (DYNAMIC_SPEAKERS.has(name)) {
      assert(hasPortrait(name), `player speaker ${name} should have portrait`);
      continue;
    }
    assert(
      isPortraitPolicyOk(name),
      `speaker '${name}' needs PORTRAIT_PATHS or PORTRAIT_HIDDEN_OK`,
    );
  }
  // SPEAKER_COLORS 覆盖对话角色（系统/旁白也在）
  for (const name of speakers) {
    if (DYNAMIC_SPEAKERS.has(name)) continue;
    assert(
      SPEAKER_COLORS[name] || DYNAMIC_SPEAKERS.has(name),
      `speaker '${name}' missing SPEAKER_COLORS (optional warn-level)`,
    );
  }
});

test('Boss kind：专用 / 占位 / 几何 互斥且无静默爱丽丝回落', () => {
  assertEqual(spriteKeyForEnemy({ type: 'boss', kind: 'alice' }), 'boss_alice');
  assertEqual(spriteKeyForEnemy({ type: 'boss', kind: 'patrol' }), 'boss_patrol');
  assertEqual(spriteKeyForEnemy({ type: 'boss', kind: 'menbailiang' }), 'boss_menbailiang');
  assert(isPlaceholderBossKind('menbailiang'));
  assert(!isPlaceholderBossKind('alice'));

  // EX van：显式几何
  assertEqual(spriteKeyForEnemy({ type: 'boss', kind: 'van' }), null);
  assert(isGeometryBossKind('van'));
  assertEqual(spriteKeyForEnemy({ type: 'boss', kind: 'ex_mid' }), null);

  // 未知 kind：几何，禁止默认 alice
  assertEqual(spriteKeyForEnemy({ type: 'boss', kind: 'unknown_future' }), null);
  assert(isGeometryBossKind('unknown_future'));

  // 专用与占位表不交叉
  for (const k of Object.keys(DEDICATED_BOSS_BY_KIND)) {
    assert(
      !Object.prototype.hasOwnProperty.call(PLACEHOLDER_BOSS_SPRITES, k),
      `kind ${k} in both dedicated and placeholder`,
    );
  }

  // 杂兵
  assertEqual(spriteKeyForEnemy({ type: 'mob', kind: 'generic' }), 'enemy_mob');
  assertEqual(spriteKeyForEnemy({ type: 'elite', kind: 'mid1' }), 'enemy_mid1');
});

test('PLACEHOLDER 路径复用有注释可查的 key', () => {
  for (const [kind, key] of Object.entries(PLACEHOLDER_BOSS_SPRITES)) {
    if (key == null) continue;
    assert(typeof key === 'string' && key.startsWith('boss_'), `placeholder ${kind}`);
    assertEqual(spriteKeyForEnemy({ type: 'boss', kind }), key);
  }
});
