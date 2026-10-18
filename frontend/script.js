(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => [...c.querySelectorAll(s)];
  const nav = document.querySelector('.nav');
  const bar = document.querySelector('.nav-progress');
  const toggle = document.querySelector('.nav-toggle');

  /* Nav: solid state + reading-progress line */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      nav.classList.toggle('scrolled', scrollY > 40);
      bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  const closeMenu = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
  });
  $('.nav-links a').forEach(a => a.addEventListener('click', closeMenu));

  /* Scrollspy: highlight the link for the chapter in view */
  const spyMap = { how: 'about', currency: 'about', shops: 'shops', rules: 'rules', invitation: 'invitation', gathering: 'invitation' };
  const links = new Map($('.nav-links a:not(.btn)').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(l => l.classList.remove('active'));
    if (!e.target.classList.contains('hero')) links.get(spyMap[e.target.id])?.classList.add('active');
  }), { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(spyMap).forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });
  spy.observe(document.querySelector('.hero'));

  /* Castle zone: the hero artwork is hero.png (1672x941) shown with background-size: cover.
     ZONES are rectangles over the castle, town and hills in image pixels: [x0, y0, x1, y1]. */
  const hero = document.querySelector('.hero');
  const IMG_W = 1672, IMG_H = 941;
  const ZONES = [[1140, 300, 1672, 560], [920, 560, 1672, 880], [440, 570, 1100, 800]];
  const castleAt = (cx, cy) => {
    const r = hero.getBoundingClientRect();
    if (cy < r.top || cy > r.bottom) return null;
    const s = Math.max(r.width / IMG_W, r.height / IMG_H);
    const px = cx - r.left, py = cy - r.top;
    const ix = (px - (r.width - IMG_W * s) / 2) / s, iy = (py - (r.height - IMG_H * s) / 2) / s;
    return ZONES.some(([x0, y0, x1, y1]) => ix >= x0 && ix <= x1 && iy >= y0 && iy <= y1) ? { x: px, y: py } : null;
  };

  if (matchMedia('(pointer: fine)').matches) {
    /* Gold parts of the castle glow around the cursor */
    addEventListener('pointermove', e => {
      const hit = castleAt(e.clientX, e.clientY);
      hero.classList.toggle('castle-hover', !!hit);
      if (hit) { hero.style.setProperty('--mx', hit.x + 'px'); hero.style.setProperty('--my', hit.y + 'px'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => hero.classList.remove('castle-hover'));
  }

  /* Golden footprints follow the cursor, then fade, and stay put on the page as it scrolls.
     They only appear on the background: never over text, the nav, the castle, boxes, buttons or gold ornaments. */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    let lx = null, ly = null, left = false;
    const layer = document.createElement('div');   /* spans the whole page so footprints scroll with it */
    layer.className = 'footprint-layer';
    document.body.appendChild(layer);
    /* true when the point sits on (or within 6px of) rendered text */
    const overText = (x, y) => {
      for (const el of document.elementsFromPoint(x, y)) {
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
          const r = document.createRange();
          r.selectNodeContents(n);
          for (const b of r.getClientRects()) {
            if (x >= b.left - 6 && x <= b.right + 6 && y >= b.top - 6 && y <= b.bottom + 6) return true;
          }
        }
      }
      return false;
    };
    const SKIP = 'a, button, .nav, .panel, .scroll-card, .divider, .flourish, .coin, .section-label, .numeral, .shop-currency, .tentative, .brand, .hero-content p span';
    document.addEventListener('mouseleave', () => { lx = null; });
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (lx === null) { lx = e.clientX; ly = e.clientY; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly;
      if (Math.hypot(dx, dy) < 48) return;
      lx = e.clientX; ly = e.clientY;
      if ((e.target.closest && e.target.closest(SKIP)) || castleAt(e.clientX, e.clientY) || overText(e.clientX, e.clientY)) return;
      if (layer.childElementCount > 40) return;
      left = !left;
      const rad = Math.atan2(dy, dx), side = left ? -9 : 9;
      const x = e.pageX - Math.sin(rad) * side, y = e.pageY + Math.cos(rad) * side;
      const el = document.createElement('div');
      el.className = 'footprint';
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rad * 180 / Math.PI + 90}deg) scaleX(${left ? -1 : 1}) translate(-50%, -50%)`;
      el.addEventListener('animationend', () => el.remove());
      layer.style.height = document.documentElement.scrollHeight + 'px';
      layer.appendChild(el);
    }, { passive: true });
  }

  if (reduce) return;

  /* Reveal on scroll: panels rise, scrolls unroll, seal stamps, 600 counts up */
  const num = document.querySelector('.invite-number');
  const target = num ? +num.textContent : 0;
  if (num) num.textContent = '0';
  const countUp = () => {
    const t0 = performance.now() + 500;
    const step = t => {
      const k = Math.max(0, Math.min((t - t0) / 1400, 1));
      num.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const items = $('.section-heading, .chapter-head, .panel, .scroll-card, .cta, .fine-print');
  items.forEach(el => {
    el.classList.add('reveal');
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', sibs.indexOf(el) * 130 + 'ms');
  });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (num && e.target.contains(num)) countUp();
    io.unobserve(e.target);
  }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => io.observe(el));

  /* Hero embers: slow golden motes drifting upward */
  const cv = document.getElementById('embers');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, motes = [], visible = true;
  const spawn = any => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 10, r: 0.6 + Math.random() * 1.5, v: 0.15 + Math.random() * 0.35, p: Math.random() * 6.28, s: 0.4 + Math.random() * 0.8 });
  const size = () => {
    const D = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * D; cv.height = H * D;
    ctx.setTransform(D, 0, 0, D, 0, 0);
    motes = Array.from({ length: Math.round(W / 40) }, () => spawn(true));
  };
  const draw = t => {
    requestAnimationFrame(draw);
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.y -= m.v;
      m.x += Math.sin(t / 1800 * m.s + m.p) * 0.25;
      if (m.y < -10) Object.assign(m, spawn(false));
      const a = (0.25 + 0.45 * Math.abs(Math.sin(t / 900 * m.s + m.p))) * Math.min(1, m.y / 140);
      ctx.fillStyle = `rgba(224,184,112,${a * 0.14})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(236,200,130,${a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
    }
  };
  size();
  addEventListener('resize', size);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
  requestAnimationFrame(draw);
})();
