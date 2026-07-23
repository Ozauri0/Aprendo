// asistencia.ts - Lógica para consolidar archivos de asistencia por curso
// Agrupa los Excel de asistencia (3 módulos por curso) y genera un archivo
// por curso, con una hoja por módulo (nombre del módulo en cada hoja).
import './config';
import { getIcon } from './icons';
import { renderHeader, applyStoredTheme } from './components/header';
import { renderTitleBar, setupTitleBarActions } from './components/title-bar';
import ExcelJS from 'exceljs';

// Tipos
interface AttendanceFileInfo {
    file: File;
    courseKey: string;      // ej. "PAT_2026_01"
    courseNumber: number;   // ej. 1 (para ordenar)
    moduleName: string;     // ej. "GESTIÓN PERSONAL"
}

interface CourseGroup {
    courseKey: string;
    courseNumber: number;
    modules: AttendanceFileInfo[];
}

interface ConsolidatedCourseFile {
    courseKey: string;
    fileName: string;
    buffer: ArrayBuffer;
    sheetCount: number;
    moduleNames: string[];
    studentCount: number;
}

// Variables globales
let selectedFiles: File[] = [];
let generatedFiles: ConsolidatedCourseFile[] = [];
let isProcessing = false;

// Cantidad esperada de módulos por curso (solo informativo)
const EXPECTED_MODULES_PER_COURSE = 3;
const MAX_FILES = 120;

// Renderizar vista sin HTML externo
export function renderAsistenciaPage(
    injectStyles: (files: string[]) => void,
    navigate: (view: string) => void
) {
    selectedFiles = [];
    generatedFiles = [];
    isProcessing = false;

    document.title = 'Consolidar Asistencia - Aprendo UCT';
    injectStyles([
        'styles.css',
        'global-styles.css',
        'asistencia.css'
    ]);

    // Aplicar tema guardado
    applyStoredTheme();

    document.body.innerHTML = `
    ${renderTitleBar('Consolidar Asistencia')}
    <div class="page-scroll">
        <div class="container">
            ${renderHeader({
                title: 'Consolidar Asistencia',
                subtitle: 'Agrupa los Excel de asistencia por curso y genera un archivo por curso con una hoja por módulo',
                showBackButton: true,
                showConfigButton: false
            })}

            <main>
                <div class="upload-section">
                    <h2>Subir Archivos</h2>
                    <div class="upload-area" id="uploadArea">
                        <div class="upload-content">
                            <span class="upload-icon">${getIcon('folder-open', 48)}</span>
                            <h3>Arrastra archivos Excel de asistencia aquí</h3>
                            <p>o haz clic para seleccionar (máximo ${MAX_FILES} archivos)</p>
                            <input type="file" id="fileInput" multiple accept=".xlsx,.xls" style="display: none;">
                            <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                                ${getIcon('upload', 18)} Seleccionar Archivos
                            </button>
                        </div>
                    </div>

                    <div class="file-info" id="fileInfo" style="display: none;">
                        <h3>Archivos seleccionados: <span id="fileCount">0</span></h3>
                        <p class="file-requirement" id="fileRequirement">Los archivos se agrupan automáticamente por curso</p>
                        <div class="file-list" id="fileList"></div>
                        <div class="process-controls">
                            <button class="btn btn-success" id="processBtn" onclick="processFiles()" disabled>
                                ${getIcon('play', 18)} Consolidar (<span id="btnFileCount">0</span>)
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
                    <h2>${getIcon('check-circle', 24)} Consolidación Completada</h2>
                    <div class="results-summary" id="resultsSummary">
                        <!-- Los resultados se mostrarán aquí -->
                    </div>
                    <div class="download-area" id="downloadArea">
                        <!-- Los enlaces de descarga aparecerán aquí -->
                    </div>
                </div>
            </main>
        </div>

        <footer>
            <p>Aprendo UCT v1.0.0 &mdash; Universidad Católica de Temuco</p>
        </footer>
    </div>
    `;

    logMessage('Sistema de consolidación de asistencia iniciado', 'info');
    setupEventListeners();

    // Exponer funciones usadas en el markup
    (window as any).processFiles = processFiles;
    (window as any).clearFiles = clearFiles;
    (window as any).removeFile = removeFile;
    (window as any).clearLog = clearLog;
    (window as any).saveAllFiles = saveAllFiles;
    (window as any).saveSingleFile = saveSingleFile;
    (window as any).goBack = () => navigate('home');
    (window as any).navigate = navigate;
    (window as any).toggleTheme = toggleTheme;
    setupTitleBarActions();
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
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const uploadArea = document.getElementById('uploadArea');

    if (!fileInput || !uploadArea) {
        console.error('Elementos de carga no encontrados');
        return;
    }

    fileInput.addEventListener('change', handleFileSelection);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
}

