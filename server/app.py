import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx


from text_extract import extract_main_text
from detector_clients import ai_score


app = FastAPI()


# CORS for extension
app.add_middleware(
CORSMiddleware,
allow_origins=["*"],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)


class BulkReq(BaseModel):
    urls: list[str]


@app.get('/health')
async def health():
    return {"ok": True}


@app.get('/analyze')
async def analyze(url: str = Query(..., min_length=8)):
    text = await extract_main_text(url)
    if not text:
        raise HTTPException(status_code=422, detail="No extractable text")
    score = await ai_score(text)
    return {"url": url, "score": score}


@app.post('/bulk_analyze')
async def bulk_analyze(body: BulkReq):
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
    # naive sequential; can be parallelized with asyncio.gather
        for url in body.urls:
            try:
                text = await extract_main_text(url)
                if not text:
                    results.append({"url": url, "error": "no_text"})
                    continue
                score = await ai_score(text)
                results.append({"url": url, "score": score})
            except Exception as e:
                results.append({"url": url, "error": str(e)})
    return {"results": results}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=os.getenv('HOST', '0.0.0.0'), port=int(os.getenv('PORT', 8000)))