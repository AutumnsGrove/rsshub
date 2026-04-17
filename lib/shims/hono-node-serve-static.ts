// No-op shim for @hono/node-server/serve-static in Cloudflare Workers
// registry.ts guards actual usage with !isWorker, but the top-level import
// still pulls in Node.js fs APIs — this shim prevents that.
import type { MiddlewareHandler } from 'hono';

export const serveStatic = (_options?: unknown): MiddlewareHandler => {
    return async (_c, next) => next();
};