// Manejar selección de archivos
function handleFileSelection(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    addFilesToList(files);
    target.value = ''; // Permitir re-seleccionar los mismos archivos
}

function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea')!.classList.add('drag-over');
}

function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea')!.classList.remove('drag-over');
}

function handleFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea')!.classList.remove('drag-over');

    const files = Array.from(event.dataTransfer?.files || []);
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
function addFilesToList(files: File[]) {
    if (selectedFiles.length + files.length > MAX_FILES) {
        logMessage(`No se pueden agregar más de ${MAX_FILES} archivos`, 'error');
        return;
    }

    files.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name)) {
            selectedFiles.push(file);
            const info = parseAttendanceFileName(file.name);
            if (info.courseKey === 'Sin_Curso') {
                logMessage(`${file.name}: no se detectó el curso (se agrupará como "Sin_Curso")`, 'warning');
            }
        } else {
            logMessage(`Archivo duplicado ignorado: ${file.name}`, 'warning');
        }
    });

    updateFileList();
}

// Actualizar la lista visual de archivos (agrupada por curso)
function updateFileList() {
    const fileInfo = document.getElementById('fileInfo');
    const fileCount = document.getElementById('fileCount');
    const btnFileCount = document.getElementById('btnFileCount');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn') as HTMLButtonElement | null;
    const fileRequirement = document.getElementById('fileRequirement');

    if (selectedFiles.length === 0) {
        if (fileInfo) fileInfo.style.display = 'none';
        return;
    }

    if (fileInfo) fileInfo.style.display = 'block';
    if (fileCount) fileCount.textContent = selectedFiles.length.toString();
    if (btnFileCount) btnFileCount.textContent = selectedFiles.length.toString();

    const groups = groupFilesByCourse(selectedFiles);
    const incomplete = groups.filter(g => g.modules.length !== EXPECTED_MODULES_PER_COURSE).length;

    if (fileRequirement) {
        fileRequirement.innerHTML = `${getIcon('check', 16)} ${groups.length} curso(s) detectado(s)${incomplete > 0 ? ` &mdash; ${incomplete} sin ${EXPECTED_MODULES_PER_COURSE} módulos` : ''}`;
        fileRequirement.className = 'file-requirement ready';
    }
    if (processBtn) processBtn.disabled = isProcessing;

    // Renderizar archivos agrupados por curso
    if (fileList) {
        fileList.innerHTML = '';
        groups.forEach(group => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'course-group-header';
            groupHeader.innerHTML = `
                <span class="course-group-name">${getIcon('users', 16)} ${group.courseKey.replace(/_/g, ' ')}</span>
                <span class="course-group-badge ${group.modules.length === EXPECTED_MODULES_PER_COURSE ? 'badge-ok' : 'badge-warn'}">${group.modules.length} módulo(s)</span>
            `;
            fileList.appendChild(groupHeader);

            const sortedModules = [...group.modules].sort((a, b) => a.moduleName.localeCompare(b.moduleName, 'es'));
            sortedModules.forEach(mod => {
                const index = selectedFiles.indexOf(mod.file);
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item file-item-module';
                fileItem.innerHTML = `
                    <div class="file-name">
                        <div style="font-weight: 600;">${getIcon('file-spreadsheet', 16)} ${mod.file.name}</div>
                        <div class="module-tag">→ Hoja: ${mod.moduleName}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="file-size">${formatFileSize(mod.file.size)}</span>
                        <button class="file-remove" onclick="removeFile(${index})" title="Eliminar archivo">
                            ${getIcon('x', 16)}
                        </button>
                    </div>
                `;
                fileList.appendChild(fileItem);
            });
        });
    }
}

