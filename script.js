/* Plain JavaScript. No build step, dependencies, trackers, or remote APIs. */
(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = $('#header');
  const progress = $('.scroll-progress');
  const botanical = $('.botanical');
  const intro = $('.intro');
  const menu = $('#mobile-nav');
  const menuButton = $('.menu-toggle');
  let introTimer, introRemovalTimer;

  // Intro runs once per page load. Skipped for anchor deep links or reduced motion.
  function closeIntro() {
    clearTimeout(introTimer);
    intro.classList.add('leaving');
    $('.intro-skip').tabIndex = -1;
    intro.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    introRemovalTimer = setTimeout(() => intro.classList.remove('show'), 900);
  }
  if (!reducedMotion.matches && !location.hash) {
    intro.classList.add('show');
    intro.setAttribute('aria-hidden', 'false');
    $('.intro-skip').tabIndex = 0;
    document.body.classList.add('locked');
    introTimer = setTimeout(closeIntro, 1700);
  }
  $('.intro-skip').addEventListener('click', closeIntro);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && intro.classList.contains('show')) closeIntro();
  });

  // Reveals progressively enhance the page; all content is visible without JS.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    $$('.reveal').forEach(element => revealObserver.observe(element));
  }

  // Native scrolling + CSS fixed positioning. rAF keeps scroll work bounded.
  let scrollPending = false;
  function updateScroll() {
    const y = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('scrolled', y > 45);
    progress.style.transform = `scaleX(${total > 0 ? Math.min(1, y / total) : 0})`;
    if (botanical && !reducedMotion.matches && y < window.innerHeight * 1.4) {
      botanical.style.transform = `translateY(${y * 0.08}px) rotate(${y * 0.004}deg)`;
    }
    const current = $$('.section-track').filter(section => section.getBoundingClientRect().top <= 150).pop();
    if (current) {
      $$('.desktop-nav a, .mobile-nav a').forEach(link => {
        const active = link.hash === `#${current.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();

  function setMenu(open) {
    menu.classList.toggle('open', open);
    menu.inert = !open;
    header.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('locked', open);
    if (open) $('a', menu).focus();
  }
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuButton.focus(); }
    if (event.key === 'Tab' && menu.classList.contains('open')) {
      const links = $$('a', menu);
      if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); menuButton.focus(); }
      else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); menuButton.focus(); }
      else if (document.activeElement === menuButton) { event.preventDefault(); (event.shiftKey ? links.at(-1) : links[0]).focus(); }
    }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  // Keyboard-enabled tab controls shared by the logo and journal.
  function setupTabs(list, activate) {
    const tabs = $$('[role="tab"]', list);
    function select(tab) {
      tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
      activate(tab);
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft') target = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === 'Home') target = tabs[0];
        if (event.key === 'End') target = tabs.at(-1);
        if (target) { event.preventDefault(); select(target); target.focus(); }
      });
    });
  }
  const logoParts = {
    whole: { file: 'symbol.png', number: 'THREE IDEAS / ONE IDENTITY', title: 'A story in\nthe spaces between.', description: 'The leaf speaks of nature and gentle care. The face celebrates natural beauty. The sun carries the meaning of Komorebi: sunlight passing through leaves.' },
    leaf: { file: 'leaf.png', number: '01 / THE LEAF', title: 'Rooted in\ngentle care.', description: 'A natural form that speaks of growth and gentle care. Its curve flows into the face, joining nature and beauty without drawing a hard boundary.' },
    face: { file: 'face.png', number: '02 / THE FACE', title: 'Beauty that is\nalready yours.', description: 'A human profile appears in negative space. It celebrates natural beauty: caring for who you already are, rather than becoming someone else.' },
    sun: { file: 'sun.png', number: '03 / THE SUN', title: 'A little light,\nfinding its way.', description: 'The circular sun holds the meaning of Komorebi. Open lines suggest filtered sunlight, with incomplete forms that the eye naturally brings together.' }
  };
  let logoTimer;
  setupTabs($('.symbol-tabs'), tab => {
    const part = logoParts[tab.dataset.part];
    const img = $('#symbol-image');
    clearTimeout(logoTimer);
    img.classList.add('changing');
    logoTimer = setTimeout(() => {
      img.src = `assets/brand/${part.file}`;
      img.alt = tab.dataset.part === 'whole' ? 'Komorebi primary symbol' : `Komorebi logo detail: ${tab.textContent}`;
      $('#part-number').textContent = part.number;
      $('#part-title').textContent = part.title;
      $('#part-title').style.whiteSpace = 'pre-line';
      $('#part-description').textContent = part.description;
      $('#symbol-panel').setAttribute('aria-labelledby', tab.id);
      img.classList.remove('changing');
    }, reducedMotion.matches ? 0 : 160);
  });
  setupTabs($('.post-tabs'), tab => {
    $$('.post-panel').forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    updateScroll();
  });

  // Color swatches: secure-context clipboard, with a selectable fallback.
  let toastTimer;
  function notify(message) {
    const toast = $('.toast');
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  $$('[data-color]').forEach(button => button.addEventListener('click', async () => {
    const color = button.dataset.color;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(color);
      notify(`${color} copied. A little color to keep.`);
    } catch { notify(`Your color: ${color}`); }
  }));

  const dialog = $('.artwork-dialog');
  let artworkTrigger;
  $$('[data-artwork]').forEach(button => button.addEventListener('click', () => {
    artworkTrigger = button;
    $('#dialog-image').src = button.dataset.artwork;
    $('#dialog-image').alt = $('img', button).alt;
    $('#dialog-title').textContent = button.dataset.title;
    dialog.showModal();
    document.body.classList.add('locked');
  }));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.classList.remove('locked'); artworkTrigger?.focus(); });
  $('#year').textContent = new Date().getFullYear();
  reducedMotion.addEventListener('change', event => {
    if (event.matches) { clearTimeout(introRemovalTimer); closeIntro(); document.documentElement.classList.remove('motion-ready'); }
  });
})();
