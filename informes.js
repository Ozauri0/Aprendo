// informes.js - Lógica para procesar archivos de informes/logs

// Función para volver a la página principal
function goBack() {
    window.location.href = 'index.html';
}

// Variables globales
let selectedFiles = [];
let processedData = {};
let isProcessing = false;
let systemReady = true;

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado - Página de Informes');
    
    // Agregar mensaje inicial al log
    logMessage('Sistema de consolidación de informes iniciado', 'info');
    
    // Configurar listeners
    setupEventListeners();
    
    // Verificar que ExcelJS esté disponible
    try {
        const ExcelJS = require('exceljs');
        console.log('ExcelJS cargado correctamente');
        logMessage('ExcelJS cargado - Procesamiento de informes listo', 'success');
    } catch (error) {
        console.error('Error cargando ExcelJS:', error);
        logMessage('Error: No se pudo cargar ExcelJS', 'error');
    }
    
    console.log('Sistema de informes inicializado correctamente');
});

// Configurar event listeners
function setupEventListeners() {
    console.log('Configurando event listeners para informes...');
    
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    // selectFilesBtn se maneja desde el botón dentro del upload-area
    
    if (!fileInput) {
        console.error('fileInput no encontrado');
        return;
    }
    
    // Eventos de selección de archivos
    fileInput.addEventListener('change', handleFileSelection);
    
    // Eventos de drag & drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // Botones de acción
    const processBtn = document.getElementById('processBtn');
    
    if (processBtn) processBtn.addEventListener('click', processFiles);
    
    console.log('Event listeners configurados correctamente');
}

// Manejar selección de archivos
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    addFilesToList(files);
}

// Manejar drag over
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

// Manejar drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

// Manejar drop de archivos
function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    addFilesToList(files);
}

// Agregar archivos a la lista
function addFilesToList(files) {
    console.log(`Intentando agregar ${files.length} archivos`);
    
    const validFiles = files.filter(file => {
        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
        const isLogFile = file.name.toLowerCase().includes('logs_pat_2025_');
        
        if (!isExcel) {
            logMessage(`❌ ${file.name}: No es un archivo Excel válido`, 'warning');
            return false;
        }
        
        if (!isLogFile) {
            logMessage(`⚠️ ${file.name}: No parece ser un archivo de logs (falta 'logs_PAT_2025_')`, 'warning');
            // Permitir el archivo pero mostrar advertencia
        }
        
        return true;
    });
    
    // Verificar límite de archivos
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > 60) {
        const permitidos = 60 - selectedFiles.length;
        logMessage(`❌ Se pueden agregar máximo 60 archivos. Solo se agregarán los primeros ${permitidos}`, 'error');
        validFiles.splice(permitidos);
    }
    
    // Verificar duplicados
    const newFiles = validFiles.filter(file => {
        const isDuplicate = selectedFiles.some(existing => existing.name === file.name);
        if (isDuplicate) {
            logMessage(`⚠️ ${file.name}: Archivo duplicado, se omitirá`, 'warning');
            return false;
        }
        return true;
    });
    
    // Agregar archivos nuevos
    selectedFiles.push(...newFiles);
    
    logMessage(`✅ Se agregaron ${newFiles.length} archivos de informes`, 'success');
    
    updateFileList();
}

// Actualizar lista de archivos en la UI
function updateFileList() {
    const fileInfo = document.getElementById('fileInfo');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    const btnFileCount = document.getElementById('btnFileCount');
    const processBtn = document.getElementById('processBtn');
    const fileRequirement = document.getElementById('fileRequirement');
    
    if (selectedFiles.length === 0) {
        fileInfo.style.display = 'none';
        return;
    }
    
    fileInfo.style.display = 'block';
    fileCount.textContent = selectedFiles.length;
    btnFileCount.textContent = selectedFiles.length;
    
    // Ordenar archivos por número de curso para mostrar
    const sortedFiles = [...selectedFiles].sort((a, b) => {
        const extractNumber = (fileName) => {
            const match = fileName.match(/logs_PAT_2025_(\d+)_/);
            return match ? parseInt(match[1], 10) : 999;
        };
        return extractNumber(a.name) - extractNumber(b.name);
    });
    
    // Actualizar mensaje de requisitos
    if (selectedFiles.length >= 2) {
        fileRequirement.textContent = `¡Perfecto! ${selectedFiles.length} archivos listos para procesar`;
        fileRequirement.className = 'file-requirement ready';
    } else {
        fileRequirement.textContent = 'Se necesitan al menos 2 archivos para procesar';
        fileRequirement.className = 'file-requirement';
    }
    
    fileList.innerHTML = sortedFiles.map((file, index) => {
        const originalIndex = selectedFiles.indexOf(file);
        const courseNumber = extractCourseNumber(file.name);
        const dateTime = extractDateTime(file.name);
        
        return `
            <div class="file-item">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button class="file-remove" onclick="removeFile(${originalIndex})">
                    ✕
                </button>
            </div>
        `;
    }).join('');
    
    // Habilitar/deshabilitar botón de procesar
    processBtn.disabled = selectedFiles.length < 2 || isProcessing;
}

