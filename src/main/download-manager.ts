// download-manager.ts - Lógica de descargas con Puppeteer en el proceso principal
import { Browser, Page } from 'puppeteer';
import { ipcMain, IpcMainInvokeEvent, WebContents } from 'electron';
import path from 'path';
import os from 'os';

const APRENDO_URL = 'https://aprendo.uct.cl/';

let globalBrowser: Browser | null = null;
let globalPage: Page | null = null;
let currentCredentials = { username: '', password: '' };
let isDownloading = false;
let shouldStop = false;

function logToRenderer(webContents: WebContents, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  webContents.send('puppeteer:log', { message, type });
}

function sendStatus(webContents: WebContents, text: string, type: 'info' | 'success' | 'warning' | 'error' | 'processing' = 'info') {
  webContents.send('puppeteer:status', { text, type });
}

async function launchAndLogin(username: string, password: string, webContents: WebContents): Promise<{ browser: Browser; page: Page }> {
  logToRenderer(webContents, 'Iniciando nueva sesión de navegador...', 'info');

  if (!username || !password) {
    throw new Error('Credenciales requeridas.');
  }

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();

  try {
    logToRenderer(webContents, `Navegando a ${APRENDO_URL}...`, 'info');
    await page.goto(APRENDO_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    try {
      await page.waitForSelector('#inputName', { timeout: 5000 });
      logToRenderer(webContents, 'Ingresando credenciales...', 'info');
      await page.type('#inputName', username);
      await page.type('#inputPassword', password);

      logToRenderer(webContents, 'Enviando formulario...', 'info');
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch (e) {
      logToRenderer(webContents, 'Verificando sesión existente...', 'info');
    }

    const loginInputExists = await page.$('#inputName');

    if (!loginInputExists) {
      logToRenderer(webContents, '¡Sesión activa confirmada!', 'success');
      return { browser, page };
    } else {
      throw new Error('Fallo en el inicio de sesión. Verifique credenciales.');
    }
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function startDownloadLoop(startId: number, endId: number, webContents: WebContents) {
  if (!startId || !endId || startId > endId) {
    throw new Error('Rango de IDs inválido.');
  }

  isDownloading = true;
  shouldStop = false;
  sendStatus(webContents, `Iniciando descargas del ID ${startId} al ${endId}...`, 'processing');
  logToRenderer(webContents, `Iniciando ciclo de descargas: ${startId} -> ${endId}`, 'info');

  try {
    let page = globalPage;
    let browser = globalBrowser;

    let isConnected = false;
    if (browser) {
      try {
        await browser.pages();
        isConnected = true;
      } catch (e) {
        isConnected = false;
      }
    }

    if (!browser || !isConnected) {
      logToRenderer(webContents, 'Sesión perdida o navegador cerrado. Reconectando...', 'warning');
      const session = await launchAndLogin(currentCredentials.username, currentCredentials.password, webContents);
      globalBrowser = session.browser;
      globalPage = session.page;
      browser = globalBrowser;
      page = globalPage;
    }

    if (!page || !browser) {
      throw new Error('No hay sesión de navegador activa.');
    }

    const client = await page.target().createCDPSession();
    const downloadPath = path.join(os.homedir(), 'Downloads', 'Aprendo_Export');

    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath
    });

    logToRenderer(webContents, `Carpeta de descarga configurada: ${downloadPath}`, 'info');

    let successCount = 0;
    let emptyCount = 0;

    for (let id = startId; id <= endId; id++) {
      if (shouldStop) {
        logToRenderer(webContents, 'Descarga detenida por el usuario.', 'warning');
        break;
      }

      sendStatus(webContents, `Procesando curso ID: ${id}`, 'processing');
      logToRenderer(webContents, `Navegando a curso ID: ${id}...`, 'info');

      const exportUrl = `https://aprendo.uct.cl/grade/export/xls/index.php?id=${id}`;

      try {
        try {
          await browser.pages();
        } catch (e) {
          logToRenderer(webContents, 'Conexión perdida durante el ciclo. Intentando reconectar...', 'warning');
          const session = await launchAndLogin(currentCredentials.username, currentCredentials.password, webContents);
          globalBrowser = session.browser;
          globalPage = session.page;
          browser = globalBrowser;
          page = globalPage;

          const newClient = await page.target().createCDPSession();
          await newClient.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath
          });
        }

        await page.goto(exportUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        const submitBtn = await page.$('#id_submitbutton');

        if (submitBtn) {
          logToRenderer(webContents, `Botón de descarga encontrado para ID ${id}. Descargando...`, 'info');
          await Promise.all([
            page.click('#id_submitbutton'),
            new Promise(r => setTimeout(r, 2000))
          ]);
          logToRenderer(webContents, `Descarga iniciada para ID ${id}`, 'success');
          successCount++;
        } else {
          const currentUrl = page.url();
          const currentTitle = await page.title();
          logToRenderer(webContents, `No se encontró botón. ID: ${id}`, 'warning');
          logToRenderer(webContents, `   URL: ${currentUrl}`, 'warning');
          logToRenderer(webContents, `   Título: ${currentTitle}`, 'warning');

          if (await page.$('#inputName') || currentTitle.includes('Log in') || currentTitle.includes('Entrar')) {
            logToRenderer(webContents, '   Detectado formulario de login. Sesión perdida.', 'error');
            try { await browser.close(); } catch (e) { /* ignore */ }
            globalBrowser = null;
          }
          emptyCount++;
        }
      } catch (err: any) {
        logToRenderer(webContents, `Error procesando ID ${id}: ${err.message}`, 'error');
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    sendStatus(webContents, `Proceso finalizado. Descargas: ${successCount}, Vacíos/Error: ${emptyCount}`, 'success');
    logToRenderer(webContents, 'Ciclo de descargas completado.', 'success');
  } catch (error: any) {
    logToRenderer(webContents, `Error fatal en el ciclo de descargas: ${error.message}`, 'error');
    sendStatus(webContents, 'Error fatal en descargas', 'error');
  } finally {
    isDownloading = false;
  }
}

export function registerDownloadHandlers() {
  ipcMain.handle('puppeteer:login', async (_event: IpcMainInvokeEvent, username: string, password: string) => {
    try {
      if (globalBrowser) {
        try { await globalBrowser.close(); } catch (e) { /* ignore */ }
        globalBrowser = null;
        globalPage = null;
      }
      currentCredentials = { username, password };
      const session = await launchAndLogin(username, password, _event.sender);
      globalBrowser = session.browser;
      globalPage = session.page;
      return { success: true, message: 'Sesión iniciada correctamente' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('puppeteer:download', async (_event: IpcMainInvokeEvent, args: { startId: number; endId: number; downloadPath?: string }) => {
    if (isDownloading) {
      return { success: false, message: 'Ya hay una descarga en curso.' };
    }
    await startDownloadLoop(args.startId, args.endId, _event.sender);
    return { success: true, message: 'Descargas completadas' };
  });

  ipcMain.handle('puppeteer:stop', async () => {
    shouldStop = true;
    return { success: true, message: 'Detención solicitada' };
  });
}
