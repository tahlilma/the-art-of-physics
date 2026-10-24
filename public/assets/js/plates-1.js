/* The Art of Physics. Static build; see README.md. */
'use strict';
/* =========================================================================
   Plate I — Half-car on a contour
   ========================================================================= */
DEFS.push({
  key: 'halfcar', layout: 'full',
  title: 'Half-car on a contour', theme: 'On isolation',
  aspect: { d: '16 / 7.2', m: '1 / 0.95' }, speed: 0.5,
  alt: 'Half-car suspension schematic: a grey chassis on two spring and damper units, each above a wheel rolling over a hatched wavy road.',
  params: [
    { k: 'v0', sym: 'v_0', name: 'Speed', min: 1, max: 30, step: 0.5, v: 12, unit: 'm/s' },
    { k: 'M', sym: 'M', name: 'Body mass', min: 300, max: 1200, step: 10, v: 620, unit: 'kg' },
    { k: 'k', sym: 'k', name: 'Spring stiffness', min: 8, max: 60, step: 1, v: 22, unit: 'kN/m' },
    { k: 'd', sym: 'd', name: 'Damping', min: 0, max: 6, step: 0.1, v: 1.2, unit: 'kN·s/m' },
    { k: 'A', sym: 'A', name: 'Road amplitude', min: 0, max: 0.2, step: 0.005, v: 0.1, unit: 'm' },
    { k: 'lam', sym: 'λ', name: 'Road wavelength', min: 1.5, max: 14, step: 0.5, v: 4.5, unit: 'm' },
  ],
  actions: [{ label: 'Add a bump', run: s => s.bump() }],
  essay: [
    'A car is a quarrel between a road that does not care and passengers who do. The springs take each insult from the ground and store it, the dampers turn it into a little heat, and the body, floating on its two suspensions, is told only a softened version of events.',
    'What reaches the body depends on frequency. Undulations slower than its bounce mode pass straight through, those near it are amplified, and those far above it are mostly ignored. Comfort, in the end, is a frequency response.'
  ],
  eqs: [
    'M\\ddot z = -F_1 - F_2, \\qquad J\\ddot\\varphi = \\ell\\,(F_1 - F_2)',
    'F_i = k\\,(z \\mp \\ell\\varphi - z_i) + d\\,(\\dot z \\mp \\ell\\dot\\varphi - \\dot z_i)',
    'm_i\\ddot z_i = F_i - k_t\\,\\big(z_i - r(x_i)\\big)'
  ],
  tryit: 'Slow down to about 6 m/s: the road’s 4.5 m waves now arrive at the body’s bounce frequency. Then set damping to zero and watch what the dampers were doing.',
  caption: 'Half-car model. Sprung mass <i>M</i> with pitch inertia <i>J</i> rests on suspensions <i>k</i><sub>1</sub>, <i>d</i><sub>1</sub> and <i>k</i><sub>2</sub>, <i>d</i><sub>2</sub> at ±ℓ from its centre of mass; unsprung masses <i>m</i><sub>1</sub>, <i>m</i><sub>2</sub> ride on tyres of stiffness <i>k</i><sub>t</sub> over the contour <i>r</i>(<i>x</i>). Inset: heave <i>z</i> and pitch φ.',
  create(P) {
    const l = 1.25, m1 = 42, m2 = 42, kt = 190000, ct = 140, Rw = 0.3, L0 = 1.0, hb = 0.55, BL = 3.4;
    const y = new Float64Array(9), w = mkWS(9), tr = new Trace(240, 2, 1 / 30);
    let bumps = [], t = 0;
    const road = x => {
      const k = TAU / P.lam;
      let r = P.A * (0.62 * Math.sin(k * x) + 0.26 * Math.sin(2.31 * k * x + 1.1) + 0.12 * Math.sin(0.47 * k * x + 2.4));
      for (const b of bumps) { const u = (x - b) / 0.42; if (u > -1 && u < 1) r += 0.045 * (1 + Math.cos(PI * u)); }
      return r;
    };
    const slope = x => (road(x + 1e-3) - road(x - 1e-3)) / 2e-3;
    const forces = y => {
      const k = P.k * 1000, c = P.d * 1000;
      return [k * (y[0] - l * y[2] - y[4]) + c * (y[1] - l * y[3] - y[5]), k * (y[0] + l * y[2] - y[6]) + c * (y[1] + l * y[3] - y[7])];
    };
    const f = (t, y, d) => {
      const [F1, F2] = forces(y), M = P.M, J = 0.95 * M, s = y[8];
      const r1 = road(s - l), r2 = road(s + l), rd1 = slope(s - l) * P.v0, rd2 = slope(s + l) * P.v0;
      d[0] = y[1]; d[1] = -(F1 + F2) / M; d[2] = y[3]; d[3] = l * (F1 - F2) / J;
      d[4] = y[5]; d[5] = (F1 - kt * (y[4] - r1) - ct * (y[5] - rd1)) / m1;
      d[6] = y[7]; d[7] = (F2 - kt * (y[6] - r2) - ct * (y[7] - rd2)) / m2;
      d[8] = P.v0;
    };
    const reset = () => {
      y.fill(0); bumps = []; t = 0; tr.clear();
      const r1 = road(-l), r2 = road(l);
      y[4] = r1; y[6] = r2; y[0] = (r1 + r2) / 2; y[2] = (r2 - r1) / (2 * l);
    };
    reset();
    return {
      h: 0.002, reset,
      bump() { bumps.push(y[8] + l + 4.2); },
      step(hh) {
        rk4(f, t, y, hh, w); t += hh;
        tr.tick(hh, [y[0], y[2]]);
        if (bumps.length && bumps[0] < y[8] - 8) bumps.shift();
      },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 0.8, s = y[8];
        const yLo = -0.42, yHi = 2.36, span = Math.max(por ? 4.5 : 5.4, (yHi - yLo) * W / H);
        g.fit(s - span / 2, yLo, s + span / 2, yHi, { pad: 6, ay: por ? 0.8 : 0.5 });
        const xl = g.inv(0, 0)[0] - 0.2, xr = g.inv(W, 0)[0] + 0.2;
        g.groundFn(road, xl, xr);

        const ph = y[2], cy0 = Rw + L0 + hb / 2, cy = cy0 + y[0], cs = Math.cos(ph), sn = Math.sin(ph);
        const B = (u, v) => [s + u * cs - v * sn, cy + u * sn + v * cs];
        const xs = [s - l, s + l], zw = [Rw + y[4], Rw + y[6]];
        // wheels, then suspension units on top of them
        for (let i = 0; i < 2; i++) g.wheelP(g.X(xs[i]), g.Y(zw[i]), Rw * g.s, -xs[i] / Rw - PI / 2, { label: 'r' });
        for (let i = 0; i < 2; i++) {
          const A = B(i ? l : -l, -hb / 2);
          const u = g.springDamper(A[0], A[1], xs[i], zw[i], { t1: 0.07, t2: Rw + 0.12, hw: 0.12, Ln: L0, n: 6 });
          const mx = g.X(u.mx), my = g.Y(u.my), off = 0.12 * g.s + 14;
          g.text(mx - off, my, 'k_' + (i + 1)); g.text(mx + off, my, 'd_' + (i + 1));
          g.pin(g.X(A[0]), g.Y(A[1]), 3);
          g.pin(g.X(xs[i]), g.Y(zw[i]), 3.2);
          g.text(g.X(xs[i]), g.Y(road(xs[i])) + 30, 'm_' + (i + 1));
        }
        // body
        g.poly([B(-BL / 2, -hb / 2), B(BL / 2, -hb / 2), B(BL / 2, hb / 2), B(-BL / 2, hb / 2)], true, { fill: T.fill, w: LW * 1.25 });
        for (let i = 0; i < 2; i++) { const A = B(i ? l : -l, -hb / 2); g.pin(g.X(A[0]), g.Y(A[1]), 3); }
        const C = B(0, 0), Xc = g.X(C[0]), Yc = g.Y(C[1]);
        // static reference line from a fixed anchor, and travel arrow
        const Yref = g.Y(cy0), Xa = Math.max(22, g.X(s - BL / 2 - 0.55)), narrow = W < 480;
        if (!narrow) { g.anchorP(Xa, Yref); g.lineP(Xa, Yref, g.X(s - BL / 2 - 0.05), Yref, { w: LT }); }
        const Xv = Math.min(g.X(s + BL / 2 + 0.7), W - 30);
        g.lineP(Xc, Yc, g.X(B(BL / 2, 0)[0]), Yc, { w: LT, a: 0.85 });
        g.arrowP(Xc, Yc, Xv, Yc, { head: 9, w: LT });
        g.text(Xv + (narrow ? -4 : 16), Yc + (narrow ? -14 : 0), 'v_0');
        // body axis extension and pitch angle
        const E = B(BL / 2 + (narrow ? 0.3 : 0.62), 0);
        g.line(...B(BL / 2, 0), ...E, { w: LT });
        g.arcP(Xc, Yc, Math.min((BL / 2 + 0.5) * g.s, W - 26 - Xc), 0, ph, { label: 'φ', lo: ph >= 0 ? 12 : -12 });
        g.com(Xc, Yc);
        // dimensions
        const tl = B(-BL / 2, hb / 2), tr_ = B(BL / 2, hb / 2);
        g.dim(...tl, ...tr_, 42, 'b');
        g.dim(...B(-l, hb / 2), ...B(0, hb / 2), 18, 'ℓ');
        g.dim(...B(0, hb / 2), ...B(l, hb / 2), 18, 'ℓ');
        g.dim(...B(-BL / 2, -hb / 2), ...B(-BL / 2, 0), 20, 'a');
        const Mp = B(BL / 2 - 0.5, hb / 2 - 0.12);
        g.leader(Mp[0], Mp[1], 34, -38 - 0.0, 'M');
        g.gP(W - 30, 16);
        if (W > 520) g.plot(tr, 12, 12, Math.min(220, W * 0.24), 74, { labels: ['z', 'φ'], cols: [T.accent, T.ink], indep: true, floor: [0.004, 0.002] });
      },
      live() {
        const [F1, F2] = forces(y), zdd = -(F1 + F2) / P.M;
        return `\\ddot z = -\\frac{F_1 + F_2}{M} = -\\frac{${fmt(F1, 0)} + ${par(F2, 0)}}{${fmt(P.M, 0)}} = ${fmt(zdd, 2)}\\ \\mathrm{m/s^2},\\qquad z = ${fmt(y[0] * 100, 1)}\\ \\mathrm{cm},\\quad \\varphi = ${fmt(y[2] * DEG, 2)}^\\circ`;
      }
    };
  }
});

