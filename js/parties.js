// ===== PARTIES.JS — Sistema de Partidos Políticos Estudiantiles =====

const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

let currentUser = null;
let currentProfile = null;
let allParties = [];
let currentPmpTab = 'members';

const AREA_CONFIG = {
    biomedicas:  { label: 'Biomédicas',  emoji: '🔬', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', bg: 'rgba(16,185,129,0.06)' },
    ingenierias: { label: 'Ingenierías', emoji: '⚙️', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', bg: 'rgba(99,102,241,0.06)' },
    sociales:    { label: 'Sociales',    emoji: '🏛️', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', bg: 'rgba(245,158,11,0.06)' }
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
});

function initTheme() {
    const saved = localStorage.getItem('politic-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('politic-theme', next);
    });
}

async function checkAuth() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) { window.location.href = 'index.html'; return; }
    currentUser = data.session.user;

    // Cargar avatar nav
    const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = prof;
    const navAvatar = document.getElementById('userAvatar');
    if (navAvatar && prof?.avatar_url) navAvatar.src = prof.avatar_url;

    setupDropdown();
    await loadAllParties();

    // Si el perfil aún no tiene party_id pero está en party_members
    if (!currentProfile?.party_id) {
        try {
            const { data: mem } = await supabaseClient
                .from('party_members')
                .select('party_id, role')
                .eq('user_id', currentUser.id)
                .eq('status', 'approved')
                .maybeSingle();
            if (mem) {
                currentProfile.party_id = mem.party_id;
                currentProfile.party_role = mem.role;
            }
        } catch (e) {
            console.warn('Error verificando membresía:', e);
        }
    }

    renderMyPartyBanner();
    renderManagePanel();

    // Auto-abrir modal si vino por enlace de reclutamiento (?join=ID)
    const joinParam = new URLSearchParams(window.location.search).get('join');
    if (joinParam && !currentProfile?.party_id) {
        const targetParty = allParties.find(p => String(p.id) === String(joinParam));
        if (targetParty) {
            openJoinModal(targetParty.id, targetParty.name);
        }
    }
}

function setupDropdown() {
    const avatarNav = document.getElementById('userAvatarNav');
    const dropdown = document.getElementById('userDropdown');
    const logoutLink = document.getElementById('logoutLink');
    if (avatarNav && dropdown) {
        avatarNav.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('active'); });
        document.addEventListener('click', () => dropdown.classList.remove('active'));
    }
    if (logoutLink) {
        logoutLink.addEventListener('click', async e => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }
}

// ===== CARGAR PARTIDOS =====
async function loadAllParties() {
    try {
        const { data, error } = await supabaseClient
            .from('parties')
            .select('*, leader:leader_id(id, full_name, username, avatar_url), party_members(count)')
            .order('created_at', { ascending: true });

        allParties = data || [];
        renderAreasGrid();
    } catch (err) {
        console.error('Error cargando partidos:', err);
        renderAreasGrid(); // renderizar vacío igual
    }
}

// ===== RENDERIZAR GRID DE ÁREAS =====
function renderAreasGrid() {
    const grid = document.getElementById('areasGrid');
    if (!grid) return;

    const areas = ['biomedicas', 'ingenierias', 'sociales'];
    grid.innerHTML = areas.map(area => {
        const cfg = AREA_CONFIG[area];
        const areaParties = allParties.filter(p => p.area === area);
        const myPartyInArea = areaParties.find(p => currentProfile?.party_id === p.id);

        return `
        <div class="area-card" style="--area-color:${cfg.color};--area-bg:${cfg.bg}">
            <div class="area-card-header" style="background:${cfg.gradient}">
                <div class="area-emoji">${cfg.emoji}</div>
                <h2 class="area-name">${cfg.label}</h2>
                <div class="area-parties-count">${areaParties.length} partido${areaParties.length !== 1 ? 's' : ''}</div>
            </div>
            <div class="area-card-body">
                ${areaParties.length === 0
                    ? `<div class="no-party-prompt">
                        <p>Aún no hay partidos en esta área.</p>
                        ${!currentProfile?.party_id ? `<button class="btn btn-primary btn-sm" onclick="openCreatePartyModal('${area}')">Fundar el primer partido</button>` : ''}
                       </div>`
                    : areaParties.map(party => renderPartyCard(party, myPartyInArea)).join('')
                }
            </div>
        </div>`;
    }).join('');
}

