/**
 * 排行榜纯函数测试（不触 localStorage 的部分）
 */
import { RANKING_LIMIT } from '../js/config.js';
import { qualifies, rankFor, submitEntry, normalizeName } from '../js/ranking.js';
import { test, assert, assertEqual } from './assert.js';

test('normalizeName：截断 3 字 / 去控制字符 / 回落', () => {
  assertEqual(normalizeName('饮泉思源'), '饮泉思');
  assertEqual(normalizeName('AB'), 'AB');
  assertEqual(normalizeName('  a b c d  '), 'a b');
  assertEqual(normalizeName('\u0000x'), 'x');
  assertEqual(normalizeName(''), 'PLAYER');
  assertEqual(normalizeName('', '沙玛'), '沙玛');
});

test('qualifies / rankFor：不足上限或高于末位', () => {
  const list = [{ score: 100, date: 1 }];
  assert(qualifies(list, 50));
  assertEqual(rankFor(list, 50), 1);
  assertEqual(rankFor(list, 200), 0);

  const full = Array.from({ length: RANKING_LIMIT }, (_, i) => ({ score: 100 - i, date: i }));
  assert(!qualifies(full, 0));
  assertEqual(rankFor(full, 0), -1);
  assert(qualifies(full, 999));
  assertEqual(rankFor(full, 999), 0);
});

test('submitEntry：降序 + 同分日期更早在前 + 截断上限', () => {
  const ranking = {};
  const a = { score: 100, date: 5, id: 'a' };
  const b = { score: 200, date: 1, id: 'b' };
  const c = { score: 100, date: 2, id: 'c' };
  submitEntry(ranking, 'normal', a);
  submitEntry(ranking, 'normal', b);
  submitEntry(ranking, 'normal', c);
  const list = ranking.normal;
  assertEqual(list.length, 3);
  assertEqual(list[0].id, 'b');
  assertEqual(list[1].id, 'c');
  assertEqual(list[2].id, 'a');

  for (let i = 0; i < RANKING_LIMIT + 5; i++) {
    submitEntry(ranking, 'easy', { score: i, date: i, id: `e${i}` });
  }
  assertEqual(ranking.easy.length, RANKING_LIMIT);
  assertEqual(ranking.easy[0].id, `e${RANKING_LIMIT + 4}`);
});
