// ===== VARIABLES GLOBALES =====
let currentFilter = 'all';
let posts = [];
let currentUser = null;
let searchDebounce = null;

// Configuración de Supabase
const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function () {
    initializeTheme();
    initializeEventListeners();
    checkAuthStatus();
});

// ===== GESTIÓN DE TEMA (CON PERSISTENCIA) =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('politic-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('politic-theme', next);
}

// ===== AUTENTICACIÓN =====
async function checkAuthStatus() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) { window.location.href = 'index.html'; return; }
    currentUser = data.session.user;
    updateUserInterface();
    await Promise.all([loadPostsFromDB(), loadPopularTags()]);
}

function updateUserInterface() {
    if (!currentUser) return;
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && currentUser.user_metadata?.avatar_url)
        userAvatar.src = currentUser.user_metadata.avatar_url;
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    const userAvatar = document.querySelector('.user-avatar');
    const userDropdown = document.getElementById('userDropdown');
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', (e) => { e.stopPropagation(); userDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => {
            if (!userAvatar.contains(e.target) && !userDropdown.contains(e.target))
                userDropdown.classList.remove('active');
        });
    }

    const logoutLink = document.querySelector('a[href="#logout"]');
    if (logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); logout(); });

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => setActiveFilter(tab.dataset.filter));
    });

    const newPostForm = document.getElementById('newPostForm');
    if (newPostForm) newPostForm.addEventListener('submit', handleNewDebate);

    const newPollForm = document.getElementById('newPollForm');
    if (newPollForm) newPollForm.addEventListener('submit', handleNewPoll);

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMorePosts);

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal(e.target.id);
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => handleSearch(e.target.value), 350);
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar'))
                document.getElementById('searchResults').classList.remove('show');
        });
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
}

function setActiveFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderPosts();
}

// ===== BUSCADOR (tablas: debates + polls) =====
async function handleSearch(query) {
    const searchResults = document.getElementById('searchResults');
    if (!query || query.trim().length < 2) { searchResults.classList.remove('show'); return; }

    try {
        const q = query.trim();
        const { data: debateResults } = await supabaseClient
            .from('debates').select('id, title, category, created_at')
            .ilike('title', `%${q}%`).eq('is_deleted', false).limit(5);

        const { data: pollResults } = await supabaseClient
            .from('polls').select('id, title, created_at')
            .ilike('title', `%${q}%`).limit(3);

        const combined = [
            ...(debateResults || []).map(p => ({ ...p, type: 'debate' })),
            ...(pollResults || []).map(p => ({ ...p, type: 'poll', category: 'poll' }))
        ];

        if (combined.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">Sin resultados para tu búsqueda</div>';
        } else {
            searchResults.innerHTML = combined.map(item => `
                <div class="search-result-item" onclick="scrollToPost('${item.type}-${item.id}')">
                    <span class="result-badge">${getCategoryLabel(item.category)}</span>
                    <div class="result-title">${item.title}</div>
                    <div class="result-meta">${getTimeAgo(item.created_at)}</div>
                </div>`).join('');
        }
        searchResults.classList.add('show');
    } catch (err) { console.error('Error buscando:', err); }
}

function scrollToPost(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '2px solid var(--primary-purple)';
        setTimeout(() => el.style.outline = '', 2000);
    }
    document.getElementById('searchResults').classList.remove('show');
    document.getElementById('searchInput').value = '';
}

// ===== TEMAS POPULARES (tabla: debates, columna: tags, últimas 24h) =====
async function loadPopularTags() {
    const tagsContainer = document.getElementById('popularTags');
    if (!tagsContainer) return;
    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseClient
            .from('debates').select('tags').gte('created_at', since).eq('is_deleted', false);
        if (error) throw error;

        const tagCount = {};
        (data || []).forEach(row => {
            // tags es text[] — Supabase lo devuelve como array de JS
            const tagList = Array.isArray(row.tags) ? row.tags : [];
            tagList.forEach(tag => {
                const t = tag.trim().toLowerCase();
                if (t) tagCount[t] = (tagCount[t] || 0) + 1;
            });
        });

        const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
        tagsContainer.innerHTML = sorted.length === 0
            ? '<span class="topic-tag" style="opacity:0.5">Sin actividad reciente</span>'
            : sorted.map(([tag, count]) =>
                `<span class="topic-tag" title="${count} usos hoy" onclick="filterByTag('${tag}')">#${tag}</span>`
              ).join('');
    } catch (err) {
        console.error('Error cargando tags:', err);
        document.getElementById('popularTags').innerHTML = '<span class="topic-tag loading-tag">Sin datos aún</span>';
    }
}

