// updater.ts — Sistema de auto-update usando electron-updater + GitHub Releases
import { autoUpdater, UpdateInfo as _UpdateInfo, CancellationToken } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import { logger } from './logger';

let mainWindow: BrowserWindow | null = null;
let downloadCancellationToken: CancellationToken | null = null;

/**
 * Configura y arranca el sistema de auto-update.
 * Verifica al iniciar la app (no en intervalo) para capturar hotfixes.
 */
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configurar GitHub Releases como fuente de updates
  autoUpdater.autoDownload = false;   // El usuario decide si actualizar
  // Solo instalar después de que el usuario lo confirme explícitamente.
  autoUpdater.autoInstallOnAppQuit = false;
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
      currentVersion: app.getVersion(),
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      releaseDate: info.releaseDate,
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
    downloadCancellationToken = null;
    logger.info('updater', `Descarga completada: v${info.version}`);
    sendToRenderer('update:downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('update-cancelled', (info: _UpdateInfo) => {
    downloadCancellationToken = null;
    logger.info('updater', `Descarga cancelada: v${info.version}`);
    sendToRenderer('update:cancelled', { version: info.version });
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
  if (!mainWindow || !app.isPackaged) {
    logger.info('updater', 'Actualizaciones omitidas en modo desarrollo.');
    return;
  }
  logger.info('updater', 'Iniciando verificación de actualizaciones...');
  autoUpdater.checkForUpdates().catch((err) => {
    logger.warn('updater', `Verificación fallida (sin internet?): ${err.message}`);
  });
}

/**
 * Descarga la actualización (el usuario ya aceptó).
 */
export function downloadUpdate(): void {
  if (downloadCancellationToken) return;
  logger.info('updater', 'Iniciando descarga de actualización...');
  const cancellationToken = new CancellationToken();
  downloadCancellationToken = cancellationToken;
  autoUpdater.downloadUpdate(cancellationToken).catch((err) => {
    const wasCancelled = cancellationToken.cancelled;
    downloadCancellationToken = null;
    if (wasCancelled) return;
    logger.error('updater', `Descarga fallida: ${err.message}`);
    sendToRenderer('update:error', { message: `Error descargando: ${err.message}` });
  });
}

/** Cancela la descarga activa sin dejar una instalación pendiente. */
export function cancelUpdate(): void {
  if (!downloadCancellationToken) return;
  logger.info('updater', 'Cancelando descarga de actualización...');
  downloadCancellationToken.cancel();
  downloadCancellationToken = null;
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