/* =========================================================================
   Plate II — Beam under parametric excitation
   ========================================================================= */
function floquetGrid(z, nx, ny, r0, r1, d0, d1) {
  const out = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const dl = d0 + (d1 - d0) * (j + 0.5) / ny;
    for (let i = 0; i < nx; i++) {
      const r = r0 + (r1 - r0) * (i + 0.5) / nx, Tp = TAU / r, N = 110, hh = Tp / N;
      let x1 = 1, v1 = 0, x2 = 0, v2 = 1, tau = 0;
      const acc = (t, x, v) => -2 * z * v - (1 + dl * Math.cos(r * t)) * x;
      for (let n = 0; n < N; n++) {
        const t0 = tau, th = tau + hh / 2, t1 = tau + hh;
        let a1 = acc(t0, x1, v1), b1 = acc(t0, x2, v2);
        let ax2 = x1 + hh / 2 * v1, av2 = v1 + hh / 2 * a1, bx2 = x2 + hh / 2 * v2, bv2 = v2 + hh / 2 * b1;
        let a2 = acc(th, ax2, av2), b2 = acc(th, bx2, bv2);
        let ax3 = x1 + hh / 2 * av2, av3 = v1 + hh / 2 * a2, bx3 = x2 + hh / 2 * bv2, bv3 = v2 + hh / 2 * b2;
        let a3 = acc(th, ax3, av3), b3 = acc(th, bx3, bv3);
        let ax4 = x1 + hh * av3, av4 = v1 + hh * a3, bx4 = x2 + hh * bv3, bv4 = v2 + hh * b3;
        let a4 = acc(t1, ax4, av4), b4 = acc(t1, bx4, bv4);
        x1 += hh / 6 * (v1 + 2 * av2 + 2 * av3 + av4); v1 += hh / 6 * (a1 + 2 * a2 + 2 * a3 + a4);
        x2 += hh / 6 * (v2 + 2 * bv2 + 2 * bv3 + bv4); v2 += hh / 6 * (b1 + 2 * b2 + 2 * b3 + b4);
        tau = t1;
      }
      const trc = x1 + v2, det = x1 * v2 - x2 * v1, disc = trc * trc - 4 * det;
      const m = disc >= 0 ? Math.max(Math.abs((trc + Math.sqrt(disc)) / 2), Math.abs((trc - Math.sqrt(disc)) / 2)) : Math.sqrt(Math.abs(det));
      out[j * nx + i] = m > 1.0005 ? 1 : 0;
    }
  }
  return out;
}
function cssRGBA(col) {
  const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillStyle = col; x.fillRect(0, 0, 1, 1); return x.getImageData(0, 0, 1, 1).data;
}
/* beam centreline helper: vertical cantilever, cubic static mode shape */
function drawBeam(g, x0, y0, L, q, half, o = {}) {
  const drop = 0.6 * q * q / L, N = 24, C = [];
  for (let i = 0; i <= N; i++) { const xi = i / N; C.push([x0 + q * (3 * xi * xi - xi * xi * xi) / 2, y0 + L * xi - drop * xi * xi * xi]); }
  const A = [], Bp = [];
  for (let i = 0; i <= N; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], Ln = Math.hypot(dx, dy);
    const nx = -dy / Ln, ny = dx / Ln; A.push([C[i][0] + nx * half, C[i][1] + ny * half]); Bp.push([C[i][0] - nx * half, C[i][1] - ny * half]);
  }
  g.poly(A.concat(Bp.reverse()), true, { fill: o.fill || T.paper, w: LT * 1.15 });
  return C[N];
}

