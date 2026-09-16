// ===== NEWS.JS — Diario Estudiantil =====

const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

let currentUser = null;
let currentProfile = null;
let allArticles = [];
let currentAreaFilter = 'all';

const AREA_CONFIG = {
    biomedicas:  { label: 'Biomédicas',  emoji: '🔬', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    ingenierias: { label: 'Ingenierías', emoji: '⚙️', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    sociales:    { label: 'Sociales',    emoji: '🏛️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();

    const newArticleForm = document.getElementById('newArticleForm');
    if (newArticleForm) newArticleForm.addEventListener('submit', handleNewArticle);
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

    // Solo miembros de partido pueden publicar
    if (currentProfile?.party_id) {
        const btn = document.getElementById('newArticleBtn');
        if (btn) btn.style.display = 'flex';
    }

    setupDropdown();
    await loadArticles();
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

// ===== CARGAR ARTÍCULOS =====
async function loadArticles() {
    try {
        const { data } = await supabaseClient
            .from('news_articles')
            .select('*, author:author_id(id, full_name, username, avatar_url, party_role, party_area, party_name), party:party_id(name, area)')
            .order('importance_votes', { ascending: false })
            .order('created_at', { ascending: false });

        allArticles = data || [];
        renderFeaturedArticles();
        renderNews();
    } catch (err) {
        console.error('Error cargando noticias:', err);
        renderNews();
    }
}

// ===== ARTÍCULOS DESTACADOS (top 3 por votos) =====
function renderFeaturedArticles() {
    const featured = allArticles.filter(a => a.importance_votes > 0).slice(0, 3);
    const section = document.getElementById('featuredArticles');
    const grid = document.getElementById('featuredGrid');

    if (!section || !grid || !featured.length) {
        if (section) section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const areaColors = ['#6366f1', '#10b981', '#f59e0b'];
    grid.innerHTML = featured.map((article, i) => {
        const author = article.author;
        const authorName = author?.full_name || author?.username || 'Periodista';
        const areaInfo = AREA_CONFIG[article.area];
        const color = areaColors[i] || '#6366f1';

        return `
        <div class="featured-card" style="--fc-color:${color}" onclick="openArticle('${article.id}')">
            <div class="featured-card-header" style="background:linear-gradient(135deg, ${color}dd, ${color}99)">
                ${areaInfo ? `<span class="featured-area-badge">${areaInfo.emoji} ${areaInfo.label}</span>` : '<span class="featured-area-badge">🌐 General</span>'}
                <div class="featured-votes">🔥 ${article.importance_votes} importante${article.importance_votes !== 1 ? 's' : ''}</div>
            </div>
            <div class="featured-card-body">
                <h3 class="featured-title">${article.title}</h3>
                <p class="featured-excerpt">${article.content.slice(0, 120)}...</p>
                <div class="featured-author">
                    <span>Por <strong>${authorName}</strong> · ${getTimeAgo(article.created_at)}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ===== RENDERIZAR LISTA DE NOTICIAS =====
function renderNews() {
    const container = document.getElementById('newsContainer');
    if (!container) return;

    let filtered = allArticles;
    if (currentAreaFilter !== 'all') {
        filtered = allArticles.filter(a => a.area === currentAreaFilter);
    }

    if (!filtered.length) {
        container.innerHTML = `
            <div style="padding:3rem;text-align:center">
                <div style="font-size:3rem;margin-bottom:1rem">📰</div>
                <p style="color:var(--text-secondary)">No hay noticias ${currentAreaFilter !== 'all' ? 'en esta área' : 'aún'}.</p>
                ${currentProfile?.party_id
                    ? '<p style="color:var(--text-light);font-size:0.875rem">¡Publica la primera noticia!</p>'
                    : '<p style="color:var(--text-light);font-size:0.875rem">Únete a un partido para publicar noticias.</p>'}
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(article => createArticleCard(article)).join('');
}

function createArticleCard(article) {
    const author = article.author;
    const authorName = author?.full_name || author?.username || 'Usuario';
    const authorAvatar = author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&size=32`;
    const areaInfo = AREA_CONFIG[article.area];
    const roleLabel = author?.party_role && author.party_role !== 'none'
        ? (author.party_role === 'leader' ? '👑' : author.party_role === 'representative' ? '🏛️' : '')
        : '';
    const isImportant = article.importance_votes >= 3;

    return `
    <div class="news-card ${isImportant ? 'news-card-important' : ''}" onclick="openArticle('${article.id}')">
        <div class="news-card-meta">
            ${areaInfo
                ? `<span class="area-pill" style="background:${areaInfo.bg};color:${areaInfo.color}">${areaInfo.emoji} ${areaInfo.label}</span>`
                : '<span class="area-pill" style="background:var(--bg-secondary);color:var(--text-secondary)">🌐 General</span>'
            }
            ${isImportant ? '<span class="trending-badge">🔥 Trending</span>' : ''}
            <span class="news-time">${getTimeAgo(article.created_at)}</span>
        </div>
        <h3 class="news-title">${article.title}</h3>
        <p class="news-excerpt">${article.content.slice(0, 200)}${article.content.length > 200 ? '...' : ''}</p>
        <div class="news-card-footer">
            <div class="news-author">
                <img src="${authorAvatar}" alt="${authorName}" class="news-author-avatar">
                <span>${roleLabel} <a href="profile.html?id=${author?.id}" onclick="event.stopPropagation()" class="news-author-link">${authorName}</a></span>
                ${author?.party_name ? `<span class="news-party">· ${author.party_name}</span>` : ''}
            </div>
            <button class="importance-btn ${article.importance_votes > 0 ? 'has-votes' : ''}"
                onclick="voteImportance(event, '${article.id}')"
                title="Marcar como importante">
                🔥 <span class="importance-count">${article.importance_votes || 0}</span>
            </button>
        </div>
    </div>`;
}

// ===== VOTAR IMPORTANCIA =====
async function voteImportance(event, articleId) {
    event.stopPropagation();
    const article = allArticles.find(a => a.id === articleId || a.id === parseInt(articleId));
    if (!article) return;

    try {
        const newCount = (article.importance_votes || 0) + 1;
        await supabaseClient.from('news_articles').update({ importance_votes: newCount }).eq('id', articleId);
        article.importance_votes = newCount;

        // Actualizar el contador en la UI sin recargar todo
        const btn = event.currentTarget;
        if (btn) {
            const countEl = btn.querySelector('.importance-count');
            if (countEl) countEl.textContent = newCount;
            btn.classList.add('has-votes', 'vote-animation');
            setTimeout(() => btn.classList.remove('vote-animation'), 500);
        }

        // Si supera umbral de destacados, re-renderizar destacados
        if (newCount >= 3) renderFeaturedArticles();

        showNotification('¡Marcado como importante!', 'success');
    } catch (err) {
        showNotification('Error al votar: ' + err.message, 'error');
    }
}

// ===== ABRIR ARTÍCULO =====
function openArticle(articleId) {
    const article = allArticles.find(a => a.id === articleId || a.id === parseInt(articleId));
    if (!article) return;

    const modal = document.getElementById('articleModal');
    const title = document.getElementById('articleModalTitle');
    const body = document.getElementById('articleModalBody');
    if (!modal) return;

    const author = article.author;
    const authorName = author?.full_name || author?.username || 'Usuario';
    const authorAvatar = author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&size=40`;
    const areaInfo = AREA_CONFIG[article.area];
    const roleLabel = author?.party_role === 'leader' ? '👑 Líder · ' :
                      author?.party_role === 'representative' ? '🏛️ Representante · ' : '';

    title.textContent = article.title;
    body.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border-light)">
            <img src="${authorAvatar}" alt="${authorName}" style="width:44px;height:44px;border-radius:50%;object-fit:cover">
            <div>
                <div style="font-weight:600">${roleLabel}<a href="profile.html?id=${author?.id}" style="color:var(--primary-purple)">${authorName}</a></div>
                <div style="font-size:0.78rem;color:var(--text-light)">${author?.party_name ? author.party_name + ' · ' : ''}${getTimeAgo(article.created_at)}</div>
            </div>
            ${areaInfo ? `<span style="margin-left:auto;font-size:0.8rem;padding:0.3rem 0.75rem;border-radius:1rem;background:${areaInfo.bg};color:${areaInfo.color};font-weight:600">${areaInfo.emoji} ${areaInfo.label}</span>` : ''}
        </div>
        <div style="line-height:1.8;color:var(--text-secondary);font-size:0.95rem;white-space:pre-wrap">${article.content}</div>
        <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center">
            <button class="importance-btn ${article.importance_votes > 0 ? 'has-votes' : ''}" onclick="voteImportance(event, '${article.id}')">
                🔥 <span class="importance-count">${article.importance_votes || 0}</span> Importante${article.importance_votes !== 1 ? 's' : ''}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="closeModal('articleModal')">Cerrar</button>
        </div>`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== NUEVA NOTICIA =====
async function handleNewArticle(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Publicando...';

    try {
        const { error } = await supabaseClient.from('news_articles').insert({
            title: document.getElementById('articleTitle').value.trim(),
            content: document.getElementById('articleContent').value.trim(),
            author_id: currentUser.id,
            party_id: currentProfile?.party_id || null,
            area: document.getElementById('articleArea').value || null,
            importance_votes: 0,
            is_featured: false
        });

        if (error) throw error;
        showNotification('📰 Noticia publicada exitosamente', 'success');
        closeModal('newArticleModal');
        e.target.reset();
        await loadArticles();
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Publicar';
    }
}

function filterNews(area, btn) {
    currentAreaFilter = area;
    document.querySelectorAll('.news-filters .filter-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderNews();
}

function openNewArticleModal() { openModal('newArticleModal'); }
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
