#!/usr/bin/env python3
"""
Script simple para inicializar la base de datos POLITIC-SANDBOX
Solo crea las tablas necesarias, sin datos de ejemplo
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import PoliticSandboxDB
from config import DatabaseConfig

def main():
    """Inicializar la base de datos"""
    print(f"Inicializando base de datos en: {DatabaseConfig.DB_PATH}")
    
    # Crear instancia de la base de datos (esto crea las tablas automáticamente)
    db = PoliticSandboxDB()
    
    print("✓ Base de datos inicializada correctamente")
    print("✓ Todas las tablas han sido creadas")
    print("\nAhora puedes:")
    print("1. Ejecutar el servidor: python api.py")
    print("2. Abrir http://127.0.0.1:3000 en tu navegador")
    print("3. Registrar tu primer usuario desde el frontend")
    
    # Verificar que las tablas existen
    try:
        stats = db.get_stats()
        print(f"\nEstado inicial de la base de datos:")
        print(f"- Estudiantes: {stats.get('students_count', 0)}")
        print(f"- Debates: {stats.get('debates_count', 0)}")
        print(f"- Encuestas: {stats.get('polls_count', 0)}")
    except Exception as e:
        print(f"Error verificando base de datos: {e}")

if __name__ == "__main__":
    main()