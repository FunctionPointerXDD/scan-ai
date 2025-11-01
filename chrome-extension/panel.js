let currentTabId = null;
let currentQuery = '';
let currentFilter = 'all';

// 탭별 결과 저장: { [tabId]: Map<id, {id,title,url,score,reason}> }
const store = new Map();

document.addEventListener('DOMContentLoaded', () => {
  // 필터 버튼: textContent 사용(인코딩 안전)
  document.querySelectorAll('#filter-buttons button').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.range || 'all';
      render();
    });
  });

  // 현재 탭 식별 후 백필 요청
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) return;
    currentTabId = tabs[0].id;
    chrome.runtime.sendMessage({ type: 'PANEL_READY', tabId: currentTabId });
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SEARCH_QUERY') {
    const { tabId, query } = msg;
    if (!tabId) return;

    if (!store.has(tabId)) store.set(tabId, new Map());
    else store.get(tabId).clear();

    if (currentTabId === null) currentTabId = tabId;
    if (currentTabId === tabId) {
      currentQuery = safeDecodeQuery(query || '');
      const header = document.getElementById('query-title');
      if (header) header.textContent = `검색어: ${currentQuery}`;
      render();
    }
    return;
  }

  if (msg.type === 'CLEAR_RESULTS') {
    const { tabId } = msg;
    if (!tabId) return;
    if (!store.has(tabId)) store.set(tabId, new Map());
    else store.get(tabId).clear();
    if (currentTabId === null) currentTabId = tabId;
    render();
    return;
  }

  // 스트리밍 업데이트
  if (msg.type === 'FILTER_LINK') {
    const { tabId, id, title, url, score, reason } = msg;
    if (!tabId) return;

    if (!store.has(tabId)) store.set(tabId, new Map());
    store.get(tabId).set(id, { id, title, url, score, reason: reason || '' });

    if (currentTabId === null) currentTabId = tabId;
    if (currentTabId === tabId) render();
    return;
  }

  // 패널 늦게 열렸을 때 백필 덤프
  if (msg.type === 'BULK_RESULTS') {
    const { tabId, query, items } = msg;
    if (!tabId) return;

    if (!store.has(tabId)) store.set(tabId, new Map());
    const m = store.get(tabId);
    m.clear();
    (items || []).forEach((r) => m.set(r.id, r));

    if (currentTabId === null) currentTabId = tabId;
    if (currentTabId === tabId) {
      currentQuery = safeDecodeQuery(query || '');
      const header = document.getElementById('query-title');
      if (header) header.textContent = `검색어: ${currentQuery}`;
      render();
    }
  }
});

function getFilteredList() {
  if (currentTabId === null || !store.has(currentTabId)) return [];
  const list = [...store.get(currentTabId).values()];

  return list.filter((r) => {
    if (typeof r.score !== 'number') return currentFilter === 'all';
    if (currentFilter === 'low') return r.score < 40 && r.score >= 0;
    if (currentFilter === 'mid') return r.score >= 40 && r.score < 60;
    if (currentFilter === 'high') return r.score >= 60;
    return true;
  });
}

function render() {
  const ul = document.getElementById('list');
  if (!ul) return;
  ul.innerHTML = '';

  const data = getFilteredList();
  data.forEach((r) => {
    const li = document.createElement('li');

    // 타이틀 자체를 링크로
    const titleLink = document.createElement('a');
    titleLink.href = r.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';
    titleLink.textContent = r.title || r.url || '(제목 없음)';

    const scoreSpan = document.createElement('span');
    const color =
      typeof r.score === 'number' && r.score >= 0
        ? r.score < 40
          ? '#4caf50'
          : r.score < 60
          ? '#ff9800'
          : '#f44336'
        : '#999';
    const scoreText =
      typeof r.score === 'number' && r.score >= 0
        ? `${r.score.toFixed(1)}%`
        : 'X';
    scoreSpan.style.color = color;
    scoreSpan.textContent = ` (${scoreText})`;

    const br = document.createElement('br');

    const reasonSmall = document.createElement('small');
    reasonSmall.textContent = r.reason || '';

    li.appendChild(titleLink);
    li.appendChild(scoreSpan);
    li.appendChild(br);
    li.appendChild(reasonSmall);

    ul.appendChild(li);
  });

  const header = document.getElementById('query-title');
  if (header) header.textContent = `검색어: ${currentQuery || ''}`;
}

// 한글/인코딩 안전 처리
function safeDecodeQuery(s) {
  try {
    const plusFixed = String(s).replace(/\+/g, ' ');
    return decodeURIComponent(plusFixed);
  } catch {
    return String(s);
  }
}
