// title-bar.ts - Barra de título custom moderna
import { getIcon } from '../icons';

let mainWindow: Electron.BrowserWindow | null = null;

try {
    // Solo disponible cuando nodeIntegration está activo
    const { remote } = require('electron');
    mainWindow = remote.getCurrentWindow();
} catch (e) {
    // Fallback: usar IPC
}

export function renderTitleBar(title: string = 'Aprendo UCT', subtitle?: string): string {
    const platform = process.platform;
    const isMac = platform === 'darwin';

    // En macOS los controles nativos (semáforos) se dibujan solos con frameless,
    // pero como usamos frame: false, no hay nada nativo. 
    // Usamos controles custom en todas las plataformas para consistencia.

    return `
    <div class="title-bar" id="titleBar">
        <div class="title-bar-drag"></div>
        <div class="title-bar-controls">
            <button class="title-bar-btn title-bar-minimize" id="tbMinimize" title="Minimizar">
                ${getIcon('minus', 14)}
            </button>
            <button class="title-bar-btn title-bar-maximize" id="tbMaximize" title="Maximizar">
                ${getIcon('maximize2', 14)}
            </button>
            <button class="title-bar-btn title-bar-close" id="tbClose" title="Cerrar">
                ${getIcon('x', 14)}
            </button>
        </div>
    </div>
    `;
}

export function setupTitleBarActions(): void {
    const minimizeBtn = document.getElementById('tbMinimize');
    const maximizeBtn = document.getElementById('tbMaximize');
    const closeBtn = document.getElementById('tbClose');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            if (mainWindow) {
                mainWindow.minimize();
            } else {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('window:minimize');
            }
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            if (mainWindow) {
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                    maximizeBtn.innerHTML = getIcon('maximize2', 14);
                    maximizeBtn.title = 'Maximizar';
                } else {
                    mainWindow.maximize();
                    maximizeBtn.innerHTML = getIcon('minimize2', 14);
                    maximizeBtn.title = 'Restaurar';
                }
            } else {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('window:maximize');
            }
        });

        // Actualizar icono y estado visual vía IPC
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('window:maximize-changed', (_event: any, isMax: boolean) => {
                if (maximizeBtn) {
                    maximizeBtn.innerHTML = isMax ? getIcon('minimize2', 14) : getIcon('maximize2', 14);
                    maximizeBtn.title = isMax ? 'Restaurar' : 'Maximizar';
                }
                document.documentElement.classList.toggle('is-maximized', isMax);
            });
        } catch (_e) {}

        // Actualizar icono si la ventana se maximiza/restaura desde el sistema
        if (mainWindow) {
            mainWindow.on('maximize', () => {
                if (maximizeBtn) {
                    maximizeBtn.innerHTML = getIcon('minimize2', 14);
                    maximizeBtn.title = 'Restaurar';
                }
            });
            mainWindow.on('unmaximize', () => {
                if (maximizeBtn) {
                    maximizeBtn.innerHTML = getIcon('maximize2', 14);
                    maximizeBtn.title = 'Maximizar';
                }
            });
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (mainWindow) {
                mainWindow.close();
            } else {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('window:close');
            }
        });
    }
    setupResizeHandles();
}

export function setupResizeHandles(): void {
    const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    edges.forEach(edge => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${edge}`;
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('window:resize-start', edge);
        });
        document.body.appendChild(handle);
    });
    // Enviar resize-end al soltar el mouse (también al perder foco como seguridad)
    document.addEventListener('mouseup', () => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('window:resize-end');
    });
    window.addEventListener('blur', () => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('window:resize-end');
    });
}
