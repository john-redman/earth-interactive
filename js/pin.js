// Map pin for the selected country. Drawn as an SVG overlay rather than a mesh, so it stays razor sharp at
// any pixel ratio (the globe itself may render at reduced resolution on phones). It is placed every frame
// at the projected point, drops in with a small bounce and fades out when its spot turns away.
const W = 40, H = 58;          // CSS px; the needle tip sits at the bottom centre
let uid = 0;

/** Mix two #rrggbb colours (t = share of b). */
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

function svg(color) {
  const id = 'pin' + (++uid);
  return `<svg viewBox="0 0 40 58" width="${W}" height="${H}" aria-hidden="true">
    <defs>
      <radialGradient id="${id}h" cx="38%" cy="32%" r="70%">
        <stop offset="0" stop-color="#fff"/>
        <stop offset="0.16" stop-color="${mix(color, '#ffffff', 0.55)}"/>
        <stop offset="0.6" stop-color="${color}"/>
        <stop offset="1" stop-color="${mix(color, '#000000', 0.55)}"/>
      </radialGradient>
      <linearGradient id="${id}n" x1="0" x2="1">
        <stop offset="0" stop-color="#8d94ad"/><stop offset="0.45" stop-color="#ffffff"/><stop offset="1" stop-color="#6c7390"/>
      </linearGradient>
      <radialGradient id="${id}s"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse class="pin-shadow" cx="20" cy="55.5" rx="9" ry="2.6" fill="url(#${id}s)"/>
    <g class="pin-body">
      <path d="M18.6 26 L20 56 L21.4 26 Z" fill="url(#${id}n)"/>
      <circle cx="20" cy="15" r="12.5" fill="url(#${id}h)"/>
      <circle cx="20" cy="15" r="12.5" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.8"/>
      <ellipse cx="15.6" cy="9.6" rx="4.2" ry="2.6" fill="#fff" opacity="0.75" transform="rotate(-28 15.6 9.6)"/>
    </g>
  </svg>`;
}

export class Pin {
  constructor(stage, { color = '#9d4dff' } = {}) {
    this.el = document.createElement('div');
    this.el.className = 'map-pin'; this.el.hidden = true;
    this.el.innerHTML = svg(color);
    stage.append(this.el);
    this.height = H - 4; // where the tag should sit above the tip
  }

  show() {
    this.el.hidden = false;
    this.el.classList.remove('drop'); void this.el.offsetWidth; this.el.classList.add('drop');
  }

  hide() { this.el.hidden = true; }
  get visible() { return !this.el.hidden; }

  /** Called every frame with the projected anchor (CSS px). */
  place(x, y, visible) {
    if (this.el.hidden) return;
    this.el.style.transform = `translate(${(x - W / 2).toFixed(1)}px, ${(y - H).toFixed(1)}px)`;
    this.el.classList.toggle('away', !visible);
  }
}
