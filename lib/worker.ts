// Cloudflare Worker entry point
// This file contains Worker-specific initialization and polyfills

// Polyfills must come first — this module's body runs before all other modules
// because it is the earliest leaf in the dependency graph.
import '@/utils/cf-polyfills';
// Initialize request-rewriter (sets up fetch wrapper with proper headers)
import '@/utils/request-rewriter';

// Polyfill MessagePort for undici compatibility
// undici uses MessagePort for type checking in webidl
if (globalThis.MessagePort === undefined) {
    // @ts-expect-error Minimal polyfill for undici compatibility
    globalThis.MessagePort = class MessagePort extends EventTarget {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onmessageerror: ((event: MessageEvent) => void) | null = null;
        start() {}
        close() {}
        postMessage(_message: unknown, _transfer?: Transferable[]) {}
    };
}

// Import and re-export the main app
// Worker-specific module replacements are handled by tsdown aliases
// Use dynamic import so any startup error is catchable and returnable as HTTP
let _app: { fetch: (req: Request, env: unknown, ctx: unknown) => Response | Promise<Response> } | null = null;
let _initError: unknown = null;

try {
    _app = (await import('./app.worker')).default as typeof _app;
} catch (error) {
    _initError = error;
}

export default {
    fetch(req: Request, env: unknown, ctx: unknown): Response | Promise<Response> {
        if (_initError) {
            const msg = _initError instanceof Error ? `${_initError.name}: ${_initError.message}\n\n${_initError.stack ?? ''}` : String(_initError);
            return new Response(`Worker initialization failed:\n\n${msg}`, {
                status: 500,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        return _app!.fetch(req, env, ctx);
    },
};
