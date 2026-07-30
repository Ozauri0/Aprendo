// tests/asistencia-parser.test.ts — Tests del parseo de nombres de archivo de asistencia
// Estas funciones están en asistencia.ts como funciones privadas.
// Las replicamos aquí para testear la lógica de regex sin depender del DOM.

/**
 * Parsear nombre de archivo de asistencia.
 * Replica exacta de parseAttendanceFileName de asistencia.ts.
 */
function parseAttendanceFileName(fileName: string): {
  courseKey: string;
  courseNumber: number;
  moduleName: string;
} {
  const base = fileName.replace(/\.xlsx?$/i, '').trim();

  let courseKey = '';
  let courseNumber = Number.MAX_SAFE_INTEGER;
  const fullMatch = base.match(/PAT[_\s-]?(\d{4})[_\s-]?0*(\d{1,3})(?!\d)/i);
  const shortMatch = fullMatch ? null : base.match(/PAT[_\s-]?0*(\d{1,3})(?!\d)/i);

  if (fullMatch) {
    courseNumber = parseInt(fullMatch[2], 10);
    courseKey = `PAT_${fullMatch[1]}_${fullMatch[2].padStart(2, '0')}`;
  } else if (shortMatch) {
    courseNumber = parseInt(shortMatch[1], 10);
    courseKey = `PAT_${shortMatch[1].padStart(2, '0')}`;
  }

  let moduleName = '';
  const moduleMatch = base.match(/.*asistencias?[_\s]+(.+)$/i);
  if (moduleMatch) {
    moduleName = moduleMatch[1].trim();
  }
  if (!moduleName) {
    moduleName = base;
  }
  if (!courseKey) {
    courseKey = 'Sin_Curso';
  }

  return { courseKey, courseNumber, moduleName };
}

/**
 * Agrupar archivos por curso.
 * Replica exacta de groupFilesByCourse de asistencia.ts (sin dependencias de File).
 */
interface AttendanceFileInfo {
  name: string;
  courseKey: string;
  courseNumber: number;
  moduleName: string;
}

interface CourseGroup {
  courseKey: string;
  courseNumber: number;
  modules: AttendanceFileInfo[];
}

function groupFilesByCourse(files: AttendanceFileInfo[]): CourseGroup[] {
  const groups = new Map<string, CourseGroup>();

  files.forEach((file) => {
    if (!groups.has(file.courseKey)) {
      groups.set(file.courseKey, {
        courseKey: file.courseKey,
        courseNumber: file.courseNumber,
        modules: [],
      });
    }
    groups.get(file.courseKey)!.modules.push(file);
  });

  return [...groups.values()].sort((a, b) => a.courseNumber - b.courseNumber);
}

