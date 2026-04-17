# RSSHub Project TODOs

## High Priority

- [x] Fix CF Workers deployment (1101 error) — **FIXED in branch `claude/fix-cloudflare-deployment-bdAY9`**
    - **Root cause 1 (confirmed):** `node:worker_threads` was top-level-imported in `lib/shims/node-module.ts` — CF Workers throws on import of this module even with `nodejs_compat`. Fixed: removed import, added comment stub.
    - **Root cause 2 (belt-and-suspenders):** `workerAliasPlugin` only handled `@/` and relative imports; if rolldown pre-resolves `@/` to absolute paths before the plugin fires, `logger.ts` (winston) could slip through. Fixed: added absolute-path case to the plugin.
    - **Root cause 3 (belt-and-suspenders):** No explicit `winston` alias — if `logger.worker.ts` substitution ever misses, winston would crash. Fixed: added `'winston': lib/shims/winston.ts` alias + created shim.
    - **Root cause 4:** `@hono/node-server/serve-static` was top-level-imported in `registry.ts` (even though guarded at runtime by `!isWorker`). Pulls in Node.js fs APIs. Fixed: added `@hono/node-server/serve-static` alias to no-op shim.
    - **Root cause 5 (defensive):** `EventEmitter.captureRejections` polyfill. Added `lib/utils/cf-polyfills.ts` (imported first in `worker.ts`) that patches this before any other module runs.
    - **Remaining:** Pull locally, run `pnpm run worker-build && wrangler deploy` and verify.

- [ ] **Bundle size (~40 MB uncompressed / unknown gzip)** — see notes below
    - Wrangler re-bundles `dist-worker/worker.mjs` through esbuild AFTER tsdown builds it.
    - All 1500+ route modules are likely being inlined (static + dynamic imports all bundled).
    - If gzip size is within 10 MB (paid plan), the current size is fine — it deployed already.
    - **To reduce size if needed:**
        - Add `no_bundle = true` to `wrangler.toml` so wrangler uses tsdown's output as-is.
        - Check if tsdown produces code-split chunks (dynamic imports → separate `.mjs` files in `dist-worker/`).
        - If still too large: filter routes via `WORKER_ROUTES` env var in `build-routes.ts` (only build the 10–20 routes you actually use).
    - **We are staying on Cloudflare. No Vercel/Fly/etc.**

## Medium Priority

- [ ] Set up YouTube RSS feeds with shorts filtering (built-in, `filterShorts` defaults to `true`)
    - Route: `/youtube/channel/:id` — just need channel IDs
- [ ] Set up comic feeds — available routes:
    - `comicskingdom` (e.g. `/comicskingdom/pardon-my-planet`)
    - `mangadex`, `colamanga`, `copymanga`, `comic-walker`, `comic-fuz`
    - `xkcd` (via route dir, needs verification)
- [ ] Explore Hacker News feed (`/hackernews/:section?/:type?/:user?`)

## Low Priority / Future Ideas

- [ ] Set up ACCESS_KEY for production security (`wrangler secret put ACCESS_KEY`)
- [ ] Add YOUTUBE_KEY for better YouTube API access (avoids rate limits)
- [ ] Explore the 1500+ other route modules for useful feeds
- [ ] Route filtering for smaller bundle: implement `WORKER_ROUTES` allowlist in `scripts/workflow/build-routes.ts`

## Notes

- **Live URL:** https://rsshub.m7jv4v7npb.workers.dev/ (was broken with 1101; should be fixed after re-deploy)
- **CF Account:** AutumnsGrove (04e847fa7655624e84414a8280b3a4d0)
- **KV Namespace:** rsshub-cache (d508583cf8ee4fa99f9c36b2bdcf80eb)
- **Node requirement:** ^22.20.0 || ^24 (using v25.4.0 locally, works fine)
- **Package manager:** pnpm 10.33.0
- **Dependencies installed:** Yes (1174 packages)
- **CF Workers limits (paid plan):** 10 MB gzip / 64 MB uncompressed — deploy succeeds so we're within this
- **Build command:** `pnpm run worker-build` → `build:routes:worker` + `tsdown --config tsdown-worker.config.ts`
- **Key shims:** `lib/shims/` — dotenv-config, honeybadger, node-child-process, node-module (no worker_threads!), sentry-node, winston, xxhash-wasm, hono-node-serve-static
- **Key worker variants:** `lib/utils/logger.worker.ts`, `lib/utils/cache/index.worker.ts`, `lib/utils/otel/*.worker.ts`, `lib/utils/puppeteer.worker.ts`, `lib/utils/request-rewriter/index.worker.ts`, `lib/utils/directory-import.worker.ts`, `lib/utils/is-worker.worker.ts`
