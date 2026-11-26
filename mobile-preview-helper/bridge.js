// Mobile Preview Helper — content script (isolated world).
// Top frame: answers the preview tool's handshake and registers the tab.
// Phone iframe (name "__mp_device__"): reports pointer, navigation, colours and
// icon metadata to the tool, and applies cursor / scrollbar / drag-to-scroll.
(() => {
  if (window.__mpBridge) return;
  window.__mpBridge = true;

  /* ---------- top frame: handshake + Chrome-account sync ---------- */
  if (window === window.top) {
    // Only a page the background accepted as the preview tool (local file / localhost) may read or write the synced data.
    let registered = false;
    const WRITER = Math.random().toString(36).slice(2);
    const CHUNK = 2000;                      // chars per storage item (sync quota is 8 KB per item)
    const S = chrome.storage.sync;
    async function loadSync() {
      const meta = (await S.get('mp:meta'))['mp:meta'];
      if (!meta || !meta.n) return null;
      const keys = Array.from({ length: meta.n }, (_, i) => 'mp:' + i);
      const got = await S.get(keys);
      try { return { data: JSON.parse(keys.map(k => got[k] || '').join('')), ts: meta.ts, writer: meta.writer }; } catch { return null; }
    }
    let pendingSave = null, saveTimer = 0;
    async function flushSave() {
      const p = pendingSave; pendingSave = null; if (!p) return;
      const json = JSON.stringify(p.data), items = {};
      let n = 0; for (let i = 0; i < json.length; i += CHUNK) items['mp:' + n++] = json.slice(i, i + CHUNK);
      const old = (await S.get('mp:meta'))['mp:meta'];
      items['mp:meta'] = { n, ts: p.ts, writer: WRITER };
      try {
        await S.set(items);
        if (old && old.n > n) await S.remove(Array.from({ length: old.n - n }, (_, i) => 'mp:' + (n + i)));
        window.postMessage({ type: 'mp:sync-saved' }, '*');
      } catch (err) { console.warn('[Mobile Preview Helper] sync failed:', err); }
    }
    window.addEventListener('message', e => {
      if (e.source !== window || !e.data) return;
      if (e.data.type === 'mp:tool-ping') {
        try {
          chrome.runtime.sendMessage({ type: 'mp:register', os: e.data.os === 'android' ? 'android' : 'ios' }, res => {
            void chrome.runtime.lastError;
            if (!res || !res.ok) return;
            window.postMessage({ type: 'mp:ext-ready', version: chrome.runtime.getManifest().version, sync: true }, '*');
            if (!registered) { registered = true; loadSync().then(p => window.postMessage({ type: 'mp:sync-load', payload: p }, '*')); }
          });
        } catch {}
      } else if (e.data.type === 'mp:sync-save' && registered && e.data.payload && e.data.payload.data) {
        pendingSave = e.data.payload;
        clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 1500);   // stay well under sync write limits
      }
    });
    // Changes made on another computer (or another tab) arrive here.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !registered || !changes['mp:meta']) return;
      const m = changes['mp:meta'].newValue;
      if (!m || m.writer === WRITER) return;
      loadSync().then(p => p && window.postMessage({ type: 'mp:sync-load', payload: p }, '*'));
    });
    return;
  }

  /* ---------- phone iframe only ---------- */
  let isDevice = false;
  try { isDevice = (window.name || '').startsWith('__mp_device__') && window.parent === window.top; } catch {}
  if (!isDevice) return;

  const parentWin = window.parent;
  const post = m => { try { parentWin.postMessage(m, '*'); } catch {} };
  const cfg = { hideCursor: false, dragScroll: false, hideScrollbar: false };
  let styleEl = null;

  function applyCfg() {
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = '__mp_helper_style'; }
    if (!styleEl.isConnected) (document.head || document.documentElement).appendChild(styleEl);
    styleEl.textContent =
      (cfg.hideCursor ? 'html,html *{cursor:none!important}' : '') +
      (cfg.hideScrollbar ? '*{scrollbar-width:none!important}*::-webkit-scrollbar{width:0!important;height:0!important}' : '');
  }

  window.addEventListener('message', e => {
    if (e.source !== parentWin || !e.data) return;
    if (e.data.type === 'mp:cfg') {
      cfg.hideCursor = !!e.data.hideCursor; cfg.dragScroll = !!e.data.dragScroll; cfg.hideScrollbar = !!e.data.hideScrollbar;
      applyCfg();
    } else if (e.data.type === 'mp:reload') {
      location.reload();
    } else if (e.data.type === 'mp:scheme') {
      setTimeout(reportTheme, 120); setTimeout(reportTheme, 600);   // page colours change with dark mode
    }
  });

  post({ type: 'mp:hello', href: location.href });

  /* pointer reporting */
  const opt = { capture: true, passive: true };
  addEventListener('pointermove', e => post({ type: 'mp:ptr', t: 'move', x: e.clientX, y: e.clientY, b: e.buttons }), opt);
  addEventListener('pointerdown', e => { if (e.button === 0) post({ type: 'mp:ptr', t: 'down', x: e.clientX, y: e.clientY }); }, opt);
  addEventListener('pointerup', e => post({ type: 'mp:ptr', t: 'up', x: e.clientX, y: e.clientY }), opt);
  addEventListener('pointercancel', () => post({ type: 'mp:ptr', t: 'up' }), opt);
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) post({ type: 'mp:ptr', t: 'leave' }); }, true);

  /* navigation (incl. SPA pushState) */
  let lastHref = location.href;
  const reportNav = () => { if (location.href !== lastHref) { lastHref = location.href; post({ type: 'mp:nav', href: lastHref }); reportMeta(); } };
  addEventListener('popstate', reportNav); addEventListener('hashchange', reportNav);
  setInterval(reportNav, 400);

  /* page colours behind the status bar / Safari toolbar */
  const opaque = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return false; const p = m[1].split(','); return p.length < 4 || parseFloat(p[3]) > 0.5; };
  function bgAt(x, y) {
    let n = document.elementFromPoint(x, y);
    while (n && n.nodeType === 1) { const c = getComputedStyle(n).backgroundColor; if (opaque(c)) return c; n = n.parentElement; }
    for (const e of [document.body, document.documentElement]) { if (e) { const c = getComputedStyle(e).backgroundColor; if (opaque(c)) return c; } }
    return '#ffffff';
  }
  let lastTheme = '';
  function reportTheme() {
    if (!document.documentElement) return;
    const w = innerWidth / 2;
    const top = bgAt(w, 1), bottom = bgAt(w, innerHeight - 2), key = top + '|' + bottom;
    if (key !== lastTheme) { lastTheme = key; post({ type: 'mp:theme', top, bottom }); }
  }
  let themeT = 0;
  addEventListener('scroll', () => { clearTimeout(themeT); themeT = setTimeout(reportTheme, 200); }, opt);

  /* icon + title for "Add to Home Screen" */
  function pickIcon() {
    const size = l => Math.max(0, ...((l.getAttribute('sizes') || '').match(/\d+/g) || ['0']).map(Number));
    const sets = [
      [...document.querySelectorAll('link[rel~="apple-touch-icon"],link[rel~="apple-touch-icon-precomposed"]')],
      [...document.querySelectorAll('link[rel~="icon"]')].filter(l => size(l) >= 96),
    ];
    for (const s of sets) {
      if (!s.length) continue;
      const best = s.sort((a, b) => size(b) - size(a))[0];
      try { return new URL(best.getAttribute('href'), document.baseURI).href; } catch {}
    }
    return '';
  }
  function reportMeta() {
    const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content || '';
    post({ type: 'mp:meta', title: document.title || '', appTitle, icon: pickIcon() });
  }

  document.addEventListener('DOMContentLoaded', () => { applyCfg(); reportTheme(); reportMeta(); });
  addEventListener('load', () => { reportTheme(); reportMeta(); setTimeout(reportTheme, 1200); setTimeout(reportMeta, 1500); });

  /* drag-to-scroll with momentum, like a finger */
  const EDITABLE = 'input,textarea,select,[contenteditable=""],[contenteditable="true"],video,audio,canvas';
  let drag = null, momentum = 0, suppressClick = false;
  function findScroller(el, axis) {
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.nodeType !== 1) continue;
      const cs = getComputedStyle(n), ov = axis === 'y' ? cs.overflowY : cs.overflowX;
      if (/(auto|scroll|overlay)/.test(ov) && (axis === 'y' ? n.scrollHeight > n.clientHeight + 1 : n.scrollWidth > n.clientWidth + 1)) return n;
    }
    const se = document.scrollingElement || document.documentElement;
    return (axis === 'y' ? se.scrollHeight > se.clientHeight + 1 : se.scrollWidth > se.clientWidth + 1) ? se : null;
  }
  function stopMomentum() { cancelAnimationFrame(momentum); momentum = 0; }
  addEventListener('pointerdown', e => {
    stopMomentum();
    if (!cfg.dragScroll || e.button !== 0 || e.pointerType !== 'mouse') return;
    if (e.target.closest && e.target.closest(EDITABLE)) return;
    drag = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), v: 0, active: false, axis: null, target: e.target, scroller: null };
  }, true);
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!(e.buttons & 1)) { drag = null; return; }
    if (!drag.active) {
      const tx = e.clientX - drag.x0, ty = e.clientY - drag.y0;
      if (Math.hypot(tx, ty) < 6) return;
      drag.axis = Math.abs(tx) > Math.abs(ty) ? 'x' : 'y';
      drag.scroller = findScroller(drag.target, drag.axis);
      if (!drag.scroller) { drag = null; return; }   // let the page handle it (e.g. carousels)
      drag.active = true;
      document.documentElement.style.userSelect = 'none';
      getSelection()?.removeAllRanges();
    }
    const now = performance.now(), dt = Math.max(1, now - drag.lt);
    const d = drag.axis === 'y' ? e.clientY - drag.ly : e.clientX - drag.lx;
    if (drag.axis === 'y') drag.scroller.scrollTop -= d; else drag.scroller.scrollLeft -= d;
    drag.v = 0.75 * (-d / dt) + 0.25 * drag.v;
    drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
  }, true);
  addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.active) return;
    document.documentElement.style.userSelect = '';
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 300);
    if (performance.now() - d.lt > 80) return;
    let v = d.v * 16, last = performance.now();
    const step = now => {
      const f = Math.min(3, (now - last) / 16); last = now;
      if (d.axis === 'y') d.scroller.scrollTop += v * f; else d.scroller.scrollLeft += v * f;
      v *= Math.pow(0.95, f);
      momentum = Math.abs(v) > 0.4 ? requestAnimationFrame(step) : 0;
    };
    if (Math.abs(v) > 1) momentum = requestAnimationFrame(step);
  }, true);
  addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  addEventListener('dragstart', e => { if (cfg.dragScroll) e.preventDefault(); }, true);
  addEventListener('wheel', stopMomentum, opt);
})();
