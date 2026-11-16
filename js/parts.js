(function () {
    function setOpen(btn, open) {
      var body = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { body.removeAttribute('hidden'); } else { body.setAttribute('hidden', ''); }
    }
    function btnFor(id) { return document.querySelector('.part-btn[aria-controls="' + id + '-body"]'); }
    document.querySelectorAll('.part-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setOpen(btn, btn.getAttribute('aria-expanded') !== 'true'); });
    });
    document.querySelectorAll('.minimise-btn').forEach(function (mb) {
      mb.addEventListener('click', function () {
        var id = mb.getAttribute('data-target');
        var btn = btnFor(id);
        setOpen(btn, false);
        var sec = document.getElementById(id);
        if (sec) { sec.scrollIntoView({ block: 'start' }); }
      });
    });
    function openFromHash() {
      var raw = location.hash.slice(1);
      var target = raw && document.getElementById(decodeURIComponent(raw));
      if (!target) { return; }
      var part = target.closest('.part-body');
      var btn = part ? btnFor(part.id.replace(/-body$/, '')) : btnFor(target.id);
      if (btn) { setOpen(btn, true); }
      target.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
    document.getElementById('expand-all').addEventListener('click', function () {
      document.querySelectorAll('.part-btn').forEach(function (b) { setOpen(b, true); });
    });
    document.getElementById('collapse-all').addEventListener('click', function () {
      document.querySelectorAll('.part-btn').forEach(function (b) { setOpen(b, false); });
    });
  })();
