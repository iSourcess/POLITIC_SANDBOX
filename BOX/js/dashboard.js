// ===== VARIABLES GLOBALES =====
let currentTheme = 'light';
let currentFilter = 'all';
let posts = [];
let activeUsers = [];
let currentUser = null;

// Configuración de la API
const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeEventListeners();
    checkAuthStatus();
});

// ===== GESTIÓN DE TEMA =====
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// ===== AUTENTICACIÓN =====
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            currentUser = result.data;
            updateUserInterface();
            loadDashboardData();
        } else {
            // Usuario no autenticado, redirigir a login
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        showNotification('Error de conexión', 'error');
        // Cargar datos mock como fallback
        loadMockData();
        renderPosts();
        renderActiveUsers();
        updateStats();
    }
}

function updateUserInterface() {
    if (currentUser) {
        // Actualizar avatar del usuario
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.src = currentUser.avatar_url;
        }
        
        // Actualizar nombre en el menú si existe
        const userName = document.querySelector('.user-name');
        if (userName) {
            userName.textContent = currentUser.full_name;
        }
    }
}

async function loadDashboardData() {
    try {
        await Promise.all([
            loadPosts(),
            loadStats(),
            loadActiveUsers()
        ]);
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        showNotification('Error cargando datos', 'error');
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Navegación
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNavLink(link);
        });
    });

    // Menú de usuario
    const userAvatar = document.querySelector('.user-avatar');
    const userDropdown = document.getElementById('userDropdown');
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', toggleUserDropdown);
        document.addEventListener('click', (e) => {
            if (!userAvatar.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    // Logout
    const logoutLink = document.querySelector('a[href="#logout"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Filtros de posts
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setActiveFilter(tab.dataset.filter);
        });
    });

    // Formularios
    const newPostForm = document.getElementById('newPostForm');
    const newPollForm = document.getElementById('newPollForm');
    
    if (newPostForm) {
        newPostForm.addEventListener('submit', handleNewPost);
    }
    
    if (newPollForm) {
        newPollForm.addEventListener('submit', handleNewPoll);
    }

    // Cargar más posts
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMorePosts);
    }

    // Cerrar modales al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
}

function setActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = 'index.html';
        } else {
            showNotification('Error cerrando sesión', 'error');
        }
    } catch (error) {
        console.error('Error en logout:', error);
        showNotification('Error cerrando sesión', 'error');
    }
}

function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Actualizar tabs activos
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Filtrar posts
    renderPosts();
}

// ===== GESTIÓN DE MODALES =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Limpiar formularios
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

function openNewPostModal() {
    openModal('newPostModal');
}

function openNewPollModal() {
    openModal('newPollModal');
}

// ===== CARGA DE DATOS DESDE API =====

async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            posts = result.data.posts;
            renderPosts();
        } else {
            throw new Error('Error cargando posts');
        }
    } catch (error) {
        console.error('Error cargando posts:', error);
        showNotification('Error cargando publicaciones', 'error');
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            updateStatsDisplay(result.data.stats);
            activeUsers = result.data.active_users;
            renderActiveUsers();
            renderPopularTags(result.data.popular_tags);
        } else {
            throw new Error('Error cargando estadísticas');
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showNotification('Error cargando estadísticas', 'error');
    }
}

function updateStatsDisplay(stats) {
    const debatesElement = document.getElementById('debatesCount');
    const pollsElement = document.getElementById('pollsCount');
    const studentsElement = document.getElementById('studentsCount');
    const engagementElement = document.getElementById('engagementCount');
    
    if (debatesElement) debatesElement.textContent = stats.debates_count;
    if (pollsElement) pollsElement.textContent = stats.polls_count;
    if (studentsElement) studentsElement.textContent = stats.students_count;
    if (engagementElement) engagementElement.textContent = `${stats.engagement}%`;
}

function renderPopularTags(tags) {
    const tagsContainer = document.querySelector('.topic-tags');
    if (tagsContainer && tags) {
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="topic-tag">#${tag.tag}</span>`
        ).join('');
    }
}

