#!/usr/bin/env python3
"""
API REST para POLITIC-SANDBOX
Servidor Flask que expone endpoints para el frontend
"""

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import json
import os
import secrets
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import hashlib

# Importar módulos locales
from database import PoliticSandboxDB, User, Post, Poll, Comment
from config import (AppConfig, SecurityConfig, FileConfig, APIConfig, 
                   ContentConfig, DatabaseConfig)

# Inicializar Flask
app = Flask(__name__)
app.secret_key = SecurityConfig.SECRET_KEY
CORS(app, origins=APIConfig.CORS_ORIGINS)

# Inicializar base de datos
db = PoliticSandboxDB()

# Configuraciones globales
app.config['MAX_CONTENT_LENGTH'] = FileConfig.MAX_FILE_SIZE
app.config['UPLOAD_FOLDER'] = str(FileConfig.UPLOAD_DIR)

# Crear directorio de uploads si no existe
os.makedirs(FileConfig.UPLOAD_DIR, exist_ok=True)

# ===== UTILIDADES =====

def create_response(success=True, message="", data=None, status_code=200):
    """Crear respuesta JSON estandarizada"""
    response = {
        "success": success,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now().isoformat()
    }
    return jsonify(response), status_code

def require_auth(f):
    """Decorador para rutas que requieren autenticación"""
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return create_response(False, "Autenticación requerida", status_code=401)
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def get_current_user():
    """Obtener usuario actual de la sesión"""
    if 'user_id' in session:
        return db.get_user_by_id(session['user_id'])
    return None

def allowed_file(filename):
    """Verificar si el archivo tiene extensión permitida"""
    if '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    for category, extensions in FileConfig.ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return True
    return False

# ===== RUTAS DE AUTENTICACIÓN =====

@app.route(f'{APIConfig.API_PREFIX}/auth/register', methods=['POST'])
def register():
    """Registrar nuevo usuario"""
    try:
        data = request.get_json()
        required_fields = ['username', 'email', 'password', 'full_name', 
                          'university', 'career', 'semester']
        
        # Validar campos requeridos
        for field in required_fields:
            if field not in data or not data[field]:
                return create_response(False, f"Campo {field} es requerido", status_code=400)
        
        # Validar longitud de contraseña
        if len(data['password']) < SecurityConfig.PASSWORD_MIN_LENGTH:
            return create_response(False, 
                f"La contraseña debe tener al menos {SecurityConfig.PASSWORD_MIN_LENGTH} caracteres", 
                status_code=400)
        
        # Crear usuario
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=data['password'],
            full_name=data['full_name'],
            university=data['university'],
            career=data['career'],
            semester=int(data['semester']),
            avatar_url=data.get('avatar_url', FileConfig.AVATAR_DEFAULT)
        )
        
        user_id = db.create_user(user)
        if user_id:
            # Iniciar sesión automáticamente
            session['user_id'] = user_id
            session['username'] = data['username']
            
            return create_response(True, "Usuario registrado exitosamente", {
                'user_id': user_id,
                'username': data['username'],
                'full_name': data['full_name']
            })
        else:
            return create_response(False, "Email o username ya existe", status_code=409)
            
    except Exception as e:
        return create_response(False, f"Error en registro: {str(e)}", status_code=500)

@app.route(f'{APIConfig.API_PREFIX}/auth/login', methods=['POST'])
def login():
    """Iniciar sesión"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return create_response(False, "Email y contraseña son requeridos", status_code=400)
        
        user = db.authenticate_user(data['email'], data['password'])
        if user:
            session['user_id'] = user.id
            session['username'] = user.username
            
            return create_response(True, "Login exitoso", {
                'user_id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'avatar_url': user.avatar_url
            })
        else:
            return create_response(False, "Credenciales inválidas", status_code=401)
            
    except Exception as e:
        return create_response(False, f"Error en login: {str(e)}", status_code=500)

@app.route(f'{APIConfig.API_PREFIX}/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Cerrar sesión"""
    session.clear()
    return create_response(True, "Sesión cerrada exitosamente")

