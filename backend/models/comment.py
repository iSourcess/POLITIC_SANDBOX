# Modelo de comentario

import json
import os
import uuid
from datetime import datetime

class Comment:
    def __init__(self, content=None, author_id=None, debate_id=None, comment_id=None, parent_id=None):
        self.id = comment_id if comment_id else str(uuid.uuid4())
        self.content = content
        self.author_id = author_id
        self.debate_id = debate_id
        self.parent_id = parent_id  # Para comentarios anidados (respuestas a otros comentarios)
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        self.upvotes = []  # Lista de IDs de usuarios que dieron upvote
        self.downvotes = []  # Lista de IDs de usuarios que dieron downvote
        self.replies = []  # Lista de IDs de comentarios que son respuestas a este
    
    def to_dict(self):
        """Convertir el comentario a un diccionario"""
        return {
            'id': self.id,
            'content': self.content,
            'author_id': self.author_id,
            'debate_id': self.debate_id,
            'parent_id': self.parent_id,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'replies': self.replies
        }
    
    @classmethod
    def from_dict(cls, data):
        """Crear un comentario a partir de un diccionario"""
        comment = cls()
        comment.id = data.get('id')
        comment.content = data.get('content')
        comment.author_id = data.get('author_id')
        comment.debate_id = data.get('debate_id')
        comment.parent_id = data.get('parent_id')
        comment.created_at = data.get('created_at')
        comment.updated_at = data.get('updated_at')
        comment.upvotes = data.get('upvotes', [])
        comment.downvotes = data.get('downvotes', [])
        comment.replies = data.get('replies', [])
        return comment
    
    @classmethod
    def save_all_comments(cls, comments):
        """Guardar todos los comentarios en un archivo JSON"""
        # Asegurarse de que exista el directorio para los datos
        os.makedirs('data', exist_ok=True)
        
        # Convertir comentarios a diccionarios
        comments_dict = [comment.to_dict() for comment in comments]
        
        # Guardar en archivo JSON
        with open('data/comments.json', 'w') as f:
            json.dump(comments_dict, f, indent=4)
    
    @classmethod
    def load_all_comments(cls):
        """Cargar todos los comentarios desde un archivo JSON"""
        try:
            with open('data/comments.json', 'r') as f:
                comments_dict = json.load(f)
                return [cls.from_dict(comment_dict) for comment_dict in comments_dict]
        except (FileNotFoundError, json.JSONDecodeError):
            # Si el archivo no existe o está vacío, devolver una lista vacía
            return []
    
    @classmethod
    def find_by_id(cls, comment_id):
        """Buscar un comentario por su ID"""
        comments = cls.load_all_comments()
        for comment in comments:
            if comment.id == comment_id:
                return comment
        return None
    
    @classmethod
    def find_by_debate(cls, debate_id):
        """Buscar comentarios por ID de debate"""
        comments = cls.load_all_comments()
        return [comment for comment in comments if comment.debate_id == debate_id]
    
    @classmethod
    def find_by_author(cls, author_id):
        """Buscar comentarios por ID de autor"""
        comments = cls.load_all_comments()
        return [comment for comment in comments if comment.author_id == author_id]
    
    @classmethod
    def find_replies(cls, comment_id):
        """Buscar respuestas a un comentario"""
        comments = cls.load_all_comments()
        return [comment for comment in comments if comment.parent_id == comment_id]
    
    def save(self):
        """Guardar o actualizar un comentario"""
        comments = self.load_all_comments()
        
        # Verificar si el comentario ya existe
        for i, comment in enumerate(comments):
            if comment.id == self.id:
                # Actualizar comentario existente
                self.updated_at = datetime.now().isoformat()
                comments[i] = self
                self.save_all_comments(comments)
                return
        
        # Agregar nuevo comentario
        comments.append(self)
        self.save_all_comments(comments)
        
        # Si es una respuesta a otro comentario, actualizar el comentario padre
        if self.parent_id:
            parent = self.find_by_id(self.parent_id)
            if parent and self.id not in parent.replies:
                parent.replies.append(self.id)
                parent.save()
    
    def delete(self):
        """Eliminar un comentario"""
        comments = self.load_all_comments()
        comments = [comment for comment in comments if comment.id != self.id]
        self.save_all_comments(comments)
        
        # Si es una respuesta a otro comentario, actualizar el comentario padre
        if self.parent_id:
            parent = self.find_by_id(self.parent_id)
            if parent and self.id in parent.replies:
                parent.replies.remove(self.id)
                parent.save()
    
    def add_upvote(self, user_id):
        """Añadir un upvote al comentario"""
        if user_id in self.downvotes:
            self.downvotes.remove(user_id)
        
        if user_id not in self.upvotes:
            self.upvotes.append(user_id)
            self.save()
    
    def add_downvote(self, user_id):
        """Añadir un downvote al comentario"""
        if user_id in self.upvotes:
            self.upvotes.remove(user_id)
        
        if user_id not in self.downvotes:
            self.downvotes.append(user_id)
            self.save()
    
    def add_reply(self, reply_id):
        """Añadir una respuesta al comentario"""
        if reply_id not in self.replies:
            self.replies.append(reply_id)
            self.save()