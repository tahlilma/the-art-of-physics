/* The Art of Physics. Static build; see README.md. */
'use strict';
/* =========================================================================
   Plate V — The tumbling racket (Dzhanibekov effect)
   ========================================================================= */
DEFS.push({
  key: 'racket', layout: 'full',
  title: 'The tumbling racket', theme: 'On the middle axis',
  aspect: { d: '16 / 7.4', m: '1 / 1.3' }, speed: 1,
  alt: 'A wireframe tennis racket spinning freely in space, with its three principal axes and the fixed angular momentum vector drawn.',
  params: [
    { k: 'axis', sym: 'i', name: 'Spin axis', min: 1, max: 3, step: 1, v: 2, reset: true, show: v => ['', '1, along the handle', '2, the middle axis', '3, face normal'][v] },
    { k: 'W', sym: 'Ω', name: 'Spin rate', min: 1, max: 10, step: 0.1, v: 4, unit: 'rad/s', reset: true },
    { k: 'eps', sym: 'ε', name: 'Initial wobble', min: 0.001, max: 0.1, step: 0.001, v: 0.004, reset: true },
  ],
  note: 'Principal moments <i>I</i><sub>1</sub> : <i>I</i><sub>2</sub> : <i>I</i><sub>3</sub> = 0.35 : 1 : 1.3.',
  essay: [
    'Spin a rigid body about its axis of largest or smallest inertia and it keeps spinning. Spin it about the middle one and it turns itself over, again and again, though no torque acts and both its energy and its angular momentum are conserved exactly.',
    'Vladimir Dzhanibekov noticed this in 1985 aboard Salyut 7, watching a wing nut spin off its bolt and flip in mid-air. Tennis players had been tossing it from their hands for a century. The flip is not noise. It is a property of Euler’s equations, which allow only two of the three axes to be stable.'
  ],
  eqs: [
    'I_1\\dot\\omega_1 = (I_2 - I_3)\\,\\omega_2\\omega_3,\\quad I_2\\dot\\omega_2 = (I_3 - I_1)\\,\\omega_3\\omega_1,\\quad I_3\\dot\\omega_3 = (I_1 - I_2)\\,\\omega_1\\omega_2',
    '\\lambda = \\Omega\\sqrt{\\frac{(I_2 - I_1)(I_3 - I_2)}{I_1 I_3}}'
  ],
  tryit: 'Switch the spin axis to 1 or 3 and the same wobble just precesses quietly. Make the wobble smaller and the flips come later, but they still come.',
  caption: 'Free rigid body with principal axes <i>e</i><sub>1</sub> (handle), <i>e</i><sub>2</sub> (in the face) and <i>e</i><sub>3</sub> (face normal). The angular momentum <b>L</b> is fixed in space; the angular velocity <b>ω</b> wanders. Inset: components ω<sub><i>i</i></sub>/|ω| over time.',
  create(P) {
    const I = [0.35, 1.0, 1.3];
    const y = new Float64Array(7), w = mkWS(7), tr = new Trace(320, 3, 1 / 30);
    let t = 0, flips = 0, lastSign = 1;
    const f = (t, y, d) => {
      const w1 = y[0], w2 = y[1], w3 = y[2], qw = y[3], qx = y[4], qy = y[5], qz = y[6];
      d[0] = (I[1] - I[2]) * w2 * w3 / I[0]; d[1] = (I[2] - I[0]) * w3 * w1 / I[1]; d[2] = (I[0] - I[1]) * w1 * w2 / I[2];
      d[3] = 0.5 * (-qx * w1 - qy * w2 - qz * w3); d[4] = 0.5 * (qw * w1 + qy * w3 - qz * w2);
      d[5] = 0.5 * (qw * w2 - qx * w3 + qz * w1); d[6] = 0.5 * (qw * w3 + qx * w2 - qy * w1);
    };
    const qmul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
    const reset = () => {
      const a = P.axis - 1, om = [0, 0, 0];
      for (let i = 0; i < 3; i++) om[i] = i === a ? P.W : P.eps * P.W * (i === (a + 1) % 3 ? 1 : 0.6);
      const L = om.map((v, i) => I[i] * v), Lm = Math.hypot(...L), n = L.map(v => v / Lm);
      let ax = [n[1], -n[0], 0], s = Math.hypot(ax[0], ax[1]), q;
      if (s < 1e-9) q = n[2] > 0 ? [1, 0, 0, 0] : [0, 1, 0, 0];
      else { const ang = Math.acos(clamp(n[2], -1, 1)); q = [Math.cos(ang / 2), ax[0] / s * Math.sin(ang / 2), ax[1] / s * Math.sin(ang / 2), 0]; }
      const spin = 0.35; q = qmul([Math.cos(spin / 2), 0, 0, Math.sin(spin / 2)], q);
      y.set([om[0], om[1], om[2], ...q]); t = 0; flips = 0; lastSign = 1; tr.clear();
    };
    reset();
    // body-frame geometry
    const ell = (a, b, cx, z, n = 56) => Array.from({ length: n + 1 }, (_, i) => [cx + a * Math.cos(TAU * i / n), b * Math.sin(TAU * i / n), z]);
    const outerT = ell(0.31, 0.24, 0.4, 0.012), outerB = ell(0.31, 0.24, 0.4, -0.012), inner = ell(0.28, 0.215, 0.4, 0);
    const strings = [];
    for (let yy = -0.18; yy <= 0.181; yy += 0.045) { const dx = 0.28 * Math.sqrt(Math.max(0, 1 - sq(yy / 0.215))); strings.push([[0.4 - dx, yy, 0], [0.4 + dx, yy, 0]]); }
    for (let xx = 0.16; xx <= 0.641; xx += 0.045) { const u = xx - 0.4, dy = 0.215 * Math.sqrt(Math.max(0, 1 - sq(u / 0.28))); strings.push([[xx, -dy, 0], [xx, dy, 0]]); }
    const box = (x0, x1, hy, hz) => {
      const c = [];
      for (const x of [x0, x1]) c.push([[x, -hy, -hz], [x, hy, -hz], [x, hy, hz], [x, -hy, hz], [x, -hy, -hz]]);
      for (const [sy, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.push([[x0, sy * hy, sz * hz], [x1, sy * hy, sz * hz]]);
      return c;
    };
    const handle = box(-0.62, -0.06, 0.022, 0.016).concat(box(-0.64, -0.6, 0.03, 0.022)), throat = [[[0.12, 0.103, 0], [-0.06, 0.022, 0]], [[0.12, -0.103, 0], [-0.06, -0.022, 0]]];
    const az = 0.55, el = 0.33, ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    const proj = v => { const x1 = ca * v[0] - sa * v[1], y1 = sa * v[0] + ca * v[1]; return [x1, v[2] * ce + y1 * se, y1 * ce - v[2] * se]; };
    const rot = () => {
      const [qw, qx, qy, qz] = [y[3], y[4], y[5], y[6]];
      return [[1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qw * qz), 2 * (qx * qz + qw * qy)], [2 * (qx * qy + qw * qz), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qw * qx)], [2 * (qx * qz - qw * qy), 2 * (qy * qz + qw * qx), 1 - 2 * (qx * qx + qy * qy)]];
    };
    const app = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];
    return {
      h: 0.002, reset,
      step(hh) {
        rk4(f, t, y, hh, w); t += hh;
        const n = Math.hypot(y[3], y[4], y[5], y[6]); for (let i = 3; i < 7; i++) y[i] /= n;
        const wm = Math.hypot(y[0], y[1], y[2]), a = P.axis - 1, sg = Math.sign(y[a]);
        if (sg && sg !== lastSign && Math.abs(y[a]) > 0.5 * wm) { flips++; lastSign = sg; }
        tr.tick(hh, [y[0] / wm, y[1] / wm, y[2] / wm]);
      },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 0.95;
        let ins;
        if (por) { g.fit(-0.98, -0.82, 0.98, 1.1, { pad: 10, rh: H * 0.7 }); ins = [12, H * 0.72, W - 24, H * 0.26]; }
        else { g.fit(-0.98, -0.82, 0.98, 1.1, { pad: 10, rw: W * 0.56, ax: 0.55 }); ins = [W * 0.59, H * 0.2, W * 0.38, H * 0.56]; }
        const R = rot(), P2 = v => { const p = proj(app(R, v)); return [g.X(p[0]), g.Y(p[1]), p[2]]; }, Pw = v => { const p = proj(v); return [g.X(p[0]), g.Y(p[1]), p[2]]; };
        const c = g.c;
        // equator circle around L, behind everything
        const eq = []; for (let i = 0; i <= 72; i++) { const a = TAU * i / 72; eq.push(Pw([0.92 * Math.cos(a), 0.92 * Math.sin(a), 0])); }
        g.polyP(eq, true, { w: 0.8, dash: [3, 4], stroke: T.faint });
        // racket parts with simple depth ordering
        const drawHead = () => {
          const o = outerT.map(P2);
          g.polyP(o, true, { fill: T.fill, fa: T.dark ? 0.8 : 0.6, stroke: null });
          for (const sgm of strings) { const a = P2(sgm[0]), b = P2(sgm[1]); g.lineP(a[0], a[1], b[0], b[1], { w: 0.6, stroke: T.faint }); }
          g.polyP(inner.map(P2), true, { w: LT });
          g.polyP(outerB.map(P2), true, { w: LT * 0.9 });
          g.polyP(o, true, { w: LW });
        };
        const drawHandle = () => {
          for (const sgm of throat) { const a = P2(sgm[0]), b = P2(sgm[1]); g.lineP(a[0], a[1], b[0], b[1], { w: LW }); }
          for (const pl of handle) g.polyP(pl.map(P2), false, { w: LT * 1.1 });
        };
        const dh = P2([0.4, 0, 0])[2], dd = P2([-0.34, 0, 0])[2];
        if (dh > dd) { drawHead(); drawHandle(); } else { drawHandle(); drawHead(); }
        // body axes
        const O = Pw([0, 0, 0]);
        ['e_1', 'e_2', 'e_3'].forEach((lb, i) => {
          const v = [0, 0, 0]; v[i] = 0.86; const a = P2(v);
          g.arrowP(O[0], O[1], a[0], a[1], { head: 7, w: 0.9, dash: [4, 3] });
          const dx = a[0] - O[0], dy = a[1] - O[1], Ln = Math.hypot(dx, dy) || 1;
          g.text(a[0] + dx / Ln * 12, a[1] + dy / Ln * 12, lb, { size: 14 });
        });
        // angular momentum (fixed) and angular velocity
        const Lp = Pw([0, 0, 1.02]);
        g.arrowP(O[0], O[1], Lp[0], Lp[1], { head: 10, w: 1.6 });
        g.text(Lp[0] + 13, Lp[1] + 6, 'L', { it: false, size: 16 });
        const wb = [y[0], y[1], y[2]], wm = Math.hypot(...wb), ww = app(R, wb).map(v => v / P.W * 0.82), Wp = Pw(ww);
        g.arrowP(O[0], O[1], Wp[0], Wp[1], { head: 9, w: 1.5, col: T.accent });
        g.text(Wp[0] + 12, Wp[1] - 4, 'ω', { col: T.accent, size: 16 });
        g.com(O[0], O[1], 5);
        g.plot(tr, ...ins, { labels: ['ω_1', 'ω_2', 'ω_3'], cols: [T.faint, T.accent, T.ink], range: [-1.1, 1.1], note: 'ωᵢ / |ω|' });
      },
      live() {
        const T2 = I[0] * y[0] ** 2 + I[1] * y[1] ** 2 + I[2] * y[2] ** 2, Lm = Math.hypot(I[0] * y[0], I[1] * y[1], I[2] * y[2]), wm = Math.hypot(y[0], y[1], y[2]), a = P.axis;
        return `2T = \\sum_i I_i\\,\\omega_i^2 = ${fmt(T2, 4)},\\qquad |\\mathbf L| = ${fmt(Lm, 4)},\\qquad \\frac{\\omega_${a}}{|\\omega|} = ${fmt(y[a - 1] / wm, 3)},\\qquad \\text{flips: } ${flips}`;
      }
    };
  }
});

