// tests/filter-engine.test.ts — Tests unitarios del motor de filtrado
import {
  normalizeRut,
  validateRut,
  validateEmail,
  findEmailColumns,
  findRutColumns,
  matchesEmailFilter,
  matchesRutFilter,
  applyEmailFilters,
  applyRutFilters,
  applyUserFilters,
} from '../src/shared/filter-engine';
import { EmailFilter, RutFilter } from '../src/shared/types';

// ==================== normalizeRut ====================
describe('normalizeRut', () => {
  test('remueve puntos y guiones', () => {
    expect(normalizeRut('12.345.678-9')).toBe('123456789');
  });

  test('maneja RUT sin dígito verificador', () => {
    expect(normalizeRut('12.345.678')).toBe('12345678');
  });

  test('convierte a mayúsculas el dígito verificador K', () => {
    expect(normalizeRut('12.345.678-k')).toBe('12345678K');
  });

  test('RUT sin formato (solo números)', () => {
    expect(normalizeRut('12345678')).toBe('12345678');
  });

  test('RUT con dígito verificador', () => {
    expect(normalizeRut('12345678-9')).toBe('123456789');
  });

  test('espacios y otros caracteres', () => {
    expect(normalizeRut(' 12.345.678-9 ')).toBe('123456789');
  });
});

// ==================== validateRut ====================
describe('validateRut', () => {
  test('RUT válido con DV numérico', () => {
    expect(validateRut('12345678-9')).toBe(true);
  });

  test('RUT válido con DV K', () => {
    expect(validateRut('12345678-K')).toBe(true);
  });

  test('RUT válido sin guión (7-8 dígitos)', () => {
    expect(validateRut('12345678')).toBe(true);
  });

  test('RUT inválido: muy corto', () => {
    expect(validateRut('12345-6')).toBe(false);
  });

  test('RUT inválido: letras en parte numérica', () => {
    expect(validateRut('ABC12345-6')).toBe(false);
  });

  test('RUT con puntos y guión', () => {
    expect(validateRut('12.345.678-9')).toBe(true);
  });
});

// ==================== validateEmail ====================
describe('validateEmail', () => {
  test('email válido', () => {
    expect(validateEmail('usuario@dominio.cl')).toBe(true);
  });

  test('email con subdominio', () => {
    expect(validateEmail('usuario@alu.uct.cl')).toBe(true);
  });

  test('email sin @ (solo dominio)', () => {
    expect(validateEmail('@uct.cl')).toBe(true);
  });

  test('email sin @ inválido', () => {
    expect(validateEmail('@uct')).toBe(false);
  });

  test('string vacío inválido', () => {
    expect(validateEmail('')).toBe(false);
  });
});

// ==================== findEmailColumns ====================
describe('findEmailColumns', () => {
  test('encuentra columna "Email"', () => {
    expect(findEmailColumns(['Nombre', 'Email', 'RUT'])).toEqual(['Email']);
  });

  test('encuentra columna "Correo"', () => {
    expect(findEmailColumns(['Nombre', 'Correo electrónico', 'RUT'])).toEqual(['Correo electrónico']);
  });

  test('encuentra columna "Mail"', () => {
    expect(findEmailColumns(['Mail', 'Nombre'])).toEqual(['Mail']);
  });

  test('múltiples columnas de email', () => {
    expect(findEmailColumns(['Email', 'Correo', 'Mail secundario']))
      .toEqual(['Email', 'Correo', 'Mail secundario']);
  });

  test('sin columnas de email', () => {
    expect(findEmailColumns(['Nombre', 'RUT', 'Curso'])).toEqual([]);
  });

  test('headers vacíos', () => {
    expect(findEmailColumns([])).toEqual([]);
  });
});

// ==================== findRutColumns ====================
describe('findRutColumns', () => {
  test('encuentra columna "RUT"', () => {
    expect(findRutColumns(['Nombre', 'RUT', 'Email'])).toEqual(['RUT']);
  });

  test('encuentra columna "Cedula" (sin tilde)', () => {
    // filter-engine busca 'cedula' sin tilde (como aparece en Moodle)
    expect(findRutColumns(['Nombre', 'Cedula', 'Email'])).toEqual(['Cedula']);
  });

  test('encuentra columna "Identificacion" (sin tilde)', () => {
    expect(findRutColumns(['Identificacion', 'Nombre'])).toEqual(['Identificacion']);
  });

  test('encuentra columna "ID" (exact match)', () => {
    expect(findRutColumns(['ID', 'Nombre'])).toEqual(['ID']);
  });

  test('NO encuentra "id" dentro de otra palabra', () => {
    expect(findRutColumns(['id_user', 'Nombre'])).toEqual([]);
  });

  test('sin columnas RUT', () => {
    expect(findRutColumns(['Nombre', 'Email', 'Curso'])).toEqual([]);
  });
});

