# The Art of Physics

Twelve live simulations drawn as engineering-textbook plates: a half-car suspension, a parametrically pumped beam, a cyclotron, a hollow cylinder with internal masses, the tumbling (Dzhanibekov) racket, two coupled beams, a swinging Atwood machine, the double pendulum, an LQR-balanced cart–pole, coupled pendulums, Kepler orbits and an RLC circuit with its mechanical analogue.

It's a static site: plain HTML, CSS and JavaScript with no build step and no dependencies.

## Deploy to Vercel

**From the CLI**

```bash
npx vercel          # preview deployment
npx vercel --prod   # production
```

**From Git:** push this folder to a GitHub, GitLab or Bitbucket repo and import it in Vercel. `vercel.json` already sets the framework preset to *Other* and the output directory to `public`, so you don't need to change any build settings.

After the first production deploy, change the `og:image` tag in `public/index.html` to the absolute URL, for example `https://your-domain.com/og.png`. Some link-preview crawlers ignore relative image paths.

## Run locally

```bash
npm run dev         # serves public/ on http://localhost:3000
```

Any static file server works. Opening `index.html` straight from disk also works, apart from the absolute `/assets/...` paths, so use a server.

## Layout

```
public/
  index.html               markup and head metadata
  404.html                 served by Vercel for unknown paths
  assets/css/styles.css    design tokens, light and blueprint themes, layout
  assets/css/fonts.css     self-hosted STIX Two Text and Barlow Semi Condensed
  assets/fonts/            woff2 files: latin, latin-ext, greek subsets
  assets/js/mathjax-config.js
  assets/js/core.js        RK4, trace buffers, the drawing kit (springs, dampers,
                           hatching, dimensions…), the Plate controller and UI
  assets/js/plates-1.js    plates I–IV
  assets/js/plates-2.js    plates V–VIII
  assets/js/plates-3.js    plates IX–XII
  assets/js/main.js        page assembly, render loop, theme, hero title
  og.png, favicon.svg, icons, site.webmanifest, robots.txt
vercel.json                headers (CSP and others), clean URLs, output dir
```

Scripts are classic (not modules) and load in order, sharing globals.

## Adding or editing a plate

Each plate is one `DEFS.push({...})` object in a `plates-*.js` file. It has these parts:

- **Copy:** `title`, `theme`, `essay`, `eqs` (TeX), `tryit` and `caption`.
- **Shape:** `aspect`, with `d` for desktop and `m` for mobile.
- **Controls:** `params` (sliders or toggles) and `actions` (buttons).
- **`create(P)`:** returns the simulation itself:
  - `h`: fixed step, in seconds.
  - `step(h)`: advance one fixed step.
  - `advance(dt)`: alternative to `step` for adaptive stepping.
  - `reset()`
  - `draw(g)`: `g` is the drawing kit in `core.js`, in world units with y up.
  - `live()`: returns the TeX string for the strip under the figure.
  - `tap(x, y)`: optional.

## Notes

- **Equations:** typeset by MathJax 3.2.2, pinned and loaded from jsDelivr. If it fails to load, the page shows raw TeX instead.
- **Content-Security-Policy:**
  - Scripts may come only from this origin and `cdn.jsdelivr.net`.
  - Fonts are same-origin.
  - `style-src` needs `'unsafe-inline'` because MathJax injects a stylesheet.
  - If you add analytics or another CDN, extend the policy in `vercel.json`.
- **Theme:** follows the system light/dark setting until the visitor picks one; the choice is saved in `localStorage`.
- **Performance:** plates only run while on screen. On phones the canvas resolution is capped at 2× to save battery.
- **Reduced motion:** visitors with it turned on get every plate paused at the start and the title already hatched.
