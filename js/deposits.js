/**
 * Naini Deposits hub — preload, deep links, scroll, i18n sync
 * Panel visibility: CSS (:checked + #panel-*). JS does not use [hidden].
 */
(function () {
  'use strict';

  if (!document.body.classList.contains('deposits-hub-page')) return;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const PANEL_BY_RADIO = {
    'dep-regular': 'panel-regular',
    'dep-small': 'panel-small',
    'dep-nofrill': 'panel-nofrill',
    'dep-pmjdy': 'panel-pmjdy',
    'dep-mahila': 'panel-mahila',
    'dep-champ': 'panel-champ',
    'dep-salary': 'panel-salary',
    'dep-platinum': 'panel-platinum'
  };

  const RADIO_BY_PANEL = Object.fromEntries(
    Object.entries(PANEL_BY_RADIO).map(([radio, panel]) => [panel, radio])
  );

  const heroImages = Array.from(document.querySelectorAll('.deposits-account-hero-visual img'));
  const allPanels = Array.from(document.querySelectorAll('.deposits-account-panel'));

  function currentLang() {
    const select = document.getElementById('nb-language');
    if (select && select.value) return select.value === 'hi' ? 'hi' : 'en';
    const saved = localStorage.getItem('nainital-lang');
    return saved === 'hi' ? 'hi' : 'en';
  }

  function applyDepositsLanguage() {
    if (window.NB_I18N && typeof window.NB_I18N.apply === 'function') {
      window.NB_I18N.apply(currentLang());
    }
  }

  function markActivePanel(panelId, options) {
    const opts = options || {};
    const panel = document.getElementById(panelId);
    if (!panel) return null;

    allPanels.forEach((p) => {
      p.classList.remove('is-active', 'deposits-panel-enter');
    });

    panel.classList.add('is-active');
    if (opts.animate !== false) {
      panel.classList.add('deposits-panel-enter');
    }

    const img = panel.querySelector('.deposits-account-hero-visual img');
    if (img && img.decode) img.decode().catch(function () {});

    if (typeof window.nbRegisterFontElements === 'function') {
      window.nbRegisterFontElements(panel);
    }

    return panel;
  }

  function scrollPageToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  function scrollToAccountTop(panel) {
    if (!panel) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.querySelector('.site-header');
    const anchor = panel.querySelector('.deposits-account-hero') || panel;
    const offset = header ? header.offsetHeight + 8 : 8;
    const top = Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
  }

  function syncHashForPanel(panelId, useReplace) {
    const hash = '#' + panelId;
    const url = window.location.pathname + window.location.search + hash;
    if (useReplace) {
      history.replaceState(null, '', url);
    } else if (window.location.hash !== hash) {
      history.pushState(null, '', url);
    }
  }

  function syncFromRadio(radio, options) {
    if (!radio || !radio.checked) return;
    const panelId = PANEL_BY_RADIO[radio.id];
    if (!panelId) return;

    const opts = options || {};
    const panel = markActivePanel(panelId, { animate: opts.animate !== false });

    if (opts.updateHash) {
      syncHashForPanel(panelId, true);
    }

    applyDepositsLanguage();

    if (opts.scroll === 'account') {
      scrollToAccountTop(panel);
    } else if (opts.scroll === 'top') {
      scrollPageToTop();
    }

    return panel;
  }

  function syncFromHash(scrollMode) {
    const hash = window.location.hash;
    if (!hash || hash.indexOf('#panel-') !== 0) return false;
    const panelId = hash.slice(1);
    const radioId = RADIO_BY_PANEL[panelId];
    if (!radioId) return false;
    const radio = document.getElementById(radioId);
    if (!radio) return false;
    radio.checked = true;
    syncFromRadio(radio, {
      updateHash: false,
      animate: false,
      scroll: scrollMode || false
    });
    return true;
  }

  function preloadImages() {
    const seen = new Set();
    heroImages.forEach((img) => {
      const src = img.getAttribute('src');
      if (!src || seen.has(src)) return;
      seen.add(src);
      img.loading = 'eager';
      img.decoding = 'async';
      const preloader = new Image();
      preloader.src = src;
      if (img.decode) img.decode().catch(function () {});
    });
  }

  const radios = Array.from(document.querySelectorAll('input.deposits-radio'));
  radios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      syncFromRadio(radio, { updateHash: true, animate: true, scroll: 'account' });
    });
  });

  window.addEventListener('hashchange', function () {
    syncFromHash(false);
  });

  document.addEventListener('nb-lang-change', applyDepositsLanguage);

  function boot() {
    preloadImages();

    if (window.NB_DEPOSITS_I18N && typeof window.NB_DEPOSITS_I18N.captureDefaults === 'function') {
      window.NB_DEPOSITS_I18N.captureDefaults();
    } else if (window.NB_I18N && typeof window.NB_I18N.captureDefaults === 'function') {
      window.NB_I18N.captureDefaults();
    }

    const hadHash = syncFromHash(false);
    const checked = document.querySelector('input.deposits-radio:checked') || document.getElementById('dep-regular');

    if (!hadHash && checked) {
      checked.checked = true;
      syncFromRadio(checked, { updateHash: false, animate: false, scroll: false });
    }

    scrollPageToTop();

    requestAnimationFrame(function () {
      scrollPageToTop();
      applyDepositsLanguage();
    });

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadImages, { timeout: 3000 });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
