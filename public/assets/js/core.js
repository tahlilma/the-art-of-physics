/* The Art of Physics. Static build; see README.md. */
'use strict';
/* =========================================================================
   Core utilities
   ========================================================================= */
const TAU = Math.PI * 2, PI = Math.PI, DEG = 180 / Math.PI;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sq = x => x * x;
const wrapPi = a => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fmt(x, d = 2) {
  if (!isFinite(x)) return '\\infty';
  if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
  return x.toFixed(d);
}
const par = (x, d = 2) => (x < 0 || (x === 0 && Object.is(x, -0)) ? `(${fmt(x, d)})` : fmt(x, d));
function sci(x, d = 1) {
  if (x === 0 || !isFinite(x)) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  if (e >= -2 && e <= 3) return fmt(x, Math.max(0, d + 1 - e));
  return `${(x / Math.pow(10, e)).toFixed(d)}\\times 10^{${e}}`;
}

/* RK4 on Float64Array state ------------------------------------------------ */
function mkWS(n) { return { k1: new Float64Array(n), k2: new Float64Array(n), k3: new Float64Array(n), k4: new Float64Array(n), t: new Float64Array(n) }; }
function rk4(f, t, y, h, w) {
  const n = y.length, { k1, k2, k3, k4 } = w, tmp = w.t;
  f(t, y, k1);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * h * k1[i];
  f(t + 0.5 * h, tmp, k2);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * h * k2[i];
  f(t + 0.5 * h, tmp, k3);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + h * k3[i];
  f(t + h, tmp, k4);
  for (let i = 0; i < n; i++) y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}

/* Ring-buffer traces for inset plots ---------------------------------------- */
class Trace {
  constructor(len, ch, every) { this.len = len; this.ch = ch; this.every = every; this.buf = Array.from({ length: ch }, () => new Float32Array(len)); this.clear(); }
  clear() { this.i = 0; this.n = 0; this.acc = 0; }
  tick(h, vals) { this.acc += h; if (this.acc >= this.every) { this.acc -= this.every; this.push(vals); } }
  push(vals) { for (let k = 0; k < this.ch; k++) this.buf[k][this.i] = vals[k]; this.i = (this.i + 1) % this.len; this.n = Math.min(this.n + 1, this.len); }
  get(k, j) { const start = this.n < this.len ? 0 : this.i; return this.buf[k][(start + j) % this.len]; }
}

/* =========================================================================
   Theme
   ========================================================================= */
const T = {};
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['paper', 'ink', 'fill', 'faint', 'accent', 'grid']) T[k] = cs.getPropertyValue('--c-' + k).trim();
  T.dark = cs.getPropertyValue('--dark').trim() === '1';
}
const MF = '"STIX Two Text","STIXGeneral","Cambria Math","Times New Roman",serif';
const UF = '"Barlow Semi Condensed","Barlow","Arial Narrow",sans-serif';
const LW = 1.35, LT = 0.95, LH = 0.8;

/* =========================================================================
   Drawing kit: engineering-schematic primitives
   World coordinates are y-up; screen coordinates are CSS pixels, y-down.
   ========================================================================= */
