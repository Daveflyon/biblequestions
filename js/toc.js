(function () {
    var btn = document.getElementById('toc-btn');
    var menu = document.getElementById('toc-menu');
    var box = document.querySelector('.toc-container');
    function close() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      btn.setAttribute('aria-expanded', String(menu.classList.toggle('open')));
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { close(); btn.focus(); }
    });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (link.getAttribute('href') === '#') {
          e.preventDefault();
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        }
        close();
      });
    });
  })();
