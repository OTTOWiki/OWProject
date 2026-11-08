/**
 * 停帧（hit-stop）期间的战斗边沿输入缓冲。
 *
 * 停帧块跳过 updateCombat，但 endFrame() 仍会清空 pressed / bombTap / itemTap；
 * 未缓冲时 Z（单击发射）/ X / C 会在停帧期间被吞掉。capture 在停帧块照样记录，
 * consume 等真正推进战斗的那一块才取走。
 */
import { test, assertEqual } from './assert.js';
import {
  createCombatEdges,
  captureCombatEdges,
  consumeCombatEdges,
  clearCombatEdges,
} from '../js/combatEdges.js';

function fakeInput({ bomb = false, item = false } = {}) {
  const input = {
    toggles: 0,
    bomb,
    item,
    bombPressed() { return this.bomb; },
    itemPressed() { return this.item; },
    updateShotToggle() { this.toggles += 1; },
  };
  return input;
}

test('停帧边沿：bomb/item 跨多个逻辑块保留，消费一次后清零', () => {
  const edges = createCombatEdges();
  const input = fakeInput({ bomb: true, item: true });
  captureCombatEdges(edges, input);

  // 后续停帧块已没有新的按下（endFrame 清过边沿），缓冲不能丢
  input.bomb = false;
  input.item = false;
  captureCombatEdges(edges, input);

  const first = consumeCombatEdges(edges);
  assertEqual(first.bomb, true, 'bomb 边沿跨停帧保留');
  assertEqual(first.item, true, 'item 边沿跨停帧保留');

  const second = consumeCombatEdges(edges);
  assertEqual(second.bomb, false, 'bomb 只消费一次');
  assertEqual(second.item, false, 'item 只消费一次');
});

test('停帧边沿：每个逻辑块仍翻转单击发射锁存', () => {
  const edges = createCombatEdges();
  const input = fakeInput();
  captureCombatEdges(edges, input);
  captureCombatEdges(edges, input);
  assertEqual(input.toggles, 2, '停帧块也要走 updateShotToggle');
});

test('停帧边沿：clear 丢弃未消费的按键（暂停 / 离开对局）', () => {
  const edges = createCombatEdges();
  captureCombatEdges(edges, fakeInput({ bomb: true, item: true }));
  clearCombatEdges(edges);
  const out = consumeCombatEdges(edges);
  assertEqual(out.bomb, false);
  assertEqual(out.item, false);
});
