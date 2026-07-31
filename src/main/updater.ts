// updater.ts — Sistema de auto-update usando electron-updater + GitHub Releases
import { autoUpdater, UpdateInfo as _UpdateInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { logger } from './logger';

let mainWindow: BrowserWindow | null = null;

/**
 * Configura y arranca el sistema de auto-update.
 * Verifica al iniciar la app (no en intervalo) para capturar hotfixes.
 */
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configurar GitHub Releases como fuente de updates
  autoUpdater.autoDownload = false;   // El usuario decide si actualizar
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (msg: string) => logger.info('updater', msg),
    warn: (msg: string) => logger.warn('updater', msg),
    error: (msg: string) => logger.error('updater', msg),
    debug: (msg: string) => logger.info('updater', `[debug] ${msg}`),
  };

  // Eventos del updater → enviar al renderer para mostrar UI
  autoUpdater.on('checking-for-update', () => {
    logger.info('updater', 'Verificando actualizaciones...');
  });

  autoUpdater.on('update-available', (info: _UpdateInfo) => {
    logger.info('updater', `Nueva versión disponible: ${info.version}`);
    sendToRenderer('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes as string | undefined,
      releaseDate: info.releaseDate as string | undefined,
    });
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('updater', 'App actualizada. No hay nueva versión.');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    });
  });

  autoUpdater.on('update-downloaded', (info: _UpdateInfo) => {
    logger.info('updater', `Descarga completada: v${info.version}`);
    sendToRenderer('update:downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    logger.error('updater', `Error: ${err.message}`);
    sendToRenderer('update:error', { message: err.message });
  });

  // Verificar al iniciar la app
  checkForUpdates();
}

/**
 * Verifica si hay actualizaciones disponibles en GitHub Releases.
 */
export function checkForUpdates(): void {
  if (!mainWindow) return;
  logger.info('updater', 'Iniciando verificación de actualizaciones...');
  autoUpdater.checkForUpdates().catch((err) => {
    logger.warn('updater', `Verificación fallida (sin internet?): ${err.message}`);
  });
}

/**
 * Descarga la actualización (el usuario ya aceptó).
 */
export function downloadUpdate(): void {
  logger.info('updater', 'Iniciando descarga de actualización...');
  autoUpdater.downloadUpdate().catch((err) => {
    logger.error('updater', `Descarga fallida: ${err.message}`);
    sendToRenderer('update:error', { message: `Error descargando: ${err.message}` });
  });
}

/**
 * Instala la actualización y reinicia la app.
 */
export function installUpdate(): void {
  logger.info('updater', 'Instalando actualización y reiniciando...');
  autoUpdater.quitAndInstall();
}

function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}
