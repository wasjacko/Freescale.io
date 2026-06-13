// Minimal mobile menu toggle
const burger = document.querySelector(".nav__burger");
const links = document.querySelector(".nav__links");

/* ── Floating collage parallax (subtle, follows the cursor) ───────── */
(function () {
  const collage = document.querySelector(".screen-collage");
  if (!collage) return;
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  let ticking = false;
  let mx = 0, my = 0;
  function apply() {
    const x = (window.innerWidth / 2 - mx) / 55;
    const y = (window.innerHeight / 2 - my) / 55;
    collage.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
    ticking = false;
  }
  window.addEventListener(
    "mousemove",
    function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    },
    { passive: true }
  );
})();

/* ── Hero woman: gentle scroll parallax (she drifts down as you scroll) ── */
(function () {
  const visual = document.querySelector(".hero__visual");
  if (!visual) return;
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  let ticking = false;
  function apply() {
    ticking = false;
    // disabled on stacked mobile layout (woman is in the flow there)
    if (window.innerWidth < 900) {
      visual.style.transform = "";
      visual.style.opacity = "";
      return;
    }
    const y = window.scrollY;
    const vh = window.innerHeight || 800;
    // drift down…
    visual.style.transform = "translateY(" + (y * 0.14).toFixed(1) + "px)";
    // …and fade out EARLY in the scroll ("disparaît plus tôt encore")
    const fStart = vh * 0.16;
    const fEnd = vh * 0.46;
    const t = Math.max(0, Math.min(1, (y - fStart) / (fEnd - fStart)));
    visual.style.opacity = (1 - t * 0.82).toFixed(3); // fades to ~0.18
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  apply();
})();

if (burger) {
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    if (links) links.classList.toggle("is-open", !open);
  });
}

