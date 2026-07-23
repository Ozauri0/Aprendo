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

            <main id="main-content">
                <div class="descargas-layout">
                    <section class="descargas-courses" id="loginSection">
                        <div class="descargas-courses-header">
                            <h2>${(0, icons_1.getIcon)('log-in', 20)} Iniciar Sesión</h2>
                            <p class="section-description">Ingresa tus credenciales de Aprendo UCT para comenzar</p>
                        </div>
                        <div class="descargas-login-form">
                            <div class="input-group" style="display: flex; flex-direction: column; gap: 15px; max-width: 350px; margin: 0 auto;">
                                <div class="input-wrapper">
                                    <label class="input-label" for="loginUsername">${(0, icons_1.getIcon)('user', 16)} Usuario</label>
                                    <input type="text" id="loginUsername" placeholder="Nombre de usuario" class="input-field">
                                </div>
                                <div class="input-wrapper">
                                    <label class="input-label" for="loginPassword">${(0, icons_1.getIcon)('lock', 16)} Contraseña</label>
                                    <input type="password" id="loginPassword" placeholder="Contraseña" class="input-field">
                                </div>
                                <button class="btn btn-primary btn-large" onclick="startLoginProcess()" id="loginBtn" style="width: 100%;">
                                    ${(0, icons_1.getIcon)('log-in', 18)} Iniciar Sesión
                                </button>
                            </div>
                        </div>
                    </section>

                    <section class="descargas-courses" id="coursesSection" style="display: none;">
                        <div class="descargas-courses-header">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                                <h2>${(0, icons_1.getIcon)('book-open', 20)} Cursos Disponibles</h2>
                                <div class="status-display status-idle" id="statusDisplay" role="status" aria-live="polite">
                                    <span class="status-icon">${(0, icons_1.getIcon)('info', 18)}</span>
                                    <span class="status-text">Listo</span>
                                </div>
                            </div>
                            <div class="descargas-search-row">
                                <div class="input-wrapper" style="flex: 2;">
                                    <input type="text" id="courseSearch" placeholder="Buscar por nombre o ID..." class="input-field" oninput="filterCourses()">
                                </div>
                                <div class="input-wrapper" style="flex: 1;">
                                    <select id="yearFilter" class="input-field" onchange="filterCourses()">
                                        <option value="">Todos los años</option>
                                    </select>
                                </div>
                                <div class="input-wrapper" style="flex: 1;">
                                    <select id="semesterFilter" class="input-field" onchange="filterCourses()">
                                        <option value="">Todos los semestres</option>
                                        <option value="1">1er Semestre</option>
                                        <option value="2">2do Semestre</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div id="coursesGrid" class="descargas-courses-grid"></div>
                    </section>

                    <aside class="descargas-sidebar" id="downloadSidebar" style="display: none;">
                        <div class="descargas-sidebar-panel">
                            <div class="panel-title">
                                <span class="icon">${(0, icons_1.getIcon)('download', 18)}</span> Descarga Masiva por Rango
                            </div>
                            <div class="input-group" style="display: flex; gap: 10px; margin-bottom: 12px;">
                                <div class="input-wrapper">
                                    <label class="input-label" for="startId">ID Inicial</label>
                                    <input type="number" id="startId" placeholder="Ej: 469" class="input-field">
                                </div>
                                <div class="input-wrapper">
                                    <label class="input-label" for="endId">ID Final</label>
                                    <input type="number" id="endId" placeholder="Ej: 493" class="input-field">
                                </div>
                            </div>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <button class="btn btn-success btn-sm" onclick="startDownloadLoop()" id="downloadBtn" style="flex: 1;" title="Descargar Notas">
                                    ${(0, icons_1.getIcon)('chart-bar', 14)} Notas
                                </button>
                                <button class="btn btn-info btn-sm" onclick="startLogDownloadLoop()" id="logDownloadBtn" style="flex: 1;" title="Descargar Participación">
                                    ${(0, icons_1.getIcon)('clipboard-list', 14)} Logs
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="startAttendanceDownloadLoop()" id="attendanceDownloadBtn" style="flex: 1;" title="Descargar Asistencia">
                                    ${(0, icons_1.getIcon)('calendar', 14)} Asist.
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="stopDownloadLoop()" id="stopBtn" style="display:none; width: 100%;">
                                    ${(0, icons_1.getIcon)('stop', 14)} Detener
                                </button>
                            </div>
                        </div>

                        <div class="descargas-sidebar-panel descargas-terminal-panel">
                            <div class="log-panel-header">
                                <h3 class="log-panel-title">
                                    <span class="icon">${(0, icons_1.getIcon)('list', 16)}</span>
                                    Registro de Actividad
                                    <span class="log-panel-counter" id="logCounter" title="Cantidad de entradas">0</span>
                                </h3>
                                <div class="log-panel-actions" role="toolbar" aria-label="Acciones del registro">
                                    <button class="btn-icon" id="copyLogBtn" title="Copiar registro al portapapeles" aria-label="Copiar registro al portapapeles" disabled>
                                        ${(0, icons_1.getIcon)('copy', 14)}
                                    </button>
                                    <button class="btn-icon" id="clearLogBtn" title="Limpiar registro" aria-label="Limpiar registro" disabled>
                                        ${(0, icons_1.getIcon)('trash-2', 14)}
                                    </button>
                                </div>
                            </div>
                            <div id="activityLog" class="activity-log" role="log" aria-live="polite" aria-label="Registro de actividad de descargas"></div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>

        <footer>
            <div class="footer-brand">
                <span>Universidad Católica de Temuco</span>
            </div>
            <div class="footer-divider"></div>
            <p>Aprendo UCT v1.0.0 &mdash; Desarrollado por <a class="footer-link" href="#" onclick="event.preventDefault(); require('electron').shell.openExternal('https://christianferrer.me')">Christian Ferrer</a></p>
        </footer>
    </div>
    `;
    const activityLog = document.getElementById('activityLog');
    const statusDisplay = document.getElementById('statusDisplay');
    const logCounter = document.getElementById('logCounter');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const copyLogBtn = document.getElementById('copyLogBtn');
    log('Módulo de descargas inicializado', 'info');
    updateStatus('Esperando inicio de sesión...', 'idle');
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
    let allCourses = [];
    let currentFilteredCourses = [];
    let currentPage = 1;
    const COURSES_PER_PAGE = 15;
    window.navigate = navigate;
    window.goBack = () => navigate('home');
    window.startLoginProcess = startLoginProcess;
    window.startDownloadLoop = startDownloadLoop;
    window.startLogDownloadLoop = startLogDownloadLoop;
    window.startAttendanceDownloadLoop = startAttendanceDownloadLoop;
    window.stopDownloadLoop = stopDownloadLoop;
    window.toggleTheme = toggleTheme;
    window.courseDownload = courseDownload;
    window.filterCourses = filterCourses;
    window.goToPage = goToPage;
    window.nextPage = nextPage;
    window.prevPage = prevPage;
    window.clearActivityLog = clearLog;
    (0, title_bar_1.setupTitleBarActions)();
    /**
     * Auto-scroll inteligente: solo hace scroll al fondo si el usuario
     * ya estaba cerca del fondo. Si el usuario scrolleó hacia arriba
     * para leer historial, respetamos su posición. Marcamos visualmente
     * el contenedor cuando el usuario se ha "despegado" del fondo.
     */
    function isScrolledToBottom(el, threshold = 32) {
        return el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;
    }
    function updateLogUI() {
        const count = activityLog.children.length;
        if (logCounter)
            logCounter.textContent = String(count);
        const hasContent = count > 0;
        if (clearLogBtn)
            clearLogBtn.disabled = !hasContent;
        if (copyLogBtn)
            copyLogBtn.disabled = !hasContent;
    }
    function log(message, type = 'info') {
        // Si el usuario está cerca del fondo, mantenemos el auto-scroll.
        // Si scrolleó hacia arriba, NO lo movemos para respetar su lectura.
        const shouldStickToBottom = isScrolledToBottom(activityLog);
        const now = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `<span class="log-time">[${now}]</span> ${message}`;
        activityLog.appendChild(entry);
        updateLogUI();
        if (shouldStickToBottom) {
            // Forzar el siguiente frame para que el scrollTop se aplique
            // después de que el browser haya calculado el nuevo scrollHeight.
            requestAnimationFrame(() => {
                activityLog.scrollTop = activityLog.scrollHeight;
                activityLog.removeAttribute('data-user-scrolled');
            });
        }
        else {
            activityLog.setAttribute('data-user-scrolled', 'true');
        }
    }
    function clearLog() {
        // Solo permitir limpiar cuando no hay descarga activa
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn && stopBtn.style.display !== 'none') {
            log('No se puede limpiar el registro mientras hay una descarga activa.', 'warning');
            return;
        }
        activityLog.innerHTML = '';
        updateLogUI();
        log('Registro limpiado.', 'info');
    }
    async function copyLog() {
        if (activityLog.children.length === 0)
            return;
        const text = Array.from(activityLog.children)
            .map((el) => el.innerText.trim())
            .join('\n');
        try {
            await navigator.clipboard.writeText(text);
            // Feedback visual breve: deshabilitar botón y cambiar title
            const originalTitle = copyLogBtn.title;
            copyLogBtn.title = '¡Copiado!';
            copyLogBtn.disabled = true;
            setTimeout(() => {
                copyLogBtn.title = originalTitle;
                updateLogUI();
            }, 1200);
        }
        catch (e) {
            // Fallback: select + execCommand para entornos sin clipboard API
            try {
                const range = document.createRange();
                range.selectNodeContents(activityLog);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
                document.execCommand('copy');
                sel?.removeAllRanges();
                log('Registro copiado al portapapeles.', 'success');
            }
            catch {
                log('No se pudo copiar el registro.', 'error');
            }
        }
    }
    // Wire up log panel buttons
    if (clearLogBtn)
        clearLogBtn.addEventListener('click', clearLog);
    if (copyLogBtn)
        copyLogBtn.addEventListener('click', copyLog);
    // Detectar scroll manual del usuario para mostrar/ocultar el indicador
    // "user-scrolled". Se usa para futuros refinamientos del auto-scroll.
    activityLog.addEventListener('scroll', () => {
        if (isScrolledToBottom(activityLog)) {
            activityLog.removeAttribute('data-user-scrolled');
        }
        else {
            activityLog.setAttribute('data-user-scrolled', 'true');
        }
    });
    updateLogUI();
    function updateStatus(text, type) {
        if (!statusDisplay)
            return;
        const iconClass = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'alert-triangle' : type === 'processing' ? 'loader' : 'info';
        statusDisplay.innerHTML = `
            <span class="status-icon">${(0, icons_1.getIcon)(iconClass, 18)}</span>
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
                updateStatus('Sesión iniciada', 'success');
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('coursesSection').style.display = 'flex';
                document.getElementById('downloadSidebar').style.display = 'flex';
                document.querySelector('.page-scroll')?.classList.add('descargas-expanded');
                await loadCourses();
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
    async function loadCourses() {
        try {
            const result = await window.aprendoAPI.fetchCourses();
            if (result.success && result.courses) {
                allCourses = [...result.courses].sort((a, b) => a.id - b.id);
                populateFilters();
                currentFilteredCourses = allCourses;
                currentPage = 1;
                renderPagedCourses();
            }
            else {
                log('No se pudieron cargar los cursos.', 'warning');
            }
        }
        catch (e) {
            log(`Error cargando cursos: ${e.message}`, 'error');
        }
    }
    function renderCourses(courses) {
        const grid = document.getElementById('coursesGrid');
        if (!grid)
            return;
        grid.innerHTML = courses.map(c => `
            <div class="course-card" data-course-id="${c.id}">
                <div class="course-card-info">
                    <span class="course-card-name" title="${c.name}">${c.name}</span>
                    <span class="course-card-id">ID ${c.id}${c.semester ? ' \u2022 ' + c.semester + '\u00BA sem.' : ''}</span>
                </div>
                <div class="course-card-actions">
                    <button class="btn btn-sm btn-success" onclick="courseDownload(${c.id}, 'grades')" title="Notas">
                        ${(0, icons_1.getIcon)('chart-bar', 14)}
                    </button>
                    <button class="btn btn-sm btn-info" onclick="courseDownload(${c.id}, 'logs')" title="Participación">
                        ${(0, icons_1.getIcon)('clipboard-list', 14)}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="courseDownload(${c.id}, 'attendance')" title="Asistencia">
                        ${(0, icons_1.getIcon)('calendar', 14)}
                    </button>
                </div>
            </div>
        `).join('');
        if (courses.length === 0) {
            grid.innerHTML = `<div class="empty-state"><p>No se encontraron cursos.</p></div>`;
        }
    }
    function renderPagedCourses() {
        const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
        const endIndex = startIndex + COURSES_PER_PAGE;
        const pageCourses = currentFilteredCourses.slice(startIndex, endIndex);
        renderCourses(pageCourses);
        renderPagination();
    }
    function renderPagination() {
        const totalPages = Math.ceil(currentFilteredCourses.length / COURSES_PER_PAGE) || 1;
        const startItem = currentFilteredCourses.length === 0 ? 0 : (currentPage - 1) * COURSES_PER_PAGE + 1;
        const endItem = Math.min(currentPage * COURSES_PER_PAGE, currentFilteredCourses.length);
        const grid = document.getElementById('coursesGrid');
        if (!grid)
            return;
        // Remove existing pagination
        const existingPagination = document.getElementById('coursesPagination');
        if (existingPagination)
            existingPagination.remove();
        if (currentFilteredCourses.length === 0)
            return;
        const paginationHTML = `
            <div id="coursesPagination" class="pagination-bar">
                <button class="btn btn-sm btn-primary pagination-btn" onclick="prevPage()" ${currentPage === 1 ? 'disabled' : ''}>
                    ${(0, icons_1.getIcon)('chevron-left', 14)} Anterior
                </button>
                <span class="pagination-info">
                    Mostrando ${startItem}-${endItem} de ${currentFilteredCourses.length} cursos &bull; Página ${currentPage} de ${totalPages}
                </span>
                <button class="btn btn-sm btn-primary pagination-btn" onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>
                    Siguiente ${(0, icons_1.getIcon)('chevron-right', 14)}
                </button>
            </div>
        `;
        grid.insertAdjacentHTML('afterend', paginationHTML);
    }
    function goToPage(page) {
        const totalPages = Math.ceil(currentFilteredCourses.length / COURSES_PER_PAGE) || 1;
        if (page < 1 || page > totalPages)
            return;
        currentPage = page;
        renderPagedCourses();
    }
    function nextPage() {
        goToPage(currentPage + 1);
    }
    function prevPage() {
        goToPage(currentPage - 1);
    }
    function populateFilters() {
        const years = [...new Set(allCourses.map(c => c.year).filter(y => y > 0))].sort((a, b) => b - a);
        const yearSelect = document.getElementById('yearFilter');
        if (yearSelect) {
            yearSelect.innerHTML = '<option value="">Todos los años</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
    }
    function filterCourses() {
        const search = document.getElementById('courseSearch').value.toLowerCase();
        const year = document.getElementById('yearFilter').value;
        const semester = document.getElementById('semesterFilter').value;
        let filtered = allCourses;
        if (search) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || String(c.id).includes(search));
        }
        if (year) {
            filtered = filtered.filter(c => c.year === parseInt(year));
        }
        if (semester) {
            const semValue = parseInt(semester);
            filtered = filtered.filter(c => c.semester === semValue || (semValue === 1 && c.semester === 0));
        }
        currentFilteredCourses = [...filtered].sort((a, b) => a.id - b.id);
        currentPage = 1;
        renderPagedCourses();
    }
    async function courseDownload(id, type) {
        updateStatus(`Descargando ${type} del curso ${id}...`, 'processing');
        log(`Iniciando descarga de ${type} para curso ${id}`, 'info');
        try {
            if (type === 'grades') {
                await window.aprendoAPI.startDownloads({ startId: id, endId: id, downloadPath: '' });
            }
            else if (type === 'logs') {
                await window.aprendoAPI.startLogDownloads({ startId: id, endId: id, downloadPath: '' });
            }
            else {
                const filter = localStorage.getItem('aprendo_attendance_filter') || '';
                await window.aprendoAPI.startAttendanceDownloads({ startId: id, endId: id, downloadPath: '', attendanceFilter: filter });
            }
            updateStatus('Descarga completada', 'success');
        }
        catch (e) {
            log(`Error: ${e.message}`, 'error');
            updateStatus('Error en descarga', 'error');
        }
    }
    async function startDownloadLoop() {
        const startId = parseInt(document.getElementById('startId').value);
        const endId = parseInt(document.getElementById('endId').value);
        const downloadBtn = document.getElementById('downloadBtn');
        const logDownloadBtn = document.getElementById('logDownloadBtn');
        const attendanceDownloadBtn = document.getElementById('attendanceDownloadBtn');
        const stopBtn = document.getElementById('stopBtn');
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
        }
        catch (error) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descargas', 'error');
        }
        finally {
            downloadBtn.disabled = false;
            logDownloadBtn.disabled = false;
            attendanceDownloadBtn.disabled = false;
            stopBtn.style.display = 'none';
        }
    }
    async function startLogDownloadLoop() {
        const startId = parseInt(document.getElementById('startId').value);
        const endId = parseInt(document.getElementById('endId').value);
        const downloadBtn = document.getElementById('downloadBtn');
        const logDownloadBtn = document.getElementById('logDownloadBtn');
        const attendanceDownloadBtn = document.getElementById('attendanceDownloadBtn');
        const stopBtn = document.getElementById('stopBtn');
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
        }
        catch (error) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descarga de logs', 'error');
        }
        finally {
            downloadBtn.disabled = false;
            logDownloadBtn.disabled = false;
            attendanceDownloadBtn.disabled = false;
            stopBtn.style.display = 'none';
        }
    }
    async function startAttendanceDownloadLoop() {
        const startId = parseInt(document.getElementById('startId').value);
        const endId = parseInt(document.getElementById('endId').value);
        const downloadBtn = document.getElementById('downloadBtn');
        const logDownloadBtn = document.getElementById('logDownloadBtn');
        const attendanceDownloadBtn = document.getElementById('attendanceDownloadBtn');
        const stopBtn = document.getElementById('stopBtn');
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
            });
        }
        catch (error) {
            log(`Error fatal: ${error.message}`, 'error');
            updateStatus('Error fatal en descarga de asistencia', 'error');
        }
        finally {
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