// ===== GESTIÓN DE POSTS =====
async function handleNewPost(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const postData = {
        title: formData.get('title'),
        category: formData.get('category'),
        content: formData.get('content'),
        tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('newPostModal');
            showNotification('Publicación creada exitosamente', 'success');
            loadPosts(); // Recargar posts
        } else {
            showNotification(result.message || 'Error creando publicación', 'error');
        }
    } catch (error) {
        console.error('Error creando post:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function handleNewPoll(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const options = Array.from(formData.getAll('option[]')).filter(option => option.trim());
    
    const pollData = {
        title: formData.get('title'),
        description: formData.get('description'),
        options: options,
        duration: parseInt(formData.get('duration')),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/polls`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(pollData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('newPollModal');
            showNotification('Encuesta creada exitosamente', 'success');
            loadPosts(); // Recargar posts
        } else {
            showNotification(result.message || 'Error creando encuesta', 'error');
        }
    } catch (error) {
        console.error('Error creando encuesta:', error);
        showNotification('Error de conexión', 'error');
    }
}

function addPollOption() {
    const pollOptions = document.getElementById('pollOptions');
    const optionCount = pollOptions.children.length;
    
    if (optionCount < 10) { // Máximo 10 opciones
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.name = 'option[]';
        newInput.placeholder = `Opción ${optionCount + 1}`;
        newInput.required = true;
        
        pollOptions.appendChild(newInput);
    }
}

function renderPosts() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;
    
    let filteredPosts = posts;
    
    // Aplicar filtros
    if (currentFilter !== 'all') {
        filteredPosts = posts.filter(post => {
            if (currentFilter === 'debates') return post.category === 'debate';
            if (currentFilter === 'polls') return post.type === 'poll';
            if (currentFilter === 'announcements') return post.category === 'announcement';
            return true;
        });
    }
    
    postsContainer.innerHTML = '';
    
    filteredPosts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
    
    if (filteredPosts.length === 0) {
        postsContainer.innerHTML = '<div class="text-center" style="padding: 2rem;">No hay publicaciones que mostrar</div>';
    }
}

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card fade-in';
    
    if (post.type === 'poll') {
        postDiv.innerHTML = createPollHTML(post);
    } else {
        postDiv.innerHTML = createPostHTML(post);
    }
    
    return postDiv;
}

function createPostHTML(post) {
    const timeAgo = getTimeAgo(post.timestamp);
    const tagsHTML = post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('');
    const likeClass = post.liked ? 'liked' : '';
    
    return `
        <div class="post-header">
            <img src="${post.avatar}" alt="${post.author}" class="post-avatar">
            <div class="post-meta">
                <div class="post-author">${post.author}</div>
                <div class="post-time">${timeAgo}</div>
            </div>
            <span class="post-category ${post.category}">${getCategoryLabel(post.category)}</span>
        </div>
        <h3 class="post-title">${post.title}</h3>
        <div class="post-content">${post.content}</div>
        ${post.tags.length > 0 ? `<div class="post-tags">${tagsHTML}</div>` : ''}
        <div class="post-actions">
            <div class="post-action ${likeClass}" onclick="toggleLike(${post.id})">
                <svg viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>${post.likes}</span>
            </div>
            <div class="post-action" onclick="openCommentsModal(${post.id})">
                <svg viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span>${post.comments}</span>
            </div>
            <div class="post-action" onclick="sharePost(${post.id})">
                <svg viewBox="0 0 24 24">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                <span>${post.shares}</span>
            </div>
        </div>
    `;
}

function createPollHTML(poll) {
    const timeAgo = getTimeAgo(poll.timestamp);
    
    let optionsHTML = '';
    if (poll.userVoted || poll.isExpired) {
        // Mostrar resultados
        optionsHTML = poll.options.map((option, index) => `
            <div class="poll-option voted">
                <span>${option.text}</span>
                <div class="poll-results">${option.percentage}% (${option.votes} votos)</div>
                <div class="poll-progress" style="width: ${option.percentage}%"></div>
            </div>
        `).join('');
    } else {
        // Mostrar opciones para votar
        optionsHTML = poll.options.map((option, index) => `
            <div class="poll-option" onclick="voteInPoll(${poll.poll_id}, ${index})">
                <input type="radio" name="poll_${poll.poll_id}">
                <span>${option.text}</span>
            </div>
        `).join('');
    }
    
    return `
        <div class="post-header">
            <img src="${poll.avatar}" alt="${poll.author}" class="post-avatar">
            <div class="post-meta">
                <div class="post-author">${poll.author}</div>
                <div class="post-time">${timeAgo}</div>
            </div>
            <span class="post-category poll">Encuesta</span>
        </div>
        <h3 class="post-title">${poll.title}</h3>
        ${poll.description ? `<div class="post-content">${poll.description}</div>` : ''}
        <div class="poll-options">
            ${optionsHTML}
        </div>
        ${poll.userVoted || poll.isExpired ? `<div class="poll-results">Total de votos: ${poll.totalVotes}</div>` : ''}
        ${poll.isExpired ? '<div class="poll-expired">Encuesta finalizada</div>' : ''}
        <div class="post-actions">
            <div class="post-action" onclick="toggleLike(${poll.id})">
                <svg viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>${poll.likes}</span>
            </div>
            <div class="post-action" onclick="openCommentsModal(${poll.id})">
                <svg viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span>${poll.comments}</span>
            </div>
        </div>
    `;
}

// ===== ACCIONES DE POSTS =====
async function toggleLike(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar el post en la lista local
            const post = posts.find(p => p.id === postId);
            if (post) {
                post.liked = result.data.liked;
                post.likes = result.data.likes_count;
                renderPosts();
            }
        } else {
            showNotification(result.message || 'Error actualizando like', 'error');
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function voteInPoll(pollId, optionIndex) {
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ option_index: optionIndex })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Voto registrado exitosamente', 'success');
            // Actualizar los datos de la encuesta
            const post = posts.find(p => p.poll_id === pollId);
            if (post) {
                post.userVoted = true;
                post.options = result.data.options;
                post.totalVotes = result.data.total_votes;
                renderPosts();
            }
        } else {
            showNotification(result.message || 'Error votando', 'error');
        }
    } catch (error) {
        console.error('Error voting in poll:', error);
        showNotification('Error de conexión', 'error');
    }
}

function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (navigator.share) {
        navigator.share({
            title: post.title,
            text: `Mira esta publicación en POLITIC-SANDBOX: ${post.title}`,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Enlace copiado al portapapeles', 'success');
    }
}

function openCommentsModal(postId) {
    // Por implementar: modal de comentarios
    showNotification('Funcionalidad de comentarios próximamente', 'info');
}

// ===== USUARIOS ACTIVOS =====
async function loadActiveUsers() {
    // Los usuarios activos ya se cargan con las estadísticas
    renderActiveUsers();
}

function renderActiveUsers() {
    const activeUsersContainer = document.getElementById('activeUsers');
    if (!activeUsersContainer) return;
    
    activeUsersContainer.innerHTML = activeUsers.map(user => `
        <div class="user-item">
            <img src="${user.avatar}" alt="${user.name}">
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-status">${user.status}</div>
            </div>
        </div>
    `).join('');
}

// ===== CARGA DE MÁS POSTS =====
async function loadMorePosts() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!loadMoreBtn) return;
    
    loadMoreBtn.classList.add('loading');
    loadMoreBtn.textContent = 'Cargando...';
    
    try {
        const offset = posts.length;
        const response = await fetch(`${API_BASE_URL}/posts?offset=${offset}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            const newPosts = result.data.posts;
            
            if (newPosts.length > 0) {
                posts = [...posts, ...newPosts];
                renderPosts();
                showNotification(`${newPosts.length} publicaciones más cargadas`, 'success');
            } else {
                showNotification('No hay más publicaciones', 'info');
            }
        } else {
            showNotification('Error cargando más publicaciones', 'error');
        }
    } catch (error) {
        console.error('Error loading more posts:', error);
        showNotification('Error de conexión', 'error');
    } finally {
        loadMoreBtn.classList.remove('loading');
        loadMoreBtn.textContent = 'Cargar más publicaciones';
    }
}

