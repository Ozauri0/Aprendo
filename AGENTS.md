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
- `contextIsolation: true` (contextos aislados entre main y renderer)
- `nodeIntegration: true` (TEMPORALMENTE activado para compatibilidad con código existente)
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
- `window.aprendoAPI.stopDownloads()` -> detiene cualquier descarga en curso
- `window.aprendoAPI.onDownloadLog(callback)` / `onDownloadStatus(callback)`

### Flujo de Descargas
1. **Notas**: Navega a `grade/export/xls/index.php?id={id}`, hace clic en `#id_submitbutton`, descarga Excel vía CDP.
2. **Logs de participación**: Navega a `report/log/index.php?chooselog=1&showusers=0&showcourses=0&id={id}&group=&user=&date=&modid=&modaction=c&origin=&edulevel=2&logreader=logstore_standard` (parámetros: `modaction=c`=Crear, `edulevel=2`=Todos los recursos participando, resto vacío=Todos), busca enlace de descarga Excel en la página de resultados, hace clic y descarga vía CDP.

### Estado de Migración
- [x] Preload con rutas correctas
- [x] Puppeteer movido a main process
- [x] Seguridad de Electron mejorada (contextIsolation + webSecurity)
- [x] Código TypeScript limpio de `@ts-nocheck`
- [ ] `nodeIntegration: true` aún activo (pendiente migrar renderer a bundler o ES modules para poder desactivarlo)
- [ ] Eliminar código duplicado (toggleTheme, goBack) en múltiples archivos renderer