// ==================== parseAttendanceFileName ====================
describe('parseAttendanceFileName', () => {
  test('formato PAT_2026_01_Asistencias Asistencia GESTIÓN PERSONAL', () => {
    const result = parseAttendanceFileName('PAT_2026_01_Asistencias Asistencia GESTIÓN PERSONAL.xlsx');
    expect(result.courseKey).toBe('PAT_2026_01');
    expect(result.courseNumber).toBe(1);
    expect(result.moduleName).toBe('GESTIÓN PERSONAL');
  });

  test('formato PAT_01 Asistencia GESTIÓN PERSONAL (sin año)', () => {
    const result = parseAttendanceFileName('PAT_01 Asistencia GESTIÓN PERSONAL.xlsx');
    expect(result.courseKey).toBe('PAT_01');
    expect(result.courseNumber).toBe(1);
    expect(result.moduleName).toBe('GESTIÓN PERSONAL');
  });

  test('formato con año 2025', () => {
    const result = parseAttendanceFileName('PAT_2025_15 Asistencia PENSAMIENTO MATEMÁTICO.xlsx');
    expect(result.courseKey).toBe('PAT_2025_15');
    expect(result.courseNumber).toBe(15);
    expect(result.moduleName).toBe('PENSAMIENTO MATEMÁTICO');
  });

  test('formato con guiones en vez de guiones bajos', () => {
    const result = parseAttendanceFileName('PAT-2026-03 Asistencia Escritura Académica.xlsx');
    expect(result.courseKey).toBe('PAT_2026_03');
    expect(result.courseNumber).toBe(3);
    expect(result.moduleName).toBe('Escritura Académica');
  });

  test('módulo sin "Asistencia" usa nombre completo como fallback', () => {
    const result = parseAttendanceFileName('PAT_2026_05.xlsx');
    expect(result.courseKey).toBe('PAT_2026_05');
    expect(result.moduleName).toBe('PAT_2026_05');
  });

  test('archivo sin PAT va a Sin_Curso', () => {
    const result = parseAttendanceFileName('archivo_cualquiera.xlsx');
    expect(result.courseKey).toBe('Sin_Curso');
    expect(result.courseNumber).toBe(Number.MAX_SAFE_INTEGER);
  });

  test('número de curso con ceros a la izquierda se normaliza', () => {
    const result = parseAttendanceFileName('PAT_2026_001 Asistencia Módulo.xlsx');
    expect(result.courseKey).toBe('PAT_2026_01');
    expect(result.courseNumber).toBe(1);
  });

  test('módulo con "ASISTENCIAS" en plural', () => {
    const result = parseAttendanceFileName('PAT_2026_10 Asistencias HABILIDADES COMUNICATIVAS.xlsx');
    expect(result.moduleName).toBe('HABILIDADES COMUNICATIVAS');
  });

  test('prioriza el curso sobre "Sin_Curso"', () => {
    // Si hay un PAT detectable, no debería caer en Sin_Curso
    const result = parseAttendanceFileName('PAT_2026_20_Asistencias Asistencia ALGO.xlsx');
    expect(result.courseKey).not.toBe('Sin_Curso');
    expect(result.courseKey).toBe('PAT_2026_20');
  });
});

// ==================== groupFilesByCourse ====================
describe('groupFilesByCourse', () => {
  test('agrupa archivos por curso ordenados por número', () => {
    const files: AttendanceFileInfo[] = [
      { name: 'PAT_02 Asistencia A.xlsx', courseKey: 'PAT_02', courseNumber: 2, moduleName: 'A' },
      { name: 'PAT_01 Asistencia B.xlsx', courseKey: 'PAT_01', courseNumber: 1, moduleName: 'B' },
      { name: 'PAT_01 Asistencia C.xlsx', courseKey: 'PAT_01', courseNumber: 1, moduleName: 'C' },
    ];

    const groups = groupFilesByCourse(files);
    expect(groups.length).toBe(2);

    // Ordenado por courseNumber
    expect(groups[0].courseKey).toBe('PAT_01');
    expect(groups[0].modules.length).toBe(2);

    expect(groups[1].courseKey).toBe('PAT_02');
    expect(groups[1].modules.length).toBe(1);
  });

  test('curso único', () => {
    const files: AttendanceFileInfo[] = [
      { name: 'PAT_2026_01 Asistencia A.xlsx', courseKey: 'PAT_2026_01', courseNumber: 1, moduleName: 'A' },
      { name: 'PAT_2026_01 Asistencia B.xlsx', courseKey: 'PAT_2026_01', courseNumber: 1, moduleName: 'B' },
      { name: 'PAT_2026_01 Asistencia C.xlsx', courseKey: 'PAT_2026_01', courseNumber: 1, moduleName: 'C' },
    ];

    const groups = groupFilesByCourse(files);
    expect(groups.length).toBe(1);
    expect(groups[0].modules.length).toBe(3);
  });

  test('archivos sin curso (Sin_Curso)', () => {
    const files: AttendanceFileInfo[] = [
      { name: 'x.xlsx', courseKey: 'Sin_Curso', courseNumber: Number.MAX_SAFE_INTEGER, moduleName: 'x' },
      { name: 'y.xlsx', courseKey: 'Sin_Curso', courseNumber: Number.MAX_SAFE_INTEGER, moduleName: 'y' },
    ];

    const groups = groupFilesByCourse(files);
    expect(groups.length).toBe(1);
    expect(groups[0].courseKey).toBe('Sin_Curso');
    expect(groups[0].modules.length).toBe(2);
  });

  test('lista vacía', () => {
    const groups = groupFilesByCourse([]);
    expect(groups.length).toBe(0);
  });
});
