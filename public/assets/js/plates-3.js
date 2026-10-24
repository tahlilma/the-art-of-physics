/* The Art of Physics. Static build; see README.md. */
'use strict';
/* small dense-matrix helpers for the regulator */
const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const mt = A => A[0].map((_, j) => A.map(r => r[j]));
const madd = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));
const msc = (A, s) => A.map(r => r.map(v => v * s));
const meye = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
/* discrete-time LQR by Riccati iteration (symmetrised, stops at convergence) */
function dlqr(A, B, Q, R, dt) {
  let Ad = meye(4), term = meye(4), Bs = msc(meye(4), dt), tB = msc(meye(4), dt);
  for (let k = 1; k < 10; k++) { term = msc(mm(term, A), dt / k); Ad = madd(Ad, term); tB = msc(mm(tB, A), dt / (k + 1)); Bs = madd(Bs, tB); }
  const Bd = mm(Bs, B);
  let P = Q.map(r => r.slice());
  for (let it = 0; it < 20000; it++) {
    const BtP = mm(mt(Bd), P), S = R + mm(BtP, Bd)[0][0], BtPA = mm(BtP, Ad), K = msc(BtPA, 1 / S);
    const Pn = madd(Q, madd(mm(mm(mt(Ad), P), Ad), msc(mm(mt(BtPA), K), -1)));
    let d = 0, nm = 0;
    const Ps = Pn.map((r, i) => r.map((_, j) => 0.5 * (Pn[i][j] + Pn[j][i])));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { d = Math.max(d, Math.abs(Ps[i][j] - P[i][j])); nm = Math.max(nm, Math.abs(Ps[i][j])); }
    P = Ps; if (d < 1e-10 * nm) break;
  }
  const BtP = mm(mt(Bd), P), S = R + mm(BtP, Bd)[0][0];
  return mm(BtP, Ad)[0].map(v => v / S);
}

/* =========================================================================
   Plate IX — Inverted pendulum on a cart
   ========================================================================= */
