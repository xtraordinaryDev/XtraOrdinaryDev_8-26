// Motion for the home page and shared blocks: the hero demo (an assistant answering from a
// company's own files, then a workflow with a person approving), counting numbers, and the
// step connector. Everything is plain DOM; nothing is fetched. Honours prefers-reduced-motion
// by showing the finished state instead of animating.

(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  function typeInto(el, text, speed) {
    return new Promise(function (resolve) {
      el.textContent = '';
      el.classList.add('is-typing');
      var i = 0;
      (function tick() {
        if (i <= text.length) { el.textContent = text.slice(0, i++); setTimeout(tick, speed + Math.random() * speed); }
        else { el.classList.remove('is-typing'); resolve(); }
      })();
    });
  }
  function streamInto(el, text, cps) {
    return new Promise(function (resolve) {
      el.textContent = '';
      var words = text.split(' '), i = 0;
      (function tick() {
        if (i < words.length) { el.textContent += (i ? ' ' : '') + words[i++]; setTimeout(tick, 1000 / cps); }
        else resolve();
      })();
    });
  }
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function show(el, on) { if (el) el.classList.toggle('is-on', on !== false); }

  /* ---------- hero demo ---------- */
  var demo = document.querySelector('[data-hero-demo]');
  if (demo) {
    var q = demo.querySelector('[data-demo-q]');
    var a = demo.querySelector('[data-demo-a]');
    var cites = demo.querySelectorAll('[data-demo-cite]');
    var status = demo.querySelector('[data-demo-status]');
    var flow = demo.querySelector('[data-demo-flow]');
    var steps = flow ? flow.querySelectorAll('[data-flow-step]') : [];
    var approve = demo.querySelector('[data-demo-approve]');
    var scenes = [
      {
        q: 'What is our retention period for bid documents on county work?',
        a: 'Seven years from project close-out, per the Records Retention Policy (section 4.2). County contracts since 2021 extend this to ten years for anything tied to federal funding; see the Hennepin County agreement, clause 11.',
        cites: ['Records-Retention-Policy.pdf · p. 4', 'Hennepin-County-MSA-2021.docx · cl. 11'],
        status: 'Answered from 2 of 14,312 indexed files · nothing left your tenant'
      },
      {
        q: 'Draft the kickoff memo for the Lakeville water main project.',
        a: 'Drafted from the proposal, the signed scope and the last three kickoff memos for municipal water work. Two items need a human call: the survey subcontractor is not yet named, and the schedule assumes a May 4 notice to proceed.',
        cites: ['Lakeville-WM-Proposal-2026.pdf', 'Kickoff-Memo-template.docx'],
        status: 'Draft ready for review · a person sends it, not the system'
      }
    ];

    function runScene(s) {
      a.textContent = '';
      cites.forEach(function (c) { show(c, false); });
      show(status, false);
      show(approve, false);
      steps.forEach(function (st) { show(st, false); });
      return typeInto(q, s.q, 28)
        .then(function () { return wait(350); })
        .then(function () { return streamInto(a, s.a, 22); })
        .then(function () {
          cites.forEach(function (c, i) { if (s.cites[i]) { c.textContent = s.cites[i]; setTimeout(function () { show(c); }, 120 * i); } });
          status.textContent = s.status; show(status);
          return wait(900);
        })
        .then(function () {
          // the workflow row: intake -> review -> approved, with a person on the review step
          return steps.length ? Array.prototype.reduce.call(steps, function (p, st, i) {
            return p.then(function () { show(st); return wait(i === 1 ? 900 : 450); });
          }, Promise.resolve()).then(function () { show(approve); return wait(2600); }) : wait(2600);
        });
    }

    if (reduced) {
      var s0 = scenes[0];
      q.textContent = s0.q; a.textContent = s0.a;
      cites.forEach(function (c, i) { if (s0.cites[i]) { c.textContent = s0.cites[i]; show(c); } });
      status.textContent = s0.status; show(status);
      steps.forEach(function (st) { show(st); }); show(approve);
    } else {
      var idx = 0;
      (function loop() { runScene(scenes[idx]).then(function () { idx = (idx + 1) % scenes.length; demo.classList.add('is-switching'); return wait(400); }).then(function () { demo.classList.remove('is-switching'); loop(); }); })();
    }
  }

  /* ---------- count-up numbers ---------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var fmt = function (n, decimals) { return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); };
    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
      var prefix = el.getAttribute('data-prefix') || '', suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = prefix + fmt(target, decimals) + suffix; return; }
      var start = null, dur = 1400;
      (function frame(t) {
        if (!start) start = t;
        var p = Math.min(1, (t - start) / dur); p = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + fmt(target * p, decimals) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      })(performance.now());
    };
    if ('IntersectionObserver' in window && !reduced) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { io.observe(el); });
    } else counters.forEach(run);
  }

  /* ---------- step connector draws in ---------- */
  var stepsGrid = document.querySelector('.steps-grid');
  if (stepsGrid && 'IntersectionObserver' in window && !reduced) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { stepsGrid.classList.add('is-drawn'); obs.disconnect(); } });
    }, { threshold: 0.3 }).observe(stepsGrid);
  } else if (stepsGrid) stepsGrid.classList.add('is-drawn');

  /* ---------- device frames follow the pointer ---------- */
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches && !reduced) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var b = el.getBoundingClientRect();
        var px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
        el.style.transform = 'perspective(1200px) rotateY(' + (px * 6) + 'deg) rotateX(' + (-py * 6) + 'deg) translateY(-4px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }
})();
