'use strict';
/* ====== helpers ====== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}-${MON[+m - 1]}-${y.slice(2)}`; };
const fmtTs = (ts) => { if (!ts) return ''; const d = new Date(ts.replace(' ', 'T') + 'Z'); return `${fmtDate(d.toLocaleDateString('en-CA'))} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`; };
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const todayIso = () => new Date().toLocaleDateString('en-CA');
const sizeStr = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const statusCls = (s) => 's-' + String(s).toLowerCase().replace(/[^a-z]+/g, '-');
const badge = (s) => `<span class="badge ${statusCls(s)}">${esc(s)}</span>`;
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function fmtVal(f, v) {
  if (v === '' || v == null) return '<span class="muted">—</span>';
  if (f.type === 'date') return esc(fmtDate(v));
  if (f.type === 'money') return esc(inr(v));
  if (f.type === 'number') return esc(Number(v).toLocaleString('en-IN'));
  if (/^https?:\/\/\S+$/i.test(v)) return `<a href="${esc(v)}" target="_blank" rel="noopener">Open link</a>`;
  return esc(v);
}
function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

/* ====== icons (inline SVG, stroke style) ====== */
const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7z"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
  laptop: '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/>',
  usb: '<rect x="7" y="9" width="10" height="12" rx="2"/><path d="M9 9V3h6v6M10.5 5.5h.01M13.5 5.5h.01"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  chair: '<path d="M7 11V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6"/><path d="M5 11h14v4H5zM7 15v6M17 15v6"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/>',
  drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>',
  cup: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3"/>',
  contact: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 9h3M15 13h3"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  rupee: '<path d="M6 3h12M6 8h12M6 3h4a5 5 0 0 1 0 10H6l9 8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4M8 9h8M8 13h5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0z"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.box}</svg>`;
/* icons for record fields, picked from the field label, then the field type */
const FIELD_ICONS = [
  [/phone|mobile|telephone|jio|\bsim\b/i, 'phone'], [/e-?mail/i, 'mail'], [/serial|imei/i, 'hash'], [/brand|make/i, 'tag'],
  [/assigned|user|employee|person|owner|issued to|^name$|staff/i, 'user'], [/location|site|address|floor|room|branch/i, 'pin'],
  [/vendor|supplier|dealer/i, 'truck'], [/cost|amount|price|rent|₹|payment/i, 'rupee'], [/processor|\bram\b|storage|cpu|memory/i, 'cpu'],
  [/operating|\bos\b|software|licen|apple id|password/i, 'key'], [/link|url/i, 'link'], [/remark|note|description|detail/i, 'note'],
  [/condition/i, 'star'], [/warranty|cover/i, 'shield'], [/qty|quantity|count/i, 'layers'], [/model|product|type|device/i, 'box'],
];
const fieldIcon = (f) => { const m = FIELD_ICONS.find(([re]) => re.test(f.label)); if (m) return m[1]; return { date: 'calendar', money: 'rupee', number: 'hash', select: 'list', textarea: 'note' }[f.type] || 'dot'; };
/* icons for history entry types */
const HIST_ICONS = { 'Purchase': 'cart', 'Issued / Assigned': 'user', 'Returned': 'undo', 'Transferred': 'swap', 'Repair / Service': 'wrench', 'Maintenance': 'shield',
  'Inspection': 'search', 'Reading': 'gauge', 'Payment / Invoice': 'receipt', 'Note': 'note', 'Other': 'dot', 'Created': 'sparkle', 'Updated': 'edit', 'Status Change': 'refresh' };
const STATUS_ICONS = { 'Active': 'check', 'In Stock': 'box', 'Issued': 'user', 'Under Repair': 'wrench', 'Inactive': 'dot', 'Lost': 'alert', 'Scrapped': 'trash' };
/* each sidebar group gets a colour tone, used for its category icons */
const groupTone = (g) => { const gs = [...new Set(state.cats.map((c) => c.grp))]; return 'tone-' + (Math.max(0, gs.indexOf(g)) % 7); };
/* recently opened items, kept per browser */
const recentGet = () => { try { return JSON.parse(localStorageGet('recent') || '[]'); } catch { return []; } };
function recentPush(x) { const r = recentGet().filter((y) => y.code !== x.code); r.unshift(x); localStorageSet('recent', JSON.stringify(r.slice(0, 8))); }
const CAT_ICONS = [
  [/laptop|apple/i, 'laptop'], [/mouse/i, 'mouse'], [/pendrive|usb/i, 'usb'], [/camera|cctv/i, 'camera'],
  [/\bpc\b|monitor|\btv\b|it list|computer|desktop/i, 'monitor'], [/deco|hotspot|internet|wifi|router/i, 'wifi'],
  [/\bups\b|battery|inverter/i, 'battery'], [/telephone|jio|mobile|sim/i, 'phone'], [/contact/i, 'contact'],
  [/licen[cs]e|software/i, 'key'], [/table|chair|almirah|sofa|bag|furniture/i, 'chair'], [/\bac\b|fan|heater|cooler/i, 'wind'],
  [/electric/i, 'bolt'], [/fridge|water|purifier/i, 'drop'], [/kitchen|pantry/i, 'cup'], [/attendance/i, 'calendar'],
  [/vendor|supplier/i, 'truck'], [/asset of|office|branch/i, 'building'],
];
const catIcon = (name) => (CAT_ICONS.find(([re]) => re.test(name)) || [0, 'box'])[1];
const emptyState = (title, sub = '', ic = 'inbox') => `<div class="empty-state"><span class="e-ic">${icon(ic)}</span><b>${esc(title)}</b>${sub}</div>`;
function paintIconSlots(root = document) { $$('.ic-slot[data-ic]', root).forEach((s) => { if (!s.firstChild) s.innerHTML = icon(s.dataset.ic); }); }

let toastTimer;
function toast(msg, err) {
  const t = $('#toast'); t.innerHTML = icon(err ? 'alert' : 'check') + `<span>${esc(msg)}</span>`;
  t.className = 'toast noprint' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, err ? 5000 : 2800);
}
async function api(url, opts = {}) {
  const o = { credentials: 'same-origin', ...opts };
  if (o.json !== undefined) { o.method = o.method || 'POST'; o.headers = { 'Content-Type': 'application/json' }; o.body = JSON.stringify(o.json); }
  const r = await fetch(url, o);
  if (r.status === 401 && !url.includes('/api/login')) { showLogin(); throw new Error('Please sign in'); }
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('json') ? await r.json() : null;
  if (!r.ok) throw new Error((body && body.error) || 'Request failed');
  return body;
}
const isAdmin = () => state.me && state.me.role === 'admin';
const state = { me: null, cats: [], meta: {} };
const catById = (id) => state.cats.find((c) => c.id === Number(id));

/* ====== theme ====== */
const THEMES = ['auto', 'light', 'dark'];
function applyTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  localStorageSet('theme', t);
  const b = $('#theme-btn'); b.innerHTML = icon({ auto: 'auto', light: 'sun', dark: 'moon' }[t]);
  b.title = `Theme: ${t === 'auto' ? 'follow system' : t} (click to change)`;
}
applyTheme(THEMES.includes(localStorageGet('theme')) ? localStorageGet('theme') : 'auto');
$('#theme-btn').onclick = () => { const cur = localStorageGet('theme') || 'auto'; const nx = THEMES[(THEMES.indexOf(cur) + 1) % 3]; applyTheme(nx); toast(`Theme: ${nx === 'auto' ? 'follows system' : nx}`); };

/* ====== modal ====== */
function modal({ title, body, footer = '', size = '', onMount }) {
  const root = $('#modal-root');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h2>${esc(title)}</h2>
    <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div><div class="modal-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ''}</div>`;
  const prevFocus = document.activeElement;
  const close = () => {
    bg.remove(); if (!$('.modal-bg')) document.body.style.overflow = '';
    if (bg._onClose) bg._onClose();
    if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
  };
  bg._close = close;
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) bg._down = true; });
  bg.addEventListener('click', (e) => { if (e.target === bg && bg._down) close(); bg._down = false; });
  bg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  root.appendChild(bg); document.body.style.overflow = 'hidden';
  const m = { el: bg, close, $: (s) => $(s, bg), $$: (s) => $$(s, bg), setErr(msg) { const e = $('.form-err', bg); if (e) { e.textContent = msg; e.hidden = !msg; if (msg) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } } };
  if (onMount) onMount(m);
  if (window.matchMedia('(min-width:761px)').matches) {
    const first = $('.modal-b input:not([type=checkbox]):not([type=file]):not([disabled]), .modal-b select, .modal-b textarea', bg);
    if (first) first.focus(); else { const ok = $('.modal-f .btn.primary, .modal-f .btn.danger', bg); if (ok) ok.focus(); }
  }
  return m;
}
function confirmBox(title, msg, okLabel = 'Delete') {
  return new Promise((res) => {
    const m = modal({ title, size: 'narrow', body: `<p style="margin:0">${msg}</p>`, footer: `<button class="btn" data-close>Cancel</button><button class="btn danger" id="ok">${icon('trash')}${esc(okLabel)}</button>` });
    m.el._onClose = () => res(false);
    m.$('#ok').onclick = () => { m.el._onClose = null; m.close(); res(true); };
  });
}
function busy(btn, on) { btn.disabled = on; btn.dataset.t = btn.dataset.t || btn.innerHTML; btn.innerHTML = on ? 'Please wait…' : btn.dataset.t; }

/* ====== auth / boot ====== */
function showLogin() {
  $('#app').hidden = true; $('#login').hidden = false; document.title = 'Sign in';
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, err = $('#login-err'), btn = $('button[type=submit]', f); err.hidden = true; busy(btn, true);
  try { await api('/api/login', { json: { username: f.username.value, password: f.password.value } }); f.password.value = ''; await boot(); }
  catch (ex) { err.textContent = ex.message; err.hidden = false; }
  busy(btn, false);
});
$('#pw-eye').onclick = () => {
  const i = $('#login-form').password, show = i.type === 'password';
  i.type = show ? 'text' : 'password'; $('#pw-eye').textContent = show ? 'Hide' : 'Show'; $('#pw-eye').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};
async function boot() {
  try {
    const me = await api('/api/me');
    state.me = me.user; state.meta = me;
    state.cats = await api('/api/categories');
  } catch { return; }
  $('#login').hidden = true; $('#app').hidden = false;
  $('#brand-name').textContent = 'Admin MIS';
  document.title = state.meta.orgName + ' MIS';
  $('#user-btn').innerHTML = `<span class="avatar">${esc(initials(state.me.name))}</span><span class="u-txt"><span class="u-name">${esc(state.me.name)}</span><span class="u-role">${esc(state.me.role)}</span></span>`;
  $('#user-btn').title = `${state.me.name} (${state.me.role})`;
  $('#user-head').innerHTML = `<b>${esc(state.me.name)}</b><span>${esc(state.me.username || '')} · ${esc(state.me.role)}</span>`;
  $('#pw-banner').hidden = !state.me.must_change;
  renderSide(); route(); refreshBell();
  clearInterval(window.__bellT); window.__bellT = setInterval(refreshBell, 5 * 60 * 1000);
}
async function refreshCats() { state.cats = await api('/api/categories'); renderSide(); }

/* ====== sidebar ====== */
let sideFilter = '';
const closedGroups = new Set((() => { try { return JSON.parse(localStorageGet('sideClosed') || '[]'); } catch { return []; } })());
function renderSide() {
  const side = $('#side'), scroll = side.scrollTop;
  const groups = [...new Set(state.cats.map((c) => c.grp))];
  const cur = location.hash;
  const q = sideFilter.toLowerCase();
  const link = (href, on, ic, label, n, tone = '') => `<a href="${href}" class="${on ? 'on' : ''} ${tone}" title="${label.replace(/&amp;/g, '&')}">${icon(ic)}<span class="t">${label}</span>${n != null ? `<span class="n ${n ? '' : 'zero'}">${n}</span>` : ''}</a>`;
  let h = `<div class="side-top"><a class="brand" href="#/"><img class="brand-logo" src="/img/logo.png" alt="Perfact"><span class="brand-sep"></span><span>Admin MIS</span></a>
      <button class="icon-btn" id="side-close" aria-label="Close menu">${icon('x')}</button></div>
    ${link('#/', cur === '#/' || cur === '', 'home', 'Dashboard')}
    ${link('#/history', cur.startsWith('#/history'), 'clock', 'History log')}
    ${link('#/help', cur.startsWith('#/help'), 'help', 'Help &amp; guide')}
    <div class="side-filter"><span class="ic-slot">${icon('search')}</span><input type="search" id="side-q" placeholder="Find a category…" value="${esc(sideFilter)}" aria-label="Filter categories"></div>`;
  let shown = 0;
  for (const g of groups) {
    const cats = state.cats.filter((x) => x.grp === g && (!q || x.name.toLowerCase().includes(q) || x.prefix.toLowerCase().includes(q)));
    if (!cats.length) continue;
    shown += cats.length;
    const hasOn = cats.some((c) => cur === '#/c/' + c.id);
    const closed = !q && !hasOn && closedGroups.has(g);
    h += `<button type="button" class="grp ${groupTone(g)} ${closed ? 'closed' : ''}" data-grp="${esc(g)}" aria-expanded="${!closed}"><span><i class="gdot"></i>${esc(g)}</span>${icon('chev')}</button><div class="grp-body ${closed ? 'closed' : ''}">`;
    for (const c of cats) h += link(`#/c/${c.id}`, cur === '#/c/' + c.id, catIcon(c.name), esc(c.name), c.count, groupTone(g));
    h += '</div>';
  }
  if (q && !shown) h += `<div class="no-match">No category matches “${esc(sideFilter)}”.</div>`;
  if (isAdmin()) {
    h += `<div class="grp static">Administration</div>
      ${link('#/categories', cur === '#/categories', 'layers', 'Categories &amp; fields')}
      ${link('#/users', cur === '#/users', 'users', 'Users')}
      ${link('#/settings', cur === '#/settings', 'sliders', 'Settings &amp; backup')}`;
  }
  h += `<button type="button" class="side-collapse" id="side-mini" title="Collapse or expand the menu ( [ )">${icon('panel')}<span class="t">Collapse menu</span></button>`;
  side.innerHTML = h; side.scrollTop = scroll;
  $('#side-close').onclick = () => toggleSide(false);
  $('#side-mini').onclick = () => setMini(!document.body.classList.contains('side-mini'));
  const sq = $('#side-q');
  sq.oninput = (e) => { sideFilter = e.target.value; const pos = e.target.selectionStart; renderSide(); const n = $('#side-q'); n.focus(); n.setSelectionRange(pos, pos); };
  sq.onkeydown = (e) => { if (e.key === 'Enter') { const a = $('.grp-body a', side); if (a) { location.hash = a.getAttribute('href'); sideFilter = ''; } } };
  $$('.bnav [data-bn]').forEach((a) => a.classList.toggle('on', (a.dataset.bn === 'home' && (cur === '#/' || cur === '')) || (a.dataset.bn === 'history' && cur.startsWith('#/history'))));
}
function toggleSide(open) {
  const side = $('#side'); open = open ?? !side.classList.contains('open');
  side.classList.toggle('open', open); $('#scrim').hidden = !open;
  $('#menu-btn').setAttribute('aria-expanded', String(open));
}
$('#menu-btn').innerHTML = icon('menu');
const isNarrow = () => window.matchMedia('(max-width:900px)').matches;
function setMini(on) { document.body.classList.toggle('side-mini', on); localStorageSet('sideMini', on ? '1' : '0'); }
if (localStorageGet('sideMini') === '1') document.body.classList.add('side-mini');
$('#menu-btn').onclick = () => { if (isNarrow()) toggleSide(); else setMini(!document.body.classList.contains('side-mini')); };
$('#scrim').onclick = () => toggleSide(false);
$('#side').addEventListener('click', (e) => {
  const g = e.target.closest('button.grp[data-grp]');
  if (g && document.body.classList.contains('side-mini') && !isNarrow()) { setMini(false); return; }
  if (g) {
    const name = g.dataset.grp, body = g.nextElementSibling, closed = !g.classList.contains('closed');
    g.classList.toggle('closed', closed); body.classList.toggle('closed', closed); g.setAttribute('aria-expanded', String(!closed));
    closed ? closedGroups.add(name) : closedGroups.delete(name); localStorageSet('sideClosed', JSON.stringify([...closedGroups]));
    return;
  }
  if (e.target.closest('a')) toggleSide(false);
});

