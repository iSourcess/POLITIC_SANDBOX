#!/usr/bin/env python3
"""
Archivo de prueba para verificar el funcionamiento de la base de datos
POLITIC-SANDBOX
"""

from database import PoliticSandboxDB, create_sample_data, User, Post, Poll
from config import init_config, DatabaseConfig
import json

def test_database():
    """Función principal de pruebas"""
    
    print("=== INICIANDO PRUEBAS DE BASE DE DATOS ===")
    
    # Inicializar configuración
    print("1. Inicializando configuración...")
    from config import validate_config
    errors = validate_config()
    
    # Filtrar solo errores críticos (no advertencias de desarrollo)
    critical_errors = [e for e in errors if not e.startswith("SECRET_KEY debe cambiarse")]
    
    if critical_errors:
        print("❌ Errores críticos en la configuración:")
        for error in critical_errors:
            print(f"   - {error}")
        return False
    
    if errors:
        print("⚠️  Advertencias de configuración (OK para desarrollo):")
        for error in errors:
            print(f"   - {error}")
    
    print("✅ Configuración inicializada correctamente")
    
    # Crear instancia de base de datos
    print("2. Creando base de datos...")
    db = PoliticSandboxDB()
    print(f"✅ Base de datos creada en: {DatabaseConfig.DB_PATH}")
    
    # Crear datos de ejemplo
    print("3. Creando datos de ejemplo...")
    create_sample_data(db)
    print("✅ Datos de ejemplo creados")
    
    # Probar autenticación
    print("4. Probando autenticación...")
    user = db.authenticate_user("maria@universidad.edu", "password123")
    if user:
        print(f"✅ Usuario autenticado: {user.full_name}")
    else:
        print("❌ Error en autenticación")
        return False
    
    # Probar obtener posts
    print("5. Obteniendo posts...")
    posts = db.get_posts(limit=5)
    print(f"✅ {len(posts)} posts obtenidos")
    for post in posts[:2]:  # Mostrar solo los primeros 2
        print(f"   - {post['title'][:50]}...")
    
    # Probar estadísticas
    print("6. Obteniendo estadísticas...")
    stats = db.get_stats()
    print("✅ Estadísticas generadas:")
    for key, value in stats.items():
        print(f"   - {key}: {value}")
    
    # Probar tags populares
    print("7. Obteniendo tags populares...")
    tags = db.get_popular_tags(limit=5)
    print("✅ Tags populares:")
    for tag in tags:
        print(f"   - #{tag['tag']}: {tag['count']} usos")
    
    # Probar usuarios activos
    print("8. Obteniendo usuarios activos...")
    active_users = db.get_active_users(limit=3)
    print(f"✅ {len(active_users)} usuarios activos encontrados")
    for user in active_users:
        print(f"   - {user.full_name} (@{user.username})")
    
    print("\n=== ✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ===")
    return True

def test_user_operations():
    """Pruebas específicas de operaciones de usuario"""
    
    print("\n=== PRUEBAS DE OPERACIONES DE USUARIO ===")
    db = PoliticSandboxDB()
    
    # Crear nuevo usuario
    print("1. Creando nuevo usuario...")
    new_user = User(
        username="test_user",
        email="test@universidad.edu",
        password_hash="testpassword123",
        full_name="Usuario de Prueba",
        university="Universidad Nacional",
        career="Ingeniería de Software",
        semester=5
    )
    
    user_id = db.create_user(new_user)
    if user_id:
        print(f"✅ Usuario creado con ID: {user_id}")
        
        # Probar obtener usuario por ID
        retrieved_user = db.get_user_by_id(user_id)
        if retrieved_user:
            print(f"✅ Usuario recuperado: {retrieved_user.full_name}")
        
        # Probar autenticación del nuevo usuario
        auth_user = db.authenticate_user("test@universidad.edu", "testpassword123")
        if auth_user:
            print(f"✅ Autenticación exitosa: {auth_user.username}")
        else:
            print("❌ Error en autenticación")
    else:
        print("❌ Error creando usuario")

