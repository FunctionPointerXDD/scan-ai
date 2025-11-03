// background.js (MV3 service worker)

const ports = new Map(); // tabId -> Port
// 탭별 상태/캐시: { query: string, results: Map<id, {id,title,url,score,reason}> }
const tabStore = new Map();

// ──────────────────────────────────────────────────────────────
// 유틸: 패널 열기 (탭 기준) + 폴백 + 1회 재시도
// ──────────────────────────────────────────────────────────────
async function openSidePanelForTab(tabId, windowId) {
  try {
    // 탭 기준으로 경로/활성화 → 즉시 오픈
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'panel.html',
      enabled: true,
    });
    await chrome.sidePanel.open({ tabId });
    return;
  } catch (e1) {
    console.warn(
      '[sidePanel] tabId open failed, trying windowId fallback:',
      e1
    );
    try {
      if (typeof windowId === 'number') {
        // 구버전 호환 (일부 채널)
        await chrome.sidePanel.open({ windowId });
        return;
      }
    } catch (e2) {
      console.warn('[sidePanel] windowId open failed, retrying in 200ms:', e2);
    }
  }
  // 1회 재시도
  setTimeout(async () => {
    try {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'panel.html',
        enabled: true,
      });
      await chrome.sidePanel.open({ tabId });
    } catch (e) {
      console.warn('[sidePanel] retry failed:', e);
    }
  }, 200);
}

// ──────────────────────────────────────────────────────────────
// content와의 장기 연결
// ──────────────────────────────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'content-port') return;
  const tabId = port.sender?.tab?.id;
  const windowId = port.sender?.tab?.windowId;
  if (typeof tabId !== 'number') return;

  ports.set(tabId, port);
  if (!tabStore.has(tabId))
    tabStore.set(tabId, { query: '', results: new Map() });
  console.log('✅ Port connected from tab:', tabId);

  port.onDisconnect.addListener(() => {
    ports.delete(tabId);
    console.log('⚠️ Port disconnected from tab:', tabId);
  });

  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'DETECT' && Array.isArray(msg.items)) {
      const items = msg.items.filter((i) => i && i.url && i.id);
      if (!items.length) return;

      // 병렬 요청
      const tasks = items.map(async (it) => {
        try {
          const res = await fetch('https://iker-postcentral-daniela.ngrok-free.dev/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: it.url }),
          });
          const data = await res.json();

          const score = typeof data.score === 'number' ? data.score : -1;
          const reason = data.reason || '';

          // 1) content 태그 갱신
          port.postMessage({ type: 'TAG_UPDATE', id: it.id, score });

          // 2) 캐시에 저장
          const entry = tabStore.get(tabId) || {
            query: '',
            results: new Map(),
          };
          entry.results.set(it.id, {
            id: it.id,
            title: it.title,
            url: it.url,
            score,
            reason,
          });
          tabStore.set(tabId, entry);

          // 3) 패널에 스트리밍 전송 (열려있으면 바로 반영)
          chrome.runtime.sendMessage({
            type: 'FILTER_LINK',
            tabId,
            id: it.id,
            title: it.title,
            url: it.url,
            score,
            reason,
          });
        } catch (err) {
          console.error('❌ detect 실패:', err);

          // 실패도 캐시에 반영
          const entry = tabStore.get(tabId) || {
            query: '',
            results: new Map(),
          };
          entry.results.set(it.id, {
            id: it.id,
            title: it.title,
            url: it.url,
            score: -1,
            reason: '',
          });
          tabStore.set(tabId, entry);

          // content/panel에 실패 통지
          port.postMessage({ type: 'TAG_UPDATE', id: it.id, score: -1 });
          chrome.runtime.sendMessage({
            type: 'FILTER_LINK',
            tabId,
            id: it.id,
            title: it.title,
            url: it.url,
            score: -1,
            reason: '',
          });
        }
      });

      await Promise.allSettled(tasks);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// 단발 메시지 처리: 검색어 수신 + 패널 오픈 + 초기화/백업
// ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  const tabId = sender?.tab?.id;
  const windowId = sender?.tab?.windowId;

  if (msg.type === 'SEARCH_QUERY' && typeof tabId === 'number') {
    // 캐시 초기화 & 쿼리 저장
    tabStore.set(tabId, { query: msg.query || '', results: new Map() });

    // 패널 자동 오픈 (실패 시 폴백+재시도)
    await openSidePanelForTab(tabId, windowId);

    // 패널에 새 검색어 알림 + 리스트 초기화
    chrome.runtime.sendMessage({
      type: 'SEARCH_QUERY',
      tabId,
      query: msg.query || '',
    });
    chrome.runtime.sendMessage({ type: 'CLEAR_RESULTS', tabId });
  }

  // 패널이 켜지면서 보내는 요청: 현재 탭의 결과를 한꺼번에 보내달라
  if (msg.type === 'PANEL_READY') {
    const tgtTabId = msg.tabId;
    if (typeof tgtTabId !== 'number') return;

    const entry = tabStore.get(tgtTabId);
    const items = entry ? [...entry.results.values()] : [];
    const query = entry ? entry.query : '';

    chrome.runtime.sendMessage({
      type: 'BULK_RESULTS',
      tabId: tgtTabId,
      query,
      items,
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'panel.html',
      enabled: true,
    });
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    console.warn('❌ Failed to open side panel:', err);
  }
});
