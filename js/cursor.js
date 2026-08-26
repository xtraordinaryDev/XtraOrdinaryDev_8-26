(function () {
  'use strict';

  // Only activate on fine-pointer (mouse) devices — skip touch/mobile
  if (!window.matchMedia('(pointer: fine)').matches) return;

  var dot  = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  var mouseX = window.innerWidth  / 2;
  var mouseY = window.innerHeight / 2;
  var ringX  = mouseX;
  var ringY  = mouseY;

  // Snap dot instantly to the exact mouse position
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
  });

  // Ring lazily interpolates 12% of the distance each frame
  function tick() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(tick);
  }
  tick();

  // Interactive selectors that trigger the hover state
  var HOVER_SELECTOR = [
    'a',
    'button',
    '[role="button"]',
    'input',
    'select',
    'textarea',
    'label[for]',
    '.trust-card',
    '.about-card',
    '.service-summary-list',
    '.why-choose-list-grid li',
    '.btn_primary',
    '.btn_secondary',
    '.header-btn',
    '.action-btn',
    '.nav-link',
    '.navbar-toggler',
    '.kw-chip',
    '.client-logo-track img',
    '.workflow-steps-list li',
  ].join(', ');

  // Event delegation — works for all elements including dynamically rendered ones
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
      dot.classList.add('is-hovering');
      ring.classList.add('is-hovering');
    }
  });

  document.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
      dot.classList.remove('is-hovering');
      ring.classList.remove('is-hovering');
    }
  });
}());
