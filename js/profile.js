// ===== VARIABLES GLOBALES =====
let currentUser = null;
let userProfile = null;         // perfil que se está mostrando
let viewedUserId = null;        // ID del usuario cuyo perfil se ve
let isOwnProfile = true;        // ¿estoy viendo mi propio perfil?
let isFollowing = false;
let currentTab = 'posts';
let userDebates = [];
let likedDebates = [];
let userPolls = [];
let userPartyData = null;       // datos del partido del perfil visualizado
let loggedInLeaderParty = null; // partido que lidera el usuario actual (para reclutar)

const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

const INTEREST_COLORS = ['pcolor-purple', 'pcolor-blue', 'pcolor-green', 'pcolor-red', 'pcolor-yellow'];

const CATEGORY_LABELS = {
    elecciones:  '🗳️ Elecciones',
    reformas:    '📋 Reformas',
    movimientos: '✊ Movimientos',
    general:     '💬 General',
    poll:        '📊 Encuesta'
};

const PARTY_AREA_LABELS = {
    biomedicas:  { label: '🔬 Biomédicas', color: '#10b981' },
    ingenierias: { label: '⚙️ Ingenierías', color: '#6366f1' },
    sociales:    { label: '🏛️ Sociales', color: '#f59e0b' }
};

const PARTY_ROLE_LABELS = {
    leader:         '👑 Líder',
    representative: '🏛️ Representante',
    member:         '✓ Miembro'
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    checkAuth();
});

// ===== TEMA =====
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

    // Determinar qué perfil cargar
    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get('user');
    const idParam = params.get('id');

    if (usernameParam || idParam) {
        // Perfil ajeno
        isOwnProfile = false;
        await loadPublicProfile(usernameParam, idParam);
    } else {
        // Perfil propio
        isOwnProfile = true;
        viewedUserId = currentUser.id;
        await loadProfile();
        await loadAllUserData();
    }
}

// ===== CARGAR PERFIL PROPIO =====
async function loadProfile() {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (error) {
            console.warn('Advertencia al consultar profile:', error);
        }

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
            created_at: currentUser.created_at,
            followers_count: 0,
            following_count: 0
        };

        setupOwnProfileUI();
        try {
            await loadUserPartyInfo(userProfile.id, userProfile.party_id);
        } catch (e) {
            console.warn('Error resolviendo partido propio:', e);
        }
        renderProfileUI();
    } catch (err) {
        console.error('Error cargando perfil:', err);
        showNotification('Error cargando perfil', 'error');
    }
}

// ===== CARGAR PERFIL PÚBLICO (AJENO) =====
async function loadPublicProfile(username, userId) {
    try {
        showTabLoading();
        let query = supabaseClient.from('profiles').select('*');

        if (userId) {
            query = query.eq('id', userId);
        } else if (username) {
            query = query.eq('username', username);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            showNotification('Perfil no encontrado', 'error');
            setTimeout(() => window.location.href = 'dashboard.html', 2000);
            return;
        }

        userProfile = data;
        viewedUserId = data.id;

        // Si es el mismo usuario, redirigir a perfil propio
        if (data.id === currentUser.id) {
            window.location.href = 'profile.html';
            return;
        }

        setupGuestProfileUI();
        await loadUserPartyInfo(userProfile.id, userProfile.party_id);
        await checkRecruitEligibility();
        renderProfileUI();

        // Cargar datos del usuario ajeno
        await Promise.all([
            loadPublicUserData(),
            checkIsFollowing()
        ]);
    } catch (err) {
        console.error('Error cargando perfil público:', err);
        showNotification('Error cargando el perfil', 'error');
    }
}

