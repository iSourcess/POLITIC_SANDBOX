// Debates.js - Funcionalidad para la página de debates

// Variables globales
const API_BASE_URL = 'http://localhost:5000/api';
let currentPage = 1;
let totalPages = 1;
let currentCategory = '';
let currentSortBy = 'recent';
let currentSearchQuery = '';
let currentDebateId = null;
let isEditMode = false;

// Referencias DOM
const debatesList = document.getElementById('debates-list');
const debatesPagination = document.getElementById('debates-pagination');
const debatesLoading = document.getElementById('debates-loading');
const newDebateBtn = document.getElementById('new-debate-btn');
const debateModal = document.getElementById('debate-modal');
const viewDebateModal = document.getElementById('view-debate-modal');
const debateForm = document.getElementById('debate-form');
const debateModalTitle = document.getElementById('debate-modal-title');
const cancelDebateBtn = document.getElementById('cancel-debate');
const categoryFilter = document.getElementById('category-filter');
const sortByFilter = document.getElementById('sort-by');
const searchInput = document.getElementById('search-debates');
const searchBtn = document.getElementById('search-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileLink = document.getElementById('profile-link');

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDebates();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Filtros y búsqueda
    categoryFilter.addEventListener('change', handleFilterChange);
    sortByFilter.addEventListener('change', handleFilterChange);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Botones de debate
    newDebateBtn.addEventListener('click', openNewDebateModal);
    cancelDebateBtn.addEventListener('click', closeDebateModal);
    debateForm.addEventListener('submit', handleDebateSubmit);

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            debateModal.style.display = 'none';
            viewDebateModal.style.display = 'none';
        });
    });

    // Cerrar modales al hacer clic fuera de ellos
    window.addEventListener('click', (e) => {
        if (e.target === debateModal) debateModal.style.display = 'none';
        if (e.target === viewDebateModal) viewDebateModal.style.display = 'none';
    });

    // Logout
    logoutBtn.addEventListener('click', handleLogout);
}

// Verificar si el usuario está autenticado
//function checkAuth() {
//    const token = localStorage.getItem('token');
//    if (!token) {
//        window.location.href = 'index.html';
//        return;
//    }

    // Verificar token
//    fetch(`${API_BASE_URL}/verify-token`, {
//        method: 'POST',
//        headers: {
//            'Content-Type': 'application/json'
//        },
//        body: JSON.stringify({ token })
//    })
//    .then(response => response.json())
//    .then(data => {
//        if (!data.success) {
//            localStorage.removeItem('token');
//            window.location.href = 'index.html';
//        }
//    })
//    .catch(error => {
//        console.error('Error al verificar autenticación:', error);
//        localStorage.removeItem('token');
//        window.location.href = 'index.html';
//    });
//}

// Cargar debates con filtros y paginación
function loadDebates() {
    showLoading(true);
    
    let url = `${API_BASE_URL}/debates?page=${currentPage}&per_page=10`;
    
    if (currentCategory) url += `&category=${currentCategory}`;
    if (currentSortBy) url += `&sort_by=${currentSortBy}`;
    if (currentSearchQuery) url += `&search=${encodeURIComponent(currentSearchQuery)}`;
    
    const token = localStorage.getItem('token');
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderDebates(data.debates);
            renderPagination(data.page, data.total_pages);
            totalPages = data.total_pages;
        } else {
            showError(data.message || 'Error al cargar debates');
        }
        showLoading(false);
    })
    .catch(error => {
        console.error('Error al cargar debates:', error);
        showError('Error de conexión al cargar debates');
        showLoading(false);
    });
}

