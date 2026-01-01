"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCalificacionesPage = renderCalificacionesPage;
// @ts-nocheck
// calificaciones.ts - Lógica para procesar archivos de calificaciones
require("./config");
const { getIcon } = require('./icons');
const { renderHeader, applyStoredTheme } = require('./components/header');
// Variables globales
let selectedFiles = [];
let processedData = {};
let isProcessing = false;
// Variable para rastrear si el sistema está listo
let systemReady = true; // Sistema listo para procesamiento real
// Función para verificar sistema
function checkSystem() {
    return systemReady;
}
// Renderizar vista sin HTML externo
function renderCalificacionesPage(injectStyles, navigate) {
    selectedFiles = [];
    processedData = {};
    isProcessing = false;
    document.title = 'Procesar Calificaciones - Aprendo UCT';
    injectStyles([
        'styles.css',
        'global-styles.css',
        'calificaciones.css'
    ]);
    // Aplicar tema guardado
    applyStoredTheme();
    document.body.innerHTML = `
    <div class="container">
        ${renderHeader({
        title: 'Consolidar Calificaciones',
        subtitle: 'Importa y consolida archivos Excel de calificaciones',
        showBackButton: true,
        showConfigButton: true
    })}

        <main>
            <div class="upload-section">
                <h2>Subir Archivos</h2>
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <span class="upload-icon">${getIcon('folder-open', 48)}</span>
                        <h3>Arrastra archivos Excel aquí</h3>
                        <p>o haz clic para seleccionar (máximo 60 archivos)</p>
                        <input type="file" id="fileInput" multiple accept=".xlsx,.xls" style="display: none;">
                        <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                            ${getIcon('upload', 18)} Seleccionar Archivos
                        </button>
                    </div>
                </div>
                
                <div class="file-info" id="fileInfo" style="display: none;">
                    <h3>Archivos seleccionados: <span id="fileCount">0</span></h3>
                    <p class="file-requirement" id="fileRequirement">Se necesitan al menos 2 archivos para procesar</p>
                    <div class="file-list" id="fileList"></div>
                    <div class="process-controls">
                        <button class="btn btn-success" id="processBtn" onclick="processFiles()" disabled>
                            ${getIcon('play', 18)} Procesar Archivos (<span id="btnFileCount">0</span>)
                        </button>
                        <button class="btn btn-secondary" onclick="clearFiles()">
                            ${getIcon('trash', 18)} Limpiar Lista
                        </button>
                    </div>
                </div>
            </div>

            <div class="processing-section" id="processingSection" style="display: none;">
                <h2>Procesando...</h2>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text">
                    <span id="progressText">Preparando...</span>
                    <span id="progressPercent">0%</span>
                </div>
            </div>

            <div class="log-section">
                <h2>Registro de Actividad</h2>
                <div class="log-container" id="logContainer">
                    <!-- Los logs aparecerán aquí -->
                </div>
                <button class="btn btn-secondary btn-sm" onclick="clearLog()">
                    ${getIcon('trash', 16)} Limpiar Log
                </button>
            </div>

            <div class="results-section" id="resultsSection" style="display: none;">
                <h2>${getIcon('check-circle', 24)} Procesamiento Completado</h2>
                <div class="results-summary" id="resultsSummary">
                    <!-- Los resultados se mostrarán aquí -->
                </div>
                <div class="processed-files-section" id="processedFilesSection">
                    <h3>Archivos Procesados</h3>
                    <div class="processed-files-list" id="processedFilesList">
                        <!-- Lista de archivos procesados -->
                    </div>
                </div>
                <div class="download-area" id="downloadArea">
                    <!-- Los enlaces de descarga aparecerán aquí -->
                </div>
            </div>
        </main>
        
        <footer>
            <p>Aprendo UCT v1.0.0 - Universidad Católica de Temuco</p>
        </footer>
    </div>
    `;
    // Inicialización equivalente al DOMContentLoaded previo
    logMessage('Sistema iniciado. Listo para procesar archivos.', 'info');
    setupEventListeners();
    try {
        require('exceljs');
        logMessage('Sistema de procesamiento de calificaciones iniciado', 'info');
        logMessage('ExcelJS cargado - Procesamiento real activado', 'success');
    }
    catch (error) {
        console.error('Error cargando ExcelJS:', error);
        logMessage('Error: No se pudo cargar ExcelJS', 'error');
    }
    console.log('Sistema inicializado correctamente');
    // Exponer funciones usadas en el markup
    window.processFiles = processFiles;
    window.clearFiles = clearFiles;
    window.removeFile = removeFile;
    window.clearLog = clearLog;
    window.goBack = () => navigate('home');
    window.navigate = navigate;
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
// Configurar event listeners
function setupEventListeners() {
    console.log('Configurando event listeners...');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    if (!fileInput) {
        console.error('fileInput no encontrado');
        return;
    }
    if (!uploadArea) {
        console.error('uploadArea no encontrado');
        return;
    }
    // Event listeners para el input de archivos
    fileInput.addEventListener('change', handleFileSelection);
    // Event listeners para drag & drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    console.log('Event listeners configurados');
    logMessage('Event listeners configurados correctamente', 'info');
}
// Manejar selección de archivos
function handleFileSelection(event) {
    console.log('Archivos seleccionados:', event.target.files.length);
    const files = Array.from(event.target.files);
    addFilesToList(files);
}
// Manejar drag over
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.add('drag-over');
}
// Manejar drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.remove('drag-over');
}
// Manejar drop de archivos
function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.remove('drag-over');
    const files = Array.from(event.dataTransfer.files);
    const excelFiles = files.filter(file => file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls'));
    if (excelFiles.length !== files.length) {
        logMessage(`Se ignoraron ${files.length - excelFiles.length} archivos que no son Excel`, 'warning');
    }
    addFilesToList(excelFiles);
}
// Agregar archivos a la lista
function addFilesToList(files) {
    console.log('Agregando archivos:', files.length);
    if (selectedFiles.length + files.length > 60) {
        logMessage('No se pueden agregar más de 60 archivos', 'error');
        return;
    }
    files.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
            console.log('Archivo agregado:', file.name);
            logMessage(`Archivo agregado: ${file.name} (${formatFileSize(file.size)})`, 'info');
        }
        else {
            logMessage(`Archivo duplicado ignorado: ${file.name}`, 'warning');
        }
    });
    console.log('Total archivos seleccionados:', selectedFiles.length);
    updateFileList();
}
// Actualizar la lista visual de archivos
function updateFileList() {
    console.log('Actualizando lista de archivos...');
    const fileInfo = document.getElementById('fileInfo');
    const fileCount = document.getElementById('fileCount');
    const btnFileCount = document.getElementById('btnFileCount');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const fileRequirement = document.getElementById('fileRequirement');
    console.log('Elementos encontrados:', {
        fileInfo: !!fileInfo,
        fileCount: !!fileCount,
        btnFileCount: !!btnFileCount,
        fileList: !!fileList,
        processBtn: !!processBtn,
        fileRequirement: !!fileRequirement
    });
    if (selectedFiles.length === 0) {
        if (fileInfo)
            fileInfo.style.display = 'none';
        return;
    }
    if (fileInfo)
        fileInfo.style.display = 'block';
    if (fileCount)
        fileCount.textContent = selectedFiles.length.toString();
    if (btnFileCount)
        btnFileCount.textContent = selectedFiles.length.toString();
    // Actualizar mensaje de requerimiento
    if (selectedFiles.length < 2) {
        if (fileRequirement) {
            fileRequirement.textContent = `Se necesitan al menos 2 archivos para procesar (tienes ${selectedFiles.length})`;
            fileRequirement.className = 'file-requirement';
        }
        if (processBtn)
            processBtn.disabled = true;
    }
    else {
        if (fileRequirement) {
            fileRequirement.innerHTML = `${getIcon('check', 16)} Listo para procesar ${selectedFiles.length} archivos`;
            fileRequirement.className = 'file-requirement ready';
        }
        if (processBtn)
            processBtn.disabled = isProcessing;
    }
    // Renderizar lista de archivos con mejor información
    if (fileList) {
        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            // Extraer información del nombre del archivo
            const courseInfo = extractCourseInfo(file.name);
            fileItem.innerHTML = `
                <div class="file-name">
                    <div style="font-weight: 600;">${getIcon('file-spreadsheet', 16)} ${file.name}</div>
                    ${courseInfo ? `<div style="font-size: 0.8em; color: #667eea; margin-top: 2px;">→ ${courseInfo}</div>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    <button class="file-remove" onclick="removeFile(${index})" title="Eliminar archivo">
                        ${getIcon('x', 16)}
                    </button>
                </div>
            `;
            fileList.appendChild(fileItem);
        });
    }
    console.log('Lista actualizada con', selectedFiles.length, 'archivos');
}
// Remover archivo de la lista
function removeFile(index) {
    const removedFile = selectedFiles.splice(index, 1)[0];
    logMessage(`Archivo removido: ${removedFile.name}`, 'info');
    updateFileList();
}
// Limpiar lista de archivos
function clearFiles() {
    selectedFiles = [];
    logMessage('Lista de archivos limpiada', 'info');
    updateFileList();
}
// Procesar archivos
async function processFiles() {
    if (selectedFiles.length < 2 || isProcessing) {
        if (selectedFiles.length < 2) {
            logMessage('Se necesitan al menos 2 archivos para procesar', 'warning');
        }
        return;
    }
    isProcessing = true;
    updateFileList(); // Actualizar UI
    document.getElementById('processingSection').style.display = 'block';
    logMessage(`Iniciando procesamiento de ${selectedFiles.length} archivos...`, 'info');
    logMessage(`Sistema listo para procesamiento`, 'info');
    try {
        const results = await processExcelFilesReal();
        await generateConsolidatedFileReal(results);
        showResults(results);
        logMessage('Procesamiento completado exitosamente', 'success');
    }
    catch (error) {
        logMessage(`Error durante el procesamiento: ${error.message}`, 'error');
        console.error(error);
    }
    finally {
        isProcessing = false;
        updateFileList(); // Actualizar UI
        document.getElementById('processingSection').style.display = 'none';
    }
}
// FUNCIONES REALES DE PROCESAMIENTO EXCEL
// =======================================
// Procesar archivos Excel (versión real con ExcelJS)
async function processExcelFilesReal() {
    const results = {
        processedSheets: [], // Cambio a array para mantener orden
        totalEliminated: 0,
        eliminatedEmails: [],
        totalFiles: selectedFiles.length,
        successfulFiles: 0,
        fileResults: {}
    };
    // Iniciar batch processing si está disponible
    if (window.configFilters && window.configFilters.startBatchProcessing) {
        window.configFilters.startBatchProcessing();
        console.log('Batch processing iniciado');
    }
    // Ordenar archivos por número de curso (menor a mayor)
    const sortedFiles = [...selectedFiles].sort((a, b) => {
        const extractNumber = (fileName) => {
            const match = fileName.match(/PAT_2025_(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        };
        return extractNumber(a.name) - extractNumber(b.name);
    });
    logMessage(`Archivos ordenados por número de curso (${sortedFiles.length} archivos)`, 'info');
    for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        updateProgress(i, sortedFiles.length, `Procesando: ${file.name}`);
        try {
            // Simular procesamiento con datos de ejemplo
            const fileResult = await processExcelFileReal(file);
            results.fileResults[file.name] = fileResult;
            if (fileResult.data) {
                const sheetName = generateSheetName(file.name);
                results.processedSheets.push({
                    sheetName,
                    data: fileResult.data,
                    headers: fileResult.headers || Object.keys(fileResult.data[0] || {})
                });
                results.totalEliminated += fileResult.eliminated;
                results.eliminatedEmails.push(...fileResult.eliminatedEmails);
                results.successfulFiles++;
                logMessage(`${file.name}: ${fileResult.data.length} filas, ${fileResult.eliminated} usuarios eliminados`, 'success');
            }
        }
        catch (error) {
            logMessage(`Error procesando ${file.name}: ${error.message}`, 'error');
            results.fileResults[file.name] = { data: null, eliminated: 0, eliminatedEmails: [], error: error.message };
        }
    }
    updateProgress(selectedFiles.length, selectedFiles.length, 'Procesamiento completado');
    // Finalizar batch processing y obtener todos los usuarios eliminados acumulados
    if (window.configFilters && window.configFilters.finishBatchProcessing) {
        window.configFilters.finishBatchProcessing();
        console.log('Batch processing finalizado');
    }
    return results;
}
// Procesar un archivo Excel individual (versión real)
async function processExcelFileReal(file) {
    const ExcelJS = require('exceljs');
    return new Promise((resolve, reject) => {
        console.log(`Procesando ${file.name} (real)...`);
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                // Crear workbook de ExcelJS
                const workbook = new ExcelJS.Workbook();
                // Leer el archivo Excel
                const arrayBuffer = e.target.result;
                await workbook.xlsx.load(arrayBuffer);
                // Tomar la primera hoja
                const worksheet = workbook.worksheets[0];
                if (!worksheet) {
                    reject(new Error('No se encontró ninguna hoja en el archivo'));
                    return;
                }
                console.log(`Hoja encontrada: ${worksheet.name}`);
                // Convertir a array de objetos
                const data = [];
                const headers = [];
                // Obtener headers de la primera fila
                const firstRow = worksheet.getRow(1);
                firstRow.eachCell((cell, colNumber) => {
                    headers[colNumber - 1] = cell.value ? cell.value.toString().trim() : `Columna_${colNumber}`;
                });
                console.log(`Columnas encontradas: ${headers.join(', ')}`);
                // Leer todas las filas de datos
                for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
                    const row = worksheet.getRow(rowNumber);
                    // Verificar si la fila tiene datos
                    let hasData = false;
                    const rowData = {};
                    row.eachCell((cell, colNumber) => {
                        const header = headers[colNumber - 1];
                        const value = cell.value;
                        if (value !== null && value !== undefined && value !== '') {
                            hasData = true;
                            rowData[header] = value.toString().trim();
                        }
                        else {
                            rowData[header] = '';
                        }
                    });
                    if (hasData) {
                        data.push(rowData);
                    }
                }
                console.log(`Filas de datos encontradas: ${data.length}`);
                // Aplicar filtrado de emails (igual que el Python)
                const filterResult = filterUsersByEmailReal(data, headers);
                console.log(`Después del filtrado: ${filterResult.data.length} filas, ${filterResult.eliminated} eliminados`);
                // Incluir headers originales en el resultado
                filterResult.headers = headers;
                resolve(filterResult);
            }
            catch (error) {
                console.error('Error procesando archivo:', error);
                reject(new Error(`Error procesando archivo: ${error.message}`));
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo el archivo'));
        reader.readAsArrayBuffer(file);
    });
}
// Generar archivo consolidado (versión real con ExcelJS)
async function generateConsolidatedFileReal(results) {
    const ExcelJS = require('exceljs');
    logMessage('Generando archivo Excel consolidado...', 'info');
    try {
        // Crear nuevo workbook
        const workbook = new ExcelJS.Workbook();
        let sheetsCreated = 0;
        // Crear una hoja por cada archivo procesado (manteniendo el orden)
        results.processedSheets.forEach((sheetInfo) => {
            const { sheetName, data, headers: originalHeaders } = sheetInfo;
            if (data.length > 0) {
                const worksheet = workbook.addWorksheet(sheetName);
                // Usar los headers originales del archivo, no solo los del primer registro
                const headers = originalHeaders || Object.keys(data[0]);
                console.log(`Creando hoja ${sheetName} con columnas:`, headers);
                // Agregar headers
                worksheet.addRow(headers);
                // Agregar datos
                data.forEach(row => {
                    const values = headers.map(header => row[header] || '');
                    worksheet.addRow(values);
                });
                // Formatear la hoja
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };
                // Autoajustar columnas
                headers.forEach((header, index) => {
                    const column = worksheet.getColumn(index + 1);
                    column.width = Math.max(header.length, 15);
                });
                sheetsCreated++;
                logMessage(`Hoja creada: ${sheetName} (${data.length} filas, ${headers.length} columnas)`, 'info');
            }
        });
        if (sheetsCreated === 0) {
            throw new Error('No se crearon hojas en el archivo Excel');
        }
        // Generar archivo Excel
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        // Crear enlace de descarga
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const fileName = `Calificaciones_Consolidadas_${timestamp}.xlsx`;
        // Guardar referencia para descarga
        processedData.consolidatedFile = { url, fileName };
        // Generar archivo de usuarios eliminados
        if (results.eliminatedEmails.length > 0) {
            const uniqueEmails = [...new Set(results.eliminatedEmails)].sort();
            // Obtener el total real de usuarios eliminados (email + RUT)
            let totalEliminados = uniqueEmails.length;
            let emailUsers = [];
            let rutUsers = [];
            // Obtener información detallada de usuarios eliminados del historial más reciente
            // (que contiene TODOS los usuarios eliminados de TODOS los archivos procesados)
            if (typeof window !== 'undefined' && window.configFilters && window.configFilters.getEliminatedHistory) {
                const eliminatedHistory = window.configFilters.getEliminatedHistory();
                // El historial más reciente ahora contiene TODOS los usuarios eliminados del batch
                if (eliminatedHistory.length > 0 && eliminatedHistory[0].users) {
                    const users = eliminatedHistory[0].users;
                    // Eliminar duplicados por email
                    const emailUsersMap = new Map();
                    const rutUsersMap = new Map();
                    users.forEach(user => {
                        if (user.type === 'email' && user.email) {
                            // Usar email como clave para evitar duplicados
                            if (!emailUsersMap.has(user.email.toLowerCase())) {
                                emailUsersMap.set(user.email.toLowerCase(), user);
                            }
                        }
                        else if (user.type === 'rut' && user.rut) {
                            // Usar RUT como clave para evitar duplicados
                            if (!rutUsersMap.has(user.rut)) {
                                rutUsersMap.set(user.rut, user);
                            }
                        }
                    });
                    // Convertir de vuelta a arrays y ordenar
                    emailUsers = Array.from(emailUsersMap.values()).sort((a, b) => (a.email || '').localeCompare(b.email || ''));
                    rutUsers = Array.from(rutUsersMap.values()).sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
                    totalEliminados = emailUsers.length + rutUsers.length;
                    console.log(`Reporte: ${emailUsers.length} usuarios únicos por email, ${rutUsers.length} únicos por RUT`);
                }
            }
            let txtContent = 'REPORTE DE USUARIOS ELIMINADOS\n';
            txtContent += '='.repeat(70) + '\n';
            txtContent += `Fecha: ${new Date().toLocaleString()}\n`;
            txtContent += `Archivos procesados: ${results.successfulFiles}\n`;
            txtContent += `Total: ${totalEliminados} usuarios únicos eliminados\n`;
            txtContent += '='.repeat(70) + '\n\n';
            // Obtener información de filtros activos si está disponible
            if (typeof window !== 'undefined' && window.configFilters && window.configFilters.getActiveFilters) {
                const activeFilters = window.configFilters.getActiveFilters();
                txtContent += 'FILTROS APLICADOS:\n';
                txtContent += '-'.repeat(70) + '\n';
                if (activeFilters.emailFilters.length > 0) {
                    txtContent += '\nFiltros de Correo Electrónico:\n';
                    activeFilters.emailFilters.forEach(filter => {
                        txtContent += `  • ${filter.pattern}\n`;
                    });
                }
                if (activeFilters.rutFilters.length > 0) {
                    txtContent += '\nFiltros de RUT:\n';
                    activeFilters.rutFilters.forEach(filter => {
                        txtContent += `  • ${filter.pattern}\n`;
                    });
                }
                txtContent += '\n';
            }
            else {
                txtContent += 'Sistema de filtrado: Configuración básica (fallback)\n\n';
            }
            txtContent += '='.repeat(70) + '\n';
            // Mostrar usuarios eliminados
            if (emailUsers.length > 0 || rutUsers.length > 0) {
                // Usuarios eliminados por correo electrónico
                if (emailUsers.length > 0) {
                    txtContent += '\nUSUARIOS ELIMINADOS POR CORREO ELECTRÓNICO:\n';
                    txtContent += '-'.repeat(70) + '\n';
                    emailUsers.forEach((user, index) => {
                        txtContent += `${(index + 1).toString().padStart(3)}. ${user.email}\n`;
                    });
                    txtContent += `\nTotal eliminados por correo: ${emailUsers.length}\n`;
                }
                // Usuarios eliminados por RUT
                if (rutUsers.length > 0) {
                    txtContent += '\n' + '='.repeat(70) + '\n';
                    txtContent += '\nUSUARIOS ELIMINADOS POR RUT:\n';
                    txtContent += '-'.repeat(70) + '\n';
                    rutUsers.forEach((user, index) => {
                        txtContent += `${(index + 1).toString().padStart(3)}. ${user.rut} (${user.email})\n`;
                    });
                    txtContent += `\nTotal eliminados por RUT: ${rutUsers.length}\n`;
                }
            }
            else {
                // Fallback al formato anterior si no hay información detallada
                txtContent += '\nUSUARIOS ELIMINADOS:\n';
                txtContent += '-'.repeat(70) + '\n';
                uniqueEmails.forEach((email, index) => {
                    txtContent += `${(index + 1).toString().padStart(3)}. ${email}\n`;
                });
            }
            txtContent += '\n' + '='.repeat(70) + '\n';
            txtContent += 'FIN DEL REPORTE\n';
            const txtBlob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
            const txtUrl = URL.createObjectURL(txtBlob);
            processedData.eliminatedFile = { url: txtUrl, fileName: `usuarios_eliminados_${timestamp}.txt` };
        }
        logMessage(`Archivo Excel consolidado generado: ${fileName} (${sheetsCreated} hojas)`, 'success');
    }
    catch (error) {
        logMessage(`Error creando archivo Excel: ${error.message}`, 'error');
        throw error;
    }
}
// Generar contenido CSV
function generateCSVContent(processedSheets) {
    let csvContent = 'Hoja,Nombre,Apellido,Email,Calificación,Curso\n';
    Object.entries(processedSheets).forEach(([sheetName, data]) => {
        data.forEach(row => {
            const csvRow = [
                sheetName,
                row.Nombre || '',
                row.Apellido || '',
                row.Email || '',
                row.Calificación || '',
                row.Curso || ''
            ].map(field => `"${field}"`).join(',');
            csvContent += csvRow + '\n';
        });
    });
    return csvContent;
}
// Filtrar usuarios usando sistema de configuración avanzado
function filterUsersByEmailReal(data, headers) {
    console.log('Iniciando filtrado de usuarios con sistema de configuración...');
    if (data.length === 0) {
        return { data: [], eliminated: 0, eliminatedEmails: [] };
    }
    // Verificar si el sistema de configuración está disponible
    if (typeof window !== 'undefined' && window.configFilters && window.configFilters.applyUserFilters) {
        console.log('Usando sistema de configuración avanzado');
        const result = window.configFilters.applyUserFilters(data, headers);
        // Convertir formato para compatibilidad con el código existente
        // Incluir TODOS los usuarios eliminados (tanto por email como por RUT)
        const eliminatedEmails = result.eliminatedUsers.map(user => {
            if (user.type === 'email') {
                return user.email;
            }
            else if (user.type === 'rut') {
                // Para usuarios eliminados por RUT, incluir el email si está disponible
                return user.email || `RUT: ${user.rut}`;
            }
            else {
                return user.email || user.rut || 'Usuario desconocido';
            }
        });
        // Log detallado
        const emailCount = result.eliminatedUsers.filter(u => u.type === 'email').length;
        const rutCount = result.eliminatedUsers.filter(u => u.type === 'rut').length;
        if (emailCount > 0) {
            logMessage(`Usuarios eliminados por filtros de email: ${emailCount}`, 'warning');
        }
        if (rutCount > 0) {
            logMessage(`Usuarios eliminados por filtros de RUT: ${rutCount}`, 'warning');
        }
        console.log(`Total usuarios eliminados: ${result.eliminated} (Email: ${emailCount}, RUT: ${rutCount})`);
        console.log(`Usuarios restantes: ${result.data.length}`);
        return {
            data: result.data,
            eliminated: result.eliminated,
            eliminatedEmails: eliminatedEmails
        };
    }
    else {
        // Fallback al sistema básico si no está disponible la configuración
        console.log('Sistema de configuración no disponible, usando filtrado básico');
        return filterUsersByEmailBasic(data, headers);
    }
}
// Sistema básico de filtrado (fallback)
function filterUsersByEmailBasic(data, headers) {
    console.log('Usando sistema básico de filtrado...');
    // Buscar columnas de email
    let emailColumns = [];
    // Primero buscar por nombre de columna
    for (const header of headers) {
        if (header && (header.toLowerCase().includes('email') ||
            header.toLowerCase().includes('correo') ||
            header.toLowerCase().includes('mail'))) {
            emailColumns.push(header);
        }
    }
    // Si no se encuentra por nombre, buscar por contenido
    if (emailColumns.length === 0) {
        for (const header of headers) {
            if (header) {
                // Verificar si la columna contiene emails
                const sampleValues = data.slice(0, 10).map(row => row[header]).filter(val => val);
                if (sampleValues.some(val => val && val.toString().includes('@'))) {
                    emailColumns.push(header);
                    break;
                }
            }
        }
    }
    console.log(`Columnas de email encontradas: ${emailColumns.join(', ')}`);
    if (emailColumns.length === 0) {
        logMessage('No se encontró columna de email, no se aplicó filtrado', 'warning');
        return { data: data, eliminated: 0, eliminatedEmails: [] };
    }
    const emailColumn = emailColumns[0]; // Usar la primera columna encontrada
    // Mostrar algunos ejemplos antes del filtrado
    const sampleEmails = data.slice(0, 5)
        .map(row => row[emailColumn])
        .filter(email => email && email.trim());
    console.log('Ejemplos de emails antes del filtrado:');
    sampleEmails.forEach(email => console.log(`  - ${email}`));
    // Aplicar filtros básicos (regla original)
    const eliminatedUsers = [];
    const filteredData = [];
    data.forEach(row => {
        const email = row[emailColumn];
        if (email && typeof email === 'string') {
            const emailStr = email.trim();
            const isUctEmail = /@uct\.cl$/i.test(emailStr);
            const isAluUctEmail = /@alu\.uct\.cl$/i.test(emailStr);
            // Eliminar @uct.cl pero mantener @alu.uct.cl (regla original)
            if (isUctEmail && !isAluUctEmail) {
                eliminatedUsers.push(emailStr);
                console.log(`Usuario eliminado: ${emailStr}`);
            }
            else {
                filteredData.push(row);
            }
        }
        else {
            filteredData.push(row); // Mantener filas sin email
        }
    });
    console.log(`Usuarios eliminados (@uct.cl): ${eliminatedUsers.length}`);
    console.log(`Usuarios restantes: ${filteredData.length}`);
    if (eliminatedUsers.length > 0) {
        logMessage(`Usuarios eliminados en ${emailColumn}: ${eliminatedUsers.join(', ')}`, 'warning');
    }
    return {
        data: filteredData,
        eliminated: eliminatedUsers.length,
        eliminatedEmails: eliminatedUsers
    };
}
// Generar nombre de hoja
function generateSheetName(fileName) {
    let sheetName = fileName.replace(/\.xlsx?$/i, '').replace(/PAT_2025_/i, 'Curso_');
    return sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName;
}
// Actualizar progreso
function updateProgress(current, total, message) {
    const percent = Math.round((current / total) * 100);
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = message;
    document.getElementById('progressPercent').textContent = `${percent}%`;
}
// Mostrar resultados
function showResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsSummary = document.getElementById('resultsSummary');
    const processedFilesList = document.getElementById('processedFilesList');
    const downloadArea = document.getElementById('downloadArea');
    resultsSection.style.display = 'block';
    // Generar resumen de estadísticas
    resultsSummary.innerHTML = `
        <div class="result-stat">
            <h4>Archivos Procesados</h4>
            <div class="stat-number">${results.successfulFiles}</div>
        </div>
        <div class="result-stat">
            <h4>Hojas Creadas</h4>
            <div class="stat-number">${results.processedSheets.length}</div>
        </div>
        <div class="result-stat">
            <h4>Usuarios Eliminados</h4>
            <div class="stat-number">${results.totalEliminated}</div>
        </div>
        <div class="result-stat">
            <h4>Emails Únicos Eliminados</h4>
            <div class="stat-number">${new Set(results.eliminatedEmails).size}</div>
        </div>
    `;
    // Mostrar detalles de archivos procesados
    showProcessedFilesList(results);
    // Generar botones de descarga prominentes
    let downloadHTML = `
        <h3 style="margin-bottom: 15px; color: var(--success-color); font-size: 1.5rem; text-align: center;">
            ¡Archivos Procesados y Listos para Descargar!
        </h3>
        <p class="success-message" style="text-align: center; margin: 15px auto; max-width: 600px;">
            ${getIcon('check-circle', 20)} <strong>Procesamiento Completado:</strong> Los archivos han sido consolidados exitosamente. 
            Cada archivo original se convirtió en una hoja separada del Excel final.
        </p>
        <div style="display: flex; flex-direction: column; gap: 20px; align-items: center; margin-top: 30px;">
    `;
    if (processedData.consolidatedFile) {
        downloadHTML += `
            <a href="${processedData.consolidatedFile.url}" 
               download="${processedData.consolidatedFile.fileName}" 
               class="download-btn">
                <span class="download-icon">${getIcon('chart-bar', 24)}</span>
                <div class="download-content">
                    <div class="download-title">Descargar Calificaciones Consolidadas</div>
                    <div class="download-subtitle">${processedData.consolidatedFile.fileName}</div>
                </div>
            </a>
        `;
    }
    if (processedData.eliminatedFile) {
        downloadHTML += `
            <a href="${processedData.eliminatedFile.url}" 
               download="${processedData.eliminatedFile.fileName}" 
               class="download-btn download-btn-secondary">
                <span class="download-icon">${getIcon('file-text', 24)}</span>
                <div class="download-content">
                    <div class="download-title">Descargar Lista de Usuarios Eliminados por Filtros</div>
                    <div class="download-subtitle">${processedData.eliminatedFile.fileName}</div>
                </div>
            </a>
        `;
    }
    downloadHTML += '</div>';
    downloadArea.innerHTML = downloadHTML;
    logMessage(`Resultados mostrados - ${results.successfulFiles} archivos procesados exitosamente`, 'success');
    logMessage(`Archivos listos para descarga`, 'info');
}
// Mostrar lista detallada de archivos procesados
function showProcessedFilesList(results) {
    const processedFilesList = document.getElementById('processedFilesList');
    processedFilesList.innerHTML = '';
    selectedFiles.forEach(file => {
        const sheetName = generateSheetName(file.name);
        const sheetInfo = results.processedSheets.find(sheet => sheet.sheetName === sheetName);
        const processedData = sheetInfo ? sheetInfo.data : undefined;
        const fileResult = results.fileResults && results.fileResults[file.name];
        const processedItem = document.createElement('div');
        processedItem.className = 'processed-file-item';
        const isSuccess = processedData !== undefined;
        const rowCount = processedData ? processedData.length : 0;
        const eliminatedCount = fileResult ? fileResult.eliminated : 0;
        processedItem.innerHTML = `
            <div class="processed-file-info">
                <div class="processed-file-name">${file.name}</div>
                <div class="processed-file-stats">
                    ${isSuccess
            ? `${rowCount} filas procesadas • ${eliminatedCount} usuarios eliminados`
            : 'Error al procesar el archivo'}
                </div>
            </div>
            <div class="processed-file-status ${isSuccess ? 'status-success' : 'status-error'}">
                ${isSuccess ? '<span class="icon icon-check"></span> Procesado' : '<span class="icon icon-x"></span> Error'}
            </div>
        `;
        processedFilesList.appendChild(processedItem);
    });
}
// Extraer información del curso del nombre del archivo
function extractCourseInfo(fileName) {
    // Buscar patrón PAT_2025_XX
    const match = fileName.match(/PAT_2025[_-](\d+)/i);
    if (match) {
        return `Curso ${match[1]}`;
    }
    // Buscar otros patrones comunes
    const courseMatch = fileName.match(/curso[_-]?(\d+)/i);
    if (courseMatch) {
        return `Curso ${courseMatch[1]}`;
    }
    return null;
}
// Funciones de utilidad
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function logMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    const logContainer = document.getElementById('logContainer');
    if (!logContainer) {
        console.warn('logContainer no encontrado');
        return;
    }
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-message">${message}</span>
    `;
    logContainer.appendChild(logEntry);
    // Scroll automático al último elemento
    logEntry.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
function clearLog() {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
    logMessage('Log limpiado', 'info');
}
function goBack() {
    if (typeof window.navigate === 'function') {
        window.navigate('home');
    }
    else {
        window.location.href = 'index.html';
    }
}
