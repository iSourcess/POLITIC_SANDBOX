#!/usr/bin/env python3
"""
Sistema de Base de Datos para POLITIC-SANDBOX
Plataforma de participación política estudiantil
"""

import sqlite3
import hashlib
import datetime
import json
import os
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum
from config import DatabaseConfig, SecurityConfig, ContentConfig, FileConfig

class PostType(Enum):
    DEBATE = "debate"
    POLL = "poll" 
    ANNOUNCEMENT = "announcement"
    QUESTION = "question"
    PROPOSAL = "proposal"

class UserRole(Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MODERATOR = "moderator"

@dataclass
class User:
    id: Optional[int] = None
    username: str = ""
    email: str = ""
    password_hash: str = ""
    full_name: str = ""
    avatar_url: str = ""
    university: str = ""
    career: str = ""
    semester: int = 1
    role: str = UserRole.STUDENT.value
    is_active: bool = True
    created_at: Optional[datetime.datetime] = None
    last_login: Optional[datetime.datetime] = None

@dataclass 
class Post:
    id: Optional[int] = None
    user_id: int = 0
    post_type: str = PostType.DEBATE.value
    title: str = ""
    content: str = ""
    tags: str = ""  # JSON string of tags
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    is_active: bool = True
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

@dataclass
class Poll:
    id: Optional[int] = None
    post_id: int = 0
    title: str = ""
    description: str = ""
    options: str = ""  # JSON string of options
    duration_days: int = 7
    total_votes: int = 0
    is_active: bool = True
    expires_at: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None

@dataclass
class PollVote:
    id: Optional[int] = None
    poll_id: int = 0
    user_id: int = 0
    option_index: int = 0
    created_at: Optional[datetime.datetime] = None

@dataclass
class Comment:
    id: Optional[int] = None
    post_id: int = 0
    user_id: int = 0
    content: str = ""
    likes_count: int = 0
    is_active: bool = True
    created_at: Optional[datetime.datetime] = None

@dataclass
class Like:
    id: Optional[int] = None
    user_id: int = 0
    post_id: Optional[int] = None
    comment_id: Optional[int] = None
    created_at: Optional[datetime.datetime] = None

class PoliticSandboxDB:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or DatabaseConfig.DB_PATH
        self.init_database()
    
    def get_connection(self):
        """Obtener conexión a la base de datos"""
        conn = sqlite3.connect(self.db_path, timeout=DatabaseConfig.CONNECTION_TIMEOUT)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Inicializar la base de datos con todas las tablas"""
        with self.get_connection() as conn:
            # Tabla de usuarios
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    avatar_url TEXT DEFAULT '',
                    university TEXT NOT NULL,
                    career TEXT NOT NULL,
                    semester INTEGER DEFAULT 1,
                    role TEXT DEFAULT 'student',
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """)
            
            # Tabla de publicaciones
            conn.execute("""
                CREATE TABLE IF NOT EXISTS posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    post_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tags TEXT DEFAULT '[]',
                    likes_count INTEGER DEFAULT 0,
                    comments_count INTEGER DEFAULT 0,
                    shares_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Tabla de encuestas
            conn.execute("""
                CREATE TABLE IF NOT EXISTS polls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    options TEXT NOT NULL,
                    duration_days INTEGER DEFAULT 7,
                    total_votes INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES posts (id)
                )
            """)
            
            # Tabla de votos en encuestas
            conn.execute("""
                CREATE TABLE IF NOT EXISTS poll_votes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    poll_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    option_index INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (poll_id) REFERENCES polls (id),
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(poll_id, user_id)
                )
            """)
            
            # Tabla de comentarios
            conn.execute("""
                CREATE TABLE IF NOT EXISTS comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    likes_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES posts (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Tabla de likes
            conn.execute("""
                CREATE TABLE IF NOT EXISTS likes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    post_id INTEGER,
                    comment_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (post_id) REFERENCES posts (id),
                    FOREIGN KEY (comment_id) REFERENCES comments (id),
                    UNIQUE(user_id, post_id, comment_id)
                )
            """)
            
            # Tabla de archivos/documentos
            conn.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    mime_type TEXT NOT NULL,
                    uploaded_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES posts (id),
                    FOREIGN KEY (uploaded_by) REFERENCES users (id)
                )
            """)
            
            # Tabla de sesiones de usuario
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Tabla de notificaciones
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    notification_type TEXT DEFAULT 'info',
                    is_read BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Crear índices para mejor rendimiento
            conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes (post_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes (user_id)")
            
            conn.commit()
    
    def hash_password(self, password: str) -> str:
        """Hash de contraseña usando SHA-256 con salt"""
        salt = os.urandom(32)
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, SecurityConfig.PASSWORD_HASH_ROUNDS)
        return salt.hex() + pwdhash.hex()
    
    def verify_password(self, stored_password: str, provided_password: str) -> bool:
        """Verificar contraseña"""
        salt = bytes.fromhex(stored_password[:64])
        stored_hash = stored_password[64:]
        pwdhash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, SecurityConfig.PASSWORD_HASH_ROUNDS)
        return pwdhash.hex() == stored_hash
    
    # === MÉTODOS PARA USUARIOS ===
    
    def create_user(self, user: User) -> Optional[int]:
        """Crear nuevo usuario"""
        user.password_hash = self.hash_password(user.password_hash)
        user.created_at = datetime.datetime.now()
        
        with self.get_connection() as conn:
            try:
                cursor = conn.execute("""
                    INSERT INTO users (username, email, password_hash, full_name, 
                                     avatar_url, university, career, semester, role)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (user.username, user.email, user.password_hash, user.full_name,
                      user.avatar_url, user.university, user.career, user.semester, user.role))
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Obtener usuario por email"""
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ? AND is_active = 1", (email,)).fetchone()
            return User(**dict(row)) if row else None
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Obtener usuario por ID"""
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,)).fetchone()
            return User(**dict(row)) if row else None
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Autenticar usuario"""
        user = self.get_user_by_email(email)
        if user and self.verify_password(user.password_hash, password):
            # Actualizar último login
            with self.get_connection() as conn:
                conn.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user.id,))
                conn.commit()
            return user
        return None
    
    def get_active_users(self, limit: int = 10) -> List[User]:
        """Obtener usuarios activos recientes"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM users 
                WHERE is_active = 1 AND last_login IS NOT NULL
                ORDER BY last_login DESC 
                LIMIT ?
            """, (limit,)).fetchall()
            return [User(**dict(row)) for row in rows]
    
    # === MÉTODOS PARA PUBLICACIONES ===
    
    def create_post(self, post: Post) -> Optional[int]:
        """Crear nueva publicación"""
        post.created_at = datetime.datetime.now()
        post.updated_at = post.created_at
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO posts (user_id, post_type, title, content, tags)
                VALUES (?, ?, ?, ?, ?)
            """, (post.user_id, post.post_type, post.title, post.content, post.tags))
            return cursor.lastrowid
    
    def get_posts(self, post_type: str = None, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Obtener publicaciones con información del autor"""
        limit = limit or ContentConfig.POSTS_PER_PAGE
        
        query = """
            SELECT p.*, u.username, u.full_name, u.avatar_url
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.is_active = 1
        """
        params = []
        
        if post_type:
            query += " AND p.post_type = ?"
            params.append(post_type)
        
        query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        with self.get_connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]
    
    def get_post_by_id(self, post_id: int) -> Optional[Dict[str, Any]]:
        """Obtener publicación por ID con información del autor"""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT p.*, u.username, u.full_name, u.avatar_url
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ? AND p.is_active = 1
            """, (post_id,)).fetchone()
            return dict(row) if row else None
    
    def update_post(self, post_id: int, title: str = None, content: str = None, tags: str = None) -> bool:
        """Actualizar publicación"""
        updates = []
        params = []
        
        if title:
            updates.append("title = ?")
            params.append(title)
        if content:
            updates.append("content = ?")
            params.append(content)
        if tags:
            updates.append("tags = ?")
            params.append(tags)
        
        if not updates:
            return False
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(post_id)
        
        with self.get_connection() as conn:
            cursor = conn.execute(f"""
                UPDATE posts SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            return cursor.rowcount > 0
    
    # === MÉTODOS PARA ENCUESTAS ===
    
    def create_poll(self, poll: Poll) -> Optional[int]:
        """Crear nueva encuesta"""
        poll.created_at = datetime.datetime.now()
        poll.expires_at = poll.created_at + datetime.timedelta(days=poll.duration_days)
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO polls (post_id, title, description, options, duration_days, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (poll.post_id, poll.title, poll.description, poll.options, 
                  poll.duration_days, poll.expires_at))
            return cursor.lastrowid
    
    def get_poll_by_post_id(self, post_id: int) -> Optional[Dict[str, Any]]:
        """Obtener encuesta por ID de publicación"""
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM polls WHERE post_id = ?", (post_id,)).fetchone()
            return dict(row) if row else None
    
    def vote_in_poll(self, poll_id: int, user_id: int, option_index: int) -> bool:
        """Votar en encuesta"""
        with self.get_connection() as conn:
            try:
                # Insertar voto
                conn.execute("""
                    INSERT INTO poll_votes (poll_id, user_id, option_index)
                    VALUES (?, ?, ?)
                """, (poll_id, user_id, option_index))
                
                # Actualizar contador total
                conn.execute("""
                    UPDATE polls SET total_votes = total_votes + 1
                    WHERE id = ?
                """, (poll_id,))
                
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                return False  # Usuario ya votó
    
    def get_poll_results(self, poll_id: int) -> Dict[str, Any]:
        """Obtener resultados de encuesta"""
        with self.get_connection() as conn:
            # Obtener información de la encuesta
            poll = conn.execute("SELECT * FROM polls WHERE id = ?", (poll_id,)).fetchone()
            if not poll:
                return {}
            
            # Obtener conteo de votos por opción
            votes = conn.execute("""
                SELECT option_index, COUNT(*) as count
                FROM poll_votes
                WHERE poll_id = ?
                GROUP BY option_index
            """, (poll_id,)).fetchall()
            
            # Crear diccionario de resultados
            vote_counts = {vote['option_index']: vote['count'] for vote in votes}
            options = json.loads(poll['options'])
            
            results = {
                'poll_id': poll_id,
                'title': poll['title'],
                'total_votes': poll['total_votes'],
                'options': [],
                'is_expired': datetime.datetime.now() > datetime.datetime.fromisoformat(poll['expires_at'])
            }
            
            for i, option in enumerate(options):
                vote_count = vote_counts.get(i, 0)
                percentage = (vote_count / poll['total_votes'] * 100) if poll['total_votes'] > 0 else 0
                
                results['options'].append({
                    'text': option,
                    'votes': vote_count,
                    'percentage': round(percentage, 1)
                })
            
            return results
    
    def has_user_voted(self, poll_id: int, user_id: int) -> bool:
        """Verificar si usuario ya votó en encuesta"""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT 1 FROM poll_votes WHERE poll_id = ? AND user_id = ?
            """, (poll_id, user_id)).fetchone()
            return row is not None
    
    # === MÉTODOS PARA LIKES ===
    
    def toggle_like(self, user_id: int, post_id: int = None, comment_id: int = None) -> bool:
        """Toggle like en publicación o comentario"""
        with self.get_connection() as conn:
            # Verificar si ya existe el like
            existing = conn.execute("""
                SELECT id FROM likes 
                WHERE user_id = ? AND post_id = ? AND comment_id = ?
            """, (user_id, post_id, comment_id)).fetchone()
            
            if existing:
                # Quitar like
                conn.execute("DELETE FROM likes WHERE id = ?", (existing['id'],))
                if post_id:
                    conn.execute("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?", (post_id,))
                elif comment_id:
                    conn.execute("UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?", (comment_id,))
                liked = False
            else:
                # Agregar like
                conn.execute("""
                    INSERT INTO likes (user_id, post_id, comment_id)
                    VALUES (?, ?, ?)
                """, (user_id, post_id, comment_id))
                if post_id:
                    conn.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", (post_id,))
                elif comment_id:
                    conn.execute("UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?", (comment_id,))
                liked = True
            
            conn.commit()
            return liked
    
    # === MÉTODOS PARA COMENTARIOS ===
    
    def create_comment(self, comment: Comment) -> Optional[int]:
        """Crear nuevo comentario"""
        comment.created_at = datetime.datetime.now()
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO comments (post_id, user_id, content)
                VALUES (?, ?, ?)
            """, (comment.post_id, comment.user_id, comment.content))
            
            # Actualizar contador de comentarios en el post
            conn.execute("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?", 
                        (comment.post_id,))
            
            conn.commit()
            return cursor.lastrowid
    
    def get_comments_by_post(self, post_id: int) -> List[Dict[str, Any]]:
        """Obtener comentarios de una publicación"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT c.*, u.username, u.full_name, u.avatar_url
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = ? AND c.is_active = 1
                ORDER BY c.created_at ASC
            """, (post_id,)).fetchall()
            return [dict(row) for row in rows]
    
    # === MÉTODOS PARA ESTADÍSTICAS ===
    
    def get_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas generales"""
        with self.get_connection() as conn:
            stats = {}
            
            # Contar debates activos
            stats['debates_count'] = conn.execute("""
                SELECT COUNT(*) as count FROM posts 
                WHERE post_type = 'debate' AND is_active = 1
            """).fetchone()['count']
            
            # Contar encuestas activas
            stats['polls_count'] = conn.execute("""
                SELECT COUNT(*) as count FROM polls 
                WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP
            """).fetchone()['count']
            
            # Contar estudiantes activos
            stats['students_count'] = conn.execute("""
                SELECT COUNT(*) as count FROM users 
                WHERE is_active = 1
            """).fetchone()['count']
            
            # Calcular engagement (likes + comentarios / posts)
            engagement = conn.execute("""
                SELECT 
                    COALESCE(SUM(likes_count + comments_count), 0) as total_interactions,
                    COUNT(*) as total_posts
                FROM posts 
                WHERE is_active = 1
            """).fetchone()
            
            if engagement['total_posts'] > 0:
                stats['engagement'] = min(100, round(engagement['total_interactions'] / engagement['total_posts'] * 10))
            else:
                stats['engagement'] = 0
            
            return stats
    
    def get_popular_tags(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Obtener tags más populares"""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT tags FROM posts 
                WHERE is_active = 1 AND tags != '[]'
            """).fetchall()
            
            tag_counts = {}
            for row in rows:
                try:
                    tags = json.loads(row['tags'])
                    for tag in tags:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
                except json.JSONDecodeError:
                    continue
            
            # Ordenar por frecuencia
            sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
            return [{'tag': tag, 'count': count} for tag, count in sorted_tags[:limit]]

