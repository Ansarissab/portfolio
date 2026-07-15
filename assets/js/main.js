/* =========================================================================
   Muhammad Zahid - portfolio behaviour
   CSS owns presentation. This file owns behaviour only.
   Nothing here is required to read the page: all content ships in the HTML.
   ========================================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- footer year ---------------- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ---------------- theme ---------------------- */
  var toggle = document.getElementById("theme");

  /* Dark unless the visitor explicitly chose otherwise. Matches the CSS. */
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

  if (toggle) {
    paint(current());
    toggle.addEventListener("click", function () {
      paint(current() === "dark" ? "light" : "dark");
    });
  }

  /* ---------------- reading progress ----------
     Not gated on reduced-motion: a bar tracking the scrollbar is information,
     not animation. Writes one custom property; CSS owns the rest. */
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

  /* ---------------- sticky header shadow ------- */
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

  /* =======================================================================
     Parallax + pointer.
     One rAF loop drives everything. Listeners are passive and only ever write
     CSS custom properties - CSS owns what those properties mean, so the whole
     effect can be disabled from a stylesheet.
     ======================================================================= */
  function initParallax() {
    if (reduced) return;

    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var body = document.body;

    var field = document.createElement("div");
    field.className = "field";
    field.setAttribute("aria-hidden", "true");
    body.prepend(field);

    var glow = null;
    if (fine) {
      glow = document.createElement("div");
      glow.className = "glow";
      glow.setAttribute("aria-hidden", "true");
      body.prepend(glow);
    }

    var shots = Array.prototype.slice.call(document.querySelectorAll(".case__shot"));
    var hero = document.querySelector(".hero");
    var mags = fine
      ? Array.prototype.slice.call(document.querySelectorAll(".hero .btn"))
      : [];

    /* Magnetic buttons. The element leans toward the cursor while it is within
       a radius, then springs back. Capped at 8px: enough to feel alive, small
       enough that the hit target never runs away from the pointer. */
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

    // pointer state: target vs rendered, so the glow eases rather than snaps
    var tx = 0, ty = 0, gx = 0, gy = 0, hasPointer = false;
    var ticking = false;

    if (fine) {
      window.addEventListener(
        "pointermove",
        function (e) {
          tx = e.clientX;
          ty = e.clientY;
          if (!hasPointer) {
            hasPointer = true;
            gx = tx;
            gy = ty;
            glow.setAttribute("data-on", "true");
          }
          request();
        },
        { passive: true }
      );
      document.addEventListener("pointerleave", function () {
        glow.setAttribute("data-on", "false");
        hasPointer = false;
      });

      // per-tile cursor wash. Cheap: two custom props, no layout read on move.
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
    }

    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    }

    function frame() {
      ticking = false;
      var vh = window.innerHeight;

      // hero + grid drift, normalised 0..1 over the first viewport
      var sy = Math.min(window.scrollY / vh, 1.6);
      document.documentElement.style.setProperty("--sy", sy.toFixed(4));

      // magnetic buttons: pull toward the cursor while it is near
      for (var b = 0; b < mags.length; b++) pullMag(mags[b]);

      // screenshot drift: -0.5 entering, +0.5 leaving
      for (var i = 0; i < shots.length; i++) {
        var r = shots[i].getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        shots[i].style.setProperty("--p", Math.max(-0.5, Math.min(0.5, p)).toFixed(4));
      }

      // glow eases toward the cursor
      if (glow && hasPointer) {
        gx += (tx - gx) * 0.12;
        gy += (ty - gy) * 0.12;
        glow.style.setProperty("--gx", gx.toFixed(1) + "px");
        glow.style.setProperty("--gy", gy.toFixed(1) + "px");
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

  /* =======================================================================
     Hover-to-reveal. Hovering a feature-work tile floats that client's actual
     site next to the cursor. It is evidence, not decoration, which is the only
     reason it earns the bytes. Pointer-only and lazy: the images are never
     fetched on a touch device or by a visitor who does not hover anything.
     ======================================================================= */
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

  /* ---------------- motion: GSAP --------------- */
  function initMotion() {
    if (reduced || !window.gsap) return;
    var gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    /* reveals */
    gsap.utils.toArray(".reveal").forEach(function (el) {
      window.ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () {
          el.classList.add("is-in");
        },
      });
    });

    /* count-ups. The final value is already in the HTML, so a failure here
       degrades to the correct number rather than to zero. */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var decimals = parseInt(el.dataset.decimals || "0", 10);
      var node = el.firstChild; // the text node holding the number
      if (!node || node.nodeType !== 3 || isNaN(target)) return;

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
              node.nodeValue = target.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              });
            },
          });
        },
      });
    });

    /* architecture diagram assembles on scroll */
    var arch = document.querySelector(".arch svg");
    if (arch) {
      var groups = arch.querySelectorAll(".arch-anim");
      gsap.set(groups, { opacity: 0, y: 8 });
      window.ScrollTrigger.create({
        trigger: arch,
        start: "top 78%",
        once: true,
        onEnter: function () {
          gsap.to(groups, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.07,
            ease: "power2.out",
          });
        },
      });
    }
  }

  /* GSAP is deferred; wait for it without blocking first paint. */
  if (document.readyState !== "loading") initMotion();
  else document.addEventListener("DOMContentLoaded", initMotion);

  /* =======================================================================
     Live demo: images -> PDF, entirely client-side.
     pdf-lib is 525KB, so it is fetched only once you actually pick a file.
     ======================================================================= */
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
            // pdf-lib has no WebP path: transcode to PNG via canvas first.
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