// Renderizar lista de debates
function renderDebates(debates) {
    if (!debates || debates.length === 0) {
        debatesList.innerHTML = `
            <div class="no-debates">
                <p>No se encontraron debates. ¡Sé el primero en crear uno!</p>
            </div>
        `;
        return;
    }
    
    debatesList.innerHTML = '';
    
    debates.forEach(debate => {
        const debateCard = document.createElement('div');
        debateCard.className = 'debate-card';
        debateCard.dataset.id = debate.id;
        
        // Formatear fecha
        const debateDate = new Date(debate.created_at);
        const formattedDate = debateDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Obtener inicial del autor para avatar
        const authorInitial = debate.author_username ? debate.author_username.charAt(0).toUpperCase() : '?';
        
        // Crear HTML del debate
        debateCard.innerHTML = `
            <div class="debate-header">
                <h3 class="debate-title">${debate.title}</h3>
                <span class="debate-category">${formatCategory(debate.category)}</span>
            </div>
            <div class="debate-meta">
                <div class="debate-author">
                    <div class="author-avatar">${authorInitial}</div>
                    <span>${debate.author_username || 'Usuario'}</span>
                </div>
                <div class="debate-date">${formattedDate}</div>
            </div>
            <div class="debate-preview">${debate.content.substring(0, 200)}${debate.content.length > 200 ? '...' : ''}</div>
            <div class="debate-tags">
                ${debate.tags.map(tag => `<span class="debate-tag">${tag}</span>`).join('')}
            </div>
            <div class="debate-stats">
                <div class="stat-item">
                    <i class="fas fa-arrow-up"></i>
                    <span>${debate.upvotes || 0}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-arrow-down"></i>
                    <span>${debate.downvotes || 0}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-comment"></i>
                    <span>${debate.comments_count || 0}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-eye"></i>
                    <span>${debate.views || 0}</span>
                </div>
            </div>
        `;
        
        // Evento para abrir el debate
        debateCard.addEventListener('click', () => openDebateView(debate.id));
        
        debatesList.appendChild(debateCard);
    });
}

// Renderizar paginación
function renderPagination(currentPage, totalPages) {
    if (totalPages <= 1) {
        debatesPagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Botón anterior
    paginationHTML += `
        <div class="page-item ${currentPage === 1 ? 'disabled' : ''}" 
             data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </div>
    `;
    
    // Páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <div class="page-item ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </div>
        `;
    }
    
    // Botón siguiente
    paginationHTML += `
        <div class="page-item ${currentPage === totalPages ? 'disabled' : ''}" 
             data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </div>
    `;
    
    debatesPagination.innerHTML = paginationHTML;
    
    // Agregar event listeners a los botones de paginación
    document.querySelectorAll('.page-item:not(.disabled)').forEach(item => {
        item.addEventListener('click', () => {
            currentPage = parseInt(item.dataset.page);
            loadDebates();
        });
    });
}

// Abrir modal para nuevo debate
function openNewDebateModal() {
    isEditMode = false;
    debateModalTitle.textContent = 'Crear Nuevo Debate';
    debateForm.reset();
    debateModal.style.display = 'block';
}

// Abrir modal para editar debate
function openEditDebateModal(debate) {
    isEditMode = true;
    currentDebateId = debate.id;
    debateModalTitle.textContent = 'Editar Debate';
    
    document.getElementById('debate-title').value = debate.title;
    document.getElementById('debate-category').value = debate.category;
    document.getElementById('debate-tags').value = debate.tags.join(', ');
    document.getElementById('debate-content').value = debate.content;
    
    debateModal.style.display = 'block';
}

// Cerrar modal de debate
function closeDebateModal() {
    debateModal.style.display = 'none';
    debateForm.reset();
}

// Manejar envío del formulario de debate
function handleDebateSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('debate-title').value.trim();
    const category = document.getElementById('debate-category').value;
    const tagsInput = document.getElementById('debate-tags').value.trim();
    const content = document.getElementById('debate-content').value.trim();
    
    // Validar campos
    if (!title || !content) {
        showError('Por favor completa los campos requeridos');
        return;
    }
    
    // Procesar tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const debateData = {
        title,
        category,
        tags,
        content
    };
    
    const token = localStorage.getItem('token');
    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? 
        `${API_BASE_URL}/debates/${currentDebateId}` : 
        `${API_BASE_URL}/debates`;
    
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(debateData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeDebateModal();
            loadDebates();
            showSuccess(isEditMode ? 'Debate actualizado correctamente' : 'Debate creado correctamente');
            
            if (!isEditMode) {
                // Si es un nuevo debate, abrir la vista del debate
                openDebateView(data.debate.id);
            }
        } else {
            showError(data.message || 'Error al procesar el debate');
        }
    })
    .catch(error => {
        console.error('Error al enviar debate:', error);
        showError('Error de conexión al enviar el debate');
    });
}

// Abrir vista detallada de un debate
function openDebateView(debateId) {
    currentDebateId = debateId;
    viewDebateModal.style.display = 'block';
    
    const debateDetail = document.getElementById('debate-detail');
    debateDetail.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Cargando debate...</p>
        </div>
    `;
    
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/debates/${debateId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderDebateDetail(data.debate);
            loadComments(debateId);
        } else {
            debateDetail.innerHTML = `<p class="error-message">${data.message || 'Error al cargar el debate'}</p>`;
        }
    })
    .catch(error => {
        console.error('Error al cargar debate:', error);
        debateDetail.innerHTML = `<p class="error-message">Error de conexión al cargar el debate</p>`;
    });
}

