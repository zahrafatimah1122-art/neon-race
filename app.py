from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

SCORES_FILE = 'scores.json'


# ---------- Helper ----------
def load_scores():
    if not os.path.exists(SCORES_FILE):
        return []
    with open(SCORES_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_scores(scores):
    with open(SCORES_FILE, 'w') as f:
        json.dump(scores, f, indent=2)


# ---------- Routes ----------
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/api/scores', methods=['GET'])
def get_scores():
    """Ambil 10 skor tertinggi."""
    scores = load_scores()
    scores.sort(key=lambda x: x['score'], reverse=True)
    return jsonify(scores[:10])


@app.route('/api/scores', methods=['POST'])
def add_score():
    """Simpan skor baru dari game."""
    data = request.get_json()
    name = (data.get('name') or 'Pemain').strip()[:12]
    score = int(data.get('score', 0))

    if score <= 0:
        return jsonify({'error': 'Skor tidak valid'}), 400

    scores = load_scores()
    scores.append({
        'name': name,
        'score': score,
        'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
    })
    scores = scores[-100:]  # batasi 100 entri terakhir
    save_scores(scores)

    return jsonify({'status': 'ok', 'message': 'Skor disimpan!'}), 201


@app.route('/api/health')
def health():
    return jsonify({'status': 'OK', 'time': datetime.now().isoformat()})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
