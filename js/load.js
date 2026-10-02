// Start-up loading: downloads data/world.js with visible progress and drives the loader text + bar.
const loader = document.querySelector('.loader');
const label = loader?.querySelector('p'), bar = loader?.querySelector('.loader-bar i');

export function setLoader(text, fraction) {
  if (label && text) label.textContent = text;
  if (bar && fraction != null) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
}

/**
 * Fetch and evaluate the world data module, reporting progress (0–0.7 of the bar; drawing the
 * countries fills the rest). Falls back to a plain import if streaming isn't available.
 */
export async function loadWorld(url = new URL('../data/world.js', import.meta.url)) {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    // Content-Length is the compressed size when the server gzips, so only trust it for plain responses
    const total = res.headers.get('content-encoding') ? 0 : +res.headers.get('content-length') || 0;
    const reader = res.body.getReader(), chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      setLoader(`Loading map data… ${(got / 1e6).toFixed(1)} MB`, total ? 0.7 * got / total : 0.7 * (1 - Math.exp(-got / 6e5)));
    }
    const blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'text/javascript' }));
    try { return (await import(blobUrl)).default; } finally { URL.revokeObjectURL(blobUrl); }
  } catch {
    setLoader('Loading map data…');
    return (await import(url.href)).default;
  }
}
