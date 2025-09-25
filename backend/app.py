#!/usr/bin/env python3
"""
POLITIC-SANDBOX Backend API
Flask application with SQLite database for managing posts, polls, users, and comments.
"""

from flask import Flask, request, jsonify, render_template, g
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change in production
CORS(app)

# Configuration
DATABASE = 'politic_sandbox.db'
DEBUG = True

# ===== DATABASE FUNCTIONS =====

def get_db():
    """Get database connection"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Close database connection"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize database with required tables"""
    with app.app_context():
        db = get_db()
        db.executescript('''
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                avatar_url TEXT DEFAULT 'https://via.placeholder.com/40',
                role TEXT DEFAULT 'student',
                university TEXT,
                faculty TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            );

            -- Posts table
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('post', 'poll')),
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                tags TEXT, -- JSON array stored as string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            -- Post interactions (likes, shares)
            CREATE TABLE IF NOT EXISTS post_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                interaction_type TEXT NOT NULL CHECK(interaction_type IN ('like', 'share')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(post_id, user_id, interaction_type)
            );

            -- Comments table
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                parent_comment_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (parent_comment_id) REFERENCES comments (id)
            );

            -- Poll options table
            CREATE TABLE IF NOT EXISTS poll_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                option_text TEXT NOT NULL,
                option_order INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id)
            );

            -- Poll votes table
            CREATE TABLE IF NOT EXISTS poll_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                option_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (option_id) REFERENCES poll_options (id),
                UNIQUE(post_id, user_id)
            );

            -- Poll metadata table
            CREATE TABLE IF NOT EXISTS poll_metadata (
                post_id INTEGER PRIMARY KEY,
                duration_days INTEGER NOT NULL DEFAULT 7,
                end_date DATETIME,
                allow_multiple BOOLEAN DEFAULT 0,
                is_anonymous BOOLEAN DEFAULT 0,
                FOREIGN KEY (post_id) REFERENCES posts (id)
            );

            -- Sessions table for user authentication
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
            CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
            CREATE INDEX IF NOT EXISTS idx_interactions_post_user ON post_interactions(post_id, user_id);
            CREATE INDEX IF NOT EXISTS idx_poll_votes_post_user ON poll_votes(post_id, user_id);
        ''')
        db.commit()

