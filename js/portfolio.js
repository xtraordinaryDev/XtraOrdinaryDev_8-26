// Portfolio previews: hover to auto-scroll the screenshot, subtle tilt on mouse.
// Shared by previous-work.html and the featured-work section on websites.html.
// Respects reduced-motion preferences.

(function () {
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches;

  if (reduced) return;

  // Scroll the full-page screenshot down while the pointer rests on it,
  // then ease back to the top when it leaves.
  document.querySelectorAll('.pw-viewport').forEach(function (vp) {
    var img = vp.querySelector('img');
    if (!img) return;

    vp.addEventListener('mouseenter', function () {
      var over = img.offsetHeight - vp.clientHeight;
      if (over > 0) {
        var dur = Math.min(18, Math.max(5, over / 90));
        img.style.transition = 'transform ' + dur + 's linear';
        img.style.transform = 'translateY(' + (-over) + 'px)';
      }
    });

    vp.addEventListener('mouseleave', function () {
      img.style.transition = 'transform 1.2s cubic-bezier(.2,.8,.2,1)';
      img.style.transform = 'translateY(0)';
    });
  });

  if (!finePointer) return;

  document.querySelectorAll('.pw-frame').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var b = el.getBoundingClientRect();
      var px = (e.clientX - b.left) / b.width - 0.5;
      var py = (e.clientY - b.top) / b.height - 0.5;
      el.style.transform = 'perspective(1100px) rotateY(' + (px * 5) + 'deg) rotateX(' + (-py * 5) + 'deg) translateY(-4px)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = '';
    });
  });
})();
