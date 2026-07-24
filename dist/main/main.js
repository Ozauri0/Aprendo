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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const download_manager_1 = require("./download-manager");
const logger_1 = require("./logger");
// Loguear info del sistema lo antes posible (útil para diagnóstico en PCs remotos)
logger_1.logger.logSystemInfo();
logger_1.logger.info('main', 'Proceso main inicializado');
let mainWindow = null;
// Precalienta dependencias pesadas para evitar congelamientos al primer uso
async function warmMainDependencies() {
    try {
        await Promise.all([
            Promise.resolve().then(() => __importStar(require('puppeteer'))),
            Promise.resolve().then(() => __importStar(require('exceljs')))
        ]);
        console.log('[warmup] puppeteer y exceljs cargados en el proceso principal');
    }
    catch (err) {
        console.warn('[warmup] Error precalentando dependencias:', err);
    }
}
function createWindow() {
    // Ajustar al área de trabajo (sin cubrir la barra de tareas)
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    mainWindow = new electron_1.BrowserWindow({
        width,
        height,
        title: 'Aprendo UCT — Sistema de Consolidación de Calificaciones',
        frame: false,
        thickFrame: false,
        backgroundColor: '#f8fafc',
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/preload.js'),
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: true
        },
        show: false,
        fullscreen: false,
        maximizable: false,
        autoHideMenuBar: true
    });
    const indexPath = path_1.default.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
    mainWindow.once('ready-to-show', () => {
        const workArea = electron_1.screen.getPrimaryDisplay().workArea;
        // Guardar un tamaño de restauración por defecto (75% centrado)
        const rw = Math.round(workArea.width * 0.75);
        const rh = Math.round(workArea.height * 0.75);
        savedBounds = {
            x: workArea.x + Math.round((workArea.width - rw) / 2),
            y: workArea.y + Math.round((workArea.height - rh) / 2),
            width: rw,
            height: rh
        };
        mainWindow?.setBounds({ x: workArea.x, y: workArea.y, width: workArea.width, height: workArea.height });
        pseudoMaximized = true;
        mainWindow?.show();
        // Notificar al renderer que la ventana arranca maximizada
        mainWindow?.webContents.send('window:maximize-changed', true);
        // Abrir DevTools automáticamente en desarrollo para depurar pantallas en blanco
        if (!electron_1.app.isPackaged) {
            mainWindow?.webContents.openDevTools({ mode: 'detach' });
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
let pseudoMaximized = false;
let savedBounds = null;
function registerWindowHandlers() {
    electron_1.ipcMain.on('window:minimize', () => {
        mainWindow?.minimize();
    });
    electron_1.ipcMain.on('window:maximize', () => {
        if (!mainWindow)
            return;
        if (pseudoMaximized) {
            if (savedBounds)
                mainWindow.setBounds(savedBounds);
            pseudoMaximized = false;
            mainWindow.webContents.send('window:maximize-changed', false);
        }
        else {
            savedBounds = mainWindow.getBounds();
            const { x, y, width, height } = electron_1.screen.getPrimaryDisplay().workArea;
            mainWindow.setBounds({ x, y, width, height });
            pseudoMaximized = true;
            mainWindow.webContents.send('window:maximize-changed', true);
        }
    });
    electron_1.ipcMain.on('window:close', () => {
        mainWindow?.close();
    });
    electron_1.ipcMain.on('window:set-background', (_e, color) => {
        mainWindow?.setBackgroundColor(color);
    });
    // Resize personalizado (thickFrame: false suprime el overlay de tamaño de Windows)
    const RESIZE_MIN = { width: 600, height: 400 };
    let resizeInterval = null;
    let resizeEdge = '';
    const resizeStart = { bounds: { x: 0, y: 0, width: 0, height: 0 }, cursor: { x: 0, y: 0 } };
    const stopResize = () => {
        if (resizeInterval) {
            clearInterval(resizeInterval);
            resizeInterval = null;
        }
        if (!mainWindow)
            return;
        const b = mainWindow.getBounds();
        const wa = electron_1.screen.getPrimaryDisplay().workArea;
        const isMax = b.x <= wa.x && b.y <= wa.y && b.width >= wa.width && b.height >= wa.height;
        pseudoMaximized = isMax;
        mainWindow.webContents.send('window:maximize-changed', isMax);
        if (!isMax)
            savedBounds = b;
    };
    electron_1.ipcMain.on('window:resize-start', (_e, edge) => {
        if (!mainWindow)
            return;
        resizeEdge = edge;
        resizeStart.bounds = mainWindow.getBounds();
        resizeStart.cursor = electron_1.screen.getCursorScreenPoint();
        if (resizeInterval)
            clearInterval(resizeInterval);
        resizeInterval = setInterval(() => {
            if (!mainWindow) {
                stopResize();
                return;
            }
            const cur = electron_1.screen.getCursorScreenPoint();
            const dx = cur.x - resizeStart.cursor.x;
            const dy = cur.y - resizeStart.cursor.y;
            const s = resizeStart.bounds;
            let { x, y, width, height } = s;
            if (resizeEdge.includes('e'))
                width = Math.max(RESIZE_MIN.width, s.width + dx);
            if (resizeEdge.includes('s'))
                height = Math.max(RESIZE_MIN.height, s.height + dy);
            if (resizeEdge.includes('w')) {
                width = Math.max(RESIZE_MIN.width, s.width - dx);
                x = s.x + s.width - width;
            }
            if (resizeEdge.includes('n')) {
                height = Math.max(RESIZE_MIN.height, s.height - dy);
                y = s.y + s.height - height;
            }
            mainWindow.setBounds({ x, y, width, height });
        }, 16);
    });
    electron_1.ipcMain.on('window:resize-end', () => stopResize());
}
// Guarda varios archivos en una carpeta elegida por el usuario (un solo dialog).
// Usado por el módulo de asistencia para evitar 30 dialogs de "Save As" al consolidar.
function registerBatchSaveHandler() {
    electron_1.ipcMain.handle('files:save-batch', async (_e, args) => {
        if (!mainWindow) {
            return { success: false, count: 0, errors: ['No hay ventana activa'] };
        }
        if (!args?.files?.length) {
            return { success: false, count: 0, errors: ['No hay archivos para guardar'] };
        }
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            title: 'Selecciona la carpeta donde guardar los archivos',
            buttonLabel: 'Guardar aquí',
            properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, count: 0, cancelled: true };
        }
        const folder = result.filePaths[0];
        const errors = [];
        let count = 0;
        for (const file of args.files) {
            try {
                const filePath = path_1.default.join(folder, file.name);
                await fs_1.promises.writeFile(filePath, Buffer.from(file.buffer));
                count++;
            }
            catch (err) {
                errors.push(`${file.name}: ${err.message}`);
            }
        }
        return {
            success: errors.length === 0,
            count,
            folderPath: folder,
            errors: errors.length > 0 ? errors : undefined,
        };
    });
    // === Diagnóstico y logs ===
    electron_1.ipcMain.handle('diagnostics:get-info', async () => {
        const os = require('os');
        const logs = await logger_1.logger.listLogFiles();
        return {
            app: {
                name: electron_1.app.getName(),
                version: electron_1.app.getVersion(),
                locale: electron_1.app.getLocale(),
                isPackaged: electron_1.app.isPackaged,
                userData: electron_1.app.getPath('userData'),
                downloads: electron_1.app.getPath('downloads'),
            },
            system: {
                platform: process.platform,
                arch: process.arch,
                osVersion: os.version(),
                osRelease: os.release(),
                hostname: os.hostname(),
                username: os.userInfo().username,
            },
            runtimes: {
                node: process.versions.node,
                electron: process.versions.electron,
                chrome: process.versions.chrome,
                v8: process.versions.v8,
            },
            log: {
                dir: await logger_1.logger.getLogDir(),
                currentFile: await logger_1.logger.getCurrentLogPath(),
                files: logs,
            },
        };
    });
    electron_1.ipcMain.handle('diagnostics:get-logs', async (_e, maxBytes) => {
        return await logger_1.logger.readAllLogs(maxBytes ?? 200_000);
    });
    electron_1.ipcMain.handle('diagnostics:open-log-dir', async () => {
        const dir = await logger_1.logger.getLogDir();
        const { shell } = require('electron');
        await shell.openPath(dir);
        return { success: true, path: dir };
    });
    electron_1.ipcMain.handle('diagnostics:copy-logs', async () => {
        const text = await logger_1.logger.readAllLogs(500_000);
        const { clipboard } = require('electron');
        clipboard.writeText(text);
        return { success: true, bytes: text.length };
    });
}
electron_1.app.whenReady().then(async () => {
    (0, download_manager_1.registerDownloadHandlers)();
    registerWindowHandlers();
    registerBatchSaveHandler();
    // Calentar dependencias en segundo plano antes de mostrar UI
    warmMainDependencies();
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.Menu.setApplicationMenu(null);
