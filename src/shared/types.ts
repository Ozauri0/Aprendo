// types.ts - Tipos compartidos entre main y renderer para IPC

export interface EmailFilter {
  pattern: string;
  type: 'domain' | 'email';
  action: 'exclude';
  exceptions?: string[];
  enabled: boolean;
  addedDate?: string;
  description?: string;
}

export interface RutFilter {
  pattern: string;
  originalInput?: string;
  action: 'exclude';
  enabled: boolean;
  addedDate?: string;
  description?: string;
}

export interface ProcessFilters {
  emailFilters: EmailFilter[];
  rutFilters: RutFilter[];
}

export interface ExcelFileInput {
  name: string;
  buffer: ArrayBuffer;
}

export interface ExcelProcessOptions {
  files: ExcelFileInput[];
  mode: 'calificaciones' | 'informes';
  filters: ProcessFilters;
  consolidationMode: 'separate' | 'single';
}

export interface ExcelProcessResult {
  excelBuffer: ArrayBuffer;
  txtContent?: string;
  stats: {
    successfulFiles: number;
    totalSheets: number;
    totalEliminated?: number;
    totalRecords?: number;
  };
  fileDetails: Record<string, { rowCount: number; eliminated?: number; error?: string }>;
}

export interface DownloadProgress {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface DownloadStatus {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'processing';
}

export interface DownloadStartArgs {
  startId: number;
  endId: number;
  downloadPath: string;
}

export interface DownloadResult {
  success: boolean;
  successCount: number;
  emptyCount: number;
  message: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
}

export interface FileToSave {
  name: string;
  buffer: ArrayBuffer;
}

export interface BatchSaveArgs {
  files: FileToSave[];
}

export interface BatchSaveResult {
  success: boolean;
  count: number;
  folderPath?: string;
  cancelled?: boolean;
  errors?: string[];
}

// ================= AUTO-UPDATE =================
export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}