/* ====== top bar ====== */
$('.search-ic').innerHTML = icon('search');
$('#search-open').innerHTML = icon('search');
$('#search-close').innerHTML = icon('x');
$('#help-btn').innerHTML = icon('help');
$('#help-btn').onclick = () => { location.hash = '#/help'; };
paintIconSlots();
$('#user-btn').onclick = (e) => { e.stopPropagation(); $('#bell-menu').hidden = true; $('#user-menu').hidden = !$('#user-menu').hidden; };
document.addEventListener('click', () => { $('#user-menu').hidden = true; $('#gresults').hidden = true; $('#bell-menu').hidden = true; });
$('#user-menu').addEventListener('click', async (e) => {
  const act = (e.target.closest('[data-act]') || {}).dataset?.act;
  if (act === 'out') { endTour(); await api('/api/logout', { method: 'POST' }); location.hash = '#/'; showLogin(); }
  if (act === 'pw') changePassword();
  if (act === 'help') showShortcuts();
  if (act === 'tour') startTour('main');
  if (act === 'guide') location.hash = '#/help';
});
$$('#user-menu [data-act]').forEach((b) => { b.insertAdjacentHTML('afterbegin', icon({ pw: 'key', help: 'keyboard', out: 'logout', tour: 'sparkle', guide: 'help' }[b.dataset.act])); });
$('#pw-banner-btn').onclick = changePassword;

/* ====== alerts bell (due, expiring, overdue) ====== */
let dueCache = null;
async function refreshBell() {
  try { dueCache = await api('/api/dashboard'); paintBell(); } catch { /* ignore */ }
}
function paintBell() {
  if (!dueCache) return;
  const late = dueCache.expiring.filter((x) => x.days < 0).length, n = dueCache.expiringTotal;
  const b = $('#bell-n'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n; b.classList.toggle('late', late > 0);
  $('#bell-btn').title = n ? `${n} item${n === 1 ? '' : 's'} due or expiring${late ? `, ${late} overdue` : ''}` : 'Nothing due in the next 60 days';
  $('#bell-menu').innerHTML = '<div class="menu-head"><b>Due and expiring</b><span>Next 60 days, plus anything overdue</span></div>' + (dueCache.expiring.length
    ? `<div class="bell-list">${dueCache.expiring.slice(0, 12).map((x) => `<a href="#/item/${x.code}" class="bell-row ${x.days < 0 ? 'late' : ''}"><span class="b-ic">${icon(x.days < 0 ? 'alert' : 'calendar')}</span><span class="b-main"><b class="mono">${esc(x.code)}</b><span>${esc(x.field)} · ${fmtDate(x.date)}</span></span><span class="pill ${x.days < 0 ? 'late' : 'soon'}">${x.days < 0 ? Math.abs(x.days) + 'd late' : x.days === 0 ? 'today' : 'in ' + x.days + 'd'}</span></a>`).join('')}</div>
      ${dueCache.expiring.length > 12 ? `<a class="bell-all" href="#/">See all ${dueCache.expiring.length} on the dashboard</a>` : ''}`
    : emptyState('All clear', '<div class="small">Nothing is due in the next 60 days.</div>', 'check'));
}
$('#bell-btn').onclick = (e) => { e.stopPropagation(); $('#user-menu').hidden = true; const m = $('#bell-menu'); m.hidden = !m.hidden; if (!m.hidden) paintBell(); };
$('#bell-menu').addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('a')) $('#bell-menu').hidden = true; });

/* ====== keyboard shortcuts help ====== */
function showShortcuts() {
  const rows = [['/', 'Search all items'], ['S', 'Scan a QR label'], ['N', 'Add an item (on a category page)'], ['G then D', 'Go to dashboard'],
    ['G then H', 'Go to history log'], ['[', 'Collapse or expand the menu'], ['Esc', 'Close a window or menu'], ['?', 'Show this list']];
  modal({ title: 'Keyboard shortcuts', size: 'narrow', body: `<div class="kbd-list">${rows.map(([k, t]) => `<div><span>${t}</span><span>${k.split(' then ').map((x) => `<kbd>${x}</kbd>`).join(' <small>then</small> ')}</span></div>`).join('')}</div>` });
}
function changePassword() {
  modal({ title: 'Change password', size: 'narrow', body: `<div class="form-err" hidden></div>
    <label class="field"><span>Current password</span><input id="cp0" type="password" autocomplete="current-password"></label>
    <label class="field"><span>New password (min 8 characters)</span><input id="cp1" type="password" autocomplete="new-password"></label>`,
  footer: '<button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Update password</button>',
  onMount(m) {
    m.$('#save').onclick = async () => {
      try { await api('/api/me/password', { json: { current: m.$('#cp0').value, next: m.$('#cp1').value } }); state.me.must_change = false; $('#pw-banner').hidden = true; m.close(); toast('Password updated'); }
      catch (e) { m.setErr(e.message); }
    };
    m.$('#cp1').onkeydown = (e) => { if (e.key === 'Enter') m.$('#save').click(); };
  } });
}
let st;
$('#gsearch').addEventListener('input', (e) => {
  clearTimeout(st); const q = e.target.value.trim(), box = $('#gresults');
  if (q.length < 2) { box.hidden = true; return; }
  st = setTimeout(async () => {
    try {
      const r = await api('/api/search?q=' + encodeURIComponent(q));
      box.innerHTML = r.length ? r.map((i) => `<a href="#/item/${i.code}"><span class="r-code mono">${esc(i.code)}</span><span class="r-main"><span>${esc(i.title || '—')}</span><span class="muted small">${esc(i.category_name)}</span></span></a>`).join('')
        : emptyState('No matches', `<div class="small">Try an ID like PC/01, a brand or a serial number.</div>`, 'search');
      box.hidden = false;
    } catch { /* ignore */ }
  }, 220);
});
$('#gsearch').addEventListener('click', (e) => e.stopPropagation());
$('#gresults').addEventListener('click', (e) => { if (e.target.closest('a')) { $('#gresults').hidden = true; $('#gsearch').value = ''; $('#gsearch').blur(); $('.top').classList.remove('searching'); } });
$('#gsearch').addEventListener('keydown', async (e) => {
  const box = $('#gresults'), links = $$('a', box);
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !box.hidden && links.length) {
    e.preventDefault();
    let i = links.findIndex((a) => a.classList.contains('on'));
    links.forEach((a) => a.classList.remove('on'));
    i = e.key === 'ArrowDown' ? (i + 1) % links.length : (i <= 0 ? links.length - 1 : i - 1);
    links[i].classList.add('on'); links[i].scrollIntoView({ block: 'nearest' });
    return;
  }
  if (e.key === 'Escape') { box.hidden = true; e.target.blur(); return; }
  if (e.key !== 'Enter') return;
  const hl = $('a.on', box);
  if (hl && !box.hidden) { location.hash = hl.getAttribute('href'); box.hidden = true; e.target.value = ''; e.target.blur(); return; }
  const q = e.target.value.trim(); if (!q) return;
  try { const it = await api('/api/items/lookup?code=' + encodeURIComponent(q)); location.hash = '#/item/' + it.code; box.hidden = true; e.target.value = ''; e.target.blur(); }
  catch { /* fall through to showing suggestions */ }
});

/* ====== bottom nav (phones) ====== */
function openSearch() { $('.top').classList.add('searching'); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => $('#gsearch').focus(), 60); }
$('#bn-search').onclick = openSearch;
$('#search-open').onclick = openSearch;
$('#search-close').onclick = () => { $('.top').classList.remove('searching'); $('#gsearch').value = ''; $('#gresults').hidden = true; };
$('#gsearch').addEventListener('blur', () => { setTimeout(() => { if (!$('#gsearch').value && document.activeElement !== $('#gsearch')) $('.top').classList.remove('searching'); }, 150); });
$('#bn-scan').onclick = () => openScanner();
$('#bn-menu').onclick = () => toggleSide(true);

/* ====== keyboard shortcuts ====== */
let gPending = false, gTimer;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const mods = $$('.modal-bg'); if (mods.length) { mods[mods.length - 1]._close(); return; }
    if ($('#side').classList.contains('open')) { toggleSide(false); return; }
    $('#user-menu').hidden = true; $('#bell-menu').hidden = true;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  if (typing || $('#app').hidden || $('.modal-bg') || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (gPending && (k === 'd' || k === 'h')) { gPending = false; location.hash = k === 'd' ? '#/' : '#/history'; return; }
  gPending = false;
  if (k === '/') { e.preventDefault(); openSearch(); }
  else if (k === '?') showShortcuts();
  else if (k === 's') openScanner();
  else if (k === '[' && !isNarrow()) setMini(!document.body.classList.contains('side-mini'));
  else if (k === 'n' && $('#c-add')) $('#c-add').click();
  else if (k === 'g') { gPending = true; clearTimeout(gTimer); gTimer = setTimeout(() => { gPending = false; }, 900); }
});

/* ====== router ====== */
function skeleton() {
  return `<div class="skel skel-h"></div><div class="skel skel-s"></div>
    <div class="grid g4"><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div></div><div class="skel skel-blk"></div>`;
}
let routeSeq = 0, routeAbort = new AbortController();
async function route() {
  if (!state.me) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [pathPart, qs] = h.split('?');
  const params = new URLSearchParams(qs || '');
  renderSide(); toggleSide(false); $('.top').classList.remove('searching');
  document.title = (state.meta.orgName || 'Admin') + ' MIS';
  const host = $('#main'); window.scrollTo(0, 0);
  const seq = ++routeSeq;
  routeAbort.abort(); routeAbort = new AbortController();
  // Each navigation renders into its own container. It is swapped in on first render, and a view whose
  // route is no longer current cannot render at all, so a slow response never paints over a newer page.
  const main = document.createElement('div'); main.className = 'view';
  const ih = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(main, 'innerHTML', {
    get() { return ih.get.call(main); },
    set(v) { if (seq !== routeSeq) throw new Error('stale view'); ih.set.call(main, v); if (!main.isConnected) host.replaceChildren(main); },
  });
  const skelT = setTimeout(() => { if (seq === routeSeq && !main.isConnected) host.innerHTML = skeleton(); }, 140);
  try {
    let m;
    if (pathPart === '/') await viewDashboard(main);
    else if ((m = pathPart.match(/^\/c\/(\d+)$/))) await viewCategory(main, Number(m[1]));
    else if ((m = pathPart.match(/^\/item\/([^/]+)\/([^/]+)$/))) await viewItem(main, decodeURIComponent(m[1]) + '/' + decodeURIComponent(m[2]));
    else if (pathPart === '/history') await viewHistory(main);
    else if (pathPart === '/help') await viewHelp(main, params);
    else if (pathPart === '/labels') await viewLabels(main, params);
    else if (pathPart === '/users' && isAdmin()) await viewUsers(main);
    else if (pathPart === '/settings' && isAdmin()) await viewSettings(main);
    else if (pathPart === '/categories' && isAdmin()) await viewCategories(main);
    else main.innerHTML = `<div class="card">${emptyState('Page not found', '<div style="margin-top:14px"><a class="btn" href="#/">Go to dashboard</a></div>', 'alert')}</div>`;
  } catch (e) { if (seq !== routeSeq) return; main.innerHTML = `<div class="card">${emptyState(e.message, '<div style="margin-top:14px"><a class="btn" href="#/">Back to dashboard</a></div>', 'alert')}</div>`; }
  clearTimeout(skelT);
}
window.addEventListener('hashchange', route);

