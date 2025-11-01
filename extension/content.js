// const API_ENDPOINT = 'http://3.36.77.36:5000/score';
const API_ENDPOINT = 'https://iker-postcentral-daniela.ngrok-free.dev/score';

async function getScore(url) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!response.ok) {
      console.error(`Server error: ${response.status}`);
      return { ai_score: -1, reason: `Server returned status ${response.status}` };
    }
    return await response.json();
  } catch (err) {
    console.error('Error fetching AI score:', err);
    return { ai_score: -1, reason: 'Local Server connection failed (Is Python server running?)' };
  }
}

function createScoreElement(score, reason) {
  const el = document.createElement('span');
  el.className = 'ai-score-overlay';

  let colorClass = 'score-low';
  if (score === -1) colorClass = 'score-error';
  else if (score >= 70) colorClass = 'score-high';
  else if (score >= 30) colorClass = 'score-medium';
  el.classList.add(colorClass);

  el.textContent = (score === -1) ? 'Error' : `${score}% AI`;
  el.title = `AI Probability: ${score}%. Reason: ${reason}`;
  return el;
}

function processSearchResults() {
  // 구글은 자주 DOM을 바꾸므로 여러 셀렉터를 시도
  const headers = document.querySelectorAll(
    '#rso a h3, #search a h3, div.g a h3, div[data-snf="n"] a h3'
  );

  headers.forEach((h3) => {
    const linkAnchor = h3.closest('a');
    if (!linkAnchor) return;

    // 중복 방지
    if (linkAnchor.dataset.aiScoreAttached === '1') return;
    linkAnchor.dataset.aiScoreAttached = '1';

    const url = linkAnchor.href;

    // 1. Placeholder 생성 및 삽입
    const startTime = Date.now();
    const placeholder = createScoreElement(-1, "분석중...");
    placeholder.classList.add('loading');
    
    // 로딩 시간 업데이트를 위한 인터벌
    const loadingInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        placeholder.textContent = `분석중 ${elapsed}s...`;
    }, 1000);
    
    // placeholder를 h3 뒤에 삽입
    h3.parentElement.insertBefore(placeholder, h3.nextSibling);

    // 2. 점수 요청 및 처리
    getScore(url).then(({ ai_score, reason }) => {
      // 로딩 인터벌 정리
      clearInterval(loadingInterval);
      const score = (typeof ai_score === 'number') ? ai_score : 0;
      const why = reason || 'N/A';
      const analysisTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const badge = createScoreElement(score, `${why} (분석시간: ${analysisTime}초)`);
      placeholder.replaceWith(badge);
    }).catch(() => {
      clearInterval(loadingInterval);
      const badge = createScoreElement(-1, 'Fetch failed');
      placeholder.replaceWith(badge);
    });
  });
}

// 구글은 동적 렌더링이 잦아서 MutationObserver로 지속 감시
const container = document.getElementById('rso') || document.body;
const observer = new MutationObserver(() => {
  // 너무 자주 도는 걸 막기 위해 requestIdleCallback/raf 디바운스
  if (window.__aiScoreRaf) cancelAnimationFrame(window.__aiScoreRaf);
  window.__aiScoreRaf = requestAnimationFrame(processSearchResults);
});
observer.observe(container, { childList: true, subtree: true });

// 최초 1회 실행
processSearchResults();

