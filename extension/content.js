// --- CONFIG ---
const BACKEND_BASE = localStorage.getItem("AI_SCORE_BACKEND") || "http://localhost:8000";
const BATCH_LIMIT = 10; // analyze top N results


function selectResultAnchors() {
	// Robust-ish selectors for Google SERP links
	const containers = document.querySelectorAll('#search a[href^="http"] h3');
	const anchors = [];
	containers.forEach(h3 => {
		const a = h3.closest('a[href^="http"]');
		if (a && !a.href.includes('google.com')) anchors.push(a);
	});
	return anchors;
}


// Returns true if any ancestor element has a computed transform that flips vertically
function detectAncestorVerticalFlip(el) {
	let cur = el.parentElement;
	while (cur) {
		try {
			const style = window.getComputedStyle(cur);
			const t = style.transform || '';
			if (t && t !== 'none') {
				// look for scaleY(-1) or matrix with negative m11/m22
				if (/scaleY\s*\(\s*-?\d/.test(t)) {
					const m = t.match(/scaleY\s*\(\s*([-0-9.]+)/);
					if (m && parseFloat(m[1]) < 0) return true;
				}
				// handle matrix(a, b, c, d, e, f) where d (4th) is scaleY
				const mat = t.match(/matrix\s*\(\s*([^)]+)\)/);
				if (mat) {
					const parts = mat[1].split(/\s*,\s*/).map(parseFloat);
					// matrix(a, b, c, d, e, f) => d is parts[3]
					if (parts.length >= 4 && parts[3] < 0) return true;
				}
			}
		} catch (e) {
			// ignore
		}
		cur = cur.parentElement;
	}
	return false;
}


function injectControls() {
	const anchors = selectResultAnchors();
	anchors.forEach((a, idx) => {
			if (a.dataset.aiScoreInjected) return;
			a.dataset.aiScoreInjected = '1';


			const badge = document.createElement('span');
			badge.className = 'ai-score-badge';
			badge.textContent = 'AI?';


			const runBtn = document.createElement('button');
			runBtn.className = 'ai-score-btn';
			runBtn.textContent = '분석';
			runBtn.addEventListener('click', async (e) => {
					e.preventDefault();
					runBtn.disabled = true;
					// show working state on the button and badge
					runBtn.textContent = '…';
					badge.textContent = '분석중';
					const url = a.href;
					const score = await analyzeUrl(url);
					renderScore(badge, score);
					runBtn.textContent = '다시';
					runBtn.disabled = false;
				});

			const h3 = a.querySelector('h3');
			// Insert elements into the DOM
			if (h3 && h3.parentElement) {
				h3.parentElement.insertAdjacentElement('afterend', badge);
				h3.parentElement.insertAdjacentElement('afterend', runBtn);
			} else {
				// 폴백
				(a.parentElement || a).appendChild(badge);
				(a.parentElement || a).appendChild(runBtn);
			}

			// If any ancestor applies a vertical flip via transform (scaleY < 0),
			// invert the badge/button so text renders upright.
			try {
				const shouldInvert = detectAncestorVerticalFlip(badge);
				if (shouldInvert) {
					// apply inverse scale to counter parent flip
					badge.style.transform = (badge.style.transform ? badge.style.transform + ' ' : '') + 'scaleY(-1)';
					runBtn.style.transform = (runBtn.style.transform ? runBtn.style.transform + ' ' : '') + 'scaleY(-1)';
					// ensure the transform origin is centered
					badge.style.transformOrigin = 'center';
					runBtn.style.transformOrigin = 'center';
					// make sure backface is visible so glyphs render properly
					badge.style.backfaceVisibility = 'visible';
					runBtn.style.backfaceVisibility = 'visible';
				}
			} catch (e) {
				// silent fallback
				console.warn('flip-detect failed', e);
			}

			if (idx < BATCH_LIMIT) {
				// auto-kick small batch to improve UX
				setTimeout(() => runBtn.click(), 200 + idx * 80);
			}
	});
}


function renderScore(el, result) {
	if (!result || typeof result.score !== 'number') {
		// Korean fallback when analysis failed or no score
		el.textContent = '분석 불가';
		el.style.background = 'rgba(128,128,128,0.8)';
		return;
	}
	const pct = Math.round(result.score * 100);
	// keep a space before % to match user's requested format ' n%'
	el.textContent = `${pct}\u00A0%`;
	// simple color mapping
	const g = Math.max(0, 200 - pct * 2);
	const r = Math.min(200, pct * 2);
	el.style.background = `rgba(${r},${g},32,0.85)`;
}


async function analyzeUrl(url) {
	try {
		const res = await fetch(`${BACKEND_BASE}/analyze?url=${encodeURIComponent(url)}`);
		if (!res.ok) throw new Error('Backend error');
		return await res.json();
	} catch (e) {
		console.warn(e);
		return null;
	}
}


// observe DOM changes (people often scroll or instant-search changes the DOM)
const observer = new MutationObserver(() => injectControls());
observer.observe(document.body, { childList: true, subtree: true });


// initial
injectControls();