@app.route(f'{APIConfig.API_PREFIX}/auth/me', methods=['GET'])
@require_auth
def get_current_user_info():
    """Obtener información del usuario actual"""
    user = get_current_user()
    if user:
        return create_response(True, "", {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'avatar_url': user.avatar_url,
            'university': user.university,
            'career': user.career,
            'semester': user.semester,
            'role': user.role
        })
    return create_response(False, "Usuario no encontrado", status_code=404)

# ===== RUTAS DE POSTS =====

@app.route(f'{APIConfig.API_PREFIX}/posts', methods=['GET'])
def get_posts():
    """Obtener posts con paginación y filtros"""
    try:
        post_type = request.args.get('type')
        limit = int(request.args.get('limit', ContentConfig.POSTS_PER_PAGE))
        offset = int(request.args.get('offset', 0))
        
        posts = db.get_posts(post_type=post_type, limit=limit, offset=offset)
        
        # Formatear posts para el frontend
        formatted_posts = []
        for post in posts:
            # Parsear tags
            try:
                tags = json.loads(post['tags'])
            except:
                tags = []
            
            # Verificar si el usuario actual ha dado like
            liked = False
            if 'user_id' in session:
                # Aquí podrías verificar si el usuario dio like
                pass
            
            formatted_post = {
                'id': post['id'],
                'type': 'poll' if post['post_type'] == 'poll' else 'post',
                'category': post['post_type'],
                'title': post['title'],
                'content': post['content'],
                'tags': tags,
                'author': post['full_name'],
                'username': post['username'],
                'avatar': post['avatar_url'] or FileConfig.AVATAR_DEFAULT,
                'timestamp': post['created_at'],
                'likes': post['likes_count'],
                'comments': post['comments_count'],
                'shares': post['shares_count'],
                'liked': liked
            }
            
            # Si es una encuesta, añadir datos de poll
            if post['post_type'] == 'poll':
                poll = db.get_poll_by_post_id(post['id'])
                if poll:
                    poll_results = db.get_poll_results(poll['id'])
                    user_voted = False
                    if 'user_id' in session:
                        user_voted = db.has_user_voted(poll['id'], session['user_id'])
                    
                    formatted_post.update({
                        'poll_id': poll['id'],
                        'description': poll['description'],
                        'options': poll_results.get('options', []),
                        'totalVotes': poll_results.get('total_votes', 0),
                        'userVoted': user_voted,
                        'isExpired': poll_results.get('is_expired', False)
                    })
            
            formatted_posts.append(formatted_post)
        
        return create_response(True, "", {'posts': formatted_posts})
        
    except Exception as e:
        return create_response(False, f"Error obteniendo posts: {str(e)}", status_code=500)

@app.route(f'{APIConfig.API_PREFIX}/posts', methods=['POST'])
@require_auth
def create_post():
    """Crear nueva publicación"""
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        # Validar campos requeridos
        required_fields = ['title', 'content', 'category']
        for field in required_fields:
            if field not in data or not data[field]:
                return create_response(False, f"Campo {field} es requerido", status_code=400)
        
        # Validar longitudes
        if len(data['title']) > ContentConfig.POST_TITLE_MAX_LENGTH:
            return create_response(False, "Título demasiado largo", status_code=400)
        
        if len(data['content']) > ContentConfig.POST_CONTENT_MAX_LENGTH:
            return create_response(False, "Contenido demasiado largo", status_code=400)
        
        # Procesar tags
        tags = data.get('tags', [])
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(',') if tag.strip()]
        
        if len(tags) > ContentConfig.MAX_TAGS_PER_POST:
            return create_response(False, f"Máximo {ContentConfig.MAX_TAGS_PER_POST} tags permitidos", 
                                 status_code=400)
        
        # Crear post
        post = Post(
            user_id=user_id,
            post_type=data['category'],
            title=data['title'],
            content=data['content'],
            tags=json.dumps(tags)
        )
        
        post_id = db.create_post(post)
        if post_id:
            return create_response(True, "Post creado exitosamente", {'post_id': post_id})
        else:
            return create_response(False, "Error creando post", status_code=500)
            
    except Exception as e:
        return create_response(False, f"Error creando post: {str(e)}", status_code=500)

