from trafilatura import fetch_url, extract
import logging

def extract_text_from_url(url: str) -> str | None:
    try:
        downloaded = fetch_url(url)
        if downloaded:
            text = extract(
                downloaded,
                include_comments=False,
                with_metadata=False,
                no_fallback=True
            )

            if not text or len(text.strip()) < 100:
                return None
            
            return text
        return None
    except Exception as e:
        logging.error(f"Text extraction failed for {url}: {e}")
        return None
        
