# Controlador de autenticación

import uuid
import jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from models.user import User

class AuthController:
    def __init__(self):
        self.secret_key = 'clave_secreta_muy_segura_para_jwt'
    
    def login(self, username, password):
        """Autenticar a un usuario"""
        # Buscar al usuario por nombre de usuario
        user = User.find_by_username(username)
        
        # Verificar si el usuario existe y la contraseña es correcta
        if user and user.check_password(password):
            # Generar token JWT
            token = self._generate_token(user.id)
            
            return {
                'success': True,
                'user_id': user.id,
                'token': token
            }
        
        return {
            'success': False,
            'message': 'Nombre de usuario o contraseña incorrectos'
        }
    
    def register(self, fullname, email, username, password, university=None):
        """Registrar a un nuevo usuario"""
        # Verificar si el nombre de usuario ya existe
        if User.find_by_username(username):
            return {
                'success': False,
                'message': 'El nombre de usuario ya está en uso'
            }
        
        # Verificar si el correo electrónico ya existe
        if User.find_by_email(email):
            return {
                'success': False,
                'message': 'El correo electrónico ya está registrado'
            }
        
        # Crear y guardar el nuevo usuario
        user = User(fullname=fullname, email=email, username=username, password=password, university=university)
        user.save()
        
        # Generar token JWT
        token = self._generate_token(user.id)
        
        return {
            'success': True,
            'message': 'Usuario registrado exitosamente',
            'token': token,
            'user': {
                'id': user.id,
                'fullname': user.fullname,
                'email': user.email,
                'username': user.username,
                'university': user.university
            }
        }
    
    def forgot_password(self, email):
        """Iniciar el proceso de recuperación de contraseña"""
        # Buscar al usuario por correo electrónico
        user = User.find_by_email(email)
        
        if not user:
            return {
                'success': False,
                'message': 'No se encontró ninguna cuenta con ese correo electrónico'
            }
        
        # Generar token de restablecimiento
        reset_token = str(uuid.uuid4())
        
        # Establecer fecha de expiración (24 horas)
        expiry = datetime.now() + timedelta(hours=24)
        
        # Actualizar usuario con el token y la fecha de expiración
        user.reset_token = reset_token
        user.reset_token_expiry = expiry.isoformat()
        user.save()
        
        # En un caso real, aquí se enviaría un correo electrónico con el enlace de restablecimiento
        # Por ahora, solo devolvemos el token para fines de demostración
        return {
            'success': True,
            'reset_token': reset_token
        }
    
    def reset_password(self, token, new_password):
        """Restablecer la contraseña de un usuario"""
        # Buscar al usuario por token de restablecimiento
        user = User.find_by_reset_token(token)
        
        if not user:
            return {
                'success': False,
                'message': 'Token de restablecimiento inválido'
            }
        
        # Verificar si el token ha expirado
        if user.reset_token_expiry:
            expiry = datetime.fromisoformat(user.reset_token_expiry)
            if datetime.now() > expiry:
                return {
                    'success': False,
                    'message': 'El token de restablecimiento ha expirado'
                }
        
        # Actualizar la contraseña
        user.password_hash = generate_password_hash(new_password)
        
        # Limpiar el token de restablecimiento
        user.reset_token = None
        user.reset_token_expiry = None
        
        # Guardar los cambios
        user.save()
        
        return {
            'success': True
        }
    
    def _generate_token(self, user_id):
        """Generar un token JWT para el usuario"""
        payload = {
            'exp': datetime.utcnow() + timedelta(days=1),  # Expiración: 1 día
            'iat': datetime.utcnow(),  # Tiempo de emisión
            'sub': user_id  # Sujeto del token (ID del usuario)
        }
        
        return jwt.encode(
            payload,
            self.secret_key,
            algorithm='HS256'
        )
    
    def verify_token(self, token):
        """Verificar un token JWT"""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=['HS256']
            )
            
            return {
                'success': True,
                'user_id': payload['sub']
            }
        except jwt.ExpiredSignatureError:
            return {
                'success': False,
                'message': 'El token ha expirado'
            }
        except jwt.InvalidTokenError:
            return {
                'success': False,
                'message': 'Token inválido'
            }
            
    def update_user(self, user_id, update_data):
        """Actualizar información del usuario"""
        user = User.find_by_id(user_id)
        if not user:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
            
        # Actualizar campos permitidos
        allowed_fields = ["fullname", "university", "bio"]
        for field in allowed_fields:
            if field in update_data:
                setattr(user, field, update_data[field])
                
        user.save()
        return {
            'success': True,
            'message': 'Usuario actualizado exitosamente',
            'user': user.to_dict()
        }
        
    def follow_user(self, follower_id, followed_id):
        """Seguir a un usuario"""
        follower = User.find_by_id(follower_id)
        followed = User.find_by_id(followed_id)
        
        if not follower or not followed:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
            
        if follower_id == followed_id:
            return {
                'success': False,
                'message': 'No puedes seguirte a ti mismo'
            }
            
        # Inicializar listas si no existen
        if not hasattr(follower, 'following') or follower.following is None:
            follower.following = []
        if not hasattr(followed, 'followers') or followed.followers is None:
            followed.followers = []
            
        # Verificar si ya sigue al usuario
        if followed_id in follower.following:
            return {
                'success': False,
                'message': 'Ya sigues a este usuario'
            }
            
        # Actualizar relaciones
        follower.following.append(followed_id)
        followed.followers.append(follower_id)
        
        follower.save()
        followed.save()
        
        return {
            'success': True,
            'message': 'Usuario seguido exitosamente'
        }
        
    def unfollow_user(self, follower_id, followed_id):
        """Dejar de seguir a un usuario"""
        follower = User.find_by_id(follower_id)
        followed = User.find_by_id(followed_id)
        
        if not follower or not followed:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
            
        # Verificar si las listas existen
        if not hasattr(follower, 'following') or follower.following is None or \
           not hasattr(followed, 'followers') or followed.followers is None:
            return {
                'success': False,
                'message': 'No sigues a este usuario'
            }
            
        # Verificar si sigue al usuario
        if followed_id not in follower.following:
            return {
                'success': False,
                'message': 'No sigues a este usuario'
            }
            
        # Actualizar relaciones
        follower.following.remove(followed_id)
        followed.followers.remove(follower_id)
        
        follower.save()
        followed.save()
        
        return {
            'success': True,
            'message': 'Has dejado de seguir al usuario exitosamente'
        }
        
    def save_item(self, user_id, item_type, item_id):
        """Guardar un elemento (debate o comentario)"""
        user = User.find_by_id(user_id)
        if not user:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
            
        # Inicializar lista de guardados si no existe
        if not hasattr(user, 'saved') or user.saved is None:
            user.saved = []
            
        # Verificar si el item ya está guardado
        if any(item.get('item_id') == item_id and item.get('type') == item_type for item in user.saved):
            return {
                'success': False,
                'message': 'Elemento ya guardado'
            }
            
        # Guardar item
        import datetime
        import uuid
        saved_item = {
            "id": str(uuid.uuid4()),
            "type": item_type,
            "item_id": item_id,
            "saved_at": datetime.utcnow().isoformat()
        }
        user.saved.append(saved_item)
        
        user.save()
        return {
            'success': True,
            'message': 'Elemento guardado exitosamente',
            'saved_item': saved_item
        }
        
    def unsave_item(self, user_id, saved_id):
        """Eliminar un elemento guardado"""
        user = User.find_by_id(user_id)
        if not user:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
            
        # Verificar si la lista de guardados existe
        if not hasattr(user, 'saved') or user.saved is None:
            return {
                'success': False,
                'message': 'Elemento no encontrado'
            }
            
        # Buscar y eliminar el item guardado
        saved_item = next((item for item in user.saved if item.get('id') == saved_id), None)
        if not saved_item:
            return {
                'success': False,
                'message': 'Elemento no encontrado'
            }
            
        user.saved.remove(saved_item)
        
        user.save()
        return {
            'success': True,
            'message': 'Elemento eliminado de guardados'
        }
        
    def get_saved_items(self, user_id):
        """Obtener elementos guardados por el usuario"""
        user = User.find_by_id(user_id)
        if not user:
            return {
                'success': False,
                'message': 'Usuario no encontrado'
            }
            
        # Devolver lista de guardados o lista vacía si no existe
        saved_items = user.saved if hasattr(user, 'saved') and user.saved is not None else []
        return {
            'success': True,
            'saved': saved_items
        }