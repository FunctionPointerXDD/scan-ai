let currentTabId = null;
let currentQuery = '';
let currentFilter = 'all';

const store = new Map();

document.addEventListener('DOMContentLoaded', () => {
  // 탭 버튼 클릭 처리
  const tabs = document.querySelectorAll('.tab');
  const filterMap = ['all', 'low', 'mid', 'high'];

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = filterMap[index];
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

  if (msg.type === 'FILTER_LINK') {
    const { tabId, id, title, url, score, reason } = msg;
    if (!tabId) return;

    if (!store.has(tabId)) store.set(tabId, new Map());
    store.get(tabId).set(id, { id, title, url, score, reason: reason || '' });

    if (currentTabId === null) currentTabId = tabId;
    if (currentTabId === tabId) render();
    return;
  }

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

function getScoreClass(score) {
  if (typeof score !== 'number' || score < 0) return 'score-unknown';
  if (score < 40) return 'score-low';
  if (score < 60) return 'score-mid';
  return 'score-high';
}

function getScoreText(score) {
  if (typeof score !== 'number' || score < 0) return 'N/A';
  return `AI ${score.toFixed(0)}%`;
}

function render() {
  const ul = document.getElementById('list');
  const emptyState = document.getElementById('empty-state');
  const queryTitle = document.getElementById('query-title');

  if (!ul) return;
  if (queryTitle) {
    queryTitle.textContent = currentQuery
      ? `검색어: ${currentQuery}`
      : '검색어: ';
  }

  ul.innerHTML = '';

  const data = getFilteredList();
  if (data.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  data.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'result-item';

    const header = document.createElement('div');
    header.className = 'result-header';

    const titleLink = document.createElement('a');
    titleLink.className = 'result-title';
    titleLink.href = r.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener';
    titleLink.textContent = r.title || r.url || '(제목 없음)';

    const scoreBadge = document.createElement('div');
    scoreBadge.className = `score-badge ${getScoreClass(r.score)}`;
    scoreBadge.textContent = getScoreText(r.score);

    header.appendChild(titleLink);
    header.appendChild(scoreBadge);
    li.appendChild(header);

    // 이유 표시
    const reason = document.createElement('div');
    reason.className = 'result-reason';
    if (r.score === -1) reason.textContent = '유효하지 않은 URL입니다.';
    else reason.textContent = r.reason || '';
    li.appendChild(reason);

    ul.appendChild(li);
  });
}

function safeDecodeQuery(s) {
  try {
    const plusFixed = String(s).replace(/\+/g, ' ');
    return decodeURIComponent(plusFixed);
  } catch {
    return String(s);
  }
}
