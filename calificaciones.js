// calificaciones.js - Lógica para procesar archivos de calificaciones

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

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    
    // Agregar mensaje inicial al log
    logMessage('Sistema iniciado. Listo para procesar archivos.', 'info');
    
    // Configurar listeners inmediatamente
    setupEventListeners();
    
    // Verificar que ExcelJS esté disponible
    try {
        const ExcelJS = require('exceljs');
        console.log('ExcelJS cargado correctamente');
        logMessage('Sistema de procesamiento de calificaciones iniciado', 'info');
        logMessage('ExcelJS cargado - Procesamiento real activado', 'success');
    } catch (error) {
        console.error('Error cargando ExcelJS:', error);
        logMessage('Error: No se pudo cargar ExcelJS', 'error');
    }
    
    console.log('Sistema inicializado correctamente');
});

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
    const excelFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.xlsx') || 
        file.name.toLowerCase().endsWith('.xls')
    );
    
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
        } else {
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
        if (fileInfo) fileInfo.style.display = 'none';
        return;
    }
    
    if (fileInfo) fileInfo.style.display = 'block';
    if (fileCount) fileCount.textContent = selectedFiles.length;
    if (btnFileCount) btnFileCount.textContent = selectedFiles.length;
    
    // Actualizar mensaje de requerimiento
    if (selectedFiles.length < 2) {
        if (fileRequirement) {
            fileRequirement.textContent = `Se necesitan al menos 2 archivos para procesar (tienes ${selectedFiles.length})`;
            fileRequirement.className = 'file-requirement';
        }
        if (processBtn) processBtn.disabled = true;
    } else {
        if (fileRequirement) {
            fileRequirement.textContent = `✓ Listo para procesar ${selectedFiles.length} archivos`;
            fileRequirement.className = 'file-requirement ready';
        }
        if (processBtn) processBtn.disabled = isProcessing;
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
                    <div style="font-weight: 600;">${file.name}</div>
                    ${courseInfo ? `<div style="font-size: 0.8em; color: #667eea; margin-top: 2px;">→ ${courseInfo}</div>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    <button class="file-remove" onclick="removeFile(${index})" title="Eliminar archivo">
                        ✕
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
        logMessage('✅ Procesamiento completado exitosamente', 'success');
    } catch (error) {
        logMessage(`❌ Error durante el procesamiento: ${error.message}`, 'error');
        console.error(error);
    } finally {
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
                results.processedSheets.push({ sheetName, data: fileResult.data }); // Usar array con objetos
                results.totalEliminated += fileResult.eliminated;
                results.eliminatedEmails.push(...fileResult.eliminatedEmails);
                results.successfulFiles++;
                
                logMessage(`✓ ${file.name}: ${fileResult.data.length} filas, ${fileResult.eliminated} usuarios eliminados`, 'success');
            }
        } catch (error) {
            logMessage(`✗ Error procesando ${file.name}: ${error.message}`, 'error');
            results.fileResults[file.name] = { data: null, eliminated: 0, eliminatedEmails: [], error: error.message };
        }
    }
    
    updateProgress(selectedFiles.length, selectedFiles.length, 'Procesamiento completado');
    return results;
}

// Procesar un archivo Excel individual (versión real)
async function processExcelFileReal(file) {
    const ExcelJS = require('exceljs');
    
    return new Promise((resolve, reject) => {
        console.log(`Procesando ${file.name} (real)...`);
        
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
                
                // Aplicar filtrado de emails (igual que el Python)
                const filterResult = filterUsersByEmailReal(data, headers);
                
                console.log(`Después del filtrado: ${filterResult.data.length} filas, ${filterResult.eliminated} eliminados`);
                
                resolve(filterResult);
                
            } catch (error) {
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
                logMessage(`Hoja creada: ${sheetName} (${data.length} filas)`, 'info');
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
            let txtContent = 'Lista de usuarios eliminados (@uct.cl)\n';
            txtContent += '='.repeat(50) + '\n';
            txtContent += `Total: ${uniqueEmails.length} usuarios únicos\n\n`;
            uniqueEmails.forEach((email, index) => {
                txtContent += `${(index + 1).toString().padStart(3)}. ${email}\n`;
            });
            
            const txtBlob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
            const txtUrl = URL.createObjectURL(txtBlob);
            processedData.eliminatedFile = { url: txtUrl, fileName: `usuarios_eliminados_${timestamp}.txt` };
        }
        
        logMessage(`Archivo Excel consolidado generado: ${fileName} (${sheetsCreated} hojas)`, 'success');
    } catch (error) {
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





// Filtrar usuarios por email (replica exacta de la lógica Python)
function filterUsersByEmailReal(data, headers) {
    console.log('Iniciando filtrado de usuarios...');
    
    if (data.length === 0) {
        return { data: [], eliminated: 0, eliminatedEmails: [] };
    }
    
    // Buscar columnas de email (igual que en Python)
    let emailColumns = [];
    
    // Primero buscar por nombre de columna
    for (const header of headers) {
        if (header && (
            header.toLowerCase().includes('email') ||
            header.toLowerCase().includes('correo') ||
            header.toLowerCase().includes('mail')
        )) {
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
    
    // Aplicar filtros (igual que en Python)
    const eliminatedUsers = [];
    const filteredData = [];
    
    data.forEach(row => {
        const email = row[emailColumn];
        if (email && typeof email === 'string') {
            const emailStr = email.trim();
            const isUctEmail = /@uct\.cl$/i.test(emailStr);
            const isAluUctEmail = /@alu\.uct\.cl$/i.test(emailStr);
            
            // Eliminar @uct.cl pero mantener @alu.uct.cl (igual que Python)
            if (isUctEmail && !isAluUctEmail) {
                eliminatedUsers.push(emailStr);
                console.log(`Usuario eliminado: ${emailStr}`);
            } else {
                filteredData.push(row);
            }
        } else {
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

// Generar archivo consolidado


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
    
    // Generar enlaces de descarga prominentes
    let downloadHTML = `
        <h3>🎉 ¡Archivos Procesados y Listos para Descargar!</h3>
        <p style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0; color: #155724; border: 1px solid #c3e6cb;">
            ✅ <strong>Procesamiento Completado:</strong> Los archivos han sido consolidados exitosamente. 
            Cada archivo original se convirtió en una hoja separada del Excel final.
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-top: 20px;">
    `;
    
    if (processedData.consolidatedFile) {
        downloadHTML += `
            <a href="${processedData.consolidatedFile.url}" 
               download="${processedData.consolidatedFile.fileName}" 
               class="download-link"
               style="font-size: 1.1em; padding: 15px 30px;">
                📊 Descargar Calificaciones Consolidadas (Excel)
                <br><small style="opacity: 0.8;">${processedData.consolidatedFile.fileName}</small>
            </a>
        `;
    }
    
    if (processedData.eliminatedFile) {
        downloadHTML += `
            <a href="${processedData.eliminatedFile.url}" 
               download="${processedData.eliminatedFile.fileName}" 
               class="download-link"
               style="font-size: 1.1em; padding: 15px 30px;">
                📝 Descargar Lista de Usuarios Eliminados
                <br><small style="opacity: 0.8;">${processedData.eliminatedFile.fileName}</small>
            </a>
        `;
    }
    
    downloadHTML += '</div>';
    downloadArea.innerHTML = downloadHTML;
    
    logMessage(`📊 Resultados mostrados - ${results.successfulFiles} archivos procesados exitosamente`, 'success');
    logMessage(`📥 Archivos listos para descarga`, 'info');
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
    if (bytes === 0) return '0 Bytes';
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
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog() {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
    logMessage('Log limpiado', 'info');
}

function goBack() {
    window.location.href = 'index.html';
}
