from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

DB_FILE = 'neon_racer.db'


# ================= DATABASE =================
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            pass TEXT NOT NULL,
            high_score INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    conn.commit()
    conn.close()


# ================= ROUTES =================
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    password = data.get('pass') or ''

    if len(name) < 3 or len(name) > 12:
        return jsonify({'error': 'Nama harus 3-12 karakter'}), 400
    if len(password) < 3:
        return jsonify({'error': 'Password minimal 3 karakter'}), 400

    conn = get_db()
    try:
        cur = conn.execute(
            'INSERT INTO users (name, pass) VALUES (?, ?)', (name, password)
        )
        conn.commit()
        user_id = cur.lastrowid
        return jsonify({
            'user': {
                'id': user_id,
                'name': name,
                'high_score': 0,
            }
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Nama sudah dipakai'}), 409
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    password = data.get('pass') or ''

    conn = get_db()
    row = conn.execute(
        'SELECT id, name, high_score FROM users WHERE name=? AND pass=?',
        (name, password)
    ).fetchone()
    conn.close()

    if not row:
        return jsonify({'error': 'Nama atau password salah'}), 401

    return jsonify({
        'user': {
            'id': row['id'],
            'name': row['name'],
            'high_score': row['high_score'],
        }
    })


@app.route('/api/scores', methods=['GET'])
def get_scores():
    conn = get_db()
    rows = conn.execute('''
        SELECT u.name, MAX(s.score) AS score
        FROM scores s
        JOIN users u ON u.id = s.user_id
        GROUP BY u.id
        ORDER BY score DESC
        LIMIT 10
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/scores', methods=['POST'])
def add_score():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    score = int(data.get('score', 0))

    if not user_id:
        return jsonify({'error': 'user_id wajib'}), 400
    if score <= 0:
        return jsonify({'error': 'Skor tidak valid'}), 400

    conn = get_db()
    conn.execute(
        'INSERT INTO scores (user_id, score) VALUES (?, ?)', (user_id, score)
    )
    # Update high_score user
    conn.execute(
        '''UPDATE users SET high_score = MAX(high_score, ?)
           WHERE id = ?''', (score, user_id)
    )
    conn.commit()
    conn.close()

    return jsonify({'status': 'ok', 'score': score}), 201


@app.route('/api/health')
def health():
    return jsonify({'status': 'OK', 'time': datetime.now().isoformat()})


# ================= MAIN =================
init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