def test_post_operations():
    """Pruebas específicas de operaciones de posts"""
    
    print("\n=== PRUEBAS DE OPERACIONES DE POSTS ===")
    db = PoliticSandboxDB()
    
    # Crear nuevo post
    print("1. Creando nuevo post...")
    new_post = Post(
        user_id=1,  # Asumiendo que existe usuario con ID 1
        post_type="debate",
        title="Prueba de nuevo debate",
        content="Este es un contenido de prueba para verificar que el sistema funciona correctamente.",
        tags='["prueba", "test", "funcionamiento"]'
    )
    
    post_id = db.create_post(new_post)
    if post_id:
        print(f"✅ Post creado con ID: {post_id}")
        
        # Obtener el post creado
        retrieved_post = db.get_post_by_id(post_id)
        if retrieved_post:
            print(f"✅ Post recuperado: {retrieved_post['title']}")
            
            # Probar toggle like
            print("2. Probando sistema de likes...")
            liked = db.toggle_like(user_id=1, post_id=post_id)
            print(f"✅ Like {'agregado' if liked else 'removido'}")
            
            # Verificar contador de likes
            updated_post = db.get_post_by_id(post_id)
            print(f"✅ Likes actuales: {updated_post['likes_count']}")
        
    else:
        print("❌ Error creando post")

def test_poll_operations():
    """Pruebas específicas de operaciones de encuestas"""
    
    print("\n=== PRUEBAS DE OPERACIONES DE ENCUESTAS ===")
    db = PoliticSandboxDB()
    
    # Crear post para la encuesta
    print("1. Creando post para encuesta...")
    post = Post(
        user_id=1,
        post_type="poll",
        title="Encuesta de prueba",
        content="Esta es una encuesta de prueba",
        tags='["encuesta", "prueba"]'
    )
    
    post_id = db.create_post(post)
    if not post_id:
        print("❌ Error creando post para encuesta")
        return
    
    # Crear encuesta
    print("2. Creando encuesta...")
    poll = Poll(
        post_id=post_id,
        title="¿Cuál prefieres?",
        description="Selecciona tu opción favorita",
        options='["Opción A", "Opción B", "Opción C"]',
        duration_days=7
    )
    
    poll_id = db.create_poll(poll)
    if poll_id:
        print(f"✅ Encuesta creada con ID: {poll_id}")
        
        # Probar votación
        print("3. Probando votación...")
        vote_success = db.vote_in_poll(poll_id, user_id=1, option_index=0)
        if vote_success:
            print("✅ Voto registrado exitosamente")
            
            # Obtener resultados
            results = db.get_poll_results(poll_id)
            if results:
                print("✅ Resultados de encuesta:")
                print(f"   Total votos: {results['total_votes']}")
                for i, option in enumerate(results['options']):
                    print(f"   {i+1}. {option['text']}: {option['votes']} votos ({option['percentage']}%)")
            
            # Verificar que el usuario ya votó
            has_voted = db.has_user_voted(poll_id, user_id=1)
            print(f"✅ Usuario ya votó: {has_voted}")
            
        else:
            print("❌ Error registrando voto")
    else:
        print("❌ Error creando encuesta")

def clean_test_data():
    """Limpiar datos de prueba (opcional)"""
    
    print("\n=== LIMPIANDO DATOS DE PRUEBA ===")
    # Aquí podrías agregar código para limpiar datos de prueba
    # Por ejemplo, eliminar usuarios/posts creados durante las pruebas
    print("ℹ️  Los datos de prueba se mantienen para inspección manual")

def main():
    """Función principal que ejecuta todas las pruebas"""
    
    try:
        # Ejecutar pruebas principales
        if not test_database():
            return False
        
        # Ejecutar pruebas específicas
        test_user_operations()
        test_post_operations() 
        test_poll_operations()
        
        # Limpiar datos de prueba (opcional)
        clean_test_data()
        
        print("\n🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE 🎉")
        print(f"Base de datos disponible en: {DatabaseConfig.DB_PATH}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR DURANTE LAS PRUEBAS: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    main()