function renderPartyCard(party, isMyParty) {
    const membersCount = party.party_members?.[0]?.count || 0;
    const leader = party.leader;
    const leaderName = leader?.full_name || leader?.username || 'Sin líder';
    const leaderAvatar = leader?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(leaderName)}&background=6366f1&color=fff&size=32`;
    const isLeader = party.leader_id === currentUser?.id;
    const isMember = currentProfile?.party_id === party.id;
    const hasParty = !!currentProfile?.party_id;

    return `
    <div class="party-card ${isMember ? 'party-card-mine' : ''}">
        <div class="party-card-top">
            <div>
                <h3 class="party-card-name">${party.name}</h3>
                <p class="party-card-desc">${party.description || 'Sin descripción.'}</p>
            </div>
            ${isMember ? '<span class="badge-mine">Tu partido</span>' : ''}
        </div>
        <div class="party-leader-row">
            <img src="${leaderAvatar}" alt="${leaderName}" class="leader-avatar">
            <div>
                <div class="leader-label">👑 Líder / Representante</div>
                <a href="profile.html?id=${leader?.id}" class="leader-name">${leaderName}</a>
            </div>
        </div>
        <div class="party-card-footer">
            <span class="members-count">👥 ${membersCount} miembro${membersCount !== 1 ? 's' : ''}</span>
            <div class="party-card-actions">
                ${isLeader
                    ? `<span class="badge-leader">👑 Eres el líder</span>`
                    : isMember
                        ? `<span class="badge-member">✓ Miembro</span>`
                        : !hasParty
                            ? `<button class="btn btn-sm btn-outline" onclick="openJoinModal('${party.id}', '${escapeHtml(party.name)}')">Solicitar unirse</button>`
                            : ''
                }
            </div>
        </div>
    </div>`;
}

// ===== BANNER MI PARTIDO =====
function renderMyPartyBanner() {
    const banner = document.getElementById('myPartyBanner');
    if (!banner || !currentProfile?.party_id) return;

    const myParty = allParties.find(p => p.id === currentProfile.party_id);
    if (!myParty) return;

    const cfg = AREA_CONFIG[myParty.area] || AREA_CONFIG.sociales;
    const roleLabel = currentProfile.party_role === 'leader' ? '👑 Líder' :
                      currentProfile.party_role === 'representative' ? '🏛️ Representante' : '✓ Miembro';

    banner.style.display = '';
    banner.innerHTML = `
        <div class="my-party-info" style="border-left:4px solid ${cfg.color}">
            <span style="font-size:1.5rem">${cfg.emoji}</span>
            <div>
                <div style="font-weight:700;color:var(--text-primary)">${myParty.name}</div>
                <div style="font-size:0.8rem;color:${cfg.color};font-weight:600">${roleLabel}</div>
            </div>
        </div>`;
}

// ===== PANEL DE GESTIÓN (para líderes) =====
function renderManagePanel() {
    const panel = document.getElementById('partyManagePanel');
    if (!panel) return;

    const isLeader = currentProfile?.party_role === 'leader' || currentProfile?.party_role === 'representative';
    if (!isLeader || !currentProfile?.party_id) return;

    const myParty = allParties.find(p => p.id === currentProfile.party_id);
    if (!myParty) return;

    panel.style.display = '';
    const title = document.getElementById('pmpTitle');
    if (title) title.textContent = `⚙️ Gestionar: ${myParty.name}`;

    loadPendingRequests();
    loadPartyMembers();
}

async function loadPendingRequests() {
    if (!currentProfile?.party_id) return;
    const { data } = await supabaseClient
        .from('party_members')
        .select('count')
        .eq('party_id', currentProfile.party_id)
        .eq('status', 'pending')
        .single();

    const count = data?.count || 0;
    const badge = document.getElementById('requestsCount');
    if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
    }
}

async function loadPartyMembers() {
    if (!currentProfile?.party_id) return;
    const { data } = await supabaseClient
        .from('party_members')
        .select('*, user:user_id(id, full_name, username, avatar_url, career)')
        .eq('party_id', currentProfile.party_id)
        .eq('status', 'approved')
        .order('joined_at');

    renderPmpContent('members', data || []);
}

function renderPmpContent(tab, data) {
    const content = document.getElementById('pmpContent');
    if (!content) return;

    if (tab === 'members') {
        if (!data.length) {
            content.innerHTML = '<p style="color:var(--text-secondary);padding:1.5rem;text-align:center">No hay miembros aprobados aún.</p>';
            return;
        }
        content.innerHTML = `
            <div class="members-table">
                <div class="members-table-header">
                    <span>Miembro</span><span>Carrera</span><span>Rol</span><span>Acción</span>
                </div>
                ${data.map(m => {
                    const user = m.user;
                    const name = user?.full_name || user?.username || 'Usuario';
                    const avatar = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=32`;
                    const isCurrentLeader = m.user_id === currentProfile.id;
                    return `
                    <div class="members-table-row">
                        <div class="member-cell-user">
                            <img src="${avatar}" alt="${name}" class="member-avatar-sm">
                            <div>
                                <a href="profile.html?id=${user?.id}" class="member-name-link">${name}</a>
                                <div style="font-size:0.75rem;color:var(--text-light)">@${user?.username || 'usuario'}</div>
                            </div>
                        </div>
                        <span class="member-career">${m.career || '—'}</span>
                        <span class="member-role-badge ${m.role}">${m.role === 'leader' ? '👑 Líder' : m.role === 'representative' ? '🏛️ Rep.' : '✓ Miembro'}</span>
                        <div>
                            ${!isCurrentLeader
                                ? `<button class="btn btn-danger btn-xs" onclick="removeMember('${m.id}', '${escapeHtml(name)}')">Expulsar</button>`
                                : '<span style="font-size:0.75rem;color:var(--text-light)">Eres tú</span>'
                            }
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    } else if (tab === 'requests') {
        renderPendingRequests(data);
    }
}

async function switchPmpTab(tab) {
    currentPmpTab = tab;
    document.querySelectorAll('.pmp-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.pmp-tab[data-tab="${tab}"]`)?.classList.add('active');

    if (tab === 'members') {
        await loadPartyMembers();
    } else if (tab === 'requests') {
        await loadRequestsData();
    } else if (tab === 'recruit') {
        await loadRecruitData();
    }
}

// ===== ENLACE DE RECLUTAMIENTO =====
function copyPartyInviteLink() {
    if (!currentProfile?.party_id) return;
    const url = `${window.location.origin}${window.location.pathname}?join=${currentProfile.party_id}`;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('🔗 ¡Enlace copiado! Compártelo con tus compañeros para que se unan.', 'success');
    }).catch(() => {
        prompt('Copia este enlace de invitación:', url);
    });
}

