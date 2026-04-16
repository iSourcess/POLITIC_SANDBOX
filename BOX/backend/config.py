#!/usr/bin/env python3
"""
Archivo de configuración para POLITIC-SANDBOX
Contiene todas las configuraciones y constantes del sistema
"""

import os
from pathlib import Path
from datetime import timedelta

# ===== CONFIGURACIONES DE LA BASE DE DATOS =====
class DatabaseConfig:
    # Ruta de la base de datos
    DB_PATH = os.path.join(os.path.dirname(__file__), "politic_sandbox.db")
    
    # Configuraciones de conexión
    CONNECTION_TIMEOUT = 30
    MAX_CONNECTIONS = 100
    
    # Configuración para producción (PostgreSQL/MySQL)
    PRODUCTION_DB = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', 5432),
        'database': os.getenv('DB_NAME', 'politic_sandbox'),
        'user': os.getenv('DB_USER', 'politic_user'),
        'password': os.getenv('DB_PASSWORD', ''),
        'charset': 'utf8mb4'
    }

# ===== CONFIGURACIONES DE SEGURIDAD =====
class SecurityConfig:
    # Configuración de contraseñas
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_HASH_ROUNDS = 100000
    
    # JWT/Session settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    SESSION_TIMEOUT = timedelta(hours=24)
    REFRESH_TOKEN_TIMEOUT = timedelta(days=7)
    
    # Rate limiting
    MAX_LOGIN_ATTEMPTS = 5
    LOGIN_TIMEOUT_MINUTES = 15
    API_RATE_LIMIT = 100  # requests per minute

# ===== CONFIGURACIONES DE LA APLICACIÓN =====
class AppConfig:
    # Información básica
    APP_NAME = "POLITIC-SANDBOX"
    APP_VERSION = "1.0.0"
    APP_DESCRIPTION = "Plataforma de participación política estudiantil"
    
    # URLs y dominios
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
    
    # Configuración de email
    EMAIL_ENABLED = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    EMAIL_USER = os.getenv('EMAIL_USER', '')
    EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')
    EMAIL_FROM = os.getenv('EMAIL_FROM', 'noreply@politic-sandbox.com')

# ===== CONFIGURACIONES DE ARCHIVOS =====
class FileConfig:
    # Rutas de directorios
    BASE_DIR = Path(__file__).parent
    UPLOAD_DIR = BASE_DIR / 'uploads'
    STATIC_DIR = BASE_DIR / 'static'
    LOGS_DIR = BASE_DIR / 'logs'
    
    # Configuración de uploads
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {
        'images': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
        'documents': {'pdf', 'doc', 'docx', 'txt', 'rtf'},
        'presentations': {'ppt', 'pptx'},
        'spreadsheets': {'xls', 'xlsx', 'csv'}
    }
    
    # URLs de archivos
    AVATAR_DEFAULT = '/static/images/default-avatar.png'
    LOGO_PATH = '/static/images/logo.svg'

# ===== CONFIGURACIONES DE CONTENIDO =====
class ContentConfig:
    # Límites de contenido
    POST_TITLE_MAX_LENGTH = 200
    POST_CONTENT_MAX_LENGTH = 5000
    COMMENT_MAX_LENGTH = 1000
    TAG_MAX_LENGTH = 30
    MAX_TAGS_PER_POST = 10
    
    # Configuraciones de encuestas
    POLL_TITLE_MAX_LENGTH = 200
    POLL_DESCRIPTION_MAX_LENGTH = 1000
    POLL_OPTION_MAX_LENGTH = 100
    MAX_POLL_OPTIONS = 10
    MIN_POLL_OPTIONS = 2
    MAX_POLL_DURATION_DAYS = 30
    MIN_POLL_DURATION_DAYS = 1
    
    # Paginación
    POSTS_PER_PAGE = 20
    COMMENTS_PER_PAGE = 50
    NOTIFICATIONS_PER_PAGE = 30

# ===== CONFIGURACIONES DE NOTIFICACIONES =====
class NotificationConfig:
    # Tipos de notificaciones
    NOTIFICATION_TYPES = {
        'like': 'Le gusta tu publicación',
        'comment': 'Comentó en tu publicación',
        'mention': 'Te mencionó en un comentario',
        'poll_vote': 'Votó en tu encuesta',
        'new_post': 'Nueva publicación en tema seguido',
        'system': 'Notificación del sistema'
    }
    
    # Configuración de envío
    EMAIL_NOTIFICATIONS_ENABLED = True
    PUSH_NOTIFICATIONS_ENABLED = False
    MAX_NOTIFICATIONS_PER_USER = 1000

# ===== CONFIGURACIONES DE LOGGING =====
class LoggingConfig:
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = 'politic_sandbox.log'
    MAX_LOG_SIZE = 10 * 1024 * 1024  # 10MB
    BACKUP_COUNT = 5

