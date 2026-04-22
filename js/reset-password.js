const { createClient } = supabase;
const supabaseClient = createClient(
    'https://kbcsmxpxiupjidpqiogk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiY3NteHB4aXVwamlkcHFpb2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjIzNjAsImV4cCI6MjA4NTAzODM2MH0.D2Yak5p_vDlbP9EXjhdKdlxMVS9lHqUv6vUk4FRpyrc'
);

document.getElementById('resetForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword.length < 8) {
        document.getElementById('newPasswordError').textContent = 'Mínimo 8 caracteres';
        return;
    }

    if (newPassword !== confirmPassword) {
        document.getElementById('confirmNewPasswordError').textContent = 'Las contraseñas no coinciden';
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        showMessage('Error al actualizar la contraseña. El enlace puede haber expirado.', 'error');
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
    setTimeout(() => div.remove(), 5000);
}