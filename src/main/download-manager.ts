// download-manager.ts - Lógica de descargas con Puppeteer en el proceso principal
import { Browser, Page } from 'puppeteer';
import { ipcMain, IpcMainInvokeEvent, WebContents } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';

const APRENDO_URL = 'https://aprendo.uct.cl/';

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
      fs.renameSync(oldPath, newPath);
      return newName;
    }
  } catch (e) {
    // ignore rename errors
  }
  return null;
}

function getCurrentFiles(downloadPath: string): Set<string> {
  try {
    return new Set(fs.readdirSync(downloadPath));
  } catch {
    return new Set();
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
              await new Promise(r => setTimeout(r, 6000));
              const newName = renameDownloadedFile(downloadPath, filesBefore, 'Logs');
              if (newName) {
                logToRenderer(webContents, `Archivo renombrado: ${newName}`, 'success');
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
            await new Promise(r => setTimeout(r, 6000));
            const newName = renameDownloadedFile(downloadPath, filesBefore, 'Logs');
            if (newName) {
              logToRenderer(webContents, `Archivo renombrado: ${newName}`, 'success');
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
    const downloadPath = path.join(os.homedir(), 'Downloads', 'Aprendo_Export');

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

        await new Promise(r => setTimeout(r, 1500));

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
          await new Promise(r => setTimeout(r, 6000));
          const label = `Asistencia ${shortName}`;
          const newName = renameDownloadedFile(downloadPath, filesBefore, label);
          if (newName) {
            logToRenderer(webContents, `   Archivo: ${newName}`, 'success');
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