// Remover archivo de la lista
function removeFile(index: number) {
    if (isProcessing) return;
    const removedFile = selectedFiles.splice(index, 1)[0];
    logMessage(`Archivo removido: ${removedFile.name}`, 'info');
    updateFileList();
}

// Limpiar lista de archivos
function clearFiles() {
    if (isProcessing) return;
    selectedFiles = [];
    logMessage('Lista de archivos limpiada', 'info');
    updateFileList();
}

// Parsear nombre de archivo de asistencia
// Formatos soportados:
//   "PAT_2026_01_Asistencias Asistencia GESTIÓN PERSONAL.xlsx"
//   "PAT_01 Asistencia GESTIÓN PERSONAL.xlsx"
function parseAttendanceFileName(fileName: string): { courseKey: string; courseNumber: number; moduleName: string } {
    const base = fileName.replace(/\.xlsx?$/i, '').trim();

    // Curso: "PAT_2026_01" (año + número) o "PAT_01" (solo número)
    // (?!\d) en vez de \b porque "_" es carácter de palabra y rompe el límite
    let courseKey = '';
    let courseNumber = Number.MAX_SAFE_INTEGER;
    const fullMatch = base.match(/PAT[_\s-]?(\d{4})[_\s-]?0*(\d{1,3})(?!\d)/i);
    const shortMatch = fullMatch ? null : base.match(/PAT[_\s-]?0*(\d{1,3})(?!\d)/i);

    if (fullMatch) {
        courseNumber = parseInt(fullMatch[2], 10);
        courseKey = `PAT_${fullMatch[1]}_${fullMatch[2].padStart(2, '0')}`;
    } else if (shortMatch) {
        courseNumber = parseInt(shortMatch[1], 10);
        courseKey = `PAT_${shortMatch[1].padStart(2, '0')}`;
    }

    // Módulo: texto después de la ÚLTIMA aparición de "Asistencia(s)"
    // (el prefijo ".*" voraz garantiza tomar la última, ej. "Asistencias Asistencia X" -> "X")
    let moduleName = '';
    const moduleMatch = base.match(/.*asistencias?[_\s]+(.+)$/i);
    if (moduleMatch) {
        moduleName = moduleMatch[1].trim();
    }
    if (!moduleName) {
        moduleName = base; // fallback: nombre completo del archivo
    }
    if (!courseKey) {
        courseKey = 'Sin_Curso';
    }

    return { courseKey, courseNumber, moduleName };
}

// Agrupar archivos por curso, ordenados por número de curso
function groupFilesByCourse(files: File[]): CourseGroup[] {
    const groups = new Map<string, CourseGroup>();

    files.forEach(file => {
        const info = parseAttendanceFileName(file.name);
        if (!groups.has(info.courseKey)) {
            groups.set(info.courseKey, {
                courseKey: info.courseKey,
                courseNumber: info.courseNumber,
                modules: []
            });
        }
        groups.get(info.courseKey)!.modules.push({
            file,
            courseKey: info.courseKey,
            courseNumber: info.courseNumber,
            moduleName: info.moduleName
        });
    });

    return [...groups.values()].sort((a, b) => a.courseNumber - b.courseNumber);
}