// Renderizar detalle de un debate
function renderDebateDetail(debate) {
    const debateDetail = document.getElementById('debate-detail');
    
    // Formatear fecha
    const debateDate = new Date(debate.created_at);
    const formattedDate = debateDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Obtener inicial del autor para avatar
    const authorInitial = debate.author_username ? debate.author_username.charAt(0).toUpperCase() : '?';
    
    // Verificar si el usuario actual es el autor
    const isAuthor = debate.is_author;
    
    // Crear HTML del detalle del debate
    debateDetail.innerHTML = `
        <div class="debate-detail-header">
            <h2 class="debate-detail-title">${debate.title}</h2>
            <div class="debate-detail-meta">
                <div class="debate-detail-author">
                    <div class="debate-detail-avatar">${authorInitial}</div>
                    <div class="author-info">
                        <div class="author-name">${debate.author_username || 'Usuario'}</div>
                        <div class="author-university">${debate.author_university || 'Universidad'}</div>
                    </div>
                </div>
                <div class="debate-detail-date">${formattedDate}</div>
            </div>
            <div class="debate-category">${formatCategory(debate.category)}</div>
        </div>
        
        <div class="debate-detail-content">${formatContent(debate.content)}</div>
        
        <div class="debate-detail-tags">
            ${debate.tags.map(tag => `<span class="debate-detail-tag">${tag}</span>`).join('')}
        </div>
        
        <div class="debate-actions">
            <div class="vote-buttons">
                <button class="vote-btn upvote ${debate.user_vote === 'upvote' ? 'active' : ''}" data-vote="upvote">
                    <i class="fas fa-arrow-up"></i>
                    <span>A favor (${debate.upvotes || 0})</span>
                </button>
                <button class="vote-btn downvote ${debate.user_vote === 'downvote' ? 'active' : ''}" data-vote="downvote">
                    <i class="fas fa-arrow-down"></i>
                    <span>En contra (${debate.downvotes || 0})</span>
                </button>
            </div>
            
            <div class="debate-stats-detail">
                <div class="stat-item">
                    <i class="fas fa-comment"></i>
                    <span>${debate.comments_count || 0} comentarios</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-eye"></i>
                    <span>${debate.views || 0} vistas</span>
                </div>
            </div>
        </div>
        
        ${isAuthor ? `
        <div class="author-actions">
            <button class="btn secondary-btn edit-debate-btn">
                <i class="fas fa-edit"></i> Editar debate
            </button>
            <button class="btn danger-btn delete-debate-btn">
                <i class="fas fa-trash"></i> Eliminar debate
            </button>
        </div>
        ` : ''}
        
        <div class="comments-section">
            <div class="comments-header">
                <h3>Comentarios (${debate.comments_count || 0})</h3>
            </div>
            
            <div class="comment-form">
                <textarea id="comment-content" placeholder="Escribe tu comentario..."></textarea>
                <button id="submit-comment" class="btn primary-btn">Publicar comentario</button>
            </div>
            
            <div id="comments-list" class="comments-list">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Cargando comentarios...</p>
                </div>
            </div>
        </div>
    `;
    
    // Agregar event listeners
    if (isAuthor) {
        document.querySelector('.edit-debate-btn').addEventListener('click', () => {
            viewDebateModal.style.display = 'none';
            openEditDebateModal(debate);
        });
        
        document.querySelector('.delete-debate-btn').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas eliminar este debate? Esta acción no se puede deshacer.')) {
                deleteDebate(debate.id);
            }
        });
    }
    
    // Event listeners para votos
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            voteDebate(debate.id, btn.dataset.vote);
        });
    });
    
    // Event listener para enviar comentario
    document.getElementById('submit-comment').addEventListener('click', () => {
        submitComment(debate.id);
    });
}

