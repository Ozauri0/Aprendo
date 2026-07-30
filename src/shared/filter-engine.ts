// filter-engine.ts - Lógica pura de filtrado de usuarios (sin dependencias de DOM)
// Puede usarse tanto en main process como en renderer.

import { EmailFilter, RutFilter } from './types';

export interface FilterResult {
  data: Record<string, string>[];
  eliminated: number;
  eliminatedUsers: EliminatedUser[];
}

export interface EliminatedUser {
  email?: string;
  rut?: string;
  reason: string;
  type: 'email' | 'rut';
  timestamp: string;
}

// ================= NORMALIZACIÓN Y VALIDACIÓN =================

export function normalizeRut(rut: string | number): string {
  const rutStr = String(rut).replace(/[.\s-]/g, '').toUpperCase();
  return rutStr;
}

export function validateRut(rut: string): boolean {
  const rutStr = String(rut).replace(/[.\s-]/g, '');
  const rutRegexWithDV = /^\d{7,8}[0-9K]$/i;
  const rutRegexOnlyNumbers = /^\d{7,8}$/;
  return rutRegexWithDV.test(rutStr) || rutRegexOnlyNumbers.test(rutStr);
}

export function validateEmail(email: string): boolean {
  if (email.startsWith('@')) {
    const domainPart = email.substring(1);
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domainPart);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ================= DETECCIÓN DE COLUMNAS =================

export function findEmailColumns(headers: string[]): string[] {
  const cols: string[] = [];
  for (const header of headers) {
    if (
      header &&
      (/email/i.test(header) || /correo/i.test(header) || /mail/i.test(header))
    ) {
      cols.push(header);
    }
  }
  return cols;
}

export function findRutColumns(headers: string[]): string[] {
  const cols: string[] = [];
  for (const header of headers) {
    if (
      header &&
      (/rut/i.test(header) ||
        /cedula/i.test(header) ||
        /identificacion/i.test(header) ||
        /número de id/i.test(header) ||
        /numero de id/i.test(header) ||
        header.toLowerCase() === 'id' ||
        /identificador/i.test(header))
    ) {
      cols.push(header);
    }
  }
  return cols;
}

// ================= MATCHING DE FILTROS =================

export function matchesEmailFilter(email: string, filter: EmailFilter): boolean {
  const emailLower = email.toLowerCase();
  if (filter.type === 'domain') {
    const domain = filter.pattern.toLowerCase();
    const endsWithDomain = emailLower.endsWith(domain);
    if (endsWithDomain && filter.exceptions) {
      for (const exception of filter.exceptions) {
        if (emailLower.endsWith(exception.toLowerCase())) {
          return false;
        }
      }
    }
    return endsWithDomain;
  }
  return emailLower === filter.pattern.toLowerCase();
}

export function matchesRutFilter(rut: string, filterPattern: string): boolean {
  const normalizedRut = normalizeRut(rut);
  const normalizedFilter = normalizeRut(filterPattern);
  if (normalizedRut === normalizedFilter) return true;
  const rutNumbers = normalizedRut.replace(/[^0-9]/g, '');
  const filterNumbers = normalizedFilter.replace(/[^0-9]/g, '');
  return rutNumbers === filterNumbers;
}

// ================= APLICACIÓN DE FILTROS =================

export function applyEmailFilters(
  data: Record<string, string>[],
  headers: string[],
  filters: EmailFilter[]
): FilterResult {
  const activeFilters = filters.filter((f) => f.enabled);
  if (activeFilters.length === 0) {
    return { data, eliminated: 0, eliminatedUsers: [] };
  }

  const emailColumns = findEmailColumns(headers);
  if (emailColumns.length === 0) {
    return { data, eliminated: 0, eliminatedUsers: [] };
  }

  const emailColumn = emailColumns[0];
  const eliminatedUsers: EliminatedUser[] = [];
  const filteredData: Record<string, string>[] = [];

  for (const row of data) {
    const email = row[emailColumn];
    let shouldEliminate = false;
    let eliminationReason = '';

    if (email) {
      const emailStr = email.trim().toLowerCase();
      for (const filter of activeFilters) {
        if (matchesEmailFilter(emailStr, filter)) {
          shouldEliminate = true;
          eliminationReason = `Filtro: ${filter.pattern}`;
          break;
        }
      }
    }

    if (shouldEliminate) {
      eliminatedUsers.push({
        email,
        reason: eliminationReason,
        type: 'email',
        timestamp: new Date().toISOString(),
      });
    } else {
      filteredData.push(row);
    }
  }

  return { data: filteredData, eliminated: eliminatedUsers.length, eliminatedUsers };
}

export function applyRutFilters(
  data: Record<string, string>[],
  headers: string[],
  filters: RutFilter[]
): FilterResult {
  const activeFilters = filters.filter((f) => f.enabled);
  if (activeFilters.length === 0) {
    return { data, eliminated: 0, eliminatedUsers: [] };
  }

  const rutColumns = findRutColumns(headers);
  if (rutColumns.length === 0) {
    return { data, eliminated: 0, eliminatedUsers: [] };
  }

  const rutColumn = rutColumns[0];
  const emailColumns = findEmailColumns(headers);
  const emailColumn = emailColumns.length > 0 ? emailColumns[0] : null;

  const eliminatedUsers: EliminatedUser[] = [];
  const filteredData: Record<string, string>[] = [];

  for (const row of data) {
    const rut = row[rutColumn];
    const email = emailColumn ? row[emailColumn] : undefined;
    let shouldEliminate = false;
    let eliminationReason = '';

    if (rut) {
      const rutValue = String(rut).trim();
      const normalizedRut = normalizeRut(rutValue);
      for (const filter of activeFilters) {
        if (matchesRutFilter(normalizedRut, filter.pattern)) {
          shouldEliminate = true;
          eliminationReason = `Filtro RUT: ${filter.pattern}`;
          break;
        }
      }
    }

    if (shouldEliminate) {
      eliminatedUsers.push({
        rut: String(rut),
        email,
        reason: eliminationReason,
        type: 'rut',
        timestamp: new Date().toISOString(),
      });
    } else {
      filteredData.push(row);
    }
  }

  return { data: filteredData, eliminated: eliminatedUsers.length, eliminatedUsers };
}

export function applyUserFilters(
  data: Record<string, string>[],
  headers: string[],
  emailFilters: EmailFilter[],
  rutFilters: RutFilter[]
): FilterResult {
  if (!data || data.length === 0) {
    return { data: [], eliminated: 0, eliminatedUsers: [] };
  }

  let filteredData = [...data];
  let eliminatedUsers: EliminatedUser[] = [];

  const emailResult = applyEmailFilters(filteredData, headers, emailFilters);
  filteredData = emailResult.data;
  eliminatedUsers = eliminatedUsers.concat(emailResult.eliminatedUsers);

  const rutResult = applyRutFilters(filteredData, headers, rutFilters);
  filteredData = rutResult.data;
  eliminatedUsers = eliminatedUsers.concat(rutResult.eliminatedUsers);

  return {
    data: filteredData,
    eliminated: eliminatedUsers.length,
    eliminatedUsers,
  };
}
