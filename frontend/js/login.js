// ============================================
// POLITIC-SANDBOX - LOGIN CON SUPABASE
// ============================================

// ⚠️ IMPORTANTE: Las credenciales se inicializan en el HTML
// Este archivo asume que 'supabase' ya está disponible globalmente

// Verificar que Supabase esté disponible
if (typeof supabase === 'undefined') {
    console.error('❌ ERROR: Supabase no está inicializado. Verifica que el SDK y las credenciales estén en el HTML.');
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando POLITIC-SANDBOX...');
    
    // Verificar si ya hay sesión activa
    await checkExistingSession();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Verificar si viene de redirect de OAuth
    handleOAuthRedirect();
});

// ============================================
// VERIFICAR SESIÓN EXISTENTE
// ============================================

async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        console.log('✅ Sesión activa detectada');
        showLoadingOverlay('Redirigiendo...');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
    }
}

// ============================================
// MANEJO DE OAUTH REDIRECT
// ============================================

async function handleOAuthRedirect() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error en OAuth:', error);
        showMessage('Error al iniciar sesión con Google', 'error');
        hideLoadingOverlay();
        return;
    }
    
    if (session) {
        console.log('✅ Login con OAuth exitoso');
        showMessage('¡Bienvenido!', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
    }
}

// ============================================
// LOGIN CON EMAIL Y CONTRASEÑA
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    // Validaciones
    if (!email) {
        showFieldError('loginEmail', 'El correo electrónico es requerido');
        return;
    }
    
    if (!isValidEmail(email)) {
        showFieldError('loginEmail', 'Ingresa un correo electrónico válido');
        return;
    }
    
    if (!password) {
        showFieldError('loginPassword', 'La contraseña es requerida');
        return;
    }
    
    if (password.length < 6) {
        showFieldError('loginPassword', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    clearAllErrors();
    showLoadingOverlay('Iniciando sesión...');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Login exitoso:', data);
        
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        hideLoadingOverlay();
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
        
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('❌ Error en login:', error);
        
        if (error.message.includes('Invalid login credentials')) {
            showMessage('Correo o contraseña incorrectos', 'error');
            showFieldError('loginPassword', 'Credenciales incorrectas');
        } else if (error.message.includes('Email not confirmed')) {
            showMessage('Por favor confirma tu correo electrónico', 'error');
        } else {
            showMessage(error.message || 'Error al iniciar sesión', 'error');
        }
    }
}

// ============================================
// REGISTRO DE NUEVO USUARIO
// ============================================

async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const university = document.getElementById('university').value;
    const acceptTerms = document.getElementById('acceptTerms')?.checked || false;
    
    clearAllErrors();
    
    // Validaciones
    if (!fullName) {
        showFieldError('registerName', 'El nombre es requerido');
        return;
    }
    
    if (fullName.length < 3) {
        showFieldError('registerName', 'El nombre debe tener al menos 3 caracteres');
        return;
    }
    
    if (!email) {
        showFieldError('registerEmail', 'El correo electrónico es requerido');
        return;
    }
    
    if (!isValidEmail(email)) {
        showFieldError('registerEmail', 'Ingresa un correo electrónico válido');
        return;
    }
    
    if (!password) {
        showFieldError('registerPassword', 'La contraseña es requerida');
        return;
    }
    
    if (password.length < 6) {
        showFieldError('registerPassword', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (!confirmPassword) {
        showFieldError('confirmPassword', 'Confirma tu contraseña');
        return;
    }
    
    if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Las contraseñas no coinciden');
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!university) {
        showFieldError('university', 'Selecciona tu universidad');
        return;
    }
    
    if (!acceptTerms) {
        showMessage('Debes aceptar los términos y condiciones', 'error');
        return;
    }
    
    showLoadingOverlay('Creando cuenta...');
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    university: university
                },
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;

        console.log('✅ Registro exitoso:', data);
        
        hideLoadingOverlay();
        
        document.getElementById('registerForm').reset();
        
        showMessage('¡Cuenta creada exitosamente! Revisa tu correo para confirmar tu cuenta.', 'success');
        
        setTimeout(() => {
            document.getElementById('loginTab')?.click();
            
            const loginEmailInput = document.getElementById('loginEmail');
            if (loginEmailInput) {
                loginEmailInput.value = email;
            }
        }, 2000);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('❌ Error en registro:', error);
        
        if (error.message.includes('already registered')) {
            showMessage('Este correo ya está registrado', 'error');
            showFieldError('registerEmail', 'Este correo ya está en uso');
        } else if (error.message.includes('Password should be')) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            showFieldError('registerPassword', 'Contraseña muy corta');
        } else {
            showMessage(error.message || 'Error al crear la cuenta', 'error');
        }
    }
}