function filterByTag(tag) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.value = tag; handleSearch(tag); }
}

// ===== CARGA DE POSTS DESDE SUPABASE =====
// Tablas reales: debates, debate_votes, polls, poll_options, poll_votes, profiles
async function loadPostsFromDB() {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = `
        <div class="loading-posts">
            <div class="loading-spinner"></div>
            <p>Cargando publicaciones...</p>
        </div>`;

    try {
        // --- Debates ---
        const { data: debateData, error: debateError } = await supabaseClient
            .from('debates')
            .select(`
                id, title, category, content, tags, created_at,
                upvotes_count, downvotes_count, comments_count, user_id,
                profiles:user_id (full_name, avatar_url)
            `)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(20);

        if (debateError) {
            // Si falla con el join de profiles, intentar sin él
            console.warn('Error con join profiles, intentando sin join:', debateError.message);
            const { data: debateDataSimple, error: debateErrorSimple } = await supabaseClient
                .from('debates')
                .select('id, title, category, content, tags, created_at, upvotes_count, downvotes_count, comments_count, user_id')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(20);
            if (debateErrorSimple) throw debateErrorSimple;
            // Usar datos sin perfil
            posts = (debateDataSimple || []).map(d => ({
                id: d.id, type: 'debate', category: d.category || 'general',
                title: d.title, content: d.content,
                tags: Array.isArray(d.tags) ? d.tags : [],
                author: 'Estudiante', avatar: 'https://ui-avatars.com/api/?name=E&background=6366f1&color=fff&size=40',
                timestamp: d.created_at,
                likes: d.upvotes_count || 0, dislikes: d.downvotes_count || 0, comments: d.comments_count || 0,
                liked: false, disliked: false
            }));
            renderPosts();
            return;
        }

        // --- Encuestas ---
        const { data: pollData, error: pollError } = await supabaseClient
            .from('polls')
            .select(`
                id, title, description, created_at, end_date, is_closed,
                profiles:user_id (full_name, avatar_url),
                poll_options (id, option_text, votes_count)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (pollError) {
            console.warn('Error cargando encuestas:', pollError.message);
        }

        const debatesFormatted = (debateData || []).map(d => ({
            id: d.id, type: 'debate', category: d.category || 'general',
            title: d.title, content: d.content,
            tags: Array.isArray(d.tags) ? d.tags : [],
            author: d.profiles?.full_name || 'Estudiante',
            avatar: d.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.profiles?.full_name || 'E')}&background=6366f1&color=fff&size=40`,
            timestamp: d.created_at,
            likes: d.upvotes_count || 0, dislikes: d.downvotes_count || 0, comments: d.comments_count || 0,
            liked: false, disliked: false
        }));

        const pollsFormatted = (!pollError && pollData) ? pollData.map(p => {
            const options = (p.poll_options || []).map(opt => ({
                id: opt.id, text: opt.option_text, votes: opt.votes_count || 0,
                percentage: 0
            }));
            return {
                id: p.id, poll_id: p.id, type: 'poll', category: 'poll',
                title: p.title, description: p.description,
                author: p.profiles?.full_name || 'Estudiante',
                avatar: p.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.profiles?.full_name || 'E')}&background=6366f1&color=fff&size=40`,
                timestamp: p.created_at, options,
                totalVotes: 0,
                isExpired: p.is_closed || (p.end_date ? new Date(p.end_date) < new Date() : false),
                userVoted: false, likes: 0, comments: 0
            };
        }) : [];

        posts = [...debatesFormatted, ...(typeof pollsFormatted !== 'undefined' ? pollsFormatted : [])]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Verificar votos del usuario actual
        if (currentUser) {
            const { data: myVotes } = await supabaseClient
                .from('debate_votes').select('debate_id, vote_type').eq('user_id', currentUser.id);
            (myVotes || []).forEach(v => {
                const post = posts.find(p => p.id === v.debate_id);
                if (post) { post.liked = v.vote_type === 'up'; post.disliked = v.vote_type === 'down'; }
            });

            const { data: myPollVotes } = await supabaseClient
                .from('poll_votes').select('poll_id').eq('user_id', currentUser.id);
            const votedIds = new Set((myPollVotes || []).map(v => v.poll_id));
            posts.forEach(p => { if (p.type === 'poll' && votedIds.has(p.poll_id)) p.userVoted = true; });
        }

        renderPosts();
    } catch (err) {
        console.error('Error cargando datos:', err);
        postsContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>Error al cargar publicaciones</p>
                <small style="color:var(--text-light);font-size:0.75rem;margin-top:0.5rem;display:block">${err.message}</small>
            </div>`;
    }
}

