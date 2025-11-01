# Serp AI Score Detector

## 1. 서버 (Python Backend) 설정 및 실행

1.  **환경 설정:** `server/.env.example` 파일을 복사하여 `server/.env`로 이름을 변경하고, **Google AI Studio**에서 발급받은 `GEMINI_API_KEY`를 설정합니다.
2.  **의존성 설치:**
    ```bash
    cd server
    pip install -r requirements.txt
    ```
3.  **서버 실행:**
    ```bash
    python app.py
    ```
    서버는 기본적으로 `http://127.0.0.1:5000`에서 실행됩니다.

## 2. 크롬 확장 프로그램 설치

1.  크롬 브라우저를 열고 `chrome://extensions` 로 이동합니다.
2.  오른쪽 상단의 **개발자 모드**를 웁니다.
3.  **압축 해제된 확장 프로그램 로드** 버튼을 클릭하고, `serp-ai-score/extension` 폴더를 선택합니다.

## 3. 사용

1.  서버가 실행 중인 상태에서 Google 검색을 수행합니다.
2.  각 검색 결과 링크 옆에 "AI Score"가 표시됩니다.