class G {
  constructor(cv) { this.cv = cv; this.c = cv.getContext('2d'); this.W = 1; this.H = 1; this.dpr = 1; this.s = 1; this.ox = 0; this.oy = 0; }
  size(W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, W < 640 ? 2 : 2.5);
    this.dpr = dpr; this.W = W; this.H = H;
    this.cv.width = Math.max(1, Math.round(W * dpr)); this.cv.height = Math.max(1, Math.round(H * dpr));
  }
  begin() {
    const c = this.c;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.globalAlpha = 1; c.setLineDash([]);
    c.fillStyle = T.paper; c.fillRect(0, 0, this.W, this.H);
    if (T.dark) {
      c.strokeStyle = T.grid; c.lineWidth = 1; c.beginPath();
      for (let x = 12.5; x < this.W; x += 24) { c.moveTo(x, 0); c.lineTo(x, this.H); }
      for (let y = 12.5; y < this.H; y += 24) { c.moveTo(0, y); c.lineTo(this.W, y); }
      c.stroke();
    }
    c.lineJoin = 'round'; c.lineCap = 'round';
  }
  /* fit a world rectangle into a screen rectangle (default: whole canvas) */
  fit(x0, y0, x1, y1, o = {}) {
    const pad = o.pad ?? 14, rx = (o.rx ?? 0) + pad, ry = (o.ry ?? 0) + pad;
    const rw = (o.rw ?? this.W) - 2 * pad, rh = (o.rh ?? this.H) - 2 * pad;
    const s = Math.min(rw / (x1 - x0), rh / (y1 - y0));
    this.s = s;
    this.ox = rx + (rw - (x1 - x0) * s) * (o.ax ?? 0.5) - x0 * s;
    this.oy = ry + (rh - (y1 - y0) * s) * (o.ay ?? 0.5) + y1 * s;
  }
  X(x) { return this.ox + x * this.s; }
  Y(y) { return this.oy - y * this.s; }
  inv(px, py) { return [(px - this.ox) / this.s, (this.oy - py) / this.s]; }

  stroke(o) {
    const c = this.c;
    if (o.fill) { c.fillStyle = o.fill; if (o.fa != null) c.globalAlpha = o.fa; c.fill(); c.globalAlpha = 1; }
    if (o.stroke !== null) {
      c.strokeStyle = o.stroke || T.ink; c.lineWidth = o.w || LW; c.setLineDash(o.dash || []);
      if (o.a != null) c.globalAlpha = o.a;
      c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    }
  }
  poly(pts, closed = false, o = {}) {
    const c = this.c; c.beginPath();
    for (let i = 0; i < pts.length; i++) { const X = this.X(pts[i][0]), Y = this.Y(pts[i][1]); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
    if (closed) c.closePath();
    this.stroke(o);
  }
  polyP(pts, closed = false, o = {}) {
    const c = this.c; c.beginPath();
    for (let i = 0; i < pts.length; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]);
    if (closed) c.closePath();
    this.stroke(o);
  }
  line(x1, y1, x2, y2, o = {}) { this.poly([[x1, y1], [x2, y2]], false, o); }
  lineP(x1, y1, x2, y2, o = {}) { this.polyP([[x1, y1], [x2, y2]], false, o); }
  circle(x, y, r, o = {}) { this.circleP(this.X(x), this.Y(y), r * this.s, o); }
  circleP(px, py, r, o = {}) { const c = this.c; c.beginPath(); c.arc(px, py, Math.max(0.1, r), 0, TAU); this.stroke(o); }

  /* zig-zag spring between two world points */
  spring(x1, y1, x2, y2, o = {}) {
    const n = o.n || 7, w = o.w ?? 0.06, lead = o.lead ?? 0.16;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const a = L * lead, b = L * (1 - lead), seg = (b - a) / (2 * n);
    const pts = [[x1, y1], [x1 + ux * a, y1 + uy * a]];
    for (let i = 0; i < 2 * n; i++) {
      const s = a + seg * (i + 0.5), side = (i % 2 ? -1 : 1) * w / 2;
      pts.push([x1 + ux * s + nx * side, y1 + uy * s + ny * side]);
    }
    pts.push([x1 + ux * b, y1 + uy * b], [x2, y2]);
    this.poly(pts, false, { w: o.lw || LW * 0.95, stroke: o.stroke });
  }
  /* dashpot: rod from p1 carries a piston plate; open cylinder fixed to p2 */
  damper(x1, y1, x2, y2, o = {}) {
    const w = o.w ?? 0.07, Ln = o.Ln ?? Math.hypot(x2 - x1, y2 - y1), lead = o.lead ?? 0.08 * Ln, cl = o.cl ?? 0.55 * Ln;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const bx = x2 - ux * lead, by = y2 - uy * lead;            // cylinder base
    const ex = bx - ux * cl, ey = by - uy * cl;                // open end
    const rl = Math.max(0.02 * Ln, Ln - lead - cl * 0.5);      // rod length (fixed)
    const pr = Math.min(rl, L - lead - 0.004);                 // piston cannot pass base
    const px = x1 + ux * pr, py = y1 + uy * pr;
    const st = { w: o.lw || LW * 0.95, stroke: o.stroke };
    this.line(x2, y2, bx, by, st);
    this.poly([[ex + nx * w / 2, ey + ny * w / 2], [bx + nx * w / 2, by + ny * w / 2], [bx - nx * w / 2, by - ny * w / 2], [ex - nx * w / 2, ey - ny * w / 2]], false, st);
    this.line(x1, y1, px, py, st);
    this.line(px + nx * w * 0.36, py + ny * w * 0.36, px - nx * w * 0.36, py - ny * w * 0.36, { w: (o.lw || LW) * 1.5, stroke: o.stroke });
  }
  /* spring and damper in parallel between two bars (as in the reference figure) */
  springDamper(ax, ay, bx, by, o = {}) {
    const t1 = o.t1 ?? 0.06, t2 = o.t2 ?? 0.06, hw = o.hw ?? 0.1, Ln = o.Ln ?? Math.hypot(bx - ax, by - ay);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const tx = ax + ux * t1, ty = ay + uy * t1, qx = bx - ux * t2, qy = by - uy * t2;
    this.line(ax, ay, tx, ty); this.line(qx, qy, bx, by);
    this.line(tx - nx * hw, ty - ny * hw, tx + nx * hw, ty + ny * hw);
    this.line(qx - nx * hw, qy - ny * hw, qx + nx * hw, qy + ny * hw);
    // spring on the -n side (left when hanging down), damper on the +n side
    this.spring(tx - nx * hw * 0.62, ty - ny * hw * 0.62, qx - nx * hw * 0.62, qy - ny * hw * 0.62, { n: o.n || 6, w: hw * 0.62, lead: 0.1 });
    this.damper(tx + nx * hw * 0.62, ty + ny * hw * 0.62, qx + nx * hw * 0.62, qy + ny * hw * 0.62, { w: hw * 0.62, Ln: Ln - t1 - t2, lead: 0.1 * (Ln - t1 - t2), cl: (o.cl ?? 0.62) * (Ln - t1 - t2) });
    return { mx: (tx + qx) / 2, my: (ty + qy) / 2, nx, ny, hw };
  }
  /* hatched contour y=f(x) */
  groundFn(f, x0, x1, o = {}) {
    const c = this.c, s = this.s, n = Math.max(8, Math.ceil((x1 - x0) * s / 3));
    c.beginPath();
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, X = this.X(x), Y = this.Y(f(x)); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
    c.strokeStyle = T.ink; c.lineWidth = LW; c.stroke();
    const sp = (o.sp || 8) / s, hl = o.hl || 9, i0 = Math.ceil(x0 / sp), i1 = Math.floor(x1 / sp);
    c.beginPath();
    for (let i = i0; i <= i1; i++) { const x = i * sp, X = this.X(x), Y = this.Y(f(x)); c.moveTo(X, Y); c.lineTo(X - hl * 0.5, Y + hl * 0.87); }
    c.lineWidth = LH; c.stroke();
  }
  /* straight hatched support line; hatches on the right-hand side of travel (screen) unless flip */
  hatchLine(x1, y1, x2, y2, o = {}) { this.hatchLineP(this.X(x1), this.Y(y1), this.X(x2), this.Y(y2), o); }
  hatchLineP(X1, Y1, X2, Y2, o = {}) {
    const c = this.c, dx = X2 - X1, dy = Y2 - Y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    let nx = -uy, ny = ux; if (o.flip) { nx = -nx; ny = -ny; }
    const hl = o.hl || 9, sp = o.sp || 8, hx = (nx * 0.87 - ux * 0.5) * hl, hy = (ny * 0.87 - uy * 0.5) * hl;
    const off = o.phase ? ((o.phase % sp) + sp) % sp : 0;
    c.beginPath(); c.moveTo(X1, Y1); c.lineTo(X2, Y2); c.strokeStyle = T.ink; c.lineWidth = o.w || LW; c.stroke();
    c.beginPath();
    for (let d = off; d <= L; d += sp) { const x = X1 + ux * d, y = Y1 + uy * d; c.moveTo(x, y); c.lineTo(x + hx, y + hy); }
    c.lineWidth = LH; c.stroke();
  }
  /* rectangle filled with diagonal hatching (clamps, walls) */
  hatchRect(x0, y0, x1, y1, o = {}) {
    const c = this.c, X0 = this.X(Math.min(x0, x1)), X1 = this.X(Math.max(x0, x1)), Y0 = this.Y(Math.max(y0, y1)), Y1 = this.Y(Math.min(y0, y1));
    c.save(); c.beginPath(); c.rect(X0, Y0, X1 - X0, Y1 - Y0); c.fillStyle = T.paper; c.fill(); c.clip();
    c.beginPath(); const sp = o.sp || 6;
    for (let d = -(Y1 - Y0); d < X1 - X0; d += sp) { c.moveTo(X0 + d, Y1); c.lineTo(X0 + d + (Y1 - Y0), Y0); }
    c.strokeStyle = T.ink; c.lineWidth = LH * 0.9; c.stroke(); c.restore();
    c.beginPath(); c.rect(X0, Y0, X1 - X0, Y1 - Y0); c.strokeStyle = T.ink; c.lineWidth = LW; c.stroke();
  }
  /* quartered centre-of-mass symbol */
  com(px, py, r = 5.5) {
    const c = this.c;
    c.beginPath(); c.arc(px, py, r, 0, TAU); c.fillStyle = T.paper; c.fill();
    c.beginPath(); c.moveTo(px, py); c.arc(px, py, r, -PI / 2, 0); c.closePath();
    c.moveTo(px, py); c.arc(px, py, r, PI / 2, PI); c.closePath(); c.fillStyle = T.ink; c.fill();
    c.beginPath(); c.arc(px, py, r, 0, TAU); c.strokeStyle = T.ink; c.lineWidth = 1.1; c.stroke();
  }
  pin(px, py, r = 3.2) { this.circleP(px, py, r, { fill: T.paper, w: 1.1 }); }
  dot(px, py, r = 2.6, col) { const c = this.c; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fillStyle = col || T.ink; c.fill(); }
  /* fixed anchor: dot on a short hatched base */
  anchorP(px, py) {
    this.dot(px, py, 3);
    this.hatchLineP(px - 11, py + 4, px + 11, py + 4, { hl: 7, sp: 6, w: LT });
  }
  /* triangle pivot with hatched base */
  pivotP(px, py, o = {}) {
    const h = o.h || 13, b = o.b || 9;
    this.polyP([[px, py], [px - b, py + h], [px + b, py + h]], true, { fill: T.paper, w: LT * 1.1 });
    this.hatchLineP(px - b - 5, py + h, px + b + 5, py + h, { hl: 7, sp: 5, w: LT });
    this.pin(px, py, 2.8);
  }
  headP(x, y, ux, uy, len = 8, col) {
    const c = this.c, nx = -uy, ny = ux, w = len * 0.3;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - ux * len + nx * w, y - uy * len + ny * w); c.lineTo(x - ux * len - nx * w, y - uy * len - ny * w); c.closePath();
    c.fillStyle = col || T.ink; c.fill();
  }
  arrowP(x1, y1, x2, y2, o = {}) {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.5) return;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hl = Math.min(o.head || 8, L * 0.8);
    this.lineP(x1, y1, x2 - ux * hl * 0.6, y2 - uy * hl * 0.6, { stroke: o.col, w: o.w || LT * 1.1, dash: o.dash });
    this.headP(x2, y2, ux, uy, hl, o.col);
    if (o.both) this.headP(x1, y1, -ux, -uy, hl, o.col);
  }
  arrow(x1, y1, x2, y2, o = {}) { this.arrowP(this.X(x1), this.Y(y1), this.X(x2), this.Y(y2), o); }
  /* dimension line; off in px to the left of travel direction on screen */
  dim(x1, y1, x2, y2, off, label, o = {}) { this.dimP(this.X(x1), this.Y(y1), this.X(x2), this.Y(y2), off, label, o); }
  dimP(X1, Y1, X2, Y2, off, label, o = {}) {
    const dx = X2 - X1, dy = Y2 - Y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux, sg = Math.sign(off) || 1;
    const col = o.col, st = { w: LT * 0.85, stroke: col };
    if (o.ext !== false) {
      this.lineP(X1 + nx * sg * 3, Y1 + ny * sg * 3, X1 + nx * (off + sg * 5), Y1 + ny * (off + sg * 5), st);
      this.lineP(X2 + nx * sg * 3, Y2 + ny * sg * 3, X2 + nx * (off + sg * 5), Y2 + ny * (off + sg * 5), st);
    }
    const ax = X1 + nx * off, ay = Y1 + ny * off, bx = X2 + nx * off, by = Y2 + ny * off;
    this.lineP(ax, ay, bx, by, st);
    if (L > 14) { this.headP(bx, by, ux, uy, 7, col); this.headP(ax, ay, -ux, -uy, 7, col); }
    if (label) this.text((ax + bx) / 2 + nx * sg * (o.lo ?? 11), (ay + by) / 2 + ny * sg * (o.lo ?? 11), label, { col, size: o.size, bg: o.bg });
  }
  /* angle arc in world-math convention (radians, CCW) about a screen point */
  arcP(px, py, r, a0, a1, o = {}) {
    const c = this.c, n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / 3));
    if (Math.abs(a1 - a0) * r < 2) return;
    c.beginPath();
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = px + r * Math.cos(a), y = py - r * Math.sin(a); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.strokeStyle = o.col || T.ink; c.lineWidth = o.w || LT; c.stroke();
    if (o.arrow !== false && Math.abs(a1 - a0) * r > 9) {
      const sgn = Math.sign(a1 - a0), tx = -Math.sin(a1) * sgn, ty = -Math.cos(a1) * sgn;
      this.headP(px + r * Math.cos(a1), py - r * Math.sin(a1), tx, ty, 6.5, o.col);
    }
    if (o.label) { const am = (a0 + a1) / 2, rr = r + (o.lo ?? 11); this.text(px + rr * Math.cos(am), py - rr * Math.sin(am), o.label, { col: o.col, size: o.size }); }
  }
  /* gravity indicator: bar, arrow, g */
  gP(px, py, len = 34) {
    this.lineP(px - 5, py, px + 5, py, { w: LT });
    this.arrowP(px, py, px, py + len, { head: 8 });
    this.text(px + 11, py + len * 0.55, 'g');
  }
  axesP(px, py, len = 28, xl = 'x', yl = 'y') {
    this.arrowP(px, py, px + len, py, { head: 7 }); this.arrowP(px, py, px, py - len, { head: 7 });
    this.text(px + len + 9, py, xl); this.text(px, py - len - 9, yl);
  }
  /* math label with optional subscript, e.g. "m_1", "k_c", "φ" */
  text(px, py, txt, o = {}) {
    const c = this.c, size = o.size || 15;
    let base = txt, sub = '';
    const k = txt.indexOf('_'); if (k > 0) { base = txt.slice(0, k); sub = txt.slice(k + 1); }
    const ui = o.ui, it = ui ? false : o.it !== false;
    const fb = ui ? `500 ${size}px ${UF}` : `${it ? 'italic ' : ''}${size}px ${MF}`;
    const subIt = !ui && /[A-Za-z\u0370-\u03ff]/.test(sub) && !/^(rf|ref|max|min)$/.test(sub);
    const fs = `${subIt ? 'italic ' : ''}${Math.round(size * 0.7)}px ${MF}`;
    c.font = fb; const wb = c.measureText(base).width;
    let ws = 0; if (sub) { c.font = fs; ws = c.measureText(sub).width + 1; }
    const wt = wb + ws, al = o.align || 'center';
    const x0 = al === 'left' ? px : al === 'right' ? px - wt : px - wt / 2;
    if (o.bg) { c.fillStyle = T.paper; c.globalAlpha = 0.88; c.fillRect(x0 - 3, py - size * 0.62, wt + 6, size * 1.3); c.globalAlpha = 1; }
    c.fillStyle = o.col || T.ink; c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = fb; c.fillText(base, x0, py);
    if (sub) { c.font = fs; c.fillText(sub, x0 + wb + 1, py + size * 0.32); }
    return wt;
  }
  textW(x, y, txt, dx = 0, dy = 0, o = {}) { return this.text(this.X(x) + dx, this.Y(y) + dy, txt, o); }
  /* leader line from a world point to a label */
  leader(x, y, dxp, dyp, txt, o = {}) {
    const X = this.X(x), Y = this.Y(y);
    this.lineP(X, Y, X + dxp, Y + dyp, { w: LT * 0.85 });
    this.text(X + dxp + Math.sign(dxp || 1) * 4, Y + dyp - 2, txt, { align: dxp >= 0 ? 'left' : 'right', ...o });
  }
  wheelP(px, py, r, ang, o = {}) {
    this.circleP(px, py, r, { fill: T.fill, w: LW });
    const ex = px + r * 0.94 * Math.cos(ang), ey = py - r * 0.94 * Math.sin(ang);
    this.arrowP(px, py, ex, ey, { head: 6.5, w: LT });
    this.pin(px, py, 3.2);
    if (o.label) this.text(px + r * 0.42 * Math.cos(ang + 0.55), py - r * 0.42 * Math.sin(ang + 0.55), o.label, { size: 13 });
  }
  /* inset time-history plot */
  plot(tr, x, y, w, h, o = {}) {
    const c = this.c;
    c.save();
    c.fillStyle = T.paper; c.globalAlpha = 0.92; c.fillRect(x, y, w, h); c.globalAlpha = 1;
    c.strokeStyle = T.faint; c.lineWidth = 0.8; c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
    const pad = 4, iy0 = y + 16, ih = h - 16 - pad, mid = iy0 + ih / 2;
    if (!o.range || o.range[0] < 0) { c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x + 2, o.range ? iy0 + ih * (o.range[1] / (o.range[1] - o.range[0])) : mid); c.lineTo(x + w - 2, o.range ? iy0 + ih * (o.range[1] / (o.range[1] - o.range[0])) : mid); c.stroke(); c.setLineDash([]); }
    const n = tr.n;
    if (n > 1) {
      let shared = 1e-9;
      if (!o.range) for (let k = 0; k < tr.ch; k++) for (let j = 0; j < n; j++) shared = Math.max(shared, Math.abs(tr.get(k, j)));
      for (let k = 0; k < tr.ch; k++) {
        let lo, hi;
        if (o.range) { lo = o.range[0]; hi = o.range[1]; }
        else if (o.indep) { let m = o.floor?.[k] ?? 1e-9; for (let j = 0; j < n; j++) m = Math.max(m, Math.abs(tr.get(k, j))); lo = -m * 1.1; hi = m * 1.1; }
        else { lo = -shared * 1.1; hi = shared * 1.1; }
        c.beginPath();
        for (let j = 0; j < n; j++) {
          const px = x + pad + (w - 2 * pad) * j / (tr.len - 1), v = tr.get(k, j);
          const py = iy0 + ih * (1 - (clamp(v, lo, hi) - lo) / (hi - lo));
          j ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.strokeStyle = o.cols?.[k] || T.ink; c.lineWidth = o.lw?.[k] || 1.15; c.globalAlpha = o.alpha?.[k] ?? 1; c.stroke(); c.globalAlpha = 1;
      }
    }
    let lx = x + 7;
    (o.labels || []).forEach((lb, k) => { lx += this.text(lx, y + 9, lb, { align: 'left', size: 12.5, col: o.cols?.[k] }) + 10; });
    if (o.note) this.text(x + w - 6, y + 9, o.note, { align: 'right', size: 12, ui: true, col: T.faint });
    c.restore();
  }
}