/* ====== live refresh when data changes (for example edits saved in Excel) ====== */
let syncRev = null;
setInterval(async () => {
  if (!state.me || document.hidden) return;
  try {
    const r = await api('/api/sync/status');
    if (syncRev === null) { syncRev = r.rev; return; }
    if (r.rev === syncRev) return;
    syncRev = r.rev;
    const pth = (location.hash.replace(/^#/, '') || '/').split('?')[0];
    const busyNow = document.querySelector('.modal-bg') || /^\/(settings|users|categories|labels)/.test(pth);
    if (r.pull && !busyNow) { const t = r.pull.split('|')[1] || ''; if (!/^0 added, 0 updated, 0 removed$/.test(t)) toast('Excel changes loaded: ' + t); }
    if (!busyNow) route();
  } catch { /* offline or signed out */ }
}, 6000);

/* ====== export modal ====== */
function openExport(catId) {
  const cat = catId ? catById(catId) : null;
  modal({ title: 'Download data (Excel)', size: 'narrow', body: `
    <p class="muted">${cat ? `Exports <b>${esc(cat.name)}</b> as a formatted Excel table.` : 'Exports every category as its own sheet, with an index sheet.'}</p>
    <label class="check"><input type="checkbox" id="x-img"><span>Include product photos in the sheet</span></label>
    <label class="check"><input type="checkbox" id="x-hist" checked><span>Include full history log as a separate sheet</span></label>
    ${isAdmin() ? `<hr class="hr"><p class="small muted" style="margin:0">Need everything including PDFs and a database copy? <a href="/api/export/backup.zip">Download full backup (ZIP)</a></p>` : ''}`,
  footer: `<button class="btn" data-close>Cancel</button><button class="btn primary" id="go">${icon('download')}Download</button>`,
  onMount(m) {
    m.$('#go').onclick = () => {
      const p = new URLSearchParams();
      if (cat) p.set('category', cat.id);
      if (m.$('#x-img').checked) p.set('images', '1');
      if (m.$('#x-hist').checked) p.set('history', '1');
      location.href = '/api/export.xlsx?' + p; m.close(); toast('Preparing your download…');
    };
  } });
}

/* ====== dashboard ====== */
const STATUS_COLORS = { 'active': 'var(--ok)', 'in-stock': 'var(--blue)', 'issued': 'var(--violet)', 'under-repair': 'var(--warn)', 'lost': 'var(--danger)', 'scrapped': 'var(--danger)', 'inactive': 'var(--line-2)' };
const titleIc = (ic, tone = '') => `<span class="title-ic ${tone}">${icon(ic)}</span>`;
/* searchable category chooser, used by the quick actions */
function pickCategory(title, onPick) {
  modal({ title, size: 'wide', body: `<div class="tb-search" style="max-width:none;margin-bottom:14px"><span class="ic-slot">${icon('search')}</span><input type="search" id="pk-q" placeholder="Type to filter categories…"></div><div class="pick-grid" id="pk-list"></div>`,
    onMount(m) {
      const paint = () => {
        const q = m.$('#pk-q').value.trim().toLowerCase();
        const cs = state.cats.filter((c) => !q || c.name.toLowerCase().includes(q) || c.prefix.toLowerCase().includes(q) || c.grp.toLowerCase().includes(q));
        m.$('#pk-list').innerHTML = cs.map((c) => `<button type="button" class="pick-tile ${groupTone(c.grp)}" data-id="${c.id}"><span class="cat-ic">${icon(catIcon(c.name))}</span><span class="pt-t"><b>${esc(c.name)}</b><span>${esc(c.prefix)} · ${c.count.toLocaleString('en-IN')} ${c.count === 1 ? 'entry' : 'entries'}</span></span>${icon('arrowR')}</button>`).join('')
          || emptyState('No category matches', '', 'search');
      };
      m.$('#pk-q').oninput = paint;
      m.$('#pk-q').onkeydown = (e) => { if (e.key === 'Enter') { const b = m.$('.pick-tile'); if (b) b.click(); } };
      m.$('#pk-list').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { m.close(); onPick(catById(b.dataset.id)); } };
      paint();
    } });
}
async function viewDashboard(main) {
  const d = await api('/api/dashboard');
  dueCache = d; paintBell();
  const st = (n) => (d.byStatus.find((s) => s.status === n) || { count: 0 }).count;
  const stTotal = d.byStatus.reduce((a, s) => a + s.count, 0) || 1;
  const counts = Object.fromEntries(d.byCat.map((c) => [c.id, c.count]));
  const max = Math.max(1, ...d.byCat.map((c) => c.count));
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const late = d.expiring.filter((x) => x.days < 0).length;
  const qa = [
    ['scan', 'Scan QR', 'Open an item from its label', 'qa-scan', 'tone-0'],
    ...(isAdmin() ? [['plus', 'Add item', 'Create a new entry', 'qa-add', 'tone-4'], ['upload', 'Import Excel', 'Bulk add from a sheet', 'qa-imp', 'tone-1']] : []),
    ['printer', 'Print labels', 'QR stickers for a category', 'qa-lbl', 'tone-2'],
    ['clock', 'History log', 'Every update, all items', 'qa-hist', 'tone-3'],
    ['download', 'Download all', 'Excel workbook of everything', 'qa-exp', 'tone-6'],
  ];
  const recent = recentGet();
  const groups = [...new Set(state.cats.map((c) => c.grp))];
  main.innerHTML = `
  <section class="band">
    <div class="band-in">
      <div class="band-date">${icon('calendar')}${esc(today)}</div>
      <h1>${greet}, ${esc(String(state.me.name).split(' ')[0])}</h1>
      <p>${d.totalItems.toLocaleString('en-IN')} entries in ${d.byCat.filter((c) => c.count).length} of ${d.totalCategories} categories${late ? ` · <b>${late} overdue</b>` : d.expiringTotal ? ` · ${d.expiringTotal} due in the next 60 days` : ' · nothing overdue'}</p>
    </div>
    <img class="band-tree" src="/img/mark-white.png" alt="">
    <svg class="band-wave" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 C 250 20, 520 120, 800 70 S 1100 30, 1200 55 L1200 120 L0 120 Z" fill="rgba(255,255,255,.10)"/><path d="M0 100 C 300 60, 560 130, 860 95 S 1120 70, 1200 82 L1200 120 L0 120 Z" fill="rgba(255,255,255,.16)"/></svg>
  </section>
  <div class="grid g4">
    <a class="card stat" href="#browse" data-scroll="browse"><span class="s-ic">${icon('box')}</span><div><div class="v">${d.totalItems.toLocaleString('en-IN')}</div><div class="l">Total entries</div></div></a>
    <a class="card stat t-blue" href="#browse" data-scroll="browse"><span class="s-ic">${icon('layers')}</span><div><div class="v">${d.totalCategories}</div><div class="l">Categories · ${d.byCat.filter((c) => c.count).length} in use</div></div></a>
    <a class="card stat t-warn" href="#status" data-scroll="status"><span class="s-ic">${icon('wrench')}</span><div><div class="v">${st('Under Repair')}</div><div class="l">Under repair</div></div></a>
    <a class="card stat ${late ? 't-danger' : d.expiringTotal ? 't-warn' : 't-ok'}" href="#due" data-scroll="due"><span class="s-ic">${icon(late ? 'alert' : 'bell')}</span><div><div class="v">${d.expiringTotal}</div><div class="l">${late ? `${late} overdue · ` : ''}Due in 60 days</div></div></a>
  </div>
  ${localStorageGet('tourDone') === '1' ? '' : `<div class="tour-prompt" id="tour-prompt"><img src="/img/mark.png" alt=""><div class="tp-t"><b>New to Admin MIS?</b><span>Take a one-minute tour of the main screens. You can restart it any time from Help &amp; guide.</span></div><div class="actions"><button class="btn ghost" id="tp-no">Not now</button><button class="btn primary" id="tp-go">${icon('sparkle')}Start the tour</button></div></div>`}
  <div class="section-h"><h2>Quick actions</h2></div>
  <div class="qa-grid">${qa.map(([ic, t, sub, id, tone]) => `<button type="button" class="qa ${tone}" id="${id}"><span class="qa-ic">${icon(ic)}</span><span class="qa-t"><b>${t}</b><span>${sub}</span></span></button>`).join('')}</div>
  ${recent.length ? `<div class="section-h"><h2>Recently viewed</h2><button class="btn sm ghost" id="rv-clear">${icon('x')}Clear</button></div>
  <div class="recent-row">${recent.map((r) => `<a class="recent ${groupTone(r.grp)}" href="#/item/${esc(r.code)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy">` : `<span class="cat-ic">${icon(catIcon(r.cat || ''))}</span>`}<span class="rc-t"><b class="mono">${esc(r.code)}</b><span>${esc(r.title || r.cat || '')}</span></span></a>`).join('')}</div>` : ''}
  <div class="grid g2" style="margin-top:22px">
    <div class="card" id="due"><div class="card-h"><h2>${icon('bell')}Due, expiring or overdue</h2>${d.expiring.length > 8 ? `<span class="muted small">Showing 8 of ${d.expiring.length}</span>` : ''}</div>
      ${d.expiring.length ? `<div class="due-list">${d.expiring.slice(0, 8).map((x) => `<a class="due-row" href="#/item/${x.code}"><span class="due-ic ${x.days < 0 ? 'late' : 'soon'}">${icon(x.days < 0 ? 'alert' : 'calendar')}</span><span class="f"><b class="mono">${esc(x.code)}</b><span>${esc(x.field)}</span></span><span class="d"><span class="${x.days < 0 ? 'due-late' : 'due-soon'}">${fmtDate(x.date)}</span><br><span class="pill ${x.days < 0 ? 'late' : 'soon'}">${x.days < 0 ? Math.abs(x.days) + ' days overdue' : x.days === 0 ? 'today' : 'in ' + x.days + ' days'}</span></span></a>`).join('')}</div>`
        : `<div class="all-clear"><span>${icon('check')}</span><div><b>All clear</b><div class="muted small">Nothing is due in the next 60 days.</div></div></div>`}
    </div>
    <div class="card" id="status"><div class="card-h"><h2>${icon('pie')}By status</h2><span class="muted small">${stTotal === 1 && !d.byStatus.length ? '' : stTotal.toLocaleString('en-IN') + ' total'}</span></div>
      ${d.byStatus.length ? `<div class="stack-bar">${d.byStatus.map((s) => `<i title="${esc(s.status)}: ${s.count}" style="width:${(s.count / stTotal) * 100}%;background:${STATUS_COLORS[statusCls(s.status).slice(2)] || 'var(--muted)'}"></i>`).join('')}</div>
      <div class="status-list">${d.byStatus.map((s) => `<div class="status-row"><span class="st-ic ${statusCls(s.status)}">${icon(STATUS_ICONS[s.status] || 'dot')}</span><span class="st-n">${esc(s.status)}</span><span class="muted small">${Math.round((s.count / stTotal) * 100)}%</span><b>${s.count.toLocaleString('en-IN')}</b></div>`).join('')}</div>` : emptyState('Nothing yet', '<div class="small">Statuses appear once items are added.</div>', 'pie')}
    </div>
  </div>
  <div class="section-h" id="browse"><h2>Browse categories</h2><label class="check-sm"><input type="checkbox" id="b-used" ${localStorageGet('browseUsed') === '1' ? 'checked' : ''}> Only categories with entries</label></div>
  <div id="b-groups">${groups.map((g) => `<div class="b-group" data-g="${esc(g)}"><div class="b-gh ${groupTone(g)}"><span class="dot"></span>${esc(g)}</div><div class="cat-tiles">${state.cats.filter((c) => c.grp === g).map((c) => { const n = counts[c.id] ?? c.count; return `<a class="cat-tile ${groupTone(g)} ${n ? '' : 'empty'}" href="#/c/${c.id}"><span class="cat-ic">${icon(catIcon(c.name))}</span><span class="ct-t"><b>${esc(c.name)}</b><span class="muted">${esc(c.prefix)}</span></span><span class="ct-n">${n.toLocaleString('en-IN')}</span><span class="ct-bar"><i style="width:${(n / max) * 100}%"></i></span></a>`; }).join('')}</div></div>`).join('')}</div>
  <div class="card" style="margin-top:22px"><div class="card-h"><h2>${icon('activity')}Recent activity</h2><a class="btn sm ghost" href="#/history">View all ${icon('arrowR')}</a></div>
    ${d.recent.length ? `<ul class="tl">${d.recent.map((e) => entryHtml(e, { showItem: true })).join('')}</ul>` : emptyState('No activity yet', '', 'activity')}</div>`;
  const used = () => { const on = $('#b-used').checked; localStorageSet('browseUsed', on ? '1' : '0'); $$('.cat-tile.empty', main).forEach((t) => { t.hidden = on; }); $$('.b-group', main).forEach((g) => { g.hidden = on && !$$('.cat-tile:not(.empty)', g).length; }); };
  $('#b-used').onchange = used; used();
  $$('[data-scroll]', main).forEach((a) => { a.onclick = (e) => { e.preventDefault(); $('#' + a.dataset.scroll).scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  $('#qa-scan').onclick = openScanner;
  if ($('#tp-go')) { $('#tp-go').onclick = () => startTour('main'); $('#tp-no').onclick = () => { localStorageSet('tourDone', '1'); $('#tour-prompt').remove(); }; }
  $('#qa-hist').onclick = () => { location.hash = '#/history'; };
  $('#qa-exp').onclick = () => openExport();
  $('#qa-lbl').onclick = () => pickCategory('Print QR labels for…', (c) => { location.hash = '#/labels?cat=' + c.id; });
  if (isAdmin()) {
    $('#qa-add').onclick = () => pickCategory('Add an item to…', (c) => itemForm(c, null, (it) => { toast(`Created ${it.code}`); refreshCats(); location.hash = '#/item/' + it.code; }));
    $('#qa-imp').onclick = () => pickCategory('Import Excel into…', (c) => { location.hash = '#/c/' + c.id; setTimeout(() => importDialog(c, () => refreshCats().then(route)), 300); });
  }
  if ($('#rv-clear')) $('#rv-clear').onclick = () => { localStorageSet('recent', '[]'); route(); };
}

/* ====== category list ====== */
const catState = {};
/* picks which fields make a readable list row: a title, a serial, a person, a location and up to two others */
function listLayout(cat) {
  const find = (re) => cat.fields.find((f) => re.test(f.label));
  const brand = find(/brand|make/i), model = find(/^model|product type|device type|^description$|^name$|^item/i);
  const titleF = [brand, model].filter(Boolean);
  if (!titleF.length) titleF.push(cat.fields[0]);
  const serial = find(/serial|imei/i);
  const person = find(/assigned|^user|employee|person|owner|issued to/i);
  const loc = find(/location|site|branch/i);
  const used = new Set([...titleF, serial, person, loc].filter(Boolean));
  const extra = cat.fields.slice(0, 7).filter((f) => !used.has(f) && f.type !== 'textarea').slice(0, (person ? 0 : 1) + (loc ? 0 : 1) + 1);
  return { titleF, serial, person, loc, extra };
}
const nameTone = (n) => 'tone-' + ([...String(n)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 6);
async function viewCategory(main, id) {
  const cat = catById(id); if (!cat) throw new Error('Category not found');
  const s = catState[id] = catState[id] || { q: '', status: '', page: 1, pageSize: 25 };
  s.view = localStorageGet('catView') === 'cards' ? 'cards' : 'table';
  const sel = new Set();
  const cols = cat.fields.slice(0, 5);
  const tone = groupTone(cat.grp);
  document.title = `${cat.name} · ${state.meta.orgName} MIS`;
  main.innerHTML = `
  <div class="page-head"><div class="ph-main">${titleIc(catIcon(cat.name), tone)}<div><div class="crumb static">${esc(cat.grp)}</div><h1>${esc(cat.name)}</h1><div class="muted small"><span class="tag mono">${esc(cat.prefix)}/01…</span> · <span id="c-count"></span></div></div></div>
    <div class="actions">
      ${isAdmin() ? `<button class="btn primary" id="c-add" title="Add item (N)">${icon('plus')}Add item</button><button class="btn" id="c-imp">${icon('upload')}Import Excel</button>` : ''}
      <button class="btn" id="c-exp">${icon('download')}Download</button>
      <button class="btn" id="c-lbl">${icon('printer')}<span id="c-lbl-t">Print QR labels</span></button>
    </div></div>
  <div class="toolbar">
    <div class="tb-search"><span class="ic-slot">${icon('search')}</span><input type="search" id="c-q" placeholder="Search ${esc(cat.name.toLowerCase())}…" value="${esc(s.q)}"></div>
    <label class="check-sm"><input type="checkbox" id="c-all" aria-label="Select all on this page"> Select page</label>
    <span class="sel-bar" id="c-sel" hidden></span>
    <div class="seg" role="group" aria-label="Layout"><button type="button" data-view="table" title="Table view">${icon('table')}<span>Table</span></button><button type="button" data-view="cards" title="Card view">${icon('grid')}<span>Cards</span></button></div>
  </div>
  <div class="chips" id="c-chips" role="group" aria-label="Filter by status">${['', ...state.meta.statuses].map((x) => `<button type="button" class="chip ${x ? statusCls(x) : 'all'} ${s.status === x ? 'on' : ''}" data-st="${esc(x)}">${x ? `<span class="chip-dot"></span>${esc(x)}` : `${icon('filter')}All statuses`}</button>`).join('')}</div>
  <div id="c-list"></div>
  <div class="pager"><span class="muted small" id="c-info"></span><div class="actions"><button class="btn sm" id="c-prev">${icon('back')}Previous</button><button class="btn sm" id="c-next">Next ${icon('arrowR')}</button>
    <select id="c-ps" aria-label="Rows per page">${[25, 50, 100, 200].map((n) => `<option value="${n}" ${s.pageSize === n ? 'selected' : ''}>${n} / page</option>`).join('')}</select></div></div>
  ${isAdmin() ? `<button class="fab noprint" id="c-fab" aria-label="Add item">${icon('plus')}</button>` : ''}`;
  let items = [], total = 0;
  const updSel = () => {
    const b = $('#c-sel'); b.hidden = !sel.size;
    b.innerHTML = sel.size ? `${icon('check')}${sel.size} selected <button class="btn sm ghost" id="c-clr">Clear</button>` : '';
    $('#c-lbl-t').textContent = sel.size ? `Print ${sel.size} label${sel.size === 1 ? '' : 's'}` : 'Print QR labels';
    $$('#c-list [data-id]').forEach((el) => el.classList.toggle('row-sel', sel.has(Number(el.dataset.id))));
    if (sel.size) $('#c-clr').onclick = () => { sel.clear(); $$('.sel').forEach((c) => { c.checked = false; }); $('#c-all').checked = false; updSel(); };
  };
  const chk = (it) => `<input type="checkbox" class="sel" data-id="${it.id}" ${sel.has(it.id) ? 'checked' : ''} aria-label="Select ${esc(it.code)}">`;
  const emptyHtml = () => (s.q || s.status ? emptyState('No entries match the filter', '<div class="small">Clear the search or status filter to see everything.</div>', 'search')
    : emptyState('No entries yet', isAdmin() ? '<div class="small" style="margin-bottom:14px">Add the first item or import an existing Excel sheet.</div><button class="btn primary" data-empty-add>' + icon('plus') + 'Add item</button>' : '', catIcon(cat.name)));
  function paintList() {
    $$('.seg [data-view]', main).forEach((b) => b.classList.toggle('on', b.dataset.view === s.view));
    if (s.view === 'cards') {
      $('#c-list').innerHTML = items.length ? `<div class="icards">${items.map((it) => `<div class="icard" data-id="${it.id}" data-href="#/item/${it.code}">
        <label class="icard-chk">${chk(it)}</label>
        <div class="icard-img ${tone}">${it.imageUrl ? `<img loading="lazy" src="${it.imageUrl}" alt="">` : icon(catIcon(cat.name))}</div>
        <div class="icard-b"><div class="icard-top"><a class="mono" href="#/item/${it.code}">${esc(it.code)}</a>${badge(it.status)}</div>
          <div class="icard-title">${esc(it.data[cols[0]?.key] || it.title || '—')}</div>
          <div class="icard-meta">${cols.slice(1, 4).filter((f) => it.data[f.key]).map((f) => `<span title="${esc(f.label)}">${icon(fieldIcon(f))}${fmtVal(f, it.data[f.key])}</span>`).join('')}</div></div></div>`).join('')}</div>`
        : `<div class="card">${emptyHtml()}</div>`;
    } else {
      const L = listLayout(cat), v = (it, f) => (f ? String(it.data[f.key] ?? '').trim() : '');
      $('#c-list').innerHTML = items.length ? `<div class="lwrap"><table class="ltbl"><thead><tr>
        <th class="l-chk"><input type="checkbox" id="c-all-h" aria-label="Select all on this page" ${items.every((i) => sel.has(i.id)) ? 'checked' : ''}></th>
        <th>Item</th>${L.person ? `<th>${esc(L.person.label)}</th>` : ''}${L.loc ? `<th>${esc(L.loc.label)}</th>` : ''}${L.extra.map((f) => `<th class="l-extra">${esc(f.label)}</th>`).join('')}<th>Status</th><th class="l-act"><span class="sr">Actions</span></th></tr></thead>
        <tbody>${items.map((it) => {
          const title = L.titleF.map((f) => v(it, f)).filter(Boolean).join(' ');
          const sub = L.serial && v(it, L.serial) ? `<span class="l-sn">${icon('hash')}${esc(v(it, L.serial))}</span>` : '';
          const who = v(it, L.person), where = v(it, L.loc);
          return `<tr data-id="${it.id}" data-href="#/item/${it.code}">
          <td class="l-chk">${chk(it)}</td>
          <td class="l-item"><div class="l-item-in">${it.imageUrl ? `<img class="l-thumb" loading="lazy" src="${it.imageUrl}" alt="">` : `<span class="l-thumb ${tone}">${icon(catIcon(cat.name))}</span>`}
            <div class="l-txt"><div class="l-title">${title ? esc(title) : `<span class="muted">No name yet</span>`}</div>
            <div class="l-sub"><a class="l-code mono" href="#/item/${it.code}">${esc(it.code)}</a>${sub}</div></div></div></td>
          ${L.person ? `<td data-label="${esc(L.person.label)}">${who ? `<span class="l-person"><span class="avatar xs ${nameTone(who)}">${esc(initials(who))}</span><span>${esc(who)}</span></span>` : '<span class="l-none">Unassigned</span>'}</td>` : ''}
          ${L.loc ? `<td data-label="${esc(L.loc.label)}">${where ? `<span class="l-loc">${icon('pin')}${esc(where)}</span>` : '<span class="l-none">—</span>'}</td>` : ''}
          ${L.extra.map((f) => `<td data-label="${esc(f.label)}" class="l-extra">${v(it, f) ? `<span>${fmtVal(f, it.data[f.key])}</span>` : '<span class="l-none">—</span>'}</td>`).join('')}
          <td class="l-status">${badge(it.status)}</td>
          <td class="l-act"><span class="l-acts">${isAdmin() ? `<button type="button" class="icon-btn sm" data-row-edit="${it.id}" title="Edit ${esc(it.code)}" aria-label="Edit">${icon('edit')}</button>` : ''}<button type="button" class="icon-btn sm" data-row-lbl="${it.id}" title="Print label" aria-label="Print label">${icon('printer')}</button><a class="icon-btn sm l-open" href="#/item/${it.code}" title="Open" aria-label="Open">${icon('arrowR')}</a></span></td></tr>`;
        }).join('')}</tbody></table></div>`
        : `<div class="card">${emptyHtml()}</div>`;
      if ($('#c-all-h')) $('#c-all-h').onchange = (e) => { $('#c-all').checked = e.target.checked; $('#c-all').dispatchEvent(new Event('change')); };
    }
    const ea = $('[data-empty-add]', main); if (ea) ea.onclick = () => $('#c-add').click();
    updSel();
  }
  async function load() {
    const p = new URLSearchParams({ category: id, q: s.q, status: s.status, page: s.page, pageSize: s.pageSize });
    const r = await api('/api/items?' + p); if (!main.isConnected) return; items = r.items; total = r.total;
    $('#c-count').textContent = `${total.toLocaleString('en-IN')} ${total === 1 ? 'entry' : 'entries'}${s.status ? ' · ' + s.status : ''}`;
    paintList();
    const from = total ? (s.page - 1) * s.pageSize + 1 : 0;
    $('#c-info').textContent = `Showing ${from}–${Math.min(total, s.page * s.pageSize)} of ${total.toLocaleString('en-IN')}`;
    $('#c-prev').disabled = s.page <= 1; $('#c-next').disabled = s.page * s.pageSize >= total;
    $('#c-all').checked = items.length > 0 && items.every((i) => sel.has(i.id)); updSel();
  }
  let t; $('#c-q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { s.q = e.target.value.trim(); s.page = 1; load(); }, 250); };
  $('#c-chips').onclick = (e) => { const b = e.target.closest('[data-st]'); if (!b) return; s.status = b.dataset.st; s.page = 1; $$('.chip', main).forEach((c) => c.classList.toggle('on', c === b)); load(); };
  $$('.seg [data-view]', main).forEach((b) => { b.onclick = () => { s.view = b.dataset.view; localStorageSet('catView', s.view); paintList(); }; });
  $('#c-ps').onchange = (e) => { s.pageSize = Number(e.target.value); s.page = 1; load(); };
  $('#c-prev').onclick = () => { s.page--; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#c-next').onclick = () => { s.page++; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#c-all').onchange = (e) => { items.forEach((i) => (e.target.checked ? sel.add(i.id) : sel.delete(i.id))); $$('.sel').forEach((c) => { c.checked = e.target.checked; }); updSel(); };
  $('#c-list').addEventListener('change', (e) => { if (e.target.classList.contains('sel')) { const i = Number(e.target.dataset.id); e.target.checked ? sel.add(i) : sel.delete(i); updSel(); } });
  $('#c-list').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-row-edit]'), lb = e.target.closest('[data-row-lbl]');
    if (ed) { const it = items.find((x) => x.id === Number(ed.dataset.rowEdit)); itemForm(cat, it, () => { toast(`Saved ${it.code}`); refreshCats().then(load); }); return; }
    if (lb) { location.hash = '#/labels?ids=' + lb.dataset.rowLbl; return; }
    if (e.target.closest('a, input, button, label')) return;
    const td = e.target.closest('td.td-chk, td.l-chk'); if (td) { const c = $('input', td); c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); return; }
    const row = e.target.closest('[data-href]'); if (row && !getSelection().toString()) location.hash = row.dataset.href;
  });
  $('#c-exp').onclick = () => openExport(id);
  $('#c-lbl').onclick = () => {
    if (sel.size) location.hash = '#/labels?ids=' + [...sel].join(',');
    else location.hash = '#/labels?cat=' + id;
  };
  if (isAdmin()) {
    $('#c-add').onclick = () => itemForm(cat, null, (it) => { toast(`Created ${it.code}`); refreshCats().then(load); });
    $('#c-fab').onclick = () => $('#c-add').click();
    $('#c-imp').onclick = () => importDialog(cat, () => refreshCats().then(load));
  }
  await load();
}
function importDialog(cat, done) {
  modal({ title: `Import into ${cat.name}`, body: `<div class="form-err" hidden></div>
    <p class="muted">Use the template so column headings match. Each row becomes a new entry with the next free ID (${esc(cat.prefix)}/…). Existing entries are never changed.</p>
    <p><a class="btn sm" href="/api/categories/${cat.id}/template.xlsx">${icon('download')}Download template</a></p>
    <label class="field"><span>Excel file (.xlsx)</span><input type="file" id="imp-file" accept=".xlsx"></label><div id="imp-res"></div>`,
  footer: `<button class="btn" data-close>Close</button><button class="btn primary" id="imp-go">${icon('upload')}Import</button>`,
  onMount(m) {
    m.$('#imp-go').onclick = async (e) => {
      const btn = e.currentTarget;
      const f = m.$('#imp-file').files[0]; if (!f) return m.setErr('Choose a file first');
      const fd = new FormData(); fd.append('file', f); busy(btn, true); m.setErr('');
      try {
        const r = await api(`/api/categories/${cat.id}/import`, { method: 'POST', body: fd });
        m.$('#imp-res').innerHTML = `<div class="result-ok"><b>${r.created}</b> imported, <b>${r.skipped}</b> skipped.${r.warnings.length ? `<ul class="small">${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</div>`;
        done();
      } catch (ex) { m.setErr(ex.message); }
      busy(btn, false);
    };
  } });
}

