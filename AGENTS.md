# AGENTS.md - Aprendo UCT

## Información para Agentes de Código

### Descripción del Proyecto
Aplicación de escritorio en **Electron + TypeScript** para la gestión de calificaciones e informes de la Universidad Católica de Temuco (UCT). Procesa archivos Excel, consolida informes y automatiza descargas desde la plataforma Aprendo UCT mediante Puppeteer.

### Stack Tecnológico
- **Electron**: Framework de aplicaciones de escritorio (v38+)
- **TypeScript**: Lógica de la aplicación (target ES2021, module CommonJS)
- **ExcelJS**: Procesamiento de archivos Excel
- **Puppeteer**: Automatización de descargas desde Aprendo UCT
- **XLSX.js**: Soporte adicional para Excel (bundled en assets)

### Arquitectura
```
src/
├── main/           # Proceso principal de Electron
│   ├── main.ts     # Entry point de Electron (ventana, seguridad, IPC)
│   └── download-manager.ts  # Lógica Puppeteer (main process)
├── preload/        # Script de preload (puente seguro main <-> renderer)
│   └── preload.ts
├── renderer/       # UI y lógica de frontend
│   ├── renderer.ts         # Entry point SPA + router
│   ├── calificaciones.ts   # Procesamiento de calificaciones
│   ├── informes.ts         # Consolidación de informes/logs
│   ├── asistencia.ts       # Consolidación de asistencia (1 archivo por curso, hoja por módulo)
│   ├── descargas.ts        # UI de descargas (usa IPC, NO Puppeteer directo)
│   ├── config.ts           # Sistema de filtros y preferencias
│   ├── icons.ts            # SVG icons inline (Lucide)
│   ├── components/
│   │   └── header.ts       # Componente de header reutilizable
│   ├── styles/             # CSS con variables CSS y tema oscuro
│   ├── pages/              # HTML base (la app es SPA desde index.html)
│   └── assets/
├── shared/
│   ├── types.ts            # Tipos compartidos para IPC
│   └── filter-engine.ts    # Motor de filtrado puro (sin DOM)
```

### Seguridad Electron (IMPORTANTE)
La configuración de `main.ts` usa:
- `contextIsolation: false` (contextos aislados — ⚠️ en proceso de migración: actualmente false porque nodeIntegration: true requiere acceso directo a require; la meta es activar contextIsolation: true + desactivar nodeIntegration cuando se migre a bundler)
- `nodeIntegration: true` (TEMPORALMENTE activado para compatibilidad con código existente)

### Rutas del sistema (sin idioma hardcodeado)
Cualquier ruta que dependa del usuario o del sistema se resuelve con APIs nativas de Node/Electron — **nunca** con `os.homedir() + 'Downloads'` ni con strings tipo `C:\\Users\\...`:
- Carpeta de descargas: `app.getPath('downloads')` (Electron resuelve correctamente a `Downloads`/`Descargas`/`Téléchargements`/`ダウンロード` según el idioma del SO).
- Helper centralizado: `getDefaultDownloadPath()` en `src/main/download-manager.ts` retorna `<downloads>/Aprendo_Export` y crea la subcarpeta si no existe.
- Paths internos de la app: `path.join(__dirname, ...)` (siempre relativos al archivo compilado, sin asumir layout del sistema).

### Fuentes web (offline, sin dependencia de internet)
Las fuentes Inter están **embebidas como data URIs en base64 dentro de `global-styles.css`** (no se cargan de Google Fonts en runtime). Esto garantiza que la UI se vea idéntica en cualquier PC — con o sin internet, en cualquier idioma del SO, dentro o fuera de un `app.asar`. Tamaño del CSS: ~100 KB.
- **Si se actualizan las fuentes**: regenerar el CSS con el script PowerShell que reemplaza las URLs por data URIs. La carpeta `src/renderer/assets/fonts/` contiene los `.woff2` originales (referencia).
- **Por qué no usar archivos externos**: en una app empaquetada con `app.asar`, las URLs relativas tipo `url('../assets/fonts/x.woff2')` se resuelven contra la URL del **HTML**, no del CSS, lo que rompe la ruta y el navegador retorna 404. La solución data: URI es 100% autocontenida.

