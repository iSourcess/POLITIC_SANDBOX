// ===== VARIABLES GLOBALES =====
let currentUser = null;
let userProfile = null;
let currentTab = 'posts';
let userPosts = [];

const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

const INTEREST_COLORS = [
    'pcolor-purple', 'pcolor-blue', 'pcolor-green',
    'pcolor-red', 'pcolor-yellow'
];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    checkAuth();
});

// ===== TEMA =====
function initializeTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
}

// ===== AUTENTICACIÓN =====
async function checkAuth() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = data.session.user;
    await loadProfile();
    loadMockPosts();
    renderTab('posts');
}

// ===== CARGAR PERFIL DESDE SUPABASE =====
async function loadProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        // Si no existe el perfil, crear uno vacío
        userProfile = data || {
            id: currentUser.id,
            full_name: currentUser.email?.split('@')[0] || 'Usuario',
            email: currentUser.email,
            bio: '',
            university: '',
            career: '',
            semester: '',
            interests: [],
            avatar_url: null,
            created_at: currentUser.created_at
        };

        renderProfileUI();
    } catch (err) {
        console.error('Error cargando perfil:', err);
        showNotification('Error cargando perfil', 'error');
    }
}

// ===== RENDERIZAR INTERFAZ DEL PERFIL =====
function renderProfileUI() {
    const p = userProfile;

    // Nombre y email
    setText('profileName', p.full_name || 'Sin nombre');
    setText('profileEmail', currentUser.email || '');
    setText('profileBio', p.bio || 'Sin biografía aún.');

    // Info lateral
    setText('infoUniversity', p.university || 'Universidad no especificada');
    setText('infoCareer', p.career || 'Carrera no especificada');
    setText('infoSemester', p.semester ? `Semestre ${p.semester}` : 'Semestre no especificado');

    const joinDate = new Date(p.created_at || Date.now());
    setText('infoJoinDate', `Miembro desde ${joinDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`);

    // Avatar
    const avatarImg = document.getElementById('profileAvatarImg');
    const navAvatar = document.getElementById('userAvatar');
    if (p.avatar_url) {
        if (avatarImg) avatarImg.src = p.avatar_url;
        if (navAvatar) navAvatar.src = p.avatar_url;
    }

    // Intereses
    renderInterests(p.interests || []);

    // Actividad reciente (mock)
    renderActivity();

    // Stats (mock, reemplaza con datos reales de tu BD)
    setStats({ posts: 7, debates: 3, likes: 42, comments: 18 });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setStats({ posts, debates, likes, comments }) {
    setText('statPosts', posts);
    setText('statDebates', debates);
    setText('statLikes', likes);
    setText('statComments', comments);
}

// ===== INTERESES =====
function renderInterests(interests) {
    const container = document.getElementById('profileInterests');
    if (!container) return;

    if (!interests.length) {
        container.innerHTML = '<span class="topic-tag pcolor-gray">Sin intereses aún</span>';
        return;
    }

    container.innerHTML = interests.map((interest, i) => {
        const colorClass = INTEREST_COLORS[i % INTEREST_COLORS.length];
        return `<span class="topic-tag ${colorClass}">${interest}</span>`;
    }).join('');
}

// ===== ACTIVIDAD RECIENTE (mock) =====
function renderActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;

    const activities = [
        { type: 'post', text: 'Publicaste un debate sobre becas', time: 'Hace 2 horas' },
        { type: 'like', text: 'Te gustó una publicación de Ana García', time: 'Hace 5 horas' },
        { type: 'comment', text: 'Comentaste en "Reforma universitaria"', time: 'Hace 1 día' },
        { type: 'poll', text: 'Votaste en una encuesta', time: 'Hace 2 días' },
    ];

    container.innerHTML = activities.map(a => `
        <div class="activity-item">
            <div class="activity-dot dot-${a.type === 'like' ? 'like' : a.type === 'comment' ? 'comment' : a.type === 'poll' ? 'poll' : ''}"></div>
            <div>
                <div>${a.text}</div>
                <div style="font-size:0.75rem; color:var(--text-light); margin-top:2px">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// ===== TABS DEL FEED =====
function initializeEventListeners() {
    // Theme toggle ya en initializeTheme()

    // User dropdown
    const userAvatar = document.getElementById('userAvatarNav');
    const dropdown = document.getElementById('userDropdown');
    if (userAvatar && dropdown) {
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => dropdown.classList.remove('active'));
    }

    // Logout
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Tabs de perfil
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            renderTab(currentTab);
        });
    });

    // Formulario editar perfil
    const editForm = document.getElementById('editProfileForm');
    if (editForm) editForm.addEventListener('submit', handleSaveProfile);

    // Avatar upload
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) avatarInput.addEventListener('change', handleAvatarChange);

    // Cerrar modales al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal(e.target.id);
    });
}

// ===== RENDER DE TABS =====
function renderTab(tab) {
    const container = document.getElementById('tabContent');
    if (!container) return;

    const filtered = filterPostsByTab(tab);

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <p>Aún no hay publicaciones aquí.</p>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(post => createProfilePostCard(post)).join('');
}

function filterPostsByTab(tab) {
    if (tab === 'all' || tab === 'posts') return userPosts;
    if (tab === 'debates') return userPosts.filter(p => p.category === 'debate');
    if (tab === 'polls') return userPosts.filter(p => p.type === 'poll');
    if (tab === 'liked') return userPosts.filter(p => p.liked);
    return userPosts;
}

function createProfilePostCard(post) {
    const timeAgo = getTimeAgo(post.timestamp);
    return `
        <div class="profile-post-card">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                <span class="post-category ${post.category || 'general'}">${getCategoryLabel(post.category)}</span>
                <span style="font-size:0.78rem; color:var(--text-light); margin-left:auto;">${timeAgo}</span>
            </div>
            <div class="profile-post-title">${post.title}</div>
            <div class="profile-post-excerpt">${post.content}</div>
            <div class="profile-post-meta">
                <span>
                    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    ${post.likes} likes
                </span>
                <span>
                    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    ${post.comments} comentarios
                </span>
            </div>
        </div>
    `;
}

// ===== GUARDAR PERFIL =====
async function handleSaveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProfileBtn');
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    const interests = [...document.querySelectorAll('#interestsPicker input:checked')]
        .map(cb => cb.value);

    const updates = {
        id: currentUser.id,
        full_name: document.getElementById('editName').value.trim(),
        university: document.getElementById('editUniversity').value.trim(),
        career: document.getElementById('editCareer').value.trim(),
        semester: document.getElementById('editSemester').value,
        bio: document.getElementById('editBio').value.trim(),
        interests,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .upsert(updates, { onConflict: 'id' });

        if (error) throw error;

        userProfile = { ...userProfile, ...updates };
        renderProfileUI();
        closeModal('editProfileModal');
        showNotification('Perfil actualizado correctamente', 'success');
    } catch (err) {
        console.error('Error guardando perfil:', err);
        showNotification('Error al guardar el perfil', 'error');
    } finally {
        btn.textContent = 'Guardar Cambios';
        btn.disabled = false;
    }
}

// ===== CAMBIAR AVATAR =====
async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        showNotification('La imagen no debe superar 2MB', 'warning');
        return;
    }

    // Preview inmediato
    const reader = new FileReader();
    reader.onload = (ev) => {
        const src = ev.target.result;
        document.getElementById('profileAvatarImg').src = src;
        document.getElementById('userAvatar').src = src;
    };
    reader.readAsDataURL(file);

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${currentUser.id}.${fileExt}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const avatarUrl = urlData.publicUrl;

        await supabaseClient
            .from('profiles')
            .upsert({ id: currentUser.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });

        userProfile.avatar_url = avatarUrl;
        showNotification('Foto de perfil actualizada', 'success');
    } catch (err) {
        console.error('Error subiendo avatar:', err);
        showNotification('Error subiendo la foto', 'error');
    }
}

// ===== MODAL: EDITAR PERFIL =====
function openEditModal() {
    if (!userProfile) return;

    // Rellenar el formulario con datos actuales
    setValue('editName', userProfile.full_name || '');
    setValue('editUniversity', userProfile.university || '');
    setValue('editCareer', userProfile.career || '');
    setValue('editSemester', userProfile.semester || '');
    setValue('editBio', userProfile.bio || '');

    // Intereses
    const interests = userProfile.interests || [];
    document.querySelectorAll('#interestsPicker input').forEach(cb => {
        cb.checked = interests.includes(cb.value);
    });

    openModal('editProfileModal');
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// ===== MODAL HELPERS =====
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
    }
}

// ===== DATOS MOCK DE POSTS =====
function loadMockPosts() {
    userPosts = [
        {
            id: 1,
            type: 'post',
            category: 'debate',
            title: '¿Deberían las universidades públicas ser completamente gratuitas?',
            content: 'He estado pensando sobre el acceso a la educación superior y me parece que eliminar completamente las cuotas podría beneficiar a más estudiantes...',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            likes: 15,
            comments: 8,
            liked: false
        },
        {
            id: 2,
            type: 'post',
            category: 'proposal',
            title: 'Propuesta: Transporte universitario gratuito en horarios nocturnos',
            content: 'Muchos estudiantes terminan clases tarde y no tienen transporte seguro. Propongo gestionar un convenio con el municipio...',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            likes: 22,
            comments: 5,
            liked: true
        },
        {
            id: 3,
            type: 'poll',
            category: 'poll',
            title: '¿Cuál es el principal problema del campus que debería resolverse?',
            content: 'Selecciona la opción que consideres más urgente para mejorar la vida universitaria.',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            likes: 9,
            comments: 2,
            liked: false
        }
    ];
}

// ===== UTILIDADES =====
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return time.toLocaleDateString();
}

function getCategoryLabel(category) {
    const labels = {
        debate: 'Debate', announcement: 'Anuncio',
        question: 'Pregunta', proposal: 'Propuesta', poll: 'Encuesta', general: 'General'
    };
    return labels[category] || category || 'General';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}
