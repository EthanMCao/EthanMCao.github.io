/* =====================================================================
   PHOTO — Photo Editing & Compositing page behaviour
   - Before/After comparison sliders (mouse + touch + keyboard)
   - Live Filter Lab (synthesised scene on canvas + live CSS filters,
     presets, reset, export PNG, vignette + grain toggle)
   All vanilla JS. Null-guarded. No external deps.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. BEFORE / AFTER COMPARISON SLIDERS
   * ------------------------------------------------------------------ */
  function initCompare(root) {
    var top = root.querySelector('.pho-cmp-top');
    var handle = root.querySelector('.pho-cmp-handle');
    if (!top || !handle) return;

    var pos = 50; // percent
    var dragging = false;

    function apply(p) {
      pos = Math.max(0, Math.min(100, p));
      // clip the "after" (top) layer from the right so the "before" shows
      top.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      handle.style.left = pos + '%';
      handle.setAttribute('aria-valuenow', Math.round(pos));
    }

    function fromClientX(clientX) {
      var rect = root.getBoundingClientRect();
      if (rect.width <= 0) return pos;
      return ((clientX - rect.left) / rect.width) * 100;
    }

    var caption = root.querySelector('.pho-cmp-cap');

    function onDown(e) {
      // Ignore presses that start on the caption (it holds tool badges)
      if (caption && e.target && caption.contains(e.target)) return;
      dragging = true;
      root.classList.add('is-dragging');
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      apply(fromClientX(x));
      // For touch, don't preventDefault here — that would cancel the page's
      // vertical scroll gesture. We only claim the gesture once it moves
      // horizontally (handled in onMove). Mouse can prevent immediately.
      if (!e.touches && e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      apply(fromClientX(x));
      if (e.touches && e.cancelable) e.preventDefault();
    }
    function onUp() {
      dragging = false;
      root.classList.remove('is-dragging');
    }

    // Pointer / mouse / touch on the whole frame
    root.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    root.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    // Keyboard on the handle (it is a slider role)
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { apply(pos - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { apply(pos + step); e.preventDefault(); }
      else if (e.key === 'Home') { apply(0); e.preventDefault(); }
      else if (e.key === 'End') { apply(100); e.preventDefault(); }
    });

    apply(pos);
  }

  document.querySelectorAll('.pho-cmp').forEach(initCompare);

  /* ------------------------------------------------------------------ *
   * 2. LIVE FILTER LAB
   * ------------------------------------------------------------------ */
  var canvas = document.getElementById('pho-lab-canvas');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;

    // --- Synthesised "photograph": a coastal golden-hour scene ---------
    // Draw once into an offscreen buffer; the lab re-applies filters over it.
    var scene = document.createElement('canvas');
    scene.width = W; scene.height = H;
    var sctx = scene.getContext('2d');

    function lerp(a, b, t) { return a + (b - a) * t; }

    function drawScene(c) {
      c.clearRect(0, 0, W, H);

      // Sky gradient (warm golden hour)
      var sky = c.createLinearGradient(0, 0, 0, H * 0.66);
      sky.addColorStop(0.00, '#2a3a6b');
      sky.addColorStop(0.32, '#6a6fb0');
      sky.addColorStop(0.58, '#e88a73');
      sky.addColorStop(0.80, '#ffc07a');
      sky.addColorStop(1.00, '#ffe6b0');
      c.fillStyle = sky;
      c.fillRect(0, 0, W, H * 0.7);

      // Soft sun glow
      var sunX = W * 0.70, sunY = H * 0.40;
      var glow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, W * 0.42);
      glow.addColorStop(0, 'rgba(255,247,220,0.95)');
      glow.addColorStop(0.18, 'rgba(255,228,170,0.7)');
      glow.addColorStop(0.5, 'rgba(255,180,120,0.18)');
      glow.addColorStop(1, 'rgba(255,180,120,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, W, H);

      // Sun disc
      c.beginPath();
      c.arc(sunX, sunY, W * 0.045, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,250,235,0.96)';
      c.fill();

      // Drifting clouds (soft translucent blobs)
      function cloud(cx, cy, s, a) {
        c.save();
        c.globalAlpha = a;
        c.fillStyle = '#fff1dc';
        for (var i = 0; i < 6; i++) {
          var ox = (i - 2.5) * s * 0.7;
          var r = s * (0.55 + Math.sin(i * 1.7) * 0.22);
          c.beginPath();
          c.ellipse(cx + ox, cy + Math.sin(i) * s * 0.18, r, r * 0.62, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
      cloud(W * 0.22, H * 0.20, 34, 0.42);
      cloud(W * 0.55, H * 0.14, 26, 0.30);
      cloud(W * 0.84, H * 0.24, 30, 0.34);

      // Distant mountain ridges (layered for depth/haze)
      function ridge(baseY, amp, color, alpha, seed) {
        c.save();
        c.globalAlpha = alpha;
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(0, H);
        for (var x = 0; x <= W; x += 8) {
          var y = baseY
            + Math.sin(x * 0.012 + seed) * amp
            + Math.sin(x * 0.041 + seed * 2) * amp * 0.4;
          c.lineTo(x, y);
        }
        c.lineTo(W, H);
        c.closePath();
        c.fill();
        c.restore();
      }
      ridge(H * 0.52, 22, '#8a6f86', 0.55, 1.2);
      ridge(H * 0.58, 18, '#6a5570', 0.7, 3.1);
      ridge(H * 0.63, 14, '#4a3c58', 0.85, 5.4);

      // Water — reflective gradient lower third
      var seaTop = H * 0.66;
      var sea = c.createLinearGradient(0, seaTop, 0, H);
      sea.addColorStop(0, '#caa06f');
      sea.addColorStop(0.18, '#9d7e7d');
      sea.addColorStop(0.5, '#3f4a6e');
      sea.addColorStop(1, '#161c33');
      c.fillStyle = sea;
      c.fillRect(0, seaTop, W, H - seaTop);

      // Sun reflection shimmer on water
      c.save();
      for (var k = 0; k < 60; k++) {
        var ry = lerp(seaTop + 6, H - 6, k / 60);
        var spread = lerp(8, W * 0.22, (k / 60));
        var rx = sunX + (Math.sin(k * 2.3) * spread);
        var rw = lerp(40, 6, k / 60);
        c.globalAlpha = lerp(0.5, 0.04, k / 60) * (0.5 + Math.random() * 0.5);
        c.fillStyle = '#ffe9bf';
        c.fillRect(rx - rw / 2, ry, rw, 2.2);
      }
      c.restore();

      // Foreground silhouette rocks for depth
      c.save();
      c.fillStyle = '#0c0f1c';
      c.globalAlpha = 0.96;
      c.beginPath();
      c.moveTo(0, H);
      c.lineTo(0, H * 0.86);
      c.bezierCurveTo(W * 0.14, H * 0.80, W * 0.24, H * 0.94, W * 0.34, H * 0.9);
      c.bezierCurveTo(W * 0.4, H * 0.88, W * 0.42, H, W * 0.42, H);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(W, H);
      c.lineTo(W, H * 0.88);
      c.bezierCurveTo(W * 0.86, H * 0.83, W * 0.78, H * 0.96, W * 0.66, H * 0.92);
      c.bezierCurveTo(W * 0.6, H * 0.9, W * 0.58, H, W * 0.58, H);
      c.closePath();
      c.fill();
      c.restore();

      // Tiny birds
      c.save();
      c.strokeStyle = 'rgba(30,24,40,0.7)';
      c.lineWidth = 1.6;
      var birds = [[0.34, 0.18], [0.40, 0.22], [0.46, 0.16], [0.30, 0.24]];
      birds.forEach(function (b) {
        var bx = W * b[0], by = H * b[1], bs = 7;
        c.beginPath();
        c.moveTo(bx - bs, by);
        c.quadraticCurveTo(bx, by - bs * 0.7, bx + 0, by);
        c.quadraticCurveTo(bx + 0, by - bs * 0.7, bx + bs, by);
        c.stroke();
      });
      c.restore();

      // Subtle film grain baked into base (very light)
      var img = c.getImageData(0, 0, W, H);
      var d = img.data;
      for (var p = 0; p < d.length; p += 4) {
        var n = (Math.random() - 0.5) * 10;
        d[p] += n; d[p + 1] += n; d[p + 2] += n;
      }
      c.putImageData(img, 0, 0);
    }

    drawScene(sctx);

    // --- Controls ------------------------------------------------------
    var defaults = {
      brightness: 100, contrast: 100, saturate: 100,
      hue: 0, blur: 0, vignette: true, grain: false, sepia: 0
    };
    var state = Object.assign({}, defaults);

    var sliders = {
      brightness: document.getElementById('pho-brightness'),
      contrast: document.getElementById('pho-contrast'),
      saturate: document.getElementById('pho-saturate'),
      hue: document.getElementById('pho-hue'),
      blur: document.getElementById('pho-blur'),
      sepia: document.getElementById('pho-sepia')
    };
    var outputs = {
      brightness: document.getElementById('pho-brightness-val'),
      contrast: document.getElementById('pho-contrast-val'),
      saturate: document.getElementById('pho-saturate-val'),
      hue: document.getElementById('pho-hue-val'),
      blur: document.getElementById('pho-blur-val'),
      sepia: document.getElementById('pho-sepia-val')
    };
    var vignetteToggle = document.getElementById('pho-vignette');
    var grainToggle = document.getElementById('pho-grain');

    function filterString() {
      return 'brightness(' + (state.brightness / 100) + ') ' +
             'contrast(' + (state.contrast / 100) + ') ' +
             'saturate(' + (state.saturate / 100) + ') ' +
             'sepia(' + (state.sepia / 100) + ') ' +
             'hue-rotate(' + state.hue + 'deg) ' +
             'blur(' + state.blur + 'px)';
    }

    // grain overlay buffer (regenerated occasionally for animation feel)
    var grainBuf = document.createElement('canvas');
    grainBuf.width = W; grainBuf.height = H;
    var gctx = grainBuf.getContext('2d');
    function buildGrain() {
      var g = gctx.createImageData(W, H);
      var gd = g.data;
      for (var i = 0; i < gd.length; i += 4) {
        var v = Math.random() * 255;
        gd[i] = gd[i + 1] = gd[i + 2] = v;
        gd[i + 3] = Math.random() * 38; // sparse
      }
      gctx.putImageData(g, 0, 0);
    }

    function render() {
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.filter = filterString();
      ctx.drawImage(scene, 0, 0);
      ctx.filter = 'none';

      if (state.vignette) {
        var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.62);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(0.7, 'rgba(0,0,0,0.05)');
        vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      if (state.grain) {
        buildGrain();
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(grainBuf, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function syncUI() {
      for (var key in sliders) {
        if (!sliders[key]) continue;
        sliders[key].value = state[key];
        if (outputs[key]) {
          var suffix = key === 'hue' ? '°' : (key === 'blur' ? 'px' : '%');
          outputs[key].textContent = state[key] + suffix;
        }
      }
      if (vignetteToggle) {
        vignetteToggle.setAttribute('aria-pressed', String(state.vignette));
        vignetteToggle.classList.toggle('is-on', state.vignette);
      }
      if (grainToggle) {
        grainToggle.setAttribute('aria-pressed', String(state.grain));
        grainToggle.classList.toggle('is-on', state.grain);
      }
    }

    // Wire sliders
    Object.keys(sliders).forEach(function (key) {
      var el = sliders[key];
      if (!el) return;
      el.addEventListener('input', function () {
        state[key] = parseFloat(el.value);
        if (outputs[key]) {
          var suffix = key === 'hue' ? '°' : (key === 'blur' ? 'px' : '%');
          outputs[key].textContent = el.value + suffix;
        }
        render();
      });
    });

    if (vignetteToggle) {
      vignetteToggle.addEventListener('click', function () {
        state.vignette = !state.vignette;
        syncUI(); render();
      });
    }
    if (grainToggle) {
      grainToggle.addEventListener('click', function () {
        state.grain = !state.grain;
        syncUI(); render();
      });
    }

    // Presets
    var presets = {
      teal: { brightness: 104, contrast: 118, saturate: 124, hue: -8, blur: 0, sepia: 8, vignette: true, grain: false },
      film: { brightness: 108, contrast: 88, saturate: 78, hue: 6, blur: 0.4, sepia: 22, vignette: true, grain: true },
      noir: { brightness: 102, contrast: 134, saturate: 0, hue: 0, blur: 0, sepia: 0, vignette: true, grain: true },
      golden: { brightness: 110, contrast: 106, saturate: 138, hue: 14, blur: 0, sepia: 16, vignette: false, grain: false }
    };

    document.querySelectorAll('.pho-preset[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = presets[btn.getAttribute('data-preset')];
        if (!p) return;
        state = Object.assign({}, defaults, p);
        document.querySelectorAll('.pho-preset').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        syncUI(); render();
      });
    });

    // Reset
    var resetBtn = document.getElementById('pho-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state = Object.assign({}, defaults);
        document.querySelectorAll('.pho-preset').forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        syncUI(); render();
      });
    }

    // Export PNG
    var exportBtn = document.getElementById('pho-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        render(); // ensure latest
        try {
          var url = canvas.toDataURL('image/png');
          var a = document.createElement('a');
          a.href = url;
          a.download = 'ethan-cao-grade.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          // toDataURL can throw if tainted; our canvas is clean, but guard anyway
        }
      });
    }

    syncUI();
    render();
  }
})();