DEFS.push({
  key: 'cartpole', layout: 'left',
  title: 'Inverted pendulum on a cart', theme: 'On attention',
  aspect: { d: '16 / 9.6', m: '1 / 1.12' }, speed: 1,
  alt: 'A cart on an elevated rail balancing an upright pendulum, with the control force drawn as an arrow.',
  params: [
    { k: 'M', sym: 'M', name: 'Cart mass', min: 0.5, max: 3, step: 0.05, v: 1, unit: 'kg' },
    { k: 'm', sym: 'm', name: 'Pendulum mass', min: 0.1, max: 1, step: 0.05, v: 0.3, unit: 'kg' },
    { k: 'l', sym: 'ℓ', name: 'Pendulum length', min: 0.3, max: 0.8, step: 0.01, v: 0.6, unit: 'm' },
    { k: 'F', sym: 'F_max', name: 'Force limit', min: 5, max: 40, step: 1, v: 20, unit: 'N' },
  ],
  actions: [
    { label: 'Nudge', run: s => s.nudge() },
    { label: 'Controller on', pressed: true, init: true, run: (s, pl, b) => { s.on = !s.on; b.setAttribute('aria-pressed', String(s.on)); b.textContent = s.on ? 'Controller on' : 'Controller off'; } },
  ],
  essay: [
    'An upright pendulum is an equilibrium that betrays you at the first breath of disturbance. It stays up only through small corrections, recomputed every instant from where it is and how it is moving.',
    'Ask the cart to move right and it first steps left, to tip the pendulum the way it needs to travel. Engineers call this a non-minimum-phase zero; anyone who has balanced a broom on a fingertip has felt it. Balance is never a state. It is a process.'
  ],
  eqs: [
    '(M+m)\\ddot x + m\\ell\\left(\\ddot\\theta\\cos\\theta - \\dot\\theta^2\\sin\\theta\\right) = F - b\\dot x',
    '\\ell\\ddot\\theta + \\ddot x\\cos\\theta - g\\sin\\theta = 0, \\qquad F = -\\mathbf K\\,(\\mathbf x - \\mathbf x_{\\mathrm{ref}})'
  ],
  tryit: 'Tap the rail to send the cart somewhere and watch it start the wrong way. Turn the controller off, let the pendulum fall, then turn it on again: it pumps energy into the swing until it can catch the pendulum upright.',
  caption: 'Cart of mass <i>M</i> on a rail with end stops, carrying a pendulum of mass <i>m</i> and length ℓ. Near upright, a linear–quadratic regulator computes the force <i>F</i>; far from upright, an energy-pumping controller swings it back up. Tap the rail to set <i>x</i><sub>ref</sub>. Inset: θ and <i>x</i>.',
  create(P) {
    const b = 0.1, g0 = 9.81, Q = [[8, 0, 0, 0], [0, 1, 0, 0], [0, 0, 60, 0], [0, 0, 0, 2]], R = 0.04, lim = 1.25;
    const y = new Float64Array(4), w = mkWS(4), tr = new Trace(260, 2, 1 / 30);
    let t = 0, K = [0, 0, 0, 0], F = 0, mode = 'lqr', xref = 0, kKey = '';
    const gains = () => {
      const key = [P.M, P.m, P.l].join('|'); if (key === kKey) return; kKey = key;
      const M = P.M, m = P.m, l = P.l;
      K = dlqr([[0, 1, 0, 0], [0, -b / M, -m * g0 / M, 0], [0, 0, 0, 1], [0, b / (M * l), (M + m) * g0 / (M * l), 0]], [[0], [1 / M], [0], [-1 / (M * l)]], Q, R, 0.01);
    };
    const control = () => {
      const M = P.M, m = P.m, l = P.l, th = wrapPi(y[2]);
      if (!sim.on) { mode = 'off'; return 0; }
      if (Math.abs(th) < 0.35 && Math.abs(y[3]) < 4) {
        mode = 'lqr';
        return clamp(-(K[0] * (y[0] - xref) + K[1] * y[1] + K[2] * th + K[3] * y[3]), -P.F, P.F);
      }
      mode = 'swing';
      const E = 0.5 * m * l * l * y[3] * y[3] + m * g0 * l * (Math.cos(y[2]) - 1), sg = Math.sign(y[3] * Math.cos(y[2])) || 1;
      const a = clamp(0.3 * E / (m * l) * sg - 6 * y[0] - 3 * y[1], -4, 4), st = Math.sin(y[2]), ct = Math.cos(y[2]);
      return clamp((M + m * st * st) * a + b * y[1] + m * g0 * st * ct - m * l * y[3] * y[3] * st, -P.F, P.F);
    };
    const f = (t, y, d) => {
      const M = P.M, m = P.m, l = P.l, st = Math.sin(y[2]), ct = Math.cos(y[2]);
      const xdd = (F - b * y[1] - m * g0 * st * ct + m * l * y[3] * y[3] * st) / (M + m * st * st);
      d[0] = y[1]; d[1] = xdd; d[2] = y[3]; d[3] = (g0 * st - xdd * ct) / l;
    };
    const reset = () => { y.set([0, 0, 0.12, 0]); t = 0; xref = 0; tr.clear(); };
    const sim = {
      h: 0.002, reset, on: true,
      nudge() { y[3] += 1.6; },
      onParam() { gains(); },
      tap(wx, wy) { if (wy > -0.4 && wy < 1.0) xref = clamp(wx, -0.95, 0.95); },
      step(hh) {
        F = control();
        rk4(f, t, y, hh, w); t += hh;
        if (Math.abs(y[0]) > lim) { y[0] = Math.sign(y[0]) * lim; y[1] = 0; }
        tr.tick(hh, [wrapPi(y[2]), y[0]]);
      },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 0.9;
        if (por) g.fit(-1.55, -0.78, 1.55, 1.0, { pad: 8, ry: H * 0.18, rh: H * 0.82 });
        else g.fit(-1.55, -0.78, 1.55, 1.0, { pad: 10 });
        const s = g.s, x = y[0], th = y[2], l = P.l;
        // ground, posts and rail
        g.hatchLine(-1.62, -0.72, 1.62, -0.72, {});
        for (const xx of [-1.45, 1.45]) { g.line(xx, -0.72, xx, -0.035, { w: LW }); g.hatchRect(xx - (xx > 0 ? 0 : 0.07), -0.0, xx + (xx > 0 ? 0.07 : 0), 0.14); }
        g.poly([[-1.45, 0], [1.45, 0], [1.45, -0.035], [-1.45, -0.035]], true, { fill: T.paper, w: LW });
        // origin and reference markers
        g.line(0, -0.035, 0, -0.13, { w: LT });
        g.textW(0, -0.13, '0', 0, 9, { it: false, size: 12 });
        const Xr = g.X(xref), Yr = g.Y(-0.035);
        g.polyP([[Xr, Yr + 2], [Xr - 6, Yr + 12], [Xr + 6, Yr + 12]], true, { fill: T.accent, stroke: null });
        g.text(Xr + 9, Yr + 22, 'x_ref', { col: T.accent, size: 13.5, align: 'left' });
        // cart
        const cw = 0.2, ch0 = 0.06, ch1 = 0.2, wr = 0.03;
        for (const dx of [-0.12, 0.12]) g.wheelP(g.X(x + dx), g.Y(wr), wr * s, -(x + dx) / wr, {});
        g.poly([[x - cw, ch0], [x + cw, ch0], [x + cw, ch1], [x - cw, ch1]], true, { fill: T.fill, w: LW * 1.2 });
        g.text(g.X(x - 0.1), g.Y((ch0 + ch1) / 2), 'M', { size: 15 });
        // pendulum
        const pv = [x, ch1], bob = [x + l * Math.sin(th), ch1 + l * Math.cos(th)];
        g.line(x, ch1, x, ch1 + Math.max(0.25, l * 0.55), { w: 0.85, dash: [4, 3], stroke: T.faint });
        g.line(...pv, ...bob, { w: LW * 1.25 });
        g.arcP(g.X(x), g.Y(ch1), Math.min(0.2, l * 0.45) * s, PI / 2, PI / 2 - wrapPi(th), { label: 'θ' });
        const br = 0.035 + 0.03 * Math.cbrt(P.m);
        g.circle(...bob, br, { fill: T.fill, w: LW });
        g.com(g.X(bob[0]), g.Y(bob[1]), 4.2);
        g.pin(g.X(pv[0]), g.Y(pv[1]), 3);
        g.textW(bob[0], bob[1], 'm', (br * s + 10) * (Math.sin(th) >= 0 ? 1 : -1), -br * s - 6);
        g.textW((pv[0] + bob[0]) / 2, (pv[1] + bob[1]) / 2, 'ℓ', -14 * Math.cos(th), -14 * Math.sin(th));
        // force arrow
        if (Math.abs(F) > 0.2) {
          const L2 = clamp(F * 0.022, -0.6, 0.6) * s, Xe = F > 0 ? g.X(x - cw) : g.X(x + cw), Ya = g.Y(0.13);
          g.arrowP(Xe - L2, Ya, Xe, Ya, { col: T.accent, head: 9, w: 1.6 });
          g.text(Xe - L2 - Math.sign(L2) * 11, Ya, 'F', { col: T.accent });
        }
        // x dimension below the rail
        if (Math.abs(x) * s > 16) g.dim(0, -0.035, x, -0.035, (x > 0 ? -1 : 1) * 46, 'x');
        g.gP(W - 30, 14, 30);
        if (W > 430) g.plot(tr, 12, 12, Math.min(230, W * 0.32), 74, { labels: ['θ', 'x'], cols: [T.ink, T.accent], indep: true, floor: [0.02, 0.05] });
        if (mode === 'swing') g.text(W - 14, H - 14, 'swinging up', { ui: true, align: 'right', size: 13, col: T.accent });
      },
      live() {
        const ks = K.map(v => fmt(v, 1)).join(',\\ ');
        return `F = -\\mathbf K(\\mathbf x - \\mathbf x_{\\mathrm{ref}}),\\quad \\mathbf K = [\\,${ks}\\,],\\quad F = ${fmt(F, 2)}\\ \\mathrm N${mode === 'swing' ? '\\ \\ \\text{(swinging up)}' : mode === 'off' ? '\\ \\ \\text{(controller off)}' : ''}`;
      }
    };
    gains(); reset();
    return sim;
  }
});

