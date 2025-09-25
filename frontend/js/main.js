document.addEventListener('DOMContentLoaded', function() {
    // Configuración de la API
    const API_URL = 'https://api.politicsandbox.com';
    
    // Referencias a elementos del DOM
    const trendingDebatesContainer = document.getElementById('trending-debates');
    const createDebateModal = document.getElementById('create-debate-modal');
    const createDebateBtn = document.getElementById('create-debate-btn');
    const createDebateForm = document.getElementById('create-debate-form');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userProfileBtn = document.getElementById('user-profile-btn');
    
    // Verificar autenticación al cargar la página
    checkAuth();
    
    // Cargar debates tendencia
    loadTrendingDebates();
    
    // Event listeners
    if (createDebateBtn) {
        createDebateBtn.addEventListener('click', function() {
            if (isAuthenticated()) {
                openModal(createDebateModal);
            } else {
                showMessage('Debes iniciar sesión para crear un debate', 'error');
                openModal(document.getElementById('login-modal'));
            }
        });
    }
    
    if (createDebateForm) {
        createDebateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createDebate();
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            openModal(document.getElementById('login-modal'));
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            openModal(document.getElementById('register-modal'));
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
    
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', function() {
            window.location.href = '/profile.html';
        });
    }
    
    /**
     * Verifica si el usuario está autenticado
     */
    function checkAuth() {
        if (isAuthenticated()) {
            // Mostrar elementos para usuarios autenticados
            document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'block');
            document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
            
            // Obtener información del usuario
            fetch(`${API_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al obtener información del usuario');
                }
                return response.json();
            })
            .then(data => {
                // Actualizar UI con información del usuario
                if (userProfileBtn) {
                    userProfileBtn.textContent = data.name || data.email;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Si hay error en la autenticación, hacer logout
                if (error.message.includes('401')) {
                    logout();
                }
            });
        } else {
            // Mostrar elementos para invitados
            document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'block');
        }
    }
    
    /**
     * Verifica si hay un token de autenticación
     */
    function isAuthenticated() {
        return localStorage.getItem('auth_token') !== null;
    }
    
    /**
     * Cierra la sesión del usuario
     */
    function logout() {
        localStorage.removeItem('auth_token');
        showMessage('Has cerrado sesión correctamente', 'success');
        checkAuth();
    }
    
    /**
     * Carga los debates tendencia
     */
    function loadTrendingDebates() {
        if (!trendingDebatesContainer) return;
        
        // Mostrar indicador de carga
        trendingDebatesContainer.innerHTML = '<div class="loading">Cargando debates...</div>';
        
        fetch(`${API_URL}/api/debates/trending`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar debates');
                }
                return response.json();
            })
            .then(data => {
                if (data.length === 0) {
                    trendingDebatesContainer.innerHTML = '<div class="no-results">No hay debates disponibles</div>';
                    return;
                }
                
                renderDebates(data, trendingDebatesContainer);
            })
            .catch(error => {
                console.error('Error:', error);
                trendingDebatesContainer.innerHTML = `<div class="error">Error al cargar debates: ${error.message}</div>`;
            });
    }
    
    /**
     * Renderiza los debates en el contenedor especificado
     */
    function renderDebates(debates, container) {
        container.innerHTML = '';
        
        debates.forEach(debate => {
            // Crear elemento de debate
            const debateEl = document.createElement('div');
            debateEl.className = 'debate-card';
            
            // Truncar contenido si es muy largo
            const truncatedContent = debate.content.length > 150 ? 
                debate.content.substring(0, 150) + '...' : 
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
                <div class="debate-stats">
                    <span class="debate-comments">${debate.comments_count || 0} comentarios</span>
                    <span class="debate-votes">${debate.votes_count || 0} votos</span>
                </div>
            `;
            
            // Añadir evento de clic para ir a la página del debate
            debateEl.addEventListener('click', function() {
                window.location.href = `/debate.html?id=${debate.id}`;
            });
            
            // Añadir al contenedor
            container.appendChild(debateEl);
        });
    }
    
    /**
     * Crea un nuevo debate
     */
    function createDebate() {
        const title = document.getElementById('debate-title').value.trim();
        const content = document.getElementById('debate-content').value.trim();
        const category = document.getElementById('debate-category').value;
        
        // Validar campos
        if (!title || !content) {
            showMessage('Por favor completa todos los campos requeridos', 'error');
            return;
        }
        
        // Verificar autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            showMessage('Debes iniciar sesión para crear un debate', 'error');
            openModal(document.getElementById('login-modal'));
            return;
        }
        
        // Deshabilitar botón de envío y mostrar indicador de carga
        const submitBtn = createDebateForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creando...';
        
        // Enviar solicitud a la API
        fetch(`${API_URL}/api/debates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                content,
                category_id: category
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al crear el debate');
            }
            return response.json();
        })
        .then(data => {
            showMessage('Debate creado correctamente', 'success');
            
            // Cerrar modal y resetear formulario
            createDebateModal.classList.remove('active');
            createDebateForm.reset();
            
            // Redirigir a la página del debate
            setTimeout(() => {
                window.location.href = `/debate.html?id=${data.id}`;
            }, 1000);
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage(`Error al crear el debate: ${error.message}`, 'error');
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
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