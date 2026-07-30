// tests/shared-utils.test.ts — Tests unitarios de utilidades compartidas

// Mock del DOM para funciones que usan document
const mockLogContainer = {
  innerHTML: '',
  scrollTop: 0,
  appendChild: jest.fn((el: any) => { mockLogContainer.children.push(el); }),
  children: [] as any[],
} as any;

// Objetos persistentes para updateProgress
const progressFill = { style: { width: '' } };
const progressText = { textContent: '' };
const progressPercent = { textContent: '' };

// Mock de document.getElementById
(global as any).document = {
  getElementById: jest.fn((id: string) => {
    if (id === 'logContainer') return mockLogContainer;
    if (id === 'progressFill') return progressFill;
    if (id === 'progressText') return progressText;
    if (id === 'progressPercent') return progressPercent;
    return null;
  }),
  documentElement: {
    getAttribute: jest.fn().mockReturnValue('light'),
    setAttribute: jest.fn(),
  },
  createElement: jest.fn((tag: string) => ({
    className: '',
    innerHTML: '',
    style: {},
  })),
} as any;

// Mock de localStorage
(global as any).localStorage = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
};

// Mock de console
(global as any).console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock de require('electron')
jest.mock('electron', () => ({
  ipcRenderer: { send: jest.fn() },
}), { virtual: true });

import { formatFileSize, logMessage, clearLog, updateProgress } from '../src/renderer/shared-utils';

// ==================== formatFileSize ====================
describe('formatFileSize', () => {
  test('0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  test('bytes (< 1 KB)', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  test('KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  test('MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  test('GB', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  test('valor decimal (1.5 MB)', () => {
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  test('tamaño grande en GB', () => {
    const result = formatFileSize(3221225472);
    expect(result).toContain('GB');
    expect(result).toMatch(/^3(\.0)? GB$/);
  });
});

// ==================== logMessage ====================
describe('logMessage', () => {
  beforeEach(() => {
    mockLogContainer.innerHTML = '';
    mockLogContainer.children = [];
    mockLogContainer.scrollTop = 0;
    jest.clearAllMocks();
  });

  test('agrega entrada al log container', () => {
    logMessage('Test message', 'info');
    expect(mockLogContainer.children.length).toBe(1);
    expect(mockLogContainer.children[0].innerHTML).toContain('Test message');
    expect(mockLogContainer.children[0].className).toBe('log-entry log-info');
  });

  test('usa tipo correcto en la clase CSS', () => {
    logMessage('Error!', 'error');
    expect(mockLogContainer.children[0].className).toBe('log-entry log-error');
  });

  test('tipo por defecto es info', () => {
    logMessage('Default');
    expect(mockLogContainer.children[0].className).toBe('log-entry log-info');
  });
});

// ==================== clearLog ====================
describe('clearLog', () => {
  beforeEach(() => {
    mockLogContainer.innerHTML = '<div>old</div>';
    mockLogContainer.children = [{ innerHTML: '<div>old</div>' }];
    jest.clearAllMocks();
  });

  test('limpia el contenedor de log', () => {
    clearLog();
    expect(mockLogContainer.innerHTML).toBe('');
  });
});

// ==================== updateProgress ====================
describe('updateProgress', () => {
  beforeEach(() => {
    progressFill.style.width = '';
    progressText.textContent = '';
    progressPercent.textContent = '';
  });

  test('actualiza barra al 50%', () => {
    updateProgress(5, 10, 'Procesando...');
    expect(progressFill.style.width).toBe('50%');
    expect(progressText.textContent).toBe('Procesando...');
    expect(progressPercent.textContent).toBe('50%');
  });

  test('100% completado', () => {
    updateProgress(10, 10, 'Completado');
    expect(progressFill.style.width).toBe('100%');
  });

  test('total 0 no divide por cero', () => {
    updateProgress(0, 0, 'Sin datos');
    expect(progressFill.style.width).toBe('0%');
  });
});
