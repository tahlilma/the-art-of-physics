/* The Art of Physics. Static build; see README.md. */
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  svg: { fontCache: 'local' },
  options: { enableMenu: false },
  startup: {
    typeset: false,
    ready() { MathJax.startup.defaultReady(); MathJax.startup.promise.then(() => document.dispatchEvent(new Event('mathjax-ready'))); }
  }
};
