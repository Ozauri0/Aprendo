// header.ts - Componente de header reutilizable
const { getIcon } = require('../icons');

export interface HeaderConfig {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
    showConfigButton?: boolean;
    isHomePage?: boolean;
}

/**
 * Genera el HTML del header para cualquier página
 * @param config - Configuración del header
 * @returns String HTML del header
 */
export function renderHeader(config: HeaderConfig): string {
    const {
        title,
        subtitle = '',
        showBackButton = false,
        showConfigButton = true,
        isHomePage = false
    } = config;

    // Header principal para página de inicio
    if (isHomePage) {
        return `
            <header>
                <div class="header-content">
                    <div class="header-brand">
                        <div class="header-logo">
                            <span class="header-logo-placeholder">UCT</span>
                        </div>
                        <div class="header-text">
                            <h1>${title}</h1>
                            ${subtitle ? `<p>${subtitle}</p>` : ''}
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="theme-toggle" onclick="toggleTheme()" title="Cambiar tema">
                            <span class="icon icon-sun">${getIcon('sun', 20)}</span>
                            <span class="icon icon-moon">${getIcon('moon', 20)}</span>
                        </button>
                        ${showConfigButton ? `
                            <button class="btn-config" onclick="openConfig()" title="Configuración">
                                <span class="icon">${getIcon('settings', 20)}</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </header>
        `;
    }

    // Header secundario para páginas internas
    const configButtonHtml = showConfigButton ? `
        <button class="btn-config" onclick="navigate('config')" title="Configuración">
            ${getIcon('settings', 20)}
        </button>
    ` : '';

    return `
        <header class="header-secondary">
            <div class="header-top">
                <div class="header-nav">
                    ${showBackButton ? `
                        <button class="btn-back" onclick="goBack()">
                            ${getIcon('arrow-left', 18)} Volver
                        </button>
                    ` : ''}
                </div>
                <div class="header-info">
                    <h1>${title}</h1>
                    ${subtitle ? `<p>${subtitle}</p>` : ''}
                </div>
                <div class="header-actions">
                    <button class="theme-toggle" onclick="toggleTheme()" title="Cambiar tema">
                        <span class="icon icon-sun">${getIcon('sun', 20)}</span>
                        <span class="icon icon-moon">${getIcon('moon', 20)}</span>
                    </button>
                    ${configButtonHtml}
                </div>
            </div>
        </header>
    `;
}

/**
 * Aplica el tema guardado en localStorage
 */
export function applyStoredTheme(): void {
    const storedTheme = localStorage.getItem('aprendo-theme');
    if (storedTheme) {
        document.documentElement.setAttribute('data-theme', storedTheme);
    } else {
        // Detectar preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}
