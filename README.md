# Sistema de Login

Este proyecto implementa un sistema de login completo con frontend y backend.

## Estructura del Proyecto

```
.
├── frontend/
│   ├── css/
│   │   ├── styles.css
│   │   └── dashboard.css
│   ├── js/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── forgot-password.js
│   │   └── dashboard.js
│   ├── img/
│   ├── index.html
│   ├── register.html
│   ├── forgot-password.html
│   └── dashboard.html
└── backend/
    ├── models/
    │   └── user.py
    ├── controllers/
    │   └── auth_controller.py
    ├── templates/
    ├── app.py
    ├── config.py
    └── requirements.txt
```

## Frontend

El frontend está construido con HTML, CSS y JavaScript puro. Incluye las siguientes páginas:

- **index.html**: Página de inicio de sesión
- **register.html**: Página de registro de usuarios
- **forgot-password.html**: Página para recuperar contraseña
- **dashboard.html**: Panel de control para usuarios autenticados

## Backend

El backend está desarrollado con Python y Flask. Incluye:

- **Modelo de Usuario**: Gestión de usuarios con almacenamiento en archivos JSON
- **Controlador de Autenticación**: Manejo de login, registro y recuperación de contraseña
- **API RESTful**: Endpoints para todas las operaciones de autenticación

## Instalación y Ejecución

### Requisitos

- Python 3.7 o superior
- Navegador web moderno

### Pasos para ejecutar

1. Instalar dependencias del backend:

```bash
cd backend
pip install -r requirements.txt
```

2. Ejecutar el servidor backend:

```bash
python app.py
```

3. Abrir el frontend en un navegador web:
   - Abrir el archivo `frontend/index.html` directamente en el navegador
   - O configurar un servidor web simple para servir los archivos frontend

## Características

- Registro de usuarios
- Inicio de sesión
- Recuperación de contraseña
- Panel de control para usuarios autenticados
- Almacenamiento de datos en archivos JSON (para fines de demostración)
- Autenticación basada en JWT