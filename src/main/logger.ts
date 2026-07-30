// logger.ts - Sistema de logging persistente a archivo
// Escribe a <userData>/logs/aprendo-YYYY-MM-DD.log para diagnóstico en PCs remotos.
import { app } from 'electron';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import path from 'path';

let logFilePath: string | null = null;
let logDir: string | null = null;
const MAX_LOG_FILES = 7; // mantener últimos 7 días

function ensureLogDir(): string {
    if (logDir) return logDir;
    logDir = path.join(app.getPath('userData'), 'logs');
    if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
    }
    return logDir;
}

function getLogFilePath(): string {
    if (logFilePath) return logFilePath;
    const dir = ensureLogDir();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    logFilePath = path.join(dir, `aprendo-${today}.log`);
    return logFilePath;
}

function formatMessage(level: string, source: string, message: string): string {
    const ts = new Date().toISOString();
    return `[${ts}] [${level}] [${source}] ${message}\n`;
}

async function appendAsync(line: string): Promise<void> {
    try {
        await fs.appendFile(getLogFilePath(), line, 'utf8');
    } catch (e) {
        // Si no podemos escribir al archivo, al menos al stdout del main process
        console.error('[logger] No se pudo escribir al archivo de log:', e);
        console.log(line.trimEnd());
    }
}

function appendSync(line: string): void {
    try {
        const fsSync = require('fs');
        fsSync.appendFileSync(getLogFilePath(), line, 'utf8');
    } catch {
        console.log(line.trimEnd());
    }
}

export const logger = {
    info(source: string, message: string): void {
        const line = formatMessage('INFO', source, message);
        appendSync(line);
        console.log(line.trimEnd());
    },
    warn(source: string, message: string): void {
        const line = formatMessage('WARN', source, message);
        appendSync(line);
        console.warn(line.trimEnd());
    },
    error(source: string, message: string, err?: unknown): void {
        const errStr = err instanceof Error ? `${err.message}\n${err.stack}` : err ? String(err) : '';
        const line = formatMessage('ERROR', source, message + (errStr ? `\n${errStr}` : ''));
        appendSync(line);
        console.error(line.trimEnd());
    },
    async getLogDir(): Promise<string> {
        return ensureLogDir();
    },
    async getCurrentLogPath(): Promise<string> {
        return getLogFilePath();
    },
    async listLogFiles(): Promise<{ name: string; path: string; size: number; modified: Date }[]> {
        const dir = ensureLogDir();
        const files = await fs.readdir(dir);
        const stats = await Promise.all(
            files
                .filter(f => f.startsWith('aprendo-') && f.endsWith('.log'))
                .map(async f => {
                    const fp = path.join(dir, f);
                    const s = await fs.stat(fp);
                    return { name: f, path: fp, size: s.size, modified: s.mtime };
                })
        );
        return stats.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    },
    async readAllLogs(maxBytes = 200_000): Promise<string> {
        const files = await logger.listLogFiles();
        if (files.length === 0) return '(No hay archivos de log todavía)';
        let total = 0;
        const parts: string[] = [];
        // Leer del más reciente al más viejo hasta llegar al límite
        for (const f of files) {
            if (total >= maxBytes) break;
            const content = await fs.readFile(f.path, 'utf8');
            parts.push(`=== ${f.name} (${f.size} bytes) ===\n${content}`);
            total += f.size;
        }
        return parts.join('\n\n');
    },
    // Llamar al iniciar la app: loguea info del sistema útil para diagnóstico
    logSystemInfo(): void {
        const os = require('os');
        logger.info('system', `=== Aprendo UCT ${app.getVersion()} iniciado ===`);
        logger.info('system', `Plataforma: ${process.platform} ${os.release()} (${process.arch})`);
        logger.info('system', `Node: ${process.versions.node} | Electron: ${process.versions.electron} | Chrome: ${process.versions.chrome}`);
        logger.info('system', `Versión de Windows: ${os.version()}`);
        logger.info('system', `Idioma del SO: ${app.getLocale()}`);
        logger.info('system', `userData: ${app.getPath('userData')}`);
        logger.info('system', `downloads: ${app.getPath('downloads')}`);
        logger.info('system', `temp: ${app.getPath('temp')}`);
        logger.info('system', `Log file: ${getLogFilePath()}`);
        logger.info('system', `CWD: ${process.cwd()}`);
        logger.info('system', `argv: ${process.argv.join(' ')}`);
    },
};
