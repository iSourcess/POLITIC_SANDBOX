// Script para manejar el registro de usuarios

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Obtener los valores del formulario
            const fullname = document.getElementById('fullname').value.trim();
            const email = document.getElementById('email').value.trim();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validación básica
            if (!fullname || !email || !username || !password || !confirmPassword) {
                showError('Por favor, complete todos los campos.');
                return;
            }
            
            // Validar formato de email
            if (!isValidEmail(email)) {
                showError('Por favor, ingrese un correo electrónico válido.');
                return;
            }
            
            // Validar que las contraseñas coincidan
            if (password !== confirmPassword) {
                showError('Las contraseñas no coinciden.');
                return;
            }
            
            // Validar complejidad de contraseña
            if (password.length < 8) {
                showError('La contraseña debe tener al menos 8 caracteres.');
                return;
            }
            
            // Simulación de envío al servidor
            register(fullname, email, username, password);
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
            const firstFormElement = registerForm.querySelector('.form-group');
            registerForm.insertBefore(errorDiv, firstFormElement);
        }
        
        // Establecer el mensaje y mostrar
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
    
    // Función para manejar el registro
    function register(fullname, email, username, password) {
        // En un caso real, aquí se haría una petición al servidor
        // Por ahora, simulamos una respuesta
        
        // Simulación de carga
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Procesando...';
        submitButton.disabled = true;
        
        // Simulación de tiempo de respuesta del servidor
        setTimeout(() => {
            // Simulación de registro exitoso
            // En un caso real, el servidor verificaría si el usuario ya existe
            
            // Mostrar mensaje de éxito
            alert('¡Registro exitoso! Ahora puede iniciar sesión.');
            
            // Redireccionar a la página de login
            window.location.href = 'index.html';
            
        }, 1000);
    }
});