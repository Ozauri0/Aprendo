"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderConfigPage = renderConfigPage;
// @ts-nocheck
// config.ts - Sistema de configuración avanzada para filtros de usuarios
const { getIcon } = require('./icons');
const { renderHeader, applyStoredTheme } = require('./components/header');
// Variables globales
let emailFilters = [];
let rutFilters = [];
let eliminatedUsersHistory = [];
let persistenceEnabled = true; // Siempre activado
let consolidationMode = 'separate'; // 'separate' o 'single'
let autoSave = true;
let detailedLogs = true;
let maxFiles = 60;
function renderConfigPage(injectStyles, navigate) {
    document.title = 'Configuración - Aprendo UCT';
    injectStyles(['styles.css', 'global-styles.css', 'config.css']);
    // Aplicar tema guardado
    applyStoredTheme();
    document.body.innerHTML = `
    <div class="container">
        ${renderHeader({
        title: 'Configuración del Sistema',
        subtitle: 'Personaliza los filtros y preferencias de la aplicación',
        showBackButton: true,
        showConfigButton: false
    })}

        <main>
            <div class="section-card">
                <div class="section-header">
                    <h2>Configuración del Sistema</h2>
                    <p class="section-description">
                        Todos los cambios se guardan automáticamente. Personaliza los filtros y preferencias de la aplicación.
                    </p>
                </div>

                <div class="auto-save-info">
                    <div class="info-card-small">
                        <span class="info-icon-small">${getIcon('save', 18)}</span>
                        <span class="info-text">Guardado automático activado</span>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-section-header">
                        <h3>${getIcon('mail', 20)} Filtros por Correo Electrónico</h3>
                        <span class="section-hint">Excluye usuarios por su dirección de correo</span>
                    </div>

                    <div class="input-group">
                        <label class="input-label">Agregar correo individual</label>
                        <div class="input-row">
                            <input type="email" id="emailInput" placeholder="ejemplo@dominio.com" class="input-field">
                            <button class="btn btn-primary" onclick="addEmailFilter()">
                                ${getIcon('plus', 16)} Agregar
                            </button>
                        </div>

                        <div class="textarea-section">
                            <label class="input-label" for="bulkEmailInput">
                                Agregar múltiples correos
                                <span class="label-hint">(uno por línea)</span>
                            </label>
                            <textarea id="bulkEmailInput" rows="4"
                                placeholder="correo1@ejemplo.com&#10;correo2@ejemplo.com&#10;usuario@dominio.cl"></textarea>
                            <button class="btn btn-secondary" onclick="addBulkEmails()">
                                ${getIcon('plus', 16)} Agregar en Lote
                            </button>
                        </div>
                    </div>

                    <div class="filters-list">
                        <div class="filters-list-header">
                            <h4>Correos Filtrados</h4>
                            <span class="count-badge" id="emailCount">0</span>
                        </div>
                        <div id="emailFilters" class="filters-container"></div>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-section-header">
                        <h3>${getIcon('user', 20)} Filtros por RUT</h3>
                        <span class="section-hint">Excluye usuarios por su número de RUT</span>
                    </div>

                    <div class="input-group">
                        <label class="input-label">Agregar RUT individual</label>
                        <div class="input-row">
                            <input type="text" id="rutInput" placeholder="12.345.678-9 o 12345678-9"
                                class="input-field">
                            <button class="btn btn-primary" onclick="addRutFilter()">
                                ${getIcon('plus', 16)} Agregar
                            </button>
                        </div>

                        <div class="textarea-section">
                            <label class="input-label" for="bulkRutInput">
                                Agregar múltiples RUTs
                                <span class="label-hint">(uno por línea)</span>
                            </label>
                            <textarea id="bulkRutInput" rows="4"
                                placeholder="12.345.678-9&#10;98.765.432-1&#10;11222333-4"></textarea>
                            <button class="btn btn-secondary" onclick="addBulkRuts()">
                                ${getIcon('plus', 16)} Agregar en Lote
                            </button>
                        </div>
                    </div>

                    <div class="filters-list">
                        <div class="filters-list-header">
                            <h4>RUTs Filtrados</h4>
                            <span class="count-badge" id="rutCount">0</span>
                        </div>
                        <div id="rutFilters" class="filters-container"></div>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-section-header">
                        <h3>${getIcon('clock', 20)} Historial de Usuarios Filtrados</h3>
                        <span class="section-hint">Consulta el registro de usuarios excluidos</span>
                    </div>
                    <div class="report-controls">
                        <button class="btn btn-info" onclick="showEliminatedReport()">
                            ${getIcon('eye', 16)} Ver Reporte
                        </button>
                        <button class="btn btn-secondary" onclick="exportEliminatedReport()">
                            ${getIcon('download', 16)} Exportar
                        </button>
                        <button class="btn btn-warning" onclick="clearEliminatedHistory()">
                            ${getIcon('trash', 16)} Limpiar Historial
                        </button>
                    </div>

                    <div id="eliminatedReport" class="report-container" style="display: none;">
                        <h4>Últimos Usuarios Excluidos</h4>
                        <div id="eliminatedList" class="eliminated-list"></div>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-section-header">
                        <h3>${getIcon('settings', 20)} Preferencias del Sistema</h3>
                        <span class="section-hint">Ajusta el comportamiento general de la aplicación</span>
                    </div>

                    <div class="settings-grid">
                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">
                                    Guardado Automático de Archivos
                                </label>
                                <span class="setting-description">Guarda automáticamente los archivos procesados</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="autoSave" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="setting-item">
                            <div class="setting-info">
                                <label class="setting-label">
                                    Logs Detallados
                                </label>
                                <span class="setting-description">Muestra información detallada en la consola</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="detailedLogs" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="setting-item full-width">
                            <div class="setting-info">
                                <label class="setting-label" for="maxFiles">
                                    Archivos Simultáneos
                                </label>
                                <span class="setting-description">Máximo de archivos a procesar al mismo tiempo</span>
                            </div>
                            <div class="number-input-group">
                                <input type="number" id="maxFiles" value="10" min="1" max="50"
                                    class="input-field number-input">
                                <span class="number-unit">archivos</span>
                            </div>
                        </div>

                        <div class="setting-item full-width">
                            <div class="setting-info">
                                <label class="setting-label" for="consolidationMode">
                                    Modo de Consolidación de Informes
                                </label>
                                <span class="setting-description">Define cómo se organizará la información al consolidar múltiples archivos Excel</span>
                            </div>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="consolidationMode" value="separate"
                                        id="consolidationSeparate" checked>
                                    <div class="radio-content">
                                        <span class="radio-label">Hojas Separadas</span>
                                        <span class="radio-description">Cada archivo se guardará en una hoja diferente del Excel consolidado</span>
                                    </div>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="consolidationMode" value="single"
                                        id="consolidationSingle">
                                    <div class="radio-content">
                                        <span class="radio-label">Hoja Única</span>
                                        <span class="radio-description">Todos los datos se consolidarán en una sola hoja continua</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="setting-item full-width">
                            <div class="setting-info">
                                <label class="setting-label">
                                    Tema de la Aplicación
                                </label>
                                <span class="setting-description">Selecciona el modo de visualización</span>
                            </div>
                            <div class="theme-buttons">
                                <button class="btn btn-outline btn-sm" onclick="setTheme('light')">
                                    ${getIcon('sun', 16)} Claro
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="setTheme('dark')">
                                    ${getIcon('moon', 16)} Oscuro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer>
            <p>Aprendo UCT v1.0.0 - Universidad Católica de Temuco</p>
        </footer>
    </div>
    `;
    initializeConfigSystem();
    window.navigate = navigate;
    window.goBack = () => navigate('home');
    window.addEmailFilter = addEmailFilter;
    window.addBulkEmails = addBulkEmails;
    window.removeEmailFilter = removeEmailFilter;
    window.toggleEmailFilter = toggleEmailFilter;
    window.addRutFilter = addRutFilter;
    window.addBulkRuts = addBulkRuts;
    window.removeRutFilter = removeRutFilter;
    window.toggleRutFilter = toggleRutFilter;
    window.showEliminatedReport = showEliminatedReport;
    window.exportEliminatedReport = exportEliminatedReport;
    window.clearEliminatedHistory = clearEliminatedHistory;
    window.toggleTheme = toggleTheme;
    window.setTheme = setTheme;
}
// Función de toggle de tema
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}
// Función para establecer tema específico
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aprendo-theme', theme);
}
// ================= MODAL DE CONFIRMACIÓN PERSONALIZADO =================
// Reemplaza confirm() nativo que causa problemas de foco en Electron
function showConfirmModal(message, onConfirm, onCancel) {
    // Crear el modal
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'confirmModal';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        background: var(--bg-card, #fff);
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color, #e0e0e0);
    `;
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 1rem;
        color: var(--text-primary, #333);
        text-align: center;
    `;
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
    `;
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = `
        padding: 10px 24px;
        border: 1px solid var(--border-color, #ccc);
        background: var(--bg-tertiary, #f5f5f5);
        color: var(--text-primary, #333);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
    `;
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.style.cssText = `
        padding: 10px 24px;
        border: none;
        background: var(--danger-color, #dc3545);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
    `;
    const closeModal = () => {
        modalOverlay.remove();
    };
    cancelBtn.onclick = () => {
        closeModal();
        if (onCancel)
            onCancel();
    };
    confirmBtn.onclick = () => {
        closeModal();
        onConfirm();
    };
    // Cerrar con Escape
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            if (onCancel)
                onCancel();
            document.removeEventListener('keydown', handleKeydown);
        }
        else if (e.key === 'Enter') {
            closeModal();
            onConfirm();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(confirmBtn);
    modalBox.appendChild(messageEl);
    modalBox.appendChild(buttonsDiv);
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
    // Enfocar el botón de confirmar
    confirmBtn.focus();
}
// ================= MODAL DE ALERTA PERSONALIZADO =================
// Reemplaza alert() nativo que causa problemas de foco en Electron
function showAlertModal(message, type = 'info') {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'alertModal';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        background: var(--bg-card, #fff);
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color, #e0e0e0);
    `;
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 1rem;
        color: var(--text-primary, #333);
        text-align: center;
        line-height: 1.5;
    `;
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
        display: flex;
        justify-content: center;
    `;
    const okBtn = document.createElement('button');
    okBtn.textContent = 'Aceptar';
    // Colores según el tipo de alerta
    let btnColor = 'var(--uct-primary, #0066cc)';
    if (type === 'success')
        btnColor = 'var(--success-color, #28a745)';
    if (type === 'warning')
        btnColor = 'var(--warning-color, #ffc107)';
    if (type === 'error')
        btnColor = 'var(--danger-color, #dc3545)';
    okBtn.style.cssText = `
        padding: 10px 32px;
        border: none;
        background: ${btnColor};
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
        font-weight: 600;
    `;
    const closeModal = () => {
        modalOverlay.remove();
    };
    okBtn.onclick = closeModal;
    // Cerrar con Escape o Enter
    const handleKeydown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
            closeModal();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
    buttonsDiv.appendChild(okBtn);
    modalBox.appendChild(messageEl);
    modalBox.appendChild(buttonsDiv);
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
    // Enfocar el botón de aceptar
    okBtn.focus();
}
// Configuración por defecto (migrada del sistema básico)
const DEFAULT_CONFIG = {
    emailFilters: [
        {
            pattern: '@uct.cl',
            type: 'domain',
            action: 'exclude',
            exceptions: ['@alu.uct.cl'],
            enabled: true,
            description: 'Filtro básico: Eliminar @uct.cl'
        }
    ],
    rutFilters: [],
    persistenceEnabled: true,
    consolidationMode: 'separate',
    autoSave: true,
    detailedLogs: true,
    maxFiles: 60
};
function initializeConfigSystem() {
    console.log('Iniciando sistema de configuración...');
    // Test de normalización de RUT
    console.log('=== TEST DE NORMALIZACIÓN RUT ===');
    console.log('22718730 normalizado:', normalizeRut('22718730'));
    console.log('22.718.730 normalizado:', normalizeRut('22.718.730'));
    console.log('22718730-5 normalizado:', normalizeRut('22718730-5'));
    console.log('22.718.730-5 normalizado:', normalizeRut('22.718.730-5'));
    console.log('=================================');
    loadConfiguration();
    updateUI();
    setupEventListeners();
    // Vigilar que los inputs permanezcan habilitados
    setInterval(() => {
        const emailInput = document.getElementById('emailInput');
        const rutInput = document.getElementById('rutInput');
        if (emailInput && emailInput.disabled) {
            console.warn('Input de email estaba deshabilitado, rehabilitando...');
            emailInput.disabled = false;
        }
        if (rutInput && rutInput.disabled) {
            console.warn('Input de RUT estaba deshabilitado, rehabilitando...');
            rutInput.disabled = false;
        }
    }, 1000);
}
// Configurar event listeners
function setupEventListeners() {
    // Asegurar que los inputs estén habilitados al iniciar
    const emailInput = document.getElementById('emailInput');
    const rutInput = document.getElementById('rutInput');
    if (emailInput) {
        emailInput.disabled = false;
    }
    if (rutInput) {
        rutInput.disabled = false;
    }
    // Modo de consolidación
    const consolidationRadios = document.querySelectorAll('input[name="consolidationMode"]');
    consolidationRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.checked) {
                consolidationMode = this.value;
                saveConfiguration(); // Guardado automático
                console.log('Modo de consolidación cambiado a:', consolidationMode);
            }
        });
    });
    // Auto Save
    const autoSaveCheckbox = document.getElementById('autoSave');
    if (autoSaveCheckbox) {
        autoSaveCheckbox.addEventListener('change', function () {
            autoSave = this.checked;
            saveConfiguration(); // Guardado automático
            console.log('Auto Save cambiado a:', autoSave);
        });
    }
    // Detailed Logs
    const detailedLogsCheckbox = document.getElementById('detailedLogs');
    if (detailedLogsCheckbox) {
        detailedLogsCheckbox.addEventListener('change', function () {
            detailedLogs = this.checked;
            saveConfiguration(); // Guardado automático
            console.log('Detailed Logs cambiado a:', detailedLogs);
        });
    }
    // Max Files
    const maxFilesInput = document.getElementById('maxFiles');
    if (maxFilesInput) {
        maxFilesInput.addEventListener('change', function () {
            maxFiles = parseInt(this.value);
            saveConfiguration(); // Guardado automático
            console.log('Max Files cambiado a:', maxFiles);
        });
    }
    // Enter key para agregar filtros
    if (emailInput) {
        emailInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addEmailFilter();
            }
        });
    }
    if (rutInput) {
        rutInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addRutFilter();
            }
        });
    }
}
// Función para cambiar tabs
// Función para volver atrás
function goBack() {
    window.location.href = 'index.html';
}
// ================= FILTROS DE EMAIL =================
function addEmailFilter() {
    const input = document.getElementById('emailInput');
    const email = input.value.trim();
    if (!email) {
        showAlertModal('Por favor ingrese un correo electrónico válido', 'warning');
        return;
    }
    if (addSingleEmailFilter(email)) {
        input.value = '';
        updateEmailFiltersUI();
        saveConfiguration(); // Guardado automático
        // Asegurar que el input permanezca habilitado y enfocado
        setTimeout(() => {
            input.disabled = false;
            input.focus();
        }, 50);
    }
}
function addBulkEmails() {
    const textarea = document.getElementById('bulkEmailInput');
    const emails = textarea.value.split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);
    if (emails.length === 0) {
        showAlertModal('Por favor ingrese al menos un correo electrónico', 'warning');
        return;
    }
    let addedCount = 0;
    emails.forEach(email => {
        if (addSingleEmailFilter(email)) {
            addedCount++;
        }
    });
    textarea.value = '';
    updateEmailFiltersUI();
    if (addedCount > 0) {
        showAlertModal(`Se agregaron ${addedCount} filtros de correo`, 'success');
        saveConfiguration(); // Guardado automático
    }
}
function addSingleEmailFilter(email) {
    // Validar formato de email básico
    if (!validateEmail(email)) {
        showAlertModal(`Formato de correo inválido: ${email}`, 'error');
        return false;
    }
    // Verificar duplicados
    const exists = emailFilters.some(filter => filter.pattern.toLowerCase() === email.toLowerCase());
    if (exists) {
        showAlertModal(`El correo ${email} ya está en la lista de filtros`, 'warning');
        return false;
    }
    // Agregar filtro
    const filter = {
        pattern: email,
        type: email.startsWith('@') ? 'domain' : 'email',
        action: 'exclude',
        enabled: true,
        addedDate: new Date().toISOString(),
        description: `Filtro personalizado: ${email}`
    };
    emailFilters.push(filter);
    return true;
}
function validateEmail(email) {
    // Permitir dominios (@dominio.com) y emails completos
    if (email.startsWith('@')) {
        // Validar dominio
        const domainPart = email.substring(1);
        const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return domainRegex.test(domainPart);
    }
    else {
        // Validar email completo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
function removeEmailFilter(index) {
    showConfirmModal('¿Está seguro de eliminar este filtro de correo?', () => {
        emailFilters.splice(index, 1);
        updateEmailFiltersUI();
        saveConfiguration(); // Guardado automático
    });
}
function toggleEmailFilter(index) {
    emailFilters[index].enabled = !emailFilters[index].enabled;
    updateEmailFiltersUI();
    saveConfiguration(); // Guardado automático
}
function updateEmailFiltersUI() {
    const container = document.getElementById('emailFilters');
    const countSpan = document.getElementById('emailCount');
    if (!container || !countSpan)
        return;
    countSpan.textContent = emailFilters.length.toString();
    if (emailFilters.length === 0) {
        container.innerHTML = '<p class="no-filters">No hay filtros de correo configurados</p>';
        return;
    }
    container.innerHTML = emailFilters.map((filter, index) => `
        <div class="filter-item ${filter.enabled ? 'enabled' : 'disabled'}">
            <div class="filter-content">
                <span class="filter-pattern">${filter.pattern}</span>
                <span class="filter-type badge">${filter.type}</span>
                ${filter.exceptions ? `<span class="filter-exceptions">Excepto: ${filter.exceptions.join(', ')}</span>` : ''}
            </div>
            <div class="filter-actions">
                <button class="btn-toggle ${filter.enabled ? 'active' : ''}" 
                        onclick="toggleEmailFilter(${index})"
                        title="${filter.enabled ? 'Desactivar' : 'Activar'}">
                    ${filter.enabled ? getIcon('check', 16) : getIcon('x', 16)}
                </button>
                <button class="btn-remove" onclick="removeEmailFilter(${index})" title="Eliminar">
                    ${getIcon('trash', 16)}
                </button>
            </div>
        </div>
    `).join('');
    // Asegurar que el input esté habilitado después de actualizar la UI
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.disabled = false;
    }
}
// ================= FILTROS DE RUT =================
function addRutFilter() {
    const input = document.getElementById('rutInput');
    const rut = input.value.trim();
    if (!rut) {
        showAlertModal('Por favor ingrese un RUT válido', 'warning');
        return;
    }
    if (addSingleRutFilter(rut)) {
        input.value = '';
        updateRutFiltersUI();
        saveConfiguration(); // Guardado automático
        // Asegurar que el input permanezca habilitado y enfocado
        setTimeout(() => {
            input.disabled = false;
            input.focus();
        }, 50);
    }
}
function addBulkRuts() {
    const textarea = document.getElementById('bulkRutInput');
    const ruts = textarea.value.split('\n')
        .map(rut => rut.trim())
        .filter(rut => rut.length > 0);
    if (ruts.length === 0) {
        showAlertModal('Por favor ingrese al menos un RUT', 'warning');
        return;
    }
    let addedCount = 0;
    ruts.forEach(rut => {
        if (addSingleRutFilter(rut)) {
            addedCount++;
        }
    });
    textarea.value = '';
    updateRutFiltersUI();
    if (addedCount > 0) {
        showAlertModal(`Se agregaron ${addedCount} filtros de RUT`, 'success');
        saveConfiguration(); // Guardado automático
    }
}
function addSingleRutFilter(rut) {
    const normalizedRut = normalizeRut(rut);
    if (!validateRut(normalizedRut)) {
        showAlertModal(`RUT inválido: ${rut}`, 'error');
        return false;
    }
    // Verificar duplicados
    const exists = rutFilters.some(filter => filter.pattern === normalizedRut);
    if (exists) {
        showAlertModal(`El RUT ${rut} ya está en la lista de filtros`, 'warning');
        return false;
    }
    // Agregar filtro
    const filter = {
        pattern: normalizedRut,
        originalInput: rut,
        action: 'exclude',
        enabled: true,
        addedDate: new Date().toISOString(),
        description: `Filtro RUT: ${normalizedRut}`
    };
    rutFilters.push(filter);
    return true;
}
function normalizeRut(rut) {
    // Convertir a string y remover espacios, puntos y guiones
    const rutStr = String(rut).replace(/[.\s-]/g, '').toUpperCase();
    // Si es solo números (como 22525788), mantenerlo así
    // Si tiene dígito verificador (como 22525788K), mantenerlo
    return rutStr;
}
function validateRut(rut) {
    // Validar formato de RUT chileno - con o sin dígito verificador
    const rutStr = String(rut).replace(/[.\s-]/g, '');
    // Permitir solo números (7-8 dígitos) o números con dígito verificador
    const rutRegexWithDV = /^\d{7,8}[0-9K]$/i; // Con dígito verificador
    const rutRegexOnlyNumbers = /^\d{7,8}$/; // Solo números
    return rutRegexWithDV.test(rutStr) || rutRegexOnlyNumbers.test(rutStr);
}
function removeRutFilter(index) {
    showConfirmModal('¿Está seguro de eliminar este filtro de RUT?', () => {
        rutFilters.splice(index, 1);
        updateRutFiltersUI();
        saveConfiguration(); // Guardado automático
    });
}
function toggleRutFilter(index) {
    rutFilters[index].enabled = !rutFilters[index].enabled;
    updateRutFiltersUI();
    saveConfiguration(); // Guardado automático
}
function updateRutFiltersUI() {
    const container = document.getElementById('rutFilters');
    const countSpan = document.getElementById('rutCount');
    if (!container || !countSpan)
        return;
    countSpan.textContent = rutFilters.length.toString();
    if (rutFilters.length === 0) {
        container.innerHTML = '<p class="no-filters">No hay filtros de RUT configurados</p>';
        return;
    }
    container.innerHTML = rutFilters.map((filter, index) => `
        <div class="filter-item ${filter.enabled ? 'enabled' : 'disabled'}">
            <div class="filter-content">
                <span class="filter-pattern">${filter.pattern}</span>
                <span class="filter-original">(${filter.originalInput})</span>
            </div>
            <div class="filter-actions">
                <button class="btn-toggle ${filter.enabled ? 'active' : ''}" 
                        onclick="toggleRutFilter(${index})"
                        title="${filter.enabled ? 'Desactivar' : 'Activar'}">
                    ${filter.enabled ? getIcon('check', 16) : getIcon('x', 16)}
                </button>
                <button class="btn-remove" onclick="removeRutFilter(${index})" title="Eliminar">
                    ${getIcon('trash', 16)}
                </button>
            </div>
        </div>
    `).join('');
    // Asegurar que el input esté habilitado después de actualizar la UI
    const rutInput = document.getElementById('rutInput');
    if (rutInput) {
        rutInput.disabled = false;
    }
}
// ================= SISTEMA DE FILTRADO =================
// Función principal que será llamada desde calificaciones.js
function applyUserFilters(data, headers) {
    console.log('Aplicando filtros de configuración...');
    if (!data || data.length === 0) {
        return { data: [], eliminated: 0, eliminatedUsers: [] };
    }
    let filteredData = [...data];
    let eliminatedUsers = [];
    // Aplicar filtros de email
    const emailResult = applyEmailFilters(filteredData, headers);
    filteredData = emailResult.data;
    eliminatedUsers = eliminatedUsers.concat(emailResult.eliminatedUsers);
    // Aplicar filtros de RUT
    const rutResult = applyRutFilters(filteredData, headers);
    filteredData = rutResult.data;
    eliminatedUsers = eliminatedUsers.concat(rutResult.eliminatedUsers);
    // Guardar en historial o acumular en batch
    if (eliminatedUsers.length > 0) {
        if (isBatchProcessing) {
            // Acumular en el batch sin guardar aún
            batchEliminatedUsers = batchEliminatedUsers.concat(eliminatedUsers);
            console.log(`Usuarios acumulados en batch: ${batchEliminatedUsers.length}`);
        }
        else {
            // Guardar inmediatamente si no estamos en modo batch
            addToEliminatedHistory(eliminatedUsers);
        }
    }
    console.log(`Total usuarios eliminados en esta operación: ${eliminatedUsers.length}`);
    return {
        data: filteredData,
        eliminated: eliminatedUsers.length,
        eliminatedUsers: eliminatedUsers
    };
}
function applyEmailFilters(data, headers) {
    const activeFilters = emailFilters.filter(filter => filter.enabled);
    if (activeFilters.length === 0) {
        return { data: data, eliminatedUsers: [] };
    }
    // Encontrar columnas de email
    const emailColumns = findEmailColumns(headers);
    if (emailColumns.length === 0) {
        console.log('No se encontraron columnas de email');
        return { data: data, eliminatedUsers: [] };
    }
    const emailColumn = emailColumns[0];
    const eliminatedUsers = [];
    const filteredData = [];
    data.forEach(row => {
        const email = row[emailColumn];
        let shouldEliminate = false;
        let eliminationReason = '';
        if (email && typeof email === 'string') {
            const emailStr = email.trim().toLowerCase();
            for (const filter of activeFilters) {
                if (matchesEmailFilter(emailStr, filter)) {
                    shouldEliminate = true;
                    eliminationReason = `Filtro: ${filter.pattern}`;
                    break;
                }
            }
        }
        if (shouldEliminate) {
            eliminatedUsers.push({
                email: email,
                reason: eliminationReason,
                type: 'email',
                timestamp: new Date().toISOString()
            });
        }
        else {
            filteredData.push(row);
        }
    });
    return { data: filteredData, eliminatedUsers: eliminatedUsers };
}
function applyRutFilters(data, headers) {
    const activeFilters = rutFilters.filter(filter => filter.enabled);
    if (activeFilters.length === 0) {
        return { data: data, eliminatedUsers: [] };
    }
    // Encontrar columnas de RUT y email
    const rutColumns = findRutColumns(headers);
    const emailColumns = findEmailColumns(headers);
    if (rutColumns.length === 0) {
        console.log('No se encontraron columnas de RUT');
        return { data: data, eliminatedUsers: [] };
    }
    const rutColumn = rutColumns[0];
    const emailColumn = emailColumns.length > 0 ? emailColumns[0] : null;
    const eliminatedUsers = [];
    const filteredData = [];
    console.log(`Aplicando filtros RUT en columna: ${rutColumn}`);
    console.log(`Filtros RUT activos: ${activeFilters.length}`);
    activeFilters.forEach(filter => {
        console.log(`  - Filtro: ${filter.pattern} (habilitado: ${filter.enabled})`);
    });
    if (emailColumn) {
        console.log(`Columna de email encontrada: ${emailColumn}`);
    }
    // Mostrar algunas muestras de RUTs en los datos
    const sampleRuts = data.slice(0, 3).map(row => row[rutColumn]).filter(rut => rut);
    console.log('Ejemplos de RUTs en los datos:', sampleRuts);
    data.forEach((row, index) => {
        const rut = row[rutColumn];
        const email = emailColumn ? row[emailColumn] : null;
        let shouldEliminate = false;
        let eliminationReason = '';
        if (rut) {
            // Manejar tanto números como strings
            const rutValue = String(rut).trim();
            const normalizedRut = normalizeRut(rutValue);
            for (const filter of activeFilters) {
                const matchResult = matchesRutFilter(normalizedRut, filter.pattern);
                if (matchResult) {
                    shouldEliminate = true;
                    eliminationReason = `Filtro RUT: ${filter.pattern}`;
                    console.log(`Fila ${index + 1} eliminada - RUT: ${rutValue} | Email: ${email || 'Sin email'}`);
                    break;
                }
            }
        }
        if (shouldEliminate) {
            // NO agregar a filteredData - esta fila se elimina
            eliminatedUsers.push({
                rut: String(rut),
                email: email || 'Sin email',
                reason: eliminationReason,
                type: 'rut',
                timestamp: new Date().toISOString()
            });
        }
        else {
            // Agregar a filteredData - esta fila se mantiene
            filteredData.push(row);
        }
    });
    console.log(`===== RESULTADO FILTRADO POR RUT =====`);
    console.log(`Filas originales: ${data.length}`);
    console.log(`Filas eliminadas: ${eliminatedUsers.length}`);
    console.log(`Filas resultantes: ${filteredData.length}`);
    console.log(`======================================`);
    return { data: filteredData, eliminatedUsers: eliminatedUsers };
}
function matchesEmailFilter(email, filter) {
    if (filter.type === 'domain') {
        const domain = filter.pattern.toLowerCase();
        const emailEndsWithDomain = email.endsWith(domain);
        // Verificar excepciones
        if (emailEndsWithDomain && filter.exceptions) {
            for (const exception of filter.exceptions) {
                if (email.endsWith(exception.toLowerCase())) {
                    return false; // No eliminar si coincide con excepción
                }
            }
        }
        return emailEndsWithDomain;
    }
    else {
        return email === filter.pattern.toLowerCase();
    }
}
function matchesRutFilter(rut, filterPattern) {
    // Normalizar ambos RUTs para comparación (quitar puntos, espacios, guiones)
    const normalizedRut = normalizeRut(rut);
    const normalizedFilter = normalizeRut(filterPattern);
    // Comparar directamente
    if (normalizedRut === normalizedFilter) {
        return true;
    }
    // Comparar solo la parte numérica (ignorar dígito verificador)
    const rutNumbers = normalizedRut.replace(/[^0-9]/g, '');
    const filterNumbers = normalizedFilter.replace(/[^0-9]/g, '');
    return rutNumbers === filterNumbers;
}
function findEmailColumns(headers) {
    const emailColumns = [];
    for (const header of headers) {
        if (header && (header.toLowerCase().includes('email') ||
            header.toLowerCase().includes('correo') ||
            header.toLowerCase().includes('mail'))) {
            emailColumns.push(header);
        }
    }
    return emailColumns;
}
function findRutColumns(headers) {
    const rutColumns = [];
    for (const header of headers) {
        if (header && (header.toLowerCase().includes('rut') ||
            header.toLowerCase().includes('cedula') ||
            header.toLowerCase().includes('identificacion') ||
            header.toLowerCase().includes('número de id') ||
            header.toLowerCase().includes('numero de id') ||
            header.toLowerCase() === 'id' ||
            header.toLowerCase().includes('identificador'))) {
            rutColumns.push(header);
        }
    }
    return rutColumns;
}
// ================= HISTORIAL DE ELIMINADOS =================
function addToEliminatedHistory(eliminatedUsers) {
    const historyEntry = {
        timestamp: new Date().toISOString(),
        users: eliminatedUsers,
        totalCount: eliminatedUsers.length
    };
    eliminatedUsersHistory.unshift(historyEntry);
    // Mantener solo los últimos 10 reportes
    if (eliminatedUsersHistory.length > 10) {
        eliminatedUsersHistory = eliminatedUsersHistory.slice(0, 10);
    }
    if (persistenceEnabled) {
        saveConfiguration();
    }
}
function showEliminatedReport() {
    const reportDiv = document.getElementById('eliminatedReport');
    const listDiv = document.getElementById('eliminatedList');
    if (!reportDiv || !listDiv)
        return;
    if (eliminatedUsersHistory.length === 0) {
        listDiv.innerHTML = '<p class="no-data">No hay reportes de usuarios eliminados disponibles.</p>';
    }
    else {
        const latestReport = eliminatedUsersHistory[0];
        const html = `
            <div class="report-header">
                <h5>Reporte del ${new Date(latestReport.timestamp).toLocaleString()}</h5>
                <p>Total usuarios eliminados: ${latestReport.totalCount}</p>
            </div>
            <div class="eliminated-users">
                ${latestReport.users.map(user => `
                    <div class="eliminated-user">
                        <span class="user-info">
                            ${user.email || user.rut || 'Usuario'} 
                            <small>(${user.type})</small>
                        </span>
                        <span class="elimination-reason">${user.reason}</span>
                    </div>
                `).join('')}
            </div>
        `;
        listDiv.innerHTML = html;
    }
    reportDiv.style.display = reportDiv.style.display === 'none' ? 'block' : 'none';
}
function exportEliminatedReport() {
    if (eliminatedUsersHistory.length === 0) {
        showAlertModal('No hay reportes para exportar', 'info');
        return;
    }
    const data = {
        exportDate: new Date().toISOString(),
        reports: eliminatedUsersHistory
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-eliminados-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
function clearEliminatedHistory() {
    if (confirm('¿Está seguro de limpiar todo el historial de usuarios eliminados?')) {
        eliminatedUsersHistory = [];
        document.getElementById('eliminatedList').innerHTML = '<p class="no-data">Historial limpiado.</p>';
        saveConfiguration(); // Guardado automático
    }
}
// ================= PERSISTENCIA =================
function saveConfiguration(showNotif = false) {
    const config = {
        emailFilters: emailFilters,
        rutFilters: rutFilters,
        eliminatedUsersHistory: eliminatedUsersHistory,
        persistenceEnabled: persistenceEnabled,
        consolidationMode: consolidationMode,
        autoSave: autoSave,
        detailedLogs: detailedLogs,
        maxFiles: maxFiles,
        lastSaved: new Date().toISOString()
    };
    try {
        localStorage.setItem('aprendo_user_filters_config', JSON.stringify(config));
        console.log('Configuración guardada exitosamente');
        // Mostrar notificación solo si se solicita explícitamente
        if (showNotif) {
            showNotification('Configuración guardada', 'success');
        }
    }
    catch (error) {
        console.error('Error guardando configuración:', error);
        if (showNotif) {
            showNotification('Error guardando configuración', 'error');
        }
    }
}
function loadConfiguration() {
    try {
        const savedConfig = localStorage.getItem('aprendo_user_filters_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            emailFilters = config.emailFilters || DEFAULT_CONFIG.emailFilters;
            rutFilters = config.rutFilters || DEFAULT_CONFIG.rutFilters;
            eliminatedUsersHistory = config.eliminatedUsersHistory || [];
            persistenceEnabled = config.persistenceEnabled !== undefined ?
                config.persistenceEnabled : DEFAULT_CONFIG.persistenceEnabled;
            consolidationMode = config.consolidationMode || DEFAULT_CONFIG.consolidationMode;
            autoSave = config.autoSave !== undefined ? config.autoSave : DEFAULT_CONFIG.autoSave;
            detailedLogs = config.detailedLogs !== undefined ? config.detailedLogs : DEFAULT_CONFIG.detailedLogs;
            maxFiles = config.maxFiles || DEFAULT_CONFIG.maxFiles;
            console.log('Configuración cargada exitosamente');
            console.log('Modo de consolidación:', consolidationMode);
        }
        else {
            // Primera vez - usar configuración por defecto
            emailFilters = [...DEFAULT_CONFIG.emailFilters];
            rutFilters = [...DEFAULT_CONFIG.rutFilters];
            eliminatedUsersHistory = [];
            persistenceEnabled = DEFAULT_CONFIG.persistenceEnabled;
            consolidationMode = DEFAULT_CONFIG.consolidationMode;
            autoSave = DEFAULT_CONFIG.autoSave;
            detailedLogs = DEFAULT_CONFIG.detailedLogs;
            maxFiles = DEFAULT_CONFIG.maxFiles;
            console.log('Usando configuración por defecto');
        }
    }
    catch (error) {
        console.error('Error cargando configuración:', error);
        // Usar configuración por defecto en caso de error
        emailFilters = [...DEFAULT_CONFIG.emailFilters];
        rutFilters = [...DEFAULT_CONFIG.rutFilters];
        eliminatedUsersHistory = [];
        persistenceEnabled = DEFAULT_CONFIG.persistenceEnabled;
        consolidationMode = DEFAULT_CONFIG.consolidationMode;
        autoSave = DEFAULT_CONFIG.autoSave;
        detailedLogs = DEFAULT_CONFIG.detailedLogs;
        maxFiles = DEFAULT_CONFIG.maxFiles;
    }
}
function resetConfiguration() {
    if (confirm('¿Está seguro de restablecer la configuración a los valores por defecto? Esto eliminará todos los filtros personalizados.')) {
        emailFilters = [...DEFAULT_CONFIG.emailFilters];
        rutFilters = [...DEFAULT_CONFIG.rutFilters];
        eliminatedUsersHistory = [];
        persistenceEnabled = DEFAULT_CONFIG.persistenceEnabled;
        updateUI();
        saveConfiguration();
        showNotification('Configuración restablecida', 'success');
    }
}
function clearAllFilters() {
    if (confirm('¿Está seguro de eliminar todos los filtros? Esto no afectará el historial de usuarios eliminados.')) {
        emailFilters = [];
        rutFilters = [];
        updateUI();
        saveConfiguration(); // Guardado automático
        showNotification('Todos los filtros eliminados', 'success');
    }
}
function updateUI() {
    updateEmailFiltersUI();
    updateRutFiltersUI();
    // Actualizar radio buttons de consolidación
    const consolidationSeparate = document.getElementById('consolidationSeparate');
    const consolidationSingle = document.getElementById('consolidationSingle');
    if (consolidationSeparate && consolidationSingle) {
        if (consolidationMode === 'separate') {
            consolidationSeparate.checked = true;
        }
        else {
            consolidationSingle.checked = true;
        }
    }
    // Actualizar checkbox de autoSave
    const autoSaveCheckbox = document.getElementById('autoSave');
    if (autoSaveCheckbox) {
        autoSaveCheckbox.checked = autoSave;
    }
    // Actualizar checkbox de detailedLogs
    const detailedLogsCheckbox = document.getElementById('detailedLogs');
    if (detailedLogsCheckbox) {
        detailedLogsCheckbox.checked = detailedLogs;
    }
    // Actualizar input de maxFiles
    const maxFilesInput = document.getElementById('maxFiles');
    if (maxFilesInput) {
        maxFilesInput.value = maxFiles.toString();
    }
}
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    // Mostrar animación
    setTimeout(() => notification.classList.add('show'), 100);
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}
// ================= SISTEMA DE BATCH PROCESSING =================
// Variable temporal para acumular usuarios eliminados durante un batch
let batchEliminatedUsers = [];
let isBatchProcessing = false;
// Iniciar un batch de procesamiento
function startBatchProcessing() {
    console.log('Iniciando batch de procesamiento...');
    isBatchProcessing = true;
    batchEliminatedUsers = [];
}
// Finalizar un batch de procesamiento y guardar en historial
function finishBatchProcessing() {
    console.log(`Finalizando batch de procesamiento con ${batchEliminatedUsers.length} usuarios eliminados`);
    if (batchEliminatedUsers.length > 0) {
        addToEliminatedHistory(batchEliminatedUsers);
    }
    isBatchProcessing = false;
    batchEliminatedUsers = [];
}
// Obtener usuarios eliminados del batch actual
function getBatchEliminatedUsers() {
    return [...batchEliminatedUsers];
}
// ================= FUNCIONES EXPORTADAS =================
// Estas funciones serán llamadas desde calificaciones.js e informes.js
window.configFilters = {
    applyUserFilters: applyUserFilters,
    getActiveFilters: () => ({
        emailFilters: emailFilters.filter(f => f.enabled),
        rutFilters: rutFilters.filter(f => f.enabled)
    }),
    getEliminatedHistory: () => eliminatedUsersHistory,
    getConsolidationMode: () => consolidationMode,
    getAutoSave: () => autoSave,
    getDetailedLogs: () => detailedLogs,
    getMaxFiles: () => maxFiles,
    // Funciones de batch processing
    startBatchProcessing: startBatchProcessing,
    finishBatchProcessing: finishBatchProcessing,
    getBatchEliminatedUsers: getBatchEliminatedUsers
};
// ================= INICIALIZACIÓN AUTOMÁTICA =================
// Auto-ejecutar inicialización cuando se carga el script
(function autoInit() {
    // Solo inicializar si estamos en la página de configuración
    if (typeof document !== 'undefined' && document.getElementById('filtersList')) {
        // Ya se ejecutará DOMContentLoaded
        return;
    }
    // Si estamos en otras páginas (como calificaciones), solo cargar la configuración
    if (typeof window !== 'undefined') {
        try {
            const savedConfig = localStorage.getItem('aprendo_user_filters_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                emailFilters = config.emailFilters || DEFAULT_CONFIG.emailFilters;
                rutFilters = config.rutFilters || DEFAULT_CONFIG.rutFilters;
                eliminatedUsersHistory = config.eliminatedUsersHistory || [];
                persistenceEnabled = config.persistenceEnabled !== undefined ?
                    config.persistenceEnabled : DEFAULT_CONFIG.persistenceEnabled;
            }
            else {
                // Primera vez - usar configuración por defecto
                emailFilters = [...DEFAULT_CONFIG.emailFilters];
                rutFilters = [...DEFAULT_CONFIG.rutFilters];
                eliminatedUsersHistory = [];
                persistenceEnabled = DEFAULT_CONFIG.persistenceEnabled;
                // Guardar configuración por defecto automáticamente
                setTimeout(() => {
                    saveConfiguration();
                    console.log('Configuración por defecto guardada automáticamente');
                }, 1000);
            }
            console.log('Sistema de configuración inicializado automáticamente');
            console.log(`Filtros de email activos: ${emailFilters.filter(f => f.enabled).length}`);
            console.log(`Filtros de RUT activos: ${rutFilters.filter(f => f.enabled).length}`);
        }
        catch (error) {
            console.error('Error en inicialización automática:', error);
            // Usar configuración por defecto en caso de error
            emailFilters = [...DEFAULT_CONFIG.emailFilters];
            rutFilters = [...DEFAULT_CONFIG.rutFilters];
            eliminatedUsersHistory = [];
            persistenceEnabled = DEFAULT_CONFIG.persistenceEnabled;
        }
    }
})();