/* =========================================================================
   TeX rendering (MathJax SVG); falls back to raw TeX if the CDN is unavailable
   ========================================================================= */
const MJ = { ready: false, failed: false, pending: new Set() };
function renderTex(el, src, display) {
  el._tex = src; el._disp = display;
  if (MJ.ready) {
    try { const node = MathJax.tex2svg(src, { display }); el.replaceChildren(node); el.classList.remove('raw'); }
    catch (e) { el.textContent = src; el.classList.add('raw'); }
  } else if (MJ.failed) { el.textContent = src; el.classList.add('raw'); }
  else { MJ.pending.add(el); }
}
function mjReadyCheck() { if (!MJ.ready && window.MathJax && typeof MathJax.tex2svg === 'function') document.dispatchEvent(new Event('mathjax-ready')); }
document.addEventListener('DOMContentLoaded', mjReadyCheck);
document.addEventListener('mathjax-ready', () => {
  if (MJ.ready) return;
  MJ.ready = true;
  try { document.head.appendChild(MathJax.svgStylesheet()); } catch (e) { }
  for (const el of MJ.pending) renderTex(el, el._tex, el._disp);
  MJ.pending.clear();
});
setTimeout(() => { if (!MJ.ready) { MJ.failed = true; for (const el of MJ.pending) renderTex(el, el._tex, el._disp); MJ.pending.clear(); } }, 9000);