def seed_db():
    """Seed database with initial data"""
    db = get_db()
    
    # Check if users already exist
    existing_users = db.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    if existing_users > 0:
        return  # Database already seeded
    
    # Create sample users
    sample_users = [
        {
            'username': 'admin',
            'email': 'admin@university.edu',
            'password_hash': generate_password_hash('admin123'),
            'full_name': 'Administrator',
            'role': 'admin',
            'university': 'Universidad Central',
            'faculty': 'Administración'
        },
        {
            'username': 'maria_gonzalez',
            'email': 'maria@university.edu',
            'password_hash': generate_password_hash('password123'),
            'full_name': 'María González',
            'role': 'student',
            'university': 'Universidad Central',
            'faculty': 'Ciencias Políticas'
        },
        {
            'username': 'carlos_lopez',
            'email': 'carlos@university.edu',
            'password_hash': generate_password_hash('password123'),
            'full_name': 'Carlos López',
            'role': 'student',
            'university': 'Universidad Central',
            'faculty': 'Derecho'
        },
        {
            'username': 'ana_garcia',
            'email': 'ana@university.edu',
            'password_hash': generate_password_hash('password123'),
            'full_name': 'Ana García',
            'role': 'student',
            'university': 'Universidad Central',
            'faculty': 'Sociología'
        }
    ]
    
    for user in sample_users:
        db.execute('''
            INSERT INTO users (username, email, password_hash, full_name, role, university, faculty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user['username'], user['email'], user['password_hash'], 
              user['full_name'], user['role'], user['university'], user['faculty']))
    
    db.commit()
    
    # Create sample posts
    sample_posts = [
        {
            'user_id': 2,  # Maria
            'type': 'post',
            'category': 'debate',
            'title': '¿Deberían las universidades públicas ser completamente gratuitas?',
            'content': 'He estado pensando sobre el acceso a la educación superior y me parece que eliminar completamente las cuotas podría beneficiar a más estudiantes. ¿Qué opinan? ¿Cómo se financiaría esto?',
            'tags': '["educacion", "financiamiento", "acceso"]'
        },
        {
            'user_id': 3,  # Carlos
            'type': 'post',
            'category': 'announcement',
            'title': 'Nueva iniciativa de sostenibilidad en el campus',
            'content': 'Nos complace anunciar el lanzamiento del programa "Campus Verde" que incluirá estaciones de reciclaje, paneles solares y un huerto estudiantil. ¡Únete a la revolución sostenible!',
            'tags': '["sostenibilidad", "medioambiente", "campus"]'
        },
        {
            'user_id': 4,  # Ana
            'type': 'poll',
            'category': 'poll',
            'title': '¿Cuál es tu prioridad principal para el próximo semestre?',
            'content': 'Ayúdanos a entender qué es lo más importante para la comunidad estudiantil',
            'tags': '["prioridades", "semestre", "estudiantes"]'
        }
    ]
    
    for post in sample_posts:
        cursor = db.execute('''
            INSERT INTO posts (user_id, type, category, title, content, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (post['user_id'], post['type'], post['category'], 
              post['title'], post['content'], post['tags']))
        
        # If it's a poll, add poll options and metadata
        if post['type'] == 'poll':
            post_id = cursor.lastrowid
            poll_options = [
                'Mejorar la infraestructura',
                'Más becas y apoyo financiero',
                'Programas deportivos y culturales',
                'Mejor calidad académica'
            ]
            
            for i, option in enumerate(poll_options):
                db.execute('''
                    INSERT INTO poll_options (post_id, option_text, option_order)
                    VALUES (?, ?, ?)
                ''', (post_id, option, i))
            
            # Add poll metadata
            end_date = datetime.now() + timedelta(days=7)
            db.execute('''
                INSERT INTO poll_metadata (post_id, duration_days, end_date)
                VALUES (?, ?, ?)
            ''', (post_id, 7, end_date))
    
    db.commit()

# ===== HELPER FUNCTIONS =====

def get_user_by_session(session_id):
    """Get user from session ID"""
    if not session_id:
        return None
    
    db = get_db()
    result = db.execute('''
        SELECT u.* FROM users u
        JOIN user_sessions s ON u.id = s.user_id
        WHERE s.id = ? AND s.is_active = 1 AND s.expires_at > ?
    ''', (session_id, datetime.now())).fetchone()
    
    return dict(result) if result else None

def create_session(user_id):
    """Create a new user session"""
    session_id = str(uuid.uuid4())
    expires_at = datetime.now() + timedelta(days=30)  # 30 days
    
    db = get_db()
    db.execute('''
        INSERT INTO user_sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
    ''', (session_id, user_id, expires_at))
    db.commit()
    
    return session_id

def get_post_stats(post_id):
    """Get statistics for a post"""
    db = get_db()
    
    # Get likes count
    likes = db.execute('''
        SELECT COUNT(*) FROM post_interactions 
        WHERE post_id = ? AND interaction_type = 'like'
    ''', (post_id,)).fetchone()[0]
    
    # Get comments count
    comments = db.execute('''
        SELECT COUNT(*) FROM comments 
        WHERE post_id = ? AND is_active = 1
    ''', (post_id,)).fetchone()[0]
    
    # Get shares count
    shares = db.execute('''
        SELECT COUNT(*) FROM post_interactions 
        WHERE post_id = ? AND interaction_type = 'share'
    ''', (post_id,)).fetchone()[0]
    
    return {'likes': likes, 'comments': comments, 'shares': shares}

def get_poll_results(post_id):
    """Get poll results"""
    db = get_db()
    
    # Get options with vote counts
    options = db.execute('''
        SELECT po.id, po.option_text, po.option_order,
               COUNT(pv.id) as votes
        FROM poll_options po
        LEFT JOIN poll_votes pv ON po.id = pv.option_id
        WHERE po.post_id = ?
        GROUP BY po.id, po.option_text, po.option_order
        ORDER BY po.option_order
    ''', (post_id,)).fetchall()
    
    # Get total votes
    total_votes = db.execute('''
        SELECT COUNT(*) FROM poll_votes WHERE post_id = ?
    ''', (post_id,)).fetchone()[0]
    
    return {
        'options': [dict(opt) for opt in options],
        'total_votes': total_votes
    }

# ===== API ROUTES =====

@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('dashboard.html')

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    db = get_db()
    user = db.execute('''
        SELECT * FROM users WHERE username = ? AND is_active = 1
    ''', (username,)).fetchone()
    
    if user and check_password_hash(user['password_hash'], password):
        # Update last active
        db.execute('''
            UPDATE users SET last_active = ? WHERE id = ?
        ''', (datetime.now(), user['id']))
        db.commit()
        
        # Create session
        session_id = create_session(user['id'])
        
        user_data = dict(user)
        del user_data['password_hash']  # Don't send password hash
        
        return jsonify({
            'success': True,
            'user': user_data,
            'session_id': session_id
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    """User registration"""
    data = request.get_json()
    
    required_fields = ['username', 'email', 'password', 'full_name']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    db = get_db()
    
    # Check if username or email already exists
    existing = db.execute('''
        SELECT id FROM users WHERE username = ? OR email = ?
    ''', (data['username'], data['email'])).fetchone()
    
    if existing:
        return jsonify({'error': 'Username or email already exists'}), 409
    
    # Create new user
    password_hash = generate_password_hash(data['password'])
    
    cursor = db.execute('''
        INSERT INTO users (username, email, password_hash, full_name, university, faculty)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['username'], data['email'], password_hash, data['full_name'],
          data.get('university', ''), data.get('faculty', '')))
    
    user_id = cursor.lastrowid
    db.commit()
    
    # Create session
    session_id = create_session(user_id)
    
    # Get created user
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    user_data = dict(user)
    del user_data['password_hash']
    
    return jsonify({
        'success': True,
        'user': user_data,
        'session_id': session_id
    }), 201

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """User logout"""
    session_id = request.headers.get('Session-ID')
    
    if session_id:
        db = get_db()
        db.execute('''
            UPDATE user_sessions SET is_active = 0 WHERE id = ?
        ''', (session_id,))
        db.commit()
    
    return jsonify({'success': True})

# Posts routes
@app.route('/api/posts', methods=['GET'])
def get_posts():
    """Get posts with filters"""
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    category = request.args.get('category')
    post_type = request.args.get('type')
    
    offset = (page - 1) * limit
    
    # Build query
    query = '''
        SELECT p.*, u.username, u.full_name, u.avatar_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.is_active = 1
    '''
    params = []
    
    if category and category != 'all':
        query += ' AND p.category = ?'
        params.append(category)
    
    if post_type:
        query += ' AND p.type = ?'
        params.append(post_type)
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])
    
    db = get_db()
    posts = db.execute(query, params).fetchall()
    
    # Enrich posts with stats and poll data
    enriched_posts = []
    for post in posts:
        post_dict = dict(post)
        post_dict['stats'] = get_post_stats(post['id'])
        
        if post['type'] == 'poll':
            poll_data = get_poll_results(post['id'])
            post_dict['poll_options'] = poll_data['options']
            post_dict['total_votes'] = poll_data['total_votes']
            
            # Get poll metadata
            metadata = db.execute('''
                SELECT * FROM poll_metadata WHERE post_id = ?
            ''', (post['id'],)).fetchone()
            if metadata:
                post_dict['poll_metadata'] = dict(metadata)
        
        # Parse tags
        if post_dict['tags']:
            post_dict['tags'] = json.loads(post_dict['tags'])
        else:
            post_dict['tags'] = []
            
        enriched_posts.append(post_dict)
    
    return jsonify({
        'posts': enriched_posts,
        'page': page,
        'limit': limit
    })

@app.route('/api/posts', methods=['POST'])
def create_post():
    """Create a new post or poll"""
    session_id = request.headers.get('Session-ID')
    user = get_user_by_session(session_id)
    
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['type', 'category', 'title']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    if data['type'] not in ['post', 'poll']:
        return jsonify({'error': 'Invalid post type'}), 400
    
    db = get_db()
    
    # Create post
    tags_json = json.dumps(data.get('tags', []))
    
    cursor = db.execute('''
        INSERT INTO posts (user_id, type, category, title, content, tags)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user['id'], data['type'], data['category'], 
          data['title'], data.get('content', ''), tags_json))
    
    post_id = cursor.lastrowid
    
    # If it's a poll, create poll options and metadata
    if data['type'] == 'poll':
        options = data.get('options', [])
        if len(options) < 2:
            return jsonify({'error': 'Poll must have at least 2 options'}), 400
        
        for i, option in enumerate(options):
            db.execute('''
                INSERT INTO poll_options (post_id, option_text, option_order)
                VALUES (?, ?, ?)
            ''', (post_id, option, i))
        
        # Create poll metadata
        duration_days = data.get('duration_days', 7)
        end_date = datetime.now() + timedelta(days=duration_days)
        
        db.execute('''
            INSERT INTO poll_metadata (post_id, duration_days, end_date)
            VALUES (?, ?, ?)
        ''', (post_id, duration_days, end_date))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'post_id': post_id
    }), 201

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def toggle_post_like(post_id):
    """Toggle like on a post"""
    session_id = request.headers.get('Session-ID')
    user = get_user_by_session(session_id)
    
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    db = get_db()
    
    # Check if already liked
    existing = db.execute('''
        SELECT id FROM post_interactions 
        WHERE post_id = ? AND user_id = ? AND interaction_type = 'like'
    ''', (post_id, user['id'])).fetchone()
    
    if existing:
        # Unlike
        db.execute('''
            DELETE FROM post_interactions 
            WHERE post_id = ? AND user_id = ? AND interaction_type = 'like'
        ''', (post_id, user['id']))
        action = 'unliked'
    else:
        # Like
        db.execute('''
            INSERT INTO post_interactions (post_id, user_id, interaction_type)
            VALUES (?, ?, 'like')
        ''', (post_id, user['id']))
        action = 'liked'
    
    db.commit()
    
    # Return updated stats
    stats = get_post_stats(post_id)
    
    return jsonify({
        'success': True,
        'action': action,
        'stats': stats
    })

