// Optional: expose a simple options storage via message passing

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.type === 'SET_BACKEND') {
 		localStorage.setItem('AI_SCORE_BACKEND', msg.value);
		sendResponse({ ok: true });
	}
});
