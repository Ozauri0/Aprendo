// update-dialog.ts — Modal de actualización (nueva versión, progreso, changelog)
// Se inyecta como HTML directamente; no usa React ni frameworks.

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

let updateDialog: HTMLDivElement | null = null;
let userDismissed = false;

/**
 * Muestra el modal: "Nueva versión disponible" con changelog.
 */
export function showUpdateAvailable(info: UpdateInfo, onUpdate: () => void, onDismiss: () => void): void {
  if (userDismissed) return;
  removeDialog();

  const versionActual = 'v1.3.1'; // Se podría obtener del package.json
  const releaseNotesHtml = formatReleaseNotes(info.releaseNotes);

  updateDialog = createModal(`
    <div class="update-dialog">
      <div class="update-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        </svg>
      </div>
      <h2>¡Nueva versión disponible!</h2>
      <div class="update-versions">
        <span class="version-old">${versionActual}</span>
        <span class="version-arrow">→</span>
        <span class="version-new">v${info.version}</span>
      </div>
      ${info.releaseDate ? `<p class="update-date">Publicada: ${new Date(info.releaseDate).toLocaleDateString('es-CL')}</p>` : ''}
      ${releaseNotesHtml ? `<div class="update-changelog"><h3>¿Qué incluye esta versión?</h3>${releaseNotesHtml}</div>` : ''}
      <div class="update-actions">
        <button class="btn btn-primary" id="updateBtn">Actualizar ahora</button>
        <button class="btn btn-secondary" id="updateDismissBtn">Más tarde</button>
      </div>
    </div>
  `);

  document.body.appendChild(updateDialog);

  document.getElementById('updateBtn')!.onclick = () => {
    removeDialog();
    onUpdate();
  };

  document.getElementById('updateDismissBtn')!.onclick = () => {
    userDismissed = true;
    removeDialog();
    onDismiss();
  };
}

/**
 * Muestra barra de progreso de descarga.
 */
export function showUpdateProgress(progress: UpdateProgress, onCancel: () => void): void {
  if (userDismissed) return;
  removeDialog();

  const mbDownloaded = (progress.transferred / 1024 / 1024).toFixed(1);
  const mbTotal = (progress.total / 1024 / 1024).toFixed(1);
  const speed = progress.bytesPerSecond > 0
    ? `${(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
    : 'Calculando...';

  updateDialog = createModal(`
    <div class="update-dialog">
      <div class="update-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        </svg>
      </div>
      <h2>Descargando actualización...</h2>
      <div class="update-progress-bar">
        <div class="update-progress-fill" style="width:${progress.percent.toFixed(0)}%"></div>
      </div>
      <div class="update-progress-stats">
        <span>${progress.percent.toFixed(0)}%</span>
        <span>${mbDownloaded} / ${mbTotal} MB</span>
        <span>${speed}</span>
      </div>
      <div class="update-actions">
        <button class="btn btn-secondary" id="updateCancelBtn">Cancelar</button>
      </div>
    </div>
  `);

  document.body.appendChild(updateDialog);

  document.getElementById('updateCancelBtn')!.onclick = () => {
    userDismissed = true;
    removeDialog();
    onCancel();
  };
}

/**
 * Muestra modal: "Descarga completada. ¿Reiniciar?"
 */
export function showUpdateReady(version: string, onInstall: () => void): void {
  if (userDismissed) return;
  removeDialog();

  updateDialog = createModal(`
    <div class="update-dialog">
      <div class="update-icon" style="color: var(--success-color);">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
        </svg>
      </div>
      <h2>¡Actualización lista!</h2>
      <p>La versión <strong>v${version}</strong> se instalará al reiniciar la app.</p>
      <div class="update-actions">
        <button class="btn btn-primary" id="updateInstallBtn">Reiniciar ahora</button>
      </div>
    </div>
  `);

  document.body.appendChild(updateDialog);

  document.getElementById('updateInstallBtn')!.onclick = () => {
    onInstall();
  };
}

// ================= HELPERS =================

function createModal(innerHtml: string): HTMLDivElement {
  const modal = document.createElement('div');
  modal.className = 'update-modal-overlay';
  modal.innerHTML = innerHtml;
  modal.onclick = (e) => {
    if (e.target === modal) {
      // No cerrar al hacer clic fuera — el usuario debe elegir
    }
  };
  return modal;
}

function removeDialog(): void {
  if (updateDialog) {
    updateDialog.remove();
    updateDialog = null;
  }
}

function formatReleaseNotes(notes?: string): string {
  if (!notes) return '';
  // Convierte markdown simple a HTML (negrita, listas, links)
  return notes
    .replace(/### (.+)/g, '<h4>$1</h4>')
    .replace(/## (.+)/g, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (.+)/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}
