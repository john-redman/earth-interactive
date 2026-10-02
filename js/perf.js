// Rendering quality for the device: a static tier picked at start-up, plus a resolution governor
// that trades pixel ratio for frame rate while the app runs.

const coarse = matchMedia('(pointer: coarse)').matches;
const cores = navigator.hardwareConcurrency || 4;
const memory = navigator.deviceMemory || 8; // GB; Chromium only, so assume plenty elsewhere

/** 'low' for phones/tablets and weak machines, 'high' otherwise. `?quality=low|high` overrides. */
export const TIER = (() => {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'low' || q === 'high') return q;
  return coarse || (cores <= 4 && memory <= 4) ? 'low' : 'high';
})();

export const QUALITY = TIER === 'low'
  ? { antialias: false, maxPixelRatio: 1.5, minPixelRatio: 1, oceanOctaves: 2, oceanSegments: [96, 72], atmosphereSegments: [64, 40], stars: 400, borderTolerance: 0.06 }
  : { antialias: true, maxPixelRatio: 2, minPixelRatio: 1, oceanOctaves: 3, oceanSegments: [160, 120], atmosphereSegments: [96, 64], stars: 700, borderTolerance: 0 };

document.documentElement.dataset.quality = TIER;

/**
 * Watches frame times and steps the pixel ratio down when frames run long, back up when there is headroom.
 * `apply(pr)` must set the renderer's pixel ratio and anything that depends on it.
 */
export class ResolutionGovernor {
  constructor(initial, apply) {
    this.pr = initial; this.apply = apply;
    this.max = initial; this.min = Math.min(initial, QUALITY.minPixelRatio);
    this.samples = []; this.goodWindows = 0; this.raises = 0;
  }

  frame(dtMs) {
    if (dtMs <= 0 || dtMs > 250) return; // tab switch, breakpoint, first frame
    this.samples.push(dtMs);
    if (this.samples.length < 45) return;
    const s = this.samples.sort((a, b) => a - b), median = s[s.length >> 1];
    this.samples = [];
    if (median > 22 && this.pr > this.min) { // under ~45 fps: shed pixels
      this.set(this.pr - 0.25); this.goodWindows = 0;
    } else if (median < 13 && this.pr < this.max && this.raises < 3) { // solid 60+: win some back, cautiously
      if (++this.goodWindows >= 4) { this.set(this.pr + 0.25); this.goodWindows = 0; this.raises++; }
    } else this.goodWindows = 0;
  }

  set(pr) {
    this.pr = Math.round(Math.min(this.max, Math.max(this.min, pr)) * 100) / 100;
    this.apply(this.pr);
  }
}
