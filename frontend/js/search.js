document.addEventListener('DOMContentLoaded', function() {
    // Configuración de la API
    const API_URL = 'https://api.politicsandbox.com';
    
    // Obtener parámetros de búsqueda de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    let currentPage = parseInt(urlParams.get('page')) || 1;
    let currentCategory = urlParams.get('category') || '';
    let currentSort = urlParams.get('sort') || 'relevance';
    
    // Referencias a elementos del DOM
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchQueryDisplay = document.getElementById('search-query');
    const searchResultsContainer = document.getElementById('search-results');
    const paginationContainer = document.getElementById('pagination');
    const filterCategory = document.getElementById('filter-category');
    const filterSort = document.getElementById('filter-sort');
    
    // Verificar autenticación al cargar la página
    checkAuth();
    
    // Inicializar búsqueda
    initSearch();
    
    // Event listeners
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const newQuery = searchInput.value.trim();
            if (newQuery) {
                updateSearch(newQuery, currentCategory, currentSort, 1);
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const newQuery = searchInput.value.trim();
                if (newQuery) {
                    updateSearch(newQuery, currentCategory, currentSort, 1);
                }
            }
        });
    }
    
    if (filterCategory) {
        filterCategory.addEventListener('change', function() {
            currentCategory = this.value;
            updateSearch(query, currentCategory, currentSort, 1);
        });
    }
    
    if (filterSort) {
        filterSort.addEventListener('change', function() {
            currentSort = this.value;
            updateSearch(query, currentCategory, currentSort, 1);
        });
    }
    
    /**
     * Inicializa la búsqueda con los parámetros de la URL
     */
    function initSearch() {
        // Establecer valores iniciales en los filtros
        if (filterCategory) filterCategory.value = currentCategory;
        if (filterSort) filterSort.value = currentSort;
        if (searchInput) searchInput.value = query;
        
        // Mostrar término de búsqueda
        if (searchQueryDisplay) {
            searchQueryDisplay.textContent = query ? `Resultados para: "${query}"` : 'Todos los debates';
        }
        
        // Realizar búsqueda
        performSearch(query, currentCategory, currentSort, currentPage);
    }
    
    /**
     * Actualiza la búsqueda con nuevos parámetros
     */
    function updateSearch(newQuery, category, sort, page) {
        // Construir nueva URL
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        // Actualizar parámetros
        params.set('q', newQuery);
        if (category) params.set('category', category);
        else params.delete('category');
        
        if (sort && sort !== 'relevance') params.set('sort', sort);
        else params.delete('sort');
        
        if (page && page > 1) params.set('page', page);
        else params.delete('page');
        
        // Actualizar URL sin recargar la página
        window.history.pushState({}, '', url);
        
        // Actualizar variables globales
        query = newQuery;
        currentCategory = category;
        currentSort = sort;
        currentPage = page;
        
        // Actualizar visualización del término de búsqueda
        if (searchQueryDisplay) {
            searchQueryDisplay.textContent = query ? `Resultados para: "${query}"` : 'Todos los debates';
        }
        
        // Realizar búsqueda
        performSearch(query, category, sort, page);
    }
    
    /**
     * Realiza la búsqueda en la API
     */
    function performSearch(query, category, sort, page) {
        // Mostrar indicador de carga
        searchResultsContainer.innerHTML = '<div class="loading">Buscando debates...</div>';
        
        // Construir URL de la API
        let apiUrl = `${API_URL}/api/debates/search?q=${encodeURIComponent(query)}&page=${page}`;
        
        if (category) apiUrl += `&category=${category}`;
        if (sort) apiUrl += `&sort=${sort}`;
        
        // Realizar petición a la API
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al realizar la búsqueda');
                }
                return response.json();
            })
            .then(data => {
                if (data.results.length === 0) {
                    searchResultsContainer.innerHTML = '<div class="no-results">No se encontraron resultados para tu búsqueda</div>';
                    paginationContainer.innerHTML = '';
                    return;
                }
                
                // Renderizar resultados
                renderSearchResults(data.results);
                
                // Renderizar paginación
                renderPagination(data.pagination);
            })
            .catch(error => {
                console.error('Error:', error);
                searchResultsContainer.innerHTML = `<div class="error">Error al realizar la búsqueda: ${error.message}</div>`;
                paginationContainer.innerHTML = '';
            });
    }
    
    /**
     * Renderiza los resultados de la búsqueda
     */
    function renderSearchResults(results) {
        searchResultsContainer.innerHTML = '';
        
        results.forEach(debate => {
            // Crear elemento de resultado
            const resultEl = document.createElement('div');
            resultEl.className = 'search-result';
            
            // Truncar contenido si es muy largo
            const truncatedContent = debate.content.length > 200 ? 
                debate.content.substring(0, 200) + '...' : 
                debate.content;
            
            // Formatear fecha
            const date = new Date(debate.created_at);
            const formattedDate = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Estructura HTML del resultado
            resultEl.innerHTML = `
                <h2><a href="debate.html?id=${debate.id}">${debate.title}</a></h2>
                <div class="result-meta">
                    <span class="result-category">${debate.category.name}</span>
                    <span class="result-author">Por: ${debate.author.name || 'Anónimo'}</span>
                    <span class="result-date">${formattedDate}</span>
                </div>
                <p class="result-content">${truncatedContent}</p>
                <div class="result-stats">
                    <span class="result-comments"><i class="fas fa-comment"></i> ${debate.comments_count || 0}</span>
                    <span class="result-votes"><i class="fas fa-vote-yea"></i> ${debate.votes_count || 0}</span>
                </div>
            `;
            
            // Añadir evento de clic para ir a la página del debate
            resultEl.addEventListener('click', function(e) {
                // No redirigir si se hizo clic en el enlace (ya tiene su propio comportamiento)
                if (e.target.tagName !== 'A') {
                    window.location.href = `debate.html?id=${debate.id}`;
                }
            });
            
            // Añadir al contenedor
            searchResultsContainer.appendChild(resultEl);
        });
    }
    
    /**
     * Renderiza la paginación
     */
    function renderPagination(pagination) {
        if (!pagination || !paginationContainer) return;
        
        const { current_page, total_pages } = pagination;
        
        // No mostrar paginación si solo hay una página
        if (total_pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Botón anterior
        if (current_page > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="${current_page - 1}">Anterior</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn disabled">Anterior</button>`;
        }
        
        // Números de página
        const maxVisiblePages = 5;
        let startPage = Math.max(1, current_page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(total_pages, startPage + maxVisiblePages - 1);
        
        // Ajustar si estamos cerca del final
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Primera página y elipsis
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        // Páginas visibles
        for (let i = startPage; i <= endPage; i++) {
            if (i === current_page) {
                paginationHTML += `<button class="pagination-btn active" data-page="${i}">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-btn" data-page="${i}">${i}</button>`;
            }
        }
        
        // Última página y elipsis
        if (endPage < total_pages) {
            if (endPage < total_pages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${total_pages}">${total_pages}</button>`;
        }
        
        // Botón siguiente
        if (current_page < total_pages) {
            paginationHTML += `<button class="pagination-btn" data-page="${current_page + 1}">Siguiente</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn disabled">Siguiente</button>`;
        }
        
        // Actualizar contenedor
        paginationContainer.innerHTML = paginationHTML;
        
        // Añadir event listeners a los botones de paginación
        const paginationBtns = paginationContainer.querySelectorAll('.pagination-btn:not(.disabled)');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                if (page && page !== currentPage) {
                    updateSearch(query, currentCategory, currentSort, page);
                    // Desplazarse al inicio de los resultados
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
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
});