### Empaquetado Windows (electron-builder)
El `package.json` declara `asarUnpack` para que ciertos archivos se desempaqueten del `app.asar` y sean servibles por el protocolo `file://`:
- `**/node_modules/puppeteer*/**` y `**/node_modules/@puppeteer/**` — los binarios nativos de Puppeteer no funcionan desde asar.
- `**/dist/renderer/assets/fonts/**` — fallback por si se decide usar fuentes externas en el futuro (no necesario actualmente porque van embebidas en el CSS).
**Build**: `npm run dist:win` → instalador en `release/Aprendo Setup <version>.exe` y portable en `release/win-unpacked/`. La versión se toma de `package.json` y se refleja mediante `app.getVersion()`.

### Diagnóstico de problemas en PC "limpio"
Si el login no responde o la UI se ve rota en un PC sin muchas dependencias instaladas:
1. **Visual C++ Redistributable x64** es requisito para que Chromium (Puppeteer) arranque. Si no está, el `await puppeteer.launch()` falla. La app ahora muestra el error en el log del renderer.
2. **SmartScreen / Antivirus** pueden bloquear binarios sin firma digital. En el primer arranque, elegir "Más información → Ejecutar de todas formas".
3. **Errores de Chromium** se loguean en el main process (visible con `console.log` desde devtools si `--remote-debugging-port=NNNN` está activo).
- `webSecurity: true` (CSP y Same-Origin habilitados)
- `preload` script activo

**Regla de oro**: Puppeteer NUNCA debe correr en el renderer. Ya está migrado a `src/main/download-manager.ts` y se comunica vía IPC.

### Build y Scripts
```bash
# Instalar dependencias
npm install

# Compilar TypeScript + copiar assets
npm run build

# Ejecutar en modo desarrollo
npm run dev

# Empaquetar para producción (cross-platform)
npm run build
npx electron-builder
```

**Nota**: `electron-builder` usa el directorio `release/` como output (NO `dist/`, que es el outDir de TypeScript).

### Convenciones de Código
- Usar `import` en vez de `require()` para módulos propios (icons, components, etc.)
- No agregar `@ts-nocheck` en archivos nuevos; tipar funciones clave
- Las funciones de utilidad repetidas (toggleTheme, goBack) deben centralizarse eventualmente
- Los estilos usan variables CSS con prefijo `--uct-` y soporte de tema oscuro via `data-theme="dark"`

### Patrones de IPC
El preload expone `window.aprendoAPI` con métodos seguros:
- `window.aprendoAPI.loginAprendo(user, pass)` -> main inicia sesión con Puppeteer
- `window.aprendoAPI.startDownloads({ startId, endId, downloadPath })` -> descarga de notas (Excel)
- `window.aprendoAPI.startLogDownloads({ startId, endId, downloadPath })` -> descarga de logs de participación (Excel)
- `window.aprendoAPI.startAttendanceDownloads({ startId, endId, downloadPath, attendanceFilter? })` -> descarga de asistencia (Excel)
- `window.aprendoAPI.stopDownloads()` -> detiene cualquier descarga en curso
- `window.aprendoAPI.saveFiles({ files: [{name, buffer}, ...] })` -> abre un `showOpenDialog` (openDirectory) y escribe los buffers en la carpeta elegida. Usado por el módulo de asistencia para evitar N dialogs de "Save As".
- `window.aprendoAPI.onDownloadLog(callback)` / `onDownloadStatus(callback)`