// Extraer número de curso del nombre del archivo
function extractCourseNumber(fileName) {
    const match = fileName.match(/logs_PAT_2025_(\d+)_/);
    return match ? parseInt(match[1], 10) : null;
}

// Extraer fecha/hora del nombre del archivo
function extractDateTime(fileName) {
    const match = fileName.match(/logs_PAT_2025_\d+_(\d{8}-\d{4})/);
    if (match) {
        const dateTime = match[1];
        // Formatear: YYYYMMDD-HHMM -> DD/MM/YYYY HH:MM
        const date = dateTime.substring(0, 8);
        const time = dateTime.substring(9, 13);
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        const hour = time.substring(0, 2);
        const minute = time.substring(2, 4);
        
        return `${day}/${month}/${year} ${hour}:${minute}`;
    }
    return null;
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Quitar archivo de la lista
function removeFile(index) {
    if (isProcessing) return;
    
    const removedFile = selectedFiles[index];
    selectedFiles.splice(index, 1);
    logMessage(`🗑️ Archivo quitado: ${removedFile.name}`, 'info');
    updateFileList();
}

// Limpiar lista de archivos
function clearFiles() {
    if (isProcessing) return;
    
    selectedFiles = [];
    logMessage('🗑️ Lista de archivos limpiada', 'info');
    updateFileList();
}

// Procesar archivos de informes
async function processFiles() {
    if (selectedFiles.length < 1 || isProcessing) {
        if (selectedFiles.length < 1) {
            logMessage('Se necesita al menos 1 archivo para procesar', 'warning');
        }
        return;
    }
    
    isProcessing = true;
    updateFileList();
    document.getElementById('processingSection').style.display = 'block';
    
    logMessage(`Iniciando consolidación de ${selectedFiles.length} archivos de informes...`, 'info');
    
    try {
        const results = await processLogFiles();
        await generateConsolidatedLogFile(results);
        showResults(results);
        logMessage('✅ Consolidación de informes completada exitosamente', 'success');
    } catch (error) {
        logMessage(`❌ Error durante la consolidación: ${error.message}`, 'error');
        console.error(error);
    } finally {
        isProcessing = false;
        updateFileList();
        document.getElementById('processingSection').style.display = 'none';
    }
}

// Procesar archivos de logs (versión real con ExcelJS)
async function processLogFiles() {
    const results = {
        processedSheets: [], // Array para mantener orden
        totalRecords: 0,
        totalFiles: selectedFiles.length,
        successfulFiles: 0,
        fileResults: {}
    };
    
    // Ordenar archivos por número de curso (menor a mayor)
    const sortedFiles = [...selectedFiles].sort((a, b) => {
        const extractNumber = (fileName) => {
            const match = fileName.match(/logs_PAT_2025_(\d+)_/);
            return match ? parseInt(match[1], 10) : 0;
        };
        return extractNumber(a.name) - extractNumber(b.name);
    });
    
    logMessage(`Archivos ordenados por número de curso (${sortedFiles.length} archivos)`, 'info');
    
    for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        
        updateProgress(i, sortedFiles.length, `Procesando: ${file.name}`);
        
        try {
            const fileResult = await processLogFile(file);
            results.fileResults[file.name] = fileResult;
            
            if (fileResult.data) {
                const sheetName = generateSheetName(file.name);
                results.processedSheets.push({ sheetName, data: fileResult.data });
                results.totalRecords += fileResult.data.length;
                results.successfulFiles++;
                
                logMessage(`✓ ${file.name}: ${fileResult.data.length} registros procesados`, 'success');
            }
        } catch (error) {
            logMessage(`✗ Error procesando ${file.name}: ${error.message}`, 'error');
            results.fileResults[file.name] = { data: null, error: error.message };
        }
    }
    
    updateProgress(sortedFiles.length, sortedFiles.length, 'Consolidación completada');
    return results;
}

