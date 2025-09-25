#!/usr/bin/env python3
"""
Database initialization script for POLITIC-SANDBOX
Run this script to set up the database with sample data.
"""

import sqlite3
import json
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

DATABASE = 'politic_sandbox.db'

def create_tables():
    """Create all necessary tables"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Drop tables if they exist (for fresh start)
    tables_to_drop = [
        'user_sessions', 'poll_votes', 'poll_metadata', 'poll_options',
        'comments', 'post_interactions', 'posts', 'users'
    ]
    
    for table in tables_to_drop:
        cursor.execute(f'DROP TABLE IF EXISTS {table}')
    
    # Create tables with proper schema
    cursor.executescript('''
        -- Users table
        CREATE TABLE users (
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
        CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('post', 'poll')),
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        -- Post interactions
        CREATE TABLE post_interactions (
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
        CREATE TABLE comments (
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

        -- Poll options
        CREATE TABLE poll_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            option_text TEXT NOT NULL,
            option_order INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts (id)
        );

        -- Poll votes
        CREATE TABLE poll_votes (
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

        -- Poll metadata
        CREATE TABLE poll_metadata (
            post_id INTEGER PRIMARY KEY,
            duration_days INTEGER NOT NULL DEFAULT 7,
            end_date DATETIME,
            allow_multiple BOOLEAN DEFAULT 0,
            is_anonymous BOOLEAN DEFAULT 0,
            FOREIGN KEY (post_id) REFERENCES posts (id)
        );

        -- User sessions
        CREATE TABLE user_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        -- Indexes
        CREATE INDEX idx_posts_user_id ON posts(user_id);
        CREATE INDEX idx_posts_created_at ON posts(created_at);
        CREATE INDEX idx_comments_post_id ON comments(post_id);
        CREATE INDEX idx_interactions_post_user ON post_interactions(post_id, user_id);
        CREATE INDEX idx_poll_votes_post_user ON poll_votes(post_id, user_id);
    ''')
    
    conn.commit()
    conn.close()
    print("✓ Tables created successfully")

def insert_sample_data():
    """Insert sample users and posts"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Sample users
    users = [
        ('admin', 'admin@university.edu', generate_password_hash('admin123'), 'Administrador del Sistema', 'admin', 'Universidad Central', 'Administración'),
        ('maria_gonzalez', 'maria@university.edu', generate_password_hash('password123'), 'María González', 'student', 'Universidad Central', 'Ciencias Políticas'),
        ('carlos_lopez', 'carlos@university.edu', generate_password_hash('password123'), 'Carlos López', 'student', 'Universidad Central', 'Derecho'),
        ('ana_garcia', 'ana@university.edu', generate_password_hash('password123'), 'Ana García', 'student', 'Universidad Central', 'Sociología'),
        ('roberto_silva', 'roberto@university.edu', generate_password_hash('password123'), 'Roberto Silva', 'student', 'Universidad Central', 'Comunicación'),
        ('laura_mendoza', 'laura@university.edu', generate_password_hash('password123'), 'Laura Mendoza', 'student', 'Universidad Central', 'Ingeniería')
    ]
    
    cursor.executemany('''
        INSERT INTO users (username, email, password_hash, full_name, role, university, faculty)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', users)
    
    # Sample posts
    now = datetime.now()
    posts = [
        (2, 'post', 'debate', '¿Deberían las universidades públicas ser completamente gratuitas?', 
         'He estado pensando sobre el acceso a la educación superior y me parece que eliminar completamente las cuotas podría beneficiar a más estudiantes. ¿Qué opinan? ¿Cómo se financiaría esto?',
         '["educacion", "financiamiento", "acceso"]', now - timedelta(hours=2)),
        
        (3, 'post', 'announcement', 'Nueva iniciativa de sostenibilidad en el campus',
         'Nos complace anunciar el lanzamiento del programa "Campus Verde" que incluirá estaciones de reciclaje, paneles solares y un huerto estudiantil. ¡Únete a la revolución sostenible!',
         '["sostenibilidad", "medioambiente", "campus"]', now - timedelta(hours=4)),
        
        (4, 'post', 'question', '¿Cómo podemos mejorar la participación estudiantil?',
         'He notado que muchos estudiantes no participan en las actividades del campus. ¿Qué estrategias creen que funcionarían para involucrar más a la comunidad?',
         '["participacion", "comunidad", "actividades"]', now - timedelta(hours=6)),
        
        (5, 'post', 'proposal', 'Propuesta: Espacios de coworking 24/7 para estudiantes',
         'Propongo crear espacios de trabajo colaborativo que estén disponibles las 24 horas para estudiantes que necesiten estudiar fuera de horarios regulares. Incluiría WiFi, mesas, enchufes y máquinas expendedoras.',
         '["infraestructura", "estudio", "coworking"]', now - timedelta(hours=8)),
        
        (6, 'poll', 'poll', '¿Cuál es tu prioridad principal para el próximo semestre?',
         'Ayúdanos a entender qué es lo más importante para la comunidad estudiantil',
         '["prioridades", "semestre", "estudiantes"]', now - timedelta(hours=1))
    ]
    
    for post in posts:
        cursor.execute('''
            INSERT INTO posts (user_id, type, category, title, content, tags, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', post)
        
        post_id = cursor.lastrowid
        
        # If it's a poll, add options and metadata
        if post[1] == 'poll':
            poll_options = [
                'Mejorar la infraestructura',
                'Más becas y apoyo financiero',
                'Programas deportivos y culturales',
                'Mejor calidad académica'
            ]
            
            for i, option in enumerate(poll_options):
                cursor.execute('''
                    INSERT INTO poll_options (post_id, option_text, option_order)
                    VALUES (?, ?, ?)
                ''', (post_id, option, i))
            
            # Add poll metadata
            end_date = now + timedelta(days=7)
            cursor.execute('''
                INSERT INTO poll_metadata (post_id, duration_days, end_date)
                VALUES (?, ?, ?)
            ''', (post_id, 7, end_date))
    
    # Add some sample interactions
    sample_likes = [
        (1, 2), (1, 3), (1, 4),  # Post 1 liked by users 2, 3, 4
        (2, 2), (2, 4), (2, 5),  # Post 2 liked by users 2, 4, 5
        (3, 3), (3, 5), (3, 6),  # Post 3 liked by users 3, 5, 6
        (4, 2), (4, 3),          # Post 4 liked by users 2, 3
        (5, 4), (5, 5), (5, 6)   # Post 5 (poll) liked by users 4, 5, 6
    ]
    
    for post_id, user_id in sample_likes:
        cursor.execute('''
            INSERT OR IGNORE INTO post_interactions (post_id, user_id, interaction_type)
            VALUES (?, ?, 'like')
        ''', (post_id, user_id))
    
    # Add sample comments
    sample_comments = [
        (1, 3, 'Excelente punto. Creo que la educación debe ser un derecho universal.'),
        (1, 4, 'Pero también hay que considerar la sostenibilidad financiera del sistema.'),
        (2, 2, '¡Me encanta esta iniciativa! ¿Cómo podemos participar?'),
        (3, 5, 'Podríamos organizar más eventos culturales y deportivos.'),
        (4, 6, 'Gran propuesta. Los espacios actuales son insuficientes.')
    ]
    
    for post_id, user_id, content in sample_comments:
        cursor.execute('''
            INSERT INTO comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        ''', (post_id, user_id, content))
    
    # Add some sample poll votes
    sample_votes = [
        (5, 2, 2),  # User 2 votes for option 2 (More scholarships)
        (5, 3, 4),  # User 3 votes for option 4 (Better academic quality)
        (5, 4, 1),  # User 4 votes for option 1 (Improve infrastructure)
        (5, 5, 2),  # User 5 votes for option 2 (More scholarships)
    ]
    
    for poll_id, user_id, option_order in sample_votes:
        # Get the option_id based on post_id and option_order
        option_result = cursor.execute('''
            SELECT id FROM poll_options 
            WHERE post_id = ? AND option_order = ?
        ''', (poll_id, option_order - 1)).fetchone()  # option_order is 0-based in DB
        
        if option_result:
            option_id = option_result[0]
            cursor.execute('''
                INSERT OR IGNORE INTO poll_votes (post_id, user_id, option_id)
                VALUES (?, ?, ?)
            ''', (poll_id, user_id, option_id))
    
    conn.commit()
    conn.close()
    print("✓ Sample data inserted successfully")

def main():
    """Main initialization function"""
    print("POLITIC-SANDBOX Database Initialization")
    print("=====================================")
    
    print("Creating database tables...")
    create_tables()
    
    print("Inserting sample data...")
    insert_sample_data()
    
    print("\n✓ Database initialization complete!")
    print("\nSample user accounts created:")
    print("- admin / admin123 (Administrator)")
    print("- maria_gonzalez / password123 (Student)")
    print("- carlos_lopez / password123 (Student)")
    print("- ana_garcia / password123 (Student)")
    print("- roberto_silva / password123 (Student)")
    print("- laura_mendoza / password123 (Student)")
    
    print(f"\nDatabase file: {DATABASE}")
    print("You can now start the Flask server with: python app.py")

if __name__ == '__main__':
    main()