/* ── Nav hide on scroll-down, reveal on scroll-up ─────────────────── */
(function () {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  // only the nav hides on scroll — the .nav-blur stays put (permanent top blur)
  function setHidden(hidden) {
    nav.classList.toggle("is-hidden", hidden);
  }

  let lastY = window.scrollY;
  let accum = 0;                 // scroll distance accumulated in the current direction
  let ticking = false;
  let armed = false;            // grace period so we don't race the dropIn animation
  const HIDE_AT = 8;            // cumulative px scrolled DOWN before hiding
  const SHOW_AT = 6;            // cumulative px scrolled UP before revealing (eager)
  const TOP_LOCK = 80;          // always visible near top

  function update() {
    const y = Math.max(0, window.scrollY); // clamp negative (rubber-band)
    const delta = y - lastY;
    lastY = y;
    ticking = false;

    if (y < TOP_LOCK) {           // always show near the top
      setHidden(false);
      accum = 0;
      return;
    }
    if (delta === 0) return;
    // reset the accumulator the moment direction flips → instant response
    if ((delta > 0) !== (accum > 0)) accum = 0;
    accum += delta;

    if (accum > HIDE_AT) {
      setHidden(true);
      if (links && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        if (burger) burger.setAttribute("aria-expanded", "false");
      }
    } else if (accum < -SHOW_AT) {
      setHidden(false);
    }
  }

  function onScroll() {
    if (!armed || ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  // let the dropIn entrance finish before reacting to scroll
  setTimeout(function () {
    armed = true;
    lastY = window.scrollY; // re-baseline in case the user already scrolled
  }, 850);

  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ── Testimonial slider (ported from the React component) ───────────── */
(function () {
  const tm = document.querySelector(".tm");
  if (!tm) return;

  const reviews = [
    {
      date: "Sept. 2024",
      quote:
        "« Avant Freescale, je jonglais entre WhatsApp, Insta et mes mails toute la journée. Aujourd'hui tout est au même endroit — je ne reviendrai jamais en arrière. »",
      name: "Camille Dubois",
      avatar: "assets/avatar-1.jpg",
    },
    {
      date: "Août 2024",
      quote:
        "« Le copilote IA me fait gagner des heures chaque semaine. Mes clients me trouvent ultra réactive, et je n'écris presque plus rien moi-même. »",
      name: "Léa Moreau",
      avatar: "assets/avatar-2.jpg",
    },
    {
      date: "Juil. 2024",
      quote:
        "« Je gère deux fois plus de clients sans stress. Freescale est devenu l'outil que je recommande à tous les freelances autour de moi. »",
      name: "Sophie Martin",
      avatar: "assets/avatar-3.jpg",
    },
  ];

  const intervalMs = 5000;
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dateEl = tm.querySelector(".tm__date");
  const quoteEl = tm.querySelector(".tm__quote");
  const authorImg = tm.querySelector(".tm__author img");
  const authorName = tm.querySelector(".tm__author span");
  const bars = Array.prototype.slice.call(tm.querySelectorAll(".tm__bar i"));

  let idx = 0;
  let paused = false;
  let timer = null;

  function render(i) {
    const r = reviews[i];
    if (!r) return;
    dateEl.textContent = r.date;
    quoteEl.textContent = r.quote;
    if (authorImg) authorImg.setAttribute("src", r.avatar);
    if (authorName) authorName.textContent = r.name;
  }

  function cycle() {
    if (paused || reviews.length <= 1) return;
    bars.forEach(function (b) {
      b.style.transition = "none";
      b.style.width = "0%";
    });
    const cur = bars[idx];
    if (cur) {
      void cur.offsetWidth; // reflow so the bar restarts from 0
      if (reduce) {
        cur.style.width = "100%";
      } else {
        cur.style.transition = "width " + intervalMs + "ms linear";
        cur.style.width = "100%";
      }
    }
    timer = setTimeout(function () {
      idx = (idx + 1) % reviews.length;
      render(idx);
      cycle();
    }, intervalMs);
  }

  function pause() {
    paused = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function resume() {
    if (!paused) return;
    paused = false;
    cycle();
  }

  tm.addEventListener("mouseenter", pause);
  tm.addEventListener("mouseleave", resume);
  tm.addEventListener("focusin", pause);
  tm.addEventListener("focusout", resume);

  render(0);

  if (reduce) {
    tm.classList.add("is-visible");
    cycle();
  } else {
    const io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          tm.classList.add("is-visible");
          io.disconnect();
          cycle();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(tm);
  }
})();

/* ── Statement: first-appearance reveal — grey → CTA gradient → black (one-shot) ── */
(function () {
  const section = document.querySelector(".statement");
  if (!section) return;
  const textEl = section.querySelector(".statement__text");
  if (!textEl) return;

  // split into word spans, preserving any <em> accent as italic-serif words
  const spans = [];
  (function () {
    const nodes = Array.prototype.slice.call(textEl.childNodes);
    textEl.textContent = "";
    nodes.forEach(function (node) {
      const serif = node.nodeType === 1; // an <em> → serif-italic accent words
      node.textContent.split(/(\s+)/).forEach(function (chunk) {
        if (chunk === "") return;
        if (/^\s+$/.test(chunk)) { textEl.appendChild(document.createTextNode(chunk)); return; }
        const s = document.createElement("span");
        s.className = "statement__word" + (serif ? " statement__word--serif" : "");
        s.textContent = chunk;
        textEl.appendChild(s);
        spans.push(s);
      });
    });
  })();

  // sequence the wave LINE BY LINE (the phrase wraps, so lines = words sharing an offsetTop):
  // each rendered line's first word waits until the previous line is almost finished.
  function assignLineDelays() {
    const STAGGER = 0.07, GAP = 0.42; // seconds (GAP ≈ how "almost finished" the prev line is)
    let base = 0, wi = 0, lineTop = null, maxD = 0;
    spans.forEach(function (s) {
      const top = s.offsetTop;
      if (lineTop === null) { lineTop = top; }
      else if (Math.abs(top - lineTop) > 12) {       // wrapped to a new visual line (12px ignores serif/sans baseline jitter)
        base += Math.max(0, wi - 1) * STAGGER + GAP; // wait out the previous line
        lineTop = top; wi = 0;
      }
      const d = base + wi * STAGGER;
      if (d > maxD) maxD = d;
      s.style.setProperty("--d", d.toFixed(3) + "s");
      wi++;
    });
    // the logos slide in once the LAST word's reveal has (nearly) finished (.65s word dur)
    section.style.setProperty("--logos-delay", (maxD + 0.55).toFixed(3) + "s");
  }

  // make the CTA gradient span the WHOLE phrase (not per-word): each word gets the
  // full text-block-sized gradient, shifted to the word's own position → one continuous slice
  function sliceGradient() {
    const tw = textEl.clientWidth, th = textEl.clientHeight;
    spans.forEach(function (s) {
      s.style.backgroundSize = tw + "px " + th + "px";
      s.style.backgroundPosition = (-s.offsetLeft) + "px " + (-s.offsetTop) + "px";
    });
    assignLineDelays();
  }
  sliceGradient();
  window.addEventListener("resize", sliceGradient);
  window.addEventListener("load", sliceGradient);

  // play the reveal ONCE, the first time the phrase is meaningfully in view
  let played = false;
  function maybePlay() {
    if (played) return;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh * 0.72 && rect.bottom > vh * 0.12) {
      played = true;
      section.classList.add("is-in");
      window.removeEventListener("scroll", maybePlay);
    }
  }
  window.addEventListener("scroll", maybePlay, { passive: true });
  window.addEventListener("resize", maybePlay);
  maybePlay();
})();

/* ── Hero headline: first-paint reveal — grey → CTA gradient → black, word by word ── */
(function () {
  const headline = document.querySelector(".headline");
  if (!headline) return;
  const lines = Array.prototype.slice.call(headline.querySelectorAll(".line"));
  if (!lines.length) return;

  // wrap every word of every line in a .hl-word span (spaces kept as text nodes),
  // sequencing the wave LINE BY LINE: each line's first word waits until the previous
  // line is almost finished (base += that line's sweep + GAP) — the wave never jumps to
  // the next line before the current one has (nearly) resolved.
  const STAGGER = 0.07, GAP = 0.42, INIT = 0.1; // seconds (GAP ≈ how "almost finished" the prev line is)
  const spans = [];
  let base = INIT;
  lines.forEach(function (line) {
    const text = line.textContent;
    line.textContent = "";
    const lineWords = [];
    text.split(/(\s+)/).forEach(function (chunk) {
      if (chunk === "") return;
      if (/^\s+$/.test(chunk)) { line.appendChild(document.createTextNode(chunk)); return; }
      const s = document.createElement("span");
      s.className = "hl-word";
      s.textContent = chunk;
      line.appendChild(s);
      spans.push(s);
      lineWords.push(s);
    });
    lineWords.forEach(function (s, wi) {
      s.style.setProperty("--d", (base + wi * STAGGER).toFixed(3) + "s");
    });
    base += Math.max(0, lineWords.length - 1) * STAGGER + GAP;
  });

  // continuous CTA gradient across the WHOLE headline (each word carries a slice)
  function sliceGradient() {
    const tw = headline.clientWidth, th = headline.clientHeight;
    spans.forEach(function (s) {
      s.style.backgroundSize = tw + "px " + th + "px";
      s.style.backgroundPosition = (-s.offsetLeft) + "px " + (-s.offsetTop) + "px";
    });
  }
  sliceGradient();
  window.addEventListener("resize", sliceGradient);

  // play the reveal once the fonts have settled (so the slice lines up); fallback timer guards it
  let started = false;
  function start() {
    if (started) return;
    started = true;
    sliceGradient();
    headline.classList.add("is-in");
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { sliceGradient(); requestAnimationFrame(start); });
  }
  window.addEventListener("load", function () { sliceGradient(); start(); });
  setTimeout(start, 600); // hard fallback so the title never stays invisible
})();

/* ── Mue copilot: image appears CENTERED first, then slides right as the copy reveals left ── */
(function () {
  const section = document.querySelector(".mue");
  if (!section) return;
  const titleEl = section.querySelector(".mue__title");
  const eyebrowEl = section.querySelector(".mue__eyebrow");
  const copyEl = section.querySelector(".mue__copy");
  const visual = section.querySelector(".mue__visual");
  const png = visual ? visual.querySelector("img") : null;
  const pill = section.querySelector(".mue__pill");
  const lines = Array.prototype.slice.call(
    section.querySelectorAll(".mue__text, .mue__list li")
  );

  // how far to shift the image LEFT so it sits dead-centre of the viewport during phase 1.
  // measured from its natural grid slot (right column); horizontal → scroll-independent.
  let centerShift = 0, lastW = 0;
  function measure() {
    if (!visual) return;
    const prev = visual.style.transform;
    visual.style.transform = "none";
    const r = visual.getBoundingClientRect();
    centerShift = Math.round(window.innerWidth / 2 - (r.left + r.width / 2));
    visual.style.transform = prev;
    lastW = window.innerWidth;
  }

  // split the title into word spans, preserving the serif accent word(s) in <em>
  const spans = [];
  if (titleEl) {
    const nodes = Array.prototype.slice.call(titleEl.childNodes);
    titleEl.textContent = "";
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        // text node → one span per word, keep the whitespace between them
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (chunk === "") return;
          if (/^\s+$/.test(chunk)) {
            titleEl.appendChild(document.createTextNode(chunk));
            return;
          }
          const s = document.createElement("span");
          s.className = "mue__word";
          s.textContent = chunk;
          titleEl.appendChild(s);
          spans.push(s);
        });
      } else if (node.nodeType === 1) {
        // the <em> accent → one serif word span
        const s = document.createElement("span");
        s.className = "mue__word mue__word--serif";
        s.textContent = node.textContent;
        titleEl.appendChild(s);
        spans.push(s);
      }
    });
  }

  const N = spans.length;
  const SPREAD = 5, A_START = 0.18, A_END = 1;
  function paint(p) {
    for (let i = 0; i < N; i++) {
      const t = Math.max(0, Math.min(1, (p * (N + SPREAD) - i) / SPREAD));
      spans[i].style.color = "rgba(21, 23, 29, " + (A_START + (A_END - A_START) * t).toFixed(3) + ")";
    }
  }
  function sm(q) { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); } // smoothstep

  function finalState() {
    paint(1);
    if (copyEl) copyEl.style.opacity = "1";
    if (eyebrowEl) { eyebrowEl.style.opacity = "1"; eyebrowEl.style.transform = "none"; }
    lines.forEach(function (l) { l.style.opacity = "1"; l.style.transform = "none"; });
    if (visual) { visual.style.opacity = "1"; visual.style.transform = "none"; }
    if (png) png.style.transform = "none";
    if (pill) { pill.style.opacity = "1"; pill.style.transform = "none"; }
  }

  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { finalState(); return; }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      // stacked mobile layout → everything visible, no transforms
      if (window.innerWidth < 900) { finalState(); return; }

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < -40 || rect.top > vh + 40) return;

      if (window.innerWidth !== lastW) measure();

      const total = section.offsetHeight - vh;
      const prog = Math.max(0, Math.min(1, total > 0 ? -rect.top / total : 0));

      // PHASE 1 — the IMAGE is simply PRESENT and CENTERED (no fade / scale apparition).
      // PHASE 2 — it slides from the centre to its right slot while the copy reveals left.
      const move = sm((prog - 0.46) / 0.40);  // 0→1 : centre → right slot
      if (visual) {
        visual.style.transform = "translateX(" + (centerShift * (1 - move)).toFixed(1) + "px)";
      }

      // copy block stays hidden during phase 1 (nothing sits under the centred image),
      // then fades in as the image starts moving to the right
      const copyReveal = sm((prog - 0.46) / 0.12);
      if (copyEl) copyEl.style.opacity = copyReveal.toFixed(3);

      // THEN THE TEXT — eyebrow, title word-fill, then the lines stagger from the LEFT
      if (eyebrowEl) {
        const e = sm((prog - 0.48) / 0.12);
        eyebrowEl.style.opacity = e.toFixed(3);
        eyebrowEl.style.transform = "translateY(" + ((1 - e) * 12).toFixed(1) + "px)";
      }
      paint(Math.max(0, Math.min(1, (prog - 0.5) / 0.34)));
      lines.forEach(function (l, i) {
        const e = sm((prog - 0.6) / 0.34 - i * 0.1);
        l.style.opacity = e.toFixed(3);
        l.style.transform =
          "translateX(" + (-(1 - e) * 44).toFixed(1) + "px) translateY(" + ((1 - e) * 14).toFixed(1) + "px)";
      });

      // pill "Mue a rédigé une réponse" — fades in at the very end
      if (pill) {
        const r = sm((prog - 0.82) / 0.16);
        pill.style.opacity = r.toFixed(3);
        pill.style.transform = "translateY(" + ((1 - r) * 10).toFixed(1) + "px)";
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();

/* ── Inbox "screen": constant mini 3D tilt + a very subtle upward scroll parallax ── */
(function () {
  const screen = document.querySelector(".inbox");
  if (!screen) return;
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ticking = false;
  function apply() {
    ticking = false;
    if (window.innerWidth < 820) { screen.style.transform = ""; return; } // stacked → flat
    const rect = screen.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // very subtle upward parallax + a constant MINI 3D tilt (top leans back a touch)
    let q = (vh - rect.top) / (vh + rect.height);
    q = Math.max(0, Math.min(1, q));
    screen.style.transform = "translateY(" + (-q * 34).toFixed(1) + "px) rotateX(5deg)";
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }
  if (reduce) { screen.style.transform = ""; return; }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  apply();
})();

/* ── Dark-card rows = checkable tasks: only the checkbox toggles (strike + check) ── */
(function () {
  const rows = document.querySelectorAll(".dcard .drow");
  if (!rows.length) return;
  const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';
  rows.forEach(function (row) {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "dcheck";
    box.setAttribute("aria-label", "Cocher la tâche");
    box.setAttribute("aria-pressed", "false");
    box.innerHTML = CHECK;
    box.addEventListener("click", function (e) {
      e.stopPropagation(); // clicking the row itself does nothing — only the checkbox
      const done = row.classList.toggle("is-done");
      box.setAttribute("aria-pressed", done ? "true" : "false");
    });
    row.insertBefore(box, row.firstChild);
  });
})();

/* ── Steps section: curved black arc at the top that extends & inverts on scroll ── */
(function () {
  const section = document.querySelector(".steps");
  const path = section && section.querySelector(".steps__arc path");
  if (!path) return;
  // amplitude stays NEGATIVE the whole time → the arc never flips: it just flattens.
  const EDGE = 72, START = -68, END = -5; // pronounced convex → almost straight (still convex)
  function draw(amp) {
    const cy = (EDGE + 2 * amp).toFixed(1);
    path.setAttribute("d", "M0 0 H1200 V" + EDGE + " Q600 " + cy + " 0 " + EDGE + " Z");
  }
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { draw(START); return; }
  let ticking = false;
  function apply() {
    ticking = false;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // p: 0 as the section top reaches the viewport bottom → 1 as it reaches the top
    let p = (vh - rect.top) / vh;
    p = Math.max(0, Math.min(1, p));
    draw(START + p * (END - START)); // stretches from curved → almost flat, same direction
  }
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(apply); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  apply();
})();

/* ── Steps: ONE sticky 3D icon that SPINS on itself and transforms between steps ── */
(function () {
  var list = document.querySelector(".steps__list");
  var steps = list ? Array.prototype.slice.call(list.querySelectorAll(".step")) : [];
  var spin = document.querySelector(".morph__spin");
  var icons = spin ? Array.prototype.slice.call(spin.querySelectorAll(".morph__icon")) : [];
  if (!spin || steps.length < 2 || icons.length !== steps.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var shown = 0, target = 0, animating = false;
  function face(i) {
    icons.forEach(function (ic, k) { ic.classList.toggle("is-active", k === i); });
  }
  face(0);

  // ONE half-turn on the vertical axis per step change: the incoming face is swapped in
  // edge-on (at 90° the object is invisible), pre-counter-rotated 180° so it lands
  // front-facing — reads as "the object turns on itself and transforms".
  function flip() {
    if (animating || target === shown) return;
    if (reduce) { shown = target; face(shown); return; }
    animating = true;
    var next = target;
    var dir = next > shown ? 1 : -1;        // scroll down → spin one way, up → the other
    spin.style.transition = "transform .85s cubic-bezier(.5, .05, .15, 1)";
    void spin.offsetWidth;                  // commit the transition before the transform
    spin.style.transform = "rotateY(" + dir * 180 + "deg)";
    setTimeout(function () {
      icons[next].style.transform = "rotateY(180deg)";  // counter-rotate the incoming face
      face(next);
    }, 425);
    var fired = false;
    var done = function () {
      if (fired) return;
      fired = true;
      spin.removeEventListener("transitionend", done);
      // (spin 180° + face 180°) is visually identical to (0 + 0) → invisible reset
      spin.style.transition = "none";
      spin.style.transform = "rotateY(0deg)";
      icons[next].style.transform = "";
      shown = next;
      requestAnimationFrame(function () { requestAnimationFrame(function () { animating = false; flip(); }); });
    };
    spin.addEventListener("transitionend", done);
    setTimeout(done, 1000);                 // safety: transitionend can be missed in hidden tabs
  }

  var ticking = false;
  function update() {
    ticking = false;
    var mid = (window.innerHeight || document.documentElement.clientHeight) / 2;
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < steps.length; i++) {
      var r = steps[i].getBoundingClientRect();
      var c = r.top + r.height / 2;
      var d = Math.abs(c - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    target = best;
    flip();
  }
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(update); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

/* ── Social icons fly from the hero and dock at the screen's top-right on scroll ── */
(function () {
  var flies = Array.prototype.slice.call(document.querySelectorAll(".dock .fly"));
  if (!flies.length) return;
  var HERO_SIZE = 84; // px diameter while floating in the hero
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // build a REAL extruded 3D tile per icon: the face + darkened slabs stacked behind in Z
  var DEPTH = 7, STEP = 1.15;
  flies.forEach(function (el) {
    var face = el.querySelector("img");
    if (!face || el.querySelector(".fly__tile")) return;
    face.className = "fly__face";
    face.style.transform = "translateZ(.5px)";
    var tile = document.createElement("span");
    tile.className = "fly__tile";
    for (var k = DEPTH; k >= 1; k--) {                 // back → front so the face ends on top
      var edge = face.cloneNode(false);
      edge.className = "fly__edge";
      edge.removeAttribute("alt");
      edge.style.transform = "translateZ(" + (-k * STEP).toFixed(2) + "px)";
      tile.appendChild(edge);
    }
    tile.appendChild(face);
    el.appendChild(tile);
  });

  var screen = document.querySelector(".screen");
  var chans = document.querySelector(".appbar__chans");
  var data = [];
  function measure() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var sr = screen.getBoundingClientRect();           // .screen is NOT transformed (anchor frame)
    data = flies.map(function (el) {
      var slot = chans.querySelector('[data-chan="' + el.dataset.target + '"]');
      var tr = slot.getBoundingClientRect();
      var w = tr.width || 30;
      // docked centre, relative to .screen → the fly's resting (left/top) position
      var cx = tr.left - sr.left + tr.width / 2;
      var cy = tr.top - sr.top + tr.height / 2;
      el.style.width = w + "px";
      el.style.left = (cx - w / 2).toFixed(1) + "px";
      el.style.top = (cy - w / 2).toFixed(1) + "px";
      // hero spot, relative to .screen
      var hx = parseFloat(el.dataset.hx) * vw - sr.left;
      var hy = parseFloat(el.dataset.hy) * vh - sr.top;
      return {
        el: el,
        tile: el.querySelector(".fly__tile"),
        rx: parseFloat(el.dataset.rx) || 0,            // hero 3D tilt (straightens on scroll)
        ry: parseFloat(el.dataset.ry) || 0,
        rz: parseFloat(el.dataset.rz) || 0,
        dx: hx - cx,                                   // hero spot − docked slot (x)
        dy: hy - cy,                                   // hero spot − docked slot (y)
        scale: (parseFloat(el.dataset.hs) || HERO_SIZE) / w   // per-icon hero size
      };
    });
  }
  function paint(p) {
    var q = 1 - p;
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      d.el.style.transform =
        "translate(" + (d.dx * q).toFixed(1) + "px," + (d.dy * q).toFixed(1) + "px) scale(" +
        (1 + (d.scale - 1) * q).toFixed(3) + ")";
      // 3D tilt is full in the hero (q=1) and straightens to flat as it docks (q→0)
      if (d.tile) d.tile.style.transform =
        "rotateX(" + (d.rx * q).toFixed(2) + "deg) rotateY(" + (d.ry * q).toFixed(2) +
        "deg) rotateZ(" + (d.rz * q).toFixed(2) + "deg)";
    }
  }
  var ticking = false, lastW = -1;
  function apply() {
    ticking = false;
    if (window.innerWidth < 820) { flies.forEach(function (el) { el.style.transform = "none"; var t = el.querySelector(".fly__tile"); if (t) t.style.transform = "none"; }); return; }
    if (window.innerWidth !== lastW) { lastW = window.innerWidth; measure(); }
    var vh = window.innerHeight || 800;
    var p = Math.max(0, Math.min(1, window.scrollY / (vh * 0.72)));
    paint(p * p * (3 - 2 * p)); // smoothstep
  }
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(apply); }
  if (reduce) { flies.forEach(function (el) { el.style.transform = "none"; }); return; }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", function () { lastW = -1; apply(); });
  apply();
})();

/* ── FAQ: category tabs + single-open accordion ── */
(function () {
  var faq = document.querySelector(".faq");
  if (!faq) return;
  var tabs = Array.prototype.slice.call(faq.querySelectorAll(".faq__tab"));
  var items = Array.prototype.slice.call(faq.querySelectorAll(".faq__item"));
  if (!tabs.length || !items.length) return;

  function show(cat) {
    tabs.forEach(function (t) { t.classList.toggle("is-on", t.dataset.cat === cat); });
    var first = true;
    items.forEach(function (it) {
      var on = it.dataset.cat === cat;
      it.hidden = !on;
      if (on) { it.open = first; first = false; }   // open the first item of the tab
      else { it.open = false; }
    });
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { show(t.dataset.cat); });
  });

  // single-open: opening one closes the others
  items.forEach(function (it) {
    it.addEventListener("toggle", function () {
      if (!it.open) return;
      items.forEach(function (o) { if (o !== it && o.open) o.open = false; });
    });
  });

  show("general");
})();

