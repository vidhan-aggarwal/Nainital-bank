/**
 * Nainital Bank — homepage interactions (carousel, menu, theme, a11y widget)
 * Used by: index.html
 */
(function () {
  'use strict';

  function ensureSlideLoaded(slide) {
    if (!slide || slide.dataset.nbLoaded) return;
    if (slide.dataset.nbSrc) slide.src = slide.dataset.nbSrc;
    if (slide.dataset.nbSrcset) slide.srcset = slide.dataset.nbSrcset;
    if (slide.dataset.nbSizes) slide.sizes = slide.dataset.nbSizes;
    slide.dataset.nbLoaded = '1';
  }

  const carouselEl = document.querySelector('.hero-carousel');
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const dots = Array.from(document.querySelectorAll('.carousel-dots .dot'));
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  let current = 0;

  if (slides.length) {
    const intervalMs = 4000;
    let timer = null;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function show(index) {
      index = (index + slides.length) % slides.length;
      ensureSlideLoaded(slides[index]);
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.forEach((d, i) => {
        const on = i === index;
        d.classList.toggle('active', on);
        d.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      current = index;
    }

    function next() { show(current + 1); }
    function prev() { show(current - 1); }

    function start() { stop(); timer = setInterval(next, intervalMs); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function reset() { if (!prefersReducedMotion) start(); }

    prevBtn && prevBtn.addEventListener('click', () => { prev(); reset(); });
    nextBtn && nextBtn.addEventListener('click', () => { next(); reset(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); reset(); }));

    if (carouselEl) {
      carouselEl.addEventListener('mouseenter', stop);
      carouselEl.addEventListener('mouseleave', () => {
        if (!prefersReducedMotion) start();
      });
    }

    let touchStartX = 0;
    const touchThreshold = 40;
    carouselEl && carouselEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stop();
    }, { passive: true });
    carouselEl && carouselEl.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(dx) > touchThreshold) dx < 0 ? next() : prev();
      reset();
    }, { passive: true });

    show(0);
    if (!prefersReducedMotion) start();
  }

  (function initUpdatesTicker() {
    const wrap = document.querySelector('.ticker-wrap');
    const content = document.querySelector('#updates-ticker .ticker-content');
    if (!wrap || !content) return;

    wrap.classList.add('is-js-ticker');

    const pauseBtn = document.getElementById('ticker-pause');
    const prevBtn = document.getElementById('ticker-prev');
    const nextBtn = document.getElementById('ticker-next');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speedPxPerSec = reducedMotion ? 32 : 52;
    let loopWidth = 0;
    let offset = 0;
    let paused = false;
    let lastTs = 0;
    let rafId = 0;
    let running = false;

    function measureLoop() {
      const items = content.querySelectorAll('.ticker-item');
      const half = Math.ceil(items.length / 2);
      if (half <= 0 || !items[half]) {
        loopWidth = content.scrollWidth / 2;
        return;
      }
      let w = 0;
      const gap = parseFloat(getComputedStyle(content).gap) || 48;
      for (let i = 0; i < half; i++) {
        w += items[i].offsetWidth + (i < half - 1 ? gap : 0);
      }
      loopWidth = w > 0 ? w : content.scrollWidth / 2;
    }

    function normalizeOffset() {
      if (loopWidth <= 0) return;
      while (offset <= -loopWidth) offset += loopWidth;
      while (offset > 0) offset -= loopWidth;
    }

    function applyTransform() {
      content.style.transform = 'translate3d(' + offset.toFixed(2) + 'px,0,0)';
    }

    function setPaused(on) {
      paused = on;
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', on ? 'Play' : 'Pause');
      pauseBtn.innerHTML = on ? '&#9654;' : '&#10074;&#10074;';
    }

    function nudge(direction) {
      const items = content.querySelectorAll('.ticker-item');
      const step = items[0] ? items[0].offsetWidth + (parseFloat(getComputedStyle(content).gap) || 48) : 240;
      offset += direction * step;
      normalizeOffset();
      applyTransform();
    }

    function startLoop() {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function tick(ts) {
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (!paused && !document.hidden && loopWidth > 0) {
        offset -= speedPxPerSec * dt;
        normalizeOffset();
        applyTransform();
      }
      rafId = requestAnimationFrame(tick);
    }

    measureLoop();
    applyTransform();
    startLoop();

    pauseBtn && pauseBtn.addEventListener('click', function () {
      const next = !paused;
      setPaused(next);
    });

    prevBtn && prevBtn.addEventListener('click', function () {
      setPaused(true);
      nudge(1);
    });

    nextBtn && nextBtn.addEventListener('click', function () {
      setPaused(true);
      nudge(-1);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop();
      else if (!paused) startLoop();
    });

    window.addEventListener('resize', function () {
      measureLoop();
      normalizeOffset();
      applyTransform();
    });

    document.addEventListener('nb-lang-change', function () {
      requestAnimationFrame(function () {
        measureLoop();
        normalizeOffset();
        applyTransform();
      });
    });
  })();

  const counters = Array.from(document.querySelectorAll('.stats-number[data-target]'));
  function animateCounter(el, target, duration = 4500) {
    const start = performance.now();
    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
    function tick(now) {
      const raw = Math.min((now - start) / duration, 1);
      const progress = easeOutQuart(raw);
      const value = progress * target;
      let text = '';
      if (target >= 1000000) {
        if (raw < 1) text = (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        else text = (target / 1000000 % 1 === 0 ? (target / 1000000).toFixed(0) : (target / 1000000).toFixed(1)) + 'M+';
      } else if (target >= 1000) {
        if (raw < 1) text = (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        else text = Math.round(target).toLocaleString() + '+';
      } else {
        text = raw < 1 ? Math.round(value).toLocaleString() : target.toLocaleString() + '+';
      }
      el.textContent = text;
      if (raw < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const statsSection = document.querySelector('.stats-section');
  if (statsSection) {
    const statsObs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        statsSection.classList.add('stats-bg-loaded');
        if (counters.length) {
          counters.forEach((c) => animateCounter(c, Number(c.getAttribute('data-target'))));
        }
        observer.disconnect();
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    statsObs.observe(statsSection);
  }

  (function () {
    const headerEl = document.querySelector('.site-header');
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mqCloseWidth = 480;
    if (!mobileBtn || !headerEl) return;
    mobileBtn.addEventListener('click', () => {
      const open = headerEl.classList.toggle('nav-open');
      mobileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > mqCloseWidth && headerEl.classList.contains('nav-open')) {
          headerEl.classList.remove('nav-open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        }
      }, 120);
    }, { passive: true });
  })();

  const MIN_SCALE = 0.85;
  const MAX_SCALE = 1.35;
  const STEP = 0.05;
  const FONT_SELECTOR = 'main p, main h1, main h2, main h3, main h4, main h5, main h6, main li, main a, main span, main label, main button, main summary, main .deposits-block-title, main .deposits-subtitle, main .deposits-quick-label, main .deposits-quick-value, .site-header a, .site-header p, .site-header h1, .site-header span, .site-header button, .site-footer p, .site-footer a, .site-footer h3';
  let fontScale = parseFloat(localStorage.getItem('nainital-font-scale')) || 1;
  const baseFontSizes = new Map();

  function initFontScale() {
    document.querySelectorAll(FONT_SELECTOR).forEach((el) => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!isNaN(px)) baseFontSizes.set(el, px);
    });
    applyFontScale();
  }

  function applyFontScale() {
    document.documentElement.style.setProperty('--nb-font-scale', String(fontScale));
    localStorage.setItem('nainital-font-scale', String(fontScale));
    document.querySelectorAll(FONT_SELECTOR).forEach((el) => {
      const base = baseFontSizes.get(el);
      if (base) el.style.fontSize = (base * fontScale) + 'px';
    });
  }

  window.nbRegisterFontElements = function (root) {
    const scope = root || document;
    scope.querySelectorAll(FONT_SELECTOR).forEach((el) => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!isNaN(px)) baseFontSizes.set(el, px);
    });
    applyFontScale();
  };

  const dec = document.getElementById('nb-font-decrease');
  const inc = document.getElementById('nb-font-increase');
  const resetBtn = document.getElementById('nb-font-reset');

  function stop(e) { e.preventDefault(); e.stopPropagation(); }

  dec && dec.addEventListener('click', (e) => {
    stop(e);
    fontScale = Math.max(MIN_SCALE, +(fontScale - STEP).toFixed(2));
    applyFontScale();
  });
  inc && inc.addEventListener('click', (e) => {
    stop(e);
    fontScale = Math.min(MAX_SCALE, +(fontScale + STEP).toFixed(2));
    applyFontScale();
  });
  resetBtn && resetBtn.addEventListener('click', (e) => {
    stop(e);
    fontScale = 1;
    applyFontScale();
  });

  if ('requestIdleCallback' in window) {
    requestIdleCallback(initFontScale, { timeout: 2000 });
  } else {
    window.addEventListener('load', initFontScale);
  }

  const themeToggle = document.getElementById('nb-theme-toggle');
  if (themeToggle) {
    const storedTheme = localStorage.getItem('nainital-dark-mode') === 'true';
    themeToggle.checked = storedTheme;
    const applyTheme = () => {
      const on = themeToggle.checked;
      document.body.classList.toggle('nb-dark-mode', on);
      document.body.classList.toggle('dark-mode', on);
      localStorage.setItem('nainital-dark-mode', String(on));
    };
    themeToggle.addEventListener('change', (e) => { e.stopPropagation(); applyTheme(); });
    themeToggle.addEventListener('click', (e) => e.stopPropagation());
    applyTheme();
  }

  const langSelect = document.getElementById('nb-language');
  if (langSelect && window.NB_I18N) {
    const savedLang = localStorage.getItem('nainital-lang') || 'en';
    langSelect.value = savedLang;
    NB_I18N.apply(savedLang);
    langSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const lang = langSelect.value === 'hi' ? 'hi' : 'en';
      NB_I18N.apply(lang);
      document.dispatchEvent(new CustomEvent('nb-lang-change', { detail: { lang: lang } }));
    });
    langSelect.addEventListener('click', (e) => e.stopPropagation());
  }

  const A11Y_WIDGET_SRC = 'https://cdn.ux4g.gov.in/accessibility-beta-v1.15/accessibility-widget.js';
  const A11Y_WIDGET_CSS = 'https://cdn.ux4g.gov.in/accessibility-beta-v1.15/accessibility-widget.css';
  let a11yWidgetPromise = null;
  let a11yPanelOpen = false;

  function loadA11yCss() {
    if (document.querySelector('link[data-nb-a11y-css]')) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = A11Y_WIDGET_CSS;
      link.dataset.nbA11yCss = '1';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  /** UX4G registers feature handlers on DOMContentLoaded; lazy load runs after that event. */
  function initA11yWidgetDom() {
    if (window.__nbA11yDomReady) return;
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    window.__nbA11yDomReady = true;
    document.querySelectorAll('.uwaw-close').forEach((btn) => {
      btn.addEventListener('click', () => setA11yPanelOpen(false), { capture: true });
    });
  }

  function waitForA11yWidget() {
    const panel = document.getElementById('uw-main');
    if (panel) return Promise.resolve(panel);
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const el = document.getElementById('uw-main');
        if (!el) return;
        observer.disconnect();
        resolve(el);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(document.getElementById('uw-main'));
      }, 5000);
    });
  }

  function loadA11yWidgetScript() {
    const existing = document.querySelector('script[data-nb-a11y-widget]');
    if (existing) {
      if (existing.dataset.nbLoaded === '1') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => {
          existing.dataset.nbLoaded = '1';
          resolve();
        }, { once: true });
        existing.addEventListener('error', () => reject(new Error('a11y widget failed')), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = A11Y_WIDGET_SRC;
      script.defer = true;
      script.dataset.nbA11yWidget = '1';
      script.onload = () => {
        script.dataset.nbLoaded = '1';
        resolve();
      };
      script.onerror = () => reject(new Error('a11y widget failed'));
      document.body.appendChild(script);
    });
  }

  function loadA11yWidget() {
    if (a11yWidgetPromise) return a11yWidgetPromise;
    a11yWidgetPromise = loadA11yCss()
      .then(loadA11yWidgetScript)
      .then(() => {
        initA11yWidgetDom();
        return waitForA11yWidget();
      })
      .catch((err) => {
        a11yWidgetPromise = null;
        throw err;
      });
    return a11yWidgetPromise;
  }

  function setA11yPanelOpen(open) {
    const panel = document.getElementById('uw-main');
    const trigger = document.getElementById('uw-widget-custom-trigger');
    const fab = document.getElementById('nb-open-a11y');
    if (!panel) return;
    panel.style.right = open ? '0' : '-530px';
    a11yPanelOpen = open;
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (fab) {
      fab.setAttribute('aria-expanded', open ? 'true' : 'false');
      fab.classList.toggle('nb-a11y-fab-active', open);
    }
  }

  function toggleA11yWidget() {
    return loadA11yWidget().then((panel) => {
      if (!panel) return;
      setA11yPanelOpen(!a11yPanelOpen);
    });
  }

  const a11yFab = document.getElementById('nb-open-a11y');
  if (a11yFab) {
    a11yFab.addEventListener('click', () => {
      toggleA11yWidget().catch(() => {});
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && a11yPanelOpen) setA11yPanelOpen(false);
    });
  }
})();