// Procesar archivos
async function processFiles() {
    if (selectedFiles.length < 1 || isProcessing) {
        if (selectedFiles.length < 1) {
            logMessage('Se necesita al menos 1 archivo para consolidar', 'warning');
        }
        return;
    }

    isProcessing = true;
    generatedFiles = [];
    updateFileList();
    document.getElementById('processingSection')!.style.display = 'block';
    document.getElementById('resultsSection')!.style.display = 'none';

    logMessage(`Iniciando consolidación de ${selectedFiles.length} archivos de asistencia...`, 'info');

    try {
        const groups = groupFilesByCourse(selectedFiles);
        logMessage(`${groups.length} curso(s) detectado(s)`, 'info');

        groups.forEach(group => {
            if (group.modules.length !== EXPECTED_MODULES_PER_COURSE) {
                logMessage(`${group.courseKey}: tiene ${group.modules.length} módulo(s), se esperaban ${EXPECTED_MODULES_PER_COURSE}`, 'warning');
            }
        });

        const results = {
            totalCourses: groups.length,
            successfulCourses: 0,
            totalSheets: 0,
            totalStudents: 0,
            failedCourses: [] as string[]
        };

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            updateProgress(i, groups.length, `Consolidando: ${group.courseKey}`);

            try {
                const consolidated = await generateCourseWorkbook(group);
                generatedFiles.push(consolidated);
                results.successfulCourses++;
                results.totalSheets += consolidated.sheetCount;
                results.totalStudents += consolidated.studentCount;
                logMessage(`${consolidated.fileName}: ${consolidated.sheetCount} hojas (${consolidated.moduleNames.join(', ')})`, 'success');
            } catch (error) {
                logMessage(`Error consolidando ${group.courseKey}: ${(error as Error).message}`, 'error');
                results.failedCourses.push(group.courseKey);
            }
        }

        updateProgress(groups.length, groups.length, 'Consolidación completada');
        showResults(results);
        logMessage('Consolidación de asistencia completada exitosamente', 'success');
    } catch (error) {
        logMessage(`Error durante la consolidación: ${(error as Error).message}`, 'error');
        console.error(error);
    } finally {
        isProcessing = false;
        updateFileList();
        document.getElementById('processingSection')!.style.display = 'none';
    }
}

