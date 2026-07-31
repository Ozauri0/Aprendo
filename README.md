# 📚 Aprendo UCT — Sistema de Gestión de Calificaciones

Aplicación de escritorio **Electron + TypeScript** para la gestión de calificaciones, informes y asistencia de la Universidad Católica de Temuco. Automatiza descargas desde la plataforma Aprendo UCT mediante Puppeteer, procesa archivos Excel con ExcelJS y consolida reportes.

> **Electron 42** · **TypeScript 5.6** · **Tests: 75/75** · **Estado: producción**

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 📊 **Consolidar Calificaciones** | Importa hasta 60 archivos Excel, aplica filtros de email/RUT y genera un Excel consolidado |
| 📋 **Consolidar Informes** | Agrupa logs de participación en un Excel (hojas separadas o única) |
| 📅 **Consolidar Asistencia** | Agrupa archivos por curso, genera un Excel por curso con una hoja por módulo |
| 📥 **Gestor de Descargas** | Login automático en Aprendo UCT, descarga masiva de notas/logs/asistencia vía Puppeteer |
| ⚙️ **Configuración** | Filtros de usuarios, preferencias, diagnóstico del sistema |
| 🌙 **Tema oscuro/claro** | Soporte completo con variables CSS |
| 🔄 **Auto-Update** | Detecta nuevas versiones en GitHub Releases, descarga e instala automáticamente |

---

## 🚀 Inicio Rápido

```bash
git clone https://github.com/Ozauri0/Aprendo.git
cd Aprendo
npm install
npm run dev
```

---

## 🛠️ Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Compila TypeScript + inicia la app en modo desarrollo |
| `npm run build` | Compila TypeScript + copia assets a `dist/` |
| `npm run dist` | Build + empaqueta `.exe` para Windows + publica en GitHub Releases |
| `npm test` | Ejecuta 75 tests unitarios con Jest |
| `npx electron-builder --win` | Solo empaqueta el `.exe` (sin publicar) |

### Publicar una actualización

```bash
# 1. Autenticarse con GitHub CLI (solo la primera vez)
gh auth login

# 2. Subir versión en package.json

# 3. Build + publicar en GitHub Releases
npm run dist
```

La app detecta automáticamente nuevas versiones al abrirse y muestra un modal con el changelog.

---

## 🧱 Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| **Electron 42** | Framework de escritorio |
| **TypeScript 5.6** | Lenguaje (ES2021, CommonJS) |
| **ExcelJS 4.4** | Lectura/escritura de Excel |
| **Puppeteer 24** | Automatización de navegador para descargas |
| **electron-updater** | Auto-update desde GitHub Releases |
| **Jest + ts-jest** | Tests unitarios (75 tests) |
| **electron-builder** | Empaquetado NSIS para Windows |

---

## 📁 Estructura del Proyecto

```
src/
├── main/                       # Proceso principal de Electron
│   ├── main.ts                 # Ventana, IPC, seguridad
│   ├── download-manager.ts     # Puppeteer: login, descargas
│   ├── updater.ts              # Auto-update desde GitHub Releases
│   └── logger.ts               # Logging a archivo
├── preload/
│   └── preload.ts              # Puente IPC main ↔ renderer
├── renderer/                   # UI (SPA con hash router)
│   ├── renderer.ts             # Entry point + router
│   ├── calificaciones.ts       # Consolidación de calificaciones
│   ├── informes.ts             # Consolidación de informes/logs
│   ├── asistencia.ts           # Consolidación de asistencia
│   ├── descargas.ts            # UI del gestor de descargas
│   ├── config.ts               # Configuración y filtros
│   ├── icons.ts                # Íconos SVG (Lucide)
│   ├── shared-utils.ts         # Utilidades compartidas
│   ├── components/
│   │   ├── header.ts           # Header reutilizable
│   │   ├── footer.ts           # Footer reutilizable
│   │   ├── title-bar.ts        # Barra de título custom
│   │   └── update-dialog.ts    # Modal de actualización
│   ├── styles/                 # CSS con variables y tema oscuro
│   └── assets/                 # Logo, fuentes
└── shared/
    ├── types.ts                # Tipos para IPC
    └── filter-engine.ts        # Motor de filtrado (email/RUT)

tests/                          # Tests unitarios (Jest)
├── filter-engine.test.ts       # 48 tests del motor de filtrado
├── shared-utils.test.ts        # 14 tests de utilidades
└── asistencia-parser.test.ts   # 13 tests de parseo de asistencia
```

---

## 🔒 Seguridad

- `contextIsolation: false` + `nodeIntegration: true` (en proceso de migración a bundler)
- `webSecurity: true` con CSP habilitado
- Puppeteer solo corre en el main process (nunca en el renderer)
- Comunicación main ↔ renderer exclusivamente vía IPC
- Fuentes Inter embebidas como data URIs (offline, sin dependencias externas)

---

## 🧪 Tests

```bash
npm test                 # 75 tests, 3 suites
```

| Suite | Tests | Cobertura |
|-------|-------|-----------|
| `filter-engine` | 48 | `normalizeRut`, `validateRut`, `validateEmail`, `findColumns`, `matchesFilter`, `applyFilters` |
| `shared-utils` | 14 | `formatFileSize`, `logMessage`, `clearLog`, `updateProgress` |
| `asistencia-parser` | 13 | `parseAttendanceFileName`, `groupFilesByCourse` |

---

## 🐛 Solución de Problemas

### La app no inicia / pantalla en blanco

```bash
rm -rf dist node_modules
npm install
npm run build
npm run dev
```

### Puppeteer no encuentra navegador

La app busca Chrome → Edge → Brave en el sistema. Si no hay ninguno, descarga Chromium automáticamente. Requiere **Visual C++ Redistributable x64**.

### Error de login en Aprendo UCT

Verifica que las credenciales sean correctas. Revisa los logs en **Configuración → Diagnóstico**.

---

## 📄 Licencia

ISC — Uso interno Universidad Católica de Temuco.

---

<div align="center">

**Hecho por [Christian Ferrer](https://christianferrer.me)**

</div>