// ===== CONFIGURAR UI — PERFIL PROPIO =====
function setupOwnProfileUI() {
    // Mostrar botón editar, ocultar seguir
    const editBtn = document.getElementById('editProfileBtn');
    const followBtn = document.getElementById('followBtn');
    const avatarEditBtn = document.getElementById('avatarEditBtn');
    if (editBtn) editBtn.style.display = 'flex';
    if (followBtn) followBtn.style.display = 'none';
    if (avatarEditBtn) avatarEditBtn.style.display = 'flex';

    // Mostrar tab "Me gusta"
    const tabLiked = document.getElementById('tabLiked');
    if (tabLiked) tabLiked.style.display = '';
}

// ===== CONFIGURAR UI — PERFIL AJENO =====
function setupGuestProfileUI() {
    // Ocultar botón editar, mostrar seguir
    const editBtn = document.getElementById('editProfileBtn');
    const followBtn = document.getElementById('followBtn');
    const avatarEditBtn = document.getElementById('avatarEditBtn');
    if (editBtn) editBtn.style.display = 'none';
    if (followBtn) followBtn.style.display = 'flex';
    if (avatarEditBtn) avatarEditBtn.style.display = 'none';

    // Ocultar tab "Me gusta" en perfil ajeno
    const tabLiked = document.getElementById('tabLiked');
    if (tabLiked) tabLiked.style.display = 'none';

    // Actualizar título de página
    document.title = `POLITIC-SANDBOX - Perfil de ${userProfile.full_name || userProfile.username}`;
}

