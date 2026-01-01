"use strict";
// @ts-nocheck
// Port del gestor de descargas original (login + descargas masivas)
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDescargasPage = renderDescargasPage;
const puppeteer = require('puppeteer');
const { getIcon } = require('./icons');
const { renderHeader, applyStoredTheme } = require('./components/header');
// Configuration
const APRENDO_URL = 'https://aprendo.uct.cl/';
// DOM Elements
let statusDisplay;
let activityLog;
let loginBtn;
function renderDescargasPage(injectStyles, navigate) {
    injectStyles(['styles.css', 'global-styles.css', 'descargas.css']);
    // Aplicar tema guardado
    applyStoredTheme();
    document.body.innerHTML = `
    <div class="container">
        ${renderHeader({
        title: 'Gestor de Descargas',
        subtitle: 'Automatización de descargas desde Aprendo UCT',
        showBackButton: true,
        showConfigButton: true
    })}

        <main>
            <div class="control-panel">
                <div class="status-display" id="statusDisplay">
                    <span class="status-icon">${getIcon('info', 20)}</span>
                    <span class="status-text">Esperando inicio de sesión...</span>
                </div>

                <div id="loginSection" class="login-section">
                    <div class="input-group"
                        style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; max-width: 300px; margin-left: auto; margin-right: auto;">
                        <div class="input-wrapper">
                            <label class="input-label" for="loginUsername">${getIcon('user', 16)} Usuario</label>
                            <input type="text" id="loginUsername" placeholder="Nombre de usuario" class="input-field">
                        </div>
                        <div class="input-wrapper">
                            <label class="input-label" for="loginPassword">${getIcon('lock', 16)} Contraseña</label>
                            <input type="password" id="loginPassword" placeholder="Contraseña" class="input-field">
                        </div>
                    </div>
                    <div class="action-buttons-center">
                        <button class="btn btn-primary btn-large" onclick="startLoginProcess()" id="loginBtn">
                            ${getIcon('log-in', 18)} Iniciar Sesión
                        </button>
                    </div>
                </div>

                <div id="downloadSection" class="range-section"
                    style="display: none; margin-top: 20px; border-top: 1px solid var(--color-border); padding-top: 20px; width: 100%;">
                    <h3>${getIcon('download', 20)} Descarga Masiva</h3>
                    <div class="input-group"
                        style="display: flex; gap: 15px; justify-content: center; margin-bottom: 15px;">
                        <div class="input-wrapper">
                            <label class="input-label" for="startId">ID Inicial</label>
                            <input type="number" id="startId" placeholder="Ej: 469" class="input-field"
                                style="width: 120px;">
                        </div>
                        <div class="input-wrapper">
                            <label class="input-label" for="endId">ID Final</label>
                            <input type="number" id="endId" placeholder="Ej: 493" class="input-field"
                                style="width: 120px;">
                        </div>
                    </div>
                    <div class="action-buttons-center">
                        <button class="btn btn-success btn-large" onclick="startDownloadLoop()" id="downloadBtn">
                            ${getIcon('play', 18)} Comenzar Descargas
                        </button>
                    </div>
                </div>
            </div>

            <div class="log-container"
                style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; max-width: 900px; margin-left: auto; margin-right: auto;">
                <h3>${getIcon('list', 20)} Registro de Actividad</h3>
                <div id="activityLog" class="activity-log"></div>
            </div>
        </main>

        <footer>
            <p>Aprendo UCT v1.0.0 - Universidad Católica de Temuco</p>
        </footer>
    </div>
    `;
    statusDisplay = document.getElementById('statusDisplay');
    activityLog = document.getElementById('activityLog');
    loginBtn = document.getElementById('loginBtn');
    log('Módulo de descargas inicializado', 'info');
    window.navigate = navigate;
    window.goBack = () => navigate('home');
    window.startLoginProcess = startLoginProcess;
    window.startDownloadLoop = startDownloadLoop;
    window.toggleTheme = toggleTheme;
}
// Función de toggle de tema
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('aprendo-theme', newTheme);
}
function goBack() {
    if (typeof window.navigate === 'function') {
        window.navigate('home');
    }
    else {
        window.location.href = 'index.html';
    }
}
// Global variables to hold browser instance
let globalBrowser = null;
let globalPage = null;
let currentCredentials = { username: '', password: '' };
async function launchAndLogin(username, password) {
    log('Iniciando nueva sesión de navegador...', 'info');
    if (!username || !password) {
        throw new Error('Credenciales requeridas.');
    }
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();
    try {
        log(`Navegando a ${APRENDO_URL}...`, 'info');
        await page.goto(APRENDO_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        // Check if login is needed
        try {
            await page.waitForSelector('#inputName', { timeout: 5000 });
            log('Ingresando credenciales...', 'info');
            await page.type('#inputName', username);
            await page.type('#inputPassword', password);
            log('Enviando formulario...', 'info');
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
        catch (e) {
            log('Verificando sesión existente...', 'info');
        }
        // Verify login success
        const loginInputExists = await page.$('#inputName');
        if (!loginInputExists) {
            log('¡Sesión activa confirmada!', 'success');
            return { browser, page };
        }
        else {
            throw new Error('Fallo en el inicio de sesión. Verifique credenciales.');
        }
    }
    catch (error) {
        await browser.close();
        throw error;
    }
}
async function startLoginProcess() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (!username || !password) {
        updateStatus('Por favor ingrese usuario y contraseña', 'warning');
        return;
    }
    loginBtn.disabled = true;
    updateStatus('Iniciando proceso de login...', 'processing');
    try {
        // Close existing browser if any
        if (globalBrowser) {
            try {
                await globalBrowser.close();
            }
            catch (e) { }
            globalBrowser = null;
            globalPage = null;
        }
        // Store credentials temporarily for reconnection
        currentCredentials = { username, password };
        const session = await launchAndLogin(username, password);
        globalBrowser = session.browser;
        globalPage = session.page;
        updateStatus('Sesión iniciada correctamente', 'success');
        // Show download section and hide login section
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'block';
    }
    catch (error) {
        log(`Error: ${error.message}`, 'error');
        updateStatus('Error en el proceso', 'error');
        console.error(error);
    }
    finally {
        loginBtn.disabled = false;
    }
}
async function startDownloadLoop() {
    const startId = parseInt(document.getElementById('startId').value);
    const endId = parseInt(document.getElementById('endId').value);
    const downloadBtn = document.getElementById('downloadBtn');
    if (!startId || !endId || startId > endId) {
        updateStatus('Por favor ingrese un rango de IDs válido.', 'warning');
        return;
    }
    downloadBtn.disabled = true;
    updateStatus(`Iniciando descargas del ID ${startId} al ${endId}...`, 'processing');
    log(`Iniciando ciclo de descargas: ${startId} -> ${endId}`, 'info');
    try {
        // Ensure we have a valid session
        let page = globalPage;
        let browser = globalBrowser;
        // Check if browser is connected
        let isConnected = false;
        if (browser) {
            try {
                // Try to get pages to check connection
                await browser.pages();
                isConnected = true;
            }
            catch (e) {
                isConnected = false;
            }
        }
        if (!browser || !isConnected) {
            log('Sesión perdida o navegador cerrado. Reconectando...', 'warning');
            try {
                const session = await launchAndLogin(currentCredentials.username, currentCredentials.password);
                globalBrowser = session.browser;
                globalPage = session.page;
                browser = globalBrowser;
                page = globalPage;
            }
            catch (e) {
                throw new Error(`No se pudo reconectar: ${e.message}`);
            }
        }
        // Configure download behavior
        const client = await page.target().createCDPSession();
        const path = require('path');
        const os = require('os');
        const downloadPath = path.join(os.homedir(), 'Downloads', 'Aprendo_Export');
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath
        });
        log(`Carpeta de descarga configurada: ${downloadPath}`, 'info');
        let successCount = 0;
        let emptyCount = 0;
        for (let id = startId; id <= endId; id++) {
            updateStatus(`Procesando curso ID: ${id}`, 'processing');
            log(`Navegando a curso ID: ${id}...`, 'info');
            const exportUrl = `https://aprendo.uct.cl/grade/export/xls/index.php?id=${id}`;
            try {
                // Check connection before each navigation
                try {
                    await browser.pages();
                }
                catch (e) {
                    log('Conexión perdida durante el ciclo. Intentando reconectar...', 'warning');
                    const session = await launchAndLogin(currentCredentials.username, currentCredentials.password);
                    globalBrowser = session.browser;
                    globalPage = session.page;
                    browser = globalBrowser;
                    page = globalPage;
                    // Re-configure download path for new session
                    const newClient = await page.target().createCDPSession();
                    await newClient.send('Page.setDownloadBehavior', {
                        behavior: 'allow',
                        downloadPath: downloadPath
                    });
                }
                await page.goto(exportUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                const submitBtn = await page.$('#id_submitbutton');
                if (submitBtn) {
                    log(`Botón de descarga encontrado para ID ${id}. Descargando...`, 'info');
                    await Promise.all([
                        page.click('#id_submitbutton'),
                        new Promise(r => setTimeout(r, 2000))
                    ]);
                    log(`Descarga iniciada para ID ${id}`, 'success');
                    successCount++;
                }
                else {
                    const currentUrl = page.url();
                    const currentTitle = await page.title();
                    log(`No se encontró botón. ID: ${id}`, 'warning');
                    log(`   URL: ${currentUrl}`, 'warning');
                    log(`   Título: ${currentTitle}`, 'warning');
                    if (await page.$('#inputName') || currentTitle.includes('Log in') || currentTitle.includes('Entrar')) {
                        log('   Detectado formulario de login. Sesión perdida.', 'error');
                        // Force reconnection on next iteration
                        try {
                            await browser.close();
                        }
                        catch (e) { }
                        globalBrowser = null;
                    }
                    emptyCount++;
                }
            }
            catch (err) {
                log(`Error procesando ID ${id}: ${err.message}`, 'error');
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        updateStatus(`Proceso finalizado. Descargas: ${successCount}, Vacíos/Error: ${emptyCount}`, 'success');
        log('Ciclo de descargas completado.', 'success');
    }
    catch (error) {
        log(`Error fatal en el ciclo de descargas: ${error.message}`, 'error');
        updateStatus('Error fatal en descargas', 'error');
    }
    finally {
        downloadBtn.disabled = false;
    }
}
function updateStatus(text, type) {
    const iconClass = type === 'success' ? 'icon-check-circle' : type === 'error' ? 'icon-x-circle' : type === 'warning' ? 'icon-warning' : 'icon-loader';
    statusDisplay.innerHTML = `
        <span class="status-icon"><span class="icon ${iconClass}"></span></span>
        <span class="status-text">${text}</span>
    `;
    statusDisplay.className = `status-display status-${type}`;
}
function log(message, type = 'info') {
    const now = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
    activityLog.appendChild(entry);
    // Scroll automático al último elemento
    entry.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
