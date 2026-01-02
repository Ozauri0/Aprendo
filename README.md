# 📚 Aprendo - Sistema de Gestión de Calificaciones (Legado)

Este proyecto ha sido marcado como **legado** y su desarrollo ha concluido. Una nueva versión mejorada está disponible en la rama `main`.

---

## ℹ️ Información del Proyecto

- **Estado**: Desarrollo finalizado
- **Versión actual**: v0.1.0 (última versión de esta rama)
- **Nueva versión**: Disponible en la rama `main`

---

## 🚀 Nueva Versión

La nueva versión incluye mejoras significativas en rendimiento, diseño y funcionalidad. Para acceder a la nueva versión, cambia a la rama `main`:

```bash
# Cambiar a la rama main
git checkout main
```

---

## 📄 Documentación Original

A continuación, se mantiene la documentación original de este proyecto para referencia histórica:

---

# 📚 Aprendo - Sistema de Gestión de Calificaciones

Aplicación desarrollada en Electron, moderna para procesar calificaciones y consolidar informes

![Electron](https://img.shields.io/badge/electron-Latest-blue)
![Status](https://img.shields.io/badge/status-Development-yellow)

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
├── 📄 informes.html           # Página de informes
├── 📄 components.html         # Guía de componentes
│
├── 🎨 styles.css             # Estilos principales
├── 🎨 global-styles.css      # Utilidades y extras
├── 🎨 calificaciones.css     # Estilos específicos (reservado)
├── 🎨 informes.css           # Estilos específicos (reservado)
│
├── 📜 main.js                # Proceso principal de Electron
├── 📜 renderer.js            # Renderer de la página principal
├── 📜 calificaciones.js      # Lógica de calificaciones
├── 📜 informes.js            # Lógica de informes
├── 📜 start-electron.js      # Script de inicio
│
└── 📦 package.json           # Dependencias y scripts
```

---

## 🎯 Uso

### 1. Página Principal

Accede a las diferentes funcionalidades:
- **Procesar Calificaciones**: Importa y procesa archivos Excel
- **Consolidar Informes**: Consolida logs y reportes
- **Configuración**: Configura filtros para eliminación de academicos/ayudantes de la consolidación de notas. 

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

### 4. Descargar notas

1. Haz clic en "Gestor de Descargas"
2. Inicia sesión con tus credenciales de la plataforma APRENDO
3. Selecciona el rango de id's de cursos para iniciar la descarga masiva
4. Haz clic en Comenzar Descargas
---


## 🧪 Testing

```bash
# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

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

## 📄 Licencia

Este proyecto es privado y de uso interno.

---

## 👨‍💻 Autor

**Christian Ferrer**

---

<div align="center">

**Hecho con ❤️ para la gestión eficiente de calificaciones**

[⬆ Volver arriba](#-aprendo---sistema-de-gestión-de-calificaciones)

</div>
