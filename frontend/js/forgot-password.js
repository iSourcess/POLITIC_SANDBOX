// Script para manejar la recuperación de contraseña

document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Obtener el correo electrónico
            const email = document.getElementById('email').value.trim();
            
            // Validación básica
            if (!email) {
                showError('Por favor, ingrese su correo electrónico.');
                return;
            }
            
            // Validar formato de email
            if (!isValidEmail(email)) {
                showError('Por favor, ingrese un correo electrónico válido.');
                return;
            }
            
            // Simulación de envío al servidor
            sendResetLink(email);
        });
    }
    
    // Función para validar formato de email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Función para mostrar mensajes de error
    function showError(message) {
        // Verificar si ya existe un mensaje de error
        let errorDiv = document.querySelector('.error-message');
        
        if (!errorDiv) {
            // Crear el elemento para el mensaje de error
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            
            // Insertar antes del primer elemento del formulario
            const firstFormElement = forgotPasswordForm.querySelector('.form-group');
            forgotPasswordForm.insertBefore(errorDiv, firstFormElement);
        }
        
        // Establecer el mensaje y mostrar
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
    
    // Función para mostrar mensajes de éxito
    function showSuccess(message) {
        // Verificar si ya existe un mensaje de éxito
        let successDiv = document.querySelector('.success-message');
        
        if (!successDiv) {
            // Crear el elemento para el mensaje de éxito
            successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            
            // Insertar antes del primer elemento del formulario
            const firstFormElement = forgotPasswordForm.querySelector('.form-group');
            forgotPasswordForm.insertBefore(successDiv, firstFormElement);
        }
        
        // Establecer el mensaje y mostrar
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    
    // Función para enviar enlace de restablecimiento
    function sendResetLink(email) {
        // En un caso real, aquí se haría una petición al servidor
        // Por ahora, simulamos una respuesta
        
        // Simulación de carga
        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;
        
        // Simulación de tiempo de respuesta del servidor
        setTimeout(() => {
            // Ocultar el formulario
            forgotPasswordForm.style.display = 'none';
            
            // Mostrar mensaje de éxito
            const container = document.querySelector('.forgot-password-form');
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <h3>Instrucciones Enviadas</h3>
                <p>Hemos enviado instrucciones para restablecer su contraseña a: <strong>${email}</strong></p>
                <p>Por favor, revise su bandeja de entrada y siga las instrucciones.</p>
                <div class="form-links">
                    <a href="index.html">Volver al inicio de sesión</a>
                </div>
            `;
            container.appendChild(successMessage);
            
        }, 1000);
    }
});