// ===== RENDERIZAR PERFIL UI =====
function renderProfileUI() {
    const p = userProfile;
    const displayName = p.full_name || p.username || 'Sin nombre';

    setText('profileName', displayName);
    setText('profileUsername', p.username ? `@${p.username}` : '');
    setText('profileBio', p.bio || 'Sin biografía aún.');
    setText('infoUniversity', p.university || 'Universidad no especificada');
    setText('infoCareer', p.career || 'Carrera no especificada');
    setText('infoSemester', p.semester ? `Semestre ${p.semester}` : 'Semestre no especificado');

    const joinDate = new Date(p.created_at || Date.now());
    setText('infoJoinDate', `Miembro desde ${joinDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`);

    // Badge rol
    const badge = document.getElementById('profileBadge');
    if (badge) {
        const roleLabel = PARTY_ROLE_LABELS[p.party_role] || 'Estudiante';
        if (p.party_role && p.party_role !== 'none' && p.party_role !== 'member') {
            badge.textContent = roleLabel;
            badge.style.background = 'rgba(245,158,11,0.15)';
            badge.style.color = '#f59e0b';
        } else {
            badge.textContent = 'Estudiante';
        }
    }

    // Badge de partido
    renderPartyBadge(p);

    // Avatar
    const avatarSrc = p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=120`;
    const avatarImg = document.getElementById('profileAvatarImg');
    const navAvatar = document.getElementById('userAvatar');
    if (avatarImg) avatarImg.src = avatarSrc;
    if (navAvatar) navAvatar.src = avatarSrc;

    // Seguidores/Siguiendo
    setText('statFollowers', formatCount(p.followers_count || 0));
    setText('statFollowing', formatCount(p.following_count || 0));

    renderInterests(p.interests || []);
    renderPartySidebar(p);
}

function renderPartyBadge(p) {
    const partyBadge = document.getElementById('partyBadge');
    if (!partyBadge) return;

    // Si no tiene partido confirmado o el rol es 'none', ocultar por completo
    if (!userPartyData || !p.party_role || p.party_role === 'none') {
        partyBadge.style.display = 'none';
        return;
    }

    const area = userPartyData.area || p.party_area;
    const areaInfo = PARTY_AREA_LABELS[area] || { label: '🏛️ ' + userPartyData.name, color: '#6366f1' };
    const roleLabel = PARTY_ROLE_LABELS[p.party_role] || 'Miembro';

    partyBadge.textContent = `${userPartyData.name} · ${roleLabel}`;
    partyBadge.style.display = 'inline-flex';
    partyBadge.style.background = `${areaInfo.color}22`;
    partyBadge.style.color = areaInfo.color;
}

function renderPartySidebar(p) {
    const partySection = document.getElementById('partySection');
    const partyCardMini = document.getElementById('partyCardMini');
    if (!partySection || !partyCardMini) return;

    // SI NO PERTENECE A NINGÚN PARTIDO: NO DECIR NADA (ocultar sección completamente)
    if (!userPartyData || !p.party_role || p.party_role === 'none') {
        partySection.style.display = 'none';
        partyCardMini.innerHTML = '';
        return;
    }

    // SI PERTENECE A UN PARTIDO: MOSTRAR INFORMACIÓN Y ENLACE A PARTIDOS
    partySection.style.display = '';
    const area = userPartyData.area || p.party_area;
    const areaInfo = PARTY_AREA_LABELS[area] || { label: '🏛️ Partido', color: '#6366f1' };
    const roleLabel = PARTY_ROLE_LABELS[p.party_role] || 'Miembro';
    const areaEmoji = areaInfo.label.split(' ')[0] || '🏛️';

    partyCardMini.innerHTML = `
        <a href="parties.html" style="text-decoration:none;display:block;">
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem;background:var(--bg-secondary);border-radius:12px;border:1.5px solid var(--border);transition:all 0.2s ease;cursor:pointer;"
                 onmouseover="this.style.borderColor='${areaInfo.color}';this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.borderColor='var(--border)';this.style.transform='none'">
                <div style="font-size:2rem;line-height:1">${areaEmoji}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.92rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(userPartyData.name)}</div>
                    <div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.2rem;flex-wrap:wrap;">
                        <span style="font-size:0.75rem;color:${areaInfo.color};font-weight:600">${areaInfo.label}</span>
                        <span style="font-size:0.72rem;background:${areaInfo.color}18;color:${areaInfo.color};padding:2px 7px;border-radius:20px;font-weight:600">${roleLabel}</span>
                    </div>
                </div>
                <div style="color:var(--text-secondary);font-size:1.2rem;font-weight:bold;">›</div>
            </div>
        </a>`;
}

// ===== CARGAR INFORMACIÓN DE PARTIDO DEL USUARIO =====
async function loadUserPartyInfo(userId, partyId) {
    userPartyData = null;
    try {
        if (partyId) {
            const { data } = await supabaseClient
                .from('parties')
                .select('*')
                .eq('id', partyId)
                .maybeSingle();
            if (data) {
                userPartyData = data;
                return;
            }
        }
        if (!userPartyData && userId) {
            const { data: memberRec } = await supabaseClient
                .from('party_members')
                .select('party_id, role')
                .eq('user_id', userId)
                .eq('status', 'approved')
                .maybeSingle();
            if (memberRec && memberRec.party_id) {
                const { data: pData } = await supabaseClient
                    .from('parties')
                    .select('*')
                    .eq('id', memberRec.party_id)
                    .maybeSingle();
                if (pData) {
                    userPartyData = pData;
                    if (!userProfile.party_role || userProfile.party_role === 'none') {
                        userProfile.party_role = memberRec.role;
                    }
                }
            }
        }
    } catch (err) {
        console.warn('Error resolviendo partido:', err);
    }
}

// ===== VERIFICAR SI EL VISITANTE PUEDE RECLUTAR A ESTE USUARIO =====
async function checkRecruitEligibility() {
    loggedInLeaderParty = null;
    const recruitBtn = document.getElementById('recruitBtn');
    if (!recruitBtn) return;
    recruitBtn.style.display = 'none';

    if (isOwnProfile || userPartyData || !currentUser) return;

    try {
        // ¿El usuario logueado es líder de algún partido?
        const { data: leadParty } = await supabaseClient
            .from('parties')
            .select('*')
            .eq('leader_id', currentUser.id)
            .maybeSingle();

        if (leadParty) {
            loggedInLeaderParty = leadParty;
            recruitBtn.innerHTML = `🏛️ Reclutar a ${escapeHtml(leadParty.name)}`;
            recruitBtn.style.display = 'inline-flex';
            return;
        }

        // O representante
        const { data: memberRole } = await supabaseClient
            .from('party_members')
            .select('party_id, role')
            .eq('user_id', currentUser.id)
            .in('role', ['leader', 'representative'])
            .eq('status', 'approved')
            .maybeSingle();

        if (memberRole && memberRole.party_id) {
            const { data: pData } = await supabaseClient
                .from('parties')
                .select('*')
                .eq('id', memberRole.party_id)
                .maybeSingle();
            if (pData) {
                loggedInLeaderParty = pData;
                recruitBtn.innerHTML = `🏛️ Reclutar a ${escapeHtml(pData.name)}`;
                recruitBtn.style.display = 'inline-flex';
            }
        }
    } catch (err) {
        console.warn('Error verificando estatus de reclutamiento:', err);
    }
}

// ===== ACCIÓN DE RECLUTAR DIRECTO DESDE EL PERFIL =====
async function recruitCurrentStudent() {
    if (!loggedInLeaderParty || !userProfile) return;
    const studentName = userProfile.full_name || userProfile.username || 'este estudiante';
    if (!confirm(`¿Deseas reclutar a ${studentName} para integrarse directamente a tu partido "${loggedInLeaderParty.name}"?`)) {
        return;
    }

    try {
        const { error: insertErr } = await supabaseClient.from('party_members').insert({
            party_id: loggedInLeaderParty.id,
            user_id: userProfile.id,
            career: userProfile.career || 'Estudiante',
            role: 'member',
            status: 'approved'
        });

        if (insertErr) {
            if (insertErr.code === '23505') {
                showNotification(`${studentName} ya tiene una membresía o solicitud activa`, 'warning');
                return;
            }
            throw insertErr;
        }

        // Intentar actualizar columna party_id en profiles
        await supabaseClient.from('profiles').update({
            party_id: loggedInLeaderParty.id,
            party_role: 'member'
        }).eq('id', userProfile.id);

        userProfile.party_id = loggedInLeaderParty.id;
        userProfile.party_role = 'member';
        userPartyData = loggedInLeaderParty;

        showNotification(`🎉 ¡${studentName} ha sido incorporado a ${loggedInLeaderParty.name}!`, 'success');

        renderPartyBadge(userProfile);
        renderPartySidebar(userProfile);
        const recruitBtn = document.getElementById('recruitBtn');
        if (recruitBtn) recruitBtn.style.display = 'none';

    } catch (err) {
        console.error('Error reclutando estudiante:', err);
        showNotification('Error al reclutar: ' + err.message, 'error');
    }
}

// ===== CARGAR TODOS LOS DATOS DEL USUARIO PROPIO =====
async function loadAllUserData() {
    showTabLoading();
    try {
        const [debatesRes, pollsRes, votedRes] = await Promise.all([
            supabaseClient.from('debates')
                .select('id, title, content, category, tags, created_at, upvotes_count, downvotes_count, comments_count')
                .eq('user_id', currentUser.id).eq('is_deleted', false)
                .order('created_at', { ascending: false }),
            supabaseClient.from('polls')
                .select('id, title, description, created_at, total_votes, comments_count')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false }),
            supabaseClient.from('debate_votes')
                .select('debate_id').eq('user_id', currentUser.id).eq('vote_type', 'up')
        ]);

        userDebates = debatesRes.data || [];
        userPolls = pollsRes.data || [];

        const likedIds = (votedRes.data || []).map(r => r.debate_id);
        if (likedIds.length > 0) {
            const { data: likedData } = await supabaseClient
                .from('debates')
                .select('id, title, content, category, tags, created_at, upvotes_count, downvotes_count, comments_count, user_id, profiles:user_id(full_name, username)')
                .in('id', likedIds).eq('is_deleted', false)
                .order('created_at', { ascending: false });
            likedDebates = likedData || [];
        } else {
            likedDebates = [];
        }

        await renderActivity();
        renderStats();
        renderTab(currentTab);

    } catch (err) {
        console.error('Error cargando datos:', err);
        showNotification('Error cargando publicaciones', 'error');
        renderTab(currentTab);
    }
}

// ===== CARGAR DATOS DE USUARIO AJENO =====
async function loadPublicUserData() {
    showTabLoading();
    try {
        const [debatesRes, pollsRes] = await Promise.all([
            supabaseClient.from('debates')
                .select('id, title, content, category, tags, created_at, upvotes_count, downvotes_count, comments_count')
                .eq('user_id', viewedUserId).eq('is_deleted', false)
                .order('created_at', { ascending: false }),
            supabaseClient.from('polls')
                .select('id, title, description, created_at, total_votes, comments_count')
                .eq('user_id', viewedUserId)
                .order('created_at', { ascending: false })
        ]);

        userDebates = debatesRes.data || [];
        userPolls = pollsRes.data || [];
        likedDebates = [];

        renderStats();
        renderTab(currentTab);
    } catch (err) {
        console.error('Error cargando datos del usuario:', err);
        renderTab(currentTab);
    }
}

// ===== SISTEMA DE SEGUIMIENTO =====
async function checkIsFollowing() {
    if (!currentUser || !viewedUserId) return;
    try {
        const { data } = await supabaseClient
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', viewedUserId)
            .single();

        isFollowing = !!data;
        updateFollowButton();
    } catch {
        isFollowing = false;
        updateFollowButton();
    }
}

function updateFollowButton() {
    const btn = document.getElementById('followBtn');
    const btnText = document.getElementById('followBtnText');
    const icon = document.getElementById('followIcon');
    if (!btn) return;

    if (isFollowing) {
        btn.classList.add('following');
        if (btnText) btnText.textContent = 'Siguiendo';
        if (icon) icon.innerHTML = `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>`;
    } else {
        btn.classList.remove('following');
        if (btnText) btnText.textContent = 'Seguir';
        if (icon) icon.innerHTML = `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>`;
    }
}

async function toggleFollow() {
    if (!currentUser || !viewedUserId) return;
    const btn = document.getElementById('followBtn');
    if (btn) btn.disabled = true;

    try {
        if (isFollowing) {
            // Dejar de seguir
            await supabaseClient.from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', viewedUserId);

            // Actualizar contadores
            await Promise.all([
                supabaseClient.from('profiles').update({ followers_count: Math.max(0, (userProfile.followers_count || 1) - 1) }).eq('id', viewedUserId),
                supabaseClient.from('profiles').update({ following_count: Math.max(0, (await getMyFollowingCount()) - 1) }).eq('id', currentUser.id)
            ]);

            userProfile.followers_count = Math.max(0, (userProfile.followers_count || 1) - 1);
            isFollowing = false;
            showNotification('Has dejado de seguir a este usuario', 'info');
        } else {
            // Seguir
            await supabaseClient.from('follows').insert({
                follower_id: currentUser.id,
                following_id: viewedUserId
            });

            // Actualizar contadores
            await Promise.all([
                supabaseClient.from('profiles').update({ followers_count: (userProfile.followers_count || 0) + 1 }).eq('id', viewedUserId),
                supabaseClient.from('profiles').update({ following_count: (await getMyFollowingCount()) + 1 }).eq('id', currentUser.id)
            ]);

            userProfile.followers_count = (userProfile.followers_count || 0) + 1;
            isFollowing = true;
            showNotification('¡Ahora sigues a este usuario! 🎉', 'success');
        }

        setText('statFollowers', formatCount(userProfile.followers_count || 0));
        updateFollowButton();
    } catch (err) {
        console.error('Error toggle follow:', err);
        showNotification('Error al actualizar el seguimiento', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function getMyFollowingCount() {
    const { data } = await supabaseClient.from('profiles').select('following_count').eq('id', currentUser.id).single();
    return data?.following_count || 0;
}

// ===== MODAL SEGUIDORES / SIGUIENDO =====
async function openFollowersModal(type) {
    const modal = document.getElementById('followersModal');
    const title = document.getElementById('followersModalTitle');
    const body = document.getElementById('followersModalBody');
    if (!modal) return;

    title.textContent = type === 'followers' ? 'Seguidores' : 'Siguiendo';
    body.innerHTML = '<div class="loading-spinner" style="margin:2rem auto;display:block"></div>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        let users = [];
        if (type === 'followers') {
            const { data } = await supabaseClient
                .from('follows')
                .select('follower:follower_id(id, full_name, username, avatar_url, party_role, party_area)')
                .eq('following_id', viewedUserId);
            users = (data || []).map(r => r.follower);
        } else {
            const { data } = await supabaseClient
                .from('follows')
                .select('following:following_id(id, full_name, username, avatar_url, party_role, party_area)')
                .eq('follower_id', viewedUserId);
            users = (data || []).map(r => r.following);
        }

        if (!users.length) {
            body.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:2rem">
                ${type === 'followers' ? 'Nadie sigue a este usuario todavía.' : 'Este usuario no sigue a nadie aún.'}
            </p>`;
            return;
        }

        body.innerHTML = users.map(u => {
            const name = u.full_name || u.username || 'Usuario';
            const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=40`;
            const roleLabel = u.party_role && u.party_role !== 'none' ? `<span style="font-size:0.72rem;color:#f59e0b">${PARTY_ROLE_LABELS[u.party_role] || ''}</span>` : '';
            return `
                <a href="profile.html?id=${u.id}" class="follower-item" onclick="closeModal('followersModal')">
                    <img src="${avatar}" alt="${name}" class="follower-avatar">
                    <div>
                        <div style="font-weight:600;font-size:0.9rem">${name}</div>
                        <div style="font-size:0.78rem;color:var(--text-secondary)">@${u.username || 'usuario'} ${roleLabel}</div>
                    </div>
                </a>`;
        }).join('');
    } catch (err) {
        body.innerHTML = '<p style="color:var(--danger);text-align:center;padding:2rem">Error cargando usuarios</p>';
    }
}

// ===== ESTADÍSTICAS DE POSTS =====
async function openPostStats(postId, postType) {
    const drawer = document.getElementById('statsDrawer');
    const overlay = document.getElementById('statsDrawerOverlay');
    const body = document.getElementById('statsDrawerBody');
    if (!drawer) return;

    body.innerHTML = '<div class="loading-spinner" style="margin:3rem auto;display:block"></div>';
    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        let postData = null;

        if (postType === 'poll') {
            const { data } = await supabaseClient.from('polls').select('*').eq('id', postId).single();
            postData = data;
        } else {
            const { data } = await supabaseClient.from('debates').select('*').eq('id', postId).single();
            postData = data;
        }

        if (!postData) {
            body.innerHTML = '<p style="color:var(--danger);text-align:center;padding:2rem">Error cargando estadísticas</p>';
            return;
        }

        const likes = postData.upvotes_count || 0;
        const comments = postData.comments_count || 0;
        const votes = postData.total_votes || 0;
        const followers = userProfile?.followers_count || 0;

        // Alcance estimado = seguidores del autor + interacciones únicas estimadas
        const estimatedReach = Math.max(followers + likes + comments, likes + comments);
        const engagement = estimatedReach > 0 ? Math.min(100, Math.round(((likes + comments) / Math.max(estimatedReach, 1)) * 100)) : 0;

        const maxVal = Math.max(likes, comments, votes, 1);

        body.innerHTML = `
            <div class="stats-post-title">${postData.title}</div>
            <div class="stats-meta">${getTimeAgo(postData.created_at)} · ${postType === 'poll' ? '📊 Encuesta' : '💬 Debate'}</div>

            <div class="stats-grid">
                <div class="stat-card stat-card-purple">
                    <div class="stat-card-icon">👥</div>
                    <div class="stat-card-number">${formatCount(estimatedReach)}</div>
                    <div class="stat-card-label">Alcance estimado</div>
                </div>
                <div class="stat-card stat-card-red">
                    <div class="stat-card-icon">❤️</div>
                    <div class="stat-card-number">${formatCount(likes)}</div>
                    <div class="stat-card-label">Likes</div>
                </div>
                <div class="stat-card stat-card-blue">
                    <div class="stat-card-icon">💬</div>
                    <div class="stat-card-number">${formatCount(comments)}</div>
                    <div class="stat-card-label">Comentarios</div>
                </div>
                ${postType === 'poll' ? `
                <div class="stat-card stat-card-green">
                    <div class="stat-card-icon">🗳️</div>
                    <div class="stat-card-number">${formatCount(votes)}</div>
                    <div class="stat-card-label">Votos</div>
                </div>` : ''}
            </div>

            <div class="stats-bars">
                <h4>Desglose de interacciones</h4>
                <div class="stat-bar-item">
                    <span class="stat-bar-label">❤️ Likes</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill stat-bar-red" style="width:${(likes/maxVal)*100}%"></div>
                    </div>
                    <span class="stat-bar-value">${likes}</span>
                </div>
                <div class="stat-bar-item">
                    <span class="stat-bar-label">💬 Comentarios</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill stat-bar-blue" style="width:${(comments/maxVal)*100}%"></div>
                    </div>
                    <span class="stat-bar-value">${comments}</span>
                </div>
                ${postType === 'poll' ? `
                <div class="stat-bar-item">
                    <span class="stat-bar-label">🗳️ Votos</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill stat-bar-green" style="width:${(votes/maxVal)*100}%"></div>
                    </div>
                    <span class="stat-bar-value">${votes}</span>
                </div>` : ''}
            </div>

            <div class="stats-engagement">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
                    <span style="font-weight:600">Nivel de engagement</span>
                    <span style="font-weight:700;color:var(--primary)">${engagement}%</span>
                </div>
                <div class="engagement-track">
                    <div class="engagement-fill" style="width:${engagement}%"></div>
                </div>
                <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.5rem">
                    ${engagement >= 70 ? '🔥 ¡Excelente! Tu publicación tiene alto impacto.' :
                      engagement >= 40 ? '✅ Buen engagement. Sigue así.' :
                      '💡 Interacción moderada. Intenta usar más etiquetas o preguntas directas.'}
                </p>
            </div>`;
    } catch (err) {
        console.error('Error stats:', err);
        body.innerHTML = '<p style="color:var(--danger);text-align:center;padding:2rem">Error cargando estadísticas</p>';
    }
}

function closeStatsDrawer() {
    const drawer = document.getElementById('statsDrawer');
    const overlay = document.getElementById('statsDrawerOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ===== STATS REALES =====
function renderStats() {
    const totalPolls = userPolls.length;
    const totalPosts = userDebates.length + totalPolls;
    const totalLikes = userDebates.reduce((s, d) => s + (d.upvotes_count || 0), 0)
                    + userPolls.reduce((s, p) => s + (p.total_votes || 0), 0);

    setText('statPosts', totalPosts);
    setText('statDebates', userDebates.length);
    setText('statLikes', formatCount(totalLikes));
    setText('statFollowers', formatCount(userProfile?.followers_count || 0));
    setText('statFollowing', formatCount(userProfile?.following_count || 0));
}

// ===== ACTIVIDAD RECIENTE =====
async function renderActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;

    const activities = [];
    userDebates.slice(0, 3).forEach(d => activities.push({ type: 'post', text: `Publicaste "${d.title}"`, time: d.created_at }));
    userPolls.slice(0, 2).forEach(p => activities.push({ type: 'poll', text: `Creaste la encuesta "${p.title}"`, time: p.created_at }));
    likedDebates.slice(0, 3).forEach(d => activities.push({ type: 'like', text: `Te gustó "${d.title}"`, time: d.created_at }));

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recent = activities.slice(0, 6);

    if (!recent.length) {
        container.innerHTML = '<p class="empty-hint">Sin actividad registrada aún.</p>';
        return;
    }

    container.innerHTML = recent.map(a => `
        <div class="activity-item">
            <div class="activity-dot dot-${a.type === 'like' ? 'like' : a.type === 'poll' ? 'poll' : ''}"></div>
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
    container.innerHTML = interests.map((interest, i) =>
        `<span class="topic-tag ${INTEREST_COLORS[i % INTEREST_COLORS.length]}">${interest}</span>`
    ).join('');
}

// ===== TABS =====
function renderTab(tab) {
    currentTab = tab;
    const container = document.getElementById('tabContent');
    if (!container) return;

    let items = [];
    let emptyMsg = 'Aún no hay publicaciones aquí.';

    if (tab === 'posts') {
        const debates = userDebates.map(d => ({ ...d, _type: 'debate' }));
        const polls = userPolls.map(p => ({ ...p, _type: 'poll' }));
        items = [...debates, ...polls].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        emptyMsg = 'Aún no has publicado nada.';
    } else if (tab === 'debates') {
        items = userDebates.map(d => ({ ...d, _type: 'debate' }));
        emptyMsg = 'Aún no hay debates aquí.';
    } else if (tab === 'polls') {
        items = userPolls.map(p => ({ ...p, _type: 'poll' }));
        emptyMsg = 'Aún no hay encuestas aquí.';
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

    // Botón de estadísticas solo en perfil propio
    const statsBtn = isOwnProfile && !isLiked
        ? `<button class="post-stats-btn" onclick="openPostStats('${item.id}', '${isPoll ? 'poll' : 'debate'}')" title="Ver estadísticas">
               📊 <span>Estadísticas</span>
           </button>`
        : '';

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
                ${statsBtn}
            </div>
        </div>`;
}

// ===== GUARDAR PERFIL =====
async function handleSaveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProfileBtn');
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    const interests = [...document.querySelectorAll('#interestsPicker input:checked')].map(cb => cb.value);

    const updates = {
        id: currentUser.id,
        full_name: document.getElementById('editName').value.trim(),
        username: userProfile.username || currentUser.email?.split('@')[0] || '',
        university: document.getElementById('editUniversity').value.trim(),
        career: document.getElementById('editCareer').value.trim(),
        semester: document.getElementById('editSemester').value,
        bio: document.getElementById('editBio').value.trim(),
        interests,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient.from('profiles').upsert(updates, { onConflict: 'id' });
        if (error) {
            if (error.message.includes('interests')) {
                const { interests: _removed, ...updatesWithout } = updates;
                const { error: err2 } = await supabaseClient.from('profiles').upsert(updatesWithout, { onConflict: 'id' });
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
    if (file.size > 2 * 1024 * 1024) { showNotification('La imagen no debe superar 2MB', 'warning'); return; }

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
        const filePath = `${currentUser.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
        const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

        const { error: updateError } = await supabaseClient.from('profiles')
            .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id);
        if (updateError) throw updateError;

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
    const userAvatarNav = document.getElementById('userAvatarNav');
    const dropdown = document.getElementById('userDropdown');
    if (userAvatarNav && dropdown) {
        userAvatarNav.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); });
        document.addEventListener('click', () => dropdown.classList.remove('active'));
    }

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderTab(tab.dataset.tab);
        });
    });

    const editForm = document.getElementById('editProfileForm');
    if (editForm) editForm.addEventListener('submit', handleSaveProfile);

    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) avatarInput.addEventListener('change', handleAvatarChange);

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
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }
function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
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
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}