/* =========================================================================
   Plate controller: canvas, controls, loop
   ========================================================================= */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const supNum = v => String(v).replace(/[-0-9.]/g, ch => ({ '-': '⁻', '.': '·' }[ch] || '⁰¹²³⁴⁵⁶⁷⁸⁹'[+ch]));
const symHTML = s => { const k = s.indexOf('_'); return k > 0 ? `<i>${s.slice(0, k)}</i><sub>${s.slice(k + 1)}</sub>` : `<i>${s}</i>`; };

class Plate {
  constructor(def, idx) {
    this.def = def; this.idx = idx; this.P = {};
    for (const p of def.params) this.P[p.k] = p.v;
    this.sim = def.create(this.P, this);
    this.running = !REDUCED; this.speed = def.speed || 1; this.acc = 0;
    this.visible = false; this.dirty = true; this.lastLive = 0; this.liveSrc = ''; this.inputs = {};
  }
  build() {
    const d = this.def, n = ROMAN[this.idx], id = 'plate-' + (this.idx + 1);
    const head = h('div', { class: 'head' },
      h('p', { class: 'plate-no' }, `Plate ${n}`),
      h('h2', { id: id + '-t' }, d.title),
      h('p', { class: 'theme' }, d.theme));
    const eqs = h('div', { class: 'eqs' });
    for (const e of d.eqs) { const div = h('div', { class: 'eq' }); renderTex(div, e, true); eqs.append(div); }
    const body = h('div', { class: 'body' },
      ...d.essay.map(p => h('p', { html: p })),
      d.quote ? h('blockquote', {}, d.quote.text, h('cite', {}, d.quote.who)) : null,
      eqs,
      h('p', { class: 'try', html: d.tryit }));
    const label = h('div', { class: 'label' }, head, body);

    this.canvas = h('canvas', { role: 'img', 'aria-label': d.alt });
    this.stage = h('div', { class: 'stage' + (this.sim.tap ? ' tappable' : '') }, this.canvas);
    this.stage.style.setProperty('--ar-d', d.aspect.d);
    this.stage.style.setProperty('--ar-m', d.aspect.m);
    this.g = new G(this.canvas);

    // drawer
    const dId = id + '-params';
    this.drawer = h('aside', { class: 'drawer', id: dId, 'aria-label': `Parameters for ${d.title}` });
    const closeBtn = h('button', { class: 'x', type: 'button', onclick: () => this.toggleDrawer(false) }, 'Close');
    this.drawer.append(h('header', {}, h('h3', {}, 'Parameters'), closeBtn));
    for (const p of d.params) {
      const pid = `${id}-${p.k}`;
      if (p.type === 'toggle') {
        const b = h('button', { class: 'tb', type: 'button', 'aria-pressed': String(!!p.v), id: pid }, p.on || p.name);
        b.addEventListener('click', () => { this.P[p.k] = !this.P[p.k]; b.setAttribute('aria-pressed', String(this.P[p.k])); this.changed(p); });
        this.inputs[p.k] = { b };
        this.drawer.append(h('div', { class: 'prm' }, h('label', { for: pid, html: `${p.sym ? `<span class="sym">${symHTML(p.sym)}</span>` : ''}${p.name}` }), h('span'), b));
        continue;
      }
      const out = h('output', { for: pid });
      const inp = h('input', { type: 'range', id: pid, min: p.min, max: p.max, step: p.step, value: p.v });
      const show = () => { out.textContent = (p.show ? p.show(this.P[p.k]) : (+this.P[p.k]).toFixed(Math.max(0, -Math.floor(Math.log10(p.step) + 1e-9)))) + (p.unit ? ' ' + p.unit : ''); };
      inp.addEventListener('input', () => { this.P[p.k] = +inp.value; show(); this.changed(p); });
      this.inputs[p.k] = { inp, show };
      show();
      this.drawer.append(h('div', { class: 'prm' }, h('label', { for: pid, html: `<span class="sym">${symHTML(p.sym)}</span>${p.name}` }), out, inp));
    }
    if (d.note) this.drawer.append(h('p', { class: 'note', html: d.note }));

    // toolbar
    this.playBtn = h('button', { class: 'tb', type: 'button', onclick: () => this.setRunning(!this.running) }, this.running ? 'Pause' : 'Play');
    const resetBtn = h('button', { class: 'tb', type: 'button', onclick: () => { this.sim.reset(); this.dirty = true; this.liveTick(true); } }, 'Reset');
    const acts = (d.actions || []).map(a => {
      const b = h('button', { class: 'tb', type: 'button' }, a.label);
      b.addEventListener('click', () => { a.run(this.sim, this, b); this.dirty = true; this.liveTick(true); });
      if (a.toggle || a.pressed) b.setAttribute('aria-pressed', String(!!(a.initial ?? a.init)));
      return b;
    });
    const sel = h('select', { 'aria-label': 'Simulation speed' },
      ...[[0.25, '¼×'], [0.5, '½×'], [1, '1×'], [2, '2×']].map(([v, t]) => h('option', { value: v, selected: v === this.speed }, t)));
    sel.addEventListener('change', () => { this.speed = +sel.value; });
    this.paramBtn = h('button', { class: 'tb', type: 'button', 'aria-expanded': 'false', 'aria-controls': dId, onclick: () => this.toggleDrawer() }, 'Parameters');
    const toolbar = h('div', { class: 'toolbar' }, this.playBtn, resetBtn, ...acts, h('span', { class: 'spacer' }), h('label', { class: 'speed' }, 'Speed', sel), this.paramBtn);

    this.live = h('div', { class: 'live', 'aria-live': 'off' });
    const viewport = h('div', { class: 'viewport' }, this.stage, this.drawer);
    const fig = h('figure', { class: 'plate' }, h('div', { class: 'mat' }, viewport, this.live, toolbar), h('figcaption', { html: `<b>Fig. ${n}.</b> ${d.caption}` }));

    if (this.sim.tap) {
      this.canvas.addEventListener('click', ev => {
        const r = this.canvas.getBoundingClientRect();
        const [wx, wy] = this.g.inv(ev.clientX - r.left, ev.clientY - r.top);
        this.sim.tap(wx, wy, ev.clientX - r.left, ev.clientY - r.top); this.dirty = true;
      });
    }
    new ResizeObserver(() => this.resize()).observe(this.stage);
    this.head = head; this.body = body; this.label = label; this.fig = fig;
    return { head, body, label, fig, id };
  }
  toggleDrawer(force) {
    const open = force ?? !this.drawer.classList.contains('open');
    this.drawer.classList.toggle('open', open);
    this.paramBtn.setAttribute('aria-expanded', String(open));
    if (open) this.drawer.querySelector('input,button.tb')?.focus({ preventScroll: true });
  }
  setRunning(r) { this.running = r; this.playBtn.textContent = r ? 'Pause' : 'Play'; this.dirty = true; }
  changed(p) {
    if (p.reset) this.sim.reset(); else this.sim.onParam?.(p.k);
    this.dirty = true; this.liveTick(true);
  }
  syncParam(k) { const i = this.inputs[k]; if (!i) return; if (i.inp) { i.inp.value = this.P[k]; i.show(); } else if (i.b) i.b.setAttribute('aria-pressed', String(!!this.P[k])); }
  resize() {
    const r = this.stage.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.g.size(r.width, r.height); this.dirty = true;
  }
  frame(dt) {
    if (this.running) {
      const sim = this.sim, Dt = dt * this.speed * (sim.ts || 1);
      if (sim.advance) sim.advance(Dt);
      else {
        this.acc += Dt;
        let n = Math.floor(this.acc / sim.h);
        if (n > 4000) { n = 4000; this.acc = 0; }
        this.acc -= n * sim.h;
        for (let i = 0; i < n; i++) sim.step(sim.h);
      }
      this.dirty = true;
    }
    if (this.dirty) { this.g.begin(); this.sim.draw(this.g); this.dirty = false; }
    this.liveTick(false);
  }
  /* split the live TeX at top-level \quad / \qquad so the strip can wrap on narrow screens */
  renderLive(src) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++; else if (ch === '}') depth--;
      else if (depth === 0 && ch === '\\') {
        const m = /^\\q?quad(?![a-zA-Z])/.exec(src.slice(i));
        if (m) { parts.push(src.slice(start, i)); i += m[0].length - 1; start = i + 1; }
      }
    }
    parts.push(src.slice(start));
    const clean = parts.map(p => p.trim().replace(/^,|,$/g, '').replace(/,\s*$/, '').trim()).filter(Boolean);
    this.liveParts ||= [];
    while (this.liveParts.length < clean.length) { const el = h('span', { class: 'lc' }); this.live.append(el); this.liveParts.push({ el, src: null, w: 0 }); }
    while (this.liveParts.length > clean.length) this.liveParts.pop().el.remove();
    clean.forEach((p, i) => {
      const o = this.liveParts[i];
      if (o.src === p) return;
      o.src = p; renderTex(o.el, p, false);
      const w = o.el.offsetWidth;
      if (w > o.w && w < this.live.clientWidth - 24) { o.w = w; o.el.style.minWidth = w + 'px'; }
    });
  }
  liveTick(force) {
    const now = performance.now();
    if (!force && (now - this.lastLive < 140 || (!this.running && this.liveSrc))) return;
    this.lastLive = now;
    const src = this.sim.live();
    if (src !== this.liveSrc) { this.liveSrc = src; this.renderLive(src); }
    if (this.sim.liveParams) for (const k of this.sim.liveParams) this.syncParam(k);
  }
}

/* registry filled below */
const DEFS = [];
