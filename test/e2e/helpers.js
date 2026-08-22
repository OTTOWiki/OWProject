/**
 * Playwright e2e 公共助手。
 * - 不使用 owDebug.next() 推进对话（该调用不写录像快照，回放会卡对话）。
 * - rAF 在后台标签可能节流：测试内用 expect.poll / waitForFunction，别用页内长 setTimeout 等帧。
 */

/** 等待 boot 完成：owDebug 就绪（main.js 在 Game 构造后 installDebug） */
export async function waitForGameReady(page) {
  await page.waitForFunction(() => typeof window.owDebug === 'function');
}

/** 清空本测试域的 localStorage 与录像 IndexedDB，保证用例独立 */
export async function cleanStorage(page) {
  await page.evaluate(async () => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('gunwei_')) localStorage.removeItem(key);
    }
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('owproject-replays');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
}

/**
 * 用 debug 直接跳到指定章节并开无敌/锁资源/跳对话。
 * 与 MCP 手测同路径：适合冒烟弹幕/绘制/池/EX mid，不做精确回放断言。
 */
export async function startGame(page, { chapter = 129, timeScale = 3 } = {}) {
  await page.evaluate(([cid, ts]) => {
    owDebug.set({
      invincible: true,
      lockBombs: true,
      lockLives: true,
      timeScale: ts,
      skipDialogue: true,
    });
    owDebug.softJump(cid);
  }, [chapter, timeScale]);
}

/** 当前 debug HUD 的 en/bul 总和（无 HUD 时为 0） */
export async function debugEnemyBulletCount(page) {
  const hud = await page.locator('#debug-hud').textContent();
  const m = hud?.match(/en (\d+) bul (\d+)/);
  return m ? Number(m[1]) + Number(m[2]) : 0;
}

/** 画布是否非空白（抽 64×64 采样） */
export async function canvasNonBlank(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('playfield');
    if (!canvas) return false;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(canvas, 0, 0, 64, 64);
    const data = g.getImageData(0, 0, 64, 64).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
    return sum > 0;
  });
}

/**
 * 退出回放：优先 Esc；若回放已自然结束（此时仅 Enter/Z/Space 退出），补按 Enter。
 */
export async function exitReplay(page) {
  await page.keyboard.press('Escape');
  const exited = await page
    .waitForSelector('#screen-replay.active', { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!exited) {
    await page.keyboard.press('Enter');
    await page.waitForSelector('#screen-replay.active', { timeout: 4000 });
  }
}