/* ── WAVE reveal for every section title (same effect as the hero/statement) ── */
(function () {
  var titles = document.querySelectorAll(".why__title, .pricing__title, .faq__title, .closer__title");
  if (!titles.length) return;

  Array.prototype.forEach.call(titles, function (el) {
    el.style.position = "relative";   // offsetParent for the continuous gradient slicing

    // split into word spans, preserving <em> accents as serif-italic words
    var spans = [];
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = "";
    nodes.forEach(function (node) {
      var serif = node.nodeType === 1;
      node.textContent.split(/(\s+)/).forEach(function (chunk) {
        if (chunk === "") return;
        if (/^\s+$/.test(chunk)) { el.appendChild(document.createTextNode(chunk)); return; }
        var s = document.createElement("span");
        s.className = "wv-word" + (serif ? " wv-word--serif" : "");
        s.textContent = chunk;
        el.appendChild(s);
        spans.push(s);
      });
    });

    // line-by-line sequencing (rendered lines = words sharing an offsetTop)
    function assignLineDelays() {
      var STAGGER = 0.07, GAP = 0.42;
      var base = 0, wi = 0, lineTop = null;
      spans.forEach(function (s) {
        var top = s.offsetTop;
        if (lineTop === null) { lineTop = top; }
        else if (Math.abs(top - lineTop) > 12) {
          base += Math.max(0, wi - 1) * STAGGER + GAP;
          lineTop = top; wi = 0;
        }
        s.style.setProperty("--d", (base + wi * STAGGER).toFixed(3) + "s");
        wi++;
      });
    }
    // one continuous gradient across the whole title
    function sliceGradient() {
      var tw = el.clientWidth, th = el.clientHeight;
      spans.forEach(function (s) {
        s.style.backgroundSize = tw + "px " + th + "px";
        s.style.backgroundPosition = (-s.offsetLeft) + "px " + (-s.offsetTop) + "px";
      });
      assignLineDelays();
    }
    sliceGradient();
    window.addEventListener("resize", sliceGradient);
    window.addEventListener("load", sliceGradient);

    // play once, the first time the title is meaningfully in view
    var played = false;
    function maybePlay() {
      if (played) return;
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh * 0.82 && rect.bottom > 0) {
        played = true;
        el.classList.add("is-in");
        window.removeEventListener("scroll", maybePlay);
      }
    }
    window.addEventListener("scroll", maybePlay, { passive: true });
    maybePlay();
  });
})();

