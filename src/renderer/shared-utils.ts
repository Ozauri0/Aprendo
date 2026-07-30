// shared-utils.ts — Utilidades compartidas por todos los módulos del renderer
// Centraliza funciones duplicadas: toggleTheme, formatFileSize, logMessage,
// updateProgress, clearLog.

/**
 * Alterna el tema claro/oscuro y lo persiste en localStorage.
 * También sincroniza el backgroundColor de la ventana vía IPC.
 */
export function toggleTheme(): void {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('aprendo-theme', next);
    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('window:set-background', next === 'dark' ? '#0f172a' : '#f8fafc');
    } catch { /* preload no disponible */ }
}

/**
 * Establece un tema específico y lo persiste.
 */
export function setTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aprendo-theme', theme);
}

/**
 * Formatea un tamaño en bytes a texto legible (ej: "1.5 MB").
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Agrega un mensaje al contenedor de log con timestamp.
 */
export function logMessage(message: string, type: string = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);

    const logContainer = document.getElementById('logContainer');
    if (!logContainer) {
        console.warn('logContainer no encontrado');
        return;
    }

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-message">${message}</span>
    `;

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Limpia el contenedor de log.
 */
export function clearLog(): void {
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.innerHTML = '';
    }
    logMessage('Log limpiado', 'info');
}

/**
 * Actualiza la barra de progreso con porcentaje y mensaje.
 */
export function updateProgress(current: number, total: number, message: string): void {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    const pct = document.getElementById('progressPercent');
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = message;
    if (pct) pct.textContent = `${percent}%`;
}
