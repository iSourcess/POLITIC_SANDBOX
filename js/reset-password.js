const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

document.addEventListener('DOMContentLoaded', () => {
    // Agregar botones de visibilidad
    setupPasswordToggle('newPassword');
    setupPasswordToggle('confirmNewPassword');

    // Event listeners para validación en tiempo real (blur e input)
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearErrors);
    });
});

// Validaciones similares a login.js
function isValidPassword(password) {
    // Al menos una mayúscula, una minúscula y un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    return passwordRegex.test(password);
}

function showFieldError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    const inputElement = document.getElementById(elementId.replace('Error', ''));
    
    if (errorElement) {
        errorElement.textContent = message;
    }
    if (inputElement) {
        inputElement.classList.add('error');
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

function validateField(event) {
    const fieldId = event.target.id;
    const value = event.target.value.trim();
    
    clearFieldError(fieldId);
    
    switch (fieldId) {
        case 'newPassword':
            if (value && value.length < 8) {
                showFieldError('newPasswordError', 'Mínimo 8 caracteres');
            } else if (value && !isValidPassword(value)) {
                showFieldError('newPasswordError', 'Incluye mayúsculas, minúsculas y números');
            }
            break;
            
        case 'confirmNewPassword':
            const newPassword = document.getElementById('newPassword').value;
            if (value && value !== newPassword) {
                showFieldError('confirmNewPasswordError', 'Las contraseñas no coinciden');
            }
            break;
    }
}

// Configurar botón para visualizar contraseña
function setupPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Crear contenedor para posicionar el botón
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    
    // Insertar el contenedor antes del input y mover el input adentro
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Crear botón
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = '👁️';
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.right = '10px';
    toggleBtn.style.background = 'none';
    toggleBtn.style.border = 'none';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.fontSize = '1.2rem';
    toggleBtn.title = 'Mostrar/Ocultar contraseña';
    
    // Ajustar padding del input para que el texto no se superponga con el botón
    input.style.paddingRight = '40px';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';

    wrapper.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            input.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    });
}

document.getElementById('resetForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Limpiar errores previos
    clearFieldError('newPassword');
    clearFieldError('confirmNewPassword');

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    let hasError = false;

    // 1. Validar requisitos de la contraseña
    if (newPassword.length < 8 || !isValidPassword(newPassword)) {
        showMessage('La contraseña no cumple con los requisitos solicitados', 'error');
        if (newPassword.length < 8) {
            showFieldError('newPasswordError', 'Mínimo 8 caracteres');
        } else {
            showFieldError('newPasswordError', 'Incluye mayúsculas, minúsculas y números');
        }
        hasError = true;
    }

    // 2. Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
        if (!hasError) {
            showMessage('Las contraseñas no coinciden', 'error');
        }
        showFieldError('confirmNewPasswordError', 'Las contraseñas no coinciden');
        hasError = true;
    }

    if (hasError) return;

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        // 3. Validar si la contraseña es idéntica a la anterior u otros errores de la API
        if (error.message.toLowerCase().includes('different from the old password') || error.message.toLowerCase().includes('same as')) {
            showMessage('La nueva contraseña no puede ser idéntica a la anterior', 'error');
        } else {
            showMessage('Error al actualizar la contraseña: ' + error.message, 'error');
        }
    } else {
        showMessage('¡Contraseña actualizada! Redirigiendo al login...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
});

function showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = message;
    container.appendChild(div);
    
    setTimeout(() => {
        if (div.parentNode) {
            div.remove();
        }
    }, 5000);
}