/* =========================================================================
   Plate VI — Two beams excited by base motion
   ========================================================================= */
DEFS.push({
  key: 'twobeams', layout: 'left',
  title: 'Two beams on a shaking floor', theme: 'On sympathy',
  aspect: { d: '16 / 10.6', m: '1 / 1.25' }, speed: 1,
  alt: 'Two cantilever beams of different heights on a platform shaken sideways by a crank, joined by a spring, beside a frequency response chart.',
  params: [
    { k: 'W', sym: 'Ω', name: 'Drive frequency', min: 2, max: 20, step: 0.05, v: 9, unit: 'rad/s' },
    { k: 'A', sym: 'A', name: 'Base amplitude', min: 0.002, max: 0.02, step: 0.001, v: 0.01, unit: 'm' },
    { k: 'kc', sym: 'k_c', name: 'Coupling spring', min: 0, max: 120, step: 1, v: 30, unit: 'N/m' },
    { k: 'z', sym: 'ζ', name: 'Damping ratio', min: 0.005, max: 0.1, step: 0.005, v: 0.02, unit: '' },
  ],
  actions: [{ label: 'Sweep frequency', toggle: true, run: (s, pl, b) => { s.sweep = !s.sweep; b.setAttribute('aria-pressed', String(s.sweep)); } }],
  essay: [
    'Two structures share a floor and a spring. Shake the floor and each would answer at its own natural frequency, but the coupling pulls those two frequencies apart into shared modes, one where the beams lean together and one where they lean against each other.',
    'Between the two peaks sits a frequency where one beam goes almost still while the other takes up the motion. Tall buildings exploit exactly this: a heavy tuned mass near the top, Taipei 101’s pendulum being the famous one, oscillates so that the tower does not.'
  ],
  eqs: [
    '\\mathbf M\\ddot{\\mathbf u} + \\mathbf C\\dot{\\mathbf u} + \\mathbf K\\mathbf u = -\\mathbf M\\mathbf 1\\,\\ddot x_b, \\qquad x_b = A\\sin\\Omega t',
    '\\mathbf K = \\begin{bmatrix} k_1 + k_c\\phi^2 & -k_c\\phi \\\\ -k_c\\phi & k_2 + k_c \\end{bmatrix}'
  ],
  tryit: 'Press <i>Sweep frequency</i> and let Ω climb slowly through both peaks. The marker on the chart tells you which mode you are in.',
  caption: 'Cantilevers of lengths <i>L</i><sub>1</sub>, <i>L</i><sub>2</sub> with tip masses <i>m</i><sub>1</sub>, <i>m</i><sub>2</sub> on a common base driven by a crank, <i>x</i><sub>b</sub> = <i>A</i> sin Ω<i>t</i>. Spring <i>k</i><sub>c</sub> joins the tip of the short beam to the tall beam at the same height, where its mode shape is φ = 0.585. Inset: amplitude response |<i>u</i><sub><i>i</i></sub>|/<i>A</i>, log scale.',
  create(P) {
    const m1 = 0.5, m2 = 0.5, k1 = 50, k2 = 80, L1 = 0.95, L2 = 0.68, cp = (() => { const x = L2 / L1; return (3 * x * x - x * x * x) / 2; })();
    const y = new Float64Array(5), w = mkWS(5);
    let t = 0, frf = null, frfKey = '';
    const c1 = () => 2 * P.z * Math.sqrt(k1 * m1), c2 = () => 2 * P.z * Math.sqrt(k2 * m2);
    const f = (t, y, d) => {
      const xbdd = -P.A * P.W * P.W * Math.sin(y[4]), sp = P.kc * (cp * y[0] - y[2]);
      d[0] = y[1]; d[1] = (-c1() * y[1] - k1 * y[0] - cp * sp - m1 * xbdd) / m1;
      d[2] = y[3]; d[3] = (-c2() * y[3] - k2 * y[2] + sp - m2 * xbdd) / m2;
      d[4] = P.W;
    };
    const computeFRF = () => {
      const key = P.kc + '|' + P.z; if (key === frfKey) return; frfKey = key;
      const N = 220, a = new Float32Array(N), b = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const W = 2 + 18 * i / (N - 1), W2 = W * W;
        const ar = k1 + P.kc * cp * cp - m1 * W2, ai = c1() * W, dr = k2 + P.kc - m2 * W2, di = c2() * W, off = -P.kc * cp;
        const detr = ar * dr - ai * di - off * off, deti = ar * di + ai * dr;
        const F1 = m1 * W2, F2 = m2 * W2;
        const n1r = F1 * dr - off * F2, n1i = F1 * di, n2r = ar * F2 - off * F1, n2i = ai * F2;
        const dm = detr * detr + deti * deti;
        a[i] = Math.log10(Math.hypot((n1r * detr + n1i * deti) / dm, (n1i * detr - n1r * deti) / dm));
        b[i] = Math.log10(Math.hypot((n2r * detr + n2i * deti) / dm, (n2i * detr - n2r * deti) / dm));
      }
      frf = [a, b];
    };
    const reset = () => { y.fill(0); t = 0; };
    reset();
    const sim = {
      h: 0.002, reset, sweep: false, liveParams: ['W'],
      step(hh) {
        if (sim.sweep) { P.W += 0.3 * hh; if (P.W > 20) P.W = 2; }
        rk4(f, t, y, hh, w); t += hh;
      },
      draw(g) {
        computeFRF();
        const W = g.W, H = g.H, por = H > W * 1.0;
        let ins;
        if (por) { g.fit(-1.12, -0.16, 0.86, 1.18, { pad: 8, ry: H * 0.3, rh: H * 0.7 }); ins = [12, 12, W - 24, H * 0.27]; }
        else { g.fit(-1.12, -0.16, 1.4, 1.18, { pad: 10 }); ins = [g.X(0.5), 14, W - g.X(0.5) - 14, H * 0.44]; }
        const s = g.s, xb = P.A * Math.sin(y[4]);
        // ground and rollers
        g.hatchLine(-1.12, -0.07, 0.86, -0.07, {});
        g.circle(-0.38 + xb, -0.035, 0.035, { fill: T.paper, w: LT }); g.circle(0.38 + xb, -0.035, 0.035, { fill: T.paper, w: LT });
        // crank and rod
        const cx = -0.92, cy = 0.04;
        g.circle(cx, cy, 0.075, { fill: T.paper, w: LT });
        g.pivotP(g.X(cx), g.Y(cy), { h: Math.max(10, (cy + 0.07) * s - 2), b: 8 });
        const pin = [cx + P.A * Math.sin(y[4]), cy + P.A * Math.cos(y[4])];
        g.line(pin[0], pin[1], -0.56 + xb, 0.04, { w: LW });
        g.pin(g.X(pin[0]), g.Y(pin[1]), 2.8);
        g.arcP(g.X(cx), g.Y(cy), 0.075 * s + 8, 0.6, 2.3, { label: 'Ω', lo: 10 });
        // platform
        g.poly([[-0.56 + xb, 0], [0.56 + xb, 0], [0.56 + xb, 0.08], [-0.56 + xb, 0.08]], true, { fill: T.fill });
        g.pin(g.X(-0.56 + xb), g.Y(0.04), 2.8);
        // beams
        const r1 = [-0.25 + xb, 0.16], r2 = [0.25 + xb, 0.16];
        g.hatchRect(r1[0] - 0.06, 0.08, r1[0] + 0.06, 0.16); g.hatchRect(r2[0] - 0.06, 0.08, r2[0] + 0.06, 0.16);
        for (const [r, L] of [[r1, L1], [r2, L2]]) g.line(r[0], r[1], r[0], r[1] + L + 0.1, { w: 0.8, dash: [5, 4], stroke: T.faint });
        const t1 = drawBeam(g, r1[0], r1[1], L1, y[0], 0.014), t2 = drawBeam(g, r2[0], r2[1], L2, y[2], 0.014);
        // coupling spring: tip of beam 2 to beam 1 at the same height
        const ph = cp * y[0], p1 = [r1[0] + ph, r1[1] + L2 * 0.995];
        g.spring(p1[0], p1[1], t2[0] - 0.045, t2[1], { n: 7, w: 0.045, lead: 0.12 });
        g.pin(g.X(p1[0]), g.Y(p1[1]), 2.6);
        g.textW((p1[0] + t2[0]) / 2, t2[1], 'k_c', 0, -18);
        for (const tp of [t1, t2]) { g.circle(tp[0], tp[1], 0.045, { fill: T.fill, w: LW }); g.com(g.X(tp[0]), g.Y(tp[1]), 4.2); }
        g.textW(t1[0], t1[1], 'm_1', -24, -16); g.textW(t2[0], t2[1], 'm_2', 22, -16);
        g.dim(r1[0] - 0.06, r1[1], r1[0] - 0.06, r1[1] + L1, 22, 'L_1');
        g.dim(r2[0] + 0.06, r2[1] + L2, r2[0] + 0.06, r2[1], 22, 'L_2');
        if (Math.abs(y[0]) * s > 12) { const Yy = g.Y(t1[1]) - 15; g.arrowP(g.X(r1[0]), Yy, g.X(t1[0]), Yy, { head: 6, w: LT }); g.text(g.X((r1[0] + t1[0]) / 2), Yy - 10, 'u_1', { size: 14 }); }
        g.arrowP(g.X(0.62 + xb), g.Y(0.04), g.X(0.62 + xb) + 26, g.Y(0.04), { head: 6, both: true });
        g.text(g.X(0.62 + xb) + 36, g.Y(0.04), 'x_b', { align: 'left' });
        // frequency response chart
        const [ix, iy, iw, ih] = ins, pl = ix + 30, pr = ix + iw - 8, pt = iy + 20, pb = iy + ih - 24, c = g.c;
        c.fillStyle = T.paper; c.globalAlpha = 0.92; c.fillRect(ix, iy, iw, ih); c.globalAlpha = 1;
        c.strokeStyle = T.ink; c.lineWidth = LT; c.strokeRect(pl + 0.5, pt + 0.5, pr - pl, pb - pt);
        const lo = -1.6, hi = 2.1, WX = Wv => pl + (Wv - 2) / 18 * (pr - pl), LY = v => pb - (clamp(v, lo, hi) - lo) / (hi - lo) * (pb - pt);
        for (const [arr, col, lw] of [[frf[0], T.ink, 1.3], [frf[1], T.accent, 1.3]]) {
          c.beginPath(); for (let i = 0; i < arr.length; i++) { const px = pl + (pr - pl) * i / (arr.length - 1), py = LY(arr[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
          c.strokeStyle = col; c.lineWidth = lw; c.stroke();
        }
        for (const Wv of [5, 10, 15, 20]) { g.lineP(WX(Wv), pb, WX(Wv), pb + 4, { w: LT }); g.text(WX(Wv), pb + 13, String(Wv), { size: 12, it: false }); }
        for (const v of [-1, 0, 1, 2]) { g.lineP(pl - 4, LY(v), pl, LY(v), { w: LT }); g.text(pl - 7, LY(v), v === 0 ? '1' : `10${['⁻¹', '', '¹', '²'][v + 1]}`, { size: 11.5, it: false, align: 'right' }); }
        g.text(pr - 6, pb - 12, 'Ω', { align: 'right', size: 13.5, bg: true });
        let lx = pl + 2; lx += g.text(lx, iy + 9, '|u₁| / A', { align: 'left', size: 13 }) + 14; g.text(lx, iy + 9, '|u₂| / A', { align: 'left', size: 13, col: T.accent });
        const mx = WX(P.W);
        g.lineP(mx, pt, mx, pb, { w: 1, stroke: T.accent, dash: [3, 3] });
      },
      live() {
        const F = m1 * P.A * P.W * P.W * Math.sin(y[4]);
        return `\\Omega = ${fmt(P.W, 2)}\\ \\mathrm{rad/s},\\qquad m_1A\\Omega^2\\sin\\Omega t = ${fmt(F, 3)}\\ \\mathrm N,\\qquad u_1 = ${fmt(y[0] * 100, 1)},\\ \\ u_2 = ${fmt(y[2] * 100, 1)}\\ \\mathrm{cm}`;
      }
    };
    return sim;
  }
});

/* =========================================================================
   Plate VII — Swinging Atwood's machine
   ========================================================================= */
DEFS.push({
  key: 'atwood', layout: 'pair',
  title: 'Swinging Atwood’s machine', theme: 'On imbalance',
  aspect: { d: '1 / 1.12', m: '1 / 1.18' }, speed: 1,
  alt: 'Two pulleys under a hatched ceiling; a heavy block hangs on the right while a light bob swings on the left, tracing a looping path.',
  params: [
    { k: 'mu', sym: 'μ', name: 'Mass ratio M/m', min: 1.5, max: 6, step: 0.01, v: 2.4, unit: '', reset: true },
    { k: 'th0', sym: 'θ_0', name: 'Release angle', min: 20, max: 120, step: 1, v: 90, unit: '°', reset: true },
  ],
  essay: [
    'Hang a heavy mass and a light one over two pulleys and the heavy one should simply win. Let the light one swing and it does not: the swinging bob’s centrifugal pull on the rope holds the heavier mass aloft, and the pair settle into a bounded, intricate dance.',
    'Two degrees of freedom and one number, μ = <i>M</i>/<i>m</i>, decide everything. For some ratios the path closes into loops, for others it never quite repeats.'
  ],
  eqs: [
    '(\\mu + 1)\\,\\ddot r = r\\dot\\theta^2 - \\mu g + g\\cos\\theta',
    'r\\ddot\\theta = -2\\dot r\\dot\\theta - g\\sin\\theta'
  ],
  tryit: 'Try μ = 3 released from 90°: the path is a single teardrop that returns to where it started.',
  caption: 'Mass <i>M</i> hangs from a rope that passes over two fixed pulleys to a swinging mass <i>m</i> at distance <i>r</i> and angle θ. Massless pulleys and rope; the accent line is the path of <i>m</i>.',
  create(P) {
    const g0 = 9.81, Lt = 1.45, r0 = 0.55, px = -0.36, qx = 0.36, py = 0;
    const y = new Float64Array(4), w = mkWS(4); // r, rd, th, thd
    let t = 0, path = [], acc = 0;
    const f = (t, y, d) => {
      const r = Math.max(y[0], 1e-3), mu = P.mu;
      d[0] = y[1]; d[1] = (r * y[3] * y[3] - mu * g0 + g0 * Math.cos(y[2])) / (mu + 1);
      d[2] = y[3]; d[3] = (-2 * y[1] * y[3] - g0 * Math.sin(y[2])) / r;
    };
    const energy = () => 0.5 * (P.mu + 1) * y[1] * y[1] + 0.5 * y[0] * y[0] * y[3] * y[3] + g0 * y[0] * (P.mu - Math.cos(y[2]));
    const reset = () => { y.set([r0, 0, P.th0 / DEG, 0]); t = 0; path = []; };
    reset();
    const sim = {
      reset,
      advance(Dt) {
        let rem = Math.min(Dt, 0.05);
        while (rem > 1e-9) {
          const hh = Math.min(rem, y[0] < 0.15 ? 0.00025 : 0.0015);
          rk4(f, t, y, hh, w); t += hh; rem -= hh;
          if (y[0] < 0.03 && y[1] < 0) { y[0] = 0.03; y[1] = -y[1]; }
          if (y[0] > Lt - 0.12) { reset(); return; }
          acc += hh;
          if (acc >= 0.006) { acc = 0; path.push(px + y[0] * Math.sin(y[2]), py - y[0] * Math.cos(y[2])); if (path.length > 9000) path.splice(0, 600); }
        }
      },
      draw(g) {
        const W = g.W, H = g.H;
        g.fit(-1.3, -1.6, 0.85, 0.86, { pad: 10 });
        const s = g.s, rp = 0.055, c = g.c;
        // ceiling and hangers
        g.hatchLine(0.62, 0.74, -0.62, 0.74, {});
        for (const xx of [px, qx]) { g.line(xx, 0.74, xx, py, { w: LW }); }
        // path
        if (path.length > 4) {
          c.beginPath(); c.moveTo(g.X(path[0]), g.Y(path[1]));
          for (let i = 2; i < path.length; i += 2) c.lineTo(g.X(path[i]), g.Y(path[i + 1]));
          c.strokeStyle = T.accent; c.lineWidth = 1; c.globalAlpha = 0.85; c.stroke(); c.globalAlpha = 1;
        }
        const r = y[0], th = y[2], mx = px + r * Math.sin(th), my = py - r * Math.cos(th);
        const My = py - (Lt - r);
        // rope: over the pulleys
        g.line(qx + rp, py, qx + rp, My + 0.1, { w: LW });
        g.line(px, py + rp, qx, py + rp, { w: LW });
        g.line(px, py, mx, my, { w: LW });
        for (const xx of [px, qx]) { g.circle(xx, py, rp, { fill: T.paper, w: LW }); g.pin(g.X(xx), g.Y(py), 2.6); }
        // vertical reference and angle
        g.line(px, py, px, py - Math.max(0.42, r * 0.7), { w: 0.85, dash: [4, 3], stroke: T.faint });
        g.arcP(g.X(px), g.Y(py), Math.min(0.24, r * 0.6) * s, -PI / 2, -PI / 2 + wrapPi(th), { label: 'θ' });
        // masses
        g.poly([[qx + rp - 0.09, My + 0.1], [qx + rp + 0.09, My + 0.1], [qx + rp + 0.09, My - 0.12], [qx + rp - 0.09, My - 0.12]], true, { fill: T.fill, w: LW });
        g.text(g.X(qx + rp), g.Y(My - 0.01), 'M', { size: 16 });
        g.circle(mx, my, 0.05, { fill: T.fill, w: LW });
        g.com(g.X(mx), g.Y(my), 4.2);
        const nx = Math.cos(th), ny = Math.sin(th);
        g.text(g.X(mx) + 20 * Math.sin(th + 0.9), g.Y(my) + 20 * Math.cos(th + 0.9), 'm');
        g.textW(px + 0.5 * r * Math.sin(th), py - 0.5 * r * Math.cos(th), 'r', 12 * nx, 12 * ny);
        g.gP(W - 30, 16);
      },
      live() {
        const rdd = (y[0] * y[3] * y[3] - P.mu * g0 + g0 * Math.cos(y[2])) / (P.mu + 1);
        return `\\ddot r = \\frac{r\\dot\\theta^2 - \\mu g + g\\cos\\theta}{\\mu+1} = ${fmt(rdd, 2)}\\ \\mathrm{m/s^2},\\qquad \\frac{E}{m} = ${fmt(energy(), 4)}\\ \\mathrm{J/kg}`;
      }
    };
    return sim;
  }
});

/* =========================================================================
   Plate VIII — The double pendulum
   ========================================================================= */
DEFS.push({
  key: 'double', layout: 'pair',
  title: 'The double pendulum', theme: 'On prediction',
  aspect: { d: '1 / 1.12', m: '1 / 1.18' }, speed: 1,
  alt: 'A double pendulum hanging from a hatched support, with a second, ghost pendulum started a tiny angle away that slowly diverges from it.',
  params: [
    { k: 't1', sym: 'θ_1', name: 'Initial upper angle', min: -180, max: 180, step: 1, v: 125, unit: '°', reset: true },
    { k: 't2', sym: 'θ_2', name: 'Initial lower angle', min: -180, max: 180, step: 1, v: -15, unit: '°', reset: true },
    { k: 'm2', sym: 'm_2', name: 'Lower mass', min: 0.2, max: 3, step: 0.05, v: 1, unit: 'kg', reset: true },
    { k: 'lg', sym: 'δ_0', name: 'Ghost offset', min: -9, max: -1, step: 0.5, v: -4, reset: true, show: v => '10' + supNum(v) + ' rad' },
  ],
  quote: { text: '“It may happen that small differences in the initial conditions produce very great ones in the final phenomena.”', who: 'Henri Poincaré, Science and Method (1908)' },
  essay: [
    'Two rods, two hinges, gravity. The equations fit on a postcard and determine the future completely, yet the faint ghost beside the pendulum, started a ten-thousandth of a radian away, is soon somewhere else entirely.',
    'Determinism is not predictability. The separation grows exponentially at a rate fixed by the system itself, so each extra digit of precision in the starting angle buys only a constant extra slice of foresight.'
  ],
  eqs: [
    '\\ddot\\theta_1 = \\frac{-g(2m_1+m_2)\\sin\\theta_1 - m_2 g\\sin(\\theta_1-2\\theta_2) - 2\\sin\\Delta\\,m_2\\left(\\dot\\theta_2^2\\ell_2 + \\dot\\theta_1^2\\ell_1\\cos\\Delta\\right)}{\\ell_1\\left(2m_1 + m_2 - m_2\\cos 2\\Delta\\right)}',
    '\\ddot\\theta_2 = \\frac{2\\sin\\Delta\\left(\\dot\\theta_1^2\\ell_1(m_1+m_2) + g(m_1+m_2)\\cos\\theta_1 + \\dot\\theta_2^2\\ell_2 m_2\\cos\\Delta\\right)}{\\ell_2\\left(2m_1 + m_2 - m_2\\cos 2\\Delta\\right)}, \\quad \\Delta = \\theta_1 - \\theta_2'
  ],
  tryit: 'Make the ghost offset smaller by a factor of a thousand. The divergence on the inset is a straight line on a log scale; it simply starts lower and arrives a few seconds later.',
  caption: 'Point masses <i>m</i><sub>1</sub>, <i>m</i><sub>2</sub> on massless rods ℓ<sub>1</sub> = ℓ<sub>2</sub> = 1 m. The accent pendulum starts δ<sub>0</sub> away in θ<sub>1</sub>. Inset: log<sub>10</sub> of their separation in phase space.',
  create(P) {
    const g0 = 9.81, l1 = 1, l2 = 1, m1 = 1;
    const A = new Float64Array(4), B = new Float64Array(4), w = mkWS(4), tr = new Trace(300, 1, 1 / 20);
    let t = 0, pa = [], pb = [];
    const f = (t, y, d) => {
      const m2 = P.m2, t1 = y[0], t2 = y[2], w1 = y[1], w2 = y[3], D = t1 - t2, den = 2 * m1 + m2 - m2 * Math.cos(2 * D);
      d[0] = w1; d[2] = w2;
      d[1] = (-g0 * (2 * m1 + m2) * Math.sin(t1) - m2 * g0 * Math.sin(t1 - 2 * t2) - 2 * Math.sin(D) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(D))) / (l1 * den);
      d[3] = (2 * Math.sin(D) * (w1 * w1 * l1 * (m1 + m2) + g0 * (m1 + m2) * Math.cos(t1) + w2 * w2 * l2 * m2 * Math.cos(D))) / (l2 * den);
    };
    const energy = y => { const m2 = P.m2, t1 = y[0], t2 = y[2], w1 = y[1], w2 = y[3]; return 0.5 * (m1 + m2) * l1 * l1 * w1 * w1 + 0.5 * m2 * l2 * l2 * w2 * w2 + m2 * l1 * l2 * w1 * w2 * Math.cos(t1 - t2) - (m1 + m2) * g0 * l1 * Math.cos(t1) - m2 * g0 * l2 * Math.cos(t2); };
    const sep = () => Math.sqrt(sq(wrapPi(A[0] - B[0])) + sq(wrapPi(A[2] - B[2])) + 0.1 * (sq(A[1] - B[1]) + sq(A[3] - B[3])));
    const reset = () => { A.set([P.t1 / DEG, 0, P.t2 / DEG, 0]); B.set(A); B[0] += Math.pow(10, P.lg); t = 0; pa = []; pb = []; tr.clear(); };
    reset();
    const tip = y => [l1 * Math.sin(y[0]) + l2 * Math.sin(y[2]), -l1 * Math.cos(y[0]) - l2 * Math.cos(y[2])];
    let k = 0;
    return {
      h: 0.0008, reset,
      step(hh) {
        rk4(f, t, A, hh, w); rk4(f, t, B, hh, w); t += hh;
        if (++k % 12 === 0) { pa.push(...tip(A)); pb.push(...tip(B)); if (pa.length > 2400) { pa.splice(0, 200); pb.splice(0, 200); } }
        tr.tick(hh, [Math.log10(Math.max(sep(), 1e-12))]);
      },
      draw(g) {
        const W = g.W, H = g.H, ih = Math.min(96, H * 0.2);
        g.fit(-2.15, -2.15, 2.15, 2.15, { pad: 8, rh: H - ih - 10 });
        const c = g.c, s = g.s, ox = g.X(0), oy = g.Y(0);
        const trail = (arr, col, a) => { if (arr.length < 4) return; c.beginPath(); c.moveTo(g.X(arr[0]), g.Y(arr[1])); for (let i = 2; i < arr.length; i += 2) c.lineTo(g.X(arr[i]), g.Y(arr[i + 1])); c.strokeStyle = col; c.lineWidth = 0.9; c.globalAlpha = a; c.stroke(); c.globalAlpha = 1; };
        trail(pa, T.ink, 0.28); trail(pb, T.accent, 0.4);
        // support
        g.hatchLineP(ox + 26, oy - 9, ox - 26, oy - 9, {});
        g.lineP(ox, oy - 9, ox, oy, { w: LW });
        // ghost
        const r1 = 0.07 * Math.cbrt(m1), r2 = 0.07 * Math.cbrt(P.m2);
        const jb = [l1 * Math.sin(B[0]), -l1 * Math.cos(B[0])], tb = tip(B);
        g.poly([[0, 0], jb, tb], false, { w: 1.1, stroke: T.accent });
        g.circle(...jb, r1, { stroke: T.accent, w: 1.1, fill: T.paper }); g.circle(...tb, r2, { stroke: T.accent, w: 1.1, fill: T.paper });
        // main
        const ja = [l1 * Math.sin(A[0]), -l1 * Math.cos(A[0])], ta = tip(A);
        g.line(0, 0, ja[0], ja[1] - 0, { w: LW * 1.2 }); g.line(...ja, ...ta, { w: LW * 1.2 });
        g.line(0, 0, 0, -0.42, { w: 0.85, dash: [4, 3], stroke: T.faint });
        g.line(ja[0], ja[1], ja[0], ja[1] - 0.42, { w: 0.85, dash: [4, 3], stroke: T.faint });
        g.arcP(ox, oy, 0.3 * s, -PI / 2, -PI / 2 + wrapPi(A[0]), { label: 'θ_1', lo: 14 });
        g.arcP(g.X(ja[0]), g.Y(ja[1]), 0.3 * s, -PI / 2, -PI / 2 + wrapPi(A[2]), { label: 'θ_2', lo: 14 });
        g.circle(...ja, r1, { fill: T.fill, w: LW }); g.circle(...ta, r2, { fill: T.fill, w: LW });
        g.com(g.X(ja[0]), g.Y(ja[1]), 4.2); g.com(g.X(ta[0]), g.Y(ta[1]), 4.2);
        g.pin(ox, oy, 3);
        const lab = (a, b, txt) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); g.textW(mx, my, txt, -dy / L * 14, -dx / L * 14); };
        lab([0, 0], ja, 'ℓ_1'); lab(ja, ta, 'ℓ_2');
        g.textW(ja[0], ja[1], 'm_1', 20, 14); g.textW(ta[0], ta[1], 'm_2', 22, 14);
        g.gP(W - 30, 14, 30);
        g.plot(tr, 10, H - ih - 6, W - 20, ih, { labels: ['log₁₀|δ|'], cols: [T.accent], range: [P.lg - 0.6, 1], note: 'separation of the two pendulums' });
      },
      live() {
        const d = sep(), lam = t > 0.5 && d < 0.3 ? Math.log(d / Math.pow(10, P.lg)) / t : NaN;
        return `E = T + V = ${fmt(energy(A), 4)}\\ \\mathrm J,\\qquad |\\delta| = ${sci(d, 1)}${isFinite(lam) ? `,\\qquad \\tfrac{1}{t}\\ln\\frac{|\\delta|}{|\\delta_0|} = ${fmt(lam, 2)}\\ \\mathrm{s^{-1}}` : ''}`;
      }
    };
  }
});
