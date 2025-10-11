Load unpacked extension:
1) Chrome → Manage Extensions → Developer mode ON
2) Load unpacked → select `extension/` folder
3) Open https://www.google.com/search?q=example and watch badges
4) Optional: set backend host in DevTools console:
localStorage.setItem('AI_SCORE_BACKEND','http://localhost:8000')

server start -> cd /server -> uvicorn app:app --reload
