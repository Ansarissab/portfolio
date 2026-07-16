/* Behaviour only. CSS owns presentation; all content ships in the HTML. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* touch/no-hover devices get the hover-only effects mirrored via .is-active
     instead; see initCenterStage and the .no-hover rules in main.css */
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    root.classList.add("no-hover");
  }

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = String(new Date().getFullYear());

  var toggle = document.getElementById("theme");

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function paint(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("mz-theme", theme);
    } catch (e) {}
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#090d11" : "#f7f8f7");
  }

  var SUN = "M12 7.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4Z";
  var MOON = "M20.5 14.3A8.6 8.6 0 1 1 9.7 3.5a6.9 6.9 0 0 0 10.8 10.8Z";

  /* Morph the sun into the moon rather than swapping two icons. Falls back to
     a plain `d` swap if MorphSVG or gsap is unavailable. */
  function paintIcon(theme, animate) {
    var shape = document.getElementById("tgl-shape");
    var rays = document.getElementById("tgl-rays");
    if (!shape) return;
    var to = theme === "dark" ? SUN : MOON;
    if (animate && window.gsap && window.MorphSVGPlugin && !reduced) {
      window.gsap.registerPlugin(window.MorphSVGPlugin);
      window.gsap.to(shape, { duration: 0.5, ease: "power2.inOut", morphSVG: to });
      window.gsap.to(rays, { duration: 0.3, opacity: theme === "dark" ? 1 : 0 });
    } else {
      shape.setAttribute("d", to);
      if (rays) rays.style.opacity = theme === "dark" ? "1" : "0";
    }
  }

  if (toggle) {
    paint(current());
    paintIcon(current(), false);
    toggle.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      paint(next);
      paintIcon(next, true);
    });
  }

  /* Not gated on reduced-motion: a scroll bar is information, not animation. */
  var prog = document.getElementById("prog");
  if (prog) {
    var progTick = false;
    var setRead = function () {
      progTick = false;
      var d = document.documentElement;
      var max = d.scrollHeight - d.clientHeight;
      var v = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      prog.style.setProperty("--read", v.toFixed(4));
    };
    var onProg = function () {
      if (!progTick) {
        progTick = true;
        requestAnimationFrame(setRead);
      }
    };
    window.addEventListener("scroll", onProg, { passive: true });
    window.addEventListener("resize", onProg, { passive: true });
    setRead();
  }

  var hdr = document.getElementById("hdr");
  if (hdr && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px";
    document.body.prepend(sentinel);
    new IntersectionObserver(
      function (entries) {
        hdr.setAttribute("data-stuck", String(!entries[0].isIntersecting));
      },
      { rootMargin: "-8px 0px 0px 0px" }
    ).observe(sentinel);
  }

  /* Below-the-fold plugins load once the browser is idle, or on first scroll,
     whichever comes first. Nothing above the fold depends on them. */
  var LATE = [
    "DrawSVGPlugin", "ScrambleTextPlugin", "MorphSVGPlugin",
    "TextPlugin", "Draggable", "InertiaPlugin",
  ];
  var latePromise = null;

  function loadLate() {
    if (latePromise) return latePromise;
    latePromise = Promise.all(
      LATE.map(function (n) {
        if (window[n]) return Promise.resolve();
        return new Promise(function (resolve) {
          var s = document.createElement("script");
          s.src = "assets/js/" + n + ".min.js";
          s.onload = s.onerror = resolve;
          document.head.appendChild(s);
        });
      })
    ).then(function () {
      if (!window.gsap) return;
      LATE.forEach(function (n) {
        if (window[n]) window.gsap.registerPlugin(window[n]);
      });
    });
    return latePromise;
  }

  function armLate() {
    var fired = false;
    var go = function () {
      if (fired) return;
      fired = true;
      loadLate().then(initLate);
    };
    window.addEventListener("scroll", go, { passive: true, once: true });
    window.addEventListener("pointerdown", go, { once: true });
    if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 2500 });
    else setTimeout(go, 1200);
  }

  /* One rAF loop. Listeners are passive and only write CSS custom props. */
  function initParallax() {
    if (reduced) return;

    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var body = document.body;

    var field = document.createElement("div");
    field.className = "field";
    field.setAttribute("aria-hidden", "true");
    body.prepend(field);

    /* glow + core exist on every device: fine pointers get continuous
       tracking below, touch gets a one-shot pulse on tap (initTouchPulse). */
    var glow = document.createElement("div");
    glow.className = "glow";
    glow.setAttribute("aria-hidden", "true");
    body.prepend(glow);

    var core = document.createElement("div");
    core.className = "glow__core";
    core.setAttribute("aria-hidden", "true");
    body.prepend(core);

    var trail = [];
    if (fine) {
      /* trail: each dot chases the one in front of it, so the tail curves
         through the path the cursor took rather than snapping to a line */
      for (var i = 0; i < 6; i++) {
        var d = document.createElement("div");
        d.className = "trail";
        d.setAttribute("aria-hidden", "true");
        var size = 7 - i * 0.8;
        d.style.width = d.style.height = size + "px";
        d.style.setProperty("--to", (0.45 - i * 0.06).toFixed(2));
        body.prepend(d);
        trail.push({ el: d, x: 0, y: 0, k: 0.34 - i * 0.035 });
      }
    }

    /* touch pulse: no cursor to track, so a tap just lights the glow at the
       touch point and lets it fade, instead of chasing a pointer that isn't there */
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (e.pointerType === "mouse") return;
        glow.style.setProperty("--gx", e.clientX.toFixed(1) + "px");
        glow.style.setProperty("--gy", e.clientY.toFixed(1) + "px");
        core.style.setProperty("--cx", e.clientX.toFixed(1) + "px");
        core.style.setProperty("--cy", e.clientY.toFixed(1) + "px");
        glow.setAttribute("data-on", "true");
        core.setAttribute("data-on", "true");
        if (window.gsap) {
          window.gsap.delayedCall(0.7, function () {
            glow.setAttribute("data-on", "false");
            core.setAttribute("data-on", "false");
          });
        } else {
          setTimeout(function () {
            glow.setAttribute("data-on", "false");
            core.setAttribute("data-on", "false");
          }, 700);
        }
      },
      { passive: true }
    );

    var shots = Array.prototype.slice.call(document.querySelectorAll(".case__shot"));
    var hero = document.querySelector(".hero");
    var mags = fine
      ? Array.prototype.slice.call(document.querySelectorAll(".hero .btn"))
      : [];

    /* Capped at 8px so the hit target never runs from the pointer. */
    var MAG_R = 90;
    var MAG_MAX = 8;

    function pullMag(btn) {
      var r = btn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = tx - cx;
      var dy = ty - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var reach = Math.max(r.width, r.height) / 2 + MAG_R;

      if (!hasPointer || dist > reach) {
        if (btn.dataset.mag === "true") {
          btn.dataset.mag = "false";
          btn.style.setProperty("--magx", "0px");
          btn.style.setProperty("--magy", "0px");
        }
        return;
      }
      btn.dataset.mag = "true";
      var pull = 1 - dist / reach;
      btn.style.setProperty("--magx", (dx * pull * (MAG_MAX / 40)).toFixed(2) + "px");
      btn.style.setProperty("--magy", (dy * pull * (MAG_MAX / 40)).toFixed(2) + "px");
    }

    // halo lags at 0.09, core chases at 0.28; the gap is what sells it
    var tx = 0, ty = 0, gx = 0, gy = 0, cx = 0, cy = 0, hasPointer = false;
    var ticking = false;

    if (fine) {
      window.addEventListener(
        "pointermove",
        function (e) {
          tx = e.clientX;
          ty = e.clientY;
          if (!hasPointer) {
            hasPointer = true;
            gx = cx = tx;
            gy = cy = ty;
            glow.setAttribute("data-on", "true");
            core.setAttribute("data-on", "true");
            trail.forEach(function (t) {
              t.x = tx;
              t.y = ty;
              t.el.setAttribute("data-on", "true");
            });
          }
          request();
        },
        { passive: true }
      );
      document.addEventListener("pointerleave", function () {
        glow.setAttribute("data-on", "false");
        core.setAttribute("data-on", "false");
        trail.forEach(function (t) {
          t.el.setAttribute("data-on", "false");
        });
        hasPointer = false;
      });

  
      document.querySelectorAll(".lab").forEach(function (lab) {
        lab.addEventListener(
          "pointermove",
          function (e) {
            var r = lab.getBoundingClientRect();
            lab.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
            lab.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
          },
          { passive: true }
        );
      });

      /* rect read on enter, not per move, so tilting costs no layout work */
      var TILT = 5;
      document.querySelectorAll(".tilt").forEach(function (el) {
        var rect = null;
        el.addEventListener("pointerenter", function () {
          rect = el.getBoundingClientRect();
          el.dataset.tilting = "true";
        });
        el.addEventListener(
          "pointermove",
          function (e) {
            if (!rect) return;
            var nx = (e.clientX - rect.left) / rect.width - 0.5;
            var ny = (e.clientY - rect.top) / rect.height - 0.5;
            el.style.setProperty("--ry", (nx * TILT * 2).toFixed(2) + "deg");
            el.style.setProperty("--rx", (-ny * TILT * 2).toFixed(2) + "deg");
            el.style.setProperty(
              "--sheen",
              (Math.atan2(ny, nx) * (180 / Math.PI) + 90).toFixed(1) + "deg"
            );
          },
          { passive: true }
        );
        el.addEventListener("pointerleave", function () {
          el.dataset.tilting = "false";
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
          rect = null;
        });
      });
    }

    /* one ring, clipped by the pill radius, self-cleaning */
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("pointerdown", function (e) {
        var r = btn.getBoundingClientRect();
        var size = Math.max(r.width, r.height) * 2.4;
        var ring = document.createElement("span");
        ring.className = "ripple";
        ring.style.width = ring.style.height = size + "px";
        ring.style.left = e.clientX - r.left + "px";
        ring.style.top = e.clientY - r.top + "px";
        ring.addEventListener("animationend", function () {
          ring.remove();
        });
        btn.appendChild(ring);
      });
    });

    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }

    function frame() {
      ticking = false;
      var vh = window.innerHeight;

      var sy = Math.min(window.scrollY / vh, 1.6);
      document.documentElement.style.setProperty("--sy", sy.toFixed(4));

      for (var b = 0; b < mags.length; b++) pullMag(mags[b]);

      for (var i = 0; i < shots.length; i++) {
        var r = shots[i].getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        shots[i].style.setProperty("--p", Math.max(-0.5, Math.min(0.5, p)).toFixed(4));
      }

      if (glow && hasPointer) {
        gx += (tx - gx) * 0.09;
        gy += (ty - gy) * 0.09;
        cx += (tx - cx) * 0.28;
        cy += (ty - cy) * 0.28;
        glow.style.setProperty("--gx", gx.toFixed(1) + "px");
        glow.style.setProperty("--gy", gy.toFixed(1) + "px");
        core.style.setProperty("--cx", cx.toFixed(1) + "px");
        core.style.setProperty("--cy", cy.toFixed(1) + "px");

        var px = tx, py = ty;
        for (var j = 0; j < trail.length; j++) {
          var d = trail[j];
          d.x += (px - d.x) * d.k;
          d.y += (py - d.y) * d.k;
          d.el.style.setProperty("--tx", d.x.toFixed(1) + "px");
          d.el.style.setProperty("--ty", d.y.toFixed(1) + "px");
          px = d.x;
          py = d.y;
        }
        if (Math.abs(tx - gx) > 0.4 || Math.abs(ty - gy) > 0.4) request();
      }
    }

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    frame();
    if (hero) request();
  }

  if (document.readyState !== "loading") initParallax();
  else document.addEventListener("DOMContentLoaded", initParallax);

  /* Card deck. Drag throws the top card; arrows do the same thing for anyone
     not using a mouse, which is why the buttons are real buttons. */
  function initDeck(deckId, statusId, prevId, nextId, noun) {
    var deck = document.getElementById(deckId);
    if (!deck || !window.gsap) return null;
    var gsap = window.gsap;
    var cards = Array.prototype.slice.call(deck.querySelectorAll(".deck__card"));
    var status = document.getElementById(statusId);
    var order = cards.slice();
    var at = 0;

    function layout(animate) {
      order.forEach(function (card, i) {
        var to = {
          zIndex: order.length - i,
          x: 0,
          y: i * 10,
          scale: 1 - i * 0.035,
          rotation: i === 0 ? 0 : (i % 2 ? 1 : -1) * (i * 0.7),
          opacity: i > 3 ? 0 : 1,
          pointerEvents: i === 0 ? "auto" : "none",
          duration: animate ? 0.45 : 0,
          ease: "power3.out",
        };
        gsap.to(card, to);
        card.setAttribute("aria-hidden", i === 0 ? "false" : "true");
        // a scrollable card must be reachable by keyboard (axe: scrollable-region-focusable)
        var scrolls = card.scrollHeight > card.clientHeight + 1;
        if (scrolls && i === 0) {
          // no role: <article> already has one, and role=group is not allowed on it
          card.setAttribute("tabindex", "0");
          card.dataset.more = "true";
        } else {
          card.removeAttribute("tabindex");
          card.removeAttribute("data-more");
        }
      });
      if (status) {
        var label = order[0].querySelector(".deck__name, .quote__who");
        status.textContent =
          noun + " " + (at + 1) + " of " + order.length +
          (label ? ": " + label.textContent : "");
      }
    }

    function cycle(dir) {
      if (dir > 0) order.push(order.shift());
      else order.unshift(order.pop());
      at = (at + dir + order.length) % order.length;
      layout(true);
    }

    function fling(card, dirX) {
      gsap.to(card, {
        x: dirX * (window.innerWidth * 0.7),
        rotation: dirX * 18,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: function () {
          gsap.set(card, { x: 0, rotation: 0, opacity: 1 });
          cycle(1);
        },
      });
    }

    layout(false);

    var next = document.getElementById(nextId);
    var prev = document.getElementById(prevId);
    if (next) next.addEventListener("click", function () { cycle(1); });
    if (prev) prev.addEventListener("click", function () { cycle(-1); });

    /* drag needs Draggable/InertiaPlugin, so it arms after the lazy load;
       arrows and layout above already work without it */
    return function armDraggable() {
      if (reduced || !window.Draggable) return;
      cards.forEach(function (card) {
        window.Draggable.create(card, {
          type: "x",
          inertia: !!window.InertiaPlugin,
          cursor: "grab",
          activeCursor: "grabbing",
          onDrag: function () {
            gsap.set(card, { rotation: this.x / 26 });
          },
          onDragEnd: function () {
            if (Math.abs(this.x) > 110 && order[0] === card) {
              fling(card, this.x > 0 ? 1 : -1);
            } else {
              gsap.to(card, { x: 0, rotation: 0, duration: 0.4, ease: "power3.out" });
            }
          },
        });
      });
    };
  }
  var deckArm = null;
  function initDecks() {
    deckArm = initDeck("deck", "deck-status", "deck-prev", "deck-next", "Card");
  }
  if (document.readyState !== "loading") initDecks();
  else document.addEventListener("DOMContentLoaded", initDecks);

  /* Pointer-only and lazy: thumbs are never fetched until a first hover. */
  function initPeek() {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var tiles = Array.prototype.slice.call(document.querySelectorAll("[data-peek]"));
    if (!tiles.length) return;

    var peek = document.createElement("div");
    peek.className = "peek";
    peek.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    peek.appendChild(img);
    document.body.appendChild(peek);

    var raf = false, px = 0, py = 0;
    function place() {
      raf = false;
      peek.style.setProperty("--px", px + "px");
      peek.style.setProperty("--py", py + "px");
    }

    tiles.forEach(function (tile) {
      tile.addEventListener("pointerenter", function () {
        var src = tile.dataset.peek;
        if (img.getAttribute("src") !== src) img.setAttribute("src", src);
        peek.dataset.on = "true";
      });
      tile.addEventListener("pointerleave", function () {
        peek.dataset.on = "false";
      });
      tile.addEventListener(
        "pointermove",
        function (e) {
          px = e.clientX;
          py = e.clientY;
          if (!raf) {
            raf = true;
            requestAnimationFrame(place);
          }
        },
        { passive: true }
      );
    });
  }

  if (document.readyState !== "loading") initPeek();
  else document.addEventListener("DOMContentLoaded", initPeek);

  function initMotion() {
    if (reduced || !window.gsap) return;
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    var noHover = root.classList.contains("no-hover");
    if (ST) gsap.registerPlugin(ST);

    /* Smooth scroll. smoothTouch stays off: on a phone, hijacking momentum
       fights the platform and always loses. */
    if (window.ScrollSmoother && window.innerWidth > 900) {
      gsap.registerPlugin(window.ScrollSmoother);
      window.ScrollSmoother.create({
        wrapper: "#smooth-wrapper",
        content: "#smooth-content",
        smooth: 1.1,
        effects: false,
        normalizeScroll: false,
        smoothTouch: false,
      });
    }

    /* Center-stage: on no-hover devices the card nearest viewport centre gets
       the same .is-active treatment desktop gives on :hover (see main.css). */
    if (ST && noHover) {
      document.querySelectorAll(".tilt, .case, .lab").forEach(function (el) {
        ST.create({
          trigger: el,
          start: "top 65%",
          end: "bottom 35%",
          onToggle: function (self) {
            el.classList.toggle("is-active", self.isActive);
          },
        });
      });
    }

    /* Velocity skew: decorative shots lean with scroll speed, settle at rest.
       Writes --skew, a plain number; the unit is added in CSS via calc(). */
    if (ST) {
      var skewTo = gsap.quickTo(".case__shot img", "--skew", {
        duration: 0.5,
        ease: "power3",
      });
      ST.create({
        onUpdate: function (self) {
          skewTo(gsap.utils.clamp(-3, 3, self.getVelocity() / -350));
        },
      });
      ST.addEventListener("scrollEnd", function () {
        skewTo(0);
      });
    }

    /* aria:"auto" keeps the headline one sentence for screen readers */
    var head = document.querySelector(".hero .display");
    if (head && window.SplitText) {
      gsap.registerPlugin(window.SplitText);
      var split = new window.SplitText(head, {
        type: "lines",
        linesClass: "line",
        aria: "auto",
      });
      split.lines.forEach(function (line) {
        var mask = document.createElement("span");
        mask.className = "line-mask";
        line.parentNode.insertBefore(mask, line);
        mask.appendChild(line);
      });
      gsap.from(split.lines, {
        yPercent: 108,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        delay: 0.05,
      });
    }

    gsap.utils.toArray(".reveal").forEach(function (el) {
      ST.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () {
          el.classList.add("is-in");
        },
      });
    });

    [".labs", ".ledger", ".scroller__rail", ".skills"].forEach(function (sel) {
      var wrap = document.querySelector(sel);
      if (!wrap) return;
      var kids = wrap.children;
      if (!kids.length) return;
      gsap.from(kids, {
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: "power2.out",
        stagger: 0.06,
        scrollTrigger: { trigger: wrap, start: "top 86%", once: true },
      });
    });

    /* final value is already in the HTML, so failure degrades to the truth */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var decimals = parseInt(el.dataset.decimals || "0", 10);
      var node = el.firstChild;
      if (!node || node.nodeType !== 3 || isNaN(target)) return;

      var trueValue = target.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      /* single source of truth: initLate's rerun reads this back so both
         paths always land on the exact same string */
      el.dataset.trueText = trueValue;

      var box = { v: 0 };
      window.ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: function () {
          gsap.to(box, {
            v: target,
            duration: 1.1,
            ease: "power2.out",
            onUpdate: function () {
              node.nodeValue = box.v.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              });
            },
            onComplete: function () {
              node.nodeValue = trueValue;
            },
          });
        },
      });
    });
  }

  /* Below-the-fold motion: eyebrow scramble, number re-runs, timeline spine,
     typewriter, endorsement chip, arch-diagram draw, and deck drag. All need
     one of the lazy plugins, so this only runs once loadLate() resolves. */
  function initLate() {
    if (reduced || !window.gsap) return;
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    var noHover = root.classList.contains("no-hover");

    /* mono labels only; body copy would read as a gimmick */
    if (window.ScrambleTextPlugin && ST) {
      gsap.utils.toArray(".eyebrow").forEach(function (el) {
        var finalText = el.textContent;
        ST.create({
          trigger: el,
          start: "top 92%",
          once: true,
          onEnter: function () {
            gsap.to(el, {
              duration: 0.9,
              ease: "none",
              scrambleText: {
                text: finalText,
                chars: "upperCase",
                speed: 0.4,
                revealDelay: 0.15,
              },
            });
          },
        });
      });
    }

    /* "re-run the numbers": scrambles then always resolves to the value
       initMotion already computed and stashed in dataset.trueText. Wrapping
       just the digits keeps the suffix span (%, ×) untouched by the scramble. */
    if (window.ScrambleTextPlugin) {
      gsap.utils.toArray("[data-count]").forEach(function (el) {
        var trueValue = el.dataset.trueText;
        var node = el.firstChild;
        if (!trueValue || !node || node.nodeType !== 3) return;

        var numWrap = document.createElement("span");
        el.insertBefore(numWrap, node);
        numWrap.appendChild(node);

        var rerun = function () {
          gsap.to(numWrap, {
            duration: 0.7,
            overwrite: true,
            scrambleText: { text: trueValue, chars: "0123456789", speed: 0.4, revealDelay: 0.1 },
          });
        };

        var ledger = el.closest(".ledger__item, .case__outcome");
        if (ledger) {
          if (!noHover) ledger.addEventListener("mouseenter", rerun);
          ledger.addEventListener("pointerdown", function (e) {
            if (e.pointerType !== "mouse") rerun();
          });
          var btn = ledger.querySelector(".rerun");
          if (btn) btn.addEventListener("click", rerun);
        }
      });
    }

    /* timeline spine draws down, nodes pop as it passes them */
    var tl = document.querySelector(".tl");
    if (tl && window.DrawSVGPlugin && ST) {
      var spine = tl.querySelector(".tl__spine line");
      var nodes = tl.querySelectorAll(".tl__node");
      gsap.set(spine, { drawSVG: "0%" });
      gsap.set(nodes, { scale: 0, transformOrigin: "center" });
      var t2 = gsap.timeline({
        scrollTrigger: { trigger: tl, start: "top 74%", once: true },
      });
      t2.to(spine, { drawSVG: "100%", duration: 1, ease: "power2.inOut" })
        .to(nodes, { scale: 1, duration: 0.35, stagger: 0.18, ease: "back.out(2)" }, 0.15);
    }

    /* typewriter on the availability line: it is the one bit of copy that is
       a live status rather than a fact */
    var type = document.querySelector("[data-type]");
    if (type && window.TextPlugin && ST) {
      var msg = type.dataset.type;
      type.textContent = "";
      gsap.to(type, {
        text: { value: msg, delimiter: "" },
        duration: msg.length * 0.035,
        ease: "none",
        delay: 0.9,
        scrollTrigger: { trigger: type, start: "top 95%", once: true },
      });
    }

    /* endorsement chips cycle through the words real clients picked on Upwork */
    var chip = document.getElementById("chip");
    if (chip && window.TextPlugin && ST) {
      var words = JSON.parse(chip.dataset.words || "[]");
      if (words.length) {
        var loop = gsap.timeline({
          repeat: -1,
          scrollTrigger: { trigger: chip, start: "top 92%" },
        });
        words.forEach(function (w) {
          loop
            .to(chip, { text: { value: w, delimiter: "" }, duration: 0.45, ease: "none" })
            .to({}, { duration: 1.6 });
        });
      }
    }

    /* edges draw in the direction traffic flows */
    var arch = document.querySelector(".arch svg");
    if (arch && ST) {
      var groups = arch.querySelectorAll(".arch-anim");
      var edges = arch.querySelectorAll(".arch-edge");

      gsap.set(groups, { opacity: 0, y: 8 });
      if (window.DrawSVGPlugin) gsap.set(edges, { drawSVG: "0%" });

      ST.create({
        trigger: arch,
        start: "top 78%",
        once: true,
        onEnter: function () {
          var archTl = gsap.timeline();
          archTl.to(groups, {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.06,
            ease: "power2.out",
          });
          if (window.DrawSVGPlugin) {
            archTl.to(
              edges,
              {
                drawSVG: "100%",
                duration: 0.5,
                stagger: 0.05,
                ease: "power1.inOut",
              },
              "-=0.25"
            );
          }
        },
      });
    }

    if (deckArm) deckArm();
  }

  /* Rail scrollspy. Runs regardless of reduced-motion: knowing where you are
     is information. Uses IntersectionObserver, not a scroll handler. */
  function initRail() {
    var rail = document.getElementById("rail");
    if (!rail || !("IntersectionObserver" in window)) return;
    var links = Array.prototype.slice.call(rail.querySelectorAll("a"));
    var seen = {};

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          seen[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
        });
        var best = null, top = 0;
        Object.keys(seen).forEach(function (id) {
          if (seen[id] > top) {
            top = seen[id];
            best = id;
          }
        });
        links.forEach(function (a) {
          var on = best && a.getAttribute("href") === "#" + best;
          if (on) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      },
      { threshold: [0, 0.15, 0.4, 0.75], rootMargin: "-15% 0px -35% 0px" }
    );
    links.forEach(function (a) {
      var el = document.querySelector(a.getAttribute("href"));
      if (el) io.observe(el);
    });

    /* ScrollSmoother owns the scroll position, so a native anchor jump would
       fight it. Hand off to the smoother when it exists; otherwise let the
       browser do what it already does well. */
    rail.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var s = window.ScrollSmoother && window.ScrollSmoother.get();
      if (!s) return;
      e.preventDefault();
      s.scrollTo(a.getAttribute("href"), true, "top 80px");
    });
  }
  if (document.readyState !== "loading") initRail();
  else document.addEventListener("DOMContentLoaded", initRail);

  /* SplitText measures line breaks, so it must wait for the real font metrics.
     armLate() itself only arms listeners; the actual lazy load waits for
     scroll, pointerdown, or idle, so it never competes with first paint. */
  function initMotionAndArm() {
    initMotion();
    armLate();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(initMotionAndArm);
  else if (document.readyState !== "loading") initMotionAndArm();
  else document.addEventListener("DOMContentLoaded", initMotionAndArm);

  /* Client-side only. pdf-lib is 513KB, fetched only on first build. */
  var drop = document.getElementById("drop");
  var input = document.getElementById("files");
  var thumbs = document.getElementById("thumbs");
  var out = document.getElementById("out");
  var make = document.getElementById("make");
  var clear = document.getElementById("clear");

  if (drop && input && thumbs && out && make && clear) {
    var picked = [];
    var libPromise = null;

    function loadLib() {
      if (libPromise) return libPromise;
      libPromise = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "assets/js/pdf-lib.min.js";
        s.onload = function () {
          resolve(window.PDFLib);
        };
        s.onerror = function () {
          reject(new Error("Could not load the PDF library."));
        };
        document.head.appendChild(s);
      });
      return libPromise;
    }

    function say(msg, good) {
      out.innerHTML = good ? "<b>" + msg + "</b>" : msg;
    }

    function render() {
      thumbs.textContent = "";
      picked.forEach(function (file, i) {
        var li = document.createElement("li");
        li.className = "thumb";

        var img = document.createElement("img");
        img.alt = "Page " + (i + 1) + ": " + file.name;
        img.src = URL.createObjectURL(file);
        img.onload = function () {
          URL.revokeObjectURL(img.src);
        };

        var rm = document.createElement("button");
        rm.type = "button";
        rm.textContent = "×";
        rm.setAttribute("aria-label", "Remove " + file.name);
        rm.addEventListener("click", function () {
          picked.splice(i, 1);
          render();
        });

        li.append(img, rm);
        thumbs.appendChild(li);
      });

      make.disabled = picked.length === 0;
      clear.hidden = picked.length === 0;
      say(
        picked.length
          ? picked.length + (picked.length === 1 ? " image ready" : " images ready") +
              " · nothing has left this device"
          : ""
      );
    }

    function add(list) {
      var imgs = Array.prototype.filter.call(list, function (f) {
        return /^image\/(png|jpeg|webp)$/.test(f.type);
      });
      var rejected = list.length - imgs.length;
      picked = picked.concat(imgs);
      render();
      if (rejected > 0) {
        say(rejected + " file(s) skipped. PNG, JPEG and WebP only.");
      }
    }

    input.addEventListener("change", function () {
      add(input.files);
      input.value = "";
    });

    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.setAttribute("data-over", "true");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) {
        e.preventDefault();
        drop.setAttribute("data-over", "false");
      });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files);
    });

    clear.addEventListener("click", function () {
      picked = [];
      render();
    });

    make.addEventListener("click", async function () {
      if (!picked.length) return;
      make.disabled = true;
      say("Loading the PDF engine…");

      try {
        var PDFLib = await loadLib();
        say("Building…");

        var doc = await PDFLib.PDFDocument.create();

        for (var i = 0; i < picked.length; i++) {
          var file = picked[i];
          var bytes = new Uint8Array(await file.arrayBuffer());
          var image;

          if (file.type === "image/png") {
            image = await doc.embedPng(bytes);
          } else if (file.type === "image/jpeg") {
            image = await doc.embedJpg(bytes);
          } else {
            // pdf-lib has no WebP path
            image = await doc.embedPng(await webpToPng(file));
          }

          var page = doc.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }

        var blob = new Blob([await doc.save()], { type: "application/pdf" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "images.pdf";
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);

        say(
          picked.length +
            "-page PDF built in your browser · " +
            Math.round(blob.size / 1024) +
            "KB · 0 bytes uploaded",
          true
        );
      } catch (err) {
        say("That did not work: " + err.message);
      } finally {
        make.disabled = picked.length === 0;
      }
    });

    function webpToPng(file) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          c.toBlob(function (b) {
            if (!b) return reject(new Error("Could not convert that WebP."));
            b.arrayBuffer().then(function (buf) {
              resolve(new Uint8Array(buf));
            }, reject);
          }, "image/png");
          URL.revokeObjectURL(img.src);
        };
        img.onerror = function () {
          reject(new Error("Could not read that image."));
        };
        img.src = URL.createObjectURL(file);
      });
    }
  }
})();