// ============================================
// LOGIN CON GOOGLE (OAUTH)
// ============================================

async function loginWithGoogle() {
    console.log('🔵 Iniciando login con Google...');
    
    showLoadingOverlay('Redirigiendo a Google...');
    
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/home.html`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });

        if (error) throw error;
        
        console.log('✅ Redirigiendo a Google OAuth...');
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('❌ Error al iniciar sesión con Google:', error);
        showMessage('Error al conectar con Google. Intenta de nuevo.', 'error');
    }
}

// ============================================
// RECUPERAR CONTRASEÑA
// ============================================

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        showFieldError('loginEmail', 'Ingresa tu correo electrónico');
        showMessage('Por favor ingresa tu correo electrónico primero', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showFieldError('loginEmail', 'Ingresa un correo electrónico válido');
        return;
    }
    
    showLoadingOverlay('Enviando correo...');
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });

        if (error) throw error;

        hideLoadingOverlay();
        showMessage('Correo de recuperación enviado. Revisa tu bandeja de entrada.', 'success');
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error al enviar correo de recuperación:', error);
        showMessage('Error al enviar el correo. Verifica que el correo sea correcto.', 'error');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Formulario de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Formulario de Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Botones de Google
    const googleButtons = document.querySelectorAll('.btn-google, #googleLoginBtn, [data-login="google"]');
    googleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            loginWithGoogle();
        });
    });
    
    // Link de "Olvidé mi contraseña"
    const forgotPasswordLinks = document.querySelectorAll('.forgot-password, [data-action="forgot-password"]');
    forgotPasswordLinks.forEach(link => {
        link.addEventListener('click', handleForgotPassword);
    });
    
    // Tabs
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            document.getElementById('loginForm')?.classList.add('active');
            document.getElementById('registerForm')?.classList.remove('active');
            clearAllErrors();
        });
        
        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            document.getElementById('registerForm')?.classList.add('active');
            document.getElementById('loginForm')?.classList.remove('active');
            clearAllErrors();
        });
    }
    
    // Limpiar errores al escribir
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            clearFieldError(this.id);
        });
    });
}

// ============================================
// VALIDACIONES
// ============================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============================================
// MANEJO DE ERRORES
// ============================================

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    if (inputElement) {
        inputElement.classList.add('error');
        inputElement.focus();
    }
}

function clearFieldError(fieldId) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    if (inputElement) {
        inputElement.classList.remove('error');
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.classList.remove('error');
    });
}

// ============================================
// UI HELPERS
// ============================================

function showLoadingOverlay(message = 'Procesando...') {
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        document.body.appendChild(overlay);
    } else {
        const p = overlay.querySelector('p');
        if (p) p.textContent = message;
    }
    
    overlay.style.display = 'flex';
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showMessage(message, type = 'info') {
    let container = document.getElementById('messageContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'messageContainer';
        container.className = 'message-container';
        document.body.appendChild(container);
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    messageEl.innerHTML = `
        <span class="message-icon">${icon}</span>
        <span class="message-text">${message}</span>
    `;
    
    container.appendChild(messageEl);
    
    setTimeout(() => messageEl.classList.add('show'), 10);
    
    setTimeout(() => {
        messageEl.classList.remove('show');
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}

console.log('📄 POLITIC-SANDBOX Login Script cargado correctamente');
console.log('🔐 Sistema de autenticación listo');