// ===== UTILIDADES =====
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return time.toLocaleDateString();
}

function getCategoryLabel(category) {
    const labels = {
        debate: 'Debate',
        announcement: 'Anuncio',
        question: 'Pregunta',
        proposal: 'Propuesta',
        poll: 'Encuesta'
    };
    return labels[category] || category;
}

function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Agregar estilos si no existen
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                padding: 1rem;
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                animation: slideInRight 0.3s ease-out;
            }
            .notification-success { background: #10b981; color: white; }
            .notification-error { background: #ef4444; color: white; }
            .notification-info { background: #3b82f6; color: white; }
            .notification-warning { background: #f59e0b; color: white; }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .notification-close {
                background: none;
                border: none;
                color: currentColor;
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: 1rem;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .post-action.liked {
                color: #ef4444;
            }
            .poll-option.voted {
                position: relative;
                background: var(--bg-secondary);
                cursor: default;
            }
            .poll-expired {
                color: var(--text-secondary);
                font-style: italic;
                text-align: center;
                margin-top: 1rem;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ===== DATOS MOCK COMO FALLBACK =====
function loadMockData() {
    posts = [
        {
            id: 1,
            type: 'post',
            category: 'debate',
            title: '¿Deberían las universidades públicas ser completamente gratuitas?',
            content: 'He estado pensando sobre el acceso a la educación superior y me parece que eliminar completamente las cuotas podría beneficiar a más estudiantes. ¿Qué opinan? ¿Cómo se financiaría esto?',
            tags: ['educacion', 'financiamiento', 'acceso'],
            author: 'María González',
            avatar: 'https://via.placeholder.com/40',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            likes: 15,
            comments: 8,
            shares: 3,
            liked: false
        }
    ];
    
    activeUsers = [
        {
            id: 1,
            name: 'Ana García',
            avatar: 'https://via.placeholder.com/32',
            status: 'En línea'
        }
    ];
}