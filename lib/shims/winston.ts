// No-op winston shim for Cloudflare Workers
// The worker build uses logger.worker.ts instead of logger.ts (which imports winston),
// but this shim ensures the bundle never crashes if winston slips through the alias plugin.

const noop = () => {};

const format = {
    combine: (..._args: unknown[]) => ({}),
    timestamp: (_opts?: unknown) => ({}),
    printf: (_fn: unknown) => ({}),
    colorize: () => ({ colorize: (_level: string, str: string) => str }),
    json: () => ({}),
    simple: () => ({}),
    label: (_opts?: unknown) => ({}),
    errors: (_opts?: unknown) => ({}),
    splat: () => ({}),
    metadata: (_opts?: unknown) => ({}),
};

class ConsoleTransport {
    constructor(_opts?: unknown) {}
}

class FileTransport {
    constructor(_opts?: unknown) {}
}

const transports = {
    Console: ConsoleTransport,
    File: FileTransport,
};

function createLogger(_opts?: unknown) {
    return {
        error: noop,
        warn: noop,
        info: noop,
        http: noop,
        verbose: noop,
        debug: noop,
        silly: noop,
        log: noop,
        add: noop,
        remove: noop,
        clear: noop,
        close: noop,
        child: () => createLogger(),
        exceptions: { handle: noop },
        rejections: { handle: noop },
    };
}

export { createLogger, format, transports };
export default { createLogger, format, transports };
