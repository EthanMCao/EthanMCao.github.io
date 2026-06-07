/* =====================================================================
   pixel.js — Pixel Art & Animation page
   - A tiny pixel RENDERER (palette key 2D arrays -> upscaled canvas)
   - Gallery sprites (Vela idle, item set, environment strip, enemy)
   - Vela walk-cycle player (frame strip + looping animation)
   - A live pixel EDITOR (pencil / eraser / fill / eyedropper / clear,
     palette swatches, grid toggle, export PNG, mouse + touch)
   Vanilla JS, null-guarded, no console errors.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1.  COHESIVE ~16-COLOUR PALETTE  (warm/cool, on-brand)
   * ------------------------------------------------------------------ */
  var PAL = {
    '.': null,          // transparent
    'k': '#241a26',     // outline / darkest
    'd': '#3a2a40',     // deep shadow
    'p': '#ff5e7d',     // coral (Vela body)
    'o': '#ff8a5c',     // warm orange (body light)
    'r': '#ff9a6a',     // head light
    'm': '#ffb38a',     // soft peach hilite
    'c': '#fff3e8',     // cream (face / belly / tail tip)
    'e': '#ffe9d6',     // cream shadow
    'n': '#3a2a33',     // nose dark
    'b': '#ff7a8f',     // blush pink
    't': '#2ee6c4',     // teal (scarf / accents)
    'T': '#27c9b0',     // teal shadow
    'v': '#8b6cff',     // violet accent
    'a': '#ffc24b',     // amber (coin / gem)
    'w': '#f5f6fa',     // white catchlight / highlight
    'g': '#2a3a3a',     // dark inner ear / foliage shadow
    'G': '#2e6f5e',     // foliage mid
    'L': '#3fae8a',     // foliage light
    's': '#4a5570',     // stone / metal mid
    'S': '#6c7a99',     // stone / metal light
    'u': '#1b1e2b',     // panel dark (bg blocks)
    'U': '#232737',     // panel light (bg blocks)
    'B': '#4aa8ff'      // blue (potion / gem)
  };

  /* ------------------------------------------------------------------ *
   * 2.  RENDERER — draw a sprite (array of equal-length strings)
   *     onto a canvas, scaled up, pixelated.
   * ------------------------------------------------------------------ */
  function spriteSize(sprite) {
    var h = sprite.length;
    var w = 0;
    for (var i = 0; i < h; i++) { if (sprite[i].length > w) w = sprite[i].length; }
    return { w: w, h: h };
  }

  function drawSprite(canvas, sprite, opts) {
    if (!canvas || !canvas.getContext || !sprite || !sprite.length) return;
    opts = opts || {};
    var size = spriteSize(sprite);
    var scale = opts.scale || 12;
    var pad = opts.pad || 0;          // padding in source pixels
    var pal = opts.palette || PAL;
    var W = (size.w + pad * 2) * scale;
    var H = (size.h + pad * 2) * scale;

    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, W, H); }

    for (var y = 0; y < size.h; y++) {
      var row = sprite[y];
      for (var x = 0; x < row.length; x++) {
        var key = row[x];
        var col = pal[key];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 3.  SPRITE DATA
   * ------------------------------------------------------------------ */

  /* --- Vela idle: 16x16 fox, teal scarf, cream face, big ears -------
     Each row is EXACTLY 16 chars. Legend:
     k outline · g dark inner-ear · p coral body · o body light · r head light
     c cream face/belly · e cream shadow · w catchlight · n nose · b blush
     t/T teal scarf  · . transparent                                       */
  var VELA_IDLE = [
    '..k........k....',
    '..kgk....kgk....',
    '..kgpk..kpgk....',
    '..kpopkkpopk....',
    '..kporooropk....',
    '.krocccccccrk...',
    '.krockccckcor...',
    '.krckwccwkcor...',
    '.krcbcncbccor...',
    '.krccennecor....',
    '..kcceeecck.....',
    '..tTtTtTtTtTt...',
    '..kTtTtTtTtTk...',
    '..kpoporopopk...',
    '..kpk....kpk....',
    '..kk......kk....'
  ];

  /* --- Item set: small sprites packed for the item card ------------ */
  var ITEM_COIN = [
    '..kkkk..',
    '.kaawak.',
    'kawaaack',
    'kaaaaack',
    'kaaaaack',
    'kacaaack',
    '.kaaaak.',
    '..kkkk..'
  ];
  var ITEM_POTION = [
    '...kk...',
    '..kSSk..',
    '..kssk..',
    '.kBBBBk.',
    'kBBwBBBk',
    'kBBBBBBk',
    'kBtBBBBk',
    '.kBBBBk.',
    '..kkkk..'
  ];
  var ITEM_SWORD = [
    '......kk',
    '.....kSk',
    '....kSwk',
    '...kSwk.',
    '..kSwk..',
    '.kSwk...',
    'katk....',
    'kaaSk...',
    '.kak....',
    '..k.....'
  ];
  var ITEM_GEM = [
    '..kkk...',
    '.ktTtk..',
    'ktwttTk.',
    'ktttttTk',
    '.ktttTk.',
    '..ktTk..',
    '...kk...'
  ];

  /* --- Environment / parallax strip: hills, tree, stone path ------- */
  var ENV_STRIP = [
    'UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU',
    'UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU',
    'UUUUUUUvUUUUUUUUUUUUUUUUUUUvUUUU',
    'UUUUUUUUUUUUUUUUUUaUUUUUUUUUUUUU',
    'UUUUUUUUUUUUUUUUUaaaUUUUUUUUUUUU',
    'UUUUUUUUUUUUUUUUUUaUUUUUUUUUUUUU',
    'uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
    'uuuuuuGGGGuuuuuuuuuuuuuuuuuuuuuu',
    'uuuuuGGLGGGuuuuuuuuuuugGGguuuuuu',
    'uuuuGGLLGGGGuuuuuuuugGGLLGguuuuu',
    'uuuuGGGGGGGGuGuuuuuugGLLLLGguuuu',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GLLGGGGLLGGGGGGLLGGGGGLLGGGGLLGG',
    'GGGGGsGGGGGsGGGGGGsGGGGGGsGGGGGG',
    'GGGGGSGGGGGSGGGGGGSGGGGGGSGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ];

  /* --- Enemy / NPC: a floating sky-slime creature (violet) ---------
     12x12. k outline · v violet body · w eye highlight · b blush · . empty */
  var ENEMY = [
    '..k......k..',
    '.kvk....kvk.',
    'kvvvkkkkvvvk',
    'kvvvvvvvvvvk',
    'kvwkvvvvkwvk',
    'kvwkvvvvkwvk',
    'kvvvvvvvvvvk',
    'kvbvvvvvvbvk',
    '.kvvvvvvvvk.',
    '..kvkvkvkk..',
    '..k.k.k.k...',
    '............'
  ];

  /* ------------------------------------------------------------------ *
   * 4.  VELA WALK CYCLE — 4 hand-built frames, each EXACTLY 16x16.
   *     A side-on fox: head left, tail right, two legs swinging,
   *     teal scarf streaming, gentle body bob. Legend matches PAL.
   *     y tail-tip cream uses 'c'; tail body uses 'o'/'p'.
   * ------------------------------------------------------------------ */
  // Frame 1 — contact, front leg forward
  var WALK_0 = [
    '................',
    '..kk.......kpk..',
    '.kgpk....kpopok.',
    '.kpopk..kpoooek.',
    '.kpooekkpoooek..',
    '.krcccoooooek...',
    '.kcwccoooooek...',
    '.kcbccooooek....',
    '.kcnccoooek.....',
    '.kceeccoek......',
    '.ttTtTtTt.......',
    '.kpoporopk......',
    '..kpk.kpk.......',
    '..kpk..kpk......',
    '..kk....kk......',
    '................'
  ];
  // Frame 2 — passing, legs gathered, body lifts
  var WALK_1 = [
    '..kk.......kpk..',
    '.kgpk....kpopok.',
    '.kpopk..kpoooek.',
    '.kpooekkpoooek..',
    '.krcccoooooek...',
    '.kcwccoooooek...',
    '.kcbccooooek....',
    '.kcnccoooek.....',
    '.kceeccoek......',
    '..ttTtTtTt......',
    '..kpoporopk.....',
    '...kpkkpk.......',
    '...kpkkpk.......',
    '...kk..kk.......',
    '................',
    '................'
  ];
  // Frame 3 — contact, back leg forward (mirror of stride)
  var WALK_2 = [
    '................',
    '..kk.......kpk..',
    '.kgpk....kpopok.',
    '.kpopk..kpoooek.',
    '.kpooekkpoooek..',
    '.krcccoooooek...',
    '.kcwccoooooek...',
    '.kcbccooooek....',
    '.kcnccoooek.....',
    '.kceeccoek......',
    '.ttTtTtTt.......',
    '.kpoporopk......',
    '...kpk.kpk......',
    '..kpk...kpk.....',
    '..kk.....kk.....',
    '................'
  ];
  // Frame 4 — passing (other side), body lifts
  var WALK_3 = [
    '..kk.......kpk..',
    '.kgpk....kpopok.',
    '.kpopk..kpoooek.',
    '.kpooekkpoooek..',
    '.krcccoooooek...',
    '.kcwccoooooek...',
    '.kcbccooooek....',
    '.kcnccoooek.....',
    '.kceeccoek......',
    '..ttTtTtTt......',
    '..kpoporopk.....',
    '...kpkkpk.......',
    '...kpkkpk.......',
    '...kk..kk.......',
    '................',
    '................'
  ];
  var WALK = [WALK_0, WALK_1, WALK_2, WALK_3];

  /* ------------------------------------------------------------------ *
   * 5.  RENDER STATIC SPRITES into the page
   * ------------------------------------------------------------------ */
  function byId(id) { return document.getElementById(id); }

  drawSprite(byId('pix-cv-vela'), VELA_IDLE, { scale: 22, pad: 2 });
  drawSprite(byId('pix-cv-vela2'), VELA_IDLE, { scale: 16, pad: 2 });
  drawSprite(byId('pix-cv-enemy'), ENEMY, { scale: 26, pad: 3 });
  drawSprite(byId('pix-cv-env'), ENV_STRIP, { scale: 14, pad: 0 });

  drawSprite(byId('pix-cv-coin'), ITEM_COIN, { scale: 18, pad: 2 });
  drawSprite(byId('pix-cv-potion'), ITEM_POTION, { scale: 18, pad: 2 });
  drawSprite(byId('pix-cv-sword'), ITEM_SWORD, { scale: 18, pad: 2 });
  drawSprite(byId('pix-cv-gem'), ITEM_GEM, { scale: 18, pad: 2 });

  /* Walk-cycle frame strip (4 small canvases) */
  for (var f = 0; f < WALK.length; f++) {
    drawSprite(byId('pix-cv-walk' + f), WALK[f], { scale: 9, pad: 1 });
  }

  /* ------------------------------------------------------------------ *
   * 6.  WALK-CYCLE PLAYER (looping animation + play/pause + speed)
   * ------------------------------------------------------------------ */
  (function walkPlayer() {
    var cv = byId('pix-cv-walkplay');
    if (!cv) return;
    var frame = 0;
    var fps = 8;
    var playing = true;
    var last = 0;
    var rafId = null;

    function render() { drawSprite(cv, WALK[frame], { scale: 14, pad: 2 }); }
    render();

    function loop(ts) {
      if (!playing) { rafId = null; return; }
      if (!last) last = ts;
      if (ts - last >= 1000 / fps) {
        frame = (frame + 1) % WALK.length;
        render();
        last = ts;
      }
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (!rafId) { last = 0; rafId = requestAnimationFrame(loop); } }

    var btn = byId('pix-walk-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        playing = !playing;
        btn.setAttribute('aria-pressed', String(playing));
        btn.querySelector('[data-label]').textContent = playing ? 'Pause' : 'Play';
        if (playing) start();
      });
    }
    var speed = byId('pix-walk-speed');
    var speedOut = byId('pix-walk-fps');
    if (speed) {
      speed.addEventListener('input', function () {
        fps = parseInt(speed.value, 10) || 8;
        if (speedOut) speedOut.textContent = fps + ' fps';
      });
    }
    start();
  })();

  /* ------------------------------------------------------------------ *
   * 7.  LIVE PIXEL EDITOR
   * ------------------------------------------------------------------ */
  (function editor() {
    var cv = byId('pix-editor');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    if (!ctx) return;

    /* Editor palette — site colours + neutrals */
    var SWATCHES = [
      '#241a26', '#3a2a40', '#9aa3b6', '#f5f6fa',
      '#ff5e7d', '#ff8a5c', '#ffc24b', '#ff7a8f',
      '#8b6cff', '#4aa8ff', '#2ee6c4', '#27c9b0',
      '#fff3e8', '#ffe9d6', '#2e6f5e', '#3fae8a'
    ];

    var gridN = 16;            // cells per side
    var px = 26;               // on-screen pixel size
    var showGrid = true;
    var tool = 'pencil';
    var current = '#ff5e7d';
    var data = [];             // gridN*gridN, null = empty
    var isDown = false;

    function resetData(n) {
      gridN = n;
      data = new Array(n * n).fill(null);
    }
    resetData(gridN);

    function fitCanvas() {
      px = Math.max(8, Math.floor(cv.clientWidth / gridN)) || 26;
      cv.width = gridN * px;
      cv.height = gridN * px;
      ctx.imageSmoothingEnabled = false;
    }

    function draw() {
      ctx.imageSmoothingEnabled = false;
      // checkerboard for transparency
      for (var y = 0; y < gridN; y++) {
        for (var x = 0; x < gridN; x++) {
          var i = y * gridN + x;
          if (data[i]) {
            ctx.fillStyle = data[i];
          } else {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#171922' : '#1e2130';
          }
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
      if (showGrid && px >= 10) {
        ctx.strokeStyle = 'rgba(255,255,255,.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var g = 1; g < gridN; g++) {
          ctx.moveTo(g * px + .5, 0); ctx.lineTo(g * px + .5, cv.height);
          ctx.moveTo(0, g * px + .5); ctx.lineTo(cv.width, g * px + .5);
        }
        ctx.stroke();
      }
    }

    function cellFromEvent(e) {
      var rect = cv.getBoundingClientRect();
      var cx, cy;
      if (e.touches && e.touches.length) {
        cx = e.touches[0].clientX; cy = e.touches[0].clientY;
      } else {
        cx = e.clientX; cy = e.clientY;
      }
      var scaleX = cv.width / rect.width;
      var scaleY = cv.height / rect.height;
      var x = Math.floor(((cx - rect.left) * scaleX) / px);
      var y = Math.floor(((cy - rect.top) * scaleY) / px);
      if (x < 0 || y < 0 || x >= gridN || y >= gridN) return null;
      return { x: x, y: y, i: y * gridN + x };
    }

    function floodFill(start) {
      var target = data[start.i];
      if (target === current) return;
      var stack = [start.i];
      while (stack.length) {
        var i = stack.pop();
        if (data[i] !== target) continue;
        data[i] = current;
        var x = i % gridN, y = (i - x) / gridN;
        if (x > 0) stack.push(i - 1);
        if (x < gridN - 1) stack.push(i + 1);
        if (y > 0) stack.push(i - gridN);
        if (y < gridN - 1) stack.push(i + gridN);
      }
    }

    function applyTool(cell) {
      if (!cell) return;
      if (tool === 'pencil') {
        data[cell.i] = current;
      } else if (tool === 'eraser') {
        data[cell.i] = null;
      } else if (tool === 'fill') {
        floodFill(cell);
      } else if (tool === 'eyedropper') {
        if (data[cell.i]) { setCurrent(data[cell.i]); }
      }
      draw();
    }

    /* ---- pointer / touch handling ---- */
    function down(e) {
      isDown = true;
      var cell = cellFromEvent(e);
      // fill & eyedropper act once on press, not on drag
      applyTool(cell);
      if (e.cancelable) e.preventDefault();
    }
    function move(e) {
      if (!isDown) return;
      if (tool === 'fill' || tool === 'eyedropper') return;
      var cell = cellFromEvent(e);
      applyTool(cell);
      if (e.cancelable) e.preventDefault();
    }
    function up() { isDown = false; }

    cv.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false });
    cv.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', up);

    /* ---- tool buttons ---- */
    var toolBtns = document.querySelectorAll('[data-tool]');
    function setTool(name) {
      tool = name;
      toolBtns.forEach(function (b) {
        var on = b.getAttribute('data-tool') === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      var out = byId('pix-tool-name');
      if (out) out.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }
    toolBtns.forEach(function (b) {
      b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); });
    });
    setTool('pencil');

    /* ---- clear button ---- */
    var clearBtn = byId('pix-clear');
    if (clearBtn) clearBtn.addEventListener('click', function () { resetData(gridN); draw(); });

    /* ---- grid toggle ---- */
    var gridBtn = byId('pix-grid-toggle');
    if (gridBtn) {
      gridBtn.addEventListener('click', function () {
        showGrid = !showGrid;
        gridBtn.setAttribute('aria-pressed', String(showGrid));
        gridBtn.classList.toggle('active', showGrid);
        draw();
      });
    }

    /* ---- size selector ---- */
    var sizeSel = byId('pix-size');
    if (sizeSel) {
      sizeSel.addEventListener('change', function () {
        var n = parseInt(sizeSel.value, 10) || 16;
        resetData(n);
        fitCanvas();
        draw();
      });
    }

    /* ---- swatch palette ---- */
    var palWrap = byId('pix-swatches');
    function setCurrent(col) {
      current = col;
      if (palWrap) {
        palWrap.querySelectorAll('.pix-swatch').forEach(function (s) {
          var on = s.getAttribute('data-col') === col;
          s.classList.toggle('active', on);
          s.setAttribute('aria-pressed', String(on));
        });
      }
      var chip = byId('pix-current-chip');
      if (chip) chip.style.background = col;
      // when picking a colour, jump back to pencil unless on fill
      if (tool === 'eraser' || tool === 'eyedropper') setTool('pencil');
    }
    if (palWrap) {
      SWATCHES.forEach(function (col) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pix-swatch';
        b.style.background = col;
        b.setAttribute('data-col', col);
        b.setAttribute('aria-label', 'Pick colour ' + col);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { setCurrent(col); });
        palWrap.appendChild(b);
      });
    }
    setCurrent(current);

    /* ---- custom colour input ---- */
    var customInput = byId('pix-custom-col');
    if (customInput) {
      customInput.addEventListener('input', function () { setCurrent(customInput.value); });
    }

    /* ---- export PNG (upscaled, transparent background) ---- */
    var exportBtn = byId('pix-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var scale = 24;
        var out = document.createElement('canvas');
        out.width = gridN * scale;
        out.height = gridN * scale;
        var octx = out.getContext('2d');
        if (!octx) return;
        octx.imageSmoothingEnabled = false;
        for (var y = 0; y < gridN; y++) {
          for (var x = 0; x < gridN; x++) {
            var c = data[y * gridN + x];
            if (!c) continue;
            octx.fillStyle = c;
            octx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
        var link = document.createElement('a');
        link.download = 'ethan-cao-pixel-art.png';
        link.href = out.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    /* ---- keyboard shortcuts ---- */
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      var map = { 'b': 'pencil', 'p': 'pencil', 'e': 'eraser', 'f': 'fill', 'i': 'eyedropper' };
      var k = e.key.toLowerCase();
      if (map[k]) { setTool(map[k]); }
      else if (k === 'g') { if (gridBtn) gridBtn.click(); }
    });

    /* ---- seed a little starter drawing so it never looks empty ---- */
    (function seed() {
      var demo = [
        '....kkkk....',
        '...kppppk...',
        '..kpopopok..',
        '..kpwppwpk..',
        '..kpppppk...',
        '..ktTtTtk...',
        '..kpopopk...',
        '...k.kk.k...'
      ];
      var ox = Math.floor((gridN - 12) / 2);
      var oy = Math.floor((gridN - 8) / 2);
      var local = PAL;
      for (var y = 0; y < demo.length; y++) {
        for (var x = 0; x < demo[y].length; x++) {
          var col = local[demo[y][x]];
          var gx = ox + x, gy = oy + y;
          if (col && gx >= 0 && gy >= 0 && gx < gridN && gy < gridN) {
            data[gy * gridN + gx] = col;
          }
        }
      }
    })();

    /* ---- init ---- */
    fitCanvas();
    draw();
    window.addEventListener('resize', function () { fitCanvas(); draw(); });
  })();

})();
