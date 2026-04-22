// ===== VARIABLES GLOBALES =====
let currentUser = null;
let userProfile = null;
let currentTab = 'posts';
let userDebates = [];    // debates propios
let likedDebates = [];   // debates que le dieron like
let userPolls = [];      // encuestas propias

const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

const INTEREST_COLORS = [
    'pcolor-purple', 'pcolor-blue', 'pcolor-green',
    'pcolor-red', 'pcolor-yellow'
];

const CATEGORY_LABELS = {
    elecciones:  '🗳️ Elecciones',
    reformas:    '📋 Reformas',
    movimientos: '✊ Movimientos',
    general:     '💬 General',
    poll:        '📊 Encuesta'
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    checkAuth();
});

// ===== TEMA (misma clave que dashboard) =====
function initializeTheme() {
    const saved = localStorage.getItem('politic-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('politic-theme', next);
        });
    }
}

// ===== AUTENTICACIÓN =====
async function checkAuth() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) { window.location.href = 'index.html'; return; }
    currentUser = data.session.user;
    await loadProfile();
    await loadAllUserData();
}

// ===== CARGAR PERFIL =====
async function loadProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

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

// ===== CARGAR TODOS LOS DATOS DEL USUARIO EN PARALELO =====
async function loadAllUserData() {
    showTabLoading();
    try {
        // 1. Debates propios
        const { data: debates, error: debErr } = await supabaseClient
            .from('debates')
            .select('id, title, content, category, tags, created_at, upvotes_count, downvotes_count, comments_count')
            .eq('user_id', currentUser.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (debErr) throw debErr;
        userDebates = debates || [];

        // 2. Encuestas propias
        const { data: polls } = await supabaseClient
            .from('polls')
            .select('id, title, description, created_at, total_votes, comments_count')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        userPolls = polls || [];

        // 3. Debates a los que dio like
        const { data: votedRows } = await supabaseClient
            .from('debate_votes')
            .select('debate_id')
            .eq('user_id', currentUser.id)
            .eq('vote_type', 'up');

        const likedIds = (votedRows || []).map(r => r.debate_id);

        if (likedIds.length > 0) {
            const { data: likedData } = await supabaseClient
                .from('debates')
                .select('id, title, content, category, tags, created_at, upvotes_count, downvotes_count, comments_count, user_id, profiles:user_id(full_name)')
                .in('id', likedIds)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            likedDebates = likedData || [];
        } else {
            likedDebates = [];
        }

        // 4. Actividad reciente (votos + debates publicados, ordenados)
        await renderActivity();

        // 5. Stats reales
        renderStats();

        // 6. Renderizar tab activo
        renderTab(currentTab);

    } catch (err) {
        console.error('Error cargando datos:', err);
        showNotification('Error cargando publicaciones', 'error');
        renderTab(currentTab); // mostrar vacío igual
    }
}

// ===== RENDERIZAR PERFIL UI =====
function renderProfileUI() {
    const p = userProfile;

    // Nombre — si no hay full_name usar username
    const displayName = p.full_name || p.username || 'Sin nombre';
    setText('profileName', displayName);
    setText('profileEmail', currentUser.email || '');
    setText('profileBio', p.bio || 'Sin biografía aún.');
    setText('infoUniversity', p.university || 'Universidad no especificada');
    setText('infoCareer', p.career || 'Carrera no especificada');
    setText('infoSemester', p.semester ? `Semestre ${p.semester}` : 'Semestre no especificado');

    const joinDate = new Date(p.created_at || currentUser.created_at || Date.now());
    setText('infoJoinDate', `Miembro desde ${joinDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`);

    // Badge verificado
    const badge = document.getElementById('profileBadge');
    if (badge) {
        badge.textContent = p.is_verified ? '✓ Verificado' : 'Estudiante';
        badge.style.background = p.is_verified ? 'rgba(16,185,129,0.12)' : '';
        badge.style.color = p.is_verified ? '#10b981' : '';
    }

    // Avatar
    const avatarSrc = p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=120`;
    const avatarImg = document.getElementById('profileAvatarImg');
    const navAvatar = document.getElementById('userAvatar');
    if (avatarImg) avatarImg.src = avatarSrc;
    if (navAvatar) navAvatar.src = avatarSrc;

    // Followers / following en stats bar
    const statFollowers = document.getElementById('statFollowers');
    const statFollowing = document.getElementById('statFollowing');
    if (statFollowers) setText('statFollowers', p.followers_count || 0);
    if (statFollowing) setText('statFollowing', p.following_count || 0);

    renderInterests(p.interests || []);
}

// ===== STATS REALES =====
function renderStats() {
    const totalDebates = userProfile.debates_count ?? userDebates.length;
    const totalPolls = userPolls.length;
    const totalPosts = userDebates.length + totalPolls;
    const totalLikes = userDebates.reduce((sum, d) => sum + (d.upvotes_count || 0), 0)
                    + userPolls.reduce((sum, p) => sum + (p.total_votes || 0), 0);
    const totalComments = userDebates.reduce((sum, d) => sum + (d.comments_count || 0), 0)
                        + userPolls.reduce((sum, p) => sum + (p.comments_count || 0), 0);

    setText('statPosts', totalPosts);
    setText('statDebates', totalDebates);
    setText('statLikes', totalLikes);
    setText('statComments', totalComments);
    setText('statFollowers', userProfile.followers_count || 0);
    setText('statFollowing', userProfile.following_count || 0);
}

// ===== ACTIVIDAD RECIENTE REAL =====
async function renderActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;

    const activities = [];

    // Debates publicados → tipo 'post'
    userDebates.slice(0, 3).forEach(d => {
        activities.push({
            type: 'post',
            text: `Publicaste "${d.title}"`,
            time: d.created_at
        });
    });

    // Encuestas creadas → tipo 'poll'
    userPolls.slice(0, 2).forEach(p => {
        activities.push({
            type: 'poll',
            text: `Creaste la encuesta "${p.title}"`,
            time: p.created_at
        });
    });

    // Likes dados → tipo 'like'
    likedDebates.slice(0, 3).forEach(d => {
        activities.push({
            type: 'like',
            text: `Te gustó "${d.title}"`,
            time: d.created_at
        });
    });

    // Ordenar por fecha descendente y tomar los 6 más recientes
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recent = activities.slice(0, 6);

    if (!recent.length) {
        container.innerHTML = '<p class="empty-hint">Sin actividad registrada aún.</p>';
        return;
    }

    container.innerHTML = recent.map(a => `
        <div class="activity-item">
            <div class="activity-dot dot-${a.type === 'like' ? 'like' : a.type === 'poll' ? 'poll' : a.type === 'comment' ? 'comment' : ''}"></div>
            <div>
                <div>${a.text}</div>
                <div style="font-size:0.75rem; color:var(--text-light); margin-top:2px">${getTimeAgo(a.time)}</div>
            </div>
        </div>
    `).join('');
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

// ===== TABS =====
function renderTab(tab) {
    currentTab = tab;
    const container = document.getElementById('tabContent');
    if (!container) return;

    let items = [];
    let emptyMsg = 'Aún no hay publicaciones aquí.';

    if (tab === 'posts') {
        // Todos: debates + encuestas ordenados por fecha
        const debates = userDebates.map(d => ({ ...d, _type: 'debate' }));
        const polls   = userPolls.map(p => ({ ...p, _type: 'poll' }));
        items = [...debates, ...polls].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        emptyMsg = 'Aún no has publicado nada.';
    } else if (tab === 'debates') {
        items = userDebates.map(d => ({ ...d, _type: 'debate' }));
        emptyMsg = 'Aún no has participado en ningún debate.';
    } else if (tab === 'polls') {
        items = userPolls.map(p => ({ ...p, _type: 'poll' }));
        emptyMsg = 'Aún no has creado ninguna encuesta.';
    } else if (tab === 'liked') {
        items = likedDebates.map(d => ({ ...d, _type: 'liked' }));
        emptyMsg = 'Aún no has dado like a ninguna publicación.';
    }

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <p>${emptyMsg}</p>
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => createProfilePostCard(item)).join('');
}

function showTabLoading() {
    const container = document.getElementById('tabContent');
    if (container) container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;gap:1rem;color:var(--text-secondary)">
            <div class="loading-spinner"></div>
            <span>Cargando publicaciones...</span>
        </div>`;
}

// ===== CARD DE POST EN PERFIL =====
function createProfilePostCard(item) {
    const timeAgo = getTimeAgo(item.created_at);
    const isPoll = item._type === 'poll';
    const isLiked = item._type === 'liked';

    const category = isPoll ? 'poll' : (item.category || 'general');
    const categoryLabel = CATEGORY_LABELS[category] || category;

    const likesCount = item.upvotes_count ?? 0;
    const commentsCount = item.comments_count ?? 0;
    const votes = isPoll ? (item.total_votes || 0) : null;

    const tagsHTML = !isPoll && Array.isArray(item.tags) && item.tags.length
        ? `<div class="profile-post-tags">${item.tags.map(t => `<span class="post-tag">#${t}</span>`).join('')}</div>`
        : '';

    const authorNote = isLiked && item.profiles?.full_name
        ? `<span class="liked-author">por ${item.profiles.full_name}</span>`
        : '';

    const statsHTML = isPoll
        ? `<span>📊 ${votes} votos</span><span>💬 ${commentsCount} comentarios</span>`
        : `<span>👍 ${likesCount} likes</span><span>💬 ${commentsCount} comentarios</span>`;

    return `
        <div class="profile-post-card">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap;">
                <span class="post-category ${category}">${categoryLabel}</span>
                ${authorNote}
                <span style="font-size:0.78rem;color:var(--text-light);margin-left:auto;">${timeAgo}</span>
            </div>
            <div class="profile-post-title">${item.title}</div>
            <div class="profile-post-excerpt">${item.content || item.description || ''}</div>
            ${tagsHTML}
            <div class="profile-post-meta">
                ${statsHTML}
            </div>
        </div>`;
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
        username: userProfile.username || currentUser.email?.split('@')[0] || '',
        university: document.getElementById('editUniversity').value.trim(),
        career: document.getElementById('editCareer').value.trim(),
        semester: document.getElementById('editSemester').value,
        bio: document.getElementById('editBio').value.trim(),
        interests,          // columna text[] — agregar con: ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .upsert(updates, { onConflict: 'id' });

        if (error) {
            // Si la columna interests no existe aún, guardar sin ella
            if (error.message.includes('interests')) {
                const { interests: _removed, ...updatesWithout } = updates;
                const { error: err2 } = await supabaseClient
                    .from('profiles')
                    .upsert(updatesWithout, { onConflict: 'id' });
                if (err2) throw err2;
                userProfile = { ...userProfile, ...updatesWithout, interests };
            } else {
                throw error;
            }
        } else {
            userProfile = { ...userProfile, ...updates };
        }

        renderProfileUI();
        closeModal('editProfileModal');
        showNotification('Perfil actualizado ✓', 'success');
    } catch (err) {
        console.error('Error guardando perfil:', err);
        showNotification('Error al guardar el perfil: ' + err.message, 'error');
    } finally {
        btn.textContent = 'Guardar Cambios';
        btn.disabled = false;
    }
}

