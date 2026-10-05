// The name rules live in one place, js/net/profanity.js, so the browser and the API can't drift apart.
// Wrangler bundles the Worker with esbuild, which follows this relative import outside server/.
// server/test/shared.test.mjs checks the re-export stays wired up.
export * from '../../js/net/profanity.js';
