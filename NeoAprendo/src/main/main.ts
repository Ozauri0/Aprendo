import { app, BrowserWindow, Menu, screen } from 'electron';
import path from 'path';

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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
    fullscreen: false,
    maximizable: true,
    autoHideMenuBar: true
  });

  const indexPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
    // Abrir DevTools automáticamente en desarrollo para depurar pantallas en blanco
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
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
