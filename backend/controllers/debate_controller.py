# Controlador de debates y comentarios

from models.debate import Debate
from models.comment import Comment
from models.user import User

class DebateController:
    def __init__(self):
        pass
    
    def create_debate(self, title, content, author_id, category=None, tags=None):
        """Crear un nuevo debate"""
        # Verificar si el usuario existe
        user = User.find_by_id(author_id)
        if not user:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
        
        # Crear el debate
        debate = Debate(title=title, content=content, author_id=author_id, category=category, tags=tags)
        debate.save()
        
        # Actualizar la lista de posts del usuario
        if debate.id not in user.posts:
            user.posts.append(debate.id)
            user.save()
        
        return {
            'success': True,
            'debate_id': debate.id
        }
    
    def get_debate(self, debate_id, user_id=None):
        """Obtener un debate por su ID"""
        debate = Debate.find_by_id(debate_id)
        
        if not debate:
            return {
                'success': False,
                'message': 'Debate no encontrado'
            }
        
        # Incrementar contador de vistas si se proporciona un ID de usuario
        if user_id and user_id != debate.author_id:
            debate.increment_view()
        
        # Obtener información del autor
        author = User.find_by_id(debate.author_id)
        author_info = {
            'id': author.id,
            'username': author.username,
            'university': author.university
        } if author else {'id': debate.author_id, 'username': 'Usuario desconocido'}
        
        # Obtener comentarios del debate
        comments = Comment.find_by_debate(debate_id)
        comments_data = []
        
        for comment in comments:
            if not comment.parent_id:  # Solo comentarios principales, no respuestas
                comment_author = User.find_by_id(comment.author_id)
                comment_data = {
                    'id': comment.id,
                    'content': comment.content,
                    'author': {
                        'id': comment_author.id,
                        'username': comment_author.username
                    } if comment_author else {'id': comment.author_id, 'username': 'Usuario desconocido'},
                    'created_at': comment.created_at,
                    'upvotes': len(comment.upvotes),
                    'downvotes': len(comment.downvotes),
                    'replies_count': len(comment.replies)
                }
                comments_data.append(comment_data)
        
        # Ordenar comentarios por fecha de creación (más recientes primero)
        comments_data.sort(key=lambda x: x['created_at'], reverse=True)
        
        return {
            'success': True,
            'debate': {
                'id': debate.id,
                'title': debate.title,
                'content': debate.content,
                'author': author_info,
                'created_at': debate.created_at,
                'updated_at': debate.updated_at,
                'category': debate.category,
                'tags': debate.tags,
                'upvotes': len(debate.upvotes),
                'downvotes': len(debate.downvotes),
                'views': debate.views,
                'status': debate.status,
                'comments': comments_data
            }
        }
    
    def update_debate(self, debate_id, user_id, title=None, content=None, category=None, tags=None):
        """Actualizar un debate existente"""
        debate = Debate.find_by_id(debate_id)
        
        if not debate:
            return {
                'success': False,
                'message': 'Debate no encontrado'
            }
        
        # Verificar que el usuario sea el autor del debate
        if debate.author_id != user_id:
            return {
                'success': False,
                'message': 'No tienes permiso para editar este debate'
            }
        
        # Actualizar campos
        if title:
            debate.title = title
        if content:
            debate.content = content
        if category:
            debate.category = category
        if tags:
            debate.tags = tags
        
        debate.save()
        
        return {
            'success': True,
            'debate_id': debate.id
        }
    
    def delete_debate(self, debate_id, user_id):
        """Eliminar un debate"""
        debate = Debate.find_by_id(debate_id)
        
        if not debate:
            return {
                'success': False,
                'message': 'Debate no encontrado'
            }
        
        # Verificar que el usuario sea el autor del debate
        if debate.author_id != user_id:
            return {
                'success': False,
                'message': 'No tienes permiso para eliminar este debate'
            }
        
        # Eliminar todos los comentarios asociados al debate
        comments = Comment.find_by_debate(debate_id)
        for comment in comments:
            comment.delete()
        
        # Eliminar el debate
        debate.delete()
        
        # Actualizar la lista de posts del usuario
        user = User.find_by_id(user_id)
        if user and debate_id in user.posts:
            user.posts.remove(debate_id)
            user.save()
        
        return {
            'success': True
        }
    
    def vote_debate(self, debate_id, user_id, vote_type):
        """Votar en un debate"""
        debate = Debate.find_by_id(debate_id)
        
        if not debate:
            return {
                'success': False,
                'message': 'Debate no encontrado'
            }
        
        # Verificar que el usuario no sea el autor del debate
        if debate.author_id == user_id:
            return {
                'success': False,
                'message': 'No puedes votar en tu propio debate'
            }
        
        # Registrar el voto
        if vote_type == 'upvote':
            debate.add_upvote(user_id)
        elif vote_type == 'downvote':
            debate.add_downvote(user_id)
        else:
            return {
                'success': False,
                'message': 'Tipo de voto inválido'
            }
        
        # Actualizar los votos del usuario
        user = User.find_by_id(user_id)
        if user:
            vote_record = {'debate_id': debate_id, 'vote_type': vote_type}
            
            # Eliminar voto anterior si existe
            user.votes = [v for v in user.votes if v.get('debate_id') != debate_id]
            
            # Añadir nuevo voto
            user.votes.append(vote_record)
            user.save()
        
        return {
            'success': True,
            'upvotes': len(debate.upvotes),
            'downvotes': len(debate.downvotes)
        }
    
    def create_comment(self, debate_id, content, author_id, parent_id=None):
        """Crear un nuevo comentario"""
        # Verificar si el debate existe
        debate = Debate.find_by_id(debate_id)
        if not debate:
            return {
                'success': False,
                'message': 'Debate no encontrado'
            }
        
        # Verificar si el usuario existe
        user = User.find_by_id(author_id)
        if not user:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
        
        # Si es una respuesta, verificar que el comentario padre exista
        if parent_id:
            parent_comment = Comment.find_by_id(parent_id)
            if not parent_comment:
                return {
                    'success': False,
                    'message': 'Comentario padre no encontrado'
                }
        
        # Crear el comentario
        comment = Comment(
            content=content,
            author_id=author_id,
            debate_id=debate_id,
            parent_id=parent_id
        )
        comment.save()
        
        # Actualizar el debate con el nuevo comentario
        if not parent_id:  # Solo si es un comentario principal, no una respuesta
            debate.add_comment(comment.id)
        
        return {
            'success': True,
            'comment_id': comment.id
        }
    
    def get_comment(self, comment_id):
        """Obtener un comentario por su ID"""
        comment = Comment.find_by_id(comment_id)
        
        if not comment:
            return {
                'success': False,
                'message': 'Comentario no encontrado'
            }
        
        # Obtener información del autor
        author = User.find_by_id(comment.author_id)
        author_info = {
            'id': author.id,
            'username': author.username
        } if author else {'id': comment.author_id, 'username': 'Usuario desconocido'}
        
        # Obtener respuestas al comentario
        replies = []
        for reply_id in comment.replies:
            reply = Comment.find_by_id(reply_id)
            if reply:
                reply_author = User.find_by_id(reply.author_id)
                reply_data = {
                    'id': reply.id,
                    'content': reply.content,
                    'author': {
                        'id': reply_author.id,
                        'username': reply_author.username
                    } if reply_author else {'id': reply.author_id, 'username': 'Usuario desconocido'},
                    'created_at': reply.created_at,
                    'upvotes': len(reply.upvotes),
                    'downvotes': len(reply.downvotes)
                }
                replies.append(reply_data)
        
        # Ordenar respuestas por fecha de creación (más recientes primero)
        replies.sort(key=lambda x: x['created_at'], reverse=True)
        
        return {
            'success': True,
            'comment': {
                'id': comment.id,
                'content': comment.content,
                'author': author_info,
                'debate_id': comment.debate_id,
                'parent_id': comment.parent_id,
                'created_at': comment.created_at,
                'updated_at': comment.updated_at,
                'upvotes': len(comment.upvotes),
                'downvotes': len(comment.downvotes),
                'replies': replies
            }
        }
    
    def update_comment(self, comment_id, user_id, content):
        """Actualizar un comentario existente"""
        comment = Comment.find_by_id(comment_id)
        
        if not comment:
            return {
                'success': False,
                'message': 'Comentario no encontrado'
            }
        
        # Verificar que el usuario sea el autor del comentario
        if comment.author_id != user_id:
            return {
                'success': False,
                'message': 'No tienes permiso para editar este comentario'
            }
        
        # Actualizar el contenido
        comment.content = content
        comment.save()
        
        return {
            'success': True,
            'comment_id': comment.id
        }
    
    def delete_comment(self, comment_id, user_id):
        """Eliminar un comentario"""
        comment = Comment.find_by_id(comment_id)
        
        if not comment:
            return {
                'success': False,
                'message': 'Comentario no encontrado'
            }
        
        # Verificar que el usuario sea el autor del comentario
        if comment.author_id != user_id:
            return {
                'success': False,
                'message': 'No tienes permiso para eliminar este comentario'
            }
        
        # Eliminar todas las respuestas al comentario
        for reply_id in comment.replies:
            reply = Comment.find_by_id(reply_id)
            if reply:
                reply.delete()
        
        # Eliminar el comentario
        comment.delete()
        
        return {
            'success': True
        }
    
    def vote_comment(self, comment_id, user_id, vote_type):
        """Votar en un comentario"""
        comment = Comment.find_by_id(comment_id)
        
        if not comment:
            return {
                'success': False,
                'message': 'Comentario no encontrado'
            }
        
        # Verificar que el usuario no sea el autor del comentario
        if comment.author_id == user_id:
            return {
                'success': False,
                'message': 'No puedes votar en tu propio comentario'
            }
        
        # Registrar el voto
        if vote_type == 'upvote':
            comment.add_upvote(user_id)
        elif vote_type == 'downvote':
            comment.add_downvote(user_id)
        else:
            return {
                'success': False,
                'message': 'Tipo de voto inválido'
            }
        
        return {
            'success': True,
            'upvotes': len(comment.upvotes),
            'downvotes': len(comment.downvotes)
        }
    
    def get_debates(self, category=None, tag=None, author_id=None, sort_by='recent', page=1, per_page=10):
        """Obtener una lista de debates con filtros y paginación"""
        # Cargar todos los debates
        all_debates = Debate.load_all_debates()
        
        # Aplicar filtros
        filtered_debates = all_debates
        
        if category:
            filtered_debates = [d for d in filtered_debates if d.category == category]
        
        if tag:
            filtered_debates = [d for d in filtered_debates if tag in d.tags]
        
        if author_id:
            filtered_debates = [d for d in filtered_debates if d.author_id == author_id]
        
        # Ordenar debates
        if sort_by == 'recent':
            filtered_debates.sort(key=lambda x: x.created_at, reverse=True)
        elif sort_by == 'popular':
            filtered_debates.sort(key=lambda x: len(x.upvotes) - len(x.downvotes), reverse=True)
        elif sort_by == 'commented':
            filtered_debates.sort(key=lambda x: len(x.comments), reverse=True)
        elif sort_by == 'views':
            filtered_debates.sort(key=lambda x: x.views, reverse=True)
        
        # Calcular paginación
        total_debates = len(filtered_debates)
        total_pages = (total_debates + per_page - 1) // per_page
        
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        paginated_debates = filtered_debates[start_idx:end_idx]
        
        # Preparar datos de respuesta
        debates_data = []
        
        for debate in paginated_debates:
            author = User.find_by_id(debate.author_id)
            author_info = {
                'id': author.id,
                'username': author.username,
                'university': author.university
            } if author else {'id': debate.author_id, 'username': 'Usuario desconocido'}
            
            debate_data = {
                'id': debate.id,
                'title': debate.title,
                'author': author_info,
                'created_at': debate.created_at,
                'category': debate.category,
                'tags': debate.tags,
                'upvotes': len(debate.upvotes),
                'downvotes': len(debate.downvotes),
                'comments_count': len(debate.comments),
                'views': debate.views,
                'status': debate.status
            }
            
            debates_data.append(debate_data)
        
        return {
            'success': True,
            'debates': debates_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_debates': total_debates,
                'total_pages': total_pages
            }
        }