// ==================== matchesEmailFilter ====================
describe('matchesEmailFilter', () => {
  const domainFilter: EmailFilter = {
    pattern: '@uct.cl',
    type: 'domain',
    action: 'exclude',
    enabled: true,
  };

  test('matchea dominio exacto', () => {
    expect(matchesEmailFilter('profesor@uct.cl', domainFilter)).toBe(true);
  });

  test('no matchea dominio diferente', () => {
    expect(matchesEmailFilter('profesor@gmail.com', domainFilter)).toBe(false);
  });

  test('no matchea subdominio alu.uct.cl', () => {
    // 'alumno@alu.uct.cl' NO termina en '@uct.cl' — termina en 'alu.uct.cl'
    expect(matchesEmailFilter('alumno@alu.uct.cl', domainFilter)).toBe(false);
  });

  test('excepción excluye subdominio específico', () => {
    const filterWithException: EmailFilter = {
      pattern: '@uct.cl',
      type: 'domain',
      action: 'exclude',
      enabled: true,
      exceptions: ['@alu.uct.cl'],
    };
    // Con excepción, @alu.uct.cl tampoco matchea (pero por el exception, no por el domain)
    expect(matchesEmailFilter('alumno@alu.uct.cl', filterWithException)).toBe(false);
    expect(matchesEmailFilter('profesor@uct.cl', filterWithException)).toBe(true);
  });

  test('filtro por email completo', () => {
    const exactFilter: EmailFilter = {
      pattern: 'usuario@uct.cl',
      type: 'email',
      action: 'exclude',
      enabled: true,
    };
    expect(matchesEmailFilter('usuario@uct.cl', exactFilter)).toBe(true);
    expect(matchesEmailFilter('otro@uct.cl', exactFilter)).toBe(false);
  });
});

// ==================== matchesRutFilter ====================
describe('matchesRutFilter', () => {
  test('matchea RUT exacto', () => {
    expect(matchesRutFilter('12.345.678-9', '12.345.678-9')).toBe(true);
  });

  test('matchea RUT con formatos diferentes', () => {
    expect(matchesRutFilter('12.345.678-9', '12345678-9')).toBe(true);
  });

  test('matchea por número completo (incluye DV)', () => {
    // '12.345.678-9' → normalizado: '123456789'
    // Sin DV ('12345678') no matchea porque '123456789' !== '12345678'
    expect(matchesRutFilter('12.345.678-9', '12345678')).toBe(false);
    // Con DV incluido sí matchea
    expect(matchesRutFilter('12.345.678-9', '123456789')).toBe(true);
  });

  test('no matchea RUT diferente', () => {
    expect(matchesRutFilter('12.345.678-9', '98.765.432-1')).toBe(false);
  });

  test('RUT con K normalizado', () => {
    expect(matchesRutFilter('12.345.678-k', '12345678K')).toBe(true);
  });
});

