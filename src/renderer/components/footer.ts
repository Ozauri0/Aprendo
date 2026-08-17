// footer.ts - Componente de footer reutilizable
import { getIcon } from '../icons';

/**
 * Genera el HTML del footer para cualquier página.
 * Versión unificada con brand UCT y crédito del desarrollador.
 */
export function renderFooter(): string {
    return `
        <footer role="contentinfo">
            <div class="footer-brand">
                <span>Universidad Católica de Temuco</span>
            </div>
            <div class="footer-divider"></div>
            <p>Aprendo UCT v1.4.3 &mdash; Desarrollado por <a class="footer-link" href="#" onclick="event.preventDefault(); require('electron').shell.openExternal('https://christianferrer.me')" aria-label="Sitio web de Christian Ferrer, abre en navegador externo">Christian Ferrer</a></p>
        </footer>
    `;
}
