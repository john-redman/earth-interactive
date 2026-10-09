# After the domain is bought

Run these in order once the domain exists. The full plan (brand and domain choices, costs, email, social handles)
is in the owner's private planning page, not in this public repo:
https://claude.ai/artifact/JQRYGWQQTjLRLjR8otrzfX

1. **Service worker first, about two weeks before the switch.** Ship a version of `sw.js` that, on the github.io
   host, loads pages from the network (or unregisters itself). Otherwise returning visitors' old worker keeps serving
   the cached globe after the move, because its update check is redirected and fails.
2. **Point the domain at GitHub Pages:** repo Settings → Pages → Custom domain, then Enforce HTTPS. GitHub then
   301-redirects every `john-redman.github.io/earth-interactive/…` URL to the same path. Don't rename or transfer the
   repo afterwards, or the redirect may stop.
3. **Switch the URLs** (see `docs/seo.md` → "Moving to the custom domain later"): `url` in `tools/site.config.mjs`,
   `SITE_URL` in `js/site.js`, the canonical/OG/JSON-LD URLs in `index.html`, the embed snippet in `how-to-play.html`,
   and `contactEmail`. Keep every slug. Then re-render the marketing images, which print the address:
   `node tools/marketing/run.mjs compose video og contact` (`tools/marketing/README.md`).
4. **Search engines:** Search Console Domain property (DNS TXT), submit the sitemap, request indexing for key pages;
   Bing Webmaster Tools; run the IndexNow ping once.
5. **Now possible at the domain root:** `ads.txt`, `/.well-known/security.txt`; `robots.txt` and `llms.txt` are
   found where tools look for them.
6. **Leaderboard:** deploy the Worker + D1 (`server/`, `docs/backend.md`) at an `api.` subdomain and set `API_BASE`
   in `js/net/api.js`.
7. **Analytics:** set the GoatCounter code (`tools/site.config.mjs` and `js/analytics.js`; the build checks they match).
8. **Launch:** `docs/business/marketing-plan.md` §3 (pre-launch checklist and launch week), re-dated from go-live.