// ===== PANEL DE RECLUTAMIENTO DE ESTUDIANTES =====
let allAvailableStudents = [];

async function loadRecruitData() {
    const content = document.getElementById('pmpContent');
    if (!content) return;

    content.innerHTML = '<div style="text-align:center;padding:2rem"><div class="loading-spinner"></div><p style="margin-top:0.5rem;color:var(--text-secondary)">Cargando estudiantes disponibles...</p></div>';

    try {
        const { data: students, error } = await supabaseClient
            .from('profiles')
            .select('id, full_name, username, avatar_url, career, party_id, party_role')
            .neq('id', currentUser.id)
            .order('full_name', { ascending: true })
            .limit(50);

        if (error) throw error;
        allAvailableStudents = students || [];
        renderRecruitPanel(allAvailableStudents);
    } catch (err) {
        content.innerHTML = `<p style="color:#ef4444;padding:1rem;text-align:center">Error al cargar estudiantes: ${err.message}</p>`;
    }
}

function renderRecruitPanel(students) {
    const content = document.getElementById('pmpContent');
    if (!content) return;

    const myParty = allParties.find(p => p.id === currentProfile.party_id);
    const inviteUrl = `${window.location.origin}${window.location.pathname}?join=${currentProfile?.party_id}`;

    content.innerHTML = `
        <div style="margin-bottom:1.5rem;padding:1.25rem;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
                <div>
                    <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem">🔗 Enlace de Reclutamiento Directo</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">Cualquier estudiante que abra este enlace podrá enviar su solicitud directa a "${escapeHtml(myParty?.name || 'tu partido')}".</div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="copyPartyInviteLink()">📋 Copiar Enlace</button>
            </div>
            <div style="margin-top:0.75rem;padding:0.5rem 0.75rem;background:var(--bg-card);border-radius:8px;font-family:monospace;font-size:0.8rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px dashed var(--border)">
                ${inviteUrl}
            </div>
        </div>

        <div style="margin-bottom:1.25rem">
            <input type="text" id="recruitSearchInput" placeholder="🔍 Buscar estudiantes por nombre, usuario o carrera..." 
                   style="width:100%;padding:0.75rem 1rem;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:0.9rem;"
                   oninput="filterRecruitStudents(this.value)">
        </div>

        <div id="recruitStudentsList" style="border:1px solid var(--border-light);border-radius:12px;overflow:hidden">
            ${renderRecruitListHtml(students)}
        </div>
    `;
}