@app.route('/api/polls/<int:poll_id>/vote', methods=['POST'])
def vote_in_poll(poll_id):
    """Vote in a poll"""
    session_id = request.headers.get('Session-ID')
    user = get_user_by_session(session_id)
    
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    data = request.get_json()
    option_id = data.get('option_id')
    
    if not option_id:
        return jsonify({'error': 'option_id is required'}), 400
    
    db = get_db()
    
    # Check if user already voted
    existing_vote = db.execute('''
        SELECT id FROM poll_votes WHERE post_id = ? AND user_id = ?
    ''', (poll_id, user['id'])).fetchone()
    
    if existing_vote:
        return jsonify({'error': 'You have already voted in this poll'}), 409
    
    # Check if poll is still active
    poll_meta = db.execute('''
        SELECT end_date FROM poll_metadata WHERE post_id = ?
    ''', (poll_id,)).fetchone()
    
    if poll_meta and datetime.fromisoformat(poll_meta['end_date']) < datetime.now():
        return jsonify({'error': 'This poll has ended'}), 410
    
    # Cast vote
    db.execute('''
        INSERT INTO poll_votes (post_id, user_id, option_id)
        VALUES (?, ?, ?)
    ''', (poll_id, user['id'], option_id))
    
    db.commit()
    
    # Return updated results
    results = get_poll_results(poll_id)
    
    return jsonify({
        'success': True,
        'results': results
    })

