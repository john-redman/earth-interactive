// Flag images (vendor/flags, from flag-icons). Emoji flags don't render on Windows, so the UI uses SVGs
// and falls back to the emoji only if an image is missing.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** `<img>` for a country's flag, or '' when it has none. */
export function flagImg(info, cls = 'flag') {
  if (!info?.iso2) return info?.flag ? `<span class="${cls}">${esc(info.flag)}</span>` : '';
  return `<img class="${cls}" src="vendor/flags/${esc(info.iso2.toLowerCase())}.svg" alt="" width="40" height="30" decoding="async" loading="lazy"`
    + ` data-emoji="${esc(info.flag || '')}" onerror="this.replaceWith(document.createTextNode(this.dataset.emoji))">`;
}