// ==================== applyEmailFilters ====================
describe('applyEmailFilters', () => {
  const data = [
    { Nombre: 'Juan', Email: 'juan@uct.cl' },
    { Nombre: 'Ana', Email: 'ana@gmail.com' },
    { Nombre: 'Pedro', Email: 'pedro@uct.cl' },
    { Nombre: 'María', Email: 'maria@alu.uct.cl' },
  ];
  const headers = ['Nombre', 'Email'];

  test('filtra emails del dominio @uct.cl', () => {
    const filters: EmailFilter[] = [{
      pattern: '@uct.cl',
      type: 'domain',
      action: 'exclude',
      enabled: true,
    }];
    const result = applyEmailFilters(data, headers, filters);
    // Juan y Pedro terminan en @uct.cl (eliminados)
    // María es @alu.uct.cl y NO termina en @uct.cl (se mantiene)
    // Ana es @gmail.com (se mantiene)
    expect(result.eliminated).toBe(2);
    expect(result.data.length).toBe(2);
    const names = result.data.map((r: any) => r.Nombre).sort();
    expect(names).toEqual(['Ana', 'María']);
  });

  test('filtra con excepción para alu.uct.cl', () => {
    const filters: EmailFilter[] = [{
      pattern: '@uct.cl',
      type: 'domain',
      action: 'exclude',
      enabled: true,
      exceptions: ['@alu.uct.cl'],
    }];
    const result = applyEmailFilters(data, headers, filters);
    // Con excepción: @alu.uct.cl se excluye del filtro → María se mantiene
    // Juan y Pedro matchean @uct.cl → eliminados; Ana @gmail → se mantiene
    expect(result.eliminated).toBe(2);
    expect(result.data.length).toBe(2);
    const names = result.data.map((r: any) => r.Nombre).sort();
    expect(names).toEqual(['Ana', 'María']);
  });

  test('sin filtros activos no elimina nada', () => {
    const filters: EmailFilter[] = [{
      pattern: '@uct.cl',
      type: 'domain',
      action: 'exclude',
      enabled: false,
    }];
    const result = applyEmailFilters(data, headers, filters);
    expect(result.eliminated).toBe(0);
    expect(result.data.length).toBe(4);
  });

  test('sin columna de email no elimina nada', () => {
    const filters: EmailFilter[] = [{
      pattern: '@uct.cl',
      type: 'domain',
      action: 'exclude',
      enabled: true,
    }];
    const result = applyEmailFilters(data, ['Nombre', 'RUT'], filters);
    expect(result.eliminated).toBe(0);
  });
});

// ==================== applyRutFilters ====================
describe('applyRutFilters', () => {
  const data = [
    { Nombre: 'Juan', RUT: '12.345.678-9', Email: 'juan@mail.com' },
    { Nombre: 'Ana', RUT: '98.765.432-1', Email: 'ana@mail.com' },
    { Nombre: 'Pedro', RUT: '12.345.678-9', Email: 'pedro@mail.com' },
  ];
  const headers = ['Nombre', 'RUT', 'Email'];

  test('filtra RUT específico con formato', () => {
    const filters: RutFilter[] = [{
      pattern: '12.345.678-9',
      action: 'exclude',
      enabled: true,
    }];
    const result = applyRutFilters(data, headers, filters);
    expect(result.eliminated).toBe(2); // Juan y Pedro
    expect(result.data.length).toBe(1);
    expect(result.data[0].Nombre).toBe('Ana');
  });

  test('filtra por RUT normalizado (con DV)', () => {
    const filters: RutFilter[] = [{
      pattern: '123456789',  // 12.345.678-9 normalizado
      action: 'exclude',
      enabled: true,
    }];
    const result = applyRutFilters(data, headers, filters);
    expect(result.eliminated).toBe(2); // Juan y Pedro
  });

  test('sin columna RUT no elimina nada', () => {
    const filters: RutFilter[] = [{
      pattern: '12.345.678-9',
      action: 'exclude',
      enabled: true,
    }];
    const result = applyRutFilters(data, ['Nombre', 'Email'], filters);
    expect(result.eliminated).toBe(0);
  });
});

// ==================== applyUserFilters ====================
describe('applyUserFilters', () => {
  const data = [
    { Nombre: 'Juan', Email: 'juan@uct.cl', RUT: '12.345.678-9' },
    { Nombre: 'Ana', Email: 'ana@gmail.com', RUT: '98.765.432-1' },
    { Nombre: 'Pedro', Email: 'pedro@uct.cl', RUT: '11.111.111-1' },
    { Nombre: 'Luis', Email: 'luis@gmail.com', RUT: '12.345.678-9' },
  ];
  const headers = ['Nombre', 'Email', 'RUT'];

  test('aplica ambos filtros (email + RUT)', () => {
    const emailFilters: EmailFilter[] = [{
      pattern: '@uct.cl',
      type: 'domain',
      action: 'exclude',
      enabled: true,
    }];
    const rutFilters: RutFilter[] = [{
      pattern: '12.345.678-9',
      action: 'exclude',
      enabled: true,
    }];

    const result = applyUserFilters(data, headers, emailFilters, rutFilters);

    // Primero email: elimina Juan y Pedro (@uct.cl)
    // Luego RUT sobre los que quedan: Ana (98.765.432-1) y Luis (12.345.678-9)
    // Luis matchea RUT → eliminado
    // Solo Ana sobrevive
    expect(result.data.length).toBe(1);
    expect(result.data[0].Nombre).toBe('Ana');
    expect(result.eliminated).toBe(3);
  });

  test('datos vacíos', () => {
    const result = applyUserFilters([], [], [], []);
    expect(result.data).toEqual([]);
    expect(result.eliminated).toBe(0);
  });
});