// Generar workbook consolidado de un curso (una hoja por módulo)
async function generateCourseWorkbook(group: CourseGroup): Promise<ConsolidatedCourseFile> {
    const workbook = new ExcelJS.Workbook();
    const usedSheetNames = new Set<string>();
    const moduleNames: string[] = [];
    let studentCount = 0;

    // Ordenar módulos alfabéticamente para un resultado determinista
    const sortedModules = [...group.modules].sort((a, b) => a.moduleName.localeCompare(b.moduleName, 'es'));

    for (const mod of sortedModules) {
        const rows = await readAttendanceFile(mod.file);
        const sheetName = uniqueSheetName(sanitizeSheetName(mod.moduleName), usedSheetNames);
        usedSheetNames.add(sheetName.toLowerCase());
        moduleNames.push(sheetName);

        const worksheet = workbook.addWorksheet(sheetName);
        rows.forEach(row => worksheet.addRow(row.length > 0 ? row : ['']));

        // Formato: fila de encabezados en negrita con relleno
        const headerRow = findHeaderRow(rows);
        if (headerRow > 0) {
            const hr = worksheet.getRow(headerRow);
            hr.font = { bold: true };
            hr.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            // Etiquetas de metadatos (Curso/Grupo) en negrita
            for (let r = 1; r < headerRow; r++) {
                worksheet.getRow(r).getCell(1).font = { bold: true };
            }
            studentCount += Math.max(0, rows.length - headerRow);
        }

        autoFitColumns(worksheet, rows);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${group.courseKey}_Asistencias.xlsx`;

    return {
        courseKey: group.courseKey,
        fileName,
        buffer,
        sheetCount: moduleNames.length,
        moduleNames,
        studentCount
    };
}

// Leer un archivo de asistencia preservando toda la estructura de la hoja
// (metadatos Curso/Grupo, fila en blanco, encabezados en fila 4 y datos)
async function readAttendanceFile(file: File): Promise<any[][]> {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error(`No se encontró ninguna hoja en ${file.name}`);
    }

    const rows: any[][] = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        const values: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            values[colNumber - 1] = normalizeCellValue(cell.value);
        });
        rows.push(values);
    });

    return rows;
}

// Normalizar valores de celda de ExcelJS (richText, fórmulas, hipervínculos, fechas)
function normalizeCellValue(value: any): any {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value;
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) {
            return value.richText.map((rt: any) => rt.text).join('');
        }
        if ('text' in value) return value.text;
        if ('result' in value) return normalizeCellValue(value.result);
        if ('error' in value) return '';
        return String(value);
    }
    return value;
}

// Detectar la fila de encabezados (la que contiene "Apellido" en la primera celda)
function findHeaderRow(rows: any[][]): number {
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const firstCell = String(rows[i][0] || '').toLowerCase();
        if (firstCell.includes('apellido')) {
            return i + 1; // 1-indexed para ExcelJS
        }
    }
    return 0;
}

// Autoajustar ancho de columnas según contenido
function autoFitColumns(worksheet: ExcelJS.Worksheet, rows: any[][]) {
    const colCount = Math.max(0, ...rows.map(r => r.length));
    for (let c = 0; c < colCount; c++) {
        let maxLen = 10;
        for (const row of rows) {
            const value = row[c];
            if (value === null || value === undefined || value === '') continue;
            const text = value instanceof Date ? value.toLocaleDateString() : String(value);
            if (text.length > maxLen) maxLen = text.length;
        }
        worksheet.getColumn(c + 1).width = Math.min(maxLen + 2, 50);
    }
}

// Sanitizar nombre de hoja (Excel: sin \ / ? * [ ] : y máx. 31 caracteres)
function sanitizeSheetName(name: string): string {
    const clean = name.replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
    return (clean.substring(0, 31) || 'Hoja');
}

// Garantizar nombre de hoja único dentro del workbook
function uniqueSheetName(base: string, used: Set<string>): string {
    let name = base;
    let i = 2;
    while (used.has(name.toLowerCase())) {
        const suffix = ` (${i++})`;
        name = base.substring(0, 31 - suffix.length) + suffix;
    }
    return name;
}

// Guarda todos los archivos generados en una carpeta elegida por el usuario.
// Usa IPC nativo de Electron (un solo dialog en vez de 30 "Save As").
async function saveAllFiles() {
    if (generatedFiles.length === 0) return;
    if (!window.aprendoAPI?.saveFiles) {
        logMessage('IPC no disponible: no se puede guardar en disco', 'error');
        return;
    }
    logMessage(`Solicitando carpeta para guardar ${generatedFiles.length} archivos...`, 'info');
    try {
        const result = await window.aprendoAPI.saveFiles({
            files: generatedFiles.map(f => ({ name: f.fileName, buffer: f.buffer })),
        });
        if (result.cancelled) {
            logMessage('Guardado cancelado por el usuario', 'warning');
            return;
        }
        if (result.success) {
            logMessage(`Guardados ${result.count} archivos en: ${result.folderPath}`, 'success');
        } else {
            logMessage(`Guardado parcial: ${result.count}/${generatedFiles.length} archivos. Errores: ${(result.errors || []).join('; ')}`, 'error');
        }
    } catch (err) {
        logMessage(`Error guardando archivos: ${(err as Error).message}`, 'error');
    }
}

// Guarda un único archivo generado (el del índice dado) en una carpeta elegida por el usuario.
async function saveSingleFile(index: number) {
    const file = generatedFiles[index];
    if (!file) return;
    if (!window.aprendoAPI?.saveFiles) {
        logMessage('IPC no disponible: no se puede guardar en disco', 'error');
        return;
    }
    logMessage(`Solicitando carpeta para guardar ${file.fileName}...`, 'info');
    try {
        const result = await window.aprendoAPI.saveFiles({
            files: [{ name: file.fileName, buffer: file.buffer }],
        });
        if (result.cancelled) {
            logMessage('Guardado cancelado por el usuario', 'warning');
            return;
        }
        if (result.success) {
            logMessage(`Guardado ${file.fileName} en: ${result.folderPath}`, 'success');
        } else {
            logMessage(`Error guardando ${file.fileName}: ${(result.errors || []).join('; ')}`, 'error');
        }
    } catch (err) {
        logMessage(`Error guardando archivo: ${(err as Error).message}`, 'error');
    }
}

// Actualizar progreso
function updateProgress(current: number, total: number, message: string) {
    const percent = Math.round((current / total) * 100);
    document.getElementById('progressFill')!.style.width = `${percent}%`;
    document.getElementById('progressText')!.textContent = message;
    document.getElementById('progressPercent')!.textContent = `${percent}%`;
}

// Mostrar resultados
function showResults(results: any) {
    const resultsSection = document.getElementById('resultsSection')!;
    const resultsSummary = document.getElementById('resultsSummary')!;
    const downloadArea = document.getElementById('downloadArea')!;

    resultsSection.style.display = 'block';

    resultsSummary.innerHTML = `
        <div class="result-stat">
            <h4>Cursos Consolidados</h4>
            <div class="stat-number">${results.successfulCourses}</div>
        </div>
        <div class="result-stat">
            <h4>Hojas Creadas</h4>
            <div class="stat-number">${results.totalSheets}</div>
        </div>
        <div class="result-stat">
            <h4>Estudiantes (filas)</h4>
            <div class="stat-number">${results.totalStudents.toLocaleString()}</div>
        </div>
        <div class="result-stat">
            <h4>Archivos Generados</h4>
            <div class="stat-number">${generatedFiles.length}</div>
        </div>
    `;

    let downloadHTML = `
        <h3 style="margin-bottom: 15px; color: var(--success-color); font-size: 1.5rem; text-align: center;">
            ¡Asistencia Consolidada Lista!
        </h3>
        <p class="success-message" style="text-align: center; margin: 15px auto; max-width: 600px;">
            ${getIcon('check-circle', 20)} <strong>Consolidación Completada:</strong> cada curso quedó en un solo
            archivo Excel con una hoja por módulo (nombrada con el nombre del módulo).
        </p>
    `;

    if (generatedFiles.length > 1) {
        downloadHTML += `
            <div style="display: flex; justify-content: center; margin: 20px 0;">
                <button class="btn btn-success" onclick="saveAllFiles()">
                    ${getIcon('folder-open', 18)} Guardar todos en una carpeta (${generatedFiles.length})
                </button>
            </div>
            <p class="success-message" style="text-align: center; margin: 0 auto 20px; max-width: 600px; font-size: 0.9em;">
                Se abrirá un único diálogo para elegir la carpeta destino y los ${generatedFiles.length} archivos se guardarán adentro sin abrir más ventanas.
            </p>
        `;
    } else if (generatedFiles.length === 1) {
        downloadHTML += `
            <div style="display: flex; justify-content: center; margin: 20px 0;">
                <button class="btn btn-success" onclick="saveSingleFile(0)">
                    ${getIcon('folder-open', 18)} Guardar archivo
                </button>
            </div>
        `;
    }

    downloadHTML += '<div class="course-downloads">';
    generatedFiles.forEach((file, index) => {
        downloadHTML += `
            <button class="download-btn" onclick="saveSingleFile(${index})" style="border: 0; cursor: pointer; text-align: left;">
                <span class="download-icon">${getIcon('clipboard-list', 24)}</span>
                <div class="download-content">
                    <div class="download-title">${file.courseKey.replace(/_/g, ' ')}</div>
                    <div class="download-subtitle">${file.fileName} &mdash; ${file.sheetCount} hojas: ${file.moduleNames.join(', ')}</div>
                </div>
            </button>
        `;
    });
    downloadHTML += '</div>';

    if (results.failedCourses.length > 0) {
        downloadHTML += `
            <p class="success-message" style="text-align: center; color: var(--danger-color);">
                ${getIcon('alert-triangle', 16)} No se pudieron consolidar: ${results.failedCourses.join(', ')}
            </p>
        `;
    }

    downloadArea.innerHTML = downloadHTML;
}

// Funciones de utilidad
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function logMessage(message: string, type: string = 'info') {
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
    // Scroll automático al último elemento (solo dentro del contenedor)
    logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLog() {
    const logContainer = document.getElementById('logContainer')!;
    logContainer.innerHTML = '';
    logMessage('Log limpiado', 'info');
}
