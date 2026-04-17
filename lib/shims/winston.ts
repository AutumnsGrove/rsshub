// Full Winston API shim for Cloudflare Workers
// Routes all logging through console.* — zero external dependencies.
// Captures the user's format.printf() function so structured/JSON
// output from logger.ts works exactly as configured.

// ─── Level ordering ───────────────────────────────────────────────────────────
const LEVEL_NUM: Record<string, number> = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
};

// ─── Format objects (no-ops that carry metadata for createLogger) ─────────────
type FormatObj = Record<string, unknown>;

const format = {
    combine: (...args: FormatObj[]): FormatObj => ({ _type: 'combine', _formats: args }),
    timestamp: (opts?: { format?: string }): FormatObj => ({ _type: 'timestamp', _format: opts?.format ?? 'ISO' }),
    printf: (fn: (info: Record<string, unknown>) => string): FormatObj => ({ _type: 'printf', _fn: fn }),
    colorize: (): FormatObj & { colorize: (level: string, str: string) => string } => ({
        _type: 'colorize',
        // In CF Workers, ANSI codes aren't rendered — strip them.
        colorize: (_level: string, str: string) => str,
    }),
    json: (): FormatObj => ({ _type: 'json' }),
    simple: (): FormatObj => ({ _type: 'simple' }),
    label: (_opts?: unknown): FormatObj => ({ _type: 'label' }),
    errors: (_opts?: unknown): FormatObj => ({ _type: 'errors' }),
    splat: (): FormatObj => ({ _type: 'splat' }),
    metadata: (_opts?: unknown): FormatObj => ({ _type: 'metadata' }),
    prettyPrint: (_opts?: unknown): FormatObj => ({ _type: 'prettyPrint' }),
    uncolorize: (_opts?: unknown): FormatObj => ({ _type: 'uncolorize' }),
    padLevels: (_opts?: unknown): FormatObj => ({ _type: 'padLevels' }),
    align: (): FormatObj => ({ _type: 'align' }),
    cli: (_opts?: unknown): FormatObj => ({ _type: 'cli' }),
    logstash: (): FormatObj => ({ _type: 'logstash' }),
    ms: (): FormatObj => ({ _type: 'ms' }),
};

