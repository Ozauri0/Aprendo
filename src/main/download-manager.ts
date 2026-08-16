// download-manager.ts - Lógica de descargas con Puppeteer en el proceso principal
import { Browser, Page } from 'puppeteer';
import { ipcMain, IpcMainInvokeEvent, WebContents, app } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import * as browsersApi from '@puppeteer/browsers';
import { logger } from './logger';

const APRENDO_URL = 'https://aprendo.uct.cl/';
const EXPORT_FOLDER = 'Aprendo_Export';

// Resuelve la carpeta de descargas del sistema de forma independiente al idioma
// (Windows en español: "...\Descargas", en inglés: "...\Downloads", etc.).
// Retorna siempre ".../<Downloads-dir>/Aprendo_Export" y crea la subcarpeta si no existe.
function getDefaultDownloadPath(): string {
  const downloadDir = app.getPath('downloads');
  const target = path.join(downloadDir, EXPORT_FOLDER);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

// Busca Chrome/Edge/Brave/Chromium ya instalado en el sistema, en cualquier SO
// (Windows/Linux/macOS). Primero prueba ubicaciones estándar de cada plataforma
// (sin rutas de usuario hardcodeadas: usa variables de entorno del SO) y luego
// recorre el PATH buscando binarios conocidos. Si encuentra uno, retorna su
// executablePath para que Puppeteer lo use en vez de descargar Chrome.
function findSystemBrowser(): { path: string; name: string } | null {
  const candidates: { p: string; n: string }[] = [];

  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localApp = process.env.LOCALAPPDATA || '';
    candidates.push(
      { p: path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), n: 'Chrome' },
      { p: path.join(pfx86, 'Google', 'Chrome', 'Application', 'chrome.exe'), n: 'Chrome' },
      { p: path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'), n: 'Chrome (per-user)' },
      { p: path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), n: 'Edge' },
      { p: path.join(pfx86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), n: 'Edge' },
      { p: path.join(localApp, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), n: 'Edge (per-user)' },
      { p: path.join(pf, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'), n: 'Brave' },
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      { p: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', n: 'Chrome' },
      { p: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', n: 'Edge' },
      { p: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', n: 'Brave' },
      { p: '/Applications/Chromium.app/Contents/MacOS/Chromium', n: 'Chromium' },
    );
  } else if (process.platform === 'linux') {
    // Google instala Chrome en /opt/google/chrome en varias distribuciones
    // y ese directorio no siempre está en el PATH.
    candidates.push(
      { p: '/opt/google/chrome/chrome', n: 'Chrome' },
      { p: '/opt/google/chrome/google-chrome', n: 'Chrome' },
    );
  }

  for (const c of candidates) {
    try {
      if (c.p && fs.existsSync(c.p) && isExecutableFile(c.p)) {
        logger.info('puppeteer', `Navegador del sistema encontrado: ${c.n} -> ${c.p}`);
        return { path: c.p, name: c.n };
      }
    } catch { /* ignore */ }
  }

  // Recorrer el PATH (sin ejecutar comandos, portable en los 3 SO).
  const binNames = process.platform === 'win32'
    ? ['chrome.exe', 'msedge.exe', 'brave.exe', 'chromium.exe']
    : [
        'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser',
        'microsoft-edge', 'microsoft-edge-stable', 'msedge', 'brave', 'brave-browser',
      ];
  const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(d => d);
  for (const dir of pathDirs) {
    for (const name of binNames) {
      try {
        const full = path.join(dir, name);
        if (fs.existsSync(full) && isExecutableFile(full)) {
          logger.info('puppeteer', `Navegador del sistema encontrado en PATH: ${full}`);
          return { path: full, name };
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

function isExecutableFile(filePath: string): boolean {
  if (process.platform === 'win32') return true; // X_OK no es confiable en Windows
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Garantiza que haya un Chrome utilizable para Puppeteer:
//   1. Si el Chrome bundled de Puppeteer ya está en su caché (~/.cache/puppeteer,
//      o PUPPETEER_CACHE_DIR si está definido), lo usa tal cual.
//   2. Si no, descarga Chrome for Testing con la API oficial de @puppeteer/browsers
//      (reemplaza al viejo createBrowserFetcher, removido en Puppeteer v22+, y al
//      hack del CLI que dependía de rutas internas de node_modules).
// Retorna el executablePath si quedó disponible, o null si falló.
async function ensurePuppeteerChromium(puppeteer: any): Promise<string | null> {
  try {
    // 1) ¿El Chrome que Puppeteer espera ya está en la caché?
    let expectedPath: string | null = null;
    try {
      expectedPath = typeof puppeteer?.executablePath === 'function'
        ? puppeteer.executablePath()
        : null;
    } catch {
      expectedPath = null;
    }
    if (expectedPath && fs.existsSync(expectedPath)) {
      logger.info('puppeteer', `Chrome de Puppeteer ya está en caché: ${expectedPath}`);
      return expectedPath;
    }

    // 2) Descargar Chrome for Testing en la misma caché que usa puppeteer.launch().
    const platform = browsersApi.detectBrowserPlatform();
    if (!platform) {
      logger.error('puppeteer', `No se puede descargar Chrome en esta plataforma: ${process.platform}/${process.arch}`);
      return null;
    }
    // Usar el build exacto que espera esta versión de Puppeteer: extraerlo de la
    // ruta que calcula puppeteer.executablePath() (p.ej. ".../chrome/linux-143.0.7499.169/...").
    // Si no se puede extraer, caer a la versión 'stable' del dashboard de CfT.
    const pathMatch = (expectedPath || '').match(/(linux|win\d*|mac(?:_arm)?)-(\d+\.\d+\.\d+\.\d+)/i);
    const buildId = pathMatch?.[2] ??
      await browsersApi.resolveBuildId(browsersApi.Browser.CHROME, platform, 'stable');
    const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(os.homedir(), '.cache', 'puppeteer');
    const installPath = browsersApi.computeExecutablePath({
      cacheDir,
      browser: browsersApi.Browser.CHROME,
      buildId,
    });
    if (fs.existsSync(installPath)) {
      logger.info('puppeteer', `Chrome for Testing ya está instalado: ${installPath}`);
      return installPath;
    }

    logger.info('puppeteer', `Descargando Chrome for Testing (build ${buildId}, ~160 MB). La primera vez puede tardar varios minutos...`);
    let lastLoggedPct = -1;
    await browsersApi.install({
      browser: browsersApi.Browser.CHROME,
      buildId,
      cacheDir,
      downloadProgressCallback: (downloaded, total) => {
        if (!total) return;
        const pct = Math.floor((downloaded / total) * 100);
        if (pct >= lastLoggedPct + 20) {
          lastLoggedPct = pct;
          logger.info('puppeteer', `Descargando Chrome: ${pct}%`);
        }
      },
    });

    if (fs.existsSync(installPath)) {
      logger.info('puppeteer', 'Chrome for Testing descargado OK');
      return installPath;
    }
    logger.error('puppeteer', `La instalación terminó pero no se encontró el binario en ${installPath}`);
    return null;
  } catch (err) {
    logger.error('puppeteer', 'ensurePuppeteerChromium falló', err);
    return null;
  }
}

let globalBrowser: Browser | null = null;
let globalPage: Page | null = null;
let currentCredentials = { username: '', password: '' };
let isDownloading = false;
let shouldStop = false;
let isDownloadingLogs = false;
let isDownloadingAttendance = false;

function renameDownloadedFile(downloadPath: string, existingFiles: Set<string>, label: string): string | null {
  try {
    const currentFiles = fs.readdirSync(downloadPath);
    const newFiles = currentFiles.filter(f => !existingFiles.has(f));

    const targetFile = newFiles.find(f =>
      (f.endsWith('.xlsx') || f.endsWith('.xls'))
    );

    if (!targetFile) return null;

    const oldPath = path.join(downloadPath, targetFile);
    const ext = path.extname(targetFile);

    const cleanName = targetFile
      .replace(/^(logs_|asistencia_|attendance_)/i, '')
      .replace(/_\d{8}-\d{4}/, '')
      .replace(ext, '');

    const newName = `${cleanName} ${label}${ext}`;
    const newPath = path.join(downloadPath, newName);

    if (fs.existsSync(oldPath)) {
      tryRenameWithRetry(oldPath, newPath, 5, 300);
      return newName;
    }
  } catch (e) {
    // ignore rename errors
  }
  return null;
}

// Reintenta el rename con backoff. Útil cuando el archivo aún está siendo
// escrito por el navegador y Windows no permite renombrarlo.
function tryRenameWithRetry(oldPath: string, newPath: string, attempts = 5, delayMs = 300): boolean {
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath); // evitar colisión
      fs.renameSync(oldPath, newPath);
      return true;
    } catch (e) {
      if (i === attempts - 1) {
        logger.warn('download', `No se pudo renombrar ${path.basename(oldPath)}: ${(e as Error).message}`);
        return false;
      }
      // Espera proporcional al tamaño: archivos grandes tardan más
      const sleep = new Promise(r => setTimeout(r, delayMs * (i + 1)));
      // síncrono
      const until = Date.now() + delayMs * (i + 1);
      while (Date.now() < until) { /* busy-wait corto para no bloquear el event loop demasiado */ }
    }
  }
  return false;
}

function getCurrentFiles(downloadPath: string): Set<string> {
  try {
    return new Set(fs.readdirSync(downloadPath));
  } catch {
    return new Set();
  }
}

// Espera a que aparezca un archivo NUEVO (xlsx/xls) en downloadPath que no esté
// en filesBefore, con timeout adaptativo. El archivo debe aparecer y DEJAR DE
// CRECER (señal de descarga completa). Esto reemplaza al waitForTimeout(6000)
// fijo, que era el origen del bug del "último archivo sin renombrar".
async function waitForNewDownload(
  downloadPath: string,
  filesBefore: Set<string>,
  options: { maxWaitMs?: number; pollMs?: number; minStableMs?: number } = {}
): Promise<string | null> {
  const maxWait = options.maxWaitMs ?? 10_000;
  const poll = options.pollMs ?? 400;
  const minStable = options.minStableMs ?? 800;

  const start = Date.now();
  let candidate: string | null = null;
  let lastSize = -1;
  let stableSince = 0;

  while (Date.now() - start < maxWait) {
    try {
      const current = fs.readdirSync(downloadPath);
      const newOnes = current.filter(f => !filesBefore.has(f) && (f.endsWith('.xlsx') || f.endsWith('.xls')));

      if (newOnes.length > 0) {
        // Tomar el más reciente (último modificado) — evita tomar un .crdownload
        // que en algunas versiones se queda en la carpeta
        const newest = newOnes
          .map(f => ({ f, mtime: fs.statSync(path.join(downloadPath, f)).mtimeMs, size: fs.statSync(path.join(downloadPath, f)).size }))
          .sort((a, b) => b.mtime - a.mtime)[0];

        if (newest.size === lastSize && lastSize > 0) {
          // El tamaño no cambió → la descarga probablemente terminó
          if (Date.now() - stableSince >= minStable) {
            return newest.f;
          }
        } else {
          candidate = newest.f;
          lastSize = newest.size;
          stableSince = Date.now();
        }
      }
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, poll));
  }

  // Si no apareció un archivo estable, devolver el último candidato que vimos
  return candidate;
}

// Renombra cualquier archivo .xlsx que haya quedado sin renombrar al final del
// ciclo. Esto cubre el caso de la última descarga cuya detección de tamaño
// estable falló por timing (la descarga se completó pero el rename anterior no
// se ejecutó a tiempo).
function renameRemainingDownloads(downloadPath: string, label: string): void {
  try {
    const files = fs.readdirSync(downloadPath);
    const remaining = files.filter(f => {
      // Solo archivos que NO han sido renombrados aún (tienen el patrón
      // "PAT_YYYY_NN" o similar con timestamp)
      const lower = f.toLowerCase();
      return (lower.endsWith('.xlsx') || lower.endsWith('.xls')) &&
        /_\d{8}-\d{4}/.test(f) &&  // tiene timestamp sin renombrar
        !/Asistencia\s|NOTA\s|Log\s/i.test(f);  // no está ya renombrado
    });
    for (const f of remaining) {
      const ext = path.extname(f);
      const cleanName = f
        .replace(/^(logs_|asistencia_|attendance_)/i, '')
        .replace(/_\d{8}-\d{4}/, '')
        .replace(ext, '');
      const newName = `${cleanName} ${label}${ext}`;
      const oldPath = path.join(downloadPath, f);
      const newPath = path.join(downloadPath, newName);
      if (tryRenameWithRetry(oldPath, newPath, 3, 500)) {
        logger.info('download', `Renombrado al final: ${f} -> ${newName}`);
      }
    }
  } catch (e) {
    logger.warn('download', `renameRemainingDownloads falló: ${(e as Error).message}`);
  }
}

function logToRenderer(webContents: WebContents, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  webContents.send('puppeteer:log', { message, type });
}

function sendStatus(webContents: WebContents, text: string, type: 'info' | 'success' | 'warning' | 'error' | 'processing' = 'info') {
  webContents.send('puppeteer:status', { text, type });
}

async function launchAndLogin(username: string, password: string, webContents: WebContents): Promise<{ browser: Browser; page: Page }> {
  logToRenderer(webContents, 'Iniciando nueva sesión de navegador...', 'info');
  logger.info('puppeteer', `launchAndLogin: usuario="${username}"`);

  if (!username || !password) {
    logger.warn('puppeteer', 'Credenciales vacías');
    throw new Error('Credenciales requeridas.');
  }

  logger.info('puppeteer', 'Importando módulo puppeteer...');
  const puppeteer = await import('puppeteer');

  // Decidir qué binario usar (compatible Windows/Linux/macOS, sin rutas fijas):
  //   1. Chrome bundled de Puppeteer si ya está en su caché (versión exacta
  //      emparejada con esta versión de Puppeteer — la más confiable).
  //   2. Chrome/Edge/Brave del sistema, buscado en ubicaciones estándar y PATH.
  //   3. Descarga automática de Chrome for Testing con @puppeteer/browsers.
  //   4. Si todo falla, mensaje claro con instrucciones.
  let executablePath: string | undefined;
  try {
    executablePath = puppeteer.executablePath();
    if (executablePath && !fs.existsSync(executablePath)) executablePath = undefined;
  } catch {
    executablePath = undefined;
  }

  if (executablePath) {
    logger.info('puppeteer', `Usando Chrome de Puppeteer en caché: ${executablePath}`);
  } else {
    const systemBrowser = findSystemBrowser();
    if (systemBrowser) {
      executablePath = systemBrowser.path;
      logger.info('puppeteer', `Usando ${systemBrowser.name} del sistema: ${executablePath}`);
    } else {
      logger.info('puppeteer', 'No hay navegador del sistema, descargando Chrome for Testing...');
      executablePath = (await ensurePuppeteerChromium(puppeteer as any)) ?? undefined;
    }
  }

  if (!executablePath) {
    const hint = 'No se encontró Chrome/Edge/Chromium instalado y no se pudo descargar Chrome automáticamente. Verifique su conexión a internet y vuelva a intentar.';
    logger.error('puppeteer', hint);
    logToRenderer(webContents, hint, 'error');
    throw new Error(hint);
  }

  let browser: Browser;
  try {
    logger.info('puppeteer', `Lanzando navegador (headless=true, --no-sandbox)...`);
    const launchOpts: any = {
      executablePath,
      headless: true,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
    };
    browser = await puppeteer.launch(launchOpts);
    logger.info('puppeteer', 'Navegador lanzado OK');
  } catch (err: any) {
    logger.error('puppeteer', 'puppeteer.launch() falló', err);
    const msg = err?.message || String(err);
    logToRenderer(webContents, `Error iniciando navegador: ${msg}`, 'error');
    logToRenderer(
      webContents,
      'Posibles causas: falta Visual C++ Redistributable x64, firewall/antivirus bloqueando el binario, o permisos insuficientes. Revisa el log en Configuración > Diagnóstico.',
      'warning'
    );
    throw new Error(`No se pudo iniciar el navegador: ${msg}`);
  }

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
    const downloadPath = getDefaultDownloadPath();

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
    // Renombrado final: limpia cualquier archivo .xlsx que haya quedado sin renombrar
    renameRemainingDownloads(downloadPath, 'Notas');
  } catch (error: any) {
    logToRenderer(webContents, `Error fatal en el ciclo de descargas: ${error.message}`, 'error');
    sendStatus(webContents, 'Error fatal en descargas', 'error');
  } finally {
    isDownloading = false;
  }
}

async function startLogDownloadLoop(startId: number, endId: number, webContents: WebContents) {
  if (!startId || !endId || startId > endId) {
    throw new Error('Rango de IDs inválido.');
  }

  isDownloadingLogs = true;
  shouldStop = false;
  sendStatus(webContents, `Iniciando descarga de participación del ID ${startId} al ${endId}...`, 'processing');
  logToRenderer(webContents, `Iniciando ciclo de logs de participación: ${startId} -> ${endId}`, 'info');

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
      logToRenderer(webContents, 'Sesión perdida. Reconectando...', 'warning');
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
    const downloadPath = getDefaultDownloadPath();

    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath
    });

    logToRenderer(webContents, `Carpeta de descarga configurada: ${downloadPath}`, 'info');

    let successCount = 0;
    let emptyCount = 0;

    for (let id = startId; id <= endId; id++) {
      if (shouldStop) {
        logToRenderer(webContents, 'Descarga de logs detenida por el usuario.', 'warning');
        break;
      }

      sendStatus(webContents, `Procesando logs de participación ID: ${id}`, 'processing');
      logToRenderer(webContents, `Navegando a reporte de logs ID: ${id}...`, 'info');

      const logUrl = `https://aprendo.uct.cl/report/log/index.php?chooselog=1&showusers=0&showcourses=0&id=${id}&group=&user=&date=&modid=&modaction=c&origin=&edulevel=2&logreader=logstore_standard`;

      try {
        try {
          await browser.pages();
        } catch (e) {
          logToRenderer(webContents, 'Conexión perdida. Reconectando...', 'warning');
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

        await page.goto(logUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const currentUrl = page.url();
        if (currentUrl.includes('login') || await page.$('#inputName')) {
          logToRenderer(webContents, `   Sesión perdida para ID ${id}.`, 'error');
          try { await browser.close(); } catch (e) { /* ignore */ }
          globalBrowser = null;
          emptyCount++;
          continue;
        }

        logToRenderer(webContents, `Página de logs cargada para ID ${id}.`, 'info');

        let downloaded = false;

        const downloadBtnSelectors = [
          'input[type="submit"][value*="escargar"]',
          'button[type="submit"]',
          'input[type="submit"]',
          'button',
        ];

        for (const selector of downloadBtnSelectors) {
          const buttons = await page.$$(selector);
          for (const btn of buttons) {
            const text = await btn.evaluate((el: HTMLButtonElement | HTMLInputElement) => {
              const content = el.textContent?.trim().toLowerCase() || '';
              const val = (el as HTMLInputElement).value?.toLowerCase() || '';
              return content + ' ' + val;
            });
            if (text.includes('descargar') || text.includes('download') || text.includes('exportar')) {
              logToRenderer(webContents, `Botón "${text.trim()}" encontrado. Descargando...`, 'info');
              const filesBefore = getCurrentFiles(downloadPath);
              await btn.click();
              const newFile = await waitForNewDownload(downloadPath, filesBefore);
              if (newFile) {
                const newName = renameDownloadedFile(downloadPath, filesBefore, 'Logs');
                if (newName) logToRenderer(webContents, `Archivo renombrado: ${newName}`, 'success');
              } else {
                logToRenderer(webContents, `   Descarga no detectada para ID ${id} (timeout)`, 'warning');
              }
              downloaded = true;
              break;
            }
          }
          if (downloaded) break;
        }

        if (!downloaded) {
          const excelLink = await page.evaluateHandle(() => {
            const links = document.querySelectorAll('a');
            for (const l of Array.from(links)) {
              const href = l.href || '';
              if (href.includes('moodle.org') || href.includes('google') || href.includes('apple')) continue;
              if (href.includes('download=xls') || href.includes('download=excel') ||
                  href.includes('format=xls') || href.includes('format=excel')) {
                return l;
              }
            }
            return null;
          });

          if (excelLink && excelLink.asElement()) {
            logToRenderer(webContents, `Enlace Excel encontrado. Descargando...`, 'info');
            const filesBefore = getCurrentFiles(downloadPath);
            await (excelLink.asElement()! as any).click();
            const newFile = await waitForNewDownload(downloadPath, filesBefore);
            if (newFile) {
              const newName = renameDownloadedFile(downloadPath, filesBefore, 'Logs');
              if (newName) logToRenderer(webContents, `Archivo renombrado: ${newName}`, 'success');
            } else {
              logToRenderer(webContents, `   Descarga no detectada para ID ${id} (timeout)`, 'warning');
            }
            downloaded = true;
          } else {
            logToRenderer(webContents, `No se encontró botón ni enlace de descarga para ID ${id}.`, 'warning');
          }
        }

        if (downloaded) {
          logToRenderer(webContents, `Descarga de logs iniciada para ID ${id}`, 'success');
          successCount++;
        } else {
          emptyCount++;
        }

      } catch (err: any) {
        logToRenderer(webContents, `Error procesando logs ID ${id}: ${err.message}`, 'error');
        emptyCount++;
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    sendStatus(webContents, `Logs finalizados. Descargas: ${successCount}, Sin datos/Error: ${emptyCount}`, 'success');
    logToRenderer(webContents, 'Ciclo de descarga de logs completado.', 'success');
    renameRemainingDownloads(downloadPath, 'Logs');
  } catch (error: any) {
    logToRenderer(webContents, `Error fatal en ciclo de logs: ${error.message}`, 'error');
    sendStatus(webContents, 'Error fatal en descarga de logs', 'error');
  } finally {
    isDownloadingLogs = false;
  }
}

async function startAttendanceDownloadLoop(startId: number, endId: number, webContents: WebContents, attendanceFilter?: string) {
  if (!startId || !endId || startId > endId) {
    throw new Error('Rango de IDs inválido.');
  }

  isDownloadingAttendance = true;
  shouldStop = false;
  sendStatus(webContents, `Iniciando descarga de asistencia del ID ${startId} al ${endId}...`, 'processing');
  logToRenderer(webContents, `Iniciando ciclo de asistencia: ${startId} -> ${endId}`, 'info');

  try {
    let page = globalPage;
    let browser = globalBrowser;

    let isConnected = false;
    if (browser) {
      try { await browser.pages(); isConnected = true; } catch { isConnected = false; }
    }

    if (!browser || !isConnected) {
      logToRenderer(webContents, 'Sesión perdida. Reconectando...', 'warning');
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
    const downloadPath = getDefaultDownloadPath();

    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath
    });

    logToRenderer(webContents, `Carpeta de descarga: ${downloadPath}`, 'info');

    let successCount = 0;
    let emptyCount = 0;

    for (let id = startId; id <= endId; id++) {
      if (shouldStop) {
        logToRenderer(webContents, 'Descarga de asistencia detenida por el usuario.', 'warning');
        break;
      }

      sendStatus(webContents, `Procesando asistencia ID: ${id}`, 'processing');
      logToRenderer(webContents, `Buscando módulo de asistencia en curso ID: ${id}...`, 'info');

      const courseUrl = `https://aprendo.uct.cl/course/view.php?id=${id}`;

      try {
        try { await browser.pages(); } catch {
          logToRenderer(webContents, 'Conexión perdida. Reconectando...', 'warning');
          const session = await launchAndLogin(currentCredentials.username, currentCredentials.password, webContents);
          globalBrowser = session.browser;
          globalPage = session.page;
          browser = globalBrowser;
          page = globalPage;
          const newClient = await page.target().createCDPSession();
          await newClient.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });
        }

        await page.goto(courseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        if (await page.$('#inputName')) {
          logToRenderer(webContents, `   Sesión perdida para ID ${id}.`, 'error');
          try { await browser.close(); } catch { /* ignore */ }
          globalBrowser = null;
          emptyCount++;
          continue;
        }

        const attendanceLinks = await page.$$eval('a[href*="/mod/attendance/view.php"]', (links: HTMLAnchorElement[]) =>
          links.map((l: HTMLAnchorElement) => ({
            text: l.textContent?.trim() || '',
            href: l.href
          }))
        );

        let filteredLinks = attendanceLinks;
        if (attendanceFilter) {
          const keywords = attendanceFilter.split(',').map(k => k.trim().toUpperCase()).filter(k => k);
          filteredLinks = attendanceLinks.filter(l =>
            keywords.some(k => l.text.toUpperCase().includes(k))
          );
          logToRenderer(webContents, `   ${attendanceLinks.length} módulo(s) encontrados, ${filteredLinks.length} coinciden con filtro "${attendanceFilter}".`, 'info');
        }

        if (filteredLinks.length === 0) {
          logToRenderer(webContents, `   No se encontró módulo de asistencia para ID ${id}.`, 'warning');
          emptyCount++;
          continue;
        }

        logToRenderer(webContents, `   ${filteredLinks.length} módulo(s) de asistencia a descargar.`, 'info');

        for (const linkData of filteredLinks) {
          if (shouldStop) break;

          const attendanceIdMatch = linkData.href.match(/id=(\d+)/);
          if (!attendanceIdMatch) {
            logToRenderer(webContents, `   No se pudo extraer ID de: ${linkData.text}`, 'warning');
            continue;
          }

          const attendanceId = attendanceIdMatch[1];
          const shortName = linkData.text.replace(/ASISTENCIA\s*/i, '').trim().substring(0, 30);
          logToRenderer(webContents, `   Módulo: "${linkData.text}" (ID: ${attendanceId})`, 'info');

        const exportUrl = `https://aprendo.uct.cl/mod/attendance/export.php?id=${attendanceId}`;
        logToRenderer(webContents, `   Navegando a exportación...`, 'info');
        await page.goto(exportUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        await new Promise(r => setTimeout(r, 800));

        const filesBefore = getCurrentFiles(downloadPath);

        const submitted = await page.evaluate(() => {
          const form = document.querySelector('form.mform') as HTMLFormElement;
          if (!form) return false;

          const ensureChecked = (el: HTMLInputElement | null, val: boolean) => {
            if (el) el.checked = val;
          };

          ensureChecked(document.getElementById('id_includenottaken') as HTMLInputElement, false);
          ensureChecked(document.getElementById('id_includeremarks') as HTMLInputElement, false);
          ensureChecked(document.getElementById('id_includedescription') as HTMLInputElement, false);
          ensureChecked(document.getElementById('id_includeallsessions') as HTMLInputElement, true);
          ensureChecked(document.getElementById('id_ident_id') as HTMLInputElement, true);
          ensureChecked(document.getElementById('id_ident_idnumber') as HTMLInputElement, true);
          ensureChecked(document.getElementById('id_ident_email') as HTMLInputElement, true);
          ensureChecked(document.getElementById('id_ident_institution') as HTMLInputElement, true);

          const submitBtn = document.getElementById('id_submitbutton') as HTMLInputElement;
          if (submitBtn) {
            submitBtn.click();
            return true;
          }
          return false;
        });

        if (submitted) {
          const newFile = await waitForNewDownload(downloadPath, filesBefore);
          if (newFile) {
            const label = `Asistencia ${shortName}`;
            const newName = renameDownloadedFile(downloadPath, filesBefore, label);
            if (newName) logToRenderer(webContents, `   Archivo: ${newName}`, 'success');
          } else {
            logToRenderer(webContents, `   Descarga de asistencia no detectada (timeout)`, 'warning');
          }
          successCount++;
        } else {
          logToRenderer(webContents, `   No se pudo enviar el formulario para ID ${id}.`, 'warning');
          emptyCount++;
        }

        } // end for each attendance module

      } catch (err: any) {
        logToRenderer(webContents, `Error procesando asistencia ID ${id}: ${err.message}`, 'error');
        emptyCount++;
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    sendStatus(webContents, `Asistencia finalizada. Descargas: ${successCount}, Sin datos/Error: ${emptyCount}`, 'success');
    logToRenderer(webContents, 'Ciclo de descarga de asistencia completado.', 'success');
    renameRemainingDownloads(downloadPath, 'Asistencia');
  } catch (error: any) {
    logToRenderer(webContents, `Error fatal en ciclo de asistencia: ${error.message}`, 'error');
    sendStatus(webContents, 'Error fatal en descarga de asistencia', 'error');
  } finally {
    isDownloadingAttendance = false;
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

  ipcMain.handle('puppeteer:download-logs', async (_event: IpcMainInvokeEvent, args: { startId: number; endId: number; downloadPath?: string }) => {
    if (isDownloadingLogs) {
      return { success: false, message: 'Ya hay una descarga de logs en curso.' };
    }
    await startLogDownloadLoop(args.startId, args.endId, _event.sender);
    return { success: true, message: 'Descargas de logs completadas' };
  });

  ipcMain.handle('puppeteer:download-attendance', async (_event: IpcMainInvokeEvent, args: { startId: number; endId: number; downloadPath?: string; attendanceFilter?: string }) => {
    if (isDownloadingAttendance) {
      return { success: false, message: 'Ya hay una descarga de asistencia en curso.' };
    }
    await startAttendanceDownloadLoop(args.startId, args.endId, _event.sender, args.attendanceFilter);
    return { success: true, message: 'Descargas de asistencia completadas' };
  });

  ipcMain.handle('puppeteer:fetch-courses', async (_event: IpcMainInvokeEvent) => {
    try {
      const page = globalPage;
      if (!page) return { success: false, message: 'No hay sesión activa.' };

      await page.goto('https://aprendo.uct.cl/my/', { waitUntil: 'networkidle2', timeout: 30000 });

      const courses = await page.$$eval('.coursebox, .course_listitem, .dashboard-card, .card.dashboard-card', (els: Element[]) =>
        els.map((el: Element) => {
          const nameEl = el.querySelector('.coursename, .course-title, .card-title, h3') as HTMLElement;
          const linkEl = el.querySelector('a[href*="course/view.php"]') as HTMLAnchorElement;
          const name = nameEl?.textContent?.trim() || '';
          const href = linkEl?.href || '';
          const idMatch = href.match(/id=(\d+)/);
          const yearMatch = name.match(/\b(20\d{2})\b/);
          const semMatch = name.match(/I+\s*Semestre/i);
          const semMatch2 = name.match(/II\s*Semestre/i);
          return {
            name: name.substring(0, 80),
            id: idMatch ? parseInt(idMatch[1]) : 0,
            year: yearMatch ? parseInt(yearMatch[1]) : 0,
            semester: semMatch2 ? 2 : (semMatch ? 1 : 0)
          };
        })
      );

      if (courses.length === 0) {
        const links = await page.$$eval('a[href*="course/view.php?id="]', (links: HTMLAnchorElement[]) =>
          links.map(l => {
            const name = l.textContent?.trim()?.substring(0, 80) || '';
            const id = parseInt((l.href.match(/id=(\d+)/) || ['', '0'])[1]);
            const yearMatch = name.match(/\b(20\d{2})\b/);
            const semMatch = name.match(/I+\s*Semestre/i);
            const semMatch2 = name.match(/II\s*Semestre/i);
            return {
              name,
              id,
              year: yearMatch ? parseInt(yearMatch[1]) : 0,
              semester: semMatch2 ? 2 : (semMatch ? 1 : 0)
            };
          })
        );
        const unique = links.filter((c: { id: number; name: string }, i: number, arr: typeof links) =>
          c.id > 0 && arr.findIndex(x => x.id === c.id) === i
        );
        return { success: true, courses: unique };
      }

      return { success: true, courses };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('puppeteer:stop', async () => {
    shouldStop = true;
    return { success: true, message: 'Detención solicitada' };
  });
}
