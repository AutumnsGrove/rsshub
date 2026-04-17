# RSSHub Project TODOs

## High Priority

- [ ] Fix CF Workers deployment (1101 error) — `EventEmitter.captureRejections` not supported in Workers runtime
    - **Root cause:** winston logger (or dep) reads `EventEmitter.captureRejections` at module init, CF runtime returns `undefined` instead of `boolean`
    - **Next steps to try:**
        - Patch/polyfill `EventEmitter.captureRejections = false` in `lib/worker.ts` before other imports
        - Try `pnpm run container-deploy` (CF Containers — runs real Node.js, still on Cloudflare)
        - Check if winston can be swapped for a CF-compatible logger in the worker build
        - Check upstream RSSHub issues/PRs for CF Workers fixes
    - Local dev works fine: `pnpm run dev` serves on localhost:8787
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

## Notes

- **Live URL:** https://rsshub.m7jv4v7npb.workers.dev/ (currently broken, 1101)
- **CF Account:** AutumnsGrove (04e847fa7655624e84414a8280b3a4d0)
- **KV Namespace:** rsshub-cache (d508583cf8ee4fa99f9c36b2bdcf80eb)
- **Node requirement:** ^22.20.0 || ^24 (using v25.4.0 locally, works fine)
- **Package manager:** pnpm 10.33.0
- **Dependencies installed:** Yes (1174 packages)
- **The 1101 root cause:** CF Workers runtime returns `undefined` for `EventEmitter.captureRejections` instead of a boolean — breaks winston logger init at module load time