function renderRecruitListHtml(students) {
    if (!students.length) {
        return '<p style="color:var(--text-secondary);padding:1.5rem;text-align:center">No se encontraron estudiantes para reclutar.</p>';
    }

    return students.map(s => {
        const name = s.full_name || s.username || 'Estudiante';
        const avatar = s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=36`;
        const hasParty = !!s.party_id;
        const isMyMember = s.party_id === currentProfile.party_id;

        return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.85rem 1rem;border-bottom:1px solid var(--border-light);background:var(--bg-card);transition:background 0.15s">
            <div style="display:flex;align-items:center;gap:0.75rem;min-width:0">
                <img src="${avatar}" alt="${name}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">
                <div style="min-width:0">
                    <a href="profile.html?id=${s.id}" style="font-weight:600;font-size:0.9rem;color:var(--text-primary);text-decoration:none" target="_blank">${escapeHtml(name)}</a>
                    <div style="font-size:0.78rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.career || 'Sin carrera')} ${s.username ? `· @${escapeHtml(s.username)}` : ''}</div>
                </div>
            </div>
            <div style="flex-shrink:0">
                ${isMyMember 
                    ? `<span style="font-size:0.75rem;color:#10b981;font-weight:600;background:rgba(16,185,129,0.12);padding:4px 10px;border-radius:20px">✓ Ya es miembro</span>`
                    : hasParty 
                        ? `<span style="font-size:0.75rem;color:var(--text-light);font-weight:500">En otro partido</span>`
                        : `<button class="btn btn-primary btn-sm" onclick="recruitStudentFromPanel('${s.id}', '${escapeHtml(name)}')">➕ Reclutar</button>`
                }
            </div>
        </div>`;
    }).join('');
}

function filterRecruitStudents(term) {
    const q = term.toLowerCase().trim();
    const listEl = document.getElementById('recruitStudentsList');
    if (!listEl) return;

    if (!q) {
        listEl.innerHTML = renderRecruitListHtml(allAvailableStudents);
        return;
    }

    const filtered = allAvailableStudents.filter(s => 
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.career && s.career.toLowerCase().includes(q))
    );
    listEl.innerHTML = renderRecruitListHtml(filtered);
}

