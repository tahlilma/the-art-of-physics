/* The Art of Physics. Static build; see README.md. */
'use strict';
/* =========================================================================
   Assembly
   ========================================================================= */
readTheme();
const PLATES = DEFS.map((d, i) => new Plate(d, i));
const first = document.getElementById('first'), rest = document.getElementById('rest'), toc = document.getElementById('toc');
let pairRow = null;
PLATES.forEach((p, i) => {
  const { head, body, label, fig, id } = p.build();
  const d = p.def;
  toc.append(h('li', {}, h('a', { href: '#' + id }, h('span', { class: 'n' }, ROMAN[i]), h('span', { class: 't' }, d.title), h('span', { class: 'lead', 'aria-hidden': 'true' }), h('span', { class: 'o' }, d.theme))));
  if (d.layout === 'pair') {
    if (!pairRow) { pairRow = h('section', { class: 'row pair' }); rest.append(pairRow); }
    pairRow.append(h('div', { class: 'cell', id, 'aria-labelledby': id + '-t' }, fig, label));
    return;
  }
  pairRow = null;
  const row = h('section', { class: `row ${d.layout}${i === 0 ? ' hero-row' : ''}`, id, 'aria-labelledby': id + '-t' });
  if (d.layout === 'left') row.append(fig, label); else row.append(label, fig);
  if (d.layout === 'full') { row.replaceChildren(fig, label); }
  (i === 0 ? first : rest).append(row);
});

/* visibility drives the loop */
const io = new IntersectionObserver(entries => {
  for (const e of entries) { const p = e.target._plate; p.visible = e.isIntersecting; if (p.visible) { p.dirty = true; p.resize(); } }
}, { rootMargin: '120px 0px' });
PLATES.forEach(p => { p.stage._plate = p; io.observe(p.stage); });

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  for (const p of PLATES) if (p.visible) p.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* theme */
const modeBtn = document.getElementById('mode');
function syncModeBtn() { modeBtn.textContent = T.dark ? 'Paper' : 'Blueprint'; modeBtn.setAttribute('aria-pressed', String(T.dark)); modeBtn.setAttribute('aria-label', T.dark ? 'Switch to paper mode' : 'Switch to blueprint mode'); }
modeBtn.addEventListener('click', () => {
  document.documentElement.setAttribute('data-theme', T.dark ? 'light' : 'dark');
  try { localStorage.setItem('pop-theme', document.documentElement.getAttribute('data-theme')); } catch (e) { }
  readTheme(); syncModeBtn(); PLATES.forEach(p => p.dirty = true);
});
try { const saved = localStorage.getItem('pop-theme'); if (saved) { document.documentElement.setAttribute('data-theme', saved); readTheme(); } } catch (e) { }
syncModeBtn();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); syncModeBtn(); PLATES.forEach(p => p.dirty = true); });

