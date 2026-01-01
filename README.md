# 📚 Aprendo - Sistema de Gestión de Calificaciones

> Aplicación Electron moderna para procesar calificaciones y consolidar informes

![Version](https://img.shields.io/badge/version-0.2.0-blue)
![Electron](https://img.shields.io/badge/electron-latest-brightgreen)
![Status](https://img.shields.io/badge/status-production-success)

---

## ✨ Características

- 📊 **Procesar Calificaciones**: Importa y procesa hasta 60 archivos Excel de calificaciones
- 📈 **Consolidar Informes**: Consolida archivos de logs/informes de actividad en un Excel
- 🎨 **Diseño Moderno**: Interfaz elegante, minimalista y profesional
- 📱 **Responsive**: Se adapta a cualquier tamaño de pantalla
- ♿ **Accesible**: Cumple con estándares WCAG
- 🚀 **Rápido**: Procesamiento eficiente de archivos

---

## 🚀 Inicio Rápido

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>

# Instalar dependencias
npm install

# Ejecutar la aplicación
npm start
```

---

## 📱 Capturas de Pantalla

### Página Principal
- Dashboard con acceso a todas las funcionalidades
- Estado del sistema en tiempo real
- Diseño limpio y profesional

### Procesar Calificaciones
- Área de carga drag & drop
- Visualización de archivos seleccionados
- Barra de progreso en tiempo real
- Logs detallados del proceso
- Descarga de resultados

### Consolidar Informes
- Misma experiencia que Calificaciones
- Interfaz consistente y familiar
- Procesamiento eficiente

---

## 🎨 Sistema de Diseño

La aplicación cuenta con un **sistema de diseño completo** y documentado.

### Documentación Disponible:

| Archivo | Descripción |
|---------|-------------|
| **`QUICK-START.md`** | Guía rápida para empezar |
| **`DESIGN.md`** | Sistema de diseño completo |
| **`README-CHANGES.md`** | Registro de cambios detallado |
| **`BEFORE-AFTER.md`** | Comparación antes/después |
| **`components.html`** | Guía visual de componentes |
| **`SUMMARY.md`** | Resumen ejecutivo |

### Paleta de Colores:

```css
Primario:    #2563eb  /* Azul profesional */
Secundario:  #64748b  /* Gris pizarra */
Éxito:       #10b981  /* Verde esmeralda */
Peligro:     #ef4444  /* Rojo vibrante */
Advertencia: #f59e0b  /* Naranja */
```

### Ver Componentes:

Abre `components.html` en tu navegador para ver todos los componentes disponibles y ejemplos de uso.

---

## 🛠️ Tecnologías

- **Electron** - Framework de aplicaciones de escritorio
- **HTML5/CSS3** - Interfaz de usuario moderna
- **JavaScript** - Lógica de la aplicación
- **XLSX.js** - Procesamiento de archivos Excel

---

## 📁 Estructura del Proyecto

```
aprendo/
├── 📄 index.html              # Página principal
├── 📄 calificaciones.html     # Página de calificaciones
├── 📄 informes.html          # Página de informes
├── 📄 components.html        # Guía de componentes
│
├── 🎨 styles.css             # Estilos principales
├── 🎨 global-styles.css      # Utilidades y extras
├── 🎨 calificaciones.css     # Estilos específicos (reservado)
├── 🎨 informes.css          # Estilos específicos (reservado)
│
├── 📜 main.js                # Proceso principal de Electron
├── 📜 renderer.js            # Renderer de la página principal
├── 📜 calificaciones.js      # Lógica de calificaciones
├── 📜 informes.js           # Lógica de informes
├── 📜 start-electron.js      # Script de inicio
│
├── 📚 DESIGN.md              # Documentación de diseño
├── 📚 README-CHANGES.md      # Registro de cambios
├── 📚 BEFORE-AFTER.md        # Comparación visual
├── 📚 QUICK-START.md         # Guía rápida
├── 📚 SUMMARY.md             # Resumen ejecutivo
│
└── 📦 package.json           # Dependencias y scripts
```

---

## 🎯 Uso

### 1. Página Principal

Accede a las diferentes funcionalidades:
- **Procesar Calificaciones**: Importa y procesa archivos Excel
- **Consolidar Informes**: Consolida logs y reportes
- **Configuración**: (Próximamente)

### 2. Procesar Calificaciones

1. Haz clic en "Abrir Calificaciones"
2. Arrastra archivos Excel o haz clic para seleccionar
3. Mínimo 2 archivos requeridos (máximo 60)
4. Haz clic en "Procesar Archivos"
5. Observa el progreso en tiempo real
6. Descarga los resultados

### 3. Consolidar Informes

Similar a Procesar Calificaciones:
1. Haz clic en "Consolidar Informes"
2. Selecciona archivos Excel
3. Procesa y descarga resultados

---

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --primary-color: #2563eb;    /* Cambia esto */
    --secondary-color: #64748b;  /* Y esto */
    /* ... más variables ... */
}
```

### Agregar Nuevos Componentes

1. Revisa `components.html` para ver ejemplos
2. Usa las clases CSS existentes
3. Mantén la consistencia con el diseño actual

---

## 🧪 Testing

```bash
# Ejecutar en modo desarrollo
npm start

# Construir para producción
npm run build
```

---

## 📈 Roadmap

### Versión Actual (v0.2.0)
- ✅ Diseño moderno y minimalista
- ✅ Consistencia total entre páginas
- ✅ Sistema de diseño documentado
- ✅ Responsive design
- ✅ Accesibilidad mejorada

### Próximas Versiones
- [ ] Modo oscuro/claro toggle
- [ ] Configuración personalizable
- [ ] Exportar a múltiples formatos
- [ ] Historial de procesamiento
- [ ] Estadísticas y gráficos
- [ ] Soporte para más formatos de archivo

---

## 🐛 Solución de Problemas

### La aplicación no inicia
```bash
# Reinstalar dependencias
rm -rf node_modules
npm install
npm start
```

### Los estilos no se aplican
Verifica que los archivos CSS estén en la ubicación correcta y los links en HTML sean correctos.

### Errores al procesar archivos
- Verifica que los archivos Excel no estén corruptos
- Asegúrate de tener al menos 2 archivos
- Revisa los logs para más detalles

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Estilo

- Usa las variables CSS existentes
- Mantén la consistencia con el diseño actual
- Documenta tus cambios
- Sigue las convenciones de código

---

## 📄 Licencia

Este proyecto es privado y de uso interno.

---

## 👨‍💻 Autor

**Christian Ferrer**

---

## 📞 Soporte

Para soporte o preguntas:

1. Revisa la documentación en `/docs`
2. Abre un issue en el repositorio
3. Contacta al desarrollador

---

## 🎉 Agradecimientos

- Diseño inspirado en las mejores prácticas de UI/UX
- Sistema de colores basado en Tailwind CSS
- Iconos de emoji para una interfaz amigable

---

## 📝 Changelog

### v0.2.0 (Octubre 2025)
- ✨ Rediseño completo de la interfaz
- ✨ Sistema de diseño unificado
- ✨ Consistencia total entre páginas
- ✨ Documentación completa
- ✨ Responsive design mejorado
- ✨ Accesibilidad WCAG

### v0.1.0 (Inicial)
- 🎉 Versión inicial
- 📊 Procesamiento de calificaciones
- 📈 Consolidación de informes

---

## 🔗 Enlaces Útiles

- [Documentación Completa](./DESIGN.md)
- [Guía Rápida](./QUICK-START.md)
- [Componentes Visuales](./components.html)
- [Registro de Cambios](./README-CHANGES.md)

---

<div align="center">

**Hecho con ❤️ para la gestión eficiente de calificaciones**

[⬆ Volver arriba](#-aprendo---sistema-de-gestión-de-calificaciones)

</div>
