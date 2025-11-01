from flask import Flask, request, jsonify
from flask_cors import CORS
from extract_text import extract_text_from_url
from gemini_ai import gemini_ai_score
from gpt_ai import gpt_ai_score
from local_ai import local_ai_score

app = Flask(__name__)

CORS(app)

MODEL = 'gemini'

def get_ai_score(text:str, MODEL='gemini') -> dict:
    res: dict = {}
    if MODEL == 'gemini':
        res = gemini_ai_score(text)
    elif MODEL == 'gpt':
        res = gpt_ai_score(text)
    elif MODEL == 'fine-model':
        res = local_ai_score(text)
    return res

@app.route('/score', methods=['POST'])
def ai_score():
    try:
        data = request.get_json()
        url = data.get('url')
    except Exception:
        return jsonify({'error': "Invalid JSON payload."}), 400

    if not url:
        return jsonify({'error': 'URL missing.'}), 400

    text = extract_text_from_url(url)
    if not text:
        return jsonify({'url': url, 'ai_score': 0, 'reason': 'could not extract text or URL is invalid'}), 200

    res = get_ai_score(text, MODEL)
    score = res.get('score', 0)
    reason = res.get('reason', 'unknown reason')

    return jsonify({
        'url': url,
        'ai_score': score,
        'reason': reason
        }), 200


def main():
    app.run(host='127.0.0.1', port=5000)


if __name__ == '__main__':
    main()

