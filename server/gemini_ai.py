import os
import json
import logging
from google import genai
from google.genai import types
from google.genai.errors import APIError
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

API_KEY = os.getenv('GEMINI_API_KEY')
MODEL_NAME = 'gemini-2.5-flash-lite'
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
class Recipe(BaseModel):
    score: int
    reason: str

def gemini_ai_score(text: str) -> dict:
    if not API_KEY:
        return {'score': -1, 'reason': 'Not found api-key.'}

    try:
        client = genai.Client(api_key=API_KEY)

        config = types.GenerateContentConfig(
            temperature = 0.0,
            response_mime_type='application/json',
            response_schema= Recipe,
            system_instruction=SYSTEM_INSTRUCTION
        )
        prompt = f"""
        Analyze the following text and provide the AI generation probability score based on the criteria provided:
        --- TEXT BEGIN ---
        {text[:8000]}
        --- TEXT END ---
        """

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config
        )

        res_text = response.text.strip() if response.text is not None else ""
        result = json.loads(res_text)

        score = max(0, min(100, int(result.get('score', 0))))
        reason = result.get('reason', 'Analysis not available.')

        return {'score': score, 'reason': reason}

    except APIError as e:
        msg = str(e)
        logging.error(f"Gemini API Error: {e}")
        if 'UNAUTHENTICATED' in msg or 'API keys are not supported' in msg or 'CREDENTIALS' in msg:
            logging.warning("Authentication issue detected from Gemini API — falling back to local heuristic.")
            return {"score": -1, "reason": "UNAUTHENTICATED API key issue."}
        return {"score": -1, "reason": f"API Call Error: {str(e)}"}
    except json.JSONDecodeError:
        logging.error(f"Gemini returned unparseable JSON: {response.text}")
        return {"score": -1, "reason": "AI output format error."}
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return {"score": -1, "reason": f"Unexpected error: {str(e)}"}
    