# ===== CONFIGURACIONES DE ROLES Y PERMISOS =====
class RolesConfig:
    # Roles del sistema
    ROLES = {
        'student': {
            'name': 'Estudiante',
            'permissions': ['create_post', 'vote_poll', 'comment', 'like']
        },
        'moderator': {
            'name': 'Moderador',
            'permissions': ['create_post', 'vote_poll', 'comment', 'like', 
                          'moderate_posts', 'moderate_comments', 'view_reports']
        },
        'admin': {
            'name': 'Administrador',
            'permissions': ['all']
        }
    }
    
    # Universidades permitidas
    ALLOWED_UNIVERSITIES = [
        'Universidad Nacional',
        'Universidad de Guadalajara',
        'ITESO',
        'Universidad Autónoma de Jalisco',
        'CUCEI'
    ]

# ===== CONFIGURACIONES DE API =====
class APIConfig:
    # Versión de API
    API_VERSION = 'v1'
    API_PREFIX = f'/api/{API_VERSION}'
    
    # CORS
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080'
    ]
    
    # Headers
    API_HEADERS = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

# ===== CONFIGURACIONES DE DESARROLLO =====
class DevConfig:
    DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'
    TESTING = os.getenv('TESTING', 'false').lower() == 'true'
    
    # Datos de ejemplo para desarrollo
    CREATE_SAMPLE_DATA = os.getenv('CREATE_SAMPLE_DATA', 'true').lower() == 'true'
    
    # Hot reload para desarrollo
    AUTO_RELOAD = True
    
    # URLs de desarrollo
    DEV_SERVER_HOST = '127.0.0.1'
    DEV_SERVER_PORT = 3000

# ===== CONFIGURACIONES DE PRODUCCIÓN =====
class ProdConfig:
    DEBUG = False
    TESTING = False
    
    # Configuración de servidor
    SERVER_HOST = '0.0.0.0'
    SERVER_PORT = int(os.getenv('PORT', 8080))
    WORKERS = int(os.getenv('WORKERS', 4))
    
    # SSL/HTTPS
    SSL_ENABLED = os.getenv('SSL_ENABLED', 'false').lower() == 'true'
    SSL_CERT_PATH = os.getenv('SSL_CERT_PATH', '')
    SSL_KEY_PATH = os.getenv('SSL_KEY_PATH', '')

# ===== CONFIGURACIONES DE CACHE =====
class CacheConfig:
    CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'false').lower() == 'true'
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'memory')  # memory, redis, memcached
    CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 300))  # 5 minutos
    
    # Redis configuración
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')

# ===== CONFIGURACIÓN DE ESTADÍSTICAS =====
class StatsConfig:
    # Métricas a calcular
    CALCULATE_ENGAGEMENT = True
    CALCULATE_TRENDS = True
    
    # Intervalos de actualización
    STATS_UPDATE_INTERVAL = timedelta(minutes=15)
    TRENDS_UPDATE_INTERVAL = timedelta(hours=1)
    
    # Retención de datos
    KEEP_STATS_DAYS = 90
    KEEP_LOGS_DAYS = 30

# ===== FUNCIÓN PARA OBTENER CONFIGURACIÓN =====
def get_config():
    """
    Retorna la configuración apropiada basada en el entorno
    """
    env = os.getenv('ENVIRONMENT', 'development').lower()
    
    if env == 'production':
        return ProdConfig
    elif env == 'testing':
        return DevConfig  # Puedes crear una TestConfig si es necesario
    else:
        return DevConfig

# ===== VALIDACIÓN DE CONFIGURACIÓN =====
def validate_config():
    """
    Valida que la configuración sea correcta
    """
    errors = []
    
    # Validar directorios
    required_dirs = [FileConfig.UPLOAD_DIR, FileConfig.LOGS_DIR]
    for dir_path in required_dirs:
        if not dir_path.exists():
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"No se puede crear directorio {dir_path}: {e}")
    
    # Validar configuración de base de datos
    if not DatabaseConfig.DB_PATH:
        errors.append("DB_PATH no configurado")
    
    # Validar configuración de seguridad
    if SecurityConfig.SECRET_KEY == 'your-secret-key-change-in-production':
        errors.append("SECRET_KEY debe cambiarse en producción")
    
    # Validar configuración de email si está habilitada
    if AppConfig.EMAIL_ENABLED:
        if not AppConfig.EMAIL_USER or not AppConfig.EMAIL_PASSWORD:
            errors.append("Configuración de email incompleta")
    
    return errors

# ===== INICIALIZACIÓN =====
def init_config():
    """
    Inicializa la configuración y crea directorios necesarios
    """
    errors = validate_config()
    
    if errors:
        print("Errores de configuración encontrados:")
        for error in errors:
            print(f"- {error}")
        return False
    
    print(f"Configuración inicializada correctamente para {AppConfig.APP_NAME}")
    return True

# ===== CONFIGURACIÓN ACTUAL =====
Config = get_config()

if __name__ == "__main__":
    # Ejecutar validación si se ejecuta directamente
    if init_config():
        print("Todas las configuraciones son válidas")
    else:
        print("Se encontraron errores en la configuración")