// Cargar comentarios de un debate
function loadComments(debateId) {
    const commentsList = document.getElementById('comments-list');
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/debates/${debateId}/comments`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderComments(data.comments);
        } else {
            commentsList.innerHTML = `<p class="error-message">${data.message || 'Error al cargar comentarios'}</p>`;
        }
    })
    .catch(error => {
        console.error('Error al cargar comentarios:', error);
        commentsList.innerHTML = `<p class="error-message">Error de conexión al cargar comentarios</p>`;
    });
}

// Renderizar comentarios
function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = `<p class="no-comments">No hay comentarios aún. ¡Sé el primero en comentar!</p>`;
        return;
    }
    
    commentsList.innerHTML = '';
    
    // Organizar comentarios en árbol (comentarios principales y respuestas)
    const mainComments = comments.filter(comment => !comment.parent_id);
    const replies = comments.filter(comment => comment.parent_id);
    
    // Renderizar comentarios principales
    mainComments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        
        // Buscar respuestas a este comentario
        const commentReplies = replies.filter(reply => reply.parent_id === comment.id);
        
        if (commentReplies.length > 0) {
            const repliesList = document.createElement('div');
            repliesList.className = 'replies-list';
            
            commentReplies.forEach(reply => {
                repliesList.appendChild(createCommentElement(reply));
            });
            
            commentElement.appendChild(repliesList);
        }
        
        commentsList.appendChild(commentElement);
    });
}

// Crear elemento de comentario
function createCommentElement(comment) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment-card';
    commentElement.dataset.id = comment.id;
    
    // Formatear fecha
    const commentDate = new Date(comment.created_at);
    const formattedDate = commentDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Obtener inicial del autor para avatar
    const authorInitial = comment.author_username ? comment.author_username.charAt(0).toUpperCase() : '?';
    
    // Verificar si el usuario actual es el autor
    const isAuthor = comment.is_author;
    
    commentElement.innerHTML = `
        <div class="comment-header">
            <div class="comment-author">
                <div class="comment-avatar">${authorInitial}</div>
                <span class="comment-author-name">${comment.author_username || 'Usuario'}</span>
            </div>
            <div class="comment-date">${formattedDate}</div>
        </div>
        
        <div class="comment-content">${formatContent(comment.content)}</div>
        
        <div class="comment-actions">
            <div class="comment-vote upvote ${comment.user_vote === 'upvote' ? 'active' : ''}" data-vote="upvote" data-id="${comment.id}">
                <i class="fas fa-arrow-up"></i>
                <span>${comment.upvotes || 0}</span>
            </div>
            <div class="comment-vote downvote ${comment.user_vote === 'downvote' ? 'active' : ''}" data-vote="downvote" data-id="${comment.id}">
                <i class="fas fa-arrow-down"></i>
                <span>${comment.downvotes || 0}</span>
            </div>
            <div class="reply-btn" data-id="${comment.id}">
                <i class="fas fa-reply"></i> Responder
            </div>
            ${isAuthor ? `
            <div class="edit-comment-btn" data-id="${comment.id}">
                <i class="fas fa-edit"></i> Editar
            </div>
            <div class="delete-comment-btn" data-id="${comment.id}">
                <i class="fas fa-trash"></i> Eliminar
            </div>
            ` : ''}
        </div>
        
        <div class="reply-form" style="display: none;">
            <textarea placeholder="Escribe tu respuesta..."></textarea>
            <button class="btn primary-btn submit-reply-btn" data-id="${comment.id}">Responder</button>
            <button class="btn secondary-btn cancel-reply-btn">Cancelar</button>
        </div>
    `;
    
    // Agregar event listeners
    // Votos
    commentElement.querySelectorAll('.comment-vote').forEach(voteBtn => {
        voteBtn.addEventListener('click', () => {
            voteComment(voteBtn.dataset.id, voteBtn.dataset.vote);
        });
    });
    
    // Responder
    const replyBtn = commentElement.querySelector('.reply-btn');
    const replyForm = commentElement.querySelector('.reply-form');
    const cancelReplyBtn = commentElement.querySelector('.cancel-reply-btn');
    const submitReplyBtn = commentElement.querySelector('.submit-reply-btn');
    
    replyBtn.addEventListener('click', () => {
        replyForm.style.display = 'block';
    });
    
    cancelReplyBtn.addEventListener('click', () => {
        replyForm.style.display = 'none';
        replyForm.querySelector('textarea').value = '';
    });
    
    submitReplyBtn.addEventListener('click', () => {
        const content = replyForm.querySelector('textarea').value.trim();
        if (content) {
            submitReply(currentDebateId, comment.id, content);
        }
    });
    
    // Editar y eliminar (si es el autor)
    if (isAuthor) {
        const editBtn = commentElement.querySelector('.edit-comment-btn');
        const deleteBtn = commentElement.querySelector('.delete-comment-btn');
        
        editBtn.addEventListener('click', () => {
            editComment(comment);
        });
        
        deleteBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
                deleteComment(comment.id);
            }
        });
    }
    
    return commentElement;
}

// Enviar un comentario
function submitComment(debateId) {
    const content = document.getElementById('comment-content').value.trim();
    
    if (!content) {
        showError('El comentario no puede estar vacío');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/debates/${debateId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('comment-content').value = '';
            loadComments(debateId);
            showSuccess('Comentario publicado correctamente');
        } else {
            showError(data.message || 'Error al publicar comentario');
        }
    })
    .catch(error => {
        console.error('Error al enviar comentario:', error);
        showError('Error de conexión al enviar el comentario');
    });
}

// Enviar una respuesta a un comentario
function submitReply(debateId, parentId, content) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/debates/${debateId}/comments`, {
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
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadComments(debateId);
            showSuccess('Respuesta publicada correctamente');
        } else {
            showError(data.message || 'Error al publicar respuesta');
        }
    })
    .catch(error => {
        console.error('Error al enviar respuesta:', error);
        showError('Error de conexión al enviar la respuesta');
    });
}