/* dimension line under the title, drawn to the title's measured width */
function drawTitleDim() {
  const t = document.getElementById('title'), svg = document.getElementById('titledim');
  const w = Math.round(t.getBoundingClientRect().width), H = 34, y = 15, ah = 10, aw = 3.4;
  svg.setAttribute('viewBox', `0 0 ${w} ${H}`); svg.style.width = w + 'px';
  svg.innerHTML = `<g stroke="currentColor" stroke-width="1" fill="none">
    <line x1="0.5" y1="0" x2="0.5" y2="${H - 6}"/><line x1="${w - 0.5}" y1="0" x2="${w - 0.5}" y2="${H - 6}"/>
    <line x1="${ah}" y1="${y}" x2="${w / 2 - 20}" y2="${y}"/><line x1="${w / 2 + 20}" y1="${y}" x2="${w - ah}" y2="${y}"/></g>
    <path d="M0.5 ${y} L${ah + 0.5} ${y - aw} L${ah + 0.5} ${y + aw} Z M${w - 0.5} ${y} L${w - ah - 0.5} ${y - aw} L${w - ah - 0.5} ${y + aw} Z" fill="currentColor"/>
    <text x="${w / 2}" y="${y + 6}" text-anchor="middle" font-family="${MF.replace(/"/g, "'")}" font-style="italic" font-size="19" fill="currentColor">ℓ</text>`;
}
/* "Physics": solid italic that a diagonal front dissolves into 45° section hatching */
const PW = { lines: [], u: [], full: 1, thin: 0.2, p: 0, raf: 0 };
function buildPhysicsWord() {
  const span = document.getElementById('phys'), svg = document.getElementById('physword');
  if (!span || !svg) return;
  const NS = 'http://www.w3.org/2000/svg', mk = (tag, at = {}) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const cs = getComputedStyle(span), fontPx = parseFloat(cs.fontSize), scale = fontPx / 100;
  const lsU = (parseFloat(cs.letterSpacing) || 0) / scale;
  const style = `font-family:${cs.fontFamily.replace(/"/g, "'")};font-style:italic;font-weight:600;font-size:100px;letter-spacing:${lsU}px`;
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 -200 2000 400'); svg.style.width = '20em'; svg.style.height = '4em';
  const probe = mk('text', { style }); probe.textContent = 'Physics'; svg.append(probe);
  const bb = probe.getBBox(); probe.remove();
  const pl = 8, pr = 22, pt = 6, pb = 6, vb = [bb.x - pl, bb.y - pt, bb.width + pl + pr, bb.height + pt + pb];
  svg.setAttribute('viewBox', vb.join(' '));
  svg.style.width = vb[2] * scale + 'px'; svg.style.height = vb[3] * scale + 'px';
  // align the SVG baseline and pen origin with the real text underneath
  const sr = span.getBoundingClientRect(), br = span.querySelector('.bl').getBoundingClientRect();
  svg.style.left = (br.left - sr.left + vb[0] * scale) + 'px';
  svg.style.top = (br.top - sr.top + vb[1] * scale) + 'px';
  // hatch geometry: spacing and line weights chosen in screen pixels
  const sp = clamp(fontPx * 0.052, 4, 8) / scale, step = sp * Math.SQRT2;
  PW.full = sp + 0.7 / scale; PW.thin = Math.max(1.05 / scale, sp * 0.24);
  const ring = clamp(fontPx * 0.0095, 0.8, 1.5) / scale;
  const defs = mk('defs'), clip = mk('clipPath', { id: 'phys-clip' }), ct = mk('text', { style }); ct.textContent = 'Physics'; clip.append(ct);
  const flt = mk('filter', { id: 'phys-ring', filterUnits: 'userSpaceOnUse', x: vb[0], y: vb[1], width: vb[2], height: vb[3] });
  flt.append(mk('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: ring.toFixed(3), result: 'd' }),
    mk('feComposite', { in: 'd', in2: 'SourceAlpha', operator: 'out', result: 'r' }),
    mk('feFlood', { style: 'flood-color: var(--text)', result: 'c' }),
    mk('feComposite', { in: 'c', in2: 'r', operator: 'in' }));
  defs.append(clip, flt); svg.append(defs);
  const g = mk('g', { 'clip-path': 'url(#phys-clip)', stroke: 'currentColor', 'stroke-linecap': 'butt' });
  const y0 = vb[1], y1 = vb[1] + vb[3], cmin = vb[0] + y0, cmax = vb[0] + vb[2] + y1;
  PW.lines = []; PW.u = [];
  for (let c = cmin - step; c <= cmax + step; c += step) {
    const ln = mk('line', { x1: (c - y1).toFixed(2), y1: y1.toFixed(2), x2: (c - y0).toFixed(2), y2: y0.toFixed(2) });
    g.append(ln); PW.lines.push(ln); PW.u.push(clamp((c - cmin) / (cmax - cmin), 0, 1));
  }
  const ringText = mk('text', { style, fill: '#000', filter: 'url(#phys-ring)' }); ringText.textContent = 'Physics';
  svg.append(g, ringText);
  span.classList.add('ready');
  renderPhysicsWord(PW.p);
}
function renderPhysicsWord(p) {
  PW.p = p;
  const band = 0.24, f = p * (1 + band);
  for (let i = 0; i < PW.lines.length; i++) {
    let k = clamp((f - PW.u[i]) / band, 0, 1); k = k * k * (3 - 2 * k);
    PW.lines[i].setAttribute('stroke-width', (PW.full + (PW.thin - PW.full) * k).toFixed(3));
  }
}
function playPhysicsWord(delay = 650) {
  cancelAnimationFrame(PW.raf);
  if (REDUCED) { renderPhysicsWord(1); return; }
  renderPhysicsWord(0);
  const start = performance.now() + delay, dur = 2100;
  const tick = now => {
    const x = clamp((now - start) / dur, 0, 1), e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    renderPhysicsWord(e);
    if (x < 1) PW.raf = requestAnimationFrame(tick);
  };
  PW.raf = requestAnimationFrame(tick);
}
document.getElementById('phys')?.addEventListener('click', () => playPhysicsWord(150));

drawTitleDim(); buildPhysicsWord();
let rsT = 0;
window.addEventListener('resize', () => { drawTitleDim(); clearTimeout(rsT); rsT = setTimeout(buildPhysicsWord, 120); });
const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
fontsReady.then(() => { drawTitleDim(); buildPhysicsWord(); playPhysicsWord(); PLATES.forEach(p => p.dirty = true); });
