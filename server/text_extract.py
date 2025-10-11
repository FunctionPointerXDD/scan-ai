# server/text_extract.py
import httpx
import trafilatura

MIN_CHARS = 800  # 너무 짧은 텍스트는 탐지 정확도가 낮음

async def fetch_html(url: str, timeout_s: float = 15.0) -> str | None:
    # 기본적인 다운로드 (리다이렉트/UA 세팅 포함)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout_s) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                return None
            # 일부 사이트는 text/*가 아닐 수도 있으니 그냥 텍스트로 시도
            return resp.text
    except Exception:
        return None

async def extract_main_text(url: str) -> str | None:
    html = await fetch_html(url)
    if not html:
        return None

    # trafilatura는 HTML 문자열을 받아 추출 가능
    text = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        url=url,  # base URL 힌트
    )

    if not text:
        return None

    if len(text) < MIN_CHARS:
        # JS 기반 페이지(예: YouTube 홈)는 보통 본문이 거의 없어 실패
        return None

    return text

