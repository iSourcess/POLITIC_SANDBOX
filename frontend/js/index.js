// JavaScript para la página de inicio


document.addEventListener('DOMContentLoaded', function() {
    // Configuración de la API
    const API_BASE_URL = 'http://localhost:5000/api';
    
    // Referencias a elementos DOM
    const trendingDebatesContainer = document.getElementById('trending-debates-container');
    const btnCreateDebate = document.getElementById('btn-create-debate');
    const createDebateModal = document.getElementById('create-debate-modal');
    const createDebateForm = document.getElementById('create-debate-form');
    const searchForm = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const SUPABASE_URL = "https://kbcsmxpxiupjidpqiogk.supabase.co";
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc';
    
    // 1. Inicializa Supabase
    const supabase = window.supabase.createClient(
        'https://kbcsmxpxiupjidpqiogk.supabase.co',  // 👈 Tu Project URL
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
    );

    // 2. Verifica que funciona
    console.log('✅ Supabase inicializado:', supabase);

    // 3. Prueba la conexión
    supabase.auth.getSession().then(result => {
        console.log('📊 Sesión:', result);
    });

    // Verificar autenticación
    checkAuth();
    
    // Cargar debates destacados
    loadTrendingDebates();
    
    // Event Listeners
    if (btnCreateDebate) {
        btnCreateDebate.addEventListener('click', function(e) {
            e.preventDefault();
            if (isAuthenticated()) {
                openModal(createDebateModal);
            } else {
                openModal(document.getElementById('login-modal'));
                showMessage('Debes iniciar sesión para crear un debate', 'error');
            }
        });
    }
    
    if (createDebateForm) {
        createDebateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createDebate();
        });
    }
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                window.location.href = `debates.html?search=${encodeURIComponent(searchTerm)}`;
            }
        });
    }
    
    // Cerrar modales al hacer clic en la X
    document.querySelectorAll('.close-modal').forEach(function(closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });
    
    // Cerrar modales al hacer clic fuera del contenido
    document.querySelectorAll('.modal').forEach(function(modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Cambiar entre modales de login y registro
    document.getElementById('switch-to-register').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('login-modal').classList.remove('active');
        document.getElementById('register-modal').classList.add('active');
    });
    
    document.getElementById('switch-to-login').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('register-modal').classList.remove('active');
        document.getElementById('login-modal').classList.add('active');
    });
    
    // Funciones
    
    /**
     * Verifica si el usuario está autenticado
     */
    function checkAuth() {
        const token = localStorage.getItem('token');
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        
        if (token) {
            // Usuario autenticado
            authButtons.classList.add('hidden');
            userProfile.classList.remove('hidden');
            
            // Obtener información del usuario
            fetch(`${API_BASE_URL}/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('username').textContent = data.user.username;
                    // Si el usuario tiene avatar, actualizarlo
                    if (data.user.avatar) {
                        document.getElementById('user-avatar').src = data.user.avatar;
                    }
                } else {
                    // Token inválido
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_id');
                    authButtons.classList.remove('hidden');
                    userProfile.classList.add('hidden');
                }
            })
            .catch(error => {
                console.error('Error al verificar autenticación:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                authButtons.classList.remove('hidden');
                userProfile.classList.add('hidden');
            });
            
            // Configurar botón de logout
            document.getElementById('btn-logout').addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                window.location.reload();
            });
        } else {
            // Usuario no autenticado
            authButtons.classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
    }
    
    /**
     * Verifica si el usuario está autenticado
     */
    function isAuthenticated() {
        return localStorage.getItem('token') !== null;
    }
    
    /**
     * Carga los debates destacados
     */
    function loadTrendingDebates() {
        trendingDebatesContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        // Obtener debates destacados (ordenados por votos)
        fetch(`${API_BASE_URL}/debates?sort_by=votes&per_page=6`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.debates.length > 0) {
                    renderDebates(data.debates);
                } else {
                    trendingDebatesContainer.innerHTML = '<p class="no-results">No hay debates destacados aún. ¡Sé el primero en crear uno!</p>';
                }
            })
            .catch(error => {
                console.error('Error al cargar debates destacados:', error);
                trendingDebatesContainer.innerHTML = '<p class="error-message">Error al cargar debates. Intenta de nuevo más tarde.</p>';
            });
    }
    
    /**
     * Renderiza los debates en el contenedor
     */
    function renderDebates(debates) {
        trendingDebatesContainer.innerHTML = '';
        
        debates.forEach(debate => {
            // Crear elemento de debate
            const debateCard = document.createElement('div');
            debateCard.className = 'debate-card';
            
            // Truncar contenido para mostrar solo un extracto
            const contentExcerpt = debate.content.length > 150 ? 
                debate.content.substring(0, 150) + '...' : 
                debate.content;
            
            // Formatear fecha
            const createdDate = new Date(debate.created_at);
            const formattedDate = createdDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            // HTML del debate
            debateCard.innerHTML = `
                <div class="debate-card-header">
                    <span class="debate-card-category ${debate.category || 'general'}">
                        ${debate.category ? debate.category.charAt(0).toUpperCase() + debate.category.slice(1) : 'General'}
                    </span>
                    <span class="debate-card-date">${formattedDate}</span>
                </div>
                <div class="debate-card-body">
                    <h3 class="debate-card-title">${debate.title}</h3>
                    <p class="debate-card-content">${contentExcerpt}</p>
                </div>
                <div class="debate-card-footer">
                    <div class="debate-card-author">
                        <img src="img/default-avatar.png" alt="Avatar">
                        <div class="debate-card-author-info">
                            <div class="debate-card-author-name">${debate.author ? debate.author.username : 'Usuario'}</div>
                            <div class="debate-card-author-university">${debate.author && debate.author.university ? debate.author.university : 'Universidad'}</div>
                        </div>
                    </div>
                    <div class="debate-card-stats">
                        <div class="debate-card-stat">
                            <i class="fas fa-comment"></i>
                            <span>${debate.comments ? debate.comments.length : 0}</span>
                        </div>
                        <div class="debate-card-stat">
                            <i class="fas fa-arrow-up"></i>
                            <span>${debate.upvotes ? debate.upvotes.length : 0}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Añadir evento de clic para ir al debate
            debateCard.addEventListener('click', function() {
                window.location.href = `debate.html?id=${debate.id}`;
            });
            
            trendingDebatesContainer.appendChild(debateCard);
        });
    }
    
    /**
     * Crea un nuevo debate
     */
    function createDebate() {
        const title = document.getElementById('debate-title').value;
        const content = document.getElementById('debate-content').value;
        const category = document.getElementById('debate-category').value;
        const tagsInput = document.getElementById('debate-tags').value;
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
        
        const token = localStorage.getItem('token');
        
        if (!token) {
            showMessage('Debes iniciar sesión para crear un debate', 'error');
            return;
        }
        
        // Mostrar indicador de carga
        const submitButton = createDebateForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = '<div class="spinner-small"></div> Creando...';
        
        fetch(`${API_BASE_URL}/debates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                content,
                category,
                tags
            })
        })
        .then(response => response.json())
        .then(data => {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            
            if (data.success) {
                // Cerrar modal y mostrar mensaje de éxito
                createDebateModal.classList.remove('active');
                createDebateForm.reset();
                showMessage('Debate creado exitosamente', 'success');
                
                // Redirigir al debate creado
                setTimeout(() => {
                    window.location.href = `debate.html?id=${data.debate.id}`;
                }, 1500);
            } else {
                showMessage(data.message || 'Error al crear el debate', 'error');
            }
        })
        .catch(error => {
            console.error('Error al crear debate:', error);
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            showMessage('Error al crear el debate. Intenta de nuevo.', 'error');
        });
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