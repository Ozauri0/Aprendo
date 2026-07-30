// renderer.ts - Lógica del frontend de la aplicación
import * as calificaciones from './calificaciones';
import * as informes from './informes';
import * as asistencia from './asistencia';
import * as config from './config';
import * as descargas from './descargas';
import { getIcon } from './icons';
import { renderHeader, applyStoredTheme } from './components/header';
import { toggleTheme } from './shared-utils';
import { renderFooter } from './components/footer';
import { renderTitleBar, setupTitleBarActions } from './components/title-bar';

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    try {
        mountCurrentRoute();
        const hideOverlay = showLoadingOverlay('Cargando dependencias...');
        // Precalentar dependencias pesadas en el renderer y cerrar overlay al terminar
        import('exceljs').then(() => {
            console.log('[warmup] exceljs cargado en renderer');
            hideOverlay();
        }).catch(err => {
            console.warn('[warmup] Error precalentando en renderer:', err);
            hideOverlay();
        });
        // Fallback: asegurar que el overlay se quite aunque falle el warmup o tarde demasiado
        setTimeout(hideOverlay, 8000);
    } catch (err) {
        console.error('[renderer] Error al montar ruta:', err);
        const fallback = document.createElement('div');
        fallback.style.cssText = 'padding:16px;font-family:Segoe UI, sans-serif;color:#b91c1c;';
        fallback.innerText = 'Error al iniciar la UI: ' + (err?.message || err);
        document.body.innerHTML = '';
        document.body.appendChild(fallback);
    }
});

// Inicializar la aplicación
function initializeApp() {
    updateStatus();
    setupEventListeners();
    console.log('Aplicación Aprendo inicializada correctamente');
}

// Router simple por hash (?view=... o #view)
function getCurrentView(): string {
    const hash = window.location.hash.replace('#', '');
    const searchParams = new URLSearchParams(window.location.search);
    const view = searchParams.get('view');
    return (hash || view || 'home').toLowerCase();
}

function mountCurrentRoute() {
    const view = getCurrentView();
    switch (view) {
    case 'calificaciones':
        if (typeof calificaciones.renderCalificacionesPage === 'function') {
            calificaciones.renderCalificacionesPage(injectStylesFromFiles, navigate);
        }
        break;
    case 'informes':
        if (typeof informes.renderInformesPage === 'function') {
            informes.renderInformesPage(injectStylesFromFiles, navigate);
        }
        break;
    case 'asistencia':
        if (typeof asistencia.renderAsistenciaPage === 'function') {
            asistencia.renderAsistenciaPage(injectStylesFromFiles, navigate);
        }
        break;
    case 'config':
        if (typeof config.renderConfigPage === 'function') {
            config.renderConfigPage(injectStylesFromFiles, navigate);
        }
        break;
    case 'descargas':
        if (typeof descargas.renderDescargasPage === 'function') {
            descargas.renderDescargasPage(injectStylesFromFiles, navigate);
        }
        break;
    case 'home':
    default:
        renderHomePage();
        break;
    }
}

function navigate(view: string) {
    window.location.hash = `#${view}`;
    mountCurrentRoute();
}
// Exponer navegación global por si alguna vista lo requiere
(window as any).navigate = navigate;