// Procesar un archivo de log individual
async function processLogFile(file) {
    const ExcelJS = require('exceljs');
    
    return new Promise((resolve, reject) => {
        console.log(`Procesando archivo de log: ${file.name}...`);
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
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
                        } else {
                            rowData[header] = '';
                        }
                    });
                    
                    if (hasData) {
                        data.push(rowData);
                    }
                }
                
                console.log(`Filas de datos encontradas: ${data.length}`);
                
                // Para logs no aplicamos filtros, mantenemos todos los datos
                resolve({
                    data: data,
                    headers: headers
                });
                
            } catch (error) {
                console.error('Error procesando archivo de log:', error);
                reject(new Error(`Error procesando archivo: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('Error leyendo el archivo'));
        reader.readAsArrayBuffer(file);
    });
}

// Generar archivo consolidado de logs
async function generateConsolidatedLogFile(results) {
    const ExcelJS = require('exceljs');
    
    logMessage('Generando archivo Excel consolidado de informes...', 'info');
    
    try {
        // Crear nuevo workbook
        const workbook = new ExcelJS.Workbook();
        
        let sheetsCreated = 0;
        
        // Crear una hoja por cada archivo procesado (manteniendo el orden)
        results.processedSheets.forEach((sheetInfo) => {
            const { sheetName, data } = sheetInfo;
            if (data.length > 0) {
                const worksheet = workbook.addWorksheet(sheetName);
                
                // Obtener las columnas del primer registro
                const headers = Object.keys(data[0]);
                
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
                logMessage(`Hoja creada: ${sheetName} (${data.length} registros)`, 'info');
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
        const fileName = `Logs_Actividad_Consolidados_${timestamp}.xlsx`;
        
        // Guardar referencia para descarga
        processedData.consolidatedFile = { url, fileName };
        
        logMessage(`Archivo Excel de informes creado: ${fileName} (${sheetsCreated} hojas)`, 'success');
        
    } catch (error) {
        logMessage(`Error creando archivo Excel de informes: ${error.message}`, 'error');
        throw error;
    }
}

// Generar nombre de hoja
function generateSheetName(fileName) {
    let sheetName = fileName.replace(/\.xlsx?$/i, '').replace(/logs_PAT_2025_/i, 'Curso_');
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
            <h4>Total de Registros</h4>
            <div class="stat-number">${results.totalRecords.toLocaleString()}</div>
        </div>
        <div class="result-stat">
            <h4>Promedio por Archivo</h4>
            <div class="stat-number">${results.successfulFiles > 0 ? Math.round(results.totalRecords / results.successfulFiles) : 0}</div>
        </div>
    `;
    
    // Mostrar detalles de archivos procesados
    showProcessedFilesList(results);
    
    // Generar enlace de descarga
    let downloadHTML = `
        <h3>🎉 ¡Informes Consolidados Listos!</h3>
        <p style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0; color: #155724; border: 1px solid #c3e6cb;">
            ✅ <strong>Consolidación Completada:</strong> Los archivos de informes han sido consolidados exitosamente. 
            Cada archivo original ahora es una hoja separada en el archivo Excel consolidado, ordenadas por número de curso.
        </p>
    `;
    
    if (processedData.consolidatedFile) {
        downloadHTML += `
            <div style="text-align: center; margin: 20px 0;">
                <a href="${processedData.consolidatedFile.url}" 
                   download="${processedData.consolidatedFile.fileName}" 
                   class="download-btn">
                    📥 Descargar Informes Consolidados
                </a>
            </div>
            <p style="text-align: center; color: #666; font-size: 0.9rem;">
                Archivo: ${processedData.consolidatedFile.fileName}
            </p>
        `;
    }
    
    downloadArea.innerHTML = downloadHTML;
}

// Mostrar lista de archivos procesados
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
        const recordCount = processedData ? processedData.length : 0;
        
        processedItem.innerHTML = `
            <div class="processed-file-info">
                <div class="processed-file-name">${file.name}</div>
                <div class="processed-file-stats">
                    ${isSuccess 
                        ? `${recordCount.toLocaleString()} registros procesados` 
                        : 'Error al procesar el archivo'
                    }
                </div>
            </div>
            <div class="processed-file-status ${isSuccess ? 'status-success' : 'status-error'}">
                ${isSuccess ? '✓ Procesado' : '✗ Error'}
            </div>
        `;
        
        processedFilesList.appendChild(processedItem);
    });
}

// Agregar mensaje al log
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
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog() {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
    logMessage('Log limpiado', 'info');
}