# === FUNCIONES DE UTILIDAD ===

def create_sample_data(db: PoliticSandboxDB):
    """Crear datos de ejemplo para pruebas"""
    
    # Usuarios de ejemplo
    users = [
        User(username="maria_g", email="maria@universidad.edu", password_hash="password123",
             full_name="María González", university="Universidad Nacional", 
             career="Ingeniería", semester=6),
        User(username="carlos_l", email="carlos@universidad.edu", password_hash="password123",
             full_name="Carlos López", university="Universidad Nacional",
             career="Derecho", semester=4),
        User(username="ana_r", email="ana@universidad.edu", password_hash="password123",
             full_name="Ana Rodríguez", university="Universidad Nacional",
             career="Medicina", semester=8)
    ]
    
    for user in users:
        db.create_user(user)
    
    # Publicaciones de ejemplo
    posts_data = [
        {
            'user_id': 1,
            'post_type': 'debate',
            'title': '¿Deberían las universidades públicas ser completamente gratuitas?',
            'content': 'He estado pensando sobre el acceso a la educación superior...',
            'tags': '["educacion", "financiamiento", "acceso"]'
        },
        {
            'user_id': 2,
            'post_type': 'announcement',
            'title': 'Nueva iniciativa de sostenibilidad en el campus',
            'content': 'Nos complace anunciar el lanzamiento del programa "Campus Verde"...',
            'tags': '["sostenibilidad", "medioambiente", "campus"]'
        }
    ]
    
    for post_data in posts_data:
        post = Post(**post_data)
        db.create_post(post)
    
    # Encuesta de ejemplo
    poll_data = {
        'post_id': 2,
        'title': '¿Cuál es tu prioridad principal para el próximo semestre?',
        'description': 'Ayúdanos a entender qué es lo más importante para la comunidad estudiantil',
        'options': '["Mejorar la infraestructura", "Más becas y apoyo financiero", "Programas deportivos y culturales", "Mejor calidad académica"]',
        'duration_days': 7
    }
    
    poll = Poll(**poll_data)
    db.create_poll(poll)

if __name__ == "__main__":
    # Ejemplo de uso
    db = PoliticSandboxDB()
    
    # Crear datos de ejemplo
    create_sample_data(db)
    
    print("Base de datos inicializada correctamente!")
    print("Estadísticas:", db.get_stats())
    print("Tags populares:", db.get_popular_tags())