DEFS.push({
  key: 'beam', layout: 'right',
  title: 'A beam, pumped', theme: 'On timing',
  aspect: { d: '16 / 10.4', m: '1 / 1.3' }, speed: 1,
  alt: 'An upright flexible beam with a tip mass on a platform driven up and down by a crank, beside a stability chart and a time trace.',
  params: [
    { k: 'r', sym: 'Ω/ω', name: 'Drive frequency ratio', min: 0.6, max: 3, step: 0.01, v: 2, unit: '' },
    { k: 'A', sym: 'A', name: 'Base amplitude', min: 0, max: 0.15, step: 0.005, v: 0.12, unit: 'm' },
    { k: 'z', sym: 'ζ', name: 'Damping ratio', min: 0, max: 0.1, step: 0.005, v: 0.02, unit: '' },
  ],
  actions: [{ label: 'Nudge the tip', run: s => s.nudge() }],
  essay: [
    'Nothing in this figure pushes the beam sideways. The base only moves up and down, and in doing so changes, twice per cycle, how hard gravity and inertia lean on the tip. The straight position remains a solution of the equation at every instant. It simply stops being a stable one.',
    'When the stiffness is modulated at twice the natural frequency, each half-swing arrives just as the beam is softest, and an invisible tilt grows exponentially until the beam’s own nonlinearity detunes it. A child on a swing, standing and crouching, is doing the same arithmetic.'
  ],
  eqs: [
    '\\ddot q + 2\\zeta\\omega\\dot q + \\omega^2\\left[\\,1 + \\delta\\cos\\Omega t\\,\\right]q + \\beta q^3 = 0',
    '\\delta = \\frac{A\\,\\Omega^2}{L\\,\\omega^2}'
  ],
  tryit: 'Slide Ω/ω across 2 and watch the marker leave the shaded tongue: the growth stops. Near Ω/ω = 1 there is a second, far thinner tongue, and damping usually closes it.',
  caption: 'Upright cantilever of length <i>L</i> and bending stiffness <i>EI</i> carrying tip mass <i>m</i>, clamped to a base driven by a crank, <i>y</i><sub>b</sub> = <i>A</i> cos Ω<i>t</i>. Right: stability chart in the (Ω/ω, δ) plane, computed by Floquet analysis at the current damping, and the tip deflection <i>q</i>(<i>t</i>).',
  create(P) {
    const L = 1, om = TAU * 0.85, beta = 2.6 * om * om;
    const y = new Float64Array(3), w = mkWS(3), tr = new Trace(260, 1, 1 / 30);
    let t = 0;
    const NX = 96, NY = 48, R0 = 0.6, R1 = 3.0, D0 = 0, D1 = 1.2;
    let grid = null, gridZ = -1, img = null, imgKey = '', timer = 0;
    const delta = () => P.A * P.r * P.r / L;
    const f = (t, y, d) => {
      d[0] = y[1];
      d[1] = -2 * P.z * om * y[1] - om * om * (1 + delta() * Math.cos(y[2])) * y[0] - beta * y[0] * y[0] * y[0] - 0.4 * y[1] * Math.abs(y[1]);
      d[2] = P.r * om;
    };
    const ensureGrid = () => { if (gridZ !== P.z) { grid = floquetGrid(P.z, NX, NY, R0, R1, D0, D1); gridZ = P.z; imgKey = ''; } };
    const makeImg = () => {
      const key = T.fill + gridZ; if (imgKey === key) return;
      const cv = document.createElement('canvas'); cv.width = NX; cv.height = NY;
      const cx = cv.getContext('2d'), id = cx.createImageData(NX, NY), rgba = cssRGBA(T.fill);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = ((NY - 1 - j) * NX + i) * 4;
        if (grid[j * NX + i]) { id.data[k] = rgba[0]; id.data[k + 1] = rgba[1]; id.data[k + 2] = rgba[2]; id.data[k + 3] = T.dark ? 120 : 255; }
      }
      cx.putImageData(id, 0, 0); img = cv; imgKey = key;
    };
    const reset = () => { y[0] = 0.01; y[1] = 0; y[2] = 0; t = 0; tr.clear(); };
    reset();
    const sim = {
      h: 0.0025, reset,
      nudge() { y[0] += 0.04; },
      onParam(k) { if (k === 'z') { clearTimeout(timer); timer = setTimeout(() => { ensureGrid(); }, 140); } },
      step(hh) { rk4(f, t, y, hh, w); t += hh; tr.tick(hh, [y[0]]); },
      draw(g) {
        ensureGrid(); makeImg();
        const W = g.W, H = g.H, por = H > W * 1.05;
        let chart, trace;
        if (por) {
          g.fit(-0.78, -0.8, 0.82, 1.3, { pad: 10, rh: H * 0.62 });
          chart = [12, H * 0.635, W / 2 - 18, H * 0.35]; trace = [W / 2 + 6, H * 0.635, W / 2 - 18, H * 0.35];
        } else {
          g.fit(-0.78, -0.8, 0.82, 1.3, { pad: 12, rw: W * 0.5 });
          chart = [W * 0.52, 14, W * 0.455, H * 0.56]; trace = [W * 0.52, H * 0.6 + 8, W * 0.455, H * 0.4 - 22];
        }
        const A = P.A, yb = A * Math.cos(y[2]), q = y[0], s = g.s;
        // ground & crank
        const cY = -0.56, Xc0 = g.X(0), Yc0 = g.Y(cY);
        g.circleP(Xc0, Yc0, (A + 0.05) * s, { w: LT, fill: T.paper });
        const pin = [A * Math.sin(y[2]), cY + A * Math.cos(y[2])];
        g.pivotP(Xc0, Yc0, { h: 0.2 * s, b: 0.07 * s + 3 });
        g.line(pin[0], pin[1], 0, yb - 0.08, { w: LW });
        g.pin(g.X(pin[0]), g.Y(pin[1]), 3); g.pin(g.X(0), g.Y(yb - 0.08), 3);
        g.arcP(Xc0, Yc0, (A + 0.05) * s + 9, -0.2, 1.3, { label: 'Ω', lo: 10 });
        // guide rails
        g.hatchLine(-0.37, -0.3, -0.37, 0.26, { flip: true, hl: 7, sp: 7 });
        g.hatchLine(0.37, 0.26, 0.37, -0.3, { flip: true, hl: 7, sp: 7 });
        // platform with rollers and clamp
        g.poly([[-0.33, yb - 0.08], [0.33, yb - 0.08], [0.33, yb], [-0.33, yb]], true, { fill: T.fill });
        g.circle(-0.345, yb - 0.04, 0.025, { fill: T.paper, w: LT }); g.circle(0.345, yb - 0.04, 0.025, { fill: T.paper, w: LT });
        g.hatchRect(-0.075, yb, 0.075, yb + 0.1);
        // beam and tip mass
        const root = yb + 0.1;
        g.line(0, root, 0, root + L + 0.16, { w: LT * 0.8, dash: [5, 4], stroke: T.faint });
        const tip = drawBeam(g, 0, root, L, q, 0.016);
        g.circle(tip[0], tip[1], 0.072, { fill: T.fill, w: LW });
        g.com(g.X(tip[0]), g.Y(tip[1]), 5);
        // annotations
        if (Math.abs(q) * s > 12) { g.arrowP(g.X(0), g.Y(tip[1]) - 0.11 * s, g.X(q), g.Y(tip[1]) - 0.11 * s, { head: 7, w: LT }); g.text(g.X(q / 2), g.Y(tip[1]) - 0.11 * s - 11, 'q'); }
        g.leader(tip[0] + 0.05, tip[1] + 0.05, 22, -16, 'm');
        g.dim(-0.0, root, -0.0, root + L, 0.55 * s, 'L');
        g.textW(q * 0.4, root + 0.48, 'EI', 22, 0, { align: 'left' });
        g.arrowP(g.X(0.48), g.Y(yb - 0.04), g.X(0.48), g.Y(yb - 0.04) - 26, { head: 7, both: true });
        g.text(g.X(0.48) + 9, g.Y(yb - 0.04) - 13, 'y_b', { align: 'left' });
        g.gP(g.X(-0.7), g.Y(1.28), 30);

        // stability chart
        const [cx, cyy, cw, ch] = chart, pl = cx + 30, pr = cx + cw - 8, pt = cyy + 10, pb = cyy + ch - 26;
        const c = g.c;
        c.fillStyle = T.paper; c.fillRect(cx, cyy, cw, ch);
        if (img) { c.imageSmoothingEnabled = true; c.drawImage(img, pl, pt, pr - pl, pb - pt); }
        c.strokeStyle = T.ink; c.lineWidth = LT; c.strokeRect(pl + 0.5, pt + 0.5, pr - pl, pb - pt);
        const RX = r => pl + (r - R0) / (R1 - R0) * (pr - pl), DY = d => pb - (d - D0) / (D1 - D0) * (pb - pt);
        for (const rv of [1, 2, 3]) { g.lineP(RX(rv), pb, RX(rv), pb + 4, { w: LT }); g.text(RX(rv), pb + 13, String(rv), { size: 12.5, it: false }); }
        for (const dv of [0.5, 1]) { g.lineP(pl - 4, DY(dv), pl, DY(dv), { w: LT }); g.text(pl - 7, DY(dv), dv.toFixed(1), { size: 12.5, it: false, align: 'right' }); }
        g.text(pr - 6, pb - 12, 'Ω/ω', { align: 'right', size: 13.5, bg: true });
        g.text(pl - 18, pt + 6, 'δ', { size: 14 });
        g.text(RX(2), DY(1.05), 'unstable', { ui: true, size: 12.5, col: T.ink });
        const d = delta(), mx = RX(clamp(P.r, R0, R1)), my = DY(Math.min(d, D1));
        g.lineP(mx, pt, mx, pb, { w: 0.8, dash: [2, 3], stroke: T.accent });
        g.lineP(pl, my, pr, my, { w: 0.8, dash: [2, 3], stroke: T.accent });
        g.circleP(mx, my, 4.2, { fill: T.accent, stroke: T.paper, w: 1.2 });
        g.plot(tr, ...trace, { labels: ['q(t)'], cols: [T.accent], floor: [0.02], indep: true });
      },
      live() {
        const d = delta(), cv = Math.cos(y[2]), keff = om * om * (1 + d * cv);
        return `\\omega^2\\left[1+\\delta\\cos\\Omega t\\right] = ${fmt(om * om, 1)}\\left[1 + ${fmt(d, 2)}\\times ${par(cv, 2)}\\right] = ${fmt(keff, 1)}\\ \\mathrm{s^{-2}},\\qquad q = ${fmt(y[0] * 100, 1)}\\ \\mathrm{cm}`;
      }
    };
    return sim;
  }
});