// Editar un comentario
function editComment(comment) {
    // Crear un formulario de edición inline
    const commentElement = document.querySelector(`.comment-card[data-id="${comment.id}"]`);
    const commentContent = commentElement.querySelector('.comment-content');
    const originalContent = comment.content;
    
    // Guardar el contenido original
    commentContent.dataset.original = originalContent;
    
    // Reemplazar con formulario de edición
    commentContent.innerHTML = `
        <textarea class="edit-comment-textarea">${originalContent}</textarea>
        <div class="edit-actions">
            <button class="btn primary-btn save-edit-btn">Guardar</button>
            <button class="btn secondary-btn cancel-edit-btn">Cancelar</button>
        </div>
    `;
    
    // Event listeners
    const saveBtn = commentContent.querySelector('.save-edit-btn');
    const cancelBtn = commentContent.querySelector('.cancel-edit-btn');
    
    saveBtn.addEventListener('click', () => {
        const newContent = commentContent.querySelector('textarea').value.trim();
        
        if (!newContent) {
            showError('El comentario no puede estar vacío');
            return;
        }
        
        updateComment(comment.id, newContent);
    });
    
    cancelBtn.addEventListener('click', () => {
        // Restaurar contenido original
        commentContent.innerHTML = formatContent(originalContent);
    });
}

// Actualizar un comentario
function updateComment(commentId, content) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadComments(currentDebateId);
            showSuccess('Comentario actualizado correctamente');
        } else {
            showError(data.message || 'Error al actualizar comentario');
        }
    })
    .catch(error => {
        console.error('Error al actualizar comentario:', error);
        showError('Error de conexión al actualizar el comentario');
    });
}

