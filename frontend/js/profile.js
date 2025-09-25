// Constantes y variables globales
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let profileUser = null;

// Referencias a elementos DOM
const profileUsername = document.getElementById('profile-username');
const profileName = document.getElementById('profile-name');
const profileUniversity = document.getElementById('profile-university');
const profileAvatar = document.getElementById('profile-avatar');
const profileBio = document.getElementById('profile-bio-text');
const profileDebatesCount = document.getElementById('debates-count');
const profileCommentsCount = document.getElementById('comments-count');
const profileFollowersCount = document.getElementById('followers-count');
const profileFollowingCount = document.getElementById('following-count');

const tabItems = document.querySelectorAll('.tab-item');
const tabPanes = document.querySelectorAll('.tab-pane');

const debatesList = document.getElementById('debates-list');
const commentsList = document.getElementById('comments-list');
const savedList = document.getElementById('saved-list');

const editProfileBtn = document.getElementById('edit-profile-btn');
const editProfileModal = document.getElementById('edit-profile-modal');
const closeModalBtn = document.getElementById('close-modal');
const editProfileForm = document.getElementById('edit-profile-form');

const followBtn = document.getElementById('follow-btn');

// Inicialización cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Obtener información del usuario actual
        currentUser = await fetchCurrentUser();
        
        // Obtener el ID del usuario del perfil desde la URL
        const urlParams = new URLSearchParams(window.location.search);
        const profileUserId = urlParams.get('id');
        
        // Si no hay ID en la URL, mostrar el perfil del usuario actual
        if (!profileUserId) {
            profileUser = currentUser;
        } else {
            // Obtener información del usuario del perfil
            profileUser = await fetchUserById(profileUserId);
        }
        
        // Renderizar la información del perfil
        renderProfileInfo();
        
        // Configurar los eventos de las pestañas
        setupTabEvents();
        
        // Cargar los datos iniciales de la pestaña activa
        loadActiveTabData();
        
        // Configurar eventos para el modal de edición de perfil
        setupModalEvents();
        
        // Configurar el botón de seguir/dejar de seguir
        setupFollowButton();
    } catch (error) {
        console.error('Error al inicializar el perfil:', error);
        showErrorMessage('No se pudo cargar la información del perfil');
    }
});

// Función para obtener el usuario actual
async function fetchCurrentUser() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('No se pudo obtener la información del usuario');
        }
        
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
        throw error;
    }
}

// Función para obtener un usuario por su ID
async function fetchUserById(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('No se pudo obtener la información del usuario');
        }
        
        const data = await response.json();
        return data.user;
    } catch (error) {
        console.error(`Error al obtener el usuario con ID ${userId}:`, error);
        throw error;
    }
}

// Función para renderizar la información del perfil
function renderProfileInfo() {
    // Mostrar información básica del perfil
    profileUsername.textContent = `@${profileUser.username}`;
    profileName.textContent = `${profileUser.first_name} ${profileUser.last_name}`;
    profileUniversity.textContent = profileUser.university || 'No especificada';
    
    // Mostrar avatar (iniciales si no hay imagen)
    const initials = `${profileUser.first_name.charAt(0)}${profileUser.last_name.charAt(0)}`;
    profileAvatar.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
    
    // Mostrar biografía
    profileBio.textContent = profileUser.bio || 'No hay biografía disponible';
    
    // Mostrar estadísticas
    profileDebatesCount.textContent = profileUser.posts ? profileUser.posts.length : 0;
    profileCommentsCount.textContent = profileUser.comments ? profileUser.comments.length : 0;
    profileFollowersCount.textContent = profileUser.followers ? profileUser.followers.length : 0;
    profileFollowingCount.textContent = profileUser.following ? profileUser.following.length : 0;
    
    // Mostrar/ocultar botón de editar perfil
    if (currentUser.id === profileUser.id) {
        editProfileBtn.style.display = 'block';
        if (followBtn) followBtn.style.display = 'none';
    } else {
        editProfileBtn.style.display = 'none';
        if (followBtn) followBtn.style.display = 'block';
    }
}

