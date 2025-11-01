import os
import json
import logging
from openai import OpenAI
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('OPENAI_API_KEY')
MODEL_NAME = 'gpt-5-nano'
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

def gpt_ai_score(text: str) -> dict:
    """OpenAI GPT를 사용하여 텍스트의 AI 작성 확률을 계산합니다."""
    if not API_KEY:
        return {'score': -1, 'reason': 'Not found OPENAI_API_KEY.'}

    try:
        client = OpenAI(api_key=API_KEY)
        messages = [
            ChatCompletionSystemMessageParam(role="system", content=SYSTEM_INSTRUCTION),
            ChatCompletionUserMessageParam(role="user", content=f"""
            Analyze the following text and provide the AI generation probability score based on the criteria provided:
            --- TEXT BEGIN ---
            {text[:8000]}
            --- TEXT END ---
            """)
        ]

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            response_format={ "type": "json_object" }
        )

        content = response.choices[0].message.content
        if content is None:
            return {"score": -1, "reason": "Empty response from AI."}
        res_text = content.strip()
        result = json.loads(res_text)

        score = max(0, min(100, int(result.get('score', 0))))
        reason = result.get('reason', 'Analysis not available.')

        return {'score': score, 'reason': reason}

    except json.JSONDecodeError:
        logging.error(f"GPT returned unparseable JSON: {res_text}")
        return {"score": -1, "reason": "AI output format error."}
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return {"score": -1, "reason": f"Unexpected error: {str(e)}"}
