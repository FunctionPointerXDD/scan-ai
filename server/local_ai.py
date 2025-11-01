import json
import logging
from ollama import Client

# Configure logging
logging.basicConfig(level=logging.INFO)

# Ollama settings
MODEL_NAME = 'gemma3'

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

def local_ai_score(text: str) -> dict:
    """Ollama를 사용하여 로컬에서 텍스트의 AI 작성 확률을 계산합니다."""
    try:
        import time
        start_time = time.time()
        
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

        try:
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
            logging.info(f"AI analysis completed in {elapsed_time:.2f} seconds")
            return {'score': score, 'reason': reason}

        except json.JSONDecodeError:
            elapsed_time = time.time() - start_time
            logging.error(f"Model returned invalid JSON: {res_text}")
            return {"score": -1, "reason": f"Model output format error (after {elapsed_time:.2f}s)"}

    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return {"score": -1, "reason": f"Unexpected error: {str(e)}"}


# def ensure_model_available(model_name: str = MODEL_NAME) -> bool:
#     """지정된 모델이 Ollama에 설치되어 있는지 확인하고 필요시 다운로드합니다."""
#     try:
#         client = Client(host=OLLAMA_HOST)
#         try:
#             client.show(model=model_name)
#             logging.info(f"Model {model_name} is available")
#             return True
#         except Exception:
#             logging.warning(f"Model {model_name} not found, attempting to pull...")
#             client.pull(model=model_name)
#             logging.info(f"Successfully pulled {model_name}")
#             return True
#     except Exception as e:
#         logging.error(f"Failed to ensure model availability: {e}")
#         return False

# if __name__ == "__main__":
#     # Simple test
#     test_text = "This is a test text to analyze for AI probability scoring."
    
#     if ensure_model_available():
#         result = local_ai_score(test_text)
#         print(f"Score: {result['score']}")
#         print(f"Reason: {result['reason']}")
#     else:
#         print("Failed to initialize local AI model")
