# Sounds

Optional recorded loops for rollercoaster mode (`js/thrills.js`). The ride works without any
files here: the terrified crowd, the dread bed (sub throb, dissonant drone, distant groans) and
the fly-by screams are all synthesised in the browser on first unlock.

Recorded loops are **blended on top of** the synthesised crowd, each as a group of riders
circling the listener while the globe spins (up to four groups in total).

- 4–10 seconds each, trimmed to loop seamlessly, mono or stereo, peak around -1 dBFS.
- Use AAC in `.m4a` (plays in Safari and Chrome); aim for under ~150 KB per file
  (e.g. `ffmpeg -i in.wav -ac 1 -ar 32000 -c:a aac -b:a 48k out.m4a`).
- Licence must allow commercial use without attribution conditions we can't meet:
  **CC0 / public domain only** (Freesound filtered by CC0, OpenGameArt CC0, Wikimedia Commons PD).
  Not BBC (non-commercial). Avoid Pixabay (own licence, not CC0).
- Record title, author, URL and licence of every file in the table below **and** in
  `THIRD_PARTY_NOTICES.md`.
- Register them in `js/thrills.js`:

```js
samples: ['sounds/crowd-1.m4a', 'sounds/crowd-2.m4a'],
sampleMix: 1,   // level of each recorded loop
```

New files also need to be deployed (`.github/workflows/pages.yml` copies an explicit list of
directories) and, for offline use, listed in `CORE` in `sw.js`.

| File | Title / author | Source URL | Licence |
|---|---|---|---|
| _none yet_ | | | |

_2026-10: an attempt to source CC0 recordings failed because Freesound, OpenGameArt, Wikimedia
Commons, archive.org and Pixabay were unreachable from the build environment; the synthesis was
reworked instead._