/* =========================================================================
   Plate X — Coupled pendulums and normal modes
   ========================================================================= */
DEFS.push({
  key: 'coupled', layout: 'right',
  title: 'Coupled pendulums', theme: 'On exchange',
  aspect: { d: '16 / 10', m: '1 / 1.25' }, speed: 1,
  alt: 'Pendulums hanging from a common beam, joined by springs, with bars showing how energy moves between them.',
  params: [
    { k: 'N', sym: 'N', name: 'Number of pendulums', min: 2, max: 4, step: 1, v: 2, reset: true },
    { k: 'k', sym: 'k', name: 'Coupling spring', min: 0.5, max: 20, step: 0.5, v: 3, unit: 'N/m' },
    { k: 'l', sym: 'ℓ', name: 'Length', min: 0.6, max: 1.4, step: 0.05, v: 1, unit: 'm' },
    { k: 'c', sym: 'c', name: 'Pivot damping', min: 0, max: 0.06, step: 0.002, v: 0, unit: 'N·m·s' },
  ],
  actions: [
    { label: 'Pluck one', run: s => s.excite(-1) },
    { label: 'Lowest mode', run: s => s.excite(0) },
    { label: 'Highest mode', run: s => s.excite(99) },
  ],
  essay: [
    'Start one pendulum and leave its neighbour still. Through a weak spring the motion drains across until the first falls silent, and then it all flows back.',
    'Nothing mysterious passes between them. The motion is two normal modes, in step and in opposition, with slightly different frequencies, beating against each other like two nearly tuned strings. Every linear vibration, however complicated, is a chord of such modes.'
  ],
  eqs: [
    'm\\ell^2\\ddot\\theta_i = -mg\\ell\\sin\\theta_i + a\\left(F_{i,x}\\cos\\theta_i + F_{i,y}\\sin\\theta_i\\right)',
    '\\omega_j^2 = \\frac{g}{\\ell} + \\frac{4ka^2}{m\\ell^2}\\sin^2\\frac{j\\pi}{2N}, \\qquad j = 0,\\dots,N-1'
  ],
  tryit: 'Press <i>Lowest mode</i> or <i>Highest mode</i>: started in a pure mode, the energy bars stop trading. Tap any bob to pluck it.',
  caption: 'Identical pendulums of mass <i>m</i> and length ℓ, joined at distance <i>a</i> = 0.6ℓ from their pivots by springs <i>k</i> whose natural length equals the pivot spacing. Full nonlinear dynamics. Right: angles θ<sub><i>i</i></sub>(<i>t</i>) and each pendulum’s share of the energy.',
  create(P) {
    const g0 = 9.81, m = 1, d = 0.7;
    let N = P.N, y = new Float64Array(2 * N), w = mkWS(2 * N), tr = new Trace(300, N, 1 / 30), t = 0;
    const a = () => 0.6 * P.l;
    const piv = i => (i - (N - 1) / 2) * d;
    const f = (t, y, dy) => {
      const l = P.l, A = a(), tau = new Float64Array(N);
      for (let i = 0; i < N - 1; i++) {
        const x1 = piv(i) + A * Math.sin(y[2 * i]), y1 = -A * Math.cos(y[2 * i]), x2 = piv(i + 1) + A * Math.sin(y[2 * i + 2]), y2 = -A * Math.cos(y[2 * i + 2]);
        const dx = x2 - x1, dyy = y2 - y1, L = Math.hypot(dx, dyy), Fm = P.k * (L - d), Fx = Fm * dx / L, Fy = Fm * dyy / L;
        tau[i] += A * (Math.sin(y[2 * i]) * Fy + Math.cos(y[2 * i]) * Fx);
        tau[i + 1] -= A * (Math.sin(y[2 * i + 2]) * Fy + Math.cos(y[2 * i + 2]) * Fx);
      }
      for (let i = 0; i < N; i++) { dy[2 * i] = y[2 * i + 1]; dy[2 * i + 1] = (-m * g0 * l * Math.sin(y[2 * i]) + tau[i] - P.c * y[2 * i + 1]) / (m * l * l); }
    };
    const energies = () => {
      const l = P.l, A = a(), E = [];
      for (let i = 0; i < N; i++) E.push(0.5 * m * l * l * y[2 * i + 1] ** 2 + m * g0 * l * (1 - Math.cos(y[2 * i])));
      for (let i = 0; i < N - 1; i++) {
        const dx = piv(i + 1) + A * Math.sin(y[2 * i + 2]) - piv(i) - A * Math.sin(y[2 * i]), dyy = -A * Math.cos(y[2 * i + 2]) + A * Math.cos(y[2 * i]);
        const es = 0.5 * P.k * sq(Math.hypot(dx, dyy) - d); E[i] += es / 2; E[i + 1] += es / 2;
      }
      return E;
    };
    const omegas = () => Array.from({ length: N }, (_, j) => Math.sqrt(g0 / P.l + 4 * P.k * a() * a() / (m * P.l * P.l) * sq(Math.sin(j * PI / (2 * N)))));
    const sim = {
      h: 0.002,
      reset() { N = P.N; y = new Float64Array(2 * N); w = mkWS(2 * N); tr = new Trace(300, N, 1 / 30); t = 0; y[0] = 0.25; },
      excite(j) {
        y.fill(0); tr.clear();
        if (j < 0) { y[0] = 0.25; return; }
        const jj = Math.min(j, N - 1);
        for (let i = 0; i < N; i++) y[2 * i] = 0.2 * Math.cos(jj * PI * (i + 0.5) / N);
      },
      tap(wx, wy) {
        let best = -1, bd = 0.3;
        for (let i = 0; i < N; i++) { const bx = piv(i) + P.l * Math.sin(y[2 * i]), by = -P.l * Math.cos(y[2 * i]), dd = Math.hypot(wx - bx, wy - by); if (dd < bd) { bd = dd; best = i; } }
        if (best >= 0) { y[2 * best] = (y[2 * best] >= 0 ? -1 : 1) * 0.28; y[2 * best + 1] = 0; }
      },
      step(hh) { rk4(f, t, y, hh, w); t += hh; tr.tick(hh, Array.from({ length: N }, (_, i) => y[2 * i])); },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 1.0, l = P.l, A = a(), half = (N - 1) / 2 * d + 0.45;
        let tb, eb;
        if (por) { g.fit(-half, -1.55, half, 0.2, { pad: 8, rh: H * 0.6 }); tb = [12, H * 0.62, W * 0.58 - 14, H * 0.36]; eb = [W * 0.58 + 6, H * 0.62, W * 0.42 - 18, H * 0.36]; }
        else { const hw = Math.max(half, 1.05); g.fit(-hw, -1.55, hw, 0.2, { pad: 10, rw: W * 0.6 }); tb = [W * 0.61, 14, W * 0.37, H * 0.5]; eb = [W * 0.61, H * 0.5 + 26, W * 0.37, H * 0.5 - 40]; }
        const s = g.s;
        g.hatchLine(half - 0.1, 0.0, -half + 0.1, 0.0, {});
        const E = energies(), Et = E.reduce((p, v) => p + v, 0) || 1;
        const pts = [];
        for (let i = 0; i < N; i++) {
          const th = y[2 * i], px = piv(i);
          pts.push({ px, th, ax: px + A * Math.sin(th), ay: -A * Math.cos(th), bx: px + l * Math.sin(th), by: -l * Math.cos(th) });
        }
        for (const p of pts) g.line(p.px, 0, p.px, -l - 0.12, { w: 0.8, dash: [4, 3], stroke: T.faint });
        for (let i = 0; i < N - 1; i++) g.spring(pts[i].ax, pts[i].ay, pts[i + 1].ax, pts[i + 1].ay, { n: 8, w: 0.05, lead: 0.12 });
        pts.forEach((p, i) => {
          g.line(p.px, 0, p.bx, p.by, { w: LW * 1.2 });
          g.pin(g.X(p.ax), g.Y(p.ay), 2.4);
          g.circle(p.bx, p.by, 0.065, { fill: T.fill, w: LW });
          g.com(g.X(p.bx), g.Y(p.by), 4.2);
          g.pin(g.X(p.px), g.Y(0), 3);
          if (i < 2) g.arcP(g.X(p.px), g.Y(0), 0.32 * s, -PI / 2, -PI / 2 + p.th, { label: `θ_${i + 1}`, lo: 13 });
        });
        g.textW(pts[0].bx, pts[0].by, 'm', 0, 0.065 * s + 14);
        g.textW((pts[0].ax + pts[1].ax) / 2, (pts[0].ay + pts[1].ay) / 2, 'k', 0, -16);
        g.dim(pts[0].px, 0, pts[0].bx, pts[0].by, -46, 'ℓ');
        g.dim(pts[0].px, 0, pts[0].ax, pts[0].ay, -24, 'a', { lo: 9 });
        const cols = [T.ink, T.accent, T.faint, T.ink];
        g.plot(tr, ...tb, { labels: pts.map((_, i) => `θ_${i + 1}`), cols, lw: [1.2, 1.2, 1.2, 0.8], alpha: [1, 1, 1, 0.55] });
        // energy share bars
        const [ex, ey, ew, eh] = eb, c = g.c;
        c.fillStyle = T.paper; c.globalAlpha = 0.92; c.fillRect(ex, ey, ew, eh); c.globalAlpha = 1;
        c.strokeStyle = T.faint; c.lineWidth = 0.8; c.strokeRect(Math.round(ex) + 0.5, Math.round(ey) + 0.5, Math.round(ew), Math.round(eh));
        g.text(ex + 7, ey + 9, 'share of energy', { ui: true, size: 12, align: 'left', col: T.faint });
        const bw = Math.min(46, (ew - 30) / N - 10), base = ey + eh - 22, top = ey + 24;
        for (let i = 0; i < N; i++) {
          const bx = ex + 18 + i * (bw + 12), hgt = (base - top) * E[i] / Et;
          c.fillStyle = T.fill; c.fillRect(bx, base - hgt, bw, hgt);
          c.strokeStyle = T.ink; c.lineWidth = LT; c.strokeRect(bx + 0.5, base - hgt + 0.5, bw, hgt);
          g.text(bx + bw / 2, base + 11, `E_${i + 1}`, { size: 13 });
        }
        g.lineP(ex + 10, base, ex + ew - 10, base, { w: LT });
      },
      live() {
        const om = omegas(), E = energies(), Et = E.reduce((p, v) => p + v, 0) || 1;
        const shares = E.map(v => fmt(v / Et, 2)).join(' : ');
        if (N === 2) return `\\omega_0 = ${fmt(om[0], 3)},\\ \\ \\omega_1 = ${fmt(om[1], 3)}\\ \\mathrm{rad/s},\\quad T_{\\mathrm{beat}} = \\frac{2\\pi}{\\omega_1 - \\omega_0} = ${fmt(TAU / (om[1] - om[0]), 1)}\\ \\mathrm s,\\quad E_1 : E_2 = ${shares}`;
        return `\\omega_j = ${om.map(v => fmt(v, 3)).join(',\\ ')}\\ \\mathrm{rad/s},\\qquad ${E.map((_, i) => `E_${i + 1}`).join(' : ')} = ${shares}`;
      }
    };
    sim.reset();
    return sim;
  }
});

