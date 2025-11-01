console.log('✅ content.js loaded');

// 장기 포트 연결
const port = chrome.runtime.connect({ name: 'content-port' });
console.log('✅ Port created');
port.onDisconnect.addListener(() => console.warn('⚠️ Port disconnected.'));

const itemMap = new Map(); // id -> { url, el:<a>, tag:HTMLElement }
let lastSentSignature = '';
let lastQuery = new URL(location.href).searchParams.get('q') || '';

function uid() {
  return 'ai-' + Math.random().toString(36).slice(2, 10);
}

function collectLinks() {
  const items = [...document.querySelectorAll('a h3')]
    .map((h3) => {
      const a = h3.closest('a');
      if (!a) return null;
      const url = a.href || '';
      const title = (h3.innerText || '').trim();
      if (!url || !title) return null;
      return { a, h3, url, title };
    })
    .filter(Boolean);

  if (!items.length) return;

  items.forEach(({ a, h3, url }) => {
    let id = a.dataset.aiId;
    if (!id) {
      id = uid();
      a.dataset.aiId = id;
    }

    if (!itemMap.has(id)) itemMap.set(id, { url, el: a, tag: null });
    else itemMap.get(id).url = url;

    const next = h3.nextElementSibling;
    if (next && next.classList?.contains('ai-tag-host')) return;

    // Shadow DOM 태그
    const host = document.createElement('span');
    host.className = 'ai-tag-host';
    host.style.all = 'unset';
    host.style.display = 'inline-block';
    host.style.marginLeft = '8px';
    host.style.verticalAlign = 'middle';
    host.style.contain = 'content';
    host.style.transform = 'none';
    host.style.direction = 'ltr';
    host.style.unicodeBidi = 'isolate';
    host.style.writingMode = 'horizontal-tb';
    host.style.transform = 'rotate(180deg) scaleX(-1)';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .tag {
          all: initial;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 6px;
          background: #ddd;
          color: #333;
          line-height: 1.4;
          font-weight: 600;
          display: inline-block;
          white-space: nowrap;
          transform: none !important;
          direction: ltr !important;
        }
      </style>
      <span class="tag">검사중...</span>
    `;
    h3.insertAdjacentElement('afterend', host);

    const rec = itemMap.get(id);
    rec.tag = shadow.querySelector('.tag');
  });

  // background로 보낼 페이로드
  const payload = [...itemMap.entries()]
    .map(([id, rec]) => ({
      id,
      title: rec?.el?.querySelector('h3')?.innerText?.slice(0, 80) || '',
      url: rec?.url || '',
    }))
    .filter((p) => p.url);

  // 중복 전송 방지
  const signature = JSON.stringify(
    payload.map((p) => `${p.id}|${p.url}`)
  ).slice(0, 5000);
  if (signature !== lastSentSignature) {
    lastSentSignature = signature;
    port.postMessage({ type: 'DETECT', items: payload });
  }
}

// background → 점수 갱신(id 기반)
port.onMessage.addListener((msg) => {
  if (msg.type === 'TAG_UPDATE') {
    updateTagById(msg.id, msg.score);
  }
});

function updateTagById(id, score) {
  const rec = itemMap.get(id);
  if (!rec || !rec.tag) return;
  const tag = rec.tag;

  if (typeof score !== 'number' || Number.isNaN(score) || score < 0) {
    tag.textContent = 'X';
    tag.style.background = '#999';
    tag.style.color = '#fff';
    return;
  }

  tag.textContent = `AI ${score.toFixed(1)}%`;
  if (score < 40) tag.style.background = '#4caf50';
  else if (score < 60) tag.style.background = '#ff9800';
  else tag.style.background = '#f44336';
  tag.style.color = '#fff';
}

function bootstrap() {
  collectLinks();
  const queryParam = new URL(location.href).searchParams.get('q') || '';
  chrome.runtime.sendMessage({ type: 'SEARCH_QUERY', query: queryParam });
}
bootstrap();

// DOM 변화 대응
const observer = new MutationObserver(() => scheduleCollect());
observer.observe(document.documentElement, { childList: true, subtree: true });

let collectScheduled = false;
function scheduleCollect() {
  if (collectScheduled) return;
  collectScheduled = true;
  (window.requestIdleCallback || window.requestAnimationFrame)(() => {
    collectScheduled = false;
    collectLinks();
  });
}

// SPA URL 변화 대응
['pushState', 'replaceState'].forEach((type) => {
  const orig = history[type];
  history[type] = function (...args) {
    const res = orig.apply(this, args);
    window.dispatchEvent(new Event(type.toLowerCase()));
    return res;
  };
});
window.addEventListener('popstate', handleUrlChange, true);
window.addEventListener('pushstate', handleUrlChange, true);
window.addEventListener('replacestate', handleUrlChange, true);

function handleUrlChange() {
  const q = new URL(location.href).searchParams.get('q') || '';
  if (q !== lastQuery) {
    lastQuery = q;
    // 결과 초기화 후 재수집 + 쿼리 알림
    itemMap.clear();
    lastSentSignature = '';
    collectLinks();
    chrome.runtime.sendMessage({ type: 'SEARCH_QUERY', query: q });
  }
}