/* =========================================================================
   Plate III — The cyclotron
   ========================================================================= */
DEFS.push({
  key: 'cyclotron', layout: 'left',
  title: 'The cyclotron', theme: 'On patience',
  aspect: { d: '16 / 11', m: '1 / 1.18' }, speed: 1,
  alt: 'Two D-shaped electrodes in a magnetic field; a charged particle spirals outward, kicked each time it crosses the gap.',
  params: [
    { k: 'B', sym: 'B', name: 'Magnetic field', min: 0.7, max: 1.3, step: 0.005, v: 1, unit: '' },
    { k: 'wrf', sym: 'ω_rf', name: 'Source frequency', min: 0.7, max: 1.3, step: 0.005, v: 1, unit: '' },
    { k: 'V', sym: 'V_0', name: 'Gap voltage', min: 0.005, max: 0.06, step: 0.001, v: 0.025, unit: '' },
    { k: 'rel', sym: 'γ', name: 'Relativity', type: 'toggle', v: false, on: 'Include relativistic mass' },
  ],
  note: 'Units with q = m = 1 and the speed of light set to c = 1.6, so the effect of relativity shows within the dees.',
  essay: [
    'No single push here is large. The particle gains a fixed parcel of energy, <i>qV</i>, each time it crosses the gap; in between, the magnetic field carries it round a half-circle and returns it.',
    'The trick is that each half-turn takes π/ω<sub>c</sub> with ω<sub>c</sub> = <i>qB</i>/<i>m</i>, whatever the speed. A faster particle runs a wider circle and still arrives on schedule, so a source of fixed frequency can keep kicking it in step. Ernest Lawrence’s first cyclotrons, in the early 1930s, were built on that one line of algebra.',
    'Switch on relativity and the mass in the formula grows with energy. The orbit falls behind the source, and the patience runs out.'
  ],
  eqs: [
    '\\frac{d(\\gamma m\\mathbf v)}{dt} = q\\left(\\mathbf E + \\mathbf v\\times\\mathbf B\\right)',
    '\\omega_c = \\frac{qB}{\\gamma m}, \\qquad r = \\frac{\\gamma m v}{qB}'
  ],
  tryit: 'Detune the source frequency from <i>qB</i>/<i>m</i> by a few percent: the particle gains energy for a while, then its phase slips and the same gap starts taking energy back.',
  caption: 'Two hollow electrodes (dees) in a uniform field <b>B</b> out of the page, separated by a gap carrying <b>E</b>(<i>t</i>) from the source <i>V</i>(<i>t</i>) = <i>V</i><sub>0</sub> cos ω<sub>rf</sub><i>t</i>. Arrows show velocity <b>v</b> and the magnetic force <b>F</b>. Inset: kinetic energy <i>K</i>, rising in steps.',
  create(P) {
    const R = 1, gw = 0.045, cl = 1.6;
    let x, y, ux, uy, t, trail, exitT, lastSide, gapPh, n, kmax;
    const tr = new Trace(260, 1, 0.12);
    const gam = () => P.rel ? Math.sqrt(1 + (ux * ux + uy * uy) / (cl * cl)) : 1;
    const KE = () => P.rel ? (gam() - 1) * cl * cl : 0.5 * (ux * ux + uy * uy);
    const reset = () => { x = 0; y = 0; ux = 0; uy = 0; t = 0; trail = [0, 0]; exitT = 0; lastSide = 0; gapPh = 0; n = 0; kmax = 0.1; tr.clear(); };
    reset();
    return {
      h: 0.004, ts: 4, reset,
      step(hh) {
        const r = Math.hypot(x, y);
        const E = (Math.abs(x) < gw && Math.abs(y) < R) ? P.V / (2 * gw) * Math.cos(P.wrf * t) : 0;
        ux += 0.5 * hh * E;
        const g1 = gam(), Bz = r < R ? P.B : 0, tt = 0.5 * hh * Bz / g1, s2 = 2 * tt / (1 + tt * tt);
        const px = ux + uy * tt, py = uy - ux * tt;
        ux += py * s2; uy -= px * s2;
        ux += 0.5 * hh * E;
        const g2 = gam();
        x += hh * ux / g2; y += hh * uy / g2; t += hh;
        const side = x > gw ? 1 : x < -gw ? -1 : 0;
        if (side && side !== lastSide && r < R) { gapPh = wrapPi(P.wrf * t - (side > 0 ? 0 : PI)); lastSide = side; }
        if (++n % 3 === 0) { trail.push(x, y); if (trail.length > 30000) trail.splice(0, 4000); }
        const k = KE(); kmax = Math.max(kmax, k); tr.tick(hh, [k]);
        if (r > 1.8) { if (!exitT) exitT = t; else if (t - exitT > 2.5) reset(); }
      },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 0.92;
        let inset;
        if (por) { g.fit(-1.42, -1.52, 1.42, 1.3, { pad: 8, ry: H * 0.19, rh: H * 0.81 }); inset = [12, 12, W - 24, H * 0.17]; }
        else { g.fit(-1.42, -1.52, 1.42, 1.3, { pad: 12, ax: 0.25 }); const x0 = g.X(1.42) + 14; inset = [x0, 18, W - x0 - 14, Math.min(130, H * 0.3)]; }
        const s = g.s, c = g.c;
        // field marks
        for (let gx = -0.9; gx <= 0.91; gx += 0.3) for (let gy = -0.9; gy <= 0.91; gy += 0.3) {
          if (Math.hypot(gx, gy) > 0.95 || Math.abs(gx) < 0.1) continue;
          g.circleP(g.X(gx), g.Y(gy), 3.4, { stroke: T.faint, w: 0.8 }); g.dot(g.X(gx), g.Y(gy), 1, T.faint);
        }
        // dees
        const da = Math.asin(gw / R), dee = sg => {
          const pts = [];
          for (let i = 0; i <= 60; i++) { const a = -PI / 2 + da + (PI - 2 * da) * i / 60; pts.push([sg * R * Math.cos(a), R * Math.sin(a)]); }
          return pts;
        };
        g.poly(dee(1), true, { fill: T.fill, fa: 0.5, w: LW });
        g.poly(dee(-1), true, { fill: T.fill, fa: 0.5, w: LW });
        // wires and source
        const yS = -1.33, a0 = 1.18 * PI;
        const wl = [R * Math.cos(a0), R * Math.sin(a0)];
        g.poly([wl, [wl[0], yS], [-0.09, yS]], false, { w: LT });
        g.poly([[-wl[0], wl[1]], [-wl[0], yS], [0.09, yS]], false, { w: LT });
        g.dot(g.X(wl[0]), g.Y(wl[1]), 2.4); g.dot(g.X(-wl[0]), g.Y(wl[1]), 2.4);
        g.circle(0, yS, 0.09, { fill: T.paper, w: LW });
        const sw = []; for (let i = 0; i <= 20; i++) { const u = i / 20; sw.push([-0.055 + 0.11 * u, yS + 0.035 * Math.sin(TAU * u)]); }
        g.poly(sw, false, { w: LT });
        g.text(g.X(0), g.Y(yS - 0.09) + 13, 'V(t)');
        // gap field arrows
        const e = Math.cos(P.wrf * t);
        if (Math.abs(e) > 0.06) for (const gy of [-0.66, -0.33, 0, 0.33, 0.66]) {
          c.globalAlpha = Math.min(1, Math.abs(e) * 1.4);
          const L2 = Math.max(gw * s, 7);
          g.arrowP(g.X(0) - Math.sign(e) * L2, g.Y(gy), g.X(0) + Math.sign(e) * L2, g.Y(gy), { head: 5, w: 1 });
          c.globalAlpha = 1;
        }
        g.text(g.X(0), g.Y(R) - 14, 'E', { size: 15 });
        // trail
        if (trail.length > 3) {
          c.beginPath(); c.moveTo(g.X(trail[0]), g.Y(trail[1]));
          for (let i = 2; i < trail.length; i += 2) c.lineTo(g.X(trail[i]), g.Y(trail[i + 1]));
          c.lineTo(g.X(x), g.Y(y)); c.strokeStyle = T.accent; c.lineWidth = 1.05; c.stroke();
        }
        // radius
        const ra = 0.78 * PI;
        g.arrow(0, 0, R * Math.cos(ra), R * Math.sin(ra), { head: 7, w: LT * 0.9 });
        g.textW(0.5 * R * Math.cos(ra), 0.5 * R * Math.sin(ra), 'R', -10, -10);
        g.pin(g.X(0), g.Y(0), 2.6);
        // particle, velocity and force
        const gm = gam(), vx = ux / gm, vy = uy / gm, v = Math.hypot(vx, vy), X0 = g.X(x), Y0 = g.Y(y);
        if (v > 0.03) {
          const k = 0.42;
          g.arrowP(X0, Y0, X0 + vx * k * s, Y0 - vy * k * s, { col: T.accent, head: 8, w: 1.3 });
          g.text(X0 + vx * k * s + 10, Y0 - vy * k * s - 8, 'v', { col: T.accent });
          if (Math.hypot(x, y) < R) {
            const fx = vy * P.B, fy = -vx * P.B, fk = 0.3;
            g.arrowP(X0, Y0, X0 + fx * fk * s, Y0 - fy * fk * s, { head: 7, w: 1.1 });
            g.text(X0 + fx * fk * s * 1.15 + 6, Y0 - fy * fk * s * 1.15, 'F', { size: 14 });
          }
        }
        g.circleP(X0, Y0, 4.6, { fill: T.accent, stroke: T.paper, w: 1.3 });
        // legend and axes
        const Lx = g.X(-1.38), Ly = g.Y(1.24);
        g.circleP(Lx + 6, Ly, 5, { w: 1 }); g.dot(Lx + 6, Ly, 1.6);
        g.text(Lx + 18, Ly, 'B', { align: 'left' });
        g.axesP(g.X(-1.34), g.Y(-1.45), 24);
        g.plot(tr, ...inset, { labels: ['K'], cols: [T.accent], range: [0, kmax * 1.15], note: 'kinetic energy' });
      },
      live() {
        const gm = gam(), v = Math.hypot(ux, uy) / gm, wc = P.B / gm, r = gm * v / P.B;
        return `\\omega_c = \\frac{qB}{\\gamma m} = ${fmt(wc, 3)},\\quad \\omega_{\\mathrm{rf}} = ${fmt(P.wrf, 3)},\\quad r = \\frac{\\gamma m v}{qB} = ${fmt(r, 3)},\\quad K = ${fmt(KE(), 3)},\\quad \\text{gap phase} = ${fmt(gapPh * DEG, 0)}^\\circ`;
      }
    };
  }
});