/* =========================================================================
   Plate XI — Kepler's ellipse
   ========================================================================= */
DEFS.push({
  key: 'kepler', layout: 'left',
  title: 'Kepler’s ellipse', theme: 'On law',
  aspect: { d: '16 / 10.4', m: '1 / 1.05' }, speed: 1,
  alt: 'An elliptical orbit with its two foci marked; shaded sectors swept out in equal times all have equal area.',
  params: [
    { k: 'e', sym: 'e', name: 'Eccentricity', min: 0, max: 0.9, step: 0.01, v: 0.6, unit: '', reset: true },
    { k: 'q', sym: 'm/M', name: 'Mass ratio', min: 0, max: 1, step: 0.01, v: 0.12, unit: '', reset: true },
  ],
  actions: [{ label: 'Fire engine', run: s => s.burn(1.05) }, { label: 'Brake', run: s => s.burn(0.95) }],
  note: 'Units: astronomical units and years, with G(M + m) = 4π².',
  essay: [
    'Kepler fitted ellipses to Tycho Brahe’s observations of Mars before anyone knew why planets should follow them. Newton supplied the reason: a force that falls off as the inverse square of distance, and a quantity, angular momentum, that such a force cannot change.',
    'Each shaded sector is swept out in one twelfth of an orbit, and they all have the same area because angular momentum is conserved. The planet hurries near its star and loiters far away, and keeps perfect accounts.'
  ],
  eqs: [
    '\\ddot{\\mathbf r} = -\\frac{G(M+m)}{r^3}\\,\\mathbf r, \\qquad \\frac{dA}{dt} = \\frac{|\\mathbf r\\times\\dot{\\mathbf r}|}{2} = \\text{const}',
    'T^2 = \\frac{4\\pi^2 a^3}{G(M+m)}'
  ],
  tryit: 'Fire the engine at the far end of the orbit and you raise the near end; fire it at the near end and you raise the far end. Every orbital manoeuvre is planned around this asymmetry.',
  caption: 'Two bodies about their common centre of mass, which sits at a focus <i>F</i><sub>1</sub> of both ellipses. Semi-major axis <i>a</i>, semi-minor axis <i>b</i>, empty focus <i>F</i><sub>2</sub>. The accent arrow is the planet’s velocity <b>v</b>; the ink arrow is the pull of gravity.',
  create(P) {
    const mu = 4 * PI * PI;
    let rx, ry, vx, vy, t, sectors, cur, acc, box = null;
    const elements = () => {
      const r = Math.hypot(rx, ry), v2 = vx * vx + vy * vy, rv = rx * vx + ry * vy;
      const ex = ((v2 - mu / r) * rx - rv * vx) / mu, ey = ((v2 - mu / r) * ry - rv * vy) / mu, e = Math.hypot(ex, ey);
      const a = 1 / (2 / r - v2 / mu), hh = rx * vy - ry * vx;
      return { r, v2, e, ex, ey, a, h: hh, T: a > 0 ? TAU * Math.sqrt(a * a * a / mu) : Infinity, E: v2 / 2 - mu / r };
    };
    const reset = () => {
      const e = P.e, rp = 1 - e;
      rx = rp; ry = 0; vx = 0; vy = Math.sqrt(mu * (1 + e) / rp); t = 0; sectors = []; cur = [[rx, ry]]; acc = 0; box = null;
    };
    reset();
    return {
      ts: 0.25, reset,
      burn(f) { vx *= f; vy *= f; sectors = []; cur = [[rx, ry]]; acc = 0; },
      advance(Dt) {
        let rem = Math.min(Dt, 0.02);
        const el = elements(), secDt = isFinite(el.T) ? el.T / 12 : 0.1;
        while (rem > 1e-12) {
          const r = Math.hypot(rx, ry), hh = Math.min(rem, 0.0025 * Math.pow(r, 1.5));
          let a = -mu / (r * r * r); vx += 0.5 * hh * a * rx; vy += 0.5 * hh * a * ry;
          rx += hh * vx; ry += hh * vy;
          const r2 = Math.hypot(rx, ry); a = -mu / (r2 * r2 * r2); vx += 0.5 * hh * a * rx; vy += 0.5 * hh * a * ry;
          t += hh; rem -= hh; acc += hh;
          const last = cur[cur.length - 1];
          if (Math.hypot(rx - last[0], ry - last[1]) > 0.01) cur.push([rx, ry]);
          if (acc >= secDt) { cur.push([rx, ry]); sectors.push(cur); if (sectors.length > 12) sectors.shift(); cur = [[rx, ry]]; acc -= secDt; }
        }
      },
      draw(g) {
        const el = elements(), fp = 1 / (1 + P.q), fs = P.q / (1 + P.q);
        const om = Math.atan2(el.ey, el.ex), a = el.a > 0 ? el.a : 3, e = Math.min(el.e, 0.999), b = a * Math.sqrt(1 - e * e);
        const cxw = -a * e * Math.cos(om) * fp, cyw = -a * e * Math.sin(om) * fp;
        const ell = []; for (let i = 0; i <= 120; i++) { const u = TAU * i / 120, X = a * Math.cos(u), Y = b * Math.sin(u); ell.push([cxw + fp * (X * Math.cos(om) - Y * Math.sin(om)), cyw + fp * (X * Math.sin(om) + Y * Math.cos(om))]); }
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of ell) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        x0 = Math.min(x0, -0.2) - 0.28; x1 += 0.28; y0 -= 0.3; y1 += 0.3;
        if (!box) box = [x0, y0, x1, y1]; else box = box.map((v, i) => v + ([x0, y0, x1, y1][i] - v) * 0.08);
        g.fit(...box, { pad: 12 });
        const s = g.s, c = g.c, B = p => [p[0] * fp, p[1] * fp];
        // equal-area sectors from the focus (barycentre)
        sectors.forEach((sec, k) => {
          c.beginPath(); c.moveTo(g.X(0), g.Y(0)); for (const p of sec) { const q = B(p); c.lineTo(g.X(q[0]), g.Y(q[1])); } c.closePath();
          c.fillStyle = T.fill; c.globalAlpha = (k + sectors.length) % 2 ? 0.95 : 0.4; c.fill(); c.globalAlpha = 1;
          c.strokeStyle = T.faint; c.lineWidth = 0.7; c.stroke();
        });
        if (cur.length > 1) { c.beginPath(); c.moveTo(g.X(0), g.Y(0)); for (const p of cur) { const q = B(p); c.lineTo(g.X(q[0]), g.Y(q[1])); } c.lineTo(g.X(rx * fp), g.Y(ry * fp)); c.closePath(); c.fillStyle = T.accent; c.globalAlpha = 0.14; c.fill(); c.globalAlpha = 1; }
        // orbits
        g.poly(ell, true, { w: LW });
        g.poly(ell.map(p => [-p[0] * fs / fp, -p[1] * fs / fp]), true, { w: LT, stroke: T.faint });
        // axes and foci
        const ux = Math.cos(om), uy = Math.sin(om), A = a * fp, Bm = b * fp;
        const peri = [cxw + A * ux, cyw + A * uy], apo = [cxw - A * ux, cyw - A * uy];
        g.line(...apo, ...peri, { w: 0.8, dash: [5, 4], stroke: T.faint });
        g.line(cxw + Bm * uy, cyw - Bm * ux, cxw - Bm * uy, cyw + Bm * ux, { w: 0.8, dash: [5, 4], stroke: T.faint });
        g.dim(cxw, cyw, ...peri, -24, 'a');
        g.dim(cxw, cyw, cxw - Bm * uy, cyw + Bm * ux, 18, 'b');
        const F2 = [2 * cxw, 2 * cyw];
        const cross = (p, lb) => { const X = g.X(p[0]), Y = g.Y(p[1]); g.lineP(X - 5, Y, X + 5, Y, { w: 1 }); g.lineP(X, Y - 5, X, Y + 5, { w: 1 }); g.text(X + 9, Y + 13, lb, { align: 'left', size: 14 }); };
        cross([0, 0], ''); g.text(g.X(0) - 10, g.Y(0) + 16, 'F_1', { align: 'right', size: 14 }); if (e > 0.02) cross(F2, 'F_2');
        // bodies
        const pl = [rx * fp, ry * fp], st = [-rx * fs, -ry * fs];
        g.line(...st, ...pl, { w: 0.8, stroke: T.faint });
        g.textW((st[0] + pl[0]) / 2, (st[1] + pl[1]) / 2, 'r', -11 * (pl[1] - st[1]) / el.r, -11 * (pl[0] - st[0]) / el.r, { size: 14 });
        const rs = 7 + 5 * Math.cbrt(1 / (1 + P.q)), rp_ = 3.5 + 6 * Math.cbrt(P.q / (1 + P.q) + 0.02);
        g.circleP(g.X(st[0]), g.Y(st[1]), rs, { fill: T.fill, w: LW });
        g.com(g.X(st[0]), g.Y(st[1]), 4);
        g.text(g.X(st[0]) - rs - 6, g.Y(st[1]) - rs - 6, 'M', { align: 'right' });
        const vs = 0.045, Xp = g.X(pl[0]), Yp = g.Y(pl[1]);
        g.arrowP(Xp, Yp, Xp + vx * fp * vs * s, Yp - vy * fp * vs * s, { col: T.accent, head: 8, w: 1.4 });
        g.text(Xp + vx * fp * vs * s * 1.12 + 6, Yp - vy * fp * vs * s * 1.12, 'v', { col: T.accent });
        const gl = clamp(0.16 / (el.r * el.r), 0.06, 0.55) * s;
        g.arrowP(Xp, Yp, Xp - rx / el.r * gl, Yp + ry / el.r * gl, { head: 7, w: 1.1 });
        g.circleP(Xp, Yp, rp_, { fill: T.paper, w: LW });
        g.text(Xp + 12, Yp + 13, 'm', { align: 'left' });
      },
      live() {
        const el = elements();
        return `\\frac{dA}{dt} = \\tfrac12|\\mathbf r\\times\\mathbf v| = ${fmt(Math.abs(el.h) / 2, 4)}\\ \\mathrm{AU^2/yr},\\quad E = \\frac{v^2}{2} - \\frac{\\mu}{r} = ${fmt(el.E, 3)},\\quad r = ${fmt(el.r, 3)}\\ \\mathrm{AU},\\quad T = ${isFinite(el.T) ? fmt(el.T, 3) + '\\ \\mathrm{yr}' : '\\infty'}`;
      }
    };
  }
});

