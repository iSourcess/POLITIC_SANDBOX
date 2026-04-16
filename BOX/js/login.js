// Estado global de la aplicación
let currentForm = 'login';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const messageContainer = document.getElementById('messageContainer');
const tabButtons = document.querySelectorAll('.tab-btn');

// API Base URL - cambiar por la URL de tu servidor Python
const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkAuthStatus();
    
    // Agregar event listeners para los botones de las pestañas
    document.getElementById('loginTab').addEventListener('click', showLogin);
    document.getElementById('registerTab').addEventListener('click', showRegister);
});

// Configurar event listeners
function initializeEventListeners() {
    // Event listeners para los formularios
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Event listeners para validación en tiempo real
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearErrors);
    });
    
    // Event listener para el select de universidad
    document.getElementById('university').addEventListener('change', validateField);
}

// Cambiar entre formularios de login y registro
function showLogin() {
    currentForm = 'login';
    updateFormDisplay();
}

function showRegister() {
    currentForm = 'register';
    updateFormDisplay();
}

function updateFormDisplay() {
    const forms = document.querySelectorAll('.auth-form');
    const buttons = document.querySelectorAll('.tab-btn');
    
    forms.forEach(form => form.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (currentForm === 'login') {
        loginForm.classList.add('active');
        buttons[0].classList.add('active');
    } else {
        registerForm.classList.add('active');
        buttons[1].classList.add('active');
    }
    
    clearAllErrors();
}

// Manejar el inicio de sesión
async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!validateLoginForm(email, password)) return;

    showLoading();

    // Supabase maneja la persistencia de sesión con persistSession
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
        options: {
            // Si rememberMe es false, la sesión dura solo mientras el navegador esté abierto
            persistSession: rememberMe
        }
    });

    if (error) {
        showMessage('Correo o contraseña incorrectos.', 'error');
    } else {
        if (rememberMe) {
            localStorage.setItem('rememberAuth', 'true');
        } else {
            localStorage.removeItem('rememberAuth');
        }
        showMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }

    hideLoading();
}

// Manejar el registro
async function handleRegister(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        university: formData.get('university')
    };

    if (!validateRegisterForm(userData)) return;

    showLoading();

    const { data, error } = await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                full_name: userData.name,
                university: userData.university
            }
        }
    });

    if (error) {
        showMessage('Error al crear la cuenta: ' + error.message, 'error');
    } else {
        showMessage('Cuenta creada. Revisa tu correo para confirmarla.', 'success');
        setTimeout(() => {
            showLogin();
            document.getElementById('loginEmail').value = userData.email;
        }, 2000);
    }

    hideLoading();
}

// Validaciones
function validateLoginForm(email, password) {
    let isValid = true;
    
    if (!email) {
        showFieldError('loginEmailError', 'El correo electrónico es requerido');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('loginEmailError', 'Ingresa un correo electrónico válido');
        isValid = false;
    }
    
    if (!password) {
        showFieldError('loginPasswordError', 'La contraseña es requerida');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('loginPasswordError', 'La contraseña debe tener al menos 6 caracteres');
        isValid = false;
    }
    
    return isValid;
}

function validateRegisterForm(userData) {
    let isValid = true;
    
    // Validar nombre
    if (!userData.name.trim()) {
        showFieldError('registerNameError', 'El nombre es requerido');
        isValid = false;
    } else if (userData.name.trim().length < 2) {
        showFieldError('registerNameError', 'El nombre debe tener al menos 2 caracteres');
        isValid = false;
    }
    
    // Validar email
    if (!userData.email) {
        showFieldError('registerEmailError', 'El correo electrónico es requerido');
        isValid = false;
    } else if (!isValidEmail(userData.email)) {
        showFieldError('registerEmailError', 'Ingresa un correo electrónico válido');
        isValid = false;
    }
    
    // Validar contraseña
    if (!userData.password) {
        showFieldError('registerPasswordError', 'La contraseña es requerida');
        isValid = false;
    } else if (userData.password.length < 8) {
        showFieldError('registerPasswordError', 'La contraseña debe tener al menos 8 caracteres');
        isValid = false;
    } else if (!isValidPassword(userData.password)) {
        showFieldError('registerPasswordError', 'La contraseña debe incluir mayúsculas, minúsculas y números');
        isValid = false;
    }
    
    // Validar confirmación de contraseña
    if (userData.password !== userData.confirmPassword) {
        showFieldError('confirmPasswordError', 'Las contraseñas no coinciden');
        isValid = false;
    }
    
    // Validar universidad
    if (!userData.university) {
        showFieldError('universityError', 'Selecciona tu universidad');
        isValid = false;
    }
    
    // Validar términos y condiciones
    const acceptTerms = document.getElementById('acceptTerms');
    if (acceptTerms && !acceptTerms.checked) {
        showMessage('Debes aceptar los términos y condiciones', 'error');
        isValid = false;
    }
    
    return isValid;
}

function validateField(event) {
    const field = event.target;
    const fieldId = field.id;
    const value = field.value.trim();
    
    clearFieldError(fieldId);
    
    switch (fieldId) {
        case 'loginEmail':
        case 'registerEmail':
            if (value && !isValidEmail(value)) {
                showFieldError(fieldId + 'Error', 'Ingresa un correo electrónico válido');
            }
            break;
            
        case 'registerPassword':
            if (value && value.length < 8) {
                showFieldError('registerPasswordError', 'Mínimo 8 caracteres');
            } else if (value && !isValidPassword(value)) {
                showFieldError('registerPasswordError', 'Incluye mayúsculas, minúsculas y números');
            }
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('registerPassword').value;
            if (value && value !== password) {
                showFieldError('confirmPasswordError', 'Las contraseñas no coinciden');
            }
            break;
            
        case 'registerName':
            if (value && value.length < 2) {
                showFieldError('registerNameError', 'Mínimo 2 caracteres');
            }
            break;
    }
}