// Overlay de carga simple mientras se precalientan librerías
function showLoadingOverlay(message: string) {
        if (document.getElementById('app-loading-overlay')) {
                return () => hideLoadingOverlay();
        }

        const style = document.createElement('style');
        style.id = 'app-loading-overlay-style';
        style.textContent = `
            #app-loading-overlay {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-primary, #f8fafc);
                backdrop-filter: blur(4px);
                z-index: 9999;
                color: var(--text-primary, #1e293b);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                flex-direction: column;
                gap: 16px;
                transition: opacity 0.3s ease;
            }
            #app-loading-overlay .spinner {
                width: 44px;
                height: 44px;
                border: 3px solid var(--border-color, #e2e8f0);
                border-top-color: var(--uct-primary, #003366);
                border-radius: 50%;
                animation: spin 0.85s linear infinite;
            }
            #app-loading-overlay .message {
                font-size: 0.9375rem;
                font-weight: 600;
                color: var(--text-secondary, #475569);
                letter-spacing: 0.01em;
            }
            #app-loading-overlay .brand {
                font-size: 1.25rem;
                font-weight: 700;
                color: var(--uct-primary, #003366);
                letter-spacing: -0.01em;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
        `;

        const overlay = document.createElement('div');
        overlay.id = 'app-loading-overlay';
        overlay.setAttribute('role', 'alert');
        overlay.setAttribute('aria-live', 'assertive');
        overlay.setAttribute('aria-label', message || 'Cargando');
        overlay.innerHTML = `
            <div class="spinner" aria-hidden="true"></div>
            <div class="brand">Aprendo UCT</div>
            <div class="message">${message || 'Cargando...'}</div>
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        return () => hideLoadingOverlay();
}

function hideLoadingOverlay() {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) overlay.remove();
        const style = document.getElementById('app-loading-overlay-style');
        if (style) style.remove();
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
    navigate('calificaciones');
}

function openInformes() {
    showNotification('Abriendo consolidador de informes...', 'info');
    navigate('informes');
}

function openAsistencia() {
    showNotification('Abriendo consolidador de asistencia...', 'info');
    navigate('asistencia');
}



function openConfig() {
    showNotification('Abriendo configuración...', 'info');
    navigate('config');
}

function openDescargas() {
    showNotification('Abriendo gestor de descargas...', 'info');
    navigate('descargas');
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    // Asegurar que el contenedor de toasts existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const iconMap = {
        info: '&#9432;',
        success: '&#10003;',
        warning: '&#9888;',
        error: '&#10007;'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${iconMap[type] || iconMap.info}</span>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Cerrar notificación">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-eliminar después de 3.5 segundos
    setTimeout(() => {
        toast.style.transition = 'all 0.3s ease-out';
        toast.style.transform = 'translateX(110%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3500);
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

// Render del markup de la página principal directamente desde TS
function renderHomePage() {
    document.title = 'Aprendo UCT — Sistema de Consolidación de Calificaciones';

    // Asegurar enlaces a estilos si se renderiza en un HTML mínimo
    injectStylesFromFiles([
        'styles.css',
        'global-styles.css'
    ]);

    // Aplicar tema guardado
    applyStoredTheme();

    document.body.innerHTML = `
    ${renderTitleBar('Aprendo UCT', 'Sistema de Consolidación de Calificaciones')}
    <div class="page-scroll">
        <div class="container">
            ${renderHeader({
                title: 'Aprendo UCT',
                subtitle: 'Sistema de Consolidación de Calificaciones',
                isHomePage: true,
                showConfigButton: true
            })}

                <main id="main-content" role="main">
                    <section class="welcome-section" aria-labelledby="welcome-heading">
                        <h2 id="welcome-heading">¡Bienvenido!</h2>
                        <p>Plataforma integral para la gestión de calificaciones y reportes académicos DGIA de la Universidad Católica de Temuco.</p>
                    </section>

                    <section class="features-grid" aria-label="Módulos disponibles">
                        <article class="feature-card">
                            <div class="feature-icon">${getIcon('chart-bar', 48)}</div>
                            <h3>Consolidar Calificaciones</h3>
                            <p>Consolida y procesa archivos de calificaciones Excel de manera eficiente</p>
                            <button class="btn btn-primary" onclick="openCalificaciones()" aria-label="Abrir módulo de calificaciones">
                                <span class="icon">${getIcon('chevron-right', 18)}</span>
                                Abrir Módulo
                            </button>
                        </article>

                        <article class="feature-card">
                            <div class="feature-icon">${getIcon('chart-line', 48)}</div>
                            <h3>Consolidar Informes</h3>
                            <p>Consolida archivos de logs e informes de actividad en un solo Excel</p>
                            <button class="btn btn-primary" onclick="openInformes()" aria-label="Abrir módulo de consolidación de informes">
                                <span class="icon">${getIcon('chevron-right', 18)}</span>
                                Consolidar
                            </button>
                        </article>

                        <article class="feature-card">
                            <div class="feature-icon">${getIcon('clipboard-list', 48)}</div>
                            <h3>Consolidar Asistencia</h3>
                            <p>Agrupa los Excel de asistencia por curso en un archivo con una hoja por módulo</p>
                            <button class="btn btn-primary" onclick="openAsistencia()" aria-label="Abrir módulo de consolidación de asistencia">
                                <span class="icon">${getIcon('chevron-right', 18)}</span>
                                Consolidar
                            </button>
                        </article>

                        <article class="feature-card">
                            <div class="feature-icon">${getIcon('download', 48)}</div>
                            <h3>Gestor de Descargas</h3>
                            <p>Descarga reportes y datos directamente desde Aprendo UCT</p>
                            <button class="btn btn-primary" onclick="openDescargas()" aria-label="Abrir gestor de descargas">
                                <span class="icon">${getIcon('chevron-right', 18)}</span>
                                Descargar
                            </button>
                        </article>
                    </section>

                </main>
            </div>

            ${renderFooter()}
        </div>`;
    initializeApp();
    setupTitleBarActions();
}

// Inyecta CSS como <link> relativos (funciona en file:// sin dependencias de Node)
export function injectStylesFromFiles(files: string[]) {
    const head = document.head;
    files.forEach((file) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        head.appendChild(link);
    });
}

// Exportar funciones para uso global
(window as any).openCalificaciones = openCalificaciones;
(window as any).openInformes = openInformes;
(window as any).openAsistencia = openAsistencia;
(window as any).openConfig = openConfig;
(window as any).openDescargas = openDescargas;
(window as any).toggleTheme = toggleTheme;

// Mensaje de bienvenida en consola
console.log(`
Aprendo - Sistema de Gestión de Calificaciones
Fecha: ${formatDate(new Date())}
Electron Version: ${process.versions.electron}
Node.js Version: ${process.versions.node}
Chrome Version: ${process.versions.chrome}
`);

// Mostrar errores en pantalla para depurar pantallas en blanco
window.addEventListener('error', (event) => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:12px;background:#fee2e2;color:#b91c1c;font-family:Segoe UI, sans-serif;z-index:99999;border-top:1px solid #fecaca;';
    box.textContent = `Error: ${event.message}`;
    document.body.appendChild(box);
});

window.addEventListener('unhandledrejection', (event) => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:12px;background:#fef3c7;color:#92400e;font-family:Segoe UI, sans-serif;z-index:99999;border-top:1px solid #fcd34d;';
    box.textContent = `Promesa rechazada: ${event.reason}`;
    document.body.appendChild(box);
});