// Eliminar un comentario
function deleteComment(commentId) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadComments(currentDebateId);
            showSuccess('Comentario eliminado correctamente');
        } else {
            showError(data.message || 'Error al eliminar comentario');
        }
    })
    .catch(error => {
        console.error('Error al eliminar comentario:', error);
        showError('Error de conexión al eliminar el comentario');
    });
}

// Votar en un debate
function voteDebate(debateId, voteType) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/debates/${debateId}/vote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote_type: voteType })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Actualizar UI de votos
            const upvoteBtn = document.querySelector('.vote-btn.upvote');
            const downvoteBtn = document.querySelector('.vote-btn.downvote');
            
            upvoteBtn.classList.toggle('active', data.user_vote === 'upvote');
            downvoteBtn.classList.toggle('active', data.user_vote === 'downvote');
            
            upvoteBtn.querySelector('span').textContent = `A favor (${data.upvotes || 0})`;
            downvoteBtn.querySelector('span').textContent = `En contra (${data.downvotes || 0})`;
            
            // También actualizar en la lista de debates si está visible
            const debateCard = document.querySelector(`.debate-card[data-id="${debateId}"]`);
            if (debateCard) {
                const upvoteCount = debateCard.querySelector('.stat-item:nth-child(1) span');
                const downvoteCount = debateCard.querySelector('.stat-item:nth-child(2) span');
                
                if (upvoteCount) upvoteCount.textContent = data.upvotes || 0;
                if (downvoteCount) downvoteCount.textContent = data.downvotes || 0;
            }
        } else {
            showError(data.message || 'Error al votar');
        }
    })
    .catch(error => {
        console.error('Error al votar:', error);
        showError('Error de conexión al votar');
    });
}

// Votar en un comentario
function voteComment(commentId, voteType) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote_type: voteType })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Actualizar UI de votos
            const upvoteBtn = document.querySelector(`.comment-vote.upvote[data-id="${commentId}"]`);
            const downvoteBtn = document.querySelector(`.comment-vote.downvote[data-id="${commentId}"]`);
            
            upvoteBtn.classList.toggle('active', data.user_vote === 'upvote');
            downvoteBtn.classList.toggle('active', data.user_vote === 'downvote');
            
            upvoteBtn.querySelector('span').textContent = data.upvotes || 0;
            downvoteBtn.querySelector('span').textContent = data.downvotes || 0;
        } else {
            showError(data.message || 'Error al votar');
        }
    })
    .catch(error => {
        console.error('Error al votar:', error);
        showError('Error de conexión al votar');
    });
}

// Eliminar un debate
function deleteDebate(debateId) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/debates/${debateId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            viewDebateModal.style.display = 'none';
            loadDebates();
            showSuccess('Debate eliminado correctamente');
        } else {
            showError(data.message || 'Error al eliminar debate');
        }
    })
    .catch(error => {
        console.error('Error al eliminar debate:', error);
        showError('Error de conexión al eliminar el debate');
    });
}

// Manejar cambio de filtros
function handleFilterChange() {
    currentCategory = categoryFilter.value;
    currentSortBy = sortByFilter.value;
    currentPage = 1;
    loadDebates();
}

// Manejar búsqueda
function handleSearch() {
    currentSearchQuery = searchInput.value.trim();
    currentPage = 1;
    loadDebates();
}

// Manejar logout
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Mostrar/ocultar spinner de carga
function showLoading(show) {
    debatesLoading.style.display = show ? 'flex' : 'none';
}

// Mostrar mensaje de error
function showError(message) {
    // Implementar notificación de error
    alert(message);
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    // Implementar notificación de éxito
    alert(message);
}

// Formatear categoría para mostrar
function formatCategory(category) {
    const categories = {
        'politica_universitaria': 'Política Universitaria',
        'reformas_educativas': 'Reformas Educativas',
        'derechos_estudiantiles': 'Derechos Estudiantiles',
        'bienestar_estudiantil': 'Bienestar Estudiantil',
        'otros': 'Otros'
    };
    
    return categories[category] || category;
}

// Formatear contenido (convertir saltos de línea, etc.)
function formatContent(content) {
    if (!content) return '';
    
    // Convertir saltos de línea en <br>
    return content.replace(/\n/g, '<br>');
}