/* =========================================================================
   Plate XII — RLC circuit and its mechanical analogue
   ========================================================================= */
DEFS.push({
  key: 'rlc', layout: 'full',
  title: 'The RLC circuit', theme: 'On analogy',
  aspect: { d: '16 / 7.6', m: '1 / 1.6' }, speed: 1,
  alt: 'A series RLC circuit with a two-way switch beside a mass on a spring and damper; both move to the same equation.',
  params: [
    { k: 'R', sym: 'R', name: 'Resistance', min: 0, max: 10, step: 0.05, v: 0.8, unit: 'Ω' },
    { k: 'L', sym: 'L', name: 'Inductance', min: 0.1, max: 2, step: 0.01, v: 0.5, unit: 'H' },
    { k: 'C', sym: 'C', name: 'Capacitance', min: 0.02, max: 1, step: 0.01, v: 0.2, unit: 'F' },
    { k: 'V0', sym: 'V_0', name: 'Source voltage', min: 1, max: 12, step: 0.5, v: 6, unit: 'V' },
    { k: 'ac', sym: '∿', name: 'Source', type: 'toggle', v: false, on: 'Alternating source' },
    { k: 'wd', sym: 'ω', name: 'Source frequency (AC)', min: 0.5, max: 10, step: 0.05, v: 3.2, unit: 'rad/s' },
  ],
  actions: [{ label: 'Flip switch', run: s => s.flip() }],
  essay: [
    'An inductor resists a change in current the way a mass resists a change in velocity. A capacitor stores charge the way a spring stores stretch. A resistor turns current into heat the way a dashpot turns motion into heat.',
    'Write down both equations and they are one equation in two sets of units. The same line of mathematics governs a car’s suspension, the tuner in a radio and this circuit, which is about the strongest evidence there is that physics describes structure rather than stuff.'
  ],
  eqs: [
    'L\\ddot q + R\\dot q + \\frac{q}{C} = V(t) \\qquad\\Longleftrightarrow\\qquad m\\ddot x + c\\dot x + kx = F(t)',
    '\\omega_0 = \\frac{1}{\\sqrt{LC}}, \\qquad \\zeta = \\frac{R}{2}\\sqrt{\\frac{C}{L}}'
  ],
  tryit: 'Raise <i>R</i> until ζ reaches 1, critical damping, where the charge arrives fastest without overshooting. Then flip the switch and watch the stored energy ring away through the resistor.',
  caption: 'Left: series circuit with source <i>V</i>, two-way switch, resistor <i>R</i>, inductor <i>L</i> and capacitor <i>C</i>; the dots move with the current <i>i</i> = d<i>q</i>/d<i>t</i>. Right: the mechanical analogue, mass <i>m</i> ↔ <i>L</i>, damper <i>c</i> ↔ <i>R</i>, spring <i>k</i> ↔ 1/<i>C</i>, displacement <i>x</i> ↔ <i>q</i>. Inset: <i>q</i>(<i>t</i>) and <i>i</i>(<i>t</i>).',
  create(P) {
    const y = new Float64Array(2), w = mkWS(2), tr = new Trace(320, 2, 1 / 30);
    let t = 0, sw = true, phase = 0, scale = 2 * P.C * P.V0;
    const V = tt => (sw ? (P.ac ? P.V0 * Math.sin(P.wd * tt) : P.V0) : 0);
    const f = (tt, y, d) => { d[0] = y[1]; d[1] = (V(tt) - P.R * y[1] - y[0] / P.C) / P.L; };
    const reset = () => { y.fill(0); t = 0; sw = true; tr.clear(); };
    reset();
    const pathA = [[0, 0], [0, 1.4], [0.62, 1.4], [2.4, 1.4], [2.4, 0], [0, 0]];
    const pathB = [[0.42, 0], [0.42, 1.12], [0.62, 1.4], [2.4, 1.4], [2.4, 0], [0.42, 0]];
    const pathLen = p => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
    const along = (path, dist) => {
      const tot = pathLen(path); dist = ((dist % tot) + tot) % tot;
      for (let i = 0; i < path.length - 1; i++) {
        const L = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
        if (dist <= L) { const u = dist / L; return [path[i][0] + (path[i + 1][0] - path[i][0]) * u, path[i][1] + (path[i + 1][1] - path[i][1]) * u]; }
        dist -= L;
      }
      return path[0];
    };
    return {
      h: 0.002, reset,
      flip() { sw = !sw; },
      step(hh) { rk4(f, t, y, hh, w); t += hh; phase += y[1] * hh * 0.35; tr.tick(hh, [y[0], y[1]]); },
      draw(g) {
        const W = g.W, H = g.H, por = H > W * 1.05;
        let rc, rm, ri;
        if (por) { rc = [0, 0, W, H * 0.38]; rm = [0, H * 0.38, W, H * 0.36]; ri = [12, H * 0.76, W - 24, H * 0.22]; }
        else { rc = [0, 0, W * 0.44, H * 0.76]; rm = [W * 0.44, 0, W * 0.56, H * 0.76]; ri = [12, H * 0.77, W - 24, H * 0.21]; }
        /* ---- circuit ---- */
        g.fit(-0.75, -0.42, 2.95, 1.75, { rx: rc[0], ry: rc[1], rw: rc[2], rh: rc[3], pad: 8 });
        const s = g.s, Wd = { w: LW };
        g.line(0, 0, 0, 0.45, Wd); g.line(0, 0.95, 0, 1.4, Wd); g.line(0, 1.4, 0.24, 1.4, Wd);
        g.line(0.42, 0, 0.42, 1.12, Wd);
        g.line(0.62, 1.4, 0.9, 1.4, Wd);
        const rz = []; for (let i = 0; i <= 12; i++) rz.push([0.9 + 0.6 * i / 12, 1.4 + (i === 0 || i === 12 ? 0 : (i % 2 ? 0.07 : -0.07))]);
        g.poly(rz, false, Wd);
        g.line(1.5, 1.4, 2.4, 1.4, Wd); g.line(2.4, 1.4, 2.4, 1.12, Wd);
        const coil = []; for (let k = 0; k < 5; k++) for (let i = 0; i <= 14; i++) { const an = -PI / 2 + PI * i / 14; coil.push([2.4 + 0.09 * Math.cos(an), 1.12 - k * 0.16 - 0.08 - 0.08 * Math.sin(an)]); }
        g.poly(coil, false, Wd);
        g.line(2.4, 0.32, 2.4, 0, Wd); g.line(2.4, 0, 1.28, 0, Wd); g.line(1.12, 0, 0, 0, Wd);
        g.line(1.12, -0.17, 1.12, 0.17, { w: LW * 1.8 }); g.line(1.28, -0.17, 1.28, 0.17, { w: LW * 1.8 });
        const q = y[0], qn = clamp(Math.round(Math.abs(q) / (P.C * P.V0 + 1e-9) * 3), 0, 4);
        for (let k = 0; k < qn; k++) { const yy = -0.12 + k * 0.08; g.textW(q >= 0 ? 1.04 : 1.36, yy, '+', 0, 0, { it: false, size: 11 }); g.textW(q >= 0 ? 1.36 : 1.04, yy, '−', 0, 0, { it: false, size: 11 }); }
        if (P.ac) { g.circle(0, 0.7, 0.2, { fill: T.paper, w: LW }); const sv = []; for (let i = 0; i <= 20; i++) { const u = i / 20; sv.push([-0.11 + 0.22 * u, 0.7 + 0.07 * Math.sin(TAU * u)]); } g.poly(sv, false, { w: LT }); g.line(0, 0.45, 0, 0.5, Wd); g.line(0, 0.9, 0, 0.95, Wd); }
        else { g.line(-0.2, 0.75, 0.2, 0.75, { w: LW * 1.4 }); g.line(-0.11, 0.65, 0.11, 0.65, { w: LW * 2.4 }); g.line(0, 0.45, 0, 0.65, Wd); g.line(0, 0.75, 0, 0.95, Wd); g.textW(0.24, 0.82, '+', 0, 0, { it: false, size: 12 }); }
        const tip = sw ? [0.26, 1.4] : [0.44, 1.14];
        g.line(0.62, 1.4, tip[0], tip[1] + (sw ? 0.05 : 0.02), { w: LW * 1.2 });
        g.circle(0.24, 1.4, 0.025, { fill: T.paper, w: LT }); g.circle(0.42, 1.12, 0.025, { fill: T.paper, w: LT }); g.dot(g.X(0.62), g.Y(1.4), 3);
        for (const p of [[0, 0], [0.42, 0]]) g.dot(g.X(p[0]), g.Y(p[1]), 2.6);
        const path = sw ? pathA : pathB, pl = pathLen(path), n = Math.floor(pl / 0.2);
        for (let k = 0; k < n; k++) { const p = along(path, k * pl / n + phase); g.dot(g.X(p[0]), g.Y(p[1]), 2.3, T.accent); }
        g.textW(1.2, 1.4, 'R', 0, -18); g.textW(2.4, 0.72, 'L', 22, 0); g.textW(1.2, 0, 'C', 0, 26); g.textW(0, 0.7, 'V', -32, 0);
        g.textW(0.24, 1.4, 'A', -4, -15, { ui: true, size: 12 }); g.textW(0.42, 1.12, 'B', -14, 4, { ui: true, size: 12 });
        const ia = y[1];
        if (Math.abs(ia) > 0.02) { const X0 = g.X(1.95), Y0 = g.Y(1.4) - 16, L2 = clamp(ia * 0.3, -0.35, 0.35) * s; g.arrowP(X0 - L2 / 2, Y0, X0 + L2 / 2, Y0, { col: T.accent, head: 7, w: 1.3 }); g.text(X0 + L2 / 2 + Math.sign(L2) * 9, Y0, 'i', { col: T.accent }); }
        /* ---- mechanical analogue ---- */
        g.fit(-0.25, -0.45, 2.45, 1.0, { rx: rm[0], ry: rm[1], rw: rm[2], rh: rm[3], pad: 10 });
        const target = Math.max(0.05, 2 * P.C * P.V0); scale += (target - scale) * 0.03;
        const xm = 0.95 + clamp(q / scale, -1.25, 1.25) * 0.3, s2 = g.s;
        g.hatchLine(0, 0.85, 0, -0.12, { flip: true });
        g.hatchLine(-0.25, -0.12, 2.45, -0.12, {});
        g.springDamper(0, 0.28, xm, 0.28, { t1: 0.05, t2: 0.05, hw: 0.17, Ln: 0.95, n: 7, cl: 0.78 });
        g.poly([[xm, 0.03], [xm + 0.42, 0.03], [xm + 0.42, 0.53], [xm, 0.53]], true, { fill: T.fill, w: LW * 1.2 });
        for (const dx of [0.1, 0.32]) g.wheelP(g.X(xm + dx), g.Y(-0.045), 0.075 * s2, -(xm + dx) / 0.075, {});
        g.text(g.X(xm + 0.21), g.Y(0.28), 'm', { size: 17 });
        g.textW(xm * 0.36, 0.28, 'k', 0, 0.16 * s2 + 12); g.textW(xm * 0.36, 0.28, 'c', 0, -0.16 * s2 - 12);
        const Fl = clamp(V(t) / (P.V0 || 1), -1, 1) * 0.45 * s2;
        if (Math.abs(Fl) > 1) { const Xb = g.X(xm + 0.42), Yb = g.Y(0.28); g.arrowP(Xb, Yb, Xb + Fl, Yb, { col: T.accent, head: 8, w: 1.5 }); g.text(Xb + Fl + Math.sign(Fl) * 14, Yb - 2, 'F', { col: T.accent }); }
        g.line(0.95, -0.12, 0.95, 0.72, { w: 0.8, dash: [4, 3], stroke: T.faint });
        if (Math.abs(xm - 0.95) * s2 > 14) g.dim(0.95, 0.72, xm, 0.72, 12, 'x');
        const mx0 = g.X(2.45) - 4;
        [['L', 'm'], ['R', 'c'], ['1/C', 'k'], ['q', 'x'], ['V', 'F']].forEach(([a, b], i) => {
          const Yp = g.Y(0.98) + i * 17;
          g.text(mx0 - 46, Yp, a, { align: 'right', size: 14.5 }); g.text(mx0 - 32, Yp, '↔', { it: false, size: 14, col: T.ink }); g.text(mx0 - 18, Yp, b, { align: 'left', size: 14.5 });
        });
        g.plot(tr, ...ri, { labels: ['q', 'i'], cols: [T.accent, T.ink], indep: true, floor: [0.05, 0.05] });
      },
      live() {
        const qdd = (V(t) - P.R * y[1] - y[0] / P.C) / P.L, z = P.R / 2 * Math.sqrt(P.C / P.L);
        const reg = z < 0.995 ? 'underdamped' : z <= 1.005 ? 'critically damped' : 'overdamped';
        return `L\\ddot q + R\\dot q + \\frac{q}{C} = ${fmt(P.L * qdd, 2)} + ${par(P.R * y[1], 2)} + ${par(y[0] / P.C, 2)} = ${fmt(V(t), 2)}\\ \\mathrm V,\\qquad \\zeta = \\frac{R}{2}\\sqrt{\\frac{C}{L}} = ${fmt(z, 2)}\\ \\ \\text{(${reg})}`;
      }
    };
  }
});
