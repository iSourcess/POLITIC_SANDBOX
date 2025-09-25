# Configuración del backend

import os

class Config:
    # Configuración general
    DEBUG = True
    SECRET_KEY = 'clave_secreta_muy_segura_para_la_aplicacion'
    
    # Configuración de la base de datos
    # En este caso usamos archivos JSON, pero aquí se configuraría una base de datos real
    DATABASE_PATH = os.path.join(os.getcwd(), 'data')
    
    # Configuración de CORS
    CORS_ORIGINS = ['http://localhost:5000', 'http://127.0.0.1:5000']
    
    # Configuración de JWT
    JWT_SECRET_KEY = 'clave_secreta_muy_segura_para_jwt'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 horas en segundos
    
    # Configuración de correo electrónico (para recuperación de contraseña)
    MAIL_SERVER = 'smtp.example.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'usuario@example.com'
    MAIL_PASSWORD = 'contraseña_del_correo'
    MAIL_DEFAULT_SENDER = 'noreply@example.com'