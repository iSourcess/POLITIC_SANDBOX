# Modelo de usuario

import json
import os
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User:
    def __init__(self, fullname=None, email=None, username=None, password=None, user_id=None, university=None, bio=None):
        self.id = user_id if user_id else str(uuid.uuid4())
        self.fullname = fullname
        self.email = email
        self.username = username
        self.password_hash = generate_password_hash(password) if password else None
        self.created_at = datetime.now().isoformat()
        self.reset_token = None
        self.reset_token_expiry = None
        self.university = university
        self.bio = bio
        self.followers = []
        self.following = []
        self.posts = []
        self.votes = []  # Para guardar los votos en debates/foros
    
    def check_password(self, password):
        """Verificar si la contraseña es correcta"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convertir el usuario a un diccionario"""
        return {
            'id': self.id,
            'fullname': self.fullname,
            'email': self.email,
            'username': self.username,
            'password_hash': self.password_hash,
            'created_at': self.created_at,
            'reset_token': self.reset_token,
            'reset_token_expiry': self.reset_token_expiry,
            'university': self.university,
            'bio': self.bio,
            'followers': self.followers,
            'following': self.following,
            'posts': self.posts,
            'votes': self.votes
        }
    
    @classmethod
    def from_dict(cls, data):
        """Crear un usuario a partir de un diccionario"""
        user = cls()
        user.id = data.get('id')
        user.fullname = data.get('fullname')
        user.email = data.get('email')
        user.username = data.get('username')
        user.password_hash = data.get('password_hash')
        user.created_at = data.get('created_at')
        user.reset_token = data.get('reset_token')
        user.reset_token_expiry = data.get('reset_token_expiry')
        user.university = data.get('university')
        user.bio = data.get('bio')
        user.followers = data.get('followers', [])
        user.following = data.get('following', [])
        user.posts = data.get('posts', [])
        user.votes = data.get('votes', [])
        return user
    
    @classmethod
    def save_all_users(cls, users):
        """Guardar todos los usuarios en un archivo JSON"""
        # Asegurarse de que exista el directorio para los datos
        os.makedirs('data', exist_ok=True)
        
        # Convertir usuarios a diccionarios
        users_dict = [user.to_dict() for user in users]
        
        # Guardar en archivo JSON
        with open('data/users.json', 'w') as f:
            json.dump(users_dict, f, indent=4)
    
    @classmethod
    def load_all_users(cls):
        """Cargar todos los usuarios desde un archivo JSON"""
        try:
            with open('data/users.json', 'r') as f:
                users_dict = json.load(f)
                return [cls.from_dict(user_dict) for user_dict in users_dict]
        except (FileNotFoundError, json.JSONDecodeError):
            # Si el archivo no existe o está vacío, devolver una lista vacía
            return []
    
    @classmethod
    def find_by_username(cls, username):
        """Buscar un usuario por su nombre de usuario"""
        users = cls.load_all_users()
        for user in users:
            if user.username == username:
                return user
        return None
    
    @classmethod
    def find_by_email(cls, email):
        """Buscar un usuario por su correo electrónico"""
        users = cls.load_all_users()
        for user in users:
            if user.email == email:
                return user
        return None
    
    @classmethod
    def find_by_id(cls, user_id):
        """Buscar un usuario por su ID"""
        users = cls.load_all_users()
        for user in users:
            if user.id == user_id:
                return user
        return None
    
    @classmethod
    def find_by_id(cls, user_id):
        """Buscar un usuario por su ID"""
        users = cls.load_all_users()
        for user in users:
            if user.id == user_id:
                return user
        return None
    
    @classmethod
    def find_by_reset_token(cls, token):
        """Buscar un usuario por su token de restablecimiento"""
        users = cls.load_all_users()
        for user in users:
            if user.reset_token == token:
                return user
        return None
    
    def save(self):
        """Guardar o actualizar un usuario"""
        users = self.load_all_users()
        
        # Verificar si el usuario ya existe
        for i, user in enumerate(users):
            if user.id == self.id:
                # Actualizar usuario existente
                users[i] = self
                self.save_all_users(users)
                return
        
        # Agregar nuevo usuario
        users.append(self)
        self.save_all_users(users)
    
    def delete(self):
        """Eliminar un usuario"""
        users = self.load_all_users()
        users = [user for user in users if user.id != self.id]
        self.save_all_users(users)