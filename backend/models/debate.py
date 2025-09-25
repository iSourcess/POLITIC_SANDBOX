# Modelo de debate/foro

import json
import os
import uuid
from datetime import datetime

class Debate:
    def __init__(self, title=None, content=None, author_id=None, debate_id=None, category=None, tags=None):
        self.id = debate_id if debate_id else str(uuid.uuid4())
        self.title = title
        self.content = content
        self.author_id = author_id
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        self.category = category  # Categoría del debate (política universitaria, elecciones, etc.)
        self.tags = tags if tags else []
        self.comments = []  # Lista de IDs de comentarios
        self.upvotes = []  # Lista de IDs de usuarios que dieron upvote
        self.downvotes = []  # Lista de IDs de usuarios que dieron downvote
        self.views = 0  # Contador de vistas
        self.status = 'active'  # active, closed, archived
    
    def to_dict(self):
        """Convertir el debate a un diccionario"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'author_id': self.author_id,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'category': self.category,
            'tags': self.tags,
            'comments': self.comments,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'views': self.views,
            'status': self.status
        }
    
    @classmethod
    def from_dict(cls, data):
        """Crear un debate a partir de un diccionario"""
        debate = cls()
        debate.id = data.get('id')
        debate.title = data.get('title')
        debate.content = data.get('content')
        debate.author_id = data.get('author_id')
        debate.created_at = data.get('created_at')
        debate.updated_at = data.get('updated_at')
        debate.category = data.get('category')
        debate.tags = data.get('tags', [])
        debate.comments = data.get('comments', [])
        debate.upvotes = data.get('upvotes', [])
        debate.downvotes = data.get('downvotes', [])
        debate.views = data.get('views', 0)
        debate.status = data.get('status', 'active')
        return debate
    
    @classmethod
    def save_all_debates(cls, debates):
        """Guardar todos los debates en un archivo JSON"""
        # Asegurarse de que exista el directorio para los datos
        os.makedirs('data', exist_ok=True)
        
        # Convertir debates a diccionarios
        debates_dict = [debate.to_dict() for debate in debates]
        
        # Guardar en archivo JSON
        with open('data/debates.json', 'w') as f:
            json.dump(debates_dict, f, indent=4)
    
    @classmethod
    def load_all_debates(cls):
        """Cargar todos los debates desde un archivo JSON"""
        try:
            with open('data/debates.json', 'r') as f:
                debates_dict = json.load(f)
                return [cls.from_dict(debate_dict) for debate_dict in debates_dict]
        except (FileNotFoundError, json.JSONDecodeError):
            # Si el archivo no existe o está vacío, devolver una lista vacía
            return []
    
    @classmethod
    def find_by_id(cls, debate_id):
        """Buscar un debate por su ID"""
        debates = cls.load_all_debates()
        for debate in debates:
            if debate.id == debate_id:
                return debate
        return None
    
    @classmethod
    def find_by_author(cls, author_id):
        """Buscar debates por ID de autor"""
        debates = cls.load_all_debates()
        return [debate for debate in debates if debate.author_id == author_id]
    
    @classmethod
    def find_by_category(cls, category):
        """Buscar debates por categoría"""
        debates = cls.load_all_debates()
        return [debate for debate in debates if debate.category == category]
    
    @classmethod
    def find_by_tag(cls, tag):
        """Buscar debates por etiqueta"""
        debates = cls.load_all_debates()
        return [debate for debate in debates if tag in debate.tags]
    
    def save(self):
        """Guardar o actualizar un debate"""
        debates = self.load_all_debates()
        
        # Verificar si el debate ya existe
        for i, debate in enumerate(debates):
            if debate.id == self.id:
                # Actualizar debate existente
                self.updated_at = datetime.now().isoformat()
                debates[i] = self
                self.save_all_debates(debates)
                return
        
        # Agregar nuevo debate
        debates.append(self)
        self.save_all_debates(debates)
    
    def delete(self):
        """Eliminar un debate"""
        debates = self.load_all_debates()
        debates = [debate for debate in debates if debate.id != self.id]
        self.save_all_debates(debates)
    
    def add_comment(self, comment_id):
        """Añadir un comentario al debate"""
        if comment_id not in self.comments:
            self.comments.append(comment_id)
            self.save()
    
    def add_upvote(self, user_id):
        """Añadir un upvote al debate"""
        if user_id in self.downvotes:
            self.downvotes.remove(user_id)
        
        if user_id not in self.upvotes:
            self.upvotes.append(user_id)
            self.save()
    
    def add_downvote(self, user_id):
        """Añadir un downvote al debate"""
        if user_id in self.upvotes:
            self.upvotes.remove(user_id)
        
        if user_id not in self.downvotes:
            self.downvotes.append(user_id)
            self.save()
    
    def increment_view(self):
        """Incrementar el contador de vistas"""
        self.views += 1
        self.save()
    
    def close_debate(self):
        """Cerrar el debate"""
        self.status = 'closed'
        self.save()
    
    def archive_debate(self):
        """Archivar el debate"""
        self.status = 'archived'
        self.save()
    
    def reopen_debate(self):
        """Reabrir el debate"""
        self.status = 'active'
        self.save()