async function recruitStudentFromPanel(studentId, studentName) {
    if (!currentProfile?.party_id) return;
    const myParty = allParties.find(p => p.id === currentProfile.party_id);
    if (!confirm(`¿Deseas reclutar a ${studentName} para integrarse directamente a "${myParty?.name || 'tu partido'}"?`)) return;

    try {
        const { error: insertErr } = await supabaseClient.from('party_members').insert({
            party_id: currentProfile.party_id,
            user_id: studentId,
            career: 'Estudiante',
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

        // Actualizar perfil
        await supabaseClient.from('profiles').update({
            party_id: currentProfile.party_id,
            party_role: 'member'
        }).eq('id', studentId);

        // Actualizar estado local
        const idx = allAvailableStudents.findIndex(s => s.id === studentId);
        if (idx !== -1) {
            allAvailableStudents[idx].party_id = currentProfile.party_id;
            allAvailableStudents[idx].party_role = 'member';
        }

        showNotification(`🎉 ¡${studentName} ha sido incorporado a ${myParty?.name}!`, 'success');

        const searchVal = document.getElementById('recruitSearchInput')?.value || '';
        filterRecruitStudents(searchVal);
        await loadAllParties();
    } catch (err) {
        showNotification('Error al reclutar: ' + err.message, 'error');
    }
}

async function loadRequestsData() {
    const { data } = await supabaseClient
        .from('party_members')
        .select('*, user:user_id(id, full_name, username, avatar_url, career)')
        .eq('party_id', currentProfile.party_id)
        .eq('status', 'pending')
        .order('joined_at');

    renderPendingRequests(data || []);
}

function renderPendingRequests(requests) {
    const content = document.getElementById('pmpContent');
    if (!content) return;

    if (!requests.length) {
        content.innerHTML = '<p style="color:var(--text-secondary);padding:1.5rem;text-align:center">No hay solicitudes pendientes. 🎉</p>';
        return;
    }

    content.innerHTML = requests.map(req => {
        const user = req.user;
        const name = user?.full_name || user?.username || 'Usuario';
        const avatar = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=32`;
        return `
        <div class="request-card">
            <img src="${avatar}" alt="${name}" class="leader-avatar">
            <div style="flex:1">
                <div style="font-weight:600">${name}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">Carrera: ${req.career || 'No especificada'}</div>
            </div>
            <div style="display:flex;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="reviewRequest('${req.id}', 'approved')">✓ Aprobar</button>
                <button class="btn btn-danger btn-sm" onclick="reviewRequest('${req.id}', 'rejected')">✕ Rechazar</button>
            </div>
        </div>`;
    }).join('');
}

async function reviewRequest(memberId, status) {
    try {
        const { error } = await supabaseClient.from('party_members').update({ status }).eq('id', memberId);
        if (error) throw error;

        if (status === 'approved') {
            const { data: memberData } = await supabaseClient.from('party_members').select('user_id, party_id').eq('id', memberId).single();
            if (memberData) {
                await supabaseClient.from('profiles').update({
                    party_id: memberData.party_id,
                    party_role: 'member'
                }).eq('id', memberData.user_id);
            }
        }

        showNotification(status === 'approved' ? '✓ Solicitud aprobada' : 'Solicitud rechazada', status === 'approved' ? 'success' : 'info');
        await loadRequestsData();
        await loadPendingRequests();
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
    }
}

async function removeMember(memberId, memberName) {
    if (!confirm(`¿Expulsar a ${memberName} del partido?`)) return;
    try {
        const { data: memberData } = await supabaseClient.from('party_members').select('user_id').eq('id', memberId).single();
        await supabaseClient.from('party_members').delete().eq('id', memberId);
        if (memberData) {
            await supabaseClient.from('profiles').update({ party_id: null, party_role: 'none' }).eq('id', memberData.user_id);
        }
        showNotification(`${memberName} ha sido expulsado del partido`, 'info');
        await loadPartyMembers();
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
    }
}

// ===== MODAL: SOLICITAR UNIRSE =====
function openJoinModal(partyId, partyName) {
    document.getElementById('joinPartyId').value = partyId;
    document.getElementById('joinModalTitle').textContent = `Unirse a "${partyName}"`;
    document.getElementById('joinModalDesc').textContent = `Tu solicitud será revisada por el representante del partido. Mientras esté pendiente, no podrás unirte a otro partido.`;
    document.getElementById('joinCareer').value = currentProfile?.career || '';
    openModal('joinPartyModal');
}

async function submitJoinRequest() {
    const partyId = document.getElementById('joinPartyId').value;
    const career = document.getElementById('joinCareer').value.trim();
    if (!career) { showNotification('Ingresa tu carrera', 'warning'); return; }

    try {
        // Verificar si ya tiene una solicitud pendiente
        const { data: existing } = await supabaseClient
            .from('party_members')
            .select('id, status')
            .eq('user_id', currentUser.id)
            .eq('party_id', partyId)
            .single();

        if (existing) {
            showNotification(`Ya tienes una solicitud ${existing.status === 'pending' ? 'pendiente' : existing.status} para este partido`, 'warning');
            closeModal('joinPartyModal');
            return;
        }

        await supabaseClient.from('party_members').insert({
            party_id: partyId,
            user_id: currentUser.id,
            career,
            role: 'member',
            status: 'pending'
        });

        showNotification('✓ Solicitud enviada. El representante la revisará pronto.', 'success');
        closeModal('joinPartyModal');
    } catch (err) {
        showNotification('Error al enviar solicitud: ' + err.message, 'error');
    }
}

// ===== MODAL: CREAR PARTIDO =====
function openCreatePartyModal(area) {
    const select = document.getElementById('newPartyArea');
    if (select && area) select.value = area;
    openModal('createPartyModal');
}

async function submitCreateParty() {
    const name = document.getElementById('newPartyName').value.trim();
    const area = document.getElementById('newPartyArea').value;
    const description = document.getElementById('newPartyDesc').value.trim();

    if (!name || !area) { showNotification('Nombre y área son requeridos', 'warning'); return; }
    if (currentProfile?.party_id) { showNotification('Ya eres miembro de un partido', 'warning'); return; }

    try {
        const { data: party, error } = await supabaseClient.from('parties').insert({
            name, area, description,
            leader_id: currentUser.id
        }).select().single();

        if (error) throw error;

        // Agregar al creador como líder
        await supabaseClient.from('party_members').insert({
            party_id: party.id,
            user_id: currentUser.id,
            career: currentProfile?.career || '',
            role: 'leader',
            status: 'approved'
        });

        // Actualizar perfil
        await supabaseClient.from('profiles').update({
            party_id: party.id,
            party_role: 'leader'
        }).eq('id', currentUser.id);

        currentProfile = { ...currentProfile, party_id: party.id, party_role: 'leader' };

        showNotification('🎉 ¡Partido fundado exitosamente!', 'success');
        closeModal('createPartyModal');
        await loadAllParties();
        renderMyPartyBanner();
        renderManagePanel();
    } catch (err) {
        showNotification('Error creando partido: ' + err.message, 'error');
    }
}

// ===== MODAL HELPERS =====
function openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; } }
function closeModal(id) { const m = document.getElementById(id); if (m) { m.classList.remove('active'); document.body.style.overflow = 'auto'; } }
document.addEventListener('click', e => { if (e.target.classList.contains('modal')) closeModal(e.target.id); });

function openTab(tab) { switchPmpTab(tab); }
function openRequestsPanel() { switchPmpTab('requests'); }

// ===== NOTIFICACIONES =====
function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `<div class="notification-content"><span>${message}</span><button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button></div>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
}

function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