### Flujo de Descargas
1. **Notas**: Navega a `grade/export/xls/index.php?id={id}`, hace clic en `#id_submitbutton`, descarga Excel vía CDP.
2. **Logs de participación**: Navega a `report/log/index.php?chooselog=1&showusers=0&showcourses=0&id={id}&group=&user=&date=&modid=&modaction=c&origin=&edulevel=2&logreader=logstore_standard` (parámetros: `modaction=c`=Crear, `edulevel=2`=Todos los recursos participando, resto vacío=Todos), busca botón "Descargar" y descarga Excel vía CDP. Archivos se renombran a `PAT_XXXX Logs.xlsx`.
3. **Asistencia**: Para cada ID, visita `course/view.php?id={id}`, busca TODOS los enlaces `/mod/attendance/view.php`, extrae el `attendanceId` de cada uno, navega a `mod/attendance/export.php?id={attendanceId}`, hace clic en `#id_submitbutton` (OK), descarga Excel vía CDP. Archivos se renombran a `PAT_XXXX Asistencia {nombre_modulo}.xlsx`. El usuario puede filtrar módulos por palabra clave (campo "Filtrar Asistencia", separado por comas, guardado en `localStorage.aprendo_attendance_filter`).

### Modo de Consolidación Unificado (Configuración y Módulos)
Configuración centralizada en **Configuración** (`consolidationMode`, opciones: `separate`, `course_single`, `single`, persistido en `localStorage.aprendo_user_filters_config` y sincronizado con `attendanceConsolidationMode`, expuesto via `configFilters.getConsolidationMode()` y `configFilters.getAttendanceConsolidationMode()`):
Afecta a los tres módulos de consolidación:
1. **`separate` (Hojas Separadas - default):**
   - **Calificaciones**: Un archivo consolidado (`Calificaciones_Consolidadas_YYYY-MM-DD.xlsx`) con una hoja por cada curso.
   - **Informes/Logs**: Un archivo consolidado (`Logs_Consolidados_YYYY-MM-DD.xlsx`) con una hoja por cada archivo de log.
   - **Asistencia**: Un archivo por curso (`PAT_YYYY_NN_Asistencias.xlsx`) con una hoja por módulo de asistencia.
2. **`course_single` (Misma Hoja por Curso):**
   - **Calificaciones**: Una hoja por curso dentro del archivo consolidado.
   - **Informes/Logs**: Una hoja por archivo/curso dentro del archivo consolidado.
   - **Asistencia**: Un archivo por curso con todos sus módulos apilados en una sola hoja (`generateCourseWorkbookSingleSheet()`).
3. **`single` (Hoja Única - Todo en una Hoja):**
   - **Calificaciones**: Un archivo consolidado con **una sola hoja** (`Calificaciones Consolidadas`), donde todos los alumnos de todos los cursos están integrados en una sola tabla continua con la columna `Curso` al inicio.
   - **Informes/Logs**: Un archivo consolidado con **una sola hoja** (`Datos Consolidados`), donde todos los registros de todos los archivos están integrados en una sola tabla continua con columnas `Curso` y `Archivo Origen`.
   - **Asistencia**: Un único archivo consolidado (`Asistencias_Consolidadas.xlsx`) con **una sola hoja**, donde todos los cursos y módulos están apilados verticalmente (`generateAllInOneWorkbook()`).

### Módulo Consolidar Asistencia (`asistencia.ts`)
Consolida los Excel de asistencia (varios módulos por curso) según el modo de consolidación configurado.
Helpers compartidos de los modos apilados: `appendBlock()` (agrega bloque + formato negrita/relleno), `trimTrailingEmptyRows()` (recorta filas vacías finales del export de Moodle), `attendanceModeLabel()`.

1. Parsea nombres tipo `PAT_2026_01_Asistencias Asistencia {MODULO}.xlsx` → curso `PAT_2026_01` + módulo `{MODULO}` (también acepta `PAT_01 Asistencia {MODULO}`; sin patrón → grupo `Sin_Curso`). Ojo: usar `(?!\d)` y no `\b` en el regex del curso porque `_` es carácter de palabra.
2. Agrupa por curso (ordenado por número), módulos ordenados alfabéticamente (`localeCompare 'es'`).
3. Cada hoja preserva la estructura completa del export de Moodle: metadatos (Curso/Grupo filas 1-2), encabezados en fila 4 (negrita + relleno), datos desde fila 5. Nombre de hoja = nombre del módulo (sanitizado, máx. 31 chars, deduplicado).
4. Genera los archivos correspondientes según el modo (`PAT_2026_XX_Asistencias.xlsx` o `Asistencias_Consolidadas.xlsx`).

