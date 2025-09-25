// renderer.js - Lógica del frontend de la aplicación

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Inicializar la aplicación
function initializeApp() {
    updateStatus();
    setupEventListeners();
    console.log('Aplicación Aprendo inicializada correctamente');
}

// Configurar event listeners
function setupEventListeners() {
    // Agregar eventos adicionales aquí si es necesario
    console.log('Event listeners configurados');
}

// Actualizar el estado del sistema
function updateStatus() {
    const now = new Date();
    const lastUpdateElement = document.getElementById('lastUpdate');
    const filesProcessedElement = document.getElementById('filesProcessed');
    
    if (lastUpdateElement) {
        lastUpdateElement.textContent = now.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    if (filesProcessedElement) {
        // Aquí podrías obtener el número real de archivos procesados
        filesProcessedElement.textContent = '20'; // Ejemplo estático
    }
}

// Funciones para los botones
function openCalificaciones() {
    showNotification('Abriendo módulo de calificaciones...', 'info');
    window.location.href = 'calificaciones.html';
}

function openInformes() {
    showNotification('Abriendo consolidador de informes...', 'info');
    window.location.href = 'informes.html';
}



function openConfig() {
    showNotification('Abriendo configuración...', 'info');
    // Aquí implementarías la lógica para abrir la configuración
    console.log('Abriendo configuración');
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos de la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'info' ? '#4299e1' : type === 'success' ? '#48bb78' : '#f56565'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Funciones de utilidad
function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function logMessage(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] ${message}`);
}

// Exportar funciones para uso global
window.openCalificaciones = openCalificaciones;
window.openInformes = openInformes;
window.openConfig = openConfig;

// Mensaje de bienvenida en consola
console.log(`
🚀 Aprendo - Sistema de Gestión de Calificaciones
📅 Fecha: ${formatDate(new Date())}
⚡ Electron Version: ${process.versions.electron}
🌐 Node.js Version: ${process.versions.node}
💻 Chrome Version: ${process.versions.chrome}
`);
