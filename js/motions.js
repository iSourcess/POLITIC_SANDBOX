// ===== MOTIONS.JS — Sistema de Mociones Formales =====

const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

let currentUser = null;
let currentProfile = null;
let allMotions = [];
let currentStatusFilter = 'all';

const STATUS_CONFIG = {
    proposal: { label: '📝 Propuesta',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    debate:   { label: '💬 En Debate',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    voting:   { label: '🗳️ Votación',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    resolved: { label: '✅ Resuelta',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();

    const newMotionForm = document.getElementById('newMotionForm');
    if (newMotionForm) newMotionForm.addEventListener('submit', handleNewMotion);
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

    const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = prof;

    const navAvatar = document.getElementById('userAvatar');
    if (navAvatar && prof?.avatar_url) navAvatar.src = prof.avatar_url;

    // Mostrar botón nueva moción solo si es miembro de un partido
    if (currentProfile?.party_id) {
        const btn = document.getElementById('newMotionBtn');
        if (btn) btn.style.display = 'flex';
    }

    setupDropdown();
    await loadMotions();
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

// ===== CARGAR MOCIONES =====
async function loadMotions() {
    try {
        const { data, error } = await supabaseClient
            .from('motions')
            .select('*, proposer:proposed_by(id, full_name, username, avatar_url, party_role), party:party_id(name, area)')
            .order('created_at', { ascending: false });

        allMotions = data || [];
        // Verificar automáticamente si alguna moción debe avanzar de etapa
        await autoAdvanceMotions();
        renderMotions();
    } catch (err) {
        console.error('Error cargando mociones:', err);
        renderMotions();
    }
}

async function autoAdvanceMotions() {
    const now = new Date();
    for (const motion of allMotions) {
        if (motion.status === 'debate' && motion.debate_ends_at && new Date(motion.debate_ends_at) < now) {
            // Avanzar a votación
            const votingEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
            await supabaseClient.from('motions').update({ status: 'voting', voting_ends_at: votingEndsAt }).eq('id', motion.id);
            motion.status = 'voting';
            motion.voting_ends_at = votingEndsAt;
        } else if (motion.status === 'voting' && motion.voting_ends_at && new Date(motion.voting_ends_at) < now) {
            // Resolver
            const won = motion.votes_for > motion.votes_against;
            const resolution = won
                ? `✅ Moción APROBADA con ${motion.votes_for} votos a favor y ${motion.votes_against} en contra.`
                : `❌ Moción RECHAZADA con ${motion.votes_against} votos en contra y ${motion.votes_for} a favor.`;
            await supabaseClient.from('motions').update({ status: 'resolved', resolution }).eq('id', motion.id);
            motion.status = 'resolved';
            motion.resolution = resolution;
        }
    }
}

// ===== RENDERIZAR MOCIONES =====
function renderMotions() {
    const container = document.getElementById('motionsContainer');
    if (!container) return;

    let filtered = allMotions;
    if (currentStatusFilter !== 'all') {
        filtered = allMotions.filter(m => m.status === currentStatusFilter);
    }

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding:3rem;text-align:center">
                <div style="font-size:3rem;margin-bottom:1rem">⚡</div>
                <p style="color:var(--text-secondary)">No hay mociones ${currentStatusFilter !== 'all' ? 'con este estado' : 'aún'}.</p>
                ${currentProfile?.party_id ? '<p style="color:var(--text-light);font-size:0.875rem">¡Sé el primero en proponer una!</p>' : '<p style="color:var(--text-light);font-size:0.875rem">Únete a un partido para proponer mociones.</p>'}
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(motion => createMotionCard(motion)).join('');
}

function createMotionCard(motion) {
    const statusCfg = STATUS_CONFIG[motion.status] || STATUS_CONFIG.proposal;
    const proposer = motion.proposer;
    const proposerName = proposer?.full_name || proposer?.username || 'Usuario';
    const proposerAvatar = proposer?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(proposerName)}&background=6366f1&color=fff&size=32`;
    const totalVotes = (motion.votes_for || 0) + (motion.votes_against || 0);
    const forPct = totalVotes > 0 ? Math.round((motion.votes_for / totalVotes) * 100) : 50;

    let timeInfo = '';
    const now = new Date();
    if (motion.status === 'debate' && motion.debate_ends_at) {
        const end = new Date(motion.debate_ends_at);
        const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        timeInfo = diffDays > 0 ? `⏱ ${diffDays} día${diffDays !== 1 ? 's' : ''} de debate restante${diffDays !== 1 ? 's' : ''}` : '⏱ Debate terminando pronto';
    } else if (motion.status === 'voting' && motion.voting_ends_at) {
        const end = new Date(motion.voting_ends_at);
        const diffHours = Math.ceil((end - now) / (1000 * 60 * 60));
        timeInfo = diffHours > 0 ? `🗳️ ${diffHours}h restantes para votar` : '🗳️ Votación cerrando pronto';
    }

    return `
    <div class="motion-card" onclick="openMotionDetail('${motion.id}')">
        <div class="motion-card-header">
            <span class="motion-status-badge" style="background:${statusCfg.bg};color:${statusCfg.color}">${statusCfg.label}</span>
            ${motion.party?.name ? `<span class="motion-party-tag">${motion.party.name}</span>` : ''}
            <span class="motion-time">${getTimeAgo(motion.created_at)}</span>
        </div>
        <h3 class="motion-title">${motion.title}</h3>
        <p class="motion-desc">${motion.description.slice(0, 160)}${motion.description.length > 160 ? '...' : ''}</p>

        ${motion.status === 'voting' || motion.status === 'resolved' ? `
        <div class="motion-vote-bar">
            <div class="vote-bar-labels">
                <span style="color:#10b981">✅ A favor: ${motion.votes_for || 0}</span>
                <span style="color:#ef4444">❌ En contra: ${motion.votes_against || 0}</span>
            </div>
            <div class="vote-bar-track">
                <div class="vote-bar-for" style="width:${forPct}%"></div>
            </div>
        </div>` : ''}

        <div class="motion-card-footer">
            <div class="motion-proposer">
                <img src="${proposerAvatar}" alt="${proposerName}" class="motion-avatar">
                <span>Propuesto por <a href="profile.html?id=${proposer?.id}" onclick="event.stopPropagation()">${proposerName}</a></span>
            </div>
            ${timeInfo ? `<span class="motion-time-info">${timeInfo}</span>` : ''}
        </div>

        ${motion.status === 'resolved' && motion.resolution ? `
        <div class="motion-resolution">
            <strong>Resolución:</strong> ${motion.resolution}
        </div>` : ''}
    </div>`;
}

// ===== DETALLE DE MOCIÓN =====
async function openMotionDetail(motionId) {
    const motion = allMotions.find(m => m.id === motionId || m.id === parseInt(motionId));
    if (!motion) return;

    const modal = document.getElementById('motionDetailModal');
    const title = document.getElementById('motionDetailTitle');
    const body = document.getElementById('motionDetailBody');
    if (!modal) return;

    title.textContent = motion.title;
    const statusCfg = STATUS_CONFIG[motion.status];
    const proposer = motion.proposer;
    const proposerName = proposer?.full_name || proposer?.username || 'Usuario';
    const totalVotes = (motion.votes_for || 0) + (motion.votes_against || 0);
    const forPct = totalVotes > 0 ? Math.round((motion.votes_for / totalVotes) * 100) : 50;

    // Verificar si el usuario ya votó
    let userVoted = null;
    if (currentUser && motion.status === 'voting') {
        const { data: voteData } = await supabaseClient
            .from('motion_votes')
            .select('vote')
            .eq('motion_id', motion.id)
            .eq('user_id', currentUser.id)
            .single();
        userVoted = voteData?.vote || null;
    }

    const canVote = motion.status === 'voting' && currentProfile?.party_id && !userVoted;
    const isProposer = motion.proposed_by === currentUser?.id;
    const isLeader = currentProfile?.party_role === 'leader' || currentProfile?.party_role === 'representative';

    body.innerHTML = `
        <div style="margin-bottom:1.5rem">
            <span style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.3rem 0.875rem;border-radius:2rem;font-size:0.8rem;font-weight:600;background:${statusCfg.bg};color:${statusCfg.color}">${statusCfg.label}</span>
        </div>

        <p style="line-height:1.7;color:var(--text-secondary);margin-bottom:1.5rem">${motion.description}</p>

        <div style="font-size:0.85rem;color:var(--text-light);margin-bottom:2rem">
            Propuesto por <a href="profile.html?id=${proposer?.id}" style="color:var(--primary-purple)">${proposerName}</a>
            ${motion.party?.name ? ` · Partido: ${motion.party.name}` : ''} · ${getTimeAgo(motion.created_at)}
        </div>

        ${motion.status === 'voting' || motion.status === 'resolved' ? `
        <div style="background:var(--bg-secondary);border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
            <h4 style="margin-bottom:1rem;font-size:0.9rem">📊 Resultado de votación</h4>
            <div class="vote-bar-labels" style="margin-bottom:0.5rem">
                <span style="color:#10b981;font-weight:600">✅ A favor: ${motion.votes_for || 0} (${forPct}%)</span>
                <span style="color:#ef4444;font-weight:600">❌ En contra: ${motion.votes_against || 0} (${100 - forPct}%)</span>
            </div>
            <div class="vote-bar-track" style="height:12px">
                <div class="vote-bar-for" style="width:${forPct}%"></div>
            </div>
            <div style="text-align:center;font-size:0.8rem;color:var(--text-light);margin-top:0.5rem">${totalVotes} voto${totalVotes !== 1 ? 's' : ''} en total</div>
        </div>` : ''}

        ${canVote ? `
        <div class="motion-vote-actions" id="voteActions">
            <p style="font-weight:600;margin-bottom:0.75rem;color:var(--text-primary)">🗳️ ¿Cómo votas esta moción?</p>
            <div style="display:flex;gap:0.75rem">
                <button class="btn btn-success" style="flex:1" onclick="voteOnMotion('${motion.id}', 'for')">✅ A Favor</button>
                <button class="btn btn-danger" style="flex:1" onclick="voteOnMotion('${motion.id}', 'against')">❌ En Contra</button>
            </div>
        </div>` : ''}

        ${userVoted ? `
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:1rem;text-align:center;color:#10b981;font-weight:600">
            ✓ Ya votaste ${userVoted === 'for' ? 'A Favor' : 'En Contra'} de esta moción
        </div>` : ''}

        ${motion.status === 'resolved' && motion.resolution ? `
        <div style="background:rgba(16,185,129,0.08);border-left:4px solid #10b981;border-radius:0 10px 10px 0;padding:1rem;margin-top:1.5rem">
            <strong style="color:#10b981">📋 Resolución Final</strong>
            <p style="color:var(--text-secondary);margin-top:0.5rem">${motion.resolution}</p>
        </div>` : ''}

        ${isLeader && motion.status === 'proposal' ? `
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border-light)">
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Como representante, puedes iniciar el período de debate:</p>
            <button class="btn btn-primary btn-sm" onclick="advanceMotionStatus('${motion.id}', 'debate')">🚀 Iniciar Debate</button>
        </div>` : ''}

        ${isLeader && motion.status === 'debate' ? `
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border-light)">
            <button class="btn btn-primary btn-sm" onclick="advanceMotionStatus('${motion.id}', 'voting')">🗳️ Abrir Votación</button>
        </div>` : ''}`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function voteOnMotion(motionId, vote) {
    try {
        await supabaseClient.from('motion_votes').insert({ motion_id: motionId, user_id: currentUser.id, vote });

        const field = vote === 'for' ? 'votes_for' : 'votes_against';
        const motion = allMotions.find(m => m.id === motionId || m.id === parseInt(motionId));
        const newCount = (motion?.[field] || 0) + 1;
        await supabaseClient.from('motions').update({ [field]: newCount }).eq('id', motionId);
        if (motion) motion[field] = newCount;

        showNotification(`✓ Voto ${vote === 'for' ? 'a favor' : 'en contra'} registrado`, 'success');
        closeModal('motionDetailModal');
        renderMotions();
    } catch (err) {
        showNotification('Error al votar: ' + err.message, 'error');
    }
}

async function advanceMotionStatus(motionId, newStatus) {
    const now = new Date();
    let updates = { status: newStatus };

    if (newStatus === 'debate') {
        updates.debate_ends_at = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    } else if (newStatus === 'voting') {
        updates.voting_ends_at = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }

    await supabaseClient.from('motions').update(updates).eq('id', motionId);
    const motion = allMotions.find(m => m.id === motionId || m.id === parseInt(motionId));
    if (motion) Object.assign(motion, updates);

    showNotification('Estado actualizado', 'success');
    closeModal('motionDetailModal');
    renderMotions();
}

// ===== NUEVA MOCIÓN =====
async function handleNewMotion(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Presentando...';

    try {
        const debateDays = parseInt(document.getElementById('debateDays').value);
        const debateEndsAt = new Date(Date.now() + debateDays * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabaseClient.from('motions').insert({
            title: document.getElementById('motionTitle').value.trim(),
            description: document.getElementById('motionDesc').value.trim(),
            proposed_by: currentUser.id,
            party_id: currentProfile?.party_id || null,
            status: 'proposal',
            votes_for: 0,
            votes_against: 0,
            debate_ends_at: debateEndsAt
        });

        if (error) throw error;
        showNotification('✓ Moción presentada exitosamente', 'success');
        closeModal('newMotionModal');
        e.target.reset();
        await loadMotions();
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Presentar Moción';
    }
}

function filterMotions(status, btn) {
    currentStatusFilter = status;
    document.querySelectorAll('.motions-filters .filter-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderMotions();
}

function openNewMotionModal() { openModal('newMotionModal'); }

function openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; } }
function closeModal(id) { const m = document.getElementById(id); if (m) { m.classList.remove('active'); document.body.style.overflow = 'auto'; } }
document.addEventListener('click', e => { if (e.target.classList.contains('modal')) closeModal(e.target.id); });

function getTimeAgo(ts) {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)} días`;
    return new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `<div class="notification-content"><span>${message}</span><button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button></div>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
}
