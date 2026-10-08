(function () {
  'use strict';

  // Efecto de brillo que sigue al cursor en botones
  document.addEventListener('pointermove', function (e) {
    var btn = e.target.closest && e.target.closest('.btn, .submit-btn');
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    btn.style.setProperty('--x', (e.clientX - r.left) + 'px');
    btn.style.setProperty('--y', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // Sombra del header al hacer scroll
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      header.style.boxShadow = window.scrollY > 8 ? '0 4px 20px rgba(0,0,0,0.08)' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Picker de reacciones en táctil: mantener presionado
  var pressTimer = null;
  document.addEventListener('touchstart', function (e) {
    var box = e.target.closest && e.target.closest('.reaction-container');
    document.querySelectorAll('.reaction-container.open').forEach(function (el) {
      if (el !== box) el.classList.remove('open');
    });
    if (!box) return;
    pressTimer = setTimeout(function () { box.classList.add('open'); }, 450);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(function (evt) {
    document.addEventListener(evt, function () { clearTimeout(pressTimer); }, { passive: true });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.reaction-emoji')) {
      setTimeout(function () {
        document.querySelectorAll('.reaction-container.open').forEach(function (el) {
          el.classList.remove('open');
        });
      }, 150);
    }
  });

  // Cerrar modales con ESC y al tocar el fondo
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.active').forEach(function (m) {
      if (typeof window.closeModal === 'function') window.closeModal(m.id);
      else m.classList.remove('active');
    });
  });
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('modal') && e.target.classList.contains('active')) {
      if (typeof window.closeModal === 'function') window.closeModal(e.target.id);
      else e.target.classList.remove('active');
    }
  });

  // Bloquear scroll del fondo con modal abierto
  new MutationObserver(function () {
    document.body.style.overflow = document.querySelector('.modal.active') ? 'hidden' : '';
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();
