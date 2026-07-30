import { app, BrowserWindow, Menu, screen, ipcMain, dialog } from 'electron';
import path from 'path';
import { promises as fsp } from 'fs';
import { registerDownloadHandlers } from './download-manager';
import { logger } from './logger';

// Loguear info del sistema lo antes posible (útil para diagnóstico en PCs remotos)
logger.logSystemInfo();
logger.info('main', 'Proceso main inicializado');

let mainWindow: BrowserWindow | null = null;

// Precalienta dependencias pesadas para evitar congelamientos al primer uso
async function warmMainDependencies(): Promise<void> {
  try {
    await Promise.all([
      import('puppeteer'),
      import('exceljs')
    ]);
    console.log('[warmup] puppeteer y exceljs cargados en el proceso principal');
  } catch (err) {
    console.warn('[warmup] Error precalentando dependencias:', err);
  }
}

function createWindow(): void {
  // Ajustar al área de trabajo (sin cubrir la barra de tareas)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    title: 'Aprendo UCT — Sistema de Consolidación de Calificaciones',
    frame: false,
    thickFrame: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      webSecurity: true
    },
    show: false,
    fullscreen: false,
    maximizable: false,
    autoHideMenuBar: true
  });

  const indexPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    const workArea = screen.getPrimaryDisplay().workArea;
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
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let pseudoMaximized = false;
let savedBounds: Electron.Rectangle | null = null;

function registerWindowHandlers() {
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    if (pseudoMaximized) {
      if (savedBounds) mainWindow.setBounds(savedBounds);
      pseudoMaximized = false;
      mainWindow.webContents.send('window:maximize-changed', false);
    } else {
      savedBounds = mainWindow.getBounds();
      const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
      mainWindow.setBounds({ x, y, width, height });
      pseudoMaximized = true;
      mainWindow.webContents.send('window:maximize-changed', true);
    }
  });
  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });
  ipcMain.on('window:set-background', (_e, color: string) => {
    mainWindow?.setBackgroundColor(color);
  });

  // Resize personalizado (thickFrame: false suprime el overlay de tamaño de Windows)
  const RESIZE_MIN = { width: 600, height: 400 };
  let resizeInterval: ReturnType<typeof setInterval> | null = null;
  let resizeEdge = '';
  const resizeStart = { bounds: { x: 0, y: 0, width: 0, height: 0 }, cursor: { x: 0, y: 0 } };

  const stopResize = () => {
    if (resizeInterval) { clearInterval(resizeInterval); resizeInterval = null; }
    if (!mainWindow) return;
    const b = mainWindow.getBounds();
    const wa = screen.getPrimaryDisplay().workArea;
    const isMax = b.x <= wa.x && b.y <= wa.y && b.width >= wa.width && b.height >= wa.height;
    pseudoMaximized = isMax;
    mainWindow.webContents.send('window:maximize-changed', isMax);
    if (!isMax) savedBounds = b;
  };

  ipcMain.on('window:resize-start', (_e, edge: string) => {
    if (!mainWindow) return;
    resizeEdge = edge;
    resizeStart.bounds = mainWindow.getBounds();
    resizeStart.cursor = screen.getCursorScreenPoint();
    if (resizeInterval) clearInterval(resizeInterval);
    resizeInterval = setInterval(() => {
      if (!mainWindow) { stopResize(); return; }
      const cur = screen.getCursorScreenPoint();
      const dx = cur.x - resizeStart.cursor.x;
      const dy = cur.y - resizeStart.cursor.y;
      const s = resizeStart.bounds;
      let { x, y, width, height } = s;
      if (resizeEdge.includes('e')) width  = Math.max(RESIZE_MIN.width,  s.width  + dx);
      if (resizeEdge.includes('s')) height = Math.max(RESIZE_MIN.height, s.height + dy);
      if (resizeEdge.includes('w')) { width = Math.max(RESIZE_MIN.width, s.width - dx); x = s.x + s.width - width; }
      if (resizeEdge.includes('n')) { height = Math.max(RESIZE_MIN.height, s.height - dy); y = s.y + s.height - height; }
      mainWindow.setBounds({ x, y, width, height });
    }, 16);
  });

  ipcMain.on('window:resize-end', () => stopResize());
}

// Guarda varios archivos en una carpeta elegida por el usuario (un solo dialog).
// Usado por el módulo de asistencia para evitar 30 dialogs de "Save As" al consolidar.
function registerBatchSaveHandler() {
  ipcMain.handle(
    'files:save-batch',
    async (
      _e,
      args: import('../shared/types').BatchSaveArgs
    ): Promise<import('../shared/types').BatchSaveResult> => {
      if (!mainWindow) {
        return { success: false, count: 0, errors: ['No hay ventana activa'] };
      }
      if (!args?.files?.length) {
        return { success: false, count: 0, errors: ['No hay archivos para guardar'] };
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecciona la carpeta donde guardar los archivos',
        buttonLabel: 'Guardar aquí',
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, count: 0, cancelled: true };
      }

      const folder = result.filePaths[0];
      const errors: string[] = [];
      let count = 0;

      for (const file of args.files) {
        try {
          const filePath = path.join(folder, file.name);
          await fsp.writeFile(filePath, Buffer.from(file.buffer));
          count++;
        } catch (err) {
          errors.push(`${file.name}: ${(err as Error).message}`);
        }
      }

      return {
        success: errors.length === 0,
        count,
        folderPath: folder,
        errors: errors.length > 0 ? errors : undefined,
      };
    }
  );

  // === Diagnóstico y logs ===
  ipcMain.handle('diagnostics:get-info', async () => {
    const os = require('os');
    const logs = await logger.listLogFiles();
    return {
      app: {
        name: app.getName(),
        version: app.getVersion(),
        locale: app.getLocale(),
        isPackaged: app.isPackaged,
        userData: app.getPath('userData'),
        downloads: app.getPath('downloads'),
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
        dir: await logger.getLogDir(),
        currentFile: await logger.getCurrentLogPath(),
        files: logs,
      },
    };
  });

  ipcMain.handle('diagnostics:get-logs', async (_e, maxBytes?: number) => {
    return await logger.readAllLogs(maxBytes ?? 200_000);
  });

  ipcMain.handle('diagnostics:open-log-dir', async () => {
    const dir = await logger.getLogDir();
    const { shell } = require('electron');
    await shell.openPath(dir);
    return { success: true, path: dir };
  });

  ipcMain.handle('diagnostics:copy-logs', async () => {
    const text = await logger.readAllLogs(500_000);
    const { clipboard } = require('electron');
    clipboard.writeText(text);
    return { success: true, bytes: text.length };
  });
}

app.whenReady().then(async () => {
  registerDownloadHandlers();
  registerWindowHandlers();
  registerBatchSaveHandler();
  // Calentar dependencias en segundo plano antes de mostrar UI
  warmMainDependencies();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

Menu.setApplicationMenu(null);