# Comments routes
@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    """Get comments for a post"""
    db = get_db()
    
    comments = db.execute('''
        SELECT c.*, u.username, u.full_name, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.is_active = 1
        ORDER BY c.created_at ASC
    ''', (post_id,)).fetchall()
    
    return jsonify({
        'comments': [dict(c) for c in comments]
    })

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    """Create a comment on a post"""
    session_id = request.headers.get('Session-ID')
    user = get_user_by_session(session_id)
    
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    data = request.get_json()
    content = data.get('content')
    
    if not content or not content.strip():
        return jsonify({'error': 'Comment content is required'}), 400
    
    db = get_db()
    
    cursor = db.execute('''
        INSERT INTO comments (post_id, user_id, content, parent_comment_id)
        VALUES (?, ?, ?, ?)
    ''', (post_id, user['id'], content.strip(), data.get('parent_comment_id')))
    
    comment_id = cursor.lastrowid
    db.commit()
    
    return jsonify({
        'success': True,
        'comment_id': comment_id
    }), 201

# User routes
@app.route('/api/users/active', methods=['GET'])
def get_active_users():
    """Get list of recently active users"""
    db = get_db()
    
    # Users active in last 24 hours
    active_users = db.execute('''
        SELECT id, username, full_name, avatar_url, last_active
        FROM users 
        WHERE last_active > ? AND is_active = 1
        ORDER BY last_active DESC
        LIMIT 10
    ''', (datetime.now() - timedelta(hours=24),)).fetchall()
    
    return jsonify({
        'active_users': [dict(u) for u in active_users]
    })