**Patrón de descarga (sin saturar el PC):** como este módulo produce muchos archivos (uno por curso), NO usa `<a download>` con blob URLs (eso disparaba un "Save As" / Explorer por archivo). En su lugar, el botón "Guardar todos en una carpeta" invoca el IPC **`files:save-batch`** (`window.aprendoAPI.saveFiles`) que en el main process abre **un único** `dialog.showOpenDialog({properties:['openDirectory','createDirectory']})` y escribe todos los buffers directamente con `fs.promises.writeFile`. El usuario ve UN solo dialog y todos los archivos quedan en la carpeta elegida. Los botones individuales por curso usan el mismo IPC con un solo archivo (un dialog por click intencional).
- IPC registrado en `src/main/main.ts` (`registerBatchSaveHandler`), tipos en `src/shared/types.ts` (`BatchSaveArgs` / `BatchSaveResult`), expuesto en `src/preload/preload.ts` (`saveFiles`).
- Ruta SPA: `#asistencia`; estilos propios en `styles/asistencia.css` (resto reutiliza `styles.css`).

### Fila de Identificación de Sección en Consolidación
Configuración en **Configuración** (`includeSectionHeader`, default `true`, persistido en `localStorage.aprendo_user_filters_config` y expuesto via `configFilters.getIncludeSectionHeader()`):
- Cuando está activada, crea una primera fila al principio del archivo/hoja indicando la sección (ej: `PAT_2026_01_Calificaciones`, `PAT_2026_01_Logs`, `PAT_2026_01_Asistencias`).
- Helper centralizado: `formatSectionHeaderName(input, type)` en `shared-utils.ts`.
- Módulos soportados:
  1. **Calificaciones**: Fila 1 con `[PAT_YYYY_NN_Calificaciones]` en negrita; encabezados de columnas pasan a fila 2 (negrita + relleno gris).
  2. **Informes/Logs**: En modo hojas separadas, fila 1 con `[PAT_YYYY_NN_Logs]`; en modo hoja única, fila 1 con el encabezado de sección o `[Logs_Consolidados]`.
  3. **Asistencia**: En modo hojas separadas y modo hoja por curso, fila 1 con `[PAT_YYYY_NN_Asistencias]`; en modo todo en una hoja, título del curso como `PAT_YYYY_NN_Asistencias`.

### Columna de Curso al Inicio por Alumno
En todos los archivos consolidados se añade la columna **`Curso`** como la **primera columna** (columna A, antes del nombre/apellido del alumno):
- Helper: `extractCourseKey(input)` en `shared-utils.ts` (retorna ej. `PAT_2026_01`, `PAT_01`, `Curso_01`).
- **Calificaciones**: Columna 1 `Curso` con el identificador del curso para cada alumno, seguida de las columnas de Moodle (`Nombre`, `Apellido`, etc.).
- **Asistencia**: Encabezado con `Curso` antes de `Apellido`/`Nombre` y cada fila de alumno con el valor del curso al que pertenece en todos los modos de consolidación (`separate`, `course_single`, `all_single`).
- **Informes/Logs**: Columna 1 `Curso` con el identificador del curso correspondiente a cada registro de actividad.

### Estado de Migración
- [x] Preload con rutas correctas
- [x] Puppeteer movido a main process
- [x] Seguridad de Electron mejorada (contextIsolation + webSecurity)
- [x] Código TypeScript limpio de `@ts-nocheck`
- [x] Funciones duplicadas centralizadas en `shared-utils.ts` (toggleTheme, formatFileSize, logMessage, updateProgress, clearLog)
- [x] Hardcodeos `PAT_2025_` reemplazados por regex genéricos `\d{4}`
- [x] Puppeteer removido del warmup del renderer (solo corre en main)
- [ ] `nodeIntegration: true` aún activo (pendiente migrar renderer a bundler o ES modules para poder desactivarlo)