/* =========================================================================
   Plate IV — Hollow cylinder with two masses
   ========================================================================= */
DEFS.push({
  key: 'cylinder', layout: 'right',
  title: 'Hollow cylinder, two masses', theme: 'On hidden structure',
  aspect: { d: '16 / 10', m: '1 / 1.08' }, speed: 1,
  alt: 'A hollow cylinder on a hatched floor; inside, two blocks slide on a diametral track between springs.',
  params: [
    { k: 'M', sym: 'M', name: 'Cylinder mass', min: 0.5, max: 8, step: 0.1, v: 2, unit: 'kg' },
    { k: 'm1', sym: 'm_1', name: 'Mass one', min: 0.2, max: 3, step: 0.05, v: 1.4, unit: 'kg' },
    { k: 'm2', sym: 'm_2', name: 'Mass two', min: 0.2, max: 3, step: 0.05, v: 0.6, unit: 'kg' },
    { k: 'k', sym: 'k', name: 'Wall springs', min: 20, max: 300, step: 5, v: 60, unit: 'N/m' },
    { k: 'kc', sym: 'k_c', name: 'Coupling spring', min: 0, max: 200, step: 5, v: 30, unit: 'N/m' },
    { k: 'c', sym: 'c', name: 'Spring damping', min: 0, max: 3, step: 0.05, v: 0.3, unit: 'N·s/m' },
  ],
  actions: [{ label: 'Roll it', run: s => s.roll() }, { label: 'Shake the masses', run: s => s.shake() }],
  essay: [
    'From outside you see a drum rocking on the floor for no visible reason. Inside, two masses on springs slide along a diameter, and every shift of a few centimetres moves the centre of mass and changes which way gravity wants the drum to roll.',
    'Rolling and sliding share one Lagrangian, so energy passes back and forth between motion you can see and motion you cannot. Much of physics is this exercise: inferring the interior from the rim.'
  ],
  eqs: [
    '\\mathcal L = MR^2\\dot\\theta^2 + \\sum_i \\tfrac12 m_i\\,|\\dot{\\mathbf r}_i|^2 - \\sum_i m_i g\\,(R + s_i\\sin\\theta) - V_k',
    'x = -R\\theta, \\qquad \\mathbf r_i = \\left(x + s_i\\cos\\theta,\\ R + s_i\\sin\\theta\\right)'
  ],
  tryit: 'Press <i>Roll it</i> to throw the drum forward. As it spins, the masses are flung toward the wall, the moment of inertia grows, and the drum slows down without any brake.',
  caption: 'Thin-walled cylinder of mass <i>M</i> and radius <i>R</i>, rolling without slipping. A diametral track carries masses <i>m</i><sub>1</sub>, <i>m</i><sub>2</sub>, held by springs <i>k</i> to the wall and <i>k</i><sub>c</sub> to each other; <i>s</i><sub><i>i</i></sub> is position along the track. Inset: roll angle θ and slide <i>s</i><sub>1</sub>.',
  create(P) {
    const R = 0.5, wall = 0.035, hub = 0.05, half = 0.05, s10 = -0.25, s20 = 0.25, cr = 0.02, gg = 9.81;
    const y = new Float64Array(6), w = mkWS(6), tr = new Trace(260, 2, 1 / 30);
    let t = 0, cam = 0;
    const lo1 = -(R - wall) + half, hi1 = -hub - half, lo2 = hub + half, hi2 = R - wall - half;
    const f = (t, y, d) => {
      const th = y[0], s1 = y[1], s2 = y[2], wv = y[3], v1 = y[4], v2 = y[5];
      const M = P.M, m1 = P.m1, m2 = P.m2, sn = Math.sin(th), cs = Math.cos(th);
      const Mtt = 2 * M * R * R + m1 * (R * R + 2 * R * s1 * sn + s1 * s1) + m2 * (R * R + 2 * R * s2 * sn + s2 * s2);
      const D = (s2 - s1) - (s20 - s10);
      let Qt = -gg * cs * (m1 * s1 + m2 * s2) - cr * wv;
      Qt -= m1 * (2 * R * v1 * wv * sn + R * s1 * wv * wv * cs + 2 * s1 * v1 * wv) + m2 * (2 * R * v2 * wv * sn + R * s2 * wv * wv * cs + 2 * s2 * v2 * wv);
      const Q1 = -m1 * gg * sn - P.k * (s1 - s10) + P.kc * D - P.c * v1 + m1 * s1 * wv * wv;
      const Q2 = -m2 * gg * sn - P.k * (s2 - s20) - P.kc * D - P.c * v2 + m2 * s2 * wv * wv;
      const thdd = (Qt + R * cs * (Q1 + Q2)) / (Mtt - (m1 + m2) * R * R * cs * cs);
      d[0] = wv; d[1] = v1; d[2] = v2; d[3] = thdd; d[4] = (Q1 + m1 * R * cs * thdd) / m1; d[5] = (Q2 + m2 * R * cs * thdd) / m2;
    };
    const energy = () => {
      const th = y[0], s1 = y[1], s2 = y[2], wv = y[3], v1 = y[4], v2 = y[5], M = P.M, m1 = P.m1, m2 = P.m2, sn = Math.sin(th), cs = Math.cos(th);
      const Mtt = 2 * M * R * R + m1 * (R * R + 2 * R * s1 * sn + s1 * s1) + m2 * (R * R + 2 * R * s2 * sn + s2 * s2);
      const Tk = 0.5 * Mtt * wv * wv - (m1 * v1 + m2 * v2) * R * cs * wv + 0.5 * (m1 * v1 * v1 + m2 * v2 * v2);
      const V = gg * (m1 * (R + s1 * sn) + m2 * (R + s2 * sn) + M * R) + 0.5 * P.k * (sq(s1 - s10) + sq(s2 - s20)) + 0.5 * P.kc * sq(s2 - s1 - (s20 - s10));
      return Tk + V;
    };
    const reset = () => { y.set([0.25, s10, s20, 0, 0, 0]); t = 0; cam = -R * y[0]; tr.clear(); };
    reset();
    return {
      h: 0.002, reset,
      roll() { y[3] -= 6; },
      shake() { y[4] += 1.6; y[5] -= 1.2; },
      step(hh) {
        rk4(f, t, y, hh, w); t += hh;
        if (y[1] < lo1) { y[1] = lo1; y[4] = -0.3 * y[4]; } else if (y[1] > hi1) { y[1] = hi1; y[4] = -0.3 * y[4]; }
        if (y[2] < lo2) { y[2] = lo2; y[5] = -0.3 * y[5]; } else if (y[2] > hi2) { y[2] = hi2; y[5] = -0.3 * y[5]; }
        cam += (-R * y[0] - cam) * Math.min(1, hh * 2.5);
        tr.tick(hh, [wrapPi(y[0] - PI / 2), y[1] - s10]);
      },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 0.9, th = y[0], xc = -R * th;
        const span = Math.max(por ? 1.9 : 2.4, 1.43 * W / H);
        g.fit(cam - span / 2, -0.13, cam + span / 2, 1.3, { pad: 6, ay: por ? 0.86 : 0.5 });
        const s = g.s, c = g.c;
        // floor with ruler ticks
        g.hatchLineP(0, g.Y(0), W, g.Y(0), { phase: g.X(0), sp: 9 });
        const xa = g.inv(0, 0)[0], xb = g.inv(W, 0)[0];
        for (let i = Math.ceil(xa / 0.25); i <= Math.floor(xb / 0.25); i++) {
          const X = g.X(i * 0.25), major = i % 4 === 0;
          g.lineP(X, g.Y(0), X, g.Y(0) - (major ? 9 : 4), { w: LT * 0.9 });
          if (major) g.text(X + 3, g.Y(0) - 15, `${String(i / 4).replace('-', '−')} m`, { ui: true, size: 11.5, col: T.faint, align: 'left' });
        }
        // cylinder ring
        const Xc = g.X(xc), Yc = g.Y(R);
        c.beginPath(); c.arc(Xc, Yc, R * s, 0, TAU); c.moveTo(Xc + (R - wall) * s, Yc); c.arc(Xc, Yc, (R - wall) * s, 0, TAU, true);
        c.fillStyle = T.fill; c.fill('evenodd'); c.strokeStyle = T.ink; c.lineWidth = LW; c.stroke();
        // track
        const cs = Math.cos(th), sn = Math.sin(th), Pt = (u, v = 0) => [xc + u * cs - v * sn, R + u * sn + v * cs];
        const Ri = R - wall;
        g.line(...Pt(-Ri, 0.012), ...Pt(Ri, 0.012), { w: LT }); g.line(...Pt(-Ri, -0.012), ...Pt(Ri, -0.012), { w: LT });
        // springs
        const s1 = y[1], s2 = y[2];
        g.spring(...Pt(-Ri), ...Pt(s1 - half), { n: 6, w: 0.055, lead: 0.08 });
        g.spring(...Pt(s1 + half), ...Pt(s2 - half), { n: 8, w: 0.05, lead: 0.08 });
        g.spring(...Pt(s2 + half), ...Pt(Ri), { n: 6, w: 0.055, lead: 0.08 });
        // masses
        for (const sv of [s1, s2]) g.poly([Pt(sv - half, -0.042), Pt(sv + half, -0.042), Pt(sv + half, 0.042), Pt(sv - half, 0.042)], true, { fill: T.fill, w: LW });
        g.pin(Xc, Yc, 3);
        // labels attached to the rotating track
        const nX = -sn, nY = cs, lab = (u, d, txt) => { const p = Pt(u); g.text(g.X(p[0]) + nX * d, g.Y(p[1]) - nY * d, txt); };
        lab(s1, 24, 'm_1'); lab(s2, 24, 'm_2');
        lab((s1 - half - Ri) / 2, -22, 'k'); lab((s2 + half + Ri) / 2, -22, 'k'); lab((s1 + s2) / 2 + 0.06, -22, 'k_c');
        // angle and radius
        g.lineP(Xc, Yc, Xc + 0.32 * s, Yc, { w: LT * 0.8, dash: [4, 3] });
        g.arcP(Xc, Yc, 0.2 * s, 0, wrapPi(th), { label: 'θ' });
        const ra = 0.7 * PI;
        g.arrow(xc, R, xc + R * Math.cos(ra), R + R * Math.sin(ra), { head: 7, w: LT * 0.9 });
        g.textW(xc + 0.55 * R * Math.cos(ra), R + 0.55 * R * Math.sin(ra), 'R', -11, -8);
        g.leader(xc + R * Math.cos(0.3 * PI), R + R * Math.sin(0.3 * PI), 22, -24, 'M');
        g.dot(Xc, g.Y(0), 2.6);
        const xd = -R * y[3];
        if (Math.abs(xd) > 0.04) { const L2 = clamp(xd * 0.22, -0.45, 0.45) * s; g.arrowP(Xc, g.Y(2 * R) - 12, Xc + L2, g.Y(2 * R) - 12, { col: T.accent, head: 8, w: 1.3 }); g.text(Xc + L2 + Math.sign(L2) * 10, g.Y(2 * R) - 12, 'v', { col: T.accent }); }
        g.gP(W - 30, 16);
        if (W > 430) g.plot(tr, 12, 12, Math.min(220, W * 0.3), 74, { labels: ['θ', 's_1'], cols: [T.ink, T.accent], indep: true, floor: [0.01, 0.005] });
      },
      live() {
        const xd = -R * y[3];
        return `x = -R\\theta = ${fmt(-R * y[0], 2)}\\ \\mathrm m,\\quad \\dot x = ${fmt(xd, 2)}\\ \\mathrm{m/s},\\quad s_1 = ${fmt(y[1] * 100, 1)},\\ s_2 = ${fmt(y[2] * 100, 1)}\\ \\mathrm{cm},\\quad T + V = ${fmt(energy(), 3)}\\ \\mathrm J`;
      }
    };
  }
});
