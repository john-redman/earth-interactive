# Marketing kit pipeline

Rebuilds everything in `marketing/` (posts, stories, banners, the Product Hunt gallery, profile images, screenshots,
three short videos, the contact sheet) and the link-preview image `og-image.png` from the live app. Captions and
the posting plan are in `marketing/captions.md`.

```bash
node tools/marketing/run.mjs                   # everything: capture → compose → video → og → contact
node tools/marketing/run.mjs compose contact   # only re-render the composed images (minutes, not an hour)
```

- **Needs:**
  - Playwright with Chromium: `npm i -D playwright`, or point `PLAYWRIGHT` at an existing copy's `index.mjs`.
  - `ffmpeg` for the videos.
  - ImageMagick (`identify`, `convert`) for the contact sheet.
- **Serves the repo itself** on `127.0.0.1:8765` (`MK_PORT` to change), so no dev server is needed.
- **Raw captures** go to `tools/marketing/.work/` (git-ignored). `compose` reuses them, so a text-only change
  doesn't need new captures.
- **The site address on every image** comes from `url` in `tools/site.config.mjs`. After the domain switch
  (`docs/launch-checklist.md`), run `compose video og contact`. Videos re-render their text overlays; add
  `capture` if the app's look has changed since the last capture.
- **Headless WebGL** runs in software (SwiftShader), about 1 frame a second. The scripts wait on frames, not
  time.

| Step | Scripts | Output |
|---|---|---|
| capture | `capture.mjs` (heroes, comparisons, lenses, cards, daily, views, phone UI, story raws), `recap.mjs` (views, desktop UI), `stories.mjs`, `hex.mjs` (comparison colours and ratios) | `.work/raw/` |
| compose | `brand.mjs` (profile images, banners), `gallery.mjs` (Product Hunt gallery, stories, screenshots), `posts.mjs` (square and portrait posts) | `marketing/…` |
| video | `video.mjs v01 \| v02 \| v03` (virtual clock, every frame stepped, overlays composited with ffmpeg) | `marketing/video/` |
| og | `og.mjs` | `og-image.png` |
| contact | `contact.mjs` | `marketing/contact-sheet.png` |

Shared helpers: `lib.mjs` (paths, browser, `openApp`, `look`, the UI hide list), `tpl.mjs` (page template,
brand styles, the printed address), `render.mjs` (HTML → PNG/JPEG).
