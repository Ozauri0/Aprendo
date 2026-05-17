import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Determinar si podemos usar contextBridge (contextIsolation habilitado)
// o debemos caer a asignación global (durante migración)
const useContextBridge = process.contextIsolated;

const api = {
  // Excel processing
  processExcel: (args: import('../shared/types').ExcelProcessOptions) =>
    ipcRenderer.invoke('excel:process', args),

  // Puppeteer / Downloads
  loginAprendo: (username: string, password: string) =>
    ipcRenderer.invoke('puppeteer:login', username, password),

  startDownloads: (args: import('../shared/types').DownloadStartArgs) =>
    ipcRenderer.invoke('puppeteer:download', args),

  startLogDownloads: (args: import('../shared/types').DownloadStartArgs) =>
    ipcRenderer.invoke('puppeteer:download-logs', args),

  startAttendanceDownloads: (args: import('../shared/types').DownloadStartArgs & { attendanceFilter?: string }) =>
    ipcRenderer.invoke('puppeteer:download-attendance', args),

  stopDownloads: () => ipcRenderer.invoke('puppeteer:stop'),

  // Progress callbacks
  onDownloadLog: (callback: (data: import('../shared/types').DownloadProgress) => void) => {
    const handler = (_event: IpcRendererEvent, data: import('../shared/types').DownloadProgress) => callback(data);
    ipcRenderer.on('puppeteer:log', handler);
    return () => ipcRenderer.removeListener('puppeteer:log', handler);
  },

  onDownloadStatus: (callback: (data: import('../shared/types').DownloadStatus) => void) => {
    const handler = (_event: IpcRendererEvent, data: import('../shared/types').DownloadStatus) => callback(data);
    ipcRenderer.on('puppeteer:status', handler);
    return () => ipcRenderer.removeListener('puppeteer:status', handler);
  },

  // Platform info
  getPlatform: () => process.platform as 'win32' | 'darwin' | 'linux',

  // Versions
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
};

if (useContextBridge) {
  try {
    contextBridge.exposeInMainWorld('aprendoAPI', api);
  } catch {
    // Fallback si contextBridge falla por alguna razón
    (window as any).aprendoAPI = api;
  }
} else {
  (window as any).aprendoAPI = api;
}

// También exportar tipos para uso en renderer
declare global {
  interface Window {
    aprendoAPI: typeof api;
  }
}
