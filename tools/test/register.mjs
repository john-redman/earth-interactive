// Lets the browser modules run under `node --test`: resolves the importmap's `three` to the vendored copy and
// stubs the one browser global they read at import time (matchMedia). Used by `npm test` (see package.json).
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