// ===== MODALES =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}
function openNewPostModal() {
    openModal('newPostModal');
    loadCategoryOptions();
}

async function loadCategoryOptions() {
    const select = document.getElementById('postCategory');
    if (!select) return;

    // Leer categorías únicas que ya existen en la BD
    try {
        const { data } = await supabaseClient
            .from('debates')
            .select('category')
            .eq('is_deleted', false)
            .limit(200);

        if (data && data.length > 0) {
            const existing = [...new Set(data.map(d => d.category).filter(Boolean))].sort();
            populateCategorySelect(select, existing);
            return;
        }
    } catch (e) { /* continuar */ }

    // Valores exactos del CHECK constraint valid_category en la BD
    populateCategorySelect(select, ['elecciones', 'reformas', 'movimientos', 'general']);
}

function populateCategorySelect(select, categories) {
    const labels = {
        elecciones: '🗳️ Elecciones',
        reformas:   '📋 Reformas',
        movimientos:'✊ Movimientos',
        general:    '💬 General'
    };
    select.innerHTML = '<option value="">Seleccionar categoría</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = labels[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
        select.appendChild(opt);
    });
}
function openNewPollModal() { openModal('newPollModal'); }

// ===== CREAR DEBATE (tabla: debates) =====
async function handleNewDebate(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Publicando...';

    const formData = new FormData(e.target);
    // tags es text[] en la BD — enviar como array de JS
    const tags = (formData.get('tags') || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

    try {
        const { error } = await supabaseClient.from('debates').insert([{
            user_id: currentUser.id,
            title: formData.get('title'),
            category: formData.get('category'),
            content: formData.get('content'),
            tags,                    // text[] — array de JS se convierte automáticamente
            upvotes_count: 0,
            downvotes_count: 0,
            comments_count: 0,
            views_count: 0,
            is_active: true,
            is_pinned: false,
            is_deleted: false
        }]);

        if (error) {
            // Si el error es de constraint de categoría, mostrar mensaje útil
            if (error.message.includes('valid_category')) {
                showNotification(
                    'Categoría inválida. Intenta con: general, political, social, economic, cultural o educational',
                    'error'
                );
            } else {
                throw error;
            }
            return;
        }

        closeModal('newPostModal');
        showNotification('Publicación creada exitosamente ✓', 'success');
        await loadPostsFromDB();
        await loadPopularTags();
    } catch (err) {
        console.error('Error creando debate:', err);
        showNotification('Error: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false; submitBtn.textContent = 'Publicar';
    }
}

// ===== CREAR ENCUESTA (tablas: polls + poll_options) =====
async function handleNewPoll(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Creando...';

    const formData = new FormData(e.target);
    const options = Array.from(formData.getAll('option[]')).filter(o => o.trim());
    const duration = parseInt(formData.get('duration')) || 7;
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    try {
        const { data: poll, error: pollError } = await supabaseClient.from('polls').insert([{
            user_id: currentUser.id,
            title: formData.get('title'),
            description: formData.get('description'),
            end_date: expiresAt,
            is_active: true,
            is_closed: false
        }]).select().single();
        if (pollError) throw pollError;

        const { error: optError } = await supabaseClient.from('poll_options').insert(
            options.map(text => ({ poll_id: poll.id, option_text: text, votes_count: 0 }))
        );
        if (optError) throw optError;

        closeModal('newPollModal');
        showNotification('Encuesta creada exitosamente', 'success');
        await loadPostsFromDB();
    } catch (err) {
        showNotification('Error al crear la encuesta: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false; submitBtn.textContent = 'Crear Encuesta';
    }
}

function addPollOption() {
    const pollOptions = document.getElementById('pollOptions');
    if (pollOptions.children.length < 10) {
        const input = document.createElement('input');
        input.type = 'text'; input.name = 'option[]';
        input.placeholder = `Opción ${pollOptions.children.length + 1}`;
        input.required = true;
        pollOptions.appendChild(input);
    }
}

// ===== RENDER =====
function renderPosts() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;

    let filtered = currentFilter === 'all' ? posts : posts.filter(post => {
        if (currentFilter === 'debates') return post.type === 'debate';
        if (currentFilter === 'polls') return post.type === 'poll';
        if (currentFilter === 'announcements') return post.category === 'announcement';
        return true;
    });

    if (filtered.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>No hay publicaciones que mostrar</p>
            </div>`;
        return;
    }

    postsContainer.innerHTML = '';
    filtered.forEach(post => {
        const el = document.createElement('div');
        el.className = 'post-card fade-in';
        el.id = `${post.type}-${post.id}`;
        el.innerHTML = post.type === 'poll' ? createPollHTML(post) : createDebateHTML(post);
        postsContainer.appendChild(el);
    });
}

function createDebateHTML(post) {
    const tagsHTML = (post.tags || []).map(tag => `<span class="post-tag">#${tag}</span>`).join('');
    return `
        <div class="post-header">
            <img src="${post.avatar}" alt="${post.author}" class="post-avatar">
            <div class="post-meta">
                <div class="post-author">${post.author}</div>
                <div class="post-time">${getTimeAgo(post.timestamp)}</div>
            </div>
            <span class="post-category ${post.category}">${getCategoryLabel(post.category)}</span>
        </div>
        <h3 class="post-title">${post.title}</h3>
        <div class="post-content">${post.content}</div>
        ${post.tags?.length ? `<div class="post-tags">${tagsHTML}</div>` : ''}
        <div class="post-actions">
            <div class="post-action ${post.liked ? 'liked' : ''}" onclick="voteDebate('${post.id}', 'upvote')">
                <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                <span>${post.likes}</span>
            </div>
            <div class="post-action ${post.disliked ? 'disliked' : ''}" onclick="voteDebate('${post.id}', 'downvote')">
                <svg viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                <span>${post.dislikes}</span>
            </div>
            <div class="post-action" onclick="openCommentsModal('${post.id}')">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>${post.comments}</span>
            </div>
            <div class="post-action" onclick="sharePost('${post.id}')">
                <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Compartir
            </div>
        </div>`;
}

function createPollHTML(poll) {
    let optionsHTML = (poll.userVoted || poll.isExpired)
        ? poll.options.map(opt => `
            <div class="poll-option voted">
                <span>${opt.text}</span>
                <div class="poll-results">${opt.percentage}% (${opt.votes} votos)</div>
                <div class="poll-progress" style="width: ${opt.percentage}%"></div>
            </div>`).join('')
        : poll.options.map(opt => `
            <div class="poll-option" onclick="voteInPoll('${poll.poll_id}', '${opt.id}')">
                <input type="radio" name="poll_${poll.poll_id}">
                <span>${opt.text}</span>
            </div>`).join('');

    return `
        <div class="post-header">
            <img src="${poll.avatar}" alt="${poll.author}" class="post-avatar">
            <div class="post-meta">
                <div class="post-author">${poll.author}</div>
                <div class="post-time">${getTimeAgo(poll.timestamp)}</div>
            </div>
            <span class="post-category poll">Encuesta</span>
        </div>
        <h3 class="post-title">${poll.title}</h3>
        ${poll.description ? `<div class="post-content">${poll.description}</div>` : ''}
        <div class="poll-options">${optionsHTML}</div>
        ${poll.userVoted || poll.isExpired ? `<div class="poll-results" style="margin-top:0.5rem">Total: ${poll.totalVotes} votos</div>` : ''}
        ${poll.isExpired ? '<div class="poll-expired">Encuesta finalizada</div>' : ''}
        <div class="post-actions">
            <div class="post-action" onclick="openCommentsModal('${poll.id}')">
                <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>${poll.comments}</span>
            </div>
        </div>`;
}

// ===== VOTAR EN DEBATE (tabla: debate_votes) =====
async function voteDebate(debateId, voteType) {
    if (!currentUser) return;
    const post = posts.find(p => p.id === debateId);
    if (!post) return;

    try {
        const { data: existing } = await supabaseClient
            .from('debate_votes').select('id, vote_type')
            .eq('debate_id', debateId).eq('user_id', currentUser.id).maybeSingle();

        if (existing) {
            if (existing.vote_type === voteType) {
                await supabaseClient.from('debate_votes').delete().eq('id', existing.id);
                if (voteType === 'upvote') { post.liked = false; post.likes = Math.max(0, post.likes - 1); }
                else { post.disliked = false; post.dislikes = Math.max(0, post.dislikes - 1); }
            } else {
                await supabaseClient.from('debate_votes').update({ vote_type: voteType }).eq('id', existing.id);
                if (voteType === 'upvote') { post.liked = true; post.disliked = false; post.likes++; post.dislikes = Math.max(0, post.dislikes - 1); }
                else { post.disliked = true; post.liked = false; post.dislikes++; post.likes = Math.max(0, post.likes - 1); }
            }
        } else {
            await supabaseClient.from('debate_votes').insert([{ debate_id: debateId, user_id: currentUser.id, vote_type: voteType }]);
            if (voteType === 'upvote') { post.liked = true; post.likes++; }
            else { post.disliked = true; post.dislikes++; }
        }

        // Actualizar contadores en BD
        await supabaseClient.from('debates')
            .update({ upvotes_count: post.likes, downvotes_count: post.dislikes })
            .eq('id', debateId);

        renderPosts();
    } catch (err) {
        console.error('Error votando:', err);
        showNotification('Error al registrar voto', 'error');
    }
}

// ===== VOTAR EN ENCUESTA (tabla: poll_votes) =====
async function voteInPoll(pollId, optionId) {
    if (!currentUser) return;
    try {
        const { error } = await supabaseClient.from('poll_votes').insert([{
            poll_id: pollId, option_id: optionId, user_id: currentUser.id
        }]);
        if (error) throw error;

        const poll = posts.find(p => p.poll_id === pollId);
        const option = poll?.options.find(o => o.id === optionId);
        if (option) {
            await supabaseClient.from('poll_options').update({ votes_count: (option.votes || 0) + 1 }).eq('id', optionId);
        }

        showNotification('Voto registrado exitosamente', 'success');
        await loadPostsFromDB();
    } catch (err) {
        if (err.code === '23505') showNotification('Ya has votado en esta encuesta', 'info');
        else showNotification('Error al votar: ' + err.message, 'error');
    }
}

function sharePost(postId) {
    if (navigator.share) navigator.share({ title: 'POLITIC-SANDBOX', url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); showNotification('Enlace copiado al portapapeles', 'success'); }
}

function openCommentsModal(postId) { showNotification('Comentarios próximamente disponibles', 'info'); }

// ===== CARGAR MÁS (tabla: debates) =====
async function loadMorePosts() {
    const btn = document.getElementById('loadMoreBtn');
    if (!btn) return;
    btn.disabled = true; btn.textContent = 'Cargando...';

    try {
        const offset = posts.filter(p => p.type === 'debate').length;
        const { data, error } = await supabaseClient
            .from('debates')
            .select(`id, title, category, content, tags, created_at, upvotes_count, downvotes_count, comments_count, profiles:user_id (full_name, avatar_url)`)
            .eq('is_deleted', false).order('created_at', { ascending: false })
            .range(offset, offset + 9);

        if (error) throw error;

        if (data?.length > 0) {
            posts = [...posts, ...data.map(d => ({
                id: d.id, type: 'debate', category: d.category || 'debate',
                title: d.title, content: d.content,
                tags: Array.isArray(d.tags) ? d.tags : [],
                author: d.profiles?.full_name || 'Estudiante',
                avatar: d.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.profiles?.full_name || 'E')}&background=6366f1&color=fff&size=40`,
                timestamp: d.created_at,
                likes: d.upvotes_count || 0, dislikes: d.downvotes_count || 0, comments: d.comments_count || 0,
                liked: false, disliked: false
            }))];
            renderPosts();
            showNotification(`${data.length} publicaciones más cargadas`, 'success');
        } else {
            showNotification('No hay más publicaciones', 'info');
        }
    } catch (err) { showNotification('Error cargando más publicaciones', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Cargar más publicaciones'; }
}

// ===== UTILIDADES =====
function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)} días`;
    return new Date(timestamp).toLocaleDateString('es-MX');
}

function getCategoryLabel(category) {
    return {
        elecciones:  '🗳️ Elecciones',
        reformas:    '📋 Reformas',
        movimientos: '✊ Movimientos',
        general:     '💬 General',
        poll:        '📊 Encuesta'
    }[category] || category;
}

function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `<div class="notification-content"><span>${message}</span><button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button></div>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
}