// Configurar eventos para las pestañas
function setupTabEvents() {
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover clase activa de todas las pestañas
            tabItems.forEach(item => item.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Agregar clase activa a la pestaña seleccionada
            tab.classList.add('active');
            
            // Mostrar el contenido de la pestaña seleccionada
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Cargar datos de la pestaña seleccionada
            loadTabData(tabId);
        });
    });
}

// Cargar datos de la pestaña activa
function loadActiveTabData() {
    const activeTab = document.querySelector('.tab-item.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        loadTabData(tabId);
    } else if (tabItems.length > 0) {
        // Si no hay pestaña activa, activar la primera
        tabItems[0].click();
    }
}

// Cargar datos según la pestaña seleccionada
async function loadTabData(tabId) {
    try {
        switch (tabId) {
            case 'debates-tab':
                await loadUserDebates();
                break;
            case 'comments-tab':
                await loadUserComments();
                break;
            case 'saved-tab':
                await loadUserSaved();
                break;
        }
    } catch (error) {
        console.error(`Error al cargar datos de la pestaña ${tabId}:`, error);
        showErrorMessage(`No se pudieron cargar los datos de ${tabId}`);
    }
}

// Cargar debates del usuario
async function loadUserDebates() {
    try {
        showLoading(debatesList);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/debates/user/${profileUser.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('No se pudieron obtener los debates');
        }
        
        const data = await response.json();
        renderDebatesList(data.debates);
    } catch (error) {
        console.error('Error al cargar debates del usuario:', error);
        showEmptyState(debatesList, 'No se pudieron cargar los debates');
    }
}

// Renderizar lista de debates
function renderDebatesList(debates) {
    debatesList.innerHTML = '';
    
    if (!debates || debates.length === 0) {
        showEmptyState(debatesList, 'No hay debates para mostrar');
        return;
    }
    
    debates.forEach(debate => {
        const debateCard = document.createElement('div');
        debateCard.className = 'profile-debate-card';
        debateCard.onclick = () => window.location.href = `debates.html?id=${debate.id}`;
        
        const date = new Date(debate.created_at);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        debateCard.innerHTML = `
            <h3 class="profile-debate-title">${debate.title}</h3>
            <div class="profile-debate-meta">
                <span>${debate.category}</span>
                <span>${formattedDate}</span>
            </div>
            <p class="profile-debate-preview">${debate.content.substring(0, 150)}${debate.content.length > 150 ? '...' : ''}</p>
            <div class="profile-debate-stats">
                <span><i class="fas fa-comment"></i> ${debate.comments ? debate.comments.length : 0}</span>
                <span><i class="fas fa-arrow-up"></i> ${debate.upvotes ? debate.upvotes.length : 0}</span>
                <span><i class="fas fa-eye"></i> ${debate.views || 0}</span>
            </div>
        `;
        
        debatesList.appendChild(debateCard);
    });
}

// Cargar comentarios del usuario
async function loadUserComments() {
    try {
        showLoading(commentsList);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/comments/user/${profileUser.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('No se pudieron obtener los comentarios');
        }
        
        const data = await response.json();
        renderCommentsList(data.comments);
    } catch (error) {
        console.error('Error al cargar comentarios del usuario:', error);
        showEmptyState(commentsList, 'No se pudieron cargar los comentarios');
    }
}

// Renderizar lista de comentarios
async function renderCommentsList(comments) {
    commentsList.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        showEmptyState(commentsList, 'No hay comentarios para mostrar');
        return;
    }
    
    // Para cada comentario, necesitamos obtener el debate al que pertenece
    for (const comment of comments) {
        try {
            const debate = await fetchDebateById(comment.debate_id);
            
            const commentCard = document.createElement('div');
            commentCard.className = 'profile-comment-card';
            
            const date = new Date(comment.created_at);
            const formattedDate = date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            commentCard.innerHTML = `
                <h4 class="profile-comment-debate" onclick="window.location.href='debates.html?id=${debate.id}'">
                    ${debate.title}
                </h4>
                <p class="profile-comment-content">${comment.content}</p>
                <div class="profile-comment-meta">
                    <span>${formattedDate}</span>
                    <span><i class="fas fa-arrow-up"></i> ${comment.upvotes ? comment.upvotes.length : 0}</span>
                </div>
            `;
            
            commentsList.appendChild(commentCard);
        } catch (error) {
            console.error(`Error al obtener debate para comentario ${comment.id}:`, error);
        }
    }
}