/* ── WHY: the sticky cut-out visual SPINS on itself and transforms between steps ── */
(function () {
  var list = document.querySelector(".why__list");
  var steps = list ? Array.prototype.slice.call(list.querySelectorAll(".wstep")) : [];
  var spin = document.querySelector(".wmorph__spin");
  var icons = spin ? Array.prototype.slice.call(spin.querySelectorAll(".wmorph__icon")) : [];
  if (!spin || steps.length < 2 || icons.length !== steps.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var shown = 0, target = 0, animating = false;
  function face(i) {
    icons.forEach(function (ic, k) { ic.classList.toggle("is-active", k === i); });
  }
  face(0);

  // ONE half-turn on the vertical axis per step change: the incoming face is swapped in
  // edge-on (at 90° the flat visual is invisible), pre-counter-rotated 180° so it lands
  // front-facing — reads as "the object turns on itself and transforms".
  function flip() {
    if (animating || target === shown) return;
    if (reduce) { shown = target; face(shown); return; }
    animating = true;
    var next = target;
    var dir = next > shown ? 1 : -1;        // scroll down → spin one way, up → the other
    spin.style.transition = "transform .85s cubic-bezier(.5, .05, .15, 1)";
    void spin.offsetWidth;                  // commit the transition before the transform
    spin.style.transform = "rotateY(" + dir * 180 + "deg)";
    setTimeout(function () {
      icons[next].style.transform = "rotateY(180deg)";  // counter-rotate the incoming face
      face(next);
    }, 425);
    var fired = false;
    var done = function () {
      if (fired) return;
      fired = true;
      spin.removeEventListener("transitionend", done);
      // (spin 180° + face 180°) is visually identical to (0 + 0) → invisible reset
      spin.style.transition = "none";
      spin.style.transform = "rotateY(0deg)";
      icons[next].style.transform = "";
      shown = next;
      requestAnimationFrame(function () { requestAnimationFrame(function () { animating = false; flip(); }); });
    };
    spin.addEventListener("transitionend", done);
    setTimeout(done, 1000);                 // safety: transitionend can be missed in hidden tabs
  }

  var ticking = false;
  function update() {
    ticking = false;
    var mid = (window.innerHeight || document.documentElement.clientHeight) / 2;
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < steps.length; i++) {
      var r = steps[i].getBoundingClientRect();
      var c = r.top + r.height / 2;
      var d = Math.abs(c - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    target = best;
    flip();
  }
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(update); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", update);   // re-detect once images/layout settle
  update();
})();
