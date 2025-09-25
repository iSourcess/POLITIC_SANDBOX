document.addEventListener('DOMContentLoaded', function() {
    // Configuración de la API
    const API_URL = 'https://api.politicsandbox.com';
    
    // Obtener ID del debate de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const debateId = urlParams.get('id');
    
    // Referencias a elementos del DOM
    const debateContainer = document.getElementById('debate-container');
    const commentsContainer = document.getElementById('comments-container');
    const relatedDebatesContainer = document.getElementById('related-debates-container');
    const commentForm = document.getElementById('comment-form');
    const commentLoginBtn = document.getElementById('comment-login-btn');
    
    // Verificar autenticación al cargar la página
    checkAuth();
    
    // Si no hay ID de debate, redirigir a la página principal
    if (!debateId) {
        window.location.href = '/index.html';
        return;
    }
    
    // Cargar debate
    loadDebate();
    
    // Cargar comentarios
    loadComments();
    
    // Cargar debates relacionados
    loadRelatedDebates();
    
    // Event listeners
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitComment();
        });
    }
    
    if (commentLoginBtn) {
        commentLoginBtn.addEventListener('click', function() {
            openModal(document.getElementById('login-modal'));
        });
    }
    
    /**
     * Carga los detalles del debate
     */
    function loadDebate() {
        // Mostrar indicador de carga
        debateContainer.innerHTML = '<div class="loading">Cargando debate...</div>';
        
        fetch(`${API_URL}/api/debates/${debateId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar el debate');
                }
                return response.json();
            })
            .then(debate => {
                renderDebate(debate);
                document.title = `${debate.title} - Politics Sandbox`;
            })
            .catch(error => {
                console.error('Error:', error);
                debateContainer.innerHTML = `<div class="error">Error al cargar el debate: ${error.message}</div>`;
            });
    }
    
    /**
     * Renderiza los detalles del debate
     */
    function renderDebate(debate) {
        // Formatear fecha
        const date = new Date(debate.created_at);
        const formattedDate = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Crear HTML del debate
        const debateHTML = `
            <div class="debate-header">
                <h1>${debate.title}</h1>
                <div class="debate-meta">
                    <span class="debate-category">${debate.category.name}</span>
                    <span class="debate-author">Por: ${debate.author.name || 'Anónimo'}</span>
                    <span class="debate-date">${formattedDate}</span>
                </div>
            </div>
            <div class="debate-content">
                ${formatContent(debate.content)}
            </div>
            <div class="debate-actions">
                <div class="debate-stats">
                    <span class="debate-comments">${debate.comments_count || 0} comentarios</span>
                    <span class="debate-votes">${debate.votes_count || 0} votos</span>
                </div>
                <div class="debate-vote-buttons">
                    <button id="upvote-btn" class="btn vote-btn ${debate.user_vote === 'up' ? 'active' : ''}">
                        <i class="fas fa-arrow-up"></i> A favor
                    </button>
                    <button id="downvote-btn" class="btn vote-btn ${debate.user_vote === 'down' ? 'active' : ''}">
                        <i class="fas fa-arrow-down"></i> En contra
                    </button>
                </div>
                <div class="debate-share">
                    <button id="share-btn" class="btn secondary">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                </div>
            </div>
        `;
        
        // Actualizar contenedor
        debateContainer.innerHTML = debateHTML;
        
        // Añadir event listeners para botones de voto
        const upvoteBtn = document.getElementById('upvote-btn');
        const downvoteBtn = document.getElementById('downvote-btn');
        const shareBtn = document.getElementById('share-btn');
        
        if (upvoteBtn) {
            upvoteBtn.addEventListener('click', function() {
                voteDebate('up');
            });
        }
        
        if (downvoteBtn) {
            downvoteBtn.addEventListener('click', function() {
                voteDebate('down');
            });
        }
        
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                shareDebate();
            });
        }
    }
    
    /**
     * Formatea el contenido del debate (convierte saltos de línea, etc.)
     */
    function formatContent(content) {
        // Convertir saltos de línea en etiquetas <p>
        return content.split('\n\n')
            .filter(paragraph => paragraph.trim() !== '')
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }
    
    /**
     * Carga los comentarios del debate
     */
    function loadComments() {
        // Mostrar indicador de carga
        commentsContainer.innerHTML = '<div class="loading">Cargando comentarios...</div>';
        
        fetch(`${API_URL}/api/debates/${debateId}/comments`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar comentarios');
                }
                return response.json();
            })
            .then(comments => {
                if (comments.length === 0) {
                    commentsContainer.innerHTML = '<div class="no-results">No hay comentarios aún. ¡Sé el primero en comentar!</div>';
                    return;
                }
                
                renderComments(comments);
            })
            .catch(error => {
                console.error('Error:', error);
                commentsContainer.innerHTML = `<div class="error">Error al cargar comentarios: ${error.message}</div>`;
            });
    }
    
    /**
     * Renderiza los comentarios
     */
    function renderComments(comments) {
        commentsContainer.innerHTML = '';
        
        comments.forEach(comment => {
            // Crear elemento de comentario
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            
            // Formatear fecha
            const date = new Date(comment.created_at);
            const formattedDate = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Estructura HTML del comentario
            commentEl.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">${comment.author.name || 'Anónimo'}</div>
                    <div class="comment-date">${formattedDate}</div>
                </div>
                <div class="comment-content">
                    ${formatContent(comment.content)}
                </div>
                <div class="comment-actions">
                    <button class="btn text reply-btn">Responder</button>
                    <div class="comment-votes">
                        <button class="vote-up ${comment.user_vote === 'up' ? 'active' : ''}">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <span class="vote-count">${comment.votes_count || 0}</span>
                        <button class="vote-down ${comment.user_vote === 'down' ? 'active' : ''}">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Añadir event listeners para botones de voto
            const voteUpBtn = commentEl.querySelector('.vote-up');
            const voteDownBtn = commentEl.querySelector('.vote-down');
            const replyBtn = commentEl.querySelector('.reply-btn');
            
            if (voteUpBtn) {
                voteUpBtn.addEventListener('click', function() {
                    voteComment(comment.id, 'up');
                });
            }
            
            if (voteDownBtn) {
                voteDownBtn.addEventListener('click', function() {
                    voteComment(comment.id, 'down');
                });
            }
            
            if (replyBtn) {
                replyBtn.addEventListener('click', function() {
                    replyToComment(comment.id, comment.author.name);
                });
            }
            
            // Añadir al contenedor
            commentsContainer.appendChild(commentEl);
            
            // Renderizar respuestas si existen
            if (comment.replies && comment.replies.length > 0) {
                const repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-replies';
                
                comment.replies.forEach(reply => {
                    const replyEl = document.createElement('div');
                    replyEl.className = 'comment reply';
                    
                    // Formatear fecha de la respuesta
                    const replyDate = new Date(reply.created_at);
                    const formattedReplyDate = replyDate.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // Estructura HTML de la respuesta
                    replyEl.innerHTML = `
                        <div class="comment-header">
                            <div class="comment-author">${reply.author.name || 'Anónimo'}</div>
                            <div class="comment-date">${formattedReplyDate}</div>
                        </div>
                        <div class="comment-content">
                            ${formatContent(reply.content)}
                        </div>
                        <div class="comment-actions">
                            <div class="comment-votes">
                                <button class="vote-up ${reply.user_vote === 'up' ? 'active' : ''}">
                                    <i class="fas fa-arrow-up"></i>
                                </button>
                                <span class="vote-count">${reply.votes_count || 0}</span>
                                <button class="vote-down ${reply.user_vote === 'down' ? 'active' : ''}">
                                    <i class="fas fa-arrow-down"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    // Añadir event listeners para botones de voto de la respuesta
                    const replyVoteUpBtn = replyEl.querySelector('.vote-up');
                    const replyVoteDownBtn = replyEl.querySelector('.vote-down');
                    
                    if (replyVoteUpBtn) {
                        replyVoteUpBtn.addEventListener('click', function() {
                            voteComment(reply.id, 'up');
                        });
                    }
                    
                    if (replyVoteDownBtn) {
                        replyVoteDownBtn.addEventListener('click', function() {
                            voteComment(reply.id, 'down');
                        });
                    }
                    
                    // Añadir al contenedor de respuestas
                    repliesContainer.appendChild(replyEl);
                });
                
                // Añadir respuestas después del comentario
                commentEl.after(repliesContainer);
            }
        });
    }
    
    /**
     * Carga debates relacionados
     */
    function loadRelatedDebates() {
        // Mostrar indicador de carga
        relatedDebatesContainer.innerHTML = '<div class="loading">Cargando debates relacionados...</div>';
        
        fetch(`${API_URL}/api/debates/${debateId}/related`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar debates relacionados');
                }
                return response.json();
            })
            .then(debates => {
                if (debates.length === 0) {
                    relatedDebatesContainer.innerHTML = '<div class="no-results">No hay debates relacionados</div>';
                    return;
                }
                
                renderRelatedDebates(debates);
            })
            .catch(error => {
                console.error('Error:', error);
                relatedDebatesContainer.innerHTML = `<div class="error">Error al cargar debates relacionados: ${error.message}</div>`;
            });
    }
    
    /**
     * Renderiza los debates relacionados
     */
    function renderRelatedDebates(debates) {
        relatedDebatesContainer.innerHTML = '';
        
        // Crear contenedor de tarjetas
        const debatesGrid = document.createElement('div');
        debatesGrid.className = 'debates-grid';
        
        debates.forEach(debate => {
            // Crear elemento de debate
            const debateEl = document.createElement('div');
            debateEl.className = 'debate-card';
            
            // Truncar contenido si es muy largo
            const truncatedContent = debate.content.length > 100 ? 
                debate.content.substring(0, 100) + '...' : 
                debate.content;
            
            // Formatear fecha
            const date = new Date(debate.created_at);
            const formattedDate = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Estructura HTML del debate
            debateEl.innerHTML = `
                <h3>${debate.title}</h3>
                <p class="debate-content">${truncatedContent}</p>
                <div class="debate-meta">
                    <span class="debate-author">Por: ${debate.author.name || 'Anónimo'}</span>
                    <span class="debate-date">${formattedDate}</span>
                </div>
            `;
            
            // Añadir evento de clic para ir a la página del debate
            debateEl.addEventListener('click', function() {
                window.location.href = `/debate.html?id=${debate.id}`;
            });
            
            // Añadir al contenedor
            debatesGrid.appendChild(debateEl);
        });
        
        // Añadir grid al contenedor principal
        relatedDebatesContainer.appendChild(debatesGrid);
    }
    
    /**
     * Envía un comentario
     */
    function submitComment() {
        const content = document.getElementById('comment-content').value.trim();
        
        // Validar contenido
        if (!content) {
            showMessage('Por favor escribe un comentario', 'error');
            return;
        }
        
        // Verificar autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            showMessage('Debes iniciar sesión para comentar', 'error');
            openModal(document.getElementById('login-modal'));
            return;
        }
        
        // Deshabilitar botón de envío y mostrar indicador de carga
        const submitBtn = commentForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Enviando...';
        
        // Obtener ID del comentario padre si es una respuesta
        const parentId = commentForm.dataset.parentId || null;
        
        // Enviar solicitud a la API
        fetch(`${API_URL}/api/debates/${debateId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                content,
                parent_id: parentId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al enviar el comentario');
            }
            return response.json();
        })
        .then(data => {
            showMessage('Comentario enviado correctamente', 'success');
            
            // Resetear formulario
            commentForm.reset();
            
            // Si era una respuesta, restaurar el formulario a su estado original
            if (parentId) {
                resetCommentForm();
            }
            
            // Recargar comentarios
            loadComments();
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage(`Error al enviar el comentario: ${error.message}`, 'error');
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
    }
    
    /**
     * Prepara el formulario para responder a un comentario
     */
    function replyToComment(commentId, authorName) {
        // Verificar autenticación
        if (!isAuthenticated()) {
            showMessage('Debes iniciar sesión para responder', 'error');
            openModal(document.getElementById('login-modal'));
            return;
        }
        
        // Modificar formulario para respuesta
        const formTitle = document.querySelector('#comment-form-container h3');
        formTitle.textContent = `Respondiendo a ${authorName}`;
        
        // Añadir botón para cancelar respuesta
        if (!document.getElementById('cancel-reply')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancel-reply';
            cancelBtn.className = 'btn secondary';
            cancelBtn.textContent = 'Cancelar respuesta';
            cancelBtn.addEventListener('click', resetCommentForm);
            
            const submitBtn = commentForm.querySelector('button[type="submit"]');
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn);
        }
        
        // Guardar ID del comentario padre
        commentForm.dataset.parentId = commentId;
        
        // Enfocar el campo de texto
        document.getElementById('comment-content').focus();
        
        // Desplazarse al formulario
        document.getElementById('comment-form-container').scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Restaura el formulario de comentarios a su estado original
     */
    function resetCommentForm() {
        // Restaurar título
        const formTitle = document.querySelector('#comment-form-container h3');
        formTitle.textContent = 'Deja tu comentario';
        
        // Eliminar botón de cancelar
        const cancelBtn = document.getElementById('cancel-reply');
        if (cancelBtn) {
            cancelBtn.remove();
        }
        
        // Eliminar ID del comentario padre
        delete commentForm.dataset.parentId;
    }
    
    /**
     * Vota un debate (a favor o en contra)
     */
    function voteDebate(voteType) {
        // Verificar autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            showMessage('Debes iniciar sesión para votar', 'error');
            openModal(document.getElementById('login-modal'));
            return;
        }
        
        // Enviar solicitud a la API
        fetch(`${API_URL}/api/debates/${debateId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ vote: voteType })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al votar');
            }
            return response.json();
        })
        .then(data => {
            // Actualizar UI
            const upvoteBtn = document.getElementById('upvote-btn');
            const downvoteBtn = document.getElementById('downvote-btn');
            
            if (voteType === 'up') {
                upvoteBtn.classList.toggle('active');
                downvoteBtn.classList.remove('active');
            } else {
                downvoteBtn.classList.toggle('active');
                upvoteBtn.classList.remove('active');
            }
            
            // Actualizar contador de votos
            const voteCount = document.querySelector('.debate-votes');
            if (voteCount) {
                voteCount.textContent = `${data.votes_count || 0} votos`;
            }
            
            showMessage('Voto registrado correctamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage(`Error al votar: ${error.message}`, 'error');
        });
    }
    
    /**
     * Vota un comentario (a favor o en contra)
     */
    function voteComment(commentId, voteType) {
        // Verificar autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            showMessage('Debes iniciar sesión para votar', 'error');
            openModal(document.getElementById('login-modal'));
            return;
        }
        
        // Enviar solicitud a la API
        fetch(`${API_URL}/api/comments/${commentId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ vote: voteType })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al votar');
            }
            return response.json();
        })
        .then(data => {
            // Recargar comentarios para actualizar UI
            loadComments();
            showMessage('Voto registrado correctamente', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage(`Error al votar: ${error.message}`, 'error');
        });
    }
    
    /**
     * Comparte el debate actual
     */
    function shareDebate() {
        // Verificar si la API de compartir está disponible
        if (navigator.share) {
            navigator.share({
                title: document.title,
                url: window.location.href
            })
            .then(() => console.log('Debate compartido'))
            .catch(error => console.error('Error al compartir:', error));
        } else {
            // Fallback: copiar enlace al portapapeles
            const tempInput = document.createElement('input');
            tempInput.value = window.location.href;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            showMessage('Enlace copiado al portapapeles', 'success');
        }
    }
    
    /**
     * Verifica si el usuario está autenticado
     */
    //function checkAuth() {
    //    if (isAuthenticated()) {
            // Mostrar elementos para usuarios autenticados
    //        document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'block');
    //        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
    //    } else {
            // Mostrar elementos para invitados
    //        document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
    //        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'block');
    //    }
    //}
    
    /**
     * Verifica si hay un token de autenticación
     */
    function isAuthenticated() {
        return localStorage.getItem('auth_token') !== null;
    }
    
    /**
     * Abre un modal
     */
    function openModal(modal) {
        // Cerrar todos los modales primero
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        // Abrir el modal especificado
        modal.classList.add('active');
    }
    
    /**
     * Muestra un mensaje al usuario
     */
    function showMessage(message, type = 'info') {
        // Crear elemento de mensaje
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        // Añadir al DOM
        document.body.appendChild(messageElement);
        
        // Mostrar con animación
        setTimeout(() => messageElement.classList.add('show'), 10);
        
        // Eliminar después de un tiempo
        setTimeout(() => {
            messageElement.classList.remove('show');
            setTimeout(() => messageElement.remove(), 300);
        }, 3000);
    }
});