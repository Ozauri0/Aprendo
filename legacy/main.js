const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Mantener una referencia global del objeto de ventana
let mainWindow;

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Opcional: agregar icono
    show: false // No mostrar hasta que esté listo
  });

  // Cargar el archivo index.html de la aplicación
  mainWindow.loadFile('index.html');

  // Mostrar la ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Abrir las herramientas de desarrollo (opcional, solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Emitido cuando la ventana es cerrada
  mainWindow.on('closed', () => {
    // Desreferenciar el objeto ventana
    mainWindow = null;
  });
}

// Este método será llamado cuando Electron haya terminado la inicialización
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  // En macOS es común que las aplicaciones permanezcan activas
  // hasta que el usuario las cierre explícitamente con Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// En macOS, recrear una ventana cuando se hace clic en el icono del dock
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quitar el menú de la aplicación
Menu.setApplicationMenu(null);
