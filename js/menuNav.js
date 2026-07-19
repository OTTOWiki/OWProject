/**
 * 菜单键盘导航：键位判定 + 通用列表/网格/表单处理。
 * 各屏幕只提供 items / index / 回调，不再复制 keydown 分支。
 */

export function isConfirm(e) {
  return e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'Space';
}

export function isBack(e) {
  return e.code === 'Escape' || e.code === 'KeyX';
}

export function isNavNext(e) {
  return e.code === 'ArrowDown' || e.code === 'KeyS';
}

export function isNavPrev(e) {
  return e.code === 'ArrowUp' || e.code === 'KeyW';
}

export function isNavRight(e) {
  return e.code === 'ArrowRight' || e.code === 'KeyD';
}

export function isNavLeft(e) {
  return e.code === 'ArrowLeft' || e.code === 'KeyA';
}

export function isFormField(el) {
  if (!el || el === document.body) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export function blurActiveField() {
  const ae = document.activeElement;
  if (isFormField(ae)) ae.blur();
}

export function clampIndex(i, n) {
  if (n <= 0) return 0;
  return Math.max(0, Math.min(i, n - 1));
}

export function wrapIndex(i, n) {
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
}

/** 在一组元素上切换 .selected */
export function highlightButtons(els, index) {
  els.forEach((b, i) => b?.classList.toggle('selected', i === index));
}

/**
 * 线性列表：↑↓（及可选 ←→）移动焦点，Z/Enter 确认，Esc/X 返回。
 * @returns {boolean} 是否已处理
 */
export function handleListKey(e, {
  count,
  index,
  setIndex,
  highlight,
  onConfirm,
  onBack,
  /** 同时用左右键移动（主菜单/难度/结果等） */
  useHorizontal = true,
}) {
  if (!count) {
    if (onBack && isBack(e)) {
      e.preventDefault();
      onBack();
      return true;
    }
    return false;
  }

  const goNext = isNavNext(e) || (useHorizontal && isNavRight(e));
  const goPrev = isNavPrev(e) || (useHorizontal && isNavLeft(e));

  if (goNext) {
    e.preventDefault();
    setIndex(wrapIndex(index + 1, count));
    highlight();
    return true;
  }
  if (goPrev) {
    e.preventDefault();
    setIndex(wrapIndex(index - 1, count));
    highlight();
    return true;
  }
  if (isConfirm(e) && onConfirm) {
    e.preventDefault();
    onConfirm();
    return true;
  }
  if (isBack(e) && onBack) {
    e.preventDefault();
    onBack();
    return true;
  }
  return false;
}

/**
 * 列表屏描述符：getItems + 焦点下标 + 确认/返回。
 * 默认确认 = 点击当前项 DOM（元素本身或 item.el）。
 * @returns {boolean}
 */
export function handleListScreen(e, {
  getItems,
  index,
  setIndex,
  highlight,
  onConfirm,
  onBack,
  useHorizontal = true,
  /** @type {(item: unknown, index: number, items: unknown[]) => HTMLElement | null | undefined} */
  resolveClickEl = (item) => (item && typeof item === 'object' && 'el' in item ? item.el : item),
}) {
  const items = getItems() || [];
  return handleListKey(e, {
    count: items.length,
    index,
    setIndex,
    highlight: () => highlight?.(items),
    onConfirm: () => {
      if (onConfirm) {
        onConfirm(items[index], index, items);
        return;
      }
      resolveClickEl(items[index], index, items)?.click?.();
    },
    onBack,
    useHorizontal,
  });
}

/**
 * 选关网格：行列步进 + 底部「返回」
 * items: [{ type: 'stage'|'button', el }]，stage 在前、button 在后
 */
export function handleStageGridKey(e, {
  items,
  index,
  setIndex,
  highlight,
  onConfirm,
  onBack,
  gridEl,
  colWidth = 150,
}) {
  const n = items.length;
  if (!n) {
    if (isBack(e) && onBack) {
      e.preventDefault();
      onBack();
      return true;
    }
    return false;
  }

  const stageCount = items.filter((it) => it.type === 'stage').length;
  const cols = Math.max(1, Math.min(stageCount || 1, Math.floor(
    (gridEl?.clientWidth || 400) / colWidth,
  ) || 2));
  const onBackBtn = items[index]?.type === 'button';

  if (isNavRight(e)) {
    e.preventDefault();
    if (!onBackBtn && stageCount > 0) {
      setIndex((index + 1) % stageCount);
    }
    highlight();
    return true;
  }
  if (isNavLeft(e)) {
    e.preventDefault();
    if (!onBackBtn && stageCount > 0) {
      setIndex((index - 1 + stageCount) % stageCount);
    }
    highlight();
    return true;
  }
  if (isNavNext(e)) {
    e.preventDefault();
    if (onBackBtn) {
      if (stageCount > 0) setIndex(0);
    } else {
      const next = index + cols;
      if (next >= stageCount) {
        setIndex(stageCount < n ? stageCount : Math.min(n - 1, index));
      } else {
        setIndex(next);
      }
    }
    highlight();
    return true;
  }
  if (isNavPrev(e)) {
    e.preventDefault();
    if (onBackBtn) {
      setIndex(Math.max(0, stageCount - 1));
    } else {
      setIndex(Math.max(0, index - cols));
    }
    highlight();
    return true;
  }
  if (isConfirm(e) && onConfirm) {
    e.preventDefault();
    onConfirm();
    return true;
  }
  if (isBack(e) && onBack) {
    e.preventDefault();
    onBack();
    return true;
  }
  return false;
}

/**
 * 表单屏（练习 / 设置）：↑↓ 移焦点，←→ 调值或在按钮间切换，确认/返回。
 * 数字框获得焦点时可直接键入；导航键才 blur 并交回菜单焦点。
 * @param {'practice'|'settings'} mode
 */
export function handleFormListKey(e, {
  mode,
  items,
  index,
  setIndex,
  highlight,
  adjustItem,
  activateItem,
  onBack,
}) {
  if (!items.length) return false;

  const ae = document.activeElement;
  const editingNumber = ae
    && ae.tagName === 'INPUT'
    && (ae.type === 'number' || ae.type === 'text');
  const editingSelect = ae && ae.tagName === 'SELECT';

  // 输入框/下拉处于焦点：放行键入；仅导航键切回菜单控制
  if (editingNumber || editingSelect) {
    if (isNavNext(e) || isNavPrev(e)) {
      e.preventDefault();
      ae.blur();
      setIndex(wrapIndex(index + (isNavNext(e) ? 1 : -1), items.length));
      highlight();
      return true;
    }
    if (isBack(e) && onBack) {
      e.preventDefault();
      ae.blur();
      onBack();
      return true;
    }
    if (isConfirm(e)) {
      e.preventDefault();
      ae.blur();
      return true;
    }
    // 数字框：方向键交给浏览器（光标/步进）；A/D 仍走菜单调值
    if (editingNumber && (e.code === 'ArrowLeft' || e.code === 'ArrowRight'
      || e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      return false;
    }
    if (editingSelect && (isNavLeft(e) || isNavRight(e)
      || e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
      return false;
    }
    if (isNavLeft(e) || isNavRight(e)) {
      e.preventDefault();
      ae.blur();
      const dir = isNavRight(e) ? 1 : -1;
      adjustItem?.(items[index], dir, e);
      return true;
    }
    // 数字、退格等：不拦截
    return false;
  }

  blurActiveField();

  if (isNavNext(e)) {
    e.preventDefault();
    setIndex(wrapIndex(index + 1, items.length));
    highlight();
    return true;
  }
  if (isNavPrev(e)) {
    e.preventDefault();
    setIndex(wrapIndex(index - 1, items.length));
    highlight();
    return true;
  }
  if (isNavLeft(e) || isNavRight(e)) {
    e.preventDefault();
    const dir = isNavRight(e) ? 1 : -1;
    const item = items[index];
    const btnIndexes = items
      .map((it, i) => (it.type === 'button' ? i : -1))
      .filter((i) => i >= 0);

    if (mode === 'practice') {
      if (item?.type === 'button') {
        setIndex(wrapIndex(index + dir, items.length));
        highlight();
      } else {
        adjustItem?.(item, dir, e);
      }
      return true;
    }

    // settings
    if (item?.type === 'button' && btnIndexes.length > 1) {
      const bi = btnIndexes.indexOf(index);
      const nextBi = wrapIndex(bi + dir, btnIndexes.length);
      setIndex(btnIndexes[nextBi]);
      highlight();
    } else if (item?.type === 'keybind') {
      setIndex(wrapIndex(index + dir, items.length));
      highlight();
    } else {
      adjustItem?.(item, dir, e);
    }
    return true;
  }
  if (isConfirm(e)) {
    e.preventDefault();
    activateItem?.(items[index]);
    return true;
  }
  if (isBack(e) && onBack) {
    e.preventDefault();
    onBack();
    return true;
  }
  return false;
}

/**
 * 表单屏描述符：getItems + 焦点 + 调值/激活/返回。
 * practice / settings 共用，少抄 handleFormListKey 样板。
 * @returns {boolean}
 */
export function handleFormScreen(e, {
  mode,
  getItems,
  index,
  setIndex,
  highlight,
  adjustItem,
  activateItem,
  onBack,
}) {
  const items = getItems() || [];
  return handleFormListKey(e, {
    mode,
    items,
    index,
    setIndex,
    highlight: () => highlight?.(items),
    adjustItem,
    activateItem,
    onBack,
  });
}

/**
 * Manual：正文滚动 + 返回按钮
 */
export function handleManualKey(e, {
  items,
  index,
  setIndex,
  highlight,
  onBack,
}) {
  const n = items.length;
  if (!n) return false;
  const cur = items[index];
  const body = items.find((it) => it.type === 'scroll')?.el;

  if (isNavNext(e) || e.code === 'PageDown') {
    e.preventDefault();
    if (cur?.type === 'scroll' && body) {
      const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
      if (e.code === 'PageDown') {
        body.scrollTop += body.clientHeight * 0.85;
      } else if (!atBottom) {
        body.scrollTop += 48;
      } else if (n > 1) {
        setIndex(1);
        highlight();
      }
    } else {
      setIndex(wrapIndex(index + 1, n));
      highlight();
    }
    return true;
  }
  if (isNavPrev(e) || e.code === 'PageUp') {
    e.preventDefault();
    if (cur?.type === 'button') {
      setIndex(0);
      highlight();
    } else if (body) {
      body.scrollTop -= e.code === 'PageUp' ? body.clientHeight * 0.85 : 48;
    }
    return true;
  }
  if (isConfirm(e)) {
    e.preventDefault();
    if (cur?.type === 'button') cur.el.click();
    else onBack?.();
    return true;
  }
  if (isBack(e) && onBack) {
    e.preventDefault();
    onBack();
    return true;
  }
  return false;
}

/**
 * 左右调节表单项
 * @param {{ shiftKey?: boolean }} [mods]
 * @param {{ sfx: (name:string)=>void, adjustFps?: (dir:number, mods:object)=>void }} hooks
 */
export function adjustFocusItem(item, dir, mods = {}, hooks = {}) {
  if (!item) return false;
  const sfx = hooks.sfx || (() => {});

  if (item.type === 'select') {
    const sel = item.el;
    const n = sel.options.length;
    if (!n) return true;
    sel.selectedIndex = wrapIndex(sel.selectedIndex + dir, n);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sfx('ok');
    return true;
  }
  if (item.type === 'number') {
    const min = item.min != null ? item.min : (item.el.min !== '' ? Number(item.el.min) : 0);
    // max 为 null/undefined 表示不封顶（练习残机等）；HTML 无 max 时也不默认为 9
    let max = item.max;
    if (max === undefined) {
      max = item.el.max !== '' ? Number(item.el.max) : null;
    }
    const step = Number(item.el.step) || 1;
    let next = (Number(item.el.value) || 0) + dir * step;
    if (Number.isFinite(min)) next = Math.max(min, next);
    if (max != null && Number.isFinite(max)) next = Math.min(max, next);
    item.el.value = String(next);
    item.el.dispatchEvent(new Event('input', { bubbles: true }));
    sfx('ok');
    return true;
  }
  if (item.type === 'range') {
    const min = Number(item.el.min) || 0;
    const max = Number(item.el.max) || 100;
    const step = Number(item.el.step) || 1;
    const mul = mods.shiftKey ? step : step * Math.max(1, Math.round(5 / step));
    const next = Math.max(min, Math.min(max, Number(item.el.value) + dir * mul));
    item.el.value = String(next);
    item.el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  if (item.type === 'fps') {
    hooks.adjustFps?.(dir, mods);
    return true;
  }
  if (item.type === 'checkbox') {
    item.el.checked = !item.el.checked;
    item.el.dispatchEvent(new Event('change', { bubbles: true }));
    sfx('ok');
    return true;
  }
  return false;
}

/**
 * 确认键激活当前表单项
 */
export function activateFocusItem(item, hooks = {}) {
  if (!item) return;
  const sfx = hooks.sfx || (() => {});
  if (item.type === 'button' || item.type === 'keybind') {
    item.el.click();
    return;
  }
  if (item.type === 'checkbox') {
    item.el.checked = !item.el.checked;
    item.el.dispatchEvent(new Event('change', { bubbles: true }));
    sfx('ok');
    return;
  }
  if (item.type === 'fps') {
    hooks.toggleFps?.();
    return;
  }
  sfx('ok');
}