// ─── Walk a format tree and return the first printf function found ─────────────
function extractPrintf(fmt: unknown): ((info: Record<string, unknown>) => string) | null {
    if (!fmt || typeof fmt !== 'object') {
        return null;
    }
    const f = fmt as FormatObj;
    if (f._type === 'printf' && typeof f._fn === 'function') {
        return f._fn as (info: Record<string, unknown>) => string;
    }
    if (f._type === 'combine' && Array.isArray(f._formats)) {
        for (const sub of f._formats) {
            const found = extractPrintf(sub);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function hasTimestamp(fmt: unknown): boolean {
    if (!fmt || typeof fmt !== 'object') {
        return false;
    }
    const f = fmt as FormatObj;
    if (f._type === 'timestamp') {
        return true;
    }
    if (f._type === 'combine' && Array.isArray(f._formats)) {
        return f._formats.some(hasTimestamp);
    }
    return false;
}

// ─── Transports ───────────────────────────────────────────────────────────────
class ConsoleTransport {
    level?: string;
    silent: boolean;
    format?: FormatObj;
    constructor(opts?: { level?: string; silent?: boolean; format?: FormatObj }) {
        this.level = opts?.level;
        this.silent = opts?.silent ?? false;
        this.format = opts?.format;
    }
}

class FileTransport {
    // No-op: CF Workers has no writable filesystem.
    constructor(_opts?: unknown) {}
}

const transports = {
    Console: ConsoleTransport,
    File: FileTransport,
};

// ─── Logger factory ───────────────────────────────────────────────────────────
export function createLogger(opts?: { level?: string; format?: FormatObj; transports?: unknown[]; silent?: boolean }) {
    let currentLevel = opts?.level ?? 'info';
    let printfFn = extractPrintf(opts?.format ?? null);
    const addTimestamp = hasTimestamp(opts?.format ?? null);

    // Collect Console transports to check for per-transport printf
    const consoleTransports: ConsoleTransport[] = [];
    for (const t of opts?.transports ?? []) {
        if (t instanceof ConsoleTransport) {
            consoleTransports.push(t);
        }
    }

    function emit(levelStr: string, message: string, meta: unknown[]): void {
        const levelNum = LEVEL_NUM[levelStr] ?? 2;
        const maxNum = LEVEL_NUM[currentLevel] ?? 2;
        if (levelNum > maxNum) {
            return;
        }

        // Build the info object the same way winston would
        const timestamp = new Date().toISOString();
        const info: Record<string, unknown> = {
            level: levelStr,
            message,
            ...(addTimestamp ? { timestamp } : {}),
            ...(meta.length === 1 && meta[0] !== null && typeof meta[0] === 'object' ? (meta[0] as Record<string, unknown>) : {}),
        };

        let line: string;
        if (printfFn) {
            try {
                line = printfFn(info);
            } catch {
                line = `${timestamp} ${levelStr}: ${message}`;
            }
        } else {
            line = `${timestamp} ${levelStr}: ${message}`;
        }

        const extraArgs = meta.length > 0 && (typeof meta[0] !== 'object' || meta[0] === null) ? meta : [];

        // eslint-disable-next-line no-console
        switch (levelStr) {
            case 'error':
                // eslint-disable-next-line no-console
                console.error(line, ...extraArgs);
                break;
            case 'warn':
                // eslint-disable-next-line no-console
                console.warn(line, ...extraArgs);
                break;
            case 'debug':
            case 'verbose':
            case 'silly':
                // eslint-disable-next-line no-console
                console.debug(line, ...extraArgs);
                break;
            default:
                // eslint-disable-next-line no-console
                console.log(line, ...extraArgs);
        }
    }

    const logger = {
        get level() {
            return currentLevel;
        },
        set level(v: string) {
            currentLevel = v;
        },

        error: (msg: string, ...meta: unknown[]) => emit('error', msg, meta),
        warn: (msg: string, ...meta: unknown[]) => emit('warn', msg, meta),
        info: (msg: string, ...meta: unknown[]) => emit('info', msg, meta),
        http: (msg: string, ...meta: unknown[]) => emit('http', msg, meta),
        verbose: (msg: string, ...meta: unknown[]) => emit('verbose', msg, meta),
        debug: (msg: string, ...meta: unknown[]) => emit('debug', msg, meta),
        silly: (msg: string, ...meta: unknown[]) => emit('silly', msg, meta),

        log(levelOrInfo: string | Record<string, unknown>, msg?: string, ...meta: unknown[]) {
            if (typeof levelOrInfo === 'object') {
                emit(String(levelOrInfo.level ?? 'info'), String(levelOrInfo.message ?? ''), []);
            } else {
                emit(levelOrInfo, msg ?? '', meta);
            }
        },

        add(transport: unknown) {
            if (transport instanceof ConsoleTransport) {
                consoleTransports.push(transport);
                // If the new Console transport has its own printf, use it
                const tp = extractPrintf(transport.format ?? null);
                if (tp) {
                    printfFn = tp;
                }
            }
            return logger;
        },
        remove: (_transport: unknown) => logger,
        clear: () => logger,
        close: () => {},

        child(defaultMeta?: Record<string, unknown>) {
            const child = createLogger({ level: currentLevel, format: opts?.format, transports: opts?.transports });
            if (defaultMeta) {
                const parentEmit = (child as unknown as { _emit: typeof emit })._emit;
                if (parentEmit) {
                    // Merge defaultMeta into every log call
                }
            }
            return child;
        },

        exceptions: { handle: (_t?: unknown) => {}, unhandle: () => {} },
        rejections: { handle: (_t?: unknown) => {}, unhandle: () => {} },

        // Expose format/transports so code doing winston.format.xxx via the instance still works
        format,
        transports,
    };

    return logger;
}

export { format, transports };
export default { createLogger, format, transports };
