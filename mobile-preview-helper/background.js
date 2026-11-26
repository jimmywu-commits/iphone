// Mobile Preview Helper — background service worker.
// Header rules are registered per tab, and only for tabs showing the preview tool
// from a local file or localhost, so normal browsing is never affected.

const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
};
// iPhone Safari sends no client hints; Android Chrome says it is a mobile Android browser.
const HINTS = {
  ios: [{ header: 'sec-ch-ua', operation: 'remove' }, { header: 'sec-ch-ua-mobile', operation: 'remove' }, { header: 'sec-ch-ua-platform', operation: 'remove' }],
  android: [
    { header: 'sec-ch-ua', operation: 'set', value: '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' },
    { header: 'sec-ch-ua-mobile', operation: 'set', value: '?1' },
    { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' },
  ],
};
const SUBRESOURCES = ['sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'media', 'ping', 'websocket', 'other'];

function isToolUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    // the published copy on GitHub Pages
    if (u.protocol === 'https:' && u.hostname === 'jimmywu-commits.github.io' && /^\/iphone(\/|$)/.test(u.pathname)) return true;
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]' || u.hostname.endsWith('.localhost'));
  } catch { return false; }
}
const ruleIds = tabId => [tabId * 2 + 1, tabId * 2 + 2];

async function register(tabId, os) {
  os = os === 'android' ? 'android' : 'ios';
  const [a, b] = ruleIds(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [a, b],
    addRules: [
      {
        id: a, priority: 1,
        action: { type: 'modifyHeaders', responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' },
          { header: 'content-security-policy', operation: 'remove' },
        ] },
        condition: { tabIds: [tabId], resourceTypes: ['sub_frame'] },
      },
      {
        id: b, priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [
          { header: 'user-agent', operation: 'set', value: UA[os] },
          ...HINTS[os],
        ] },
        condition: { tabIds: [tabId], resourceTypes: SUBRESOURCES },
      },
    ],
  });
}
async function unregister(tabId) {
  try { await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds(tabId) }); } catch {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'mp:register' || !sender.tab || sender.frameId !== 0) return;
  if (!isToolUrl(sender.url || sender.tab.url)) { sendResponse({ ok: false, reason: 'origin' }); return; }
  register(sender.tab.id, msg.os).then(() => sendResponse({ ok: true }), err => sendResponse({ ok: false, reason: String(err) }));
  return true;
});
chrome.tabs.onRemoved.addListener(unregister);
chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.url && !isToolUrl(info.url)) unregister(tabId); });
