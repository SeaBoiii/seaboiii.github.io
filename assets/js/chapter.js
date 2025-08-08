(function() {
  const prev = document.querySelector('a.prev');
  const next = document.querySelector('a.next');

  // Arrow-key navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && prev) { location.href = prev.href; }
    if (e.key === 'ArrowRight' && next) { location.href = next.href; }
  });

  // Save/restore scroll position
  const key = 'scroll:' + location.pathname;
  const y = sessionStorage.getItem(key);
  if (y) window.scrollTo(0, +y);
  window.addEventListener('beforeunload', () => sessionStorage.setItem(key, String(window.scrollY)));

  // Reading progress bar
  const bar = document.createElement('div');
  bar.id = 'progress';
  document.body.appendChild(bar);
  document.addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = p + '%';
  });
})();