@app.route(f'{APIConfig.API_PREFIX}/posts/<int:post_id>/like', methods=['POST'])
@require_auth
def toggle_post_like(post_id):
    """Toggle like en un post"""
    try:
        user_id = session['user_id']
        liked = db.toggle_like(user_id=user_id, post_id=post_id)
        
        # Obtener conteo actualizado
        post = db.get_post_by_id(post_id)
        if post:
            return create_response(True, "Like actualizado", {
                'liked': liked,
                'likes_count': post['likes_count']
            })
        else:
            return create_response(False, "Post no encontrado", status_code=404)
            
    except Exception as e:
        return create_response(False, f"Error actualizando like: {str(e)}", status_code=500)

# ===== RUTAS DE ENCUESTAS =====

@app.route(f'{APIConfig.API_PREFIX}/polls', methods=['POST'])
@require_auth
def create_poll():
    """Crear nueva encuesta"""
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        # Validar campos requeridos
        required_fields = ['title', 'options']
        for field in required_fields:
            if field not in data or not data[field]:
                return create_response(False, f"Campo {field} es requerido", status_code=400)
        
        options = data['options']
        if len(options) < ContentConfig.MIN_POLL_OPTIONS:
            return create_response(False, f"Mínimo {ContentConfig.MIN_POLL_OPTIONS} opciones requeridas", 
                                 status_code=400)
        
        if len(options) > ContentConfig.MAX_POLL_OPTIONS:
            return create_response(False, f"Máximo {ContentConfig.MAX_POLL_OPTIONS} opciones permitidas", 
                                 status_code=400)
        
        duration = int(data.get('duration', 7))
        if duration < ContentConfig.MIN_POLL_DURATION_DAYS or duration > ContentConfig.MAX_POLL_DURATION_DAYS:
            return create_response(False, 
                f"Duración debe estar entre {ContentConfig.MIN_POLL_DURATION_DAYS} y {ContentConfig.MAX_POLL_DURATION_DAYS} días", 
                status_code=400)
        
        # Crear post para la encuesta
        post = Post(
            user_id=user_id,
            post_type='poll',
            title=data['title'],
            content=data.get('description', ''),
            tags=json.dumps(data.get('tags', []))
        )
        
        post_id = db.create_post(post)
        if not post_id:
            return create_response(False, "Error creando post para encuesta", status_code=500)
        
        # Crear encuesta
        poll = Poll(
            post_id=post_id,
            title=data['title'],
            description=data.get('description', ''),
            options=json.dumps(options),
            duration_days=duration
        )
        
        poll_id = db.create_poll(poll)
        if poll_id:
            return create_response(True, "Encuesta creada exitosamente", {
                'poll_id': poll_id,
                'post_id': post_id
            })
        else:
            return create_response(False, "Error creando encuesta", status_code=500)
            
    except Exception as e:
        return create_response(False, f"Error creando encuesta: {str(e)}", status_code=500)

@app.route(f'{APIConfig.API_PREFIX}/polls/<int:poll_id>/vote', methods=['POST'])
@require_auth
def vote_in_poll(poll_id):
    """Votar en encuesta"""
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        if 'option_index' not in data:
            return create_response(False, "option_index es requerido", status_code=400)
        
        option_index = int(data['option_index'])
        
        # Verificar que el usuario no haya votado ya
        if db.has_user_voted(poll_id, user_id):
            return create_response(False, "Ya has votado en esta encuesta", status_code=409)
        
        success = db.vote_in_poll(poll_id, user_id, option_index)
        if success:
            # Obtener resultados actualizados
            results = db.get_poll_results(poll_id)
            return create_response(True, "Voto registrado exitosamente", results)
        else:
            return create_response(False, "Error registrando voto", status_code=500)
            
    except Exception as e:
        return create_response(False, f"Error votando: {str(e)}", status_code=500)

# ===== RUTAS DE ESTADÍSTICAS =====

