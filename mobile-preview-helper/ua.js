// Runs in the page's own JS world, only inside the preview tool's phone iframe
// (the iframe is named "__mp_device__", plus ":dark" when iOS dark mode is on).
// 1) Makes the page see an iPhone.  2) Emulates prefers-color-scheme for the phone.
(() => {
  let name = '';
  try { if (window.top === window) return; name = window.name || ''; } catch { return; }
  if (!name.startsWith('__mp_device__')) return;

  /* ---------- iPhone identity ---------- */
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
  const N = Navigator.prototype;
  const def = (k, v) => { try { Object.defineProperty(N, k, { get: () => v, configurable: true }); } catch {} };
  def('userAgent', UA);
  def('appVersion', UA.replace(/^Mozilla\//, ''));
  def('platform', 'iPhone');
  def('vendor', 'Apple Computer, Inc.');
  def('maxTouchPoints', 5);
  def('userAgentData', undefined);
  try { if (!('ontouchstart' in window)) window.ontouchstart = null; } catch {}

  /* ---------- prefers-color-scheme emulation ---------- */
  let scheme = name.endsWith(':dark') ? 'dark' : 'light';
  const RE = /\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/gi;
  const rewrite = text => text.replace(RE, (m, v) => (v.toLowerCase() === scheme ? '(min-width: 0px)' : '(max-width: -1px)'));
  const orig = new WeakMap();   // rule/element -> original media text

  function fixMediaList(owner, media) {
    if (!media) return;
    if (!orig.has(owner)) { if (!RE.test(media.mediaText)) { RE.lastIndex = 0; return; } RE.lastIndex = 0; orig.set(owner, media.mediaText); }
    const want = rewrite(orig.get(owner));
    if (media.mediaText !== want) media.mediaText = want;
  }
  function walk(rules) {
    if (!rules) return;
    for (const r of rules) {
      if (r.media && (r instanceof CSSMediaRule || r instanceof CSSImportRule)) fixMediaList(r, r.media);
      if (r instanceof CSSImportRule) { try { walk(r.styleSheet && r.styleSheet.cssRules); } catch {} }
      if (r.cssRules) walk(r.cssRules);
    }
  }
  function apply() {
    for (const s of document.styleSheets) {
      try { walk(s.cssRules); } catch {}   // cross-origin sheets can't be read
    }
    for (const el of document.querySelectorAll('link[media],style[media],source[media],meta[name="theme-color"][media]')) {
      if (!orig.has(el)) { const m = el.getAttribute('media'); RE.lastIndex = 0; if (!RE.test(m)) continue; orig.set(el, m); }
      RE.lastIndex = 0;
      const want = rewrite(orig.get(el));
      if (el.getAttribute('media') !== want) el.setAttribute('media', want);
    }
  }
  const mm = window.matchMedia.bind(window);
  window.matchMedia = function (q) { return mm(rewrite(String(q))); };

  let t = 0;
  const soon = () => { clearTimeout(t); t = setTimeout(apply, 30); };
  new MutationObserver(soon).observe(document, { childList: true, subtree: true });
  document.addEventListener('load', e => { if (e.target && e.target.tagName === 'LINK') soon(); }, true);
  document.addEventListener('DOMContentLoaded', apply);
  addEventListener('load', apply);

  // live switch from the preview tool
  addEventListener('message', e => {
    if (e.source !== window.parent || !e.data || e.data.type !== 'mp:scheme') return;
    scheme = e.data.scheme === 'dark' ? 'dark' : 'light';
    apply();
  });
})();