# Statistics routes
@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get platform statistics"""
    db = get_db()
    
    # Basic counts
    total_posts = db.execute('SELECT COUNT(*) FROM posts WHERE is_active = 1').fetchone()[0]
    total_debates = db.execute("SELECT COUNT(*) FROM posts WHERE category = 'debate' AND is_active = 1").fetchone()[0]
    total_polls = db.execute("SELECT COUNT(*) FROM posts WHERE type = 'poll' AND is_active = 1").fetchone()[0]
    total_users = db.execute('SELECT COUNT(*) FROM users WHERE is_active = 1').fetchone()[0]
    
    # Active users (last 24 hours)
    active_users = db.execute('''
        SELECT COUNT(*) FROM users 
        WHERE last_active > ? AND is_active = 1
    ''', (datetime.now() - timedelta(hours=24),)).fetchone()[0]
    
    # Engagement calculation (likes + comments per post)
    engagement = db.execute('''
        SELECT 
            COALESCE(AVG(
                (SELECT COUNT(*) FROM post_interactions WHERE post_id = p.id AND interaction_type = 'like') +
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_active = 1)
            ), 0) as avg_engagement
        FROM posts p WHERE p.is_active = 1
    ''').fetchone()[0]
    
    engagement_percentage = min(int(engagement * 10), 100)  # Convert to percentage
    
    return jsonify({
        'total_posts': total_posts,
        'debates': total_debates,
        'polls': total_polls,
        'total_users': total_users,
        'active_users': active_users,
        'engagement_percentage': engagement_percentage
    })

# ===== ERROR HANDLERS =====

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ===== MAIN =====

if __name__ == '__main__':
    # Initialize database
    init_db()
    seed_db()
    
    print("POLITIC-SANDBOX Backend Server")
    print("==============================")
    print("Server starting on http://localhost:5000")
    print("API endpoints available at /api/*")
    print("Database: SQLite (politic_sandbox.db)")
    print("\nSample login credentials:")
    print("Username: admin, Password: admin123")
    print("Username: maria_gonzalez, Password: password123")
    
    app.run(debug=DEBUG, host='0.0.0.0', port=5000)