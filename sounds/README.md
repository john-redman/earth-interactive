# Sounds

Short recorded effects and music used by the app. Supplied by the owner as licence-free (Pixabay Content License); sources are listed in `THIRD_PARTY_NOTICES.md`.

| File | Used by | Notes |
|------|---------|-------|
| `pin-drop.mp3` | `js/sfx.js` (`tap`) | Plays with the synthesised knock when the pin drops |
| `swipe.mp3` | `js/sfx.js` (`open` / `close`) | Played backwards for closing (reversed in code) |
| `click.mp3` | `js/sfx.js` (`snapOut` / `snapIn`) | Compare pieces lifting out / settling back (reversed in code) |
| `crowd-panic.mp3` | `js/thrills.js` (`THRILLS.samples`) | Seamless 20.6 s loop (end crossfaded into start) |
| `celestial-drift.mp3` | `js/music.js` | Background music, off by default |

Processing (ffmpeg): mono 96 kbps for the short effects, loudness-normalised (-18 LUFS effects, -20 crowd, -24 music).
The service worker does not cache this folder (media requests use byte ranges); the Pages workflow publishes it.
