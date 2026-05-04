"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDescargasPage = renderDescargasPage;
// descargas.ts - Gestor de descargas (renderer) usando IPC seguro
const icons_1 = require("./icons");
const header_1 = require("./components/header");
const title_bar_1 = require("./components/title-bar");
// Unsubscribe functions for IPC listeners
let unsubLog = null;
let unsubStatus = null;
function renderDescargasPage(injectStyles, navigate) {
    // Clean up previous listeners to avoid duplicates
    if (unsubLog) {
        unsubLog();
        unsubLog = null;
    }
    if (unsubStatus) {
        unsubStatus();
        unsubStatus = null;
    }
    injectStyles(['styles.css', 'global-styles.css', 'descargas.css']);
    (0, header_1.applyStoredTheme)();
    document.body.innerHTML = `
    ${(0, title_bar_1.renderTitleBar)('Gestor de Descargas')}
    <div class="page-scroll">
        <div class="container">
            ${(0, header_1.renderHeader)({
        title: 'Gestor de Descargas',
        subtitle: 'Automatización de descargas desde Aprendo UCT',
        showBackButton: true,
        showConfigButton: true
    })}

            <main>
                <div class="control-panel">
                    <div class="status-display" id="statusDisplay">
                        <span class="status-icon">${(0, icons_1.getIcon)('info', 20)}</span>
                        <span class="status-text">Esperando inicio de sesión...</span>
                    </div>

                    <div id="loginSection" class="login-section">
                        <div class="input-group"
                            style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; max-width: 300px; margin-left: auto; margin-right: auto;">
                            <div class="input-wrapper">
                                <label class="input-label" for="loginUsername">${(0, icons_1.getIcon)('user', 16)} Usuario</label>
                                <input type="text" id="loginUsername" placeholder="Nombre de usuario" class="input-field">
                            </div>
                            <div class="input-wrapper">
                                <label class="input-label" for="loginPassword">${(0, icons_1.getIcon)('lock', 16)} Contraseña</label>
                                <input type="password" id="loginPassword" placeholder="Contraseña" class="input-field">
                            </div>
                        </div>
                        <div class="action-buttons-center">
                            <button class="btn btn-primary btn-large" onclick="startLoginProcess()" id="loginBtn">
                                ${(0, icons_1.getIcon)('log-in', 18)} Iniciar Sesión
                            </button>
                        </div>
                    </div>

                    <div id="downloadSection" class="range-section"
                        style="display: none; margin-top: 20px; border-top: 1px solid var(--color-border); padding-top: 20px; width: 100%;">
                        <h3>${(0, icons_1.getIcon)('download', 20)} Descarga Masiva</h3>
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
                        <div class="action-buttons-center" style="gap: 10px;">
                            <button class="btn btn-success btn-large" onclick="startDownloadLoop()" id="downloadBtn">
                                ${(0, icons_1.getIcon)('play', 18)} Comenzar Descargas
                            </button>
                            <button class="btn btn-warning btn-large" onclick="stopDownloadLoop()" id="stopBtn" style="display:none;">
                                ${(0, icons_1.getIcon)('stop', 18)} Detener
                            </button>
                        </div>
                    </div>
                </div>

                <div class="log-container"
                    style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; max-width: 900px; margin-left: auto; margin-right: auto;">
                    <h3>${(0, icons_1.getIcon)('list', 20)} Registro de Actividad</h3>
                    <div id="activityLog" class="activity-log"></div>
                </div>
            </main>
        </div>

        <footer>
            <p>Aprendo UCT v1.0.0 &mdash; Universidad Católica de Temuco</p>
        </footer>
    </div>
    `;
    const activityLog = document.getElementById('activityLog');
    const statusDisplay = document.getElementById('statusDisplay');
    log('Módulo de descargas inicializado', 'info');
    // Subscribe to IPC events from main process
    if (window.aprendoAPI) {
        unsubLog = window.aprendoAPI.onDownloadLog((data) => {
            log(data.message, data.type);
        });
        unsubStatus = window.aprendoAPI.onDownloadStatus((data) => {
            updateStatus(data.text, data.type);
        });
    }
    else {
        log('API de preload no disponible. Verifique la configuración de seguridad.', 'error');
    }
    window.navigate = navigate;
    window.goBack = () => navigate('home');
    window.startLoginProcess = startLoginProcess;
    window.startDownloadLoop = startDownloadLoop;
    window.stopDownloadLoop = stopDownloadLoop;
    window.toggleTheme = toggleTheme;
    (0, title_bar_1.setupTitleBarActions)();
    function log(message, type = 'info') {
        const now = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
        activityLog.appendChild(entry);
        activityLog.scrollTop = activityLog.scrollHeight;
    }
    function updateStatus(text, type) {
        if (!statusDisplay)
            return;
        const iconClass = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'alert-triangle' : 'loader';
        statusDisplay.innerHTML = `
            <span class="status-icon">${(0, icons_1.getIcon)(iconClass, 20)}</span>
            <span class="status-text">${text}</span>
        `;
        statusDisplay.className = `status-display status-${type}`;
    }
    async function startLoginProcess() {
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const loginBtn = document.getElementById('loginBtn');
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            updateStatus('Por favor ingrese usuario y contraseña', 'warning');
            return;
        }
        loginBtn.disabled = true;
        updateStatus('Iniciando proceso de login...', 'processing');
        try {
            const result = await window.aprendoAPI.loginAprendo(username, password);
            if (result.success) {
                updateStatus('Sesión iniciada correctamente', 'success');
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('downloadSection').style.display = 'block';
            }
            else {
                log(`Error: ${result.message}`, 'error');
                updateStatus('Error en el proceso', 'error');
            }
        }
        catch (error) {
            log(`Error: ${error.message}`, 'error');
            updateStatus('Error en el proceso', 'error');
        }
        finally {
            loginBtn.disabled = false;
        }
    }
    async function startDownloadLoop() {
        const startId = parseInt(document.getElementById('startId').value);
        const endId = parseInt(document.getElementById('endId').value);
        const downloadBtn = document.getElementById('downloadBtn');
        const stopBtn = document.getElementById('stopBtn');
        if (!startId || !endId || startId > endId) {
            updateStatus('Por favor ingrese un rango de IDs válido.', 'warning');
            return;
        }
        downloadBtn.disabled = true;
        stopBtn.style.display = 'inline-flex';
        updateStatus(`Iniciando descargas del ID ${startId} al ${endId}...`, 'processing');
        log(`Iniciando ciclo de descargas: ${startId} -> ${endId}`, 'info');
        try {
            await window.aprendoAPI.startDownloads({
                startId,
                endId,
                downloadPath: ''
            });
        }
        catch (error) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descargas', 'error');
        }
        finally {
            downloadBtn.disabled = false;
            stopBtn.style.display = 'none';
        }
    }
    async function stopDownloadLoop() {
        try {
            await window.aprendoAPI.stopDownloads();
            log('Solicitud de detención enviada.', 'warning');
        }
        catch (error) {
            log(`Error al detener: ${error.message}`, 'error');
        }
    }
}
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('aprendo-theme', newTheme);
}
