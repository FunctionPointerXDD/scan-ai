# AI-Smell: AI 작성 텍스트 감지 도구

구글 검색 결과에서 AI가 작성한 콘텐츠를 실시간으로 감지하고 표시하는 크롬 확장 프로그램입니다.

## 주요 기능

- 구글 검색 결과에 AI 작성 확률을 실시간으로 표시
- 다중 AI 모델 지원 (Gemini, GPT, Local LLM)
- 자연스러운 한국어 분석 결과 제공
- 시각적 피드백 (색상 코드로 위험도 표시)
- 측면 패널에 AI 작성 확률별로 페이지 조회 기능 제공

## 시스템 요구사항

- Python 3.10 이상
- Chrome 브라우저
- (선택) Ollama (로컬 AI 모델 사용시)

## 설치 방법

### 1. 서버 설정

```bash
# 가상환경 생성 및 활성화
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r server/requirements.txt

flask --app app run

```

```bash
#또는 run.sh 실행
chmod +x run.sh
./run.sh

```

### 2. 환경 변수 설정

`server/.env` 파일 생성:

```env
# Gemini AI 사용시
GEMINI_API_KEY=your_gemini_api_key

# GPT 사용시
OPENAI_API_KEY=your_openai_api_key
```

### 3. 크롬 확장 프로그램 설치

1. Chrome 브라우저에서 `chrome://extensions` 열기
2. 개발자 모드 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `chrome-extension` 폴더 선택

## 사용 방법

### 1. Flask 서버 실행

서버 디렉토리에서:

```bash
cd server
python app.py
```

기본적으로 http://localhost:5000 에서 실행됩니다.

### 2. AI 모델 선택

`server/app.py`의 `MODEL` 변수를 수정하여 사용할 AI 모델을 선택할 수 있습니다:

```python
MODEL = 'gemini'    # Gemini AI 사용 (기본값)
MODEL = 'gpt'       # GPT-3.5 사용
MODEL = 'local' # Local LLM 사용
```

### AI 모델별 설정

#### 1. Gemini AI (기본)
- API 키 필요
- 빠른 응답 속도
- `.env` 파일에 `GEMINI_API_KEY` 설정 필요

#### 2. GPT
- OpenAI API 키 필요
- 높은 정확도
- `.env` 파일에 `OPENAI_API_KEY` 설정 필요

#### 3. Local LLM (Ollama 기반)
- API 키 불필요
- 완전한 프라이버시
- Ollama 설치 및 모델 다운로드 필요:
```bash
# Ollama 설치
curl -fsSL https://ollama.com/install.sh | sh

# 모델 다운로드 (기본: gemma)
ollama pull gemma
```

## API 엔드포인트

### POST /score

텍스트의 AI 작성 확률을 분석합니다.

요청:
```json
{
    "url": "https://example.com/article"
}
```

응답:
```json
{
    "url": "https://example.com/article",
    "ai_score": 85,
    "reason": "반복적인 문구와 형식적인 문체가 뚜렷함"
}
```

## 라이센스

MIT License