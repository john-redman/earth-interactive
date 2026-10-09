// Module resolution hooks for the unit tests: the same mapping as index.html's importmap.
const ROOT = new URL('../../', import.meta.url);
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: new URL('vendor/three/three.module.min.js', ROOT).href, shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: new URL('vendor/three/' + spec.slice('three/addons/'.length), ROOT).href, shortCircuit: true };
  return next(spec, ctx);
}
