// descargas.ts - Gestor de descargas (renderer) usando IPC seguro
import { getIcon } from './icons';
import { renderHeader, applyStoredTheme } from './components/header';
import { renderTitleBar, setupTitleBarActions } from './components/title-bar';

// Unsubscribe functions for IPC listeners
let unsubLog: (() => void) | null = null;
let unsubStatus: (() => void) | null = null;

export function renderDescargasPage(
    injectStyles: (files: string[]) => void,
    navigate: (view: string) => void
) {
    // Clean up previous listeners to avoid duplicates
    if (unsubLog) { unsubLog(); unsubLog = null; }
    if (unsubStatus) { unsubStatus(); unsubStatus = null; }

    injectStyles(['styles.css', 'global-styles.css', 'descargas.css']);
    applyStoredTheme();

    document.body.innerHTML = `
    ${renderTitleBar('Gestor de Descargas')}
    <div class="page-scroll">
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
                        <div class="action-buttons-center" style="gap: 10px;">
                            <button class="btn btn-success btn-large" onclick="startDownloadLoop()" id="downloadBtn">
                                ${getIcon('play', 18)} Descargar Notas
                            </button>
                            <button class="btn btn-info btn-large" onclick="startLogDownloadLoop()" id="logDownloadBtn">
                                ${getIcon('clipboard-list', 18)} Descargar Participación
                            </button>
                            <button class="btn btn-secondary btn-large" onclick="startAttendanceDownloadLoop()" id="attendanceDownloadBtn">
                                ${getIcon('calendar', 18)} Descargar Asistencia
                            </button>
                            <button class="btn btn-warning btn-large" onclick="stopDownloadLoop()" id="stopBtn" style="display:none;">
                                ${getIcon('stop', 18)} Detener
                            </button>
                        </div>
                    </div>
                    </div>
                </div>

                <div class="log-container"
                    style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; max-width: 900px; margin-left: auto; margin-right: auto;">
                    <h3>${getIcon('list', 20)} Registro de Actividad</h3>
                    <div id="activityLog" class="activity-log"></div>
                </div>
            </main>
        </div>

        <footer>
            <p>Aprendo UCT v1.0.0 &mdash; Universidad Católica de Temuco</p>
        </footer>
    </div>
    `;

    const activityLog = document.getElementById('activityLog') as HTMLDivElement;
    const statusDisplay = document.getElementById('statusDisplay') as HTMLDivElement;

    log('Módulo de descargas inicializado', 'info');

    // Subscribe to IPC events from main process
    if (window.aprendoAPI) {
        unsubLog = window.aprendoAPI.onDownloadLog((data) => {
            log(data.message, data.type);
        });
        unsubStatus = window.aprendoAPI.onDownloadStatus((data) => {
            updateStatus(data.text, data.type);
        });
    } else {
        log('API de preload no disponible. Verifique la configuración de seguridad.', 'error');
    }

    (window as any).navigate = navigate;
    (window as any).goBack = () => navigate('home');
    (window as any).startLoginProcess = startLoginProcess;
    (window as any).startDownloadLoop = startDownloadLoop;
    (window as any).startLogDownloadLoop = startLogDownloadLoop;
    (window as any).startAttendanceDownloadLoop = startAttendanceDownloadLoop;
    (window as any).stopDownloadLoop = stopDownloadLoop;
    (window as any).toggleTheme = toggleTheme;
    setupTitleBarActions();

    function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        const now = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
        activityLog.appendChild(entry);
        activityLog.scrollTop = activityLog.scrollHeight;
    }

    function updateStatus(text: string, type: string) {
        if (!statusDisplay) return;
        const iconClass = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'alert-triangle' : 'loader';
        statusDisplay.innerHTML = `
            <span class="status-icon">${getIcon(iconClass as any, 20)}</span>
            <span class="status-text">${text}</span>
        `;
        statusDisplay.className = `status-display status-${type}`;
    }

    async function startLoginProcess() {
        const usernameInput = document.getElementById('loginUsername') as HTMLInputElement;
        const passwordInput = document.getElementById('loginPassword') as HTMLInputElement;
        const loginBtn = document.getElementById('loginBtn') as HTMLButtonElement;
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
                document.getElementById('loginSection')!.style.display = 'none';
                document.getElementById('downloadSection')!.style.display = 'block';
            } else {
                log(`Error: ${result.message}`, 'error');
                updateStatus('Error en el proceso', 'error');
            }
        } catch (error: any) {
            log(`Error: ${error.message}`, 'error');
            updateStatus('Error en el proceso', 'error');
        } finally {
            loginBtn.disabled = false;
        }
    }

    async function startDownloadLoop() {
        const startId = parseInt((document.getElementById('startId') as HTMLInputElement).value);
        const endId = parseInt((document.getElementById('endId') as HTMLInputElement).value);
        const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
        const logDownloadBtn = document.getElementById('logDownloadBtn') as HTMLButtonElement;
        const attendanceDownloadBtn = document.getElementById('attendanceDownloadBtn') as HTMLButtonElement;
        const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;

        if (!startId || !endId || startId > endId) {
            updateStatus('Por favor ingrese un rango de IDs válido.', 'warning');
            return;
        }

        downloadBtn.disabled = true;
        logDownloadBtn.disabled = true;
        attendanceDownloadBtn.disabled = true;
        stopBtn.style.display = 'inline-flex';
        updateStatus(`Iniciando descargas del ID ${startId} al ${endId}...`, 'processing');
        log(`Iniciando ciclo de descargas: ${startId} -> ${endId}`, 'info');

        try {
            await window.aprendoAPI.startDownloads({
                startId,
                endId,
                downloadPath: ''
            });
        } catch (error: any) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descargas', 'error');
        } finally {
            downloadBtn.disabled = false;
            logDownloadBtn.disabled = false;
            attendanceDownloadBtn.disabled = false;
            stopBtn.style.display = 'none';
        }
    }

    async function startLogDownloadLoop() {
        const startId = parseInt((document.getElementById('startId') as HTMLInputElement).value);
        const endId = parseInt((document.getElementById('endId') as HTMLInputElement).value);
        const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
        const logDownloadBtn = document.getElementById('logDownloadBtn') as HTMLButtonElement;
        const attendanceDownloadBtn = document.getElementById('attendanceDownloadBtn') as HTMLButtonElement;
        const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;

        if (!startId || !endId || startId > endId) {
            updateStatus('Por favor ingrese un rango de IDs válido.', 'warning');
            return;
        }

        downloadBtn.disabled = true;
        logDownloadBtn.disabled = true;
        attendanceDownloadBtn.disabled = true;
        stopBtn.style.display = 'inline-flex';
        updateStatus(`Iniciando descarga de participación del ID ${startId} al ${endId}...`, 'processing');
        log(`Iniciando ciclo de logs de participación: ${startId} -> ${endId}`, 'info');

        try {
            await window.aprendoAPI.startLogDownloads({
                startId,
                endId,
                downloadPath: ''
            });
        } catch (error: any) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descarga de logs', 'error');
        } finally {
            downloadBtn.disabled = false;
            logDownloadBtn.disabled = false;
            attendanceDownloadBtn.disabled = false;
            stopBtn.style.display = 'none';
        }
    }

    async function startAttendanceDownloadLoop() {
        const startId = parseInt((document.getElementById('startId') as HTMLInputElement).value);
        const endId = parseInt((document.getElementById('endId') as HTMLInputElement).value);
        const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
        const logDownloadBtn = document.getElementById('logDownloadBtn') as HTMLButtonElement;
        const attendanceDownloadBtn = document.getElementById('attendanceDownloadBtn') as HTMLButtonElement;
        const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
        const filter = localStorage.getItem('aprendo_attendance_filter') || '';

        if (!startId || !endId || startId > endId) {
            updateStatus('Por favor ingrese un rango de IDs válido.', 'warning');
            return;
        }

        downloadBtn.disabled = true;
        logDownloadBtn.disabled = true;
        attendanceDownloadBtn.disabled = true;
        stopBtn.style.display = 'inline-flex';
        updateStatus(`Iniciando descarga de asistencia del ID ${startId} al ${endId}...`, 'processing');
        log(`Iniciando ciclo de asistencia: ${startId} -> ${endId}${filter ? ' (filtro: ' + filter + ')' : ''}`, 'info');

        try {
            await window.aprendoAPI.startAttendanceDownloads({
                startId,
                endId,
                downloadPath: '',
                attendanceFilter: filter
            } as any);
        } catch (error: any) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descarga de asistencia', 'error');
        } finally {
            downloadBtn.disabled = false;
            logDownloadBtn.disabled = false;
            attendanceDownloadBtn.disabled = false;
            stopBtn.style.display = 'none';
        }
    }

    async function stopDownloadLoop() {
        try {
            await window.aprendoAPI.stopDownloads();
            log('Solicitud de detención enviada.', 'warning');
        } catch (error: any) {
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
