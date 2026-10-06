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

import { formatFileSize, logMessage, clearLog, updateProgress, formatSectionHeaderName, extractCourseKey } from '../src/renderer/shared-utils';

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

// ==================== formatSectionHeaderName ====================
describe('formatSectionHeaderName', () => {
  test('patrón PAT con año y dos dígitos: PAT_2026_01.xlsx', () => {
    expect(formatSectionHeaderName('PAT_2026_01.xlsx', 'Calificaciones')).toBe('PAT_2026_01_Calificaciones');
  });

  test('patrón PAT con año y un dígito normalizado con padStart: PAT_2026_1', () => {
    expect(formatSectionHeaderName('PAT_2026_1', 'Calificaciones')).toBe('PAT_2026_01_Calificaciones');
  });

  test('patrón PAT con espacio y sufijo: PAT_2026_01 Calificaciones.xlsx', () => {
    expect(formatSectionHeaderName('PAT_2026_01 Calificaciones.xlsx', 'Calificaciones')).toBe('PAT_2026_01_Calificaciones');
  });

  test('patrón PAT para logs: PAT_2026_01 Logs.xlsx', () => {
    expect(formatSectionHeaderName('PAT_2026_01 Logs.xlsx', 'Logs')).toBe('PAT_2026_01_Logs');
  });

  test('patrón logs export Moodle: logs_PAT_2026_01_20260315-1200.xlsx', () => {
    expect(formatSectionHeaderName('logs_PAT_2026_01_20260315-1200.xlsx', 'Logs')).toBe('PAT_2026_01_Logs');
  });

  test('patrón asistencia: PAT_2026_01_Asistencias Asistencia GESTIÓN.xlsx', () => {
    expect(formatSectionHeaderName('PAT_2026_01_Asistencias Asistencia GESTIÓN.xlsx', 'Asistencias')).toBe('PAT_2026_01_Asistencias');
  });

  test('patrón PAT sin año: PAT_01.xlsx', () => {
    expect(formatSectionHeaderName('PAT_01.xlsx', 'Calificaciones')).toBe('PAT_01_Calificaciones');
  });

  test('patrón PAT sin año de un dígito: PAT_1', () => {
    expect(formatSectionHeaderName('PAT_1', 'Calificaciones')).toBe('PAT_01_Calificaciones');
  });

  test('patrón Curso_NN: Curso_1.xlsx', () => {
    expect(formatSectionHeaderName('Curso_1.xlsx', 'Calificaciones')).toBe('Curso_01_Calificaciones');
  });

  test('patrón Curso con espacio: Curso 02', () => {
    expect(formatSectionHeaderName('Curso 02', 'Calificaciones')).toBe('Curso_02_Calificaciones');
  });

  test('fallback nombre genérico: Biologia_01.xlsx', () => {
    expect(formatSectionHeaderName('Biologia_01.xlsx', 'Calificaciones')).toBe('Biologia_01_Calificaciones');
  });

  test('fallback Sin_Curso para asistencias', () => {
    expect(formatSectionHeaderName('Sin_Curso', 'Asistencias')).toBe('Sin_Curso_Asistencias');
  });

  test('string vacío retorna el tipo', () => {
    expect(formatSectionHeaderName('', 'Calificaciones')).toBe('Calificaciones');
  });
});

// ==================== extractCourseKey ====================
describe('extractCourseKey', () => {
  test('patrón PAT con año y dos dígitos: PAT_2026_01.xlsx', () => {
    expect(extractCourseKey('PAT_2026_01.xlsx')).toBe('PAT_2026_01');
  });

  test('patrón PAT con año y un dígito: PAT_2026_1', () => {
    expect(extractCourseKey('PAT_2026_1')).toBe('PAT_2026_01');
  });

  test('patrón PAT con espacios y sufijos: PAT_2026_01 Calificaciones.xlsx', () => {
    expect(extractCourseKey('PAT_2026_01 Calificaciones.xlsx')).toBe('PAT_2026_01');
  });

  test('patrón logs: PAT_2026_01 Logs.xlsx', () => {
    expect(extractCourseKey('PAT_2026_01 Logs.xlsx')).toBe('PAT_2026_01');
  });

  test('patrón logs Moodle: logs_PAT_2026_01_20260315-1200.xlsx', () => {
    expect(extractCourseKey('logs_PAT_2026_01_20260315-1200.xlsx')).toBe('PAT_2026_01');
  });

  test('patrón asistencia: PAT_2026_01_Asistencias Asistencia GESTIÓN.xlsx', () => {
    expect(extractCourseKey('PAT_2026_01_Asistencias Asistencia GESTIÓN.xlsx')).toBe('PAT_2026_01');
  });

  test('patrón PAT sin año: PAT_01.xlsx', () => {
    expect(extractCourseKey('PAT_01.xlsx')).toBe('PAT_01');
  });

  test('patrón PAT sin año de un dígito: PAT_1', () => {
    expect(extractCourseKey('PAT_1')).toBe('PAT_01');
  });

  test('patrón Curso_NN: Curso_1.xlsx', () => {
    expect(extractCourseKey('Curso_1.xlsx')).toBe('Curso_01');
  });

  test('fallback nombre genérico: Biologia_01.xlsx', () => {
    expect(extractCourseKey('Biologia_01.xlsx')).toBe('Biologia_01');
  });

  test('string vacío retorna string vacío', () => {
    expect(extractCourseKey('')).toBe('');
  });
});
