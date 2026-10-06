// In-memory per-key rate limiter with the same shape as Cloudflare's Rate Limiting binding:
// `await limiter.limit({ key }) → { success }`. Fixed windows, so a client gets at most `limit` requests
// per `periodMs` (up to 2× across a window boundary — fine for stopping floods). One process only:
// counters reset on restart, which is acceptable for an anti-flood limit.

export function createRateLimiter({ limit, periodMs = 60_000, now = Date.now } = {}) {
  let windowStart = now();
  let counts = new Map();
  return {
    async limit({ key }) {
      const t = now();
      if (t - windowStart >= periodMs) {           // new window: drop every old counter at once
        windowStart = t - ((t - windowStart) % periodMs);
        counts = new Map();
      }
      const n = (counts.get(key) || 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    },
    get size() { return counts.size; },
  };
}
