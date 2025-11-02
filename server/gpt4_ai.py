import os
import json
import math
import logging
from openai import OpenAI

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = "ft:gpt-4.1-nano-2025-04-14:personal::CX0PCbYT"
SYSTEM_INSTRUCTION = """
You are an AI-writing detector.
Judge the USER text by the cues below and output EXACTLY ONE single-line JSON:

{\"label\":\"ai_like\"|\"human_like\", \"cues\": [tokens], \"reason\": \"(짧은 분석 근거)\"}

Cues (use heuristics only from the given text):
- ai_like: 템플릿형 도입, 균질한 리듬, 일반론 위주, 과한 정중체, 관용구 반복, 목록형 구조, 낮은 어휘 다양성, 복붙형 후킹 문장, 과도한 회피적 표현, 갑작스러운 주제 전환, 부자연스러운 존칭 표현, 부자연스러운 조사 사용,
- human_like: 고유명사, 수치 디테일, 경험적 디테일, 문장 길이 변동, 비균질 리듬, 자기수정, 개성적 문체, 구어체·속어 표현, 경미한 오타.

Hard rules:
1. JSON 한 줄만 출력. 여분 텍스트/키 금지. 외부 사실 검증 금지.
2. cues는 위 Cues에서만 고를 것. 새로운 cue 생성 금지.
3. reason은 선택된 cues를 근거로 짧게 요약 (30자 이내 자연스러운 한국어).
"""

AI_CUE_SET = {
    "템플릿형 도입",
    "균질한 리듬",
    "일반론 위주",
    "과한 정중체",
    "관용구 반복",
    "목록형 구조",
    "낮은 어휘 다양성",
    "복붙형 후킹 문장",
    "과도한 회피적 표현",
    "갑작스러운 주제 전환",
    "부자연스러운 존칭 표현",
    "부자연스러운 조사 사용",
}
HUMAN_CUE_SET = {
    "고유명사",
    "수치 디테일",
    "경험적 디테일",
    "문장 길이 변동",
    "비균질 리듬",
    "자기수정",
    "개성적 문체",
    "구어체·속어 표현",
    "경미한 오타",
}


def filter_ques(ques, que_set) -> list[str]:
    seen = set()
    answer = []

    for que in ques:
        if que in seen:
            continue
        if que in que_set:
            answer.append(que)
            seen.add(que)
    return answer


def sigmoid(x: float) -> float:
    alpha = 0.7
    bias = 0.0
    x = alpha * x + bias
    return 1.0 / (1.0 + math.exp(-x))


def gpt4_ai_score(text: str) -> dict:
    """OpenAI GPT를 사용하여 텍스트의 AI 작성 확률을 계산합니다."""
    if not API_KEY:
        return {"score": -1, "reason": "Not found OPENAI_API_KEY."}

    try:
        client = OpenAI(api_key=API_KEY)

        print(repr(text))

        resp = client.responses.parse(
            model=MODEL_NAME,
            input=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": text},
            ],
            temperature=0.0,
            top_p=0,
        )

        output = json.loads(resp.output_text)

        label = output.get("label", "uncertain")

        reason = output.get("reason", "no_reason")

        que_list: list[str] = output.get("cues", [])

        ai_ques = filter_ques(que_list, AI_CUE_SET)
        human_ques = filter_ques(que_list, HUMAN_CUE_SET)

        n_ai = len(ai_ques)
        n_human = len(human_ques)

        x = n_ai - n_human

        prob = sigmoid(x)

        return {"score": round(prob * 100), "reason": reason}

    except json.JSONDecodeError as e:
        logging.error(f"GPT returned unparseable JSON: {e}")
        return {"score": -1, "reason": "AI output format error."}
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return {"score": -1, "reason": f"Unexpected error: {str(e)}"}