// Obtener un debate por su ID
async function fetchDebateById(debateId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/debates/${debateId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`No se pudo obtener el debate con ID ${debateId}`);
        }
        
        const data = await response.json();
        return data.debate;
    } catch (error) {
        console.error(`Error al obtener debate con ID ${debateId}:`, error);
        throw error;
    }
}

// Cargar elementos guardados por el usuario
async function loadUserSaved() {
    try {
        showLoading(savedList);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/saved`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('No se pudieron obtener los elementos guardados');
        }
        
        const data = await response.json();
        renderSavedList(data.saved);
    } catch (error) {
        console.error('Error al cargar elementos guardados:', error);
        showEmptyState(savedList, 'No se pudieron cargar los elementos guardados');
    }
}

// Renderizar lista de elementos guardados
async function renderSavedList(savedItems) {
    savedList.innerHTML = '';
    
    if (!savedItems || savedItems.length === 0) {
        showEmptyState(savedList, 'No hay elementos guardados para mostrar');
        return;
    }
    
    for (const item of savedItems) {
        try {
            let itemData;
            let itemType;
            
            if (item.type === 'debate') {
                itemData = await fetchDebateById(item.item_id);
                itemType = 'Debate';
            } else if (item.type === 'comment') {
                itemData = await fetchCommentById(item.item_id);
                itemType = 'Comentario';
                // Para comentarios, también necesitamos el debate
                const debate = await fetchDebateById(itemData.debate_id);
                itemData.debateTitle = debate.title;
                itemData.debateId = debate.id;
            }
            
            const savedCard = document.createElement('div');
            savedCard.className = 'profile-saved-card';
            
            const date = new Date(item.saved_at);
            const formattedDate = date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            if (item.type === 'debate') {
                savedCard.onclick = () => window.location.href = `debates.html?id=${itemData.id}`;
                savedCard.innerHTML = `
                    <span class="profile-saved-type">${itemType}</span>
                    <h3 class="profile-saved-title">${itemData.title}</h3>
                    <p class="profile-saved-meta">Guardado el ${formattedDate}</p>
                `;
            } else if (item.type === 'comment') {
                savedCard.onclick = () => window.location.href = `debates.html?id=${itemData.debateId}&comment=${itemData.id}`;
                savedCard.innerHTML = `
                    <span class="profile-saved-type">${itemType}</span>
                    <h3 class="profile-saved-title">${itemData.debateTitle}</h3>
                    <p class="profile-comment-content">${itemData.content}</p>
                    <p class="profile-saved-meta">Guardado el ${formattedDate}</p>
                `;
            }
            
            savedList.appendChild(savedCard);
        } catch (error) {
            console.error(`Error al obtener elemento guardado ${item.id}:`, error);
        }
    }
}

// Obtener un comentario por su ID
async function fetchCommentById(commentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`No se pudo obtener el comentario con ID ${commentId}`);
        }
        
        const data = await response.json();
        return data.comment;
    } catch (error) {
        console.error(`Error al obtener comentario con ID ${commentId}:`, error);
        throw error;
    }
}

// Configurar eventos para el modal de edición de perfil
function setupModalEvents() {
    // Abrir modal
    editProfileBtn.addEventListener('click', () => {
        // Llenar el formulario con los datos actuales del usuario
        document.getElementById('edit-first-name').value = currentUser.first_name;
        document.getElementById('edit-last-name').value = currentUser.last_name;
        document.getElementById('edit-university').value = currentUser.university || '';
        document.getElementById('edit-bio').value = currentUser.bio || '';
        
        // Mostrar el modal
        editProfileModal.style.display = 'block';
    });
    
    // Cerrar modal
    closeModalBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', (event) => {
        if (event.target === editProfileModal) {
            editProfileModal.style.display = 'none';
        }
    });
    
    // Enviar formulario de edición
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        try {
            const formData = {
                first_name: document.getElementById('edit-first-name').value,
                last_name: document.getElementById('edit-last-name').value,
                university: document.getElementById('edit-university').value,
                bio: document.getElementById('edit-bio').value
            };
            
            await updateUserProfile(formData);
            
            // Actualizar la información del usuario actual
            currentUser = await fetchCurrentUser();
            profileUser = currentUser;
            
            // Actualizar la interfaz
            renderProfileInfo();
            
            // Cerrar el modal
            editProfileModal.style.display = 'none';
            
            // Mostrar mensaje de éxito
            showSuccessMessage('Perfil actualizado correctamente');
        } catch (error) {
            console.error('Error al actualizar el perfil:', error);
            showErrorMessage('No se pudo actualizar el perfil');
        }
    });
}

// Actualizar el perfil del usuario
async function updateUserProfile(profileData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/user/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            throw new Error('No se pudo actualizar el perfil');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        throw error;
    }
}

// Configurar el botón de seguir/dejar de seguir
function setupFollowButton() {
    if (!followBtn || currentUser.id === profileUser.id) return;
    
    // Verificar si el usuario actual ya sigue al usuario del perfil
    const isFollowing = currentUser.following && 
                       currentUser.following.some(id => id === profileUser.id);
    
    // Actualizar el texto del botón
    updateFollowButtonState(isFollowing);
    
    // Agregar evento al botón
    followBtn.addEventListener('click', async () => {
        try {
            const isCurrentlyFollowing = followBtn.classList.contains('following');
            
            const token = localStorage.getItem('token');
            const endpoint = isCurrentlyFollowing ? 'unfollow' : 'follow';
            
            const response = await fetch(`${API_BASE_URL}/user/${endpoint}/${profileUser.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`No se pudo ${isCurrentlyFollowing ? 'dejar de seguir' : 'seguir'} al usuario`);
            }
            
            // Actualizar el estado del botón
            updateFollowButtonState(!isCurrentlyFollowing);
            
            // Actualizar el contador de seguidores
            const followersCount = parseInt(profileFollowersCount.textContent);
            profileFollowersCount.textContent = isCurrentlyFollowing ? 
                followersCount - 1 : followersCount + 1;
            
            // Actualizar la información del usuario actual
            currentUser = await fetchCurrentUser();
        } catch (error) {
            console.error('Error al cambiar estado de seguimiento:', error);
            showErrorMessage(`No se pudo ${isCurrentlyFollowing ? 'dejar de seguir' : 'seguir'} al usuario`);
        }
    });
}

// Actualizar el estado del botón de seguir
function updateFollowButtonState(isFollowing) {
    if (!followBtn) return;
    
    if (isFollowing) {
        followBtn.textContent = 'Dejar de seguir';
        followBtn.classList.add('following');
        followBtn.classList.remove('primary-btn');
        followBtn.classList.add('secondary-btn');
    } else {
        followBtn.textContent = 'Seguir';
        followBtn.classList.remove('following');
        followBtn.classList.add('primary-btn');
        followBtn.classList.remove('secondary-btn');
    }
}

// Funciones de utilidad para mostrar estados
function showLoading(container) {
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Cargando...</p>
        </div>
    `;
}

function showEmptyState(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>${message}</p>
        </div>
    `;
}

function showErrorMessage(message) {
    // Implementar según el diseño de la aplicación
    alert(message);
}

function showSuccessMessage(message) {
    // Implementar según el diseño de la aplicación
    alert(message);
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Agregar evento al botón de cerrar sesión si existe
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}