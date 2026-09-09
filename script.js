(() => {
  'use strict';
  const year = document.getElementById('copyright-year');
  if (year) year.textContent = String(new Date().getFullYear());
  const header = document.querySelector('.profile-sidebar');
  const mobile = window.matchMedia('(max-width: 740px)');
  const menu = document.querySelector('.mobile-menu');
  const syncHeader = () => {
    const offset = mobile.matches && header ? header.getBoundingClientRect().height + 16 : 30;
    document.documentElement.style.setProperty('--header-offset', offset + 'px');
    if (!mobile.matches && menu) menu.open = false;
  };
  if (header && 'ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);
  if (mobile.addEventListener) mobile.addEventListener('change', syncHeader);
  syncHeader();
  if (menu) {
    menu.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        menu.open = false;
        const target = document.querySelector(link.hash);
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    menu.addEventListener('focusout', event => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
    });
  }
  const legacy = { '#profile': '#about', '#projects': '#work' };
  const restoreSection = () => {
    const next = legacy[window.location.hash];
    if (next) document.querySelector(next)?.scrollIntoView();
  };
  restoreSection();
  window.addEventListener('hashchange', restoreSection);
  const links = Array.from(document.querySelectorAll('.desktop-nav a'));
  const sections = links.map(link => document.querySelector(link.hash)).filter(Boolean);
  let scheduled = false;
  const syncNavigation = () => {
    let current;
    const threshold = mobile.matches && header ? header.getBoundingClientRect().height + 80 : 160;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= threshold) current = section.id; });
    links.forEach(link => {
      if (current && link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(syncNavigation); }
  }, { passive: true });
  window.addEventListener('resize', syncNavigation, { passive: true });
  syncNavigation();
})();
