/**
 * 菜单按住重复（H9）：与操作系统连发速率解耦。
 *
 * 首次按键立即生效；按住超过 `firstMs` 后，每 `rateMs` 触发一次重复。
 * 只用于菜单导航；确认/返回/删除始终走边沿触发。
 * 计时器可注入，便于单测。
 */

export const MENU_REPEAT_DEFAULTS = Object.freeze({ firstMs: 350, rateMs: 80 });

/**
 * @param {{ firstMs?: number, rateMs?: number,
 *   setTimeout?: (fn: () => void, ms: number) => unknown,
 *   clearTimeout?: (id: unknown) => void }} [options]
 */
export function createRepeatScheduler(options = {}) {
  const firstMs = options.firstMs ?? MENU_REPEAT_DEFAULTS.firstMs;
  const rateMs = options.rateMs ?? MENU_REPEAT_DEFAULTS.rateMs;
  const schedule = options.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.clearTimeout || ((id) => clearTimeout(id));

  /** @type {{ code: string, timer: unknown } | null} */
  let active = null;

  function stop() {
    if (!active) return;
    cancel(active.timer);
    active = null;
  }

  /**
   * @param {string} code 当前按住的导航键
   * @param {(code: string) => void} onRepeat
   */
  function start(code, onRepeat) {
    stop();
    const tick = () => {
      if (!active || active.code !== code) return;
      onRepeat(code);
      if (!active || active.code !== code) return;
      active.timer = schedule(tick, rateMs);
    };
    active = { code, timer: schedule(tick, firstMs) };
  }

  return {
    start,
    stop,
    /** 当前正在重复的键；无则 null */
    get code() { return active ? active.code : null; },
  };
}