@app.route(f'{APIConfig.API_PREFIX}/stats', methods=['GET'])
def get_stats():
    """Obtener estadísticas generales"""
    try:
        stats = db.get_stats()
        active_users = db.get_active_users(limit=10)
        popular_tags = db.get_popular_tags(limit=5)
        
        # Formatear usuarios activos
        formatted_users = []
        for user in active_users:
            formatted_users.append({
                'id': user.id,
                'name': user.full_name,
                'username': user.username,
                'avatar': user.avatar_url or FileConfig.AVATAR_DEFAULT,
                'status': 'En línea' if user.last_login and 
                         (datetime.now() - datetime.fromisoformat(user.last_login.replace('Z', '+00:00').replace('+00:00', ''))) < timedelta(minutes=30)
                         else 'Activo recientemente'
            })
        
        return create_response(True, "", {
            'stats': stats,
            'active_users': formatted_users,
            'popular_tags': popular_tags
        })
        
    except Exception as e:
        return create_response(False, f"Error obteniendo estadísticas: {str(e)}", status_code=500)

# ===== RUTAS DE ARCHIVOS =====

@app.route(f'{APIConfig.API_PREFIX}/upload', methods=['POST'])
@require_auth
def upload_file():
    """Subir archivo"""
    try:
        if 'file' not in request.files:
            return create_response(False, "No se encontró archivo", status_code=400)
        
        file = request.files['file']
        if file.filename == '':
            return create_response(False, "Nombre de archivo vacío", status_code=400)
        
        if not allowed_file(file.filename):
            return create_response(False, "Tipo de archivo no permitido", status_code=400)
        
        # Crear nombre seguro para el archivo
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Aquí podrías guardar información del archivo en la base de datos
        
        return create_response(True, "Archivo subido exitosamente", {
            'filename': unique_filename,
            'original_name': filename,
            'url': f"/uploads/{unique_filename}"
        })
        
    except Exception as e:
        return create_response(False, f"Error subiendo archivo: {str(e)}", status_code=500)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Servir archivos subidos"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ===== RUTAS DE ERROR =====

@app.errorhandler(404)
def not_found(error):
    return create_response(False, "Endpoint no encontrado", status_code=404)

@app.errorhandler(500)
def internal_error(error):
    return create_response(False, "Error interno del servidor", status_code=500)

# ===== SERVIR ARCHIVOS ESTÁTICOS =====

@app.route('/')
def index():
    """Página principal - redirigir a dashboard si está autenticado"""
    if 'user_id' in session:
        return send_from_directory('..', 'dashboard.html')
    else:
        return send_from_directory('..', 'index.html')

@app.route('/dashboard.html')
def dashboard():
    """Servir dashboard"""
    return send_from_directory('..', 'dashboard.html')

@app.route('/index.html')
def login_page():
    """Servir página de login"""
    return send_from_directory('..', 'index.html')

@app.route('/css/<path:filename>')
def css_files(filename):
    """Servir archivos CSS"""
    return send_from_directory('../css', filename)

@app.route('/js/<path:filename>')
def js_files(filename):
    """Servir archivos JavaScript"""
    return send_from_directory('../js', filename)

@app.route('/images/<path:filename>')
def image_files(filename):
    """Servir imágenes"""
    return send_from_directory('../images', filename)

# ===== FUNCIÓN PRINCIPAL =====

def create_app():
    """Factory function para crear la aplicación"""
    return app

if __name__ == '__main__':
    # Configuración para desarrollo
    from config import DevConfig
    
    print(f"Iniciando servidor API para {AppConfig.APP_NAME}")
    print(f"Base de datos: {DatabaseConfig.DB_PATH}")
    print(f"Uploads: {FileConfig.UPLOAD_DIR}")
    print(f"\nServidor disponible en:")
    print(f"- http://127.0.0.1:3000 (página principal)")
    print(f"- http://127.0.0.1:3000/dashboard.html (dashboard)")
    print(f"- http://127.0.0.1:3000/api/v1/stats (ejemplo API)")
    
    app.run(
        host=DevConfig.DEV_SERVER_HOST,
        port=DevConfig.DEV_SERVER_PORT,
        debug=DevConfig.DEBUG,
        threaded=True
    )