/* ====== image resize (keeps uploads small) ====== */
function resizeImage(file, max = 1400) {
  return new Promise((resolve) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      if (k === 1 && file.size < 800 * 1024) { URL.revokeObjectURL(url); return resolve(file); }
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b ? new File([b], 'photo.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ====== item form ====== */
function fieldInput(f, v) {
  const id = 'f_' + f.key, val = esc(v || ''), req = f.required ? ' required' : '';
  if (f.type === 'textarea') return `<textarea id="${id}"${req}>${val}</textarea>`;
  if (f.type === 'select') return `<select id="${id}"${req}><option value="">Select…</option>${f.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (f.type === 'date') return `<input id="${id}" type="date" value="${val}"${req}>`;
  if (f.type === 'number' || f.type === 'money') return `<input id="${id}" type="number" step="any" min="0" inputmode="decimal" value="${val}"${req}>`;
  return `<input id="${id}" value="${val}"${req}>`;
}
function itemForm(cat, item, done) {
  let photo = null, removePhoto = false;
  const d = item ? item.data : {};
  modal({ title: item ? `Edit ${item.code}` : `Add to ${cat.name}`, size: 'wide', body: `<div class="form-err" hidden></div>
    <div class="form-grid">
      ${cat.fields.map((f) => `<label class="field ${f.type === 'textarea' ? 'full' : ''}"><span>${icon(fieldIcon(f))}${esc(f.label)}${f.required ? ' <i class="req">*</i>' : ''}</span>${fieldInput(f, d[f.key])}</label>`).join('')}
      <label class="field"><span>${icon('pie')}Status</span><select id="f_status">${state.meta.statuses.map((s) => `<option ${(item ? item.status : 'Active') === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <div class="field full"><span>${icon('image')}Product photo</span><div class="photo-pick">
        <img id="ph-prev" alt="" ${item && item.imageUrl ? `src="${item.imageUrl}"` : 'hidden'}>
        <div><input type="file" id="ph-file" accept="image/*"><div class="small muted" style="margin-top:6px">Take a photo or choose from the device. Large images are reduced automatically.</div>
        ${item && item.imageUrl ? `<button type="button" class="btn sm danger" id="ph-rm" style="margin-top:8px">${icon('trash')}Remove photo</button>` : ''}</div></div></div>
    </div>`,
  footer: `<button class="btn" data-close>Cancel</button><button class="btn primary" id="save">${icon('check')}Save</button>`,
  onMount(m) {
    m.$('#ph-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      photo = await resizeImage(f); removePhoto = false; const p = m.$('#ph-prev'); p.src = URL.createObjectURL(photo); p.hidden = false;
    };
    const rmb = m.$('#ph-rm'); if (rmb) rmb.onclick = () => { removePhoto = true; photo = null; m.$('#ph-prev').hidden = true; rmb.hidden = true; };
    m.$('#save').onclick = async (e) => {
      const btn = e.currentTarget;
      const data = {}; cat.fields.forEach((f) => { data[f.key] = m.$('#f_' + f.key).value; });
      const fd = new FormData(); fd.append('data', JSON.stringify(data)); fd.append('status', m.$('#f_status').value);
      if (photo) fd.append('image', photo, photo.name || 'photo.jpg');
      if (removePhoto) fd.append('removeImage', '1');
      busy(btn, true); m.setErr('');
      try {
        const r = await api(item ? `/api/items/${item.id}` : `/api/categories/${cat.id}/items`, { method: item ? 'PUT' : 'POST', body: fd });
        m.close(); done(r);
      } catch (ex) { m.setErr(ex.message); busy(btn, false); }
    };
  } });
}

/* ====== history rendering ====== */
function filesHtml(atts) {
  if (!atts || !atts.length) return '';
  return `<div class="files">${atts.map((a) => {
    const img = (a.mime || '').startsWith('image/');
    return `<div class="file">${img ? `<a href="${a.url}" target="_blank" rel="noopener"><img src="${a.url}" alt=""></a>` : '<span class="ext">PDF</span>'}
      <a href="${a.url}" target="_blank" rel="noopener" title="${esc(a.name)}">${esc(a.name)}</a><span class="muted small">${sizeStr(a.size)}</span>
      <a class="small sv" href="${a.url}?download=1" title="Download">Save</a></div>`;
  }).join('')}</div>`;
}
const histTone = (t) => 'h-' + ({ 'Purchase': 'ok', 'Issued / Assigned': 'violet', 'Returned': 'blue', 'Transferred': 'blue', 'Repair / Service': 'warn', 'Maintenance': 'warn',
  'Inspection': 'accent', 'Reading': 'accent', 'Payment / Invoice': 'ok', 'Created': 'accent', 'Status Change': 'violet' }[t] || 'muted');
function dayLabel(iso) {
  if (!iso) return '';
  const t = todayIso(), y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA');
  if (iso === t) return 'Today'; if (iso === y) return 'Yesterday';
  const [yy, mm, dd] = iso.split('-').map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function timelineHtml(list, opts) {
  let last = null, h = '';
  for (const e of list) { if (e.event_date !== last) { h += `<li class="tl-day">${esc(dayLabel(e.event_date))}</li>`; last = e.event_date; } h += entryHtml(e, opts); }
  return h;
}
function entryHtml(e, { showItem = false, actions = false } = {}) {
  return `<li class="${e.auto ? 'auto' : ''}" data-hid="${e.id}"><span class="tl-ic ${histTone(e.type)}">${icon(HIST_ICONS[e.type] || 'dot')}</span>
    <div class="meta"><span class="ty">${esc(e.type)}</span>${showItem ? `<a class="mono" href="#/item/${e.code}">${esc(e.code)}</a>` : ''}<span class="muted small">${esc(fmtDate(e.event_date))} · ${esc(e.by_user || '')}${e.auto ? ' · system' : ''}</span>
      ${actions && !e.auto ? `<span class="tl-acts"><button class="btn sm ghost" data-edit="${e.id}">${icon('edit')}Edit</button><button class="btn sm ghost danger" data-del="${e.id}" aria-label="Delete entry">${icon('trash')}</button></span>` : ''}
      ${actions && e.auto ? `<span class="tl-acts"><button class="btn sm ghost danger" data-del="${e.id}" aria-label="Delete entry">${icon('trash')}</button></span>` : ''}</div>
    <div class="tl-body">${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}${filesHtml(e.attachments)}</div></li>`;
}

/* file picker with list (used by add + edit entry) */
function filePicker(root, files) {
  const list = $('.pick-list', root), input = $('input[type=file]', root), drop = $('.drop', root);
  const paint = () => {
    list.innerHTML = files.map((f, i) => `<div class="file"><span class="ext" style="${/pdf/i.test(f.type) ? '' : 'background:var(--blue)'}">${/pdf/i.test(f.type) ? 'PDF' : 'IMG'}</span><span>${esc(f.name)}</span><span class="muted small">${sizeStr(f.size)}</span><button type="button" class="btn sm ghost" data-rm="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('');
  };
  const add = (fl) => { [...fl].forEach((f) => { if (/^(application\/pdf|image\/)/.test(f.type)) files.push(f); else toast(`${f.name}: only PDF or image files`, true); }); paint(); };
  input.onchange = () => { add(input.files); input.value = ''; };
  drop.onclick = () => input.click();
  drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); add(e.dataTransfer.files); };
  list.onclick = (e) => { const b = e.target.closest('[data-rm]'); if (b) { files.splice(Number(b.dataset.rm), 1); paint(); } };
  paint();
}
const pickerHtml = `<div class="drop" tabindex="0" role="button">${icon('upload')}<span><b>Choose files</b> or drop them here</span><span class="small">PDFs or images, several allowed</span></div><input type="file" accept="application/pdf,image/*" multiple hidden><div class="files pick-list"></div>`;

/* ====== item page ====== */
const typeChips = (id, cur) => `<div class="type-chips" data-for="${id}">${state.meta.historyTypes.map((t) => `<button type="button" class="tchip ${histTone(t)} ${t === cur ? 'on' : ''}" data-t="${esc(t)}">${icon(HIST_ICONS[t] || 'dot')}${esc(t)}</button>`).join('')}</div>`;
function bindTypeChips(root) {
  $$('.type-chips', root).forEach((box) => {
    const sel = $('#' + box.dataset.for, root);
    box.onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; sel.value = b.dataset.t; $$('.tchip', box).forEach((c) => c.classList.toggle('on', c === b)); };
  });
}
async function viewItem(main, code) {
  const it = await api('/api/items/lookup?code=' + encodeURIComponent(code));
  const item = await api('/api/items/' + it.id);
  const cat = catById(item.category_id);
  const tone = groupTone(cat.grp);
  document.title = `${item.code} · ${state.meta.orgName} MIS`;
  recentPush({ code: item.code, title: item.title, cat: cat.name, grp: cat.grp, img: item.imageUrl || '' });
  const filled = cat.fields.filter((f) => item.data[f.key] !== '' && item.data[f.key] != null).length;
  main.innerHTML = `
  <div class="page-head"><div><a href="#/c/${cat.id}" class="crumb">${icon('back')}${esc(cat.name)}</a></div>
    <div class="actions">${isAdmin() ? `<button class="btn primary" id="i-edit">${icon('edit')}Edit</button>` : ''}<a class="btn" href="#/labels?ids=${item.id}">${icon('printer')}Print label</a>
      ${isAdmin() ? `<button class="btn danger" id="i-del" title="Delete item">${icon('trash')}<span class="hide-sm">Delete</span></button>` : ''}</div></div>
  <div class="grid g-item">
    <div class="stack-16">
      <div class="card hero-card"><div class="hero">
        ${item.imageUrl ? `<img class="hero-img" id="i-img" src="${item.imageUrl}" alt="Photo of ${esc(item.code)}" title="Open full photo">` : `<div class="hero-img empty ${tone}">${icon(catIcon(cat.name))}<span>No photo</span></div>`}
        <div class="hero-body">
          <div class="code-row"><span class="code mono">${esc(item.code)}</span><button class="icon-btn sm" id="i-copy-id" title="Copy ID" aria-label="Copy ID">${icon('copy')}</button></div>
          <div class="hero-title">${esc(item.title || cat.name)}</div>
          <div class="hero-meta">
            ${isAdmin() ? `<div class="status-pick"><button type="button" class="badge-btn" id="i-st" title="Change status" aria-haspopup="true">${badge(item.status)}${icon('chev')}</button>
              <div class="menu st-menu" id="i-st-menu" hidden><div class="menu-head"><b>Change status</b><span>Recorded in the history automatically</span></div>${state.meta.statuses.map((x) => `<button type="button" data-st="${esc(x)}" class="${x === item.status ? 'on' : ''}"><span class="st-ic ${statusCls(x)}">${icon(STATUS_ICONS[x] || 'dot')}</span>${esc(x)}${x === item.status ? icon('check') : ''}</button>`).join('')}</div></div>` : badge(item.status)}
            <a class="tag ${tone} tag-link" href="#/c/${cat.id}">${icon(catIcon(cat.name))}${esc(cat.name)}</a>
          </div>
          <div class="facts">
            <span>${icon('sparkle')}Added ${esc(fmtTs(item.created_at))}${item.created_by ? ' by ' + esc(item.created_by) : ''}</span>
            <span>${icon('refresh')}Updated ${esc(fmtTs(item.updated_at))}</span>
          </div>
        </div></div></div>
      <div class="card"><div class="card-h"><h2>${icon('file')}Details <span class="count-pill">${filled}/${cat.fields.length} filled</span></h2>
        <label class="check-sm"><input type="checkbox" id="i-hide-empty"> Hide empty fields</label></div>
        <dl class="kv" id="i-kv">${cat.fields.map((f) => { const empty = item.data[f.key] === '' || item.data[f.key] == null; return `<div class="kv-row ${empty ? 'is-empty' : ''}"><dt>${icon(fieldIcon(f))}${esc(f.label)}</dt><dd>${fmtVal(f, item.data[f.key])}</dd></div>`; }).join('')}</dl></div>
    </div>
    <div class="card qr-card" style="align-self:start"><div class="qr-wrap">
      <img src="/api/items/${item.id}/qr.png" alt="QR code for ${esc(item.code)}">
      <div><h2 style="margin-bottom:4px">${icon('qr')} QR code</h2><p class="small muted" style="margin:0">Scanning this code opens this page directly.</p>
      <div class="url-box mono" id="i-url">${esc(item.url)}</div>
      <div class="actions" style="justify-content:center"><a class="btn sm" href="/api/items/${item.id}/qr.png?download=1">${icon('download')}PNG</a><button class="btn sm" id="i-copy">${icon('link')}Copy link</button><a class="btn sm" href="#/labels?ids=${item.id}">${icon('printer')}Label</a></div></div></div></div>
  </div>
  <div class="card" style="margin-top:16px" id="i-history"><div class="card-h"><h2>${icon('clock')}History <span class="count-pill" id="h-count"></span></h2>
    <label class="check-sm"><input type="checkbox" id="h-hide"> Hide system entries</label></div>
    ${isAdmin() ? `<button type="button" class="btn h-add-toggle" id="h-toggle">${icon('plus')}Add history entry<span class="muted small hide-sm">Repair, transfer, invoice, reading…</span></button>
      <form id="h-form" class="h-add" hidden><div class="card-h" style="margin-bottom:10px"><h3>New history entry</h3><button type="button" class="btn sm ghost" id="h-cancel">${icon('x')}Cancel</button></div><div class="form-err" hidden></div>
      <div class="field"><span>${icon('list')}What kind of update?</span>${typeChips('h-type', state.meta.historyTypes[0])}<select id="h-type" hidden>${state.meta.historyTypes.map((t) => `<option>${esc(t)}</option>`).join('')}</select></div>
      <div class="form-grid"><label class="field"><span>${icon('calendar')}Date</span><input type="date" id="h-date" value="${todayIso()}" required></label><div></div>
      <label class="field full"><span>${icon('note')}Details</span><textarea id="h-note" placeholder="What happened? Who, where, cost, invoice number…"></textarea></label>
      <div class="field full"><span>${icon('file')}Attachments (PDF or images, multiple)</span>${pickerHtml}</div></div>
      <button class="btn primary" type="submit">${icon('check')}Add to history</button></form>` : ''}
    <ul class="tl" id="h-list"></ul></div>`;
  let entries = [];
  const hideKey = 'hideAuto';
  $('#h-hide').checked = localStorageGet(hideKey) === '1';
  $('#i-hide-empty').checked = localStorageGet('hideEmpty') === '1';
  const paintKv = () => { $('#i-kv').classList.toggle('hide-empty', $('#i-hide-empty').checked); };
  $('#i-hide-empty').onchange = (e) => { localStorageSet('hideEmpty', e.target.checked ? '1' : '0'); paintKv(); }; paintKv();
  const paint = () => {
    const hide = $('#h-hide').checked;
    const list = entries.filter((e) => !(hide && e.auto));
    $('#h-count').textContent = entries.length ? entries.length : '';
    $('#h-list').innerHTML = list.length ? timelineHtml(list, { actions: isAdmin() }) : `<li class="muted">${entries.length ? 'Only system entries so far.' : 'No history yet.'}</li>`;
  };
  const load = async () => { const r = await api(`/api/history?item=${item.id}&pageSize=500`); if (!main.isConnected) return; entries = r.entries; paint(); };
  $('#h-hide').onchange = (e) => { localStorageSet(hideKey, e.target.checked ? '1' : '0'); paint(); };
  if ($('#i-img')) $('#i-img').onclick = () => window.open(item.imageUrl, '_blank');
  const copy = async (txt, ok) => { try { await navigator.clipboard.writeText(txt); toast(ok); } catch { toast('Copy failed, select the text manually', true); } };
  $('#i-copy').onclick = () => copy(item.url, 'Link copied');
  $('#i-copy-id').onclick = () => copy(item.code, `Copied ${item.code}`);
  if (isAdmin()) {
    $('#i-edit').onclick = () => itemForm(cat, item, () => { toast('Saved'); refreshCats(); route(); });
    $('#i-del').onclick = async () => {
      if (!(await confirmBox('Delete item', `Permanently delete <b>${esc(item.code)}</b> with its photo, history and attachments? This cannot be undone. To keep the record, set the status to Scrapped instead.`))) return;
      try { await api('/api/items/' + item.id, { method: 'DELETE' }); toast('Deleted'); await refreshCats(); location.hash = '#/c/' + cat.id; } catch (e) { toast(e.message, true); }
    };
    $('#i-st').onclick = (e) => { e.stopPropagation(); $('#i-st-menu').hidden = !$('#i-st-menu').hidden; };
    document.addEventListener('click', () => { const m = $('#i-st-menu'); if (m) m.hidden = true; }, { once: false, signal: routeAbort.signal });
    $('#i-st-menu').onclick = async (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-st]'); if (!b) return;
      $('#i-st-menu').hidden = true;
      if (b.dataset.st === item.status) return;
      const fd = new FormData(); fd.append('data', JSON.stringify(item.data)); fd.append('status', b.dataset.st);
      try { await api('/api/items/' + item.id, { method: 'PUT', body: fd }); toast(`Status changed to ${b.dataset.st}`); refreshCats(); refreshBell(); route(); } catch (ex) { toast(ex.message, true); }
    };
    const showForm = (on) => { $('#h-form').hidden = !on; $('#h-toggle').hidden = on; if (on) $('#h-note').focus(); };
    $('#h-toggle').onclick = () => showForm(true);
    $('#h-cancel').onclick = () => showForm(false);
    bindTypeChips($('#h-form'));
    const files = []; filePicker($('#h-form'), files);
    $('#h-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(); fd.append('type', $('#h-type').value); fd.append('event_date', $('#h-date').value); fd.append('note', $('#h-note').value);
      for (const f of files) fd.append('files', f.type.startsWith('image/') ? await resizeImage(f, 1800) : f, f.name);
      const btn = $('button[type=submit]', e.target); busy(btn, true); $('.form-err', e.target).hidden = true;
      try { await api(`/api/items/${item.id}/history`, { method: 'POST', body: fd }); files.length = 0; $('#h-note').value = ''; $('.pick-list').innerHTML = ''; toast('History updated'); showForm(false); await load(); }
      catch (ex) { const er = $('.form-err', e.target); er.textContent = ex.message; er.hidden = false; }
      busy(btn, false);
    };
    $('#h-list').addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      if (ed) editEntry(entries.find((x) => x.id === Number(ed.dataset.edit)), load);
      if (dl) {
        if (!(await confirmBox('Delete history entry', 'Delete this entry and its attachments?'))) return;
        try { await api('/api/history/' + dl.dataset.del, { method: 'DELETE' }); toast('Entry deleted'); load(); } catch (ex) { toast(ex.message, true); }
      }
    });
  }
  await load();
}
function editEntry(e, done) {
  const files = [], remove = new Set();
  modal({ title: 'Edit history entry', body: `<div class="form-err" hidden></div><div class="form-grid">
    <div class="field full"><span>${icon('list')}Type</span>${typeChips('e-type', e.type)}<select id="e-type" hidden>${state.meta.historyTypes.map((t) => `<option ${t === e.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    <label class="field"><span>Date</span><input type="date" id="e-date" value="${esc(e.event_date)}"></label>
    <label class="field full"><span>Details</span><textarea id="e-note">${esc(e.note)}</textarea></label>
    <div class="field full"><span>Existing attachments (untick to remove)</span>${e.attachments.length ? e.attachments.map((a) => `<label class="check" style="margin-bottom:6px"><input type="checkbox" checked data-aid="${a.id}"> <a href="${a.url}" target="_blank">${esc(a.name)}</a> <span class="muted small">${sizeStr(a.size)}</span></label>`).join('') : '<span class="muted">None</span>'}</div>
    <div class="field full"><span>Add more files</span>${pickerHtml}</div></div>`,
  footer: `<button class="btn" data-close>Cancel</button><button class="btn primary" id="save">${icon('check')}Save changes</button>`,
  onMount(m) {
    filePicker(m.el, files); bindTypeChips(m.el);
    m.$('#save').onclick = async (ev) => {
      const btn = ev.currentTarget;
      $$('[data-aid]', m.el).forEach((c) => { if (!c.checked) remove.add(Number(c.dataset.aid)); });
      const fd = new FormData(); fd.append('type', m.$('#e-type').value); fd.append('event_date', m.$('#e-date').value); fd.append('note', m.$('#e-note').value);
      fd.append('removeAttachments', JSON.stringify([...remove]));
      for (const f of files) fd.append('files', f.type.startsWith('image/') ? await resizeImage(f, 1800) : f, f.name);
      busy(btn, true);
      try { await api('/api/history/' + e.id, { method: 'PUT', body: fd }); m.close(); toast('Entry updated'); done(); } catch (ex) { m.setErr(ex.message); busy(btn, false); }
    };
  } });
}

/* ====== global history ====== */
const hs = { q: '', category: '', type: '', from: '', to: '', source: '', page: 1 };
async function viewHistory(main) {
  main.innerHTML = `<div class="page-head"><div class="ph-main">${titleIc('clock', 'tone-3')}<div><h1>History log</h1><div class="muted">Every update across all items. Open an item to add a new entry.</div></div></div>
    <div class="actions"><button class="btn" id="g-exp">${icon('download')}Download history (Excel)</button></div></div>
  <div class="toolbar"><div class="tb-search"><span class="ic-slot">${icon('search')}</span><input type="search" id="g-q" placeholder="Search details or ID" value="${esc(hs.q)}"></div>
    <select id="g-cat" aria-label="Category"><option value="">All categories</option>${state.cats.map((c) => `<option value="${c.id}" ${String(hs.category) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <select id="g-type" aria-label="Entry type"><option value="">All types</option>${['Created', 'Updated', 'Status Change', ...state.meta.historyTypes].map((t) => `<option ${hs.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <input type="date" id="g-from" value="${hs.from}" title="From date" aria-label="From date"><input type="date" id="g-to" value="${hs.to}" title="To date" aria-label="To date">
    <label class="check-sm"><input type="checkbox" id="g-src" ${hs.source ? 'checked' : ''}> Manual entries only</label></div>
  <div class="card"><ul class="tl" id="g-list"></ul><div class="pager"><span class="muted small" id="g-info"></span><div class="actions"><button class="btn sm" id="g-prev">${icon('back')}Previous</button><button class="btn sm" id="g-next">Next ${icon('arrowR')}</button></div></div></div>`;
  const q = () => { const p = new URLSearchParams(); Object.entries(hs).forEach(([k, v]) => { if (v && k !== 'page') p.set(k, v); }); return p; };
  async function load() {
    const p = q(); p.set('page', hs.page); p.set('pageSize', 30);
    const r = await api('/api/history?' + p); if (!main.isConnected) return;
    $('#g-list').innerHTML = r.entries.length ? timelineHtml(r.entries, { showItem: true }) : `<li class="muted">${emptyState('No entries match', '<div class="small">Try clearing a filter or widening the dates.</div>', 'clock')}</li>`;
    $('#g-info').textContent = `${r.total.toLocaleString('en-IN')} entries · page ${hs.page} of ${Math.max(1, Math.ceil(r.total / 30))}`;
    $('#g-prev').disabled = hs.page <= 1; $('#g-next').disabled = hs.page * 30 >= r.total;
  }
  let t; const reload = () => { hs.page = 1; load(); };
  $('#g-q').oninput = (e) => { hs.q = e.target.value.trim(); clearTimeout(t); t = setTimeout(reload, 250); };
  $('#g-cat').onchange = (e) => { hs.category = e.target.value; reload(); };
  $('#g-type').onchange = (e) => { hs.type = e.target.value; reload(); };
  $('#g-from').onchange = (e) => { hs.from = e.target.value; reload(); };
  $('#g-to').onchange = (e) => { hs.to = e.target.value; reload(); };
  $('#g-src').onchange = (e) => { hs.source = e.target.checked ? 'manual' : ''; reload(); };
  $('#g-prev').onclick = () => { hs.page--; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#g-next').onclick = () => { hs.page++; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  $('#g-exp').onclick = () => { location.href = '/api/history.xlsx' + (hs.category ? '?category=' + hs.category : ''); };
  await load();
}

/* ====== QR labels ====== */
async function viewLabels(main, params) {
  let items = [];
  if (params.get('ids')) items = await Promise.all(params.get('ids').split(',').slice(0, 300).map((i) => api('/api/items/' + Number(i))));
  else if (params.get('cat')) {
    for (let p = 1; p <= 25; p++) { const r = await api(`/api/items?category=${params.get('cat')}&page=${p}&pageSize=200`); items.push(...r.items); if (p * 200 >= r.total) break; }
  }
  const sizeKey = localStorageGet('labelSize') || 'md';
  main.innerHTML = `<div class="page-head noprint"><div><a href="javascript:history.back()" class="crumb">${icon('back')}Back</a><h1 class="h-inline">${icon('qr')}QR labels</h1><div class="muted">${items.length} label${items.length === 1 ? '' : 's'}. Print on sticker paper or plain A4 and cut out.</div></div>
    <div class="actions"><select id="l-size" aria-label="Label size"><option value="sm">Small 50 × 30 mm</option><option value="md">Medium 70 × 40 mm</option><option value="lg">Large 100 × 60 mm</option></select>
    <button class="btn primary" id="l-print">${icon('printer')}Print</button></div></div>
    ${items.length ? `<div class="label-stage"><div class="labels" id="l-grid"></div></div>` : `<div class="card">${emptyState('No items to print', '<div class="small">Choose items in a category list first.</div>', 'qr')}</div>`}`;
  if (!items.length) return;
  const paint = () => {
    const sz = $('#l-size').value; localStorageSet('labelSize', sz);
    $('#l-grid').innerHTML = items.map((i) => `<div class="label ${sz}"><img src="/api/items/${i.id}/qr.png" alt=""><div class="t"><div class="org">${esc(state.meta.orgName)}</div><div class="id">${esc(i.code)}</div><div class="nm">${esc(i.title || '')}</div><div class="ct">${esc(i.category_name)}</div></div></div>`).join('');
  };
  $('#l-size').value = sizeKey; $('#l-size').onchange = paint; paint();
  $('#l-print').onclick = () => window.print();
}

/* ====== QR scanner ====== */
function codeFromScan(text) {
  const m = String(text).match(/\/i\/([^/?#\s]+)\/([^/?#\s]+)/);
  return m ? `${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}` : String(text).trim();
}
function openScanner() {
  let stream, raf, stopped = false;
  const secure = window.isSecureContext;
  const m = modal({ title: 'Scan QR label', size: 'narrow', body: `<div class="form-err" hidden></div><div class="scan">
    ${secure ? '<div class="scan-frame"><video id="sc-v" playsinline muted></video></div><canvas id="sc-c" hidden></canvas><p class="small muted" style="margin-top:0">Point the camera at the QR label.</p>' : '<p class="muted" style="margin-top:0">Camera scanning in the browser needs a secure (HTTPS) address. You can still scan with the phone\'s own camera app, or enter the ID below.</p>'}
    <label class="field" style="margin-bottom:0"><span>Or type an ID, e.g. PC/01</span><div class="inline-form"><input id="sc-code" placeholder="PC/01" autocapitalize="characters"><button class="btn primary" id="sc-go">Open</button></div></label></div>` });
  const stop = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  m.el._onClose = stop;
  const go = async (text) => {
    try { const it = await api('/api/items/lookup?code=' + encodeURIComponent(codeFromScan(text))); stop(); m.el._onClose = null; m.close(); location.hash = '#/item/' + it.code; }
    catch (e) { m.setErr(e.message); }
  };
  m.$('#sc-go').onclick = () => go(m.$('#sc-code').value);
  m.$('#sc-code').onkeydown = (e) => { if (e.key === 'Enter') go(e.target.value); };
  if (!secure) return;
  const s = document.createElement('script'); s.src = '/vendor/jsQR.js';
  s.onload = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      const v = m.$('#sc-v'), c = m.$('#sc-c'), ctx = c.getContext('2d', { willReadFrequently: true });
      v.srcObject = stream; await v.play();
      const tick = () => {
        if (stopped) return;
        if (v.videoWidth) {
          c.width = v.videoWidth; c.height = v.videoHeight; ctx.drawImage(v, 0, 0);
          const r = window.jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
          if (r && r.data) { go(r.data); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { m.setErr('Camera is not available or permission was denied. Enter the ID instead.'); }
  };
  document.head.appendChild(s);
}
$('#scan-btn').onclick = openScanner;

/* ====== users ====== */
async function viewUsers(main) {
  const users = await api('/api/users');
  main.innerHTML = `<div class="page-head"><div class="ph-main">${titleIc('users', 'tone-1')}<div><h1>Users</h1><div class="muted">Admins can add and edit. Viewers can look up items and scan QR codes.</div></div></div>
    <div class="actions"><button class="btn primary" id="u-add">${icon('plus')}Add user</button></div></div>
    <div class="tbl-wrap stackable"><table class="tbl"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td class="td-title"><span style="display:inline-flex;align-items:center;gap:10px"><span class="avatar">${esc(initials(u.name))}</span>${esc(u.name)}</span></td><td data-label="Username" class="mono"><span>${esc(u.username)}</span></td><td data-label="Role"><span style="text-transform:capitalize">${esc(u.role)}</span></td><td data-label="Status"><span>${u.active ? badge('Active') : badge('Inactive')}</span></td><td data-label="Created"><span>${esc(fmtDate((u.created_at || '').slice(0, 10)))}</span></td><td class="right td-act"><button class="btn sm" data-u="${u.id}">${icon('edit')}Edit</button></td></tr>`).join('')}</tbody></table></div>`;
  const form = (u) => modal({ title: u ? `Edit ${u.username}` : 'Add user', size: 'narrow', body: `<div class="form-err" hidden></div>
    <label class="field"><span>Full name</span><input id="u-name" value="${esc(u ? u.name : '')}"></label>
    ${u ? '' : '<label class="field"><span>Username</span><input id="u-user" autocomplete="off" autocapitalize="none"></label>'}
    <label class="field"><span>Role</span><select id="u-role"><option value="admin" ${u && u.role === 'admin' ? 'selected' : ''}>Admin (can edit)</option><option value="viewer" ${u && u.role === 'viewer' ? 'selected' : ''}>Viewer (read only)</option></select></label>
    <label class="field"><span>${u ? 'Reset password (leave blank to keep)' : 'Temporary password (min 8 characters)'}</span><input id="u-pw" type="text" autocomplete="off"></label>
    ${u ? `<label class="check"><input type="checkbox" id="u-act" ${u.active ? 'checked' : ''}><span>Account active</span></label>` : ''}`,
  footer: `<button class="btn" data-close>Cancel</button><button class="btn primary" id="save">${icon('check')}Save</button>`,
  onMount(m) {
    m.$('#save').onclick = async () => {
      try {
        if (u) await api('/api/users/' + u.id, { method: 'PUT', json: { name: m.$('#u-name').value, role: m.$('#u-role').value, active: m.$('#u-act').checked, password: m.$('#u-pw').value || undefined } });
        else await api('/api/users', { json: { name: m.$('#u-name').value, username: m.$('#u-user').value, role: m.$('#u-role').value, password: m.$('#u-pw').value } });
        m.close(); toast('Saved'); viewUsers(main);
      } catch (e) { m.setErr(e.message); }
    };
  } });
  $('#u-add').onclick = () => form(null);
  $$('[data-u]').forEach((b) => { b.onclick = () => form(users.find((x) => x.id === Number(b.dataset.u))); });
}

/* ====== settings ====== */
async function viewSettings(main) {
  main.innerHTML = `<div class="page-head"><div class="ph-main">${titleIc('sliders', 'tone-6')}<div><h1>Settings &amp; backup</h1><div class="muted">Organisation name, QR address, Excel auto-sync and full backup.</div></div></div></div>
  <div class="card"><div class="card-h"><h2>${icon('qr')}QR code address</h2></div><div class="form-err" hidden></div>
    <p class="muted" style="margin-top:0">QR codes contain a link to each item. Enter the address your team uses to open this site, for example <span class="mono">https://mis.perfactgroup.in</span> or <span class="mono">http://192.168.1.20:3000</span>. Labels already printed keep the address they were printed with, so set this before printing in bulk.</p>
    <div class="form-grid">
      <label class="field"><span>Organisation name</span><input id="s-org" value="${esc(state.meta.orgName)}"></label>
      <label class="field"><span>Site address (leave blank to use the address you are visiting now)</span><input id="s-base" placeholder="https://" value="" inputmode="url"></label>
    </div>
    <p class="small muted" style="margin-top:0">Currently used in QR codes: <b class="mono">${esc(state.meta.baseUrl)}</b></p>
    <hr class="hr">
    <h3 style="margin-bottom:10px">Excel auto-sync</h3>
    <label class="field"><span>Excel auto-sync folder (full path on the computer running this server)</span><input id="s-sync" placeholder="C:\\Users\\YourName\\OneDrive\\Perfact MIS" value="${esc(state.meta.syncDir || '')}"></label>
    <p class="small muted">After every save, edit or delete, all data is written to <b class="mono">${esc(state.meta.syncFile || 'Perfact-MIS-Live.xlsx')}</b> in this folder. Choose a folder inside OneDrive to open it in Microsoft Excel from any device. Leave blank to use the default folder inside the project's data folder. Rows you add, edit or delete in that Excel file are read back into the app after you save it.${state.meta.syncOk ? ' Last updated: ' + esc(new Date(state.meta.syncOk).toLocaleString('en-IN')) + '.' : ''}</p>
    ${state.meta.syncPull ? `<p class="small muted">Last changes read from Excel: ${esc((state.meta.syncPull.split('|')[1] || ''))}.</p>` : ''}
    ${state.meta.syncError ? `<div class="form-err">${icon('alert')}<span>${esc(state.meta.syncError)}</span></div>` : ''}
    <button class="btn primary" id="s-save">${icon('check')}Save settings</button></div>
  <div class="card"><div class="card-h"><h2>${icon('download')}Backup</h2></div>
    <p class="muted" style="margin-top:0">Downloads one ZIP with an Excel workbook of every category (with photos and the full history), all history PDFs and images organised by item ID, and a copy of the database for restoring.</p>
    <a class="btn primary" href="/api/export/backup.zip">${icon('download')}Download full backup</a></div>`;
  $('#s-save').onclick = async (ev) => {
    const btn = ev.currentTarget; busy(btn, true);
    try {
      const r = await api('/api/settings', { method: 'PUT', json: { orgName: $('#s-org').value, baseUrl: $('#s-base').value, syncDir: $('#s-sync').value } });
      state.meta.orgName = r.orgName; state.meta.baseUrl = r.baseUrl; state.meta.syncDir = r.syncDir; state.meta.syncFile = r.syncFile; $('#brand-name').textContent = 'Admin MIS'; toast('Settings saved'); viewSettings(main);
    } catch (e) { const er = $('.form-err', main); er.textContent = e.message; er.hidden = false; busy(btn, false); }
  };
}

/* ====== categories & fields ====== */
async function viewCategories(main) {
  await refreshCats();
  main.innerHTML = `<div class="page-head"><div class="ph-main">${titleIc('layers', 'tone-2')}<div><h1>Categories &amp; fields</h1><div class="muted">Each category gets its own ID prefix, fields and dropdown lists.</div></div></div>
    <div class="actions"><button class="btn primary" id="k-add">${icon('plus')}New category</button></div></div>
  <div class="tbl-wrap stackable"><table class="tbl"><thead><tr><th>Category</th><th>Prefix</th><th>Group</th><th>Fields</th><th>Entries</th><th></th></tr></thead><tbody>
  ${state.cats.map((c) => `<tr><td class="td-title"><span style="display:inline-flex;align-items:center;gap:9px">${icon(catIcon(c.name))}<a href="#/c/${c.id}" style="color:inherit">${esc(c.name)}</a></span></td><td data-label="Prefix" class="mono"><span>${esc(c.prefix)}</span></td><td data-label="Group"><span>${esc(c.grp)}</span></td><td data-label="Fields"><span>${c.fields.length}</span></td><td data-label="Entries"><span>${c.count.toLocaleString('en-IN')}</span></td>
    <td class="right td-act"><span class="actions" style="justify-content:flex-end"><button class="btn sm" data-k="${c.id}">${icon('edit')}Edit</button><button class="btn sm danger" data-kd="${c.id}" aria-label="Delete ${esc(c.name)}">${icon('trash')}</button></span></td></tr>`).join('')}</tbody></table></div>`;
  $('#k-add').onclick = () => categoryForm(null, () => viewCategories(main));
  $$('[data-k]').forEach((b) => { b.onclick = () => categoryForm(catById(b.dataset.k), () => viewCategories(main)); });
  $$('[data-kd]').forEach((b) => {
    b.onclick = async () => {
      const c = catById(b.dataset.kd);
      if (!(await confirmBox('Delete category', `Delete <b>${esc(c.name)}</b>? Only empty categories can be deleted.`))) return;
      try { await api('/api/categories/' + c.id, { method: 'DELETE' }); toast('Deleted'); viewCategories(main); } catch (e) { toast(e.message, true); }
    };
  });
}
function categoryForm(cat, done) {
  const fields = cat ? cat.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined })) : [{ label: '', type: 'text' }];
  const groups = [...new Set(state.cats.map((c) => c.grp))];
  modal({ title: cat ? `Edit ${cat.name}` : 'New category', size: 'wide', body: `<div class="form-err" hidden></div>
    <div class="form-grid"><label class="field"><span>Category name</span><input id="k-name" value="${esc(cat ? cat.name : '')}"></label>
    <label class="field"><span>ID prefix (letters/digits, e.g. PC)</span><input id="k-prefix" maxlength="8" style="text-transform:uppercase" value="${esc(cat ? cat.prefix : '')}" ${cat && cat.count ? 'disabled title="Locked because items exist"' : ''}></label>
    <label class="field"><span>Sidebar group</span><input id="k-grp" list="k-grps" value="${esc(cat ? cat.grp : 'Other')}"><datalist id="k-grps">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist></label></div>
    <h3 style="margin:6px 0 4px">Fields</h3><p class="small muted" style="margin:0 0 10px">The first five show in the list table. Tick "Due date alert" on date fields to get dashboard alerts.</p><div id="k-fields"></div>
    <button class="btn sm" id="k-addf" type="button">${icon('plus')}Add field</button>`,
  footer: `<button class="btn" data-close>Cancel</button><button class="btn primary" id="save">${icon('check')}Save category</button>`,
  onMount(m) {
    const paint = () => {
      m.$('#k-fields').innerHTML = fields.map((f, i) => `<div class="fld-row" data-i="${i}">
        <input data-p="label" placeholder="Field label" value="${esc(f.label)}">
        <select data-p="type">${['text', 'textarea', 'number', 'money', 'date', 'select'].map((t) => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${{ text: 'Text', textarea: 'Long text', number: 'Number', money: 'Amount (₹)', date: 'Date', select: 'Dropdown' }[t]}</option>`).join('')}</select>
        ${f.type === 'select' ? `<input data-p="options" placeholder="Options, comma separated" value="${esc((f.options || []).join(', '))}">` : f.type === 'date' ? `<label class="check-sm"><input type="checkbox" data-p="expiry" ${f.expiry ? 'checked' : ''}> Due date alert</label>` : '<span></span>'}
        <label class="check-sm"><input type="checkbox" data-p="required" ${f.required ? 'checked' : ''}> Required</label>
        <span style="display:flex"><button class="btn sm ghost" data-mv="-1" type="button" aria-label="Move up">&uarr;</button><button class="btn sm ghost" data-mv="1" type="button" aria-label="Move down">&darr;</button></span>
        <button class="btn sm ghost danger" data-rm type="button" aria-label="Remove field">${icon('trash')}</button></div>`).join('');
    };
    const sync = (el) => {
      const row = el.closest('.fld-row'); if (!row) return; const f = fields[Number(row.dataset.i)], p = el.dataset.p; if (!p) return;
      if (p === 'options') f.options = el.value.split(','); else if (el.type === 'checkbox') f[p] = el.checked; else f[p] = el.value;
      if (p === 'type') { if (f.type === 'select' && !f.options) f.options = []; paint(); }
    };
    m.$('#k-fields').addEventListener('input', (e) => { if (e.target.dataset.p !== 'type') sync(e.target); });
    m.$('#k-fields').addEventListener('change', (e) => sync(e.target));
    m.$('#k-fields').addEventListener('click', (e) => {
      const row = e.target.closest('.fld-row'); if (!row) return; const i = Number(row.dataset.i);
      if (e.target.closest('[data-rm]')) { if (fields.length > 1) { fields.splice(i, 1); paint(); } }
      const mv = e.target.closest('[data-mv]'); if (mv) { const j = i + Number(mv.dataset.mv); if (j >= 0 && j < fields.length) { [fields[i], fields[j]] = [fields[j], fields[i]]; paint(); } }
    });
    m.$('#k-addf').onclick = () => { fields.push({ label: '', type: 'text' }); paint(); const rows = m.$$('.fld-row'); $('input', rows[rows.length - 1]).focus(); };
    paint();
    m.$('#save').onclick = async () => {
      const body = { name: m.$('#k-name').value, prefix: m.$('#k-prefix').value, grp: m.$('#k-grp').value, fields: fields.filter((f) => f.label.trim()) };
      try { await api(cat ? '/api/categories/' + cat.id : '/api/categories', { method: cat ? 'PUT' : 'POST', json: body }); m.close(); toast('Category saved'); await refreshCats(); done(); }
      catch (e) { m.setErr(e.message); }
    };
  } });
}

/* ====== guided tour ====== */
/* A step points at an element (sel, or mSel on phones). Steps whose element is not on screen are skipped,
   so viewers never see admin-only steps. `go` navigates first and waits for the element to appear. */
const isPhone = () => window.matchMedia('(max-width:760px)').matches;
const visibleEl = (sel) => { for (const s of [].concat(sel)) { const el = $(s); if (el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') return el; } return null; };
async function waitForEl(sel, ms) { const t0 = Date.now(); for (;;) { const el = visibleEl(sel); if (el || Date.now() - t0 > ms) return el; await new Promise((r) => setTimeout(r, 90)); } }
const busiestCat = () => [...state.cats].sort((a, b) => b.count - a.count)[0];
const TOURS = {
  main: {
    title: 'Getting started', sub: 'Menu, search, scanning, alerts and the dashboard', mins: 1, ic: 'sparkle',
    async steps() {
      return [
        { go: '#/', title: 'Welcome to Admin MIS', ic: 'sparkle', text: 'This short tour shows where everything is. Use <b>Next</b> and <b>Back</b>, or the arrow keys. You can leave at any time and restart it from <b>Help &amp; guide</b>.' },
        { sel: '#side .grp-body', mSel: '#bn-menu', title: 'Your registers', ic: 'layers', text: 'Every register (laptops, chairs, ACs, licences, vendors and more) is listed in the menu, grouped by type. The number beside each one is how many entries it holds. Type in <b>Find a category</b> to jump to one.', mText: 'Tap <b>Menu</b> to see every register, grouped by type, with the number of entries in each.' },
        { sel: '.search', mSel: '#search-open', title: 'Search everything', ic: 'search', text: 'Search across all registers by ID (for example PC/01), brand, serial number or person. Press <kbd>/</kbd> to jump here. Typing an exact ID and pressing Enter opens it straight away.' },
        { sel: '#scan-btn', mSel: '#bn-scan', title: 'Scan a QR label', ic: 'scan', text: 'Every item has a QR label. Scan it here to open that item, or with any phone camera. If the camera is not available you can type the ID instead.' },
        { sel: '#bell-btn', title: 'Due-date alerts', ic: 'bell', text: 'The bell counts warranties, services and licences that are due in the next 60 days. It turns red when something is overdue. Click it to see the list.' },
        { sel: '.qa-grid', title: 'Quick actions', ic: 'zap', text: 'The common jobs in one place: scan, add an item, import from Excel, print labels, open the history log or download everything.' },
        { sel: '#due', title: 'What needs attention', ic: 'alert', text: 'Items that are overdue or due soon, nearest first. Click any row to open the item.' },
        { sel: '#browse', title: 'Browse categories', ic: 'grid', text: 'All registers as tiles with their counts. Tick <b>Only categories with entries</b> to hide the empty ones.' },
        { sel: '#help-btn', mSel: '#bn-menu', title: 'Help is always here', ic: 'help', text: 'Open <b>Help &amp; guide</b> from this button at any time. It has step-by-step instructions for every task and shorter tours of the category and item pages.', mText: 'Open <b>Menu</b> and choose <b>Help &amp; guide</b> at any time for step-by-step instructions and more tours.' },
      ];
    },
  },
  category: {
    title: 'A category page', sub: 'Adding, finding, filtering, labels and downloads', mins: 1, ic: 'table',
    async steps() {
      const c = busiestCat(); if (!c) return null;
      return [
        { go: '#/c/' + c.id, sel: '.page-head .ph-main', title: 'This is a category page', ic: catIcon(c.name), text: `Each register has a page like this one for <b>${esc(c.name)}</b>. Every entry gets an ID made from the prefix (<b>${esc(c.prefix)}</b>) and a running number.` },
        { sel: '#c-add', title: 'Add an item', ic: 'plus', text: 'Opens a form with this register\'s fields. Fields marked <b>*</b> are required. The ID and QR code are created for you when you save.' },
        { sel: '#c-imp', title: 'Import from Excel', ic: 'upload', text: 'Add many rows at once. Download the template, fill it in and upload it. Rows that already exist are skipped, so importing twice is safe.' },
        { sel: '.toolbar .tb-search', title: 'Search this register', ic: 'search', text: 'Filters the list as you type, by any field.' },
        { sel: '#c-chips', title: 'Filter by status', ic: 'filter', text: 'Show only Active, In Stock, Issued, Under Repair and so on. Click <b>All statuses</b> to clear it.' },
        { sel: '.seg', title: 'Table or cards', ic: 'grid', text: 'Switch between a compact list and photo cards. Your choice is remembered.' },
        { sel: '#c-list', title: 'Your entries', ic: 'list', text: 'Click a row to open the item. Hover a row for quick <b>Edit</b>, <b>Print label</b> and <b>Open</b> buttons. Tick boxes to select rows.' },
        { sel: '#c-lbl', title: 'Print QR labels', ic: 'printer', text: 'Prints labels for the ticked rows, or for the whole register when nothing is ticked. Choose small, medium or large labels on the next page.' },
        { sel: '#c-exp', title: 'Download to Excel', ic: 'download', text: 'Downloads this register as a formatted Excel table, with photos and the full history if you want them.' },
      ];
    },
  },
  item: {
    title: 'An item page', sub: 'Status, details, QR code and history', mins: 1, ic: 'file',
    async steps() {
      const c = state.cats.find((x) => x.count) ; if (!c) { toast('Add an item first, then take this tour', true); return null; }
      const r = await api(`/api/items?category=${c.id}&pageSize=1`); if (!r.items.length) return null;
      return [
        { go: '#/item/' + r.items[0].code, sel: '.hero-card', title: 'Everything about one item', ic: 'file', text: 'The ID, name, photo, status and when it was added or changed. Click the copy button beside the ID to copy it.' },
        { sel: '#i-st', title: 'Change the status', ic: 'refresh', text: 'Click the status to change it in one step, for example from In Stock to Issued. The change is written to the history automatically.' },
        { sel: '#i-edit', title: 'Edit the details', ic: 'edit', text: 'Change any field or the photo. Every change is recorded in the history with the old and new values.' },
        { sel: '#i-kv', title: 'Details', ic: 'list', text: 'All fields for this item. Tick <b>Hide empty fields</b> to see only what has been filled in.' },
        { sel: '.qr-card', title: 'QR code', ic: 'qr', text: 'Scanning this code opens this page. Download it as a picture, copy the link or print a label.' },
        { sel: '#h-toggle', title: 'Add to the history', ic: 'plus', text: 'Record a purchase, issue, transfer, repair, reading or invoice. Pick the type, set the date, write the details and attach PDFs or photos.' },
        { sel: '#h-list', title: 'Full history', ic: 'clock', text: 'Everything that has happened to this item, newest first. Grey entries are recorded by the system; tick <b>Hide system entries</b> to see only your notes.' },
      ];
    },
  },
};
let tour = null;
async function startTour(name) {
  endTour();
  let steps;
  try { steps = await TOURS[name].steps(); } catch (e) { toast(e.message, true); return; }
  if (!steps || !steps.length) return;
  const ov = document.createElement('div'); ov.className = 'tour noprint';
  ov.innerHTML = '<div class="tour-hole"></div><div class="tour-tip" role="dialog" aria-modal="true" aria-live="polite"></div>';
  document.body.appendChild(ov);
  const onKey = (e) => {
    if (!tour) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); endTour(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showStep(tour.i + 1, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); showStep(tour.i - 1, -1); }
  };
  const onMove = () => { cancelAnimationFrame(tour?.raf); if (tour) tour.raf = requestAnimationFrame(placeTour); };
  document.addEventListener('keydown', onKey, true); window.addEventListener('resize', onMove); window.addEventListener('scroll', onMove, true);
  tour = { name, steps, i: 0, ov, el: null, off() { document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true); } };
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]'); if (!b) return;
    const a = b.dataset.tour;
    if (a === 'next') showStep(tour.i + 1, 1); else if (a === 'back') showStep(tour.i - 1, -1); else endTour(a === 'done');
  });
  showStep(0, 1);
}
function endTour(done) {
  if (!tour) return;
  const name = tour.name; tour.off(); tour.ov.remove(); tour = null;
  if (name === 'main') { localStorageSet('tourDone', '1'); const p = $('#tour-prompt'); if (p) p.remove(); }
  if (done) toast('Tour finished. Open Help & guide any time for more.');
}
async function showStep(i, dir) {
  const T = tour; if (!T) return;
  if (i < 0) return;
  if (i >= T.steps.length) return endTour(true);
  const st = T.steps[i];
  T.ov.classList.add('busy');
  if (st.go && location.hash !== st.go) location.hash = st.go;
  let el = null;
  if (st.sel) {
    el = await waitForEl(isNarrow() && st.mSel ? st.mSel : st.sel, st.go ? 4000 : 700);
    if (tour !== T) return;
    if (!el) return showStep(i + dir, dir);
  } else if (st.go) await waitForEl('.view', 2000);
  T.i = i; T.el = el;
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 20) { el.scrollIntoView({ block: r.height > innerHeight * 0.6 ? 'start' : 'center', behavior: 'smooth' }); await new Promise((res) => setTimeout(res, 380)); }
  }
  const n = T.steps.length, text = (isNarrow() && st.mText) || st.text;
  $('.tour-tip', T.ov).innerHTML = `<div class="tt-top"><span class="tt-ic">${icon(st.ic || 'sparkle')}</span><span class="tt-step">Step ${i + 1} of ${n}</span><button class="icon-btn sm" data-tour="close" aria-label="Close tour" title="Close (Esc)">${icon('x')}</button></div>
    <h3>${st.title}</h3><p>${text}</p>
    <div class="tt-bar"><i style="width:${((i + 1) / n) * 100}%"></i></div>
    <div class="tt-foot"><button class="btn sm ghost" data-tour="close">Skip tour</button><span class="actions">${i ? `<button class="btn sm" data-tour="back">${icon('back')}Back</button>` : ''}<button class="btn sm primary" data-tour="${i === n - 1 ? 'done' : 'next'}">${i === n - 1 ? `${icon('check')}Finish` : `Next ${icon('arrowR')}`}</button></span></div>`;
  T.ov.classList.remove('busy');
  placeTour();
  const nb = $('[data-tour="next"],[data-tour="done"]', T.ov); if (nb) nb.focus({ preventScroll: true });
}
function placeTour() {
  const T = tour; if (!T) return;
  const hole = $('.tour-hole', T.ov), tip = $('.tour-tip', T.ov), el = T.el;
  tip.classList.remove('center', 'float', 'sheet', 'sheet-top');
  if (!el || !el.isConnected) { hole.style.cssText = `left:${innerWidth / 2}px;top:${innerHeight / 2}px;width:0;height:0`; tip.style.cssText = ''; tip.classList.add('center'); return; }
  const r = el.getBoundingClientRect(), pad = 6;
  const top = Math.max(4, r.top - pad), bottom = Math.min(innerHeight - 4, r.bottom + pad);
  hole.style.cssText = `left:${r.left - pad}px;top:${top}px;width:${r.width + pad * 2}px;height:${Math.max(0, bottom - top)}px`;
  if (isPhone()) { tip.style.cssText = ''; tip.classList.add('sheet'); if (r.top + r.height / 2 > innerHeight * 0.55) tip.classList.add('sheet-top'); return; }
  const tw = tip.offsetWidth, th = tip.offsetHeight, vw = innerWidth, vh = innerHeight, gap = 16;
  let y, x;
  if (bottom + gap + th < vh - 10) y = bottom + gap;
  else if (top - gap - th > 10) y = top - gap - th;
  else if (r.right + gap + tw < vw - 10) { x = r.right + gap; y = Math.max(10, Math.min(vh - th - 10, top)); }
  else if (r.left - gap - tw > 10) { x = r.left - gap - tw; y = Math.max(10, Math.min(vh - th - 10, top)); }
  else { tip.style.cssText = ''; tip.classList.add('float'); return; }
  if (x == null) x = Math.max(10, Math.min(vw - tw - 10, r.left + r.width / 2 - tw / 2));
  tip.style.cssText = `left:${x}px;top:${y}px`;
}

/* ====== help & guide page ====== */
const GUIDES = [
  { k: 'find', ic: 'search', t: 'Find an item', who: 'Everyone', tour: 'main', steps: [
    'Click the <b>search bar</b> at the top, or press <kbd>/</kbd> on the keyboard. On a phone, tap <b>Search</b> at the bottom.',
    'Type an ID such as <b>PC/01</b>, a brand, a serial number or a person\'s name. Matches appear as you type.',
    'Click a result to open it. If you typed an exact ID, pressing <b>Enter</b> opens it directly.',
    'To look through one register instead, open it from the menu and use its own search box and status filters.'] },
  { k: 'scan', ic: 'scan', t: 'Scan a QR label', who: 'Everyone', steps: [
    'Click <b>Scan QR</b> in the top bar. On a phone, tap the round <b>Scan</b> button at the bottom.',
    'Allow camera access when the browser asks.',
    'Point the camera at the label. The item opens as soon as the code is read.',
    'No camera, or the site is not on https? Type the ID (for example <b>PC/01</b>) in the box and click <b>Open</b>. Any phone camera app can also scan the label and open the item.'] },
  { k: 'add', ic: 'plus', t: 'Add a new item', who: 'Admins', admin: true, tour: 'category', steps: [
    'Open the register from the menu, for example <b>Laptop</b>. You can also use <b>Add item</b> under Quick actions on the dashboard and pick the register.',
    'Click <b>Add item</b> (on a phone, the round <b>+</b> button).',
    'Fill in the fields. Fields marked <b>*</b> are required; everything else can be added later.',
    'Choose the <b>Status</b> and, if you like, take or choose a <b>photo</b>. Large photos are reduced automatically.',
    'Click <b>Save</b>. The next free ID (such as LAP/12) and its QR code are created for you.'] },
  { k: 'import', ic: 'upload', t: 'Import many items from Excel', who: 'Admins', admin: true, steps: [
    'Open the register and click <b>Import Excel</b>.',
    'Click <b>Download template</b>. It has the right column headings and dropdowns.',
    'Fill in one row per item. If your sheet already has IDs with the right prefix (for example PC/001) they are kept; rows without an ID get the next free number.',
    'Choose the filled file and click <b>Import</b>. You will see how many rows were added and any rows that were skipped, with the reason.',
    'Importing the same file again is safe: rows whose ID already exists are skipped.'] },
  { k: 'status', ic: 'refresh', t: 'Change status or edit an item', who: 'Admins', admin: true, tour: 'item', steps: [
    'Open the item (search, scan or click it in its register).',
    'To change only the status, click the <b>status badge</b> under the name and pick the new status, for example <b>Issued</b> or <b>Under Repair</b>.',
    'To change other details or the photo, click <b>Edit</b>, make the changes and click <b>Save</b>.',
    'Every change is written to the item\'s history automatically, with the old and new values.',
    'Prefer setting the status to <b>Scrapped</b> or <b>Lost</b> over deleting, so the record and its history are kept.'] },
  { k: 'history', ic: 'clock', t: 'Add a history entry (repair, issue, invoice…)', who: 'Admins', admin: true, tour: 'item', steps: [
    'Open the item and scroll to <b>History</b>.',
    'Click <b>Add history entry</b>.',
    'Pick what happened: Purchase, Issued / Assigned, Returned, Transferred, Repair / Service, Maintenance, Inspection, Reading, Payment / Invoice, Note or Other.',
    'Set the date and write the details: who, where, cost, invoice number.',
    'Attach bills, reports or photos (PDF or images, several at once) and click <b>Add to history</b>.',
    'Every update across all items can be seen and filtered on the <b>History log</b> page.'] },
  { k: 'labels', ic: 'printer', t: 'Print QR labels', who: 'Everyone', tour: 'category', steps: [
    'Admins: before printing in bulk, check the site address in <b>Settings &amp; backup</b>, because it is written into every QR code.',
    'Open the register. Tick the items you want, or tick nothing to print the whole register.',
    'Click <b>Print QR labels</b> (it shows how many are selected).',
    'Choose a size: small 50 × 30 mm, medium 70 × 40 mm or large 100 × 60 mm.',
    'Click <b>Print</b>. Use sticker paper, or plain A4 and cut along the dashed lines. For one item, use <b>Print label</b> on its page.'] },
  { k: 'excel', ic: 'download', t: 'Download data to Excel', who: 'Everyone', steps: [
    'For one register, open it and click <b>Download</b>. For everything, click <b>Download all</b> on the dashboard.',
    'Tick <b>Include product photos</b> if you want pictures in the sheet (the file will be larger).',
    'Keep <b>Include full history</b> ticked to get the history log as a second sheet.',
    'Click <b>Download</b>. The workbook has dropdowns and is marked CONFIDENTIAL in the print footer.',
    'For the history alone, open <b>History log</b> and click <b>Download history (Excel)</b>.'] },
  { k: 'alerts', ic: 'bell', t: 'Due dates and alerts', who: 'Everyone', steps: [
    'The <b>bell</b> in the top bar shows how many warranties, services or licences are due in the next 60 days. It turns red when something is overdue.',
    'Click the bell, or see <b>Due, expiring or overdue</b> on the dashboard, and click a row to open the item.',
    'Renew or service the item, add a history entry, then <b>Edit</b> the item and update the date. The alert clears.',
    'Admins choose which date fields raise alerts: in <b>Categories &amp; fields</b>, tick <b>Due date alert</b> on that date field.'] },
  { k: 'users', ic: 'users', t: 'Add a user or reset a password', who: 'Admins', admin: true, steps: [
    'Open <b>Users</b> under Administration in the menu.',
    'Click <b>Add user</b>, enter the full name and a username, and choose a role: <b>Admin</b> can add and edit; <b>Viewer</b> can search, scan and download only.',
    'Give a temporary password of at least 8 characters. The person is asked to change it after signing in.',
    'To reset a password or switch an account off, click <b>Edit</b> beside the user.'] },
  { k: 'cats', ic: 'layers', t: 'Change categories and fields', who: 'Admins', admin: true, steps: [
    'Open <b>Categories &amp; fields</b> under Administration.',
    'Click <b>Edit</b> beside a category, or <b>New category</b> to add one with its own ID prefix.',
    'Add, rename, reorder (arrows) or remove fields. Choose a type: text, long text, number, amount (₹), date or dropdown.',
    'The first five fields show in the list. Tick <b>Required</b> for must-fill fields and <b>Due date alert</b> on date fields that should raise alerts.',
    'The prefix is locked once the category has items, so printed labels keep working.'] },
  { k: 'backup', ic: 'sliders', t: 'Settings, Excel sync and backup', who: 'Admins', admin: true, steps: [
    'Open <b>Settings &amp; backup</b> under Administration.',
    'Set the <b>site address</b> your team uses (for example http://192.168.1.20:3000) before printing labels in bulk.',
    'Optionally set an <b>Excel auto-sync folder</b> inside OneDrive. A live workbook is rewritten there after every change.',
    'Click <b>Download full backup</b> regularly. The ZIP holds the workbook, all attachments, photos and a copy of the database.'] },
  { k: 'tips', ic: 'keyboard', t: 'Handy tips', who: 'Everyone', steps: [
    'Keyboard: <kbd>/</kbd> search, <kbd>S</kbd> scan, <kbd>N</kbd> add item on a category page, <kbd>G</kbd> then <kbd>D</kbd> dashboard, <kbd>G</kbd> then <kbd>H</kbd> history, <kbd>?</kbd> all shortcuts.',
    'Click ☰ (or press <kbd>[</kbd>) to shrink the menu to icons and get more room.',
    'The screen icon in the top bar switches between light, dark and your system theme.',
    'On a category page, switch between <b>Table</b> and <b>Cards</b>; the choice is remembered.',
    'The dashboard remembers the last eight items you opened under <b>Recently viewed</b>.'] },
];
async function viewHelp(main, params) {
  const guides = GUIDES.filter((g) => !g.admin || isAdmin());
  const open = params.get('g');
  main.innerHTML = `
  <div class="page-head"><div class="ph-main">${titleIc('help', 'tone-0')}<div><h1>Help &amp; guide</h1><div class="muted">Step-by-step instructions for everything in Admin MIS.</div></div></div></div>
  <div class="section-h" style="margin-top:4px"><h2>Guided tours</h2><span class="muted small">The screen is highlighted step by step</span></div>
  <div class="tour-cards">${Object.entries(TOURS).map(([k, t], i) => `<div class="tour-card tone-${[0, 1, 2][i]}"><span class="qa-ic">${icon(t.ic)}</span><div class="tc-t"><b>${t.title}</b><span>${t.sub}</span></div><span class="tc-m">${icon('clock')}${t.mins} min</span><button class="btn primary sm" data-start="${k}">${icon('arrowR')}Start</button></div>`).join('')}</div>
  <div class="section-h"><h2>How do I…</h2><div class="tb-search" style="max-width:300px"><span class="ic-slot">${icon('search')}</span><input type="search" id="hg-q" placeholder="Search the guide…"></div></div>
  <div class="guides" id="hg-list">${guides.map((g) => `<details class="guide" id="g-${g.k}" ${open === g.k ? 'open' : ''}><summary><span class="g-ic">${icon(g.ic)}</span><span class="g-t"><b>${g.t}</b><span>${g.who} · ${g.steps.length} steps</span></span>${icon('chev')}</summary>
    <ol class="g-steps">${g.steps.map((s, i) => `<li><span class="g-n">${i + 1}</span><div>${s}</div></li>`).join('')}</ol>
    ${g.tour ? `<div class="g-foot"><button class="btn sm" data-start="${g.tour}">${icon('sparkle')}Show me on screen</button></div>` : ''}</details>`).join('')}
    <div class="empty-state" id="hg-none" hidden>${emptyState('Nothing found', '<div class="small">Try another word, such as “label”, “import” or “password”.</div>', 'search')}</div></div>
  <div class="card help-foot"><span class="qa-ic tone-1">${icon('help')}</span><div><b>Still stuck?</b><div class="muted small">Ask your MIS administrator, or press <kbd>?</kbd> to see all keyboard shortcuts.</div></div></div>`;
  $$('[data-start]', main).forEach((b) => { b.onclick = () => startTour(b.dataset.start); });
  $('#hg-q').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase(); let shown = 0;
    $$('.guide', main).forEach((d) => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; if (hit) shown++; if (q) d.open = hit; });
    $('#hg-none').hidden = shown > 0;
  };
  if (open && $('#g-' + open)) setTimeout(() => $('#g-' + open).scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

/* ====== start ====== */
boot().then(() => { if (!state.me) showLogin(); });
