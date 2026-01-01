"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectStylesFromFiles = injectStylesFromFiles;
// @ts-nocheck
// renderer.ts - Lógica del frontend de la aplicación
const calificaciones = require('./calificaciones');
const informes = require('./informes');
const config = require('./config');
const descargas = require('./descargas');
const { icons, getIcon, iconSpan } = require('./icons');
const { renderHeader, applyStoredTheme } = require('./components/header');
const fs = require('fs');
const path = require('path');
// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    try {
        mountCurrentRoute();
        const hideOverlay = showLoadingOverlay('Cargando dependencias...');
        // Precalentar dependencias pesadas en el renderer y cerrar overlay al terminar
        Promise.all([
            Promise.resolve().then(() => __importStar(require('exceljs'))),
            Promise.resolve().then(() => __importStar(require('puppeteer')))
        ]).then(() => {
            console.log('[warmup] exceljs y puppeteer cargados en renderer');
            hideOverlay();
        }).catch(err => {
            console.warn('[warmup] Error precalentando en renderer:', err);
            hideOverlay();
        });
        // Fallback: asegurar que el overlay se quite aunque falle el warmup o tarde demasiado
        setTimeout(hideOverlay, 8000);
    }
    catch (err) {
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
function getCurrentView() {
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
function navigate(view) {
    window.location.hash = `#${view}`;
    mountCurrentRoute();
}
// Exponer navegación global por si alguna vista lo requiere
window.navigate = navigate;
// Overlay de carga simple mientras se precalientan librerías
function showLoadingOverlay(message) {
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
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(2px);
                z-index: 9999;
                color: #111;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                flex-direction: column;
                gap: 12px;
            }
            #app-loading-overlay .spinner {
                width: 42px;
                height: 42px;
                border: 4px solid #e2e8f0;
                border-top-color: #2563eb;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            #app-loading-overlay .message {
                font-size: 15px;
                font-weight: 600;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
        `;
    const overlay = document.createElement('div');
    overlay.id = 'app-loading-overlay';
    overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="message">${message || 'Cargando...'}</div>
        `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    return () => hideLoadingOverlay();
}
function hideLoadingOverlay() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay)
        overlay.remove();
    const style = document.getElementById('app-loading-overlay-style');
    if (style)
        style.remove();
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
// Render del markup de la página principal directamente desde TS
function renderHomePage() {
    document.title = 'Aprendo UCT - Sistema de Gestión de Calificaciones';
    // Asegurar enlaces a estilos si se renderiza en un HTML mínimo
    injectStylesFromFiles([
        'styles.css',
        'global-styles.css'
    ]);
    // Aplicar tema guardado
    applyStoredTheme();
    document.body.innerHTML = `
        <div class="container">
            ${renderHeader({
        title: 'Aprendo UCT',
        subtitle: 'Sistema de Gestión de Calificaciones',
        isHomePage: true,
        showConfigButton: true
    })}

            <main>
                <div class="welcome-section">
                    <h2>¡Bienvenido!</h2>
                    <p>Plataforma integral para la gestión de calificaciones y reportes académicos de la Universidad Católica de Temuco.</p>
                </div>

                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">${getIcon('chart-bar', 48)}</div>
                        <h3>Consolidar Calificaciones</h3>
                        <p>Consolida y procesa archivos de calificaciones Excel de manera eficiente</p>
                        <button class="btn btn-primary" onclick="openCalificaciones()">
                            <span class="icon">${getIcon('chevron-right', 18)}</span>
                            Abrir Módulo
                        </button>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">${getIcon('chart-line', 48)}</div>
                        <h3>Consolidar Informes</h3>
                        <p>Consolida archivos de logs e informes de actividad en un solo Excel</p>
                        <button class="btn btn-primary" onclick="openInformes()">
                            <span class="icon">${getIcon('chevron-right', 18)}</span>
                            Consolidar
                        </button>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">${getIcon('download', 48)}</div>
                        <h3>Gestor de Descargas</h3>
                        <p>Descarga reportes y datos directamente desde Aprendo UCT</p>
                        <button class="btn btn-primary" onclick="openDescargas()">
                            <span class="icon">${getIcon('chevron-right', 18)}</span>
                            Descargar
                        </button>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">${getIcon('settings', 48)}</div>
                        <h3>Configuración</h3>
                        <p>Personaliza parámetros y preferencias del sistema</p>
                        <button class="btn btn-secondary" onclick="openConfig()">
                            <span class="icon">${getIcon('chevron-right', 18)}</span>
                            Configurar
                        </button>
                    </div>
                </div>

            </main>

            <footer>
                <div class="footer-brand">
                    <span>Universidad Católica de Temuco</span>
                </div>
                <p>Aprendo UCT v1.0.0 - Desarrollado por Christian Ferrer</p>
            </footer>
        </div>`;
    initializeApp();
}
// Inyecta CSS leyendo archivos locales (evita depender de <link> en HTML)
function injectStylesFromFiles(files) {
    const head = document.head;
    files.forEach((file) => {
        try {
            const cssPath = path.join(__dirname, file);
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            const styleEl = document.createElement('style');
            styleEl.textContent = cssContent;
            head.appendChild(styleEl);
        }
        catch (err) {
            console.warn(`[styles] No se pudo cargar ${file}:`, err);
        }
    });
}
// Funciones de tema claro/oscuro
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('aprendo-theme', newTheme);
}
// Exportar funciones para uso global
window.openCalificaciones = openCalificaciones;
window.openInformes = openInformes;
window.openConfig = openConfig;
window.openDescargas = openDescargas;
window.toggleTheme = toggleTheme;
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
