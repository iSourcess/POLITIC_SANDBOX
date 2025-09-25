// ===== VARIABLES GLOBALES =====
let currentTheme = 'light'; // Removed localStorage dependency
let currentFilter = 'all';
let posts = [];
let activeUsers = [];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeEventListeners();
    loadMockData();
    renderPosts();
    renderActiveUsers();
    updateStats();
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

// ===== GESTIÓN DE POSTS =====
function handleNewPost(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newPost = {
        id: Date.now(),
        type: 'post',
        category: formData.get('category'),
        title: formData.get('title'),
        content: formData.get('content'),
        tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
        author: 'Usuario Actual',
        avatar: 'https://via.placeholder.com/40',
        timestamp: new Date(),
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false
    };
    
    // Agregar al inicio del array
    posts.unshift(newPost);
    
    // Cerrar modal y renderizar
    closeModal('newPostModal');
    renderPosts();
    updateStats();
    
    // Mostrar notificación
    showNotification('Publicación creada exitosamente', 'success');
}

function handleNewPoll(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const options = Array.from(formData.getAll('option[]')).filter(option => option.trim());
    
    const newPoll = {
        id: Date.now(),
        type: 'poll',
        category: 'poll',
        title: formData.get('title'),
        description: formData.get('description'),
        options: options.map(option => ({
            text: option,
            votes: 0
        })),
        duration: parseInt(formData.get('duration')),
        author: 'Usuario Actual',
        avatar: 'https://via.placeholder.com/40',
        timestamp: new Date(),
        totalVotes: 0,
        userVoted: false,
        likes: 0,
        comments: 0,
        shares: 0
    };
    
    posts.unshift(newPoll);
    
    closeModal('newPollModal');
    renderPosts();
    updateStats();
    
    showNotification('Encuesta creada exitosamente', 'success');
}

function addPollOption() {
    const pollOptions = document.getElementById('pollOptions');
    const optionCount = pollOptions.children.length;
    
    if (optionCount < 5) { // Máximo 5 opciones
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
            <div class="post-action" onclick="toggleLike(${post.id})">
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
    const optionsHTML = poll.options.map((option, index) => {
        const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes * 100).toFixed(1) : 0;
        return `
            <div class="poll-option" onclick="voteInPoll(${poll.id}, ${index})">
                <input type="radio" name="poll_${poll.id}" ${poll.userVoted ? 'disabled' : ''}>
                <span>${option.text}</span>
                ${poll.userVoted ? `<span class="poll-results">${percentage}% (${option.votes} votos)</span>` : ''}
                ${poll.userVoted ? `<div class="poll-progress" style="width: ${percentage}%"></div>` : ''}
            </div>
        `;
    }).join('');
    
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
        ${poll.userVoted ? `<div class="poll-results">Total de votos: ${poll.totalVotes}</div>` : ''}
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
function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        if (post.liked) {
            post.likes--;
            post.liked = false;
        } else {
            post.likes++;
            post.liked = true;
        }
        
        renderPosts();
        
        // Aquí se haría la llamada a la API
        updatePostLike(postId, post.liked);
    }
}

function voteInPoll(pollId, optionIndex) {
    const poll = posts.find(p => p.id === pollId);
    if (poll && !poll.userVoted) {
        poll.options[optionIndex].votes++;
        poll.totalVotes++;
        poll.userVoted = true;
        
        renderPosts();
        
        // Aquí se haría la llamada a la API
        submitPollVote(pollId, optionIndex);
        
        showNotification('Voto registrado exitosamente', 'success');
    }
}

function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'POLITIC-SANDBOX',
            text: 'Mira esta publicación en POLITIC-SANDBOX',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Enlace copiado al portapapeles', 'success');
    }
}

function openCommentsModal(postId) {
    // Modal de comentarios
    showNotification('Funcionalidad de comentarios próximamente', 'info');
}

// ===== USUARIOS ACTIVOS =====
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

// ===== ESTADÍSTICAS =====
function updateStats() {
    const debatesCount = posts.filter(p => p.category === 'debate').length;
    const pollsCount = posts.filter(p => p.type === 'poll').length;
    
    const debatesElement = document.getElementById('debatesCount');
    const pollsElement = document.getElementById('pollsCount');
    const studentsElement = document.getElementById('studentsCount');
    const engagementElement = document.getElementById('engagementCount');
    
    if (debatesElement) debatesElement.textContent = debatesCount;
    if (pollsElement) pollsElement.textContent = pollsCount;
    if (studentsElement) studentsElement.textContent = activeUsers.length;
    
    // Calcular engagement
    const totalInteractions = posts.reduce((total, post) => total + post.likes + post.comments, 0);
    const engagement = posts.length > 0 ? Math.round(totalInteractions / posts.length * 10) : 0;
    if (engagementElement) {
        engagementElement.textContent = `${Math.min(engagement, 100)}%`;
    }
}

