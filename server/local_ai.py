
import json
import logging
import threading
from collections import deque
from ollama import Client

# Configure logging
logging.basicConfig(level=logging.INFO)

# Ollama settings
MODEL_NAME = 'my_gguf_model'

SYSTEM_INSTRUCTION = """
당신은 AI 텍스트 분석 전문가입니다. 주어진 텍스트가 AI(예: ChatGPT)에 의해 작성되었을 확률(0~100)을 판단해주세요.

다음 기준으로 분석하세요:
- 반복적인 문구나 패턴
- 개성 없는 문체
- 지나치게 형식적인 구조
- 부자연스러운 표현

응답은 반드시 다음 형식의 JSON으로 해주세요:
{
  "score": (0-100 사이의 정수),
  "reason": "(분석 근거를 자연스러운 한국어로 30자 이내로 설명)"
}
"""

# --- NEW: 최근 10회 실행시간 저장용 (프로세스 메모리) ---
_ELAPSED_HISTORY = deque(maxlen=10)
_ELAPSED_LOCK = threading.Lock()


def _record_elapsed_and_maybe_avg(elapsed: float) -> float | None:
    """
    실행 시간을 히스토리에 저장하고, 10개가 꽉 찬 경우 평균(초)을 반환.
    10개 미만이면 None 반환.
    """
    with _ELAPSED_LOCK:
        _ELAPSED_HISTORY.append(elapsed)
        if len(_ELAPSED_HISTORY) == 10:
            avg = sum(_ELAPSED_HISTORY) / 10.0
            return avg
        return None
# -----------------------------------------------------------


def local_ai_score(text: str) -> dict:
    """Ollama를 사용하여 로컬에서 텍스트의 AI 작성 확률을 계산합니다."""
    import time
    start_time = time.time()

    try:
        logging.info(f"Starting AI analysis of text ({len(text)} chars)...")

        # Create client (automatically connects to local Ollama instance)
        client = Client()

        # Format prompt for analysis
        prompt = f"""
                {SYSTEM_INSTRUCTION}

                Text to analyze:
                {text[:8000]}

                Example response format:
                {{"score": 75, "reason": "Brief explanation here"}}
                """

        # Generate response
        response = client.generate(
            model=MODEL_NAME,
            prompt=prompt,
            stream=False
        )

        res_text = response.response.strip()

        # Handle case where model returns markdown-formatted JSON
        if res_text.startswith('```json'):
            res_text = res_text.replace('```json', '', 1).strip()
        if res_text.endswith('```'):
            res_text = res_text.rsplit('```', 1)[0].strip()

        result = json.loads(res_text)

        score = max(0, min(100, int(result.get('score', 0))))
        reason = result.get('reason', 'Analysis not available.')

        elapsed_time = time.time() - start_time
        avg10 = _record_elapsed_and_maybe_avg(elapsed_time)

        logging.info(f"AI analysis completed in {elapsed_time:.2f} seconds")
        if avg10 is not None:
            logging.info(f"[10-call average] {avg10:.2f} seconds over last 10 runs")

        # avg10이 있을 때만 응답에 포함
        response_payload = {'score': score, 'reason': reason}
        if avg10 is not None:
            response_payload['avg_elapsed_10'] = round(avg10, 3)

        return response_payload

    except json.JSONDecodeError:
        elapsed_time = time.time() - start_time
        avg10 = _record_elapsed_and_maybe_avg(elapsed_time)

        logging.error("Model returned invalid JSON.")
        if avg10 is not None:
            logging.info(f"[10-call average] {avg10:.2f} seconds over last 10 runs")

        payload = {"score": -1, "reason": f"Model output format error (after {elapsed_time:.2f}s)"}
        if avg10 is not None:
            payload['avg_elapsed_10'] = round(avg10, 3)
        return payload

    except Exception as e:
        elapsed_time = time.time() - start_time
        avg10 = _record_elapsed_and_maybe_avg(elapsed_time)

        logging.error(f"Unexpected error: {e}")
        if avg10 is not None:
            logging.info(f"[10-call average] {avg10:.2f} seconds over last 10 runs")

        payload = {"score": -1, "reason": f"Unexpected error: {str(e)}"}
        if avg10 is not None:
            payload['avg_elapsed_10'] = round(avg10, 3)
        return payload

