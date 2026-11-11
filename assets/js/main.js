/* Site interactions: nav, reveal-on-scroll, counters, skill rows, copy email */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav: solid background once scrolled ---------- */
  const nav = $('#nav');
  let ticking = false;
  const onScroll = () => { nav.classList.toggle('is-scrolled', window.scrollY > 40); ticking = false; };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $('#burger');
  const links = $('#navLinks');
  const closeMenu = () => { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('a', links).forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) closeMenu(); });

  /* ---------- Active nav link ---------- */
  const navMap = new Map($$('a', links).map(a => [a.getAttribute('href').slice(1), a]));
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navMap.forEach(a => a.classList.remove('is-active'));
      navMap.get(en.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navMap.forEach((_, id) => { const s = document.getElementById(id); if (s) sectionObs.observe(s); });

  /* ---------- Count-up numbers ---------- */
  const countUp = el => {
    const target = +el.dataset.count;
    const fmt = n => (el.dataset.prefix || '') + n.toLocaleString('en-IN') + (el.dataset.suffix || '');
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1100;
    const step = t => {
      const p = Math.max(0, Math.min(1, (t - t0) / dur));
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Reveal on scroll ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      $$('[data-count]', en.target).forEach(countUp);
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const idx = sibs.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 6) * 70}ms`;
    revealObs.observe(el);
  });

  /* ---------- Skill row: arrow buttons, keyboard, tap-to-expand ---------- */
  $$('.row-btn').forEach(btn => {
    const row = document.getElementById(btn.dataset.row);
    btn.addEventListener('click', () => {
      row.scrollBy({ left: +btn.dataset.dir * row.clientWidth * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
  const syncRowBtns = row => {
    const max = row.scrollWidth - row.clientWidth - 2;
    $$(`.row-btn[data-row="${row.id}"]`).forEach(b => {
      b.disabled = +b.dataset.dir < 0 ? row.scrollLeft <= 2 : row.scrollLeft >= max;
    });
  };
  $$('.row').forEach(row => {
    row.addEventListener('scroll', () => syncRowBtns(row), { passive: true });
    window.addEventListener('resize', () => syncRowBtns(row));
    syncRowBtns(row);
    row.addEventListener('keydown', e => {
      if (e.target !== row) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        row.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * 280 });
      }
    });
  });
  const tiles = $$('.tile');
  tiles.forEach(tile => tile.addEventListener('click', () => {
    const open = !tile.classList.contains('is-open');
    tiles.forEach(t => t.classList.remove('is-open'));
    tile.classList.toggle('is-open', open);
  }));

  /* ---------- Copy email + toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-show'), 2200);
  };
  $('#copyEmail').addEventListener('click', async e => {
    const email = e.currentTarget.dataset.email;
    try { await navigator.clipboard.writeText(email); showToast('Email copied to clipboard ✓'); }
    catch { showToast(email); }
  });

  $('#year').textContent = new Date().getFullYear();
})();