// ===== CARGA DE MÁS POSTS =====
function loadMorePosts() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!loadMoreBtn) return;
    
    loadMoreBtn.classList.add('loading');
    loadMoreBtn.textContent = 'Cargando...';
    
    // Simular carga desde API
    setTimeout(() => {
        loadMoreBtn.classList.remove('loading');
        loadMoreBtn.textContent = 'Cargar más publicaciones';
        showNotification('No hay más publicaciones por cargar', 'info');
    }, 1000);
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
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ===== API FUNCTIONS =====
async function updatePostLike(postId, liked) {
    try {
        const response = await fetch('/api/posts/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ postId, liked })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar like');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al actualizar like', 'error');
    }
}

async function submitPollVote(pollId, optionIndex) {
    try {
        const response = await fetch('/api/polls/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pollId, optionIndex })
        });
        
        if (!response.ok) {
            throw new Error('Error al enviar voto');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al enviar voto', 'error');
    }
}

async function loadPostsFromAPI() {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) {
            throw new Error('Error al cargar posts');
        }
        
        const data = await response.json();
        posts = data.posts;
        renderPosts();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        // Fallback a datos mock si falla la API
        loadMockData();
    }
}

// ===== DATOS MOCK =====
function loadMockData() {
    posts = generateMockPosts();
    
    // Usuarios activos mock
    activeUsers = [
        {
            id: 1,
            name: 'Ana García',
            avatar: 'https://via.placeholder.com/32',
            status: 'En línea'
        },
        {
            id: 2,
            name: 'Carlos López',
            avatar: 'https://via.placeholder.com/32',
            status: 'Activo hace 5 min'
        },
        {
            id: 3,
            name: 'María Rodríguez',
            avatar: 'https://via.placeholder.com/32',
            status: 'Activo hace 10 min'
        },
        {
            id: 4,
            name: 'Pedro Sánchez',
            avatar: 'https://via.placeholder.com/32',
            status: 'Activo hace 15 min'
        }
    ];
}

function generateMockPosts() {
    const mockPosts = [
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
        },
        {
            id: 2,
            type: 'poll',
            category: 'poll',
            title: '¿Cuál es tu prioridad principal para el próximo semestre?',
            description: 'Ayúdanos a entender qué es lo más importante para la comunidad estudiantil',
            options: [
                { text: 'Mejorar la infraestructura', votes: 45 },
                { text: 'Más becas y apoyo financiero', votes: 62 },
                { text: 'Programas deportivos y culturales', votes: 23 },
                { text: 'Mejor calidad académica', votes: 38 }
            ],
            duration: 7,
            author: 'Consejo Estudiantil',
            avatar: 'https://via.placeholder.com/40',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            totalVotes: 168,
            userVoted: false,
            likes: 8,
            comments: 12,
            shares: 5
        },
        {
            id: 3,
            type: 'post',
            category: 'announcement',
            title: 'Nueva iniciativa de sostenibilidad en el campus',
            content: 'Nos complace anunciar el lanzamiento del programa "Campus Verde" que incluirá estaciones de reciclaje, paneles solares y un huerto estudiantil. ¡Únete a la revolución sostenible!',
            tags: ['sostenibilidad', 'medioambiente', 'campus'],
            author: 'Rectoría',
            avatar: 'https://via.placeholder.com/40',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            likes: 32,
            comments: 15,
            shares: 12,
            liked: true
        },
        {
            id: 4,
            type: 'post',
            category: 'question',
            title: '¿Cómo podemos mejorar la participación estudiantil?',
            content: 'He notado que muchos estudiantes no participan en las actividades del campus. ¿Qué estrategias creen que funcionarían para involucrar más a la comunidad?',
            tags: ['participacion', 'comunidad', 'actividades'],
            author: 'Roberto Silva',
            avatar: 'https://via.placeholder.com/40',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            likes: 12,
            comments: 20,
            shares: 2,
            liked: false
        },
        {
            id: 5,
            type: 'post',
            category: 'proposal',
            title: 'Propuesta: Espacios de coworking 24/7 para estudiantes',
            content: 'Propongo crear espacios de trabajo colaborativo que estén disponibles las 24 horas para estudiantes que necesiten estudiar fuera de horarios regulares. Incluiría WiFi, mesas, enchufes y máquinas expendedoras.',
            tags: ['infraestructura', 'estudio', 'coworking'],
            author: 'Laura Mendoza',
            avatar: 'https://via.placeholder.com/40',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
            likes: 28,
            comments: 11,
            shares: 7,
            liked: false
        }
    ];

    return mockPosts;
}