// ===== CAMBIAR AVATAR =====
async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showNotification('La imagen no debe superar 2MB', 'warning');
        return;
    }

    // Preview inmediato
    const reader = new FileReader();
    reader.onload = (ev) => {
        const src = ev.target.result;
        const avatarImg = document.getElementById('profileAvatarImg');
        const navAvatar = document.getElementById('userAvatar');
        if (avatarImg) avatarImg.src = src;
        if (navAvatar) navAvatar.src = src;
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
        showNotification('Foto de perfil actualizada ✓', 'success');
    } catch (err) {
        console.error('Error subiendo avatar:', err);
        showNotification('Error subiendo la foto: ' + err.message, 'error');
    }
}

// ===== MODAL: EDITAR PERFIL =====
function openEditModal() {
    if (!userProfile) return;

    setValue('editName', userProfile.full_name || '');
    setValue('editUniversity', userProfile.university || '');
    setValue('editCareer', userProfile.career || '');
    setValue('editSemester', userProfile.semester || '');
    setValue('editBio', userProfile.bio || '');

    const interests = userProfile.interests || [];
    document.querySelectorAll('#interestsPicker input').forEach(cb => {
        cb.checked = interests.includes(cb.value);
    });

    openModal('editProfileModal');
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // User dropdown
    const userAvatarNav = document.getElementById('userAvatarNav');
    const dropdown = document.getElementById('userDropdown');
    if (userAvatarNav && dropdown) {
        userAvatarNav.addEventListener('click', (e) => {
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

    // Tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderTab(tab.dataset.tab);
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

// ===== MODAL HELPERS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = 'auto'; }
}

// ===== UTILIDADES =====
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)} días`;
    return time.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
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