// Funciones de utilidad para validación
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPassword(password) {
    // Al menos una mayúscula, una minúscula y un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    return passwordRegex.test(password);
}

// Manejo de errores
function handleLoginError(data) {
    if (data.field_errors) {
        Object.keys(data.field_errors).forEach(field => {
            const errorElement = field === 'email' ? 'loginEmailError' : 'loginPasswordError';
            showFieldError(errorElement, data.field_errors[field]);
        });
    } else {
        showMessage(data.message || 'Error al iniciar sesión', 'error');
    }
}

function handleRegisterError(data) {
    if (data.field_errors) {
        Object.keys(data.field_errors).forEach(field => {
            const errorElement = 'register' + field.charAt(0).toUpperCase() + field.slice(1) + 'Error';
            showFieldError(errorElement, data.field_errors[field]);
        });
    } else {
        showMessage(data.message || 'Error al crear la cuenta', 'error');
    }
}

function showFieldError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    const inputElement = errorElement.previousElementSibling;
    
    if (errorElement) {
        errorElement.textContent = message;
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }
}

function clearFieldError(fieldId) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = '';
    }
    if (inputElement) {
        inputElement.classList.remove('error');
    }
}

function clearErrors(event) {
    const fieldId = event.target.id;
    clearFieldError(fieldId);
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    const inputElements = document.querySelectorAll('input.error');
    
    errorElements.forEach(element => {
        element.textContent = '';
    });
    
    inputElements.forEach(element => {
        element.classList.remove('error');
    });
}

// UI Helper functions
function showLoading() {
    loadingOverlay.classList.add('show');
    disableFormButtons();
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
    enableFormButtons();
}

function disableFormButtons() {
    const buttons = document.querySelectorAll('.submit-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.textContent = 'Procesando...';
    });
}

function enableFormButtons() {
    const loginBtn = loginForm.querySelector('.submit-btn');
    const registerBtn = registerForm.querySelector('.submit-btn');
    
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar Sesión';
    
    registerBtn.disabled = false;
    registerBtn.textContent = 'Crear Cuenta';
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto-remove message after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
    
    // Allow manual close by clicking
    messageDiv.addEventListener('click', () => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    });
}

// Verificar estado de autenticación al cargar la página
async function checkAuthStatus() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        window.location.href = 'dashboard.html';
    }
}


// Funciones para manejar la recuperación de contraseña
async function showForgotPassword() {
    const email = document.getElementById('loginEmail').value.trim();

    // Si ya tiene un email escrito, lo usamos directamente
    if (email && isValidEmail(email)) {
        await sendPasswordReset(email);
    } else {
        // Pedir el email con un prompt simple
        const inputEmail = prompt('Ingresa tu correo electrónico para recuperar tu contraseña:');
        if (inputEmail && isValidEmail(inputEmail)) {
            await sendPasswordReset(inputEmail);
        } else if (inputEmail !== null) {
            showMessage('Por favor ingresa un correo válido.', 'error');
        }
    }
}

async function sendPasswordReset(email) {
    showLoading();

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    });

    hideLoading();

    if (error) {
        showMessage('Error al enviar el correo. Intenta más tarde.', 'error');
    } else {
        showMessage(`Se envió un enlace de recuperación a ${email}. Revisa tu bandeja de entrada.`, 'success');
    }
}

// Event listener para el enlace de "¿Olvidaste tu contraseña?"
document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForgotPassword();
        });
    }
    
    const termsLink = document.querySelector('.terms-link');
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showMessage('Términos y condiciones próximamente disponibles', 'info');
        });
    }
});

// Funciones para mejorar la experiencia de usuario
function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

// Función para autocompletar universidades (opcional)
function setupUniversityAutocomplete() {
    const universitySelect = document.getElementById('university');
    const universities = [
        'Universidad Nacional Autónoma de México',
        'Instituto Politécnico Nacional',
        'Universidad Autónoma Metropolitana',
        'Tecnológico de Monterrey',
        'Universidad Iberoamericana',
        'Universidad La Salle',
        'Universidad Anáhuac',
        'Universidad del Valle de México'
    ];
    
    // Agregar más opciones dinámicamente si es necesario
    universities.forEach(university => {
        if (!Array.from(universitySelect.options).find(option => option.text === university)) {
            const option = document.createElement('option');
            option.value = university.toLowerCase().replace(/\s+/g, '-');
            option.textContent = university;
            universitySelect.appendChild(option);
        }
    });
}

// Función para manejar errores de red
function handleNetworkError(error) {
    console.error('Network error:', error);
    if (!navigator.onLine) {
        showMessage('No hay conexión a internet. Verifica tu conexión e intenta nuevamente.', 'error');
    } else {
        showMessage('Error de conexión. Por favor, intenta más tarde.', 'error');
    }
}

// Función para logging (útil para debugging)
function logActivity(action, data = {}) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[POLITIC-SANDBOX] ${action}:`, data);
    }
}

// Export functions for potential use in other modules
window.PoliticSandboxAuth = {
    showLogin,
    showRegister,
    validateToken,
    showMessage,
    clearAllErrors
};