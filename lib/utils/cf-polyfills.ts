// Cloudflare Workers runtime polyfills
// Imported as the FIRST statement in lib/worker.ts so this module's body
// executes before any other module's top-level code (ES module evaluation
// is depth-first: a leaf module runs before its importers).
import { EventEmitter } from 'node:events';

// winston/rejection-handler reads EventEmitter.captureRejections at module
// init time and crashes if the property is not a boolean.  CF Workers with
// nodejs_compat should provide it, but patch defensively just in case.
if (typeof (EventEmitter as unknown as Record<string, unknown>).captureRejections !== 'boolean') {
    (EventEmitter as unknown as Record<string, unknown>).captureRejections = false;
}
