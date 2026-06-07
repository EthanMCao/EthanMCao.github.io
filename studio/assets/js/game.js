// "Vela's Run" — a self-contained canvas platformer for the Studio Play page.
// Custom engine: fixed-step physics, AABB collisions, parallax, particles,
// enemies, collectibles, touch + keyboard. Frame: a playable web build.
(function () {
  'use strict';
  const canvas = document.getElementById('game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const VW = 960, VH = 540;           // internal resolution
  let scale = 1, dpr = 1;

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box.width, h = w * (VH / VW);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(VW * dpr);
    canvas.height = Math.round(VH * dpr);
    scale = dpr;
  }
  window.addEventListener('resize', resize);

  // ---- Level ----
  const WORLD_W = 3260;
  const platforms = [
    [0,472,720,260],[820,472,520,260],[1450,472,560,260],[2120,472,1140,260],
    [360,360,150,26],[600,300,120,26],[980,366,150,26],[1180,300,120,26],
    [1560,344,150,26],[1820,282,120,26],[2300,366,150,26],[2560,300,140,26],
  ];
  const coinDefs = [
    [200,420],[300,420],[400,318],[640,258],[860,420],[1030,324],[1230,258],
    [1500,420],[1620,302],[1880,240],[2050,420],[2360,324],[2620,258],[2900,420],[2980,420],
  ];
  const enemyDefs = [
    { x: 560, y: 472, min: 460, max: 700 },
    { x: 1620, y: 472, min: 1470, max: 1980 },
    { x: 2500, y: 472, min: 2200, max: 2900 },
  ];
  const FLAG = { x: 3120, y: 472 };
  const SPAWN = { x: 60, y: 400 };

  // ---- State ----
  const player = { x: 0, y: 0, w: 34, h: 40, vx: 0, vy: 0, onGround: false, face: 1, t: 0, coyote: 0, buffer: 0, dead: false, anim: 0 };
  let coins = [], enemies = [], particles = [];
  let cam = 0, score = 0, collected = 0, lives = 3, time = 0;
  let state = 'title';            // title | play | win | over | paused
  let shake = 0, bestTime = null;

  function reset(full) {
    player.x = SPAWN.x; player.y = SPAWN.y; player.vx = 0; player.vy = 0; player.dead = false; player.face = 1;
    coins = coinDefs.map(([x, y]) => ({ x, y, got: false, t: Math.random() * 6 }));
    enemies = enemyDefs.map((e) => ({ ...e, dir: 1, dead: false, t: 0 }));
    particles = [];
    cam = 0;
    if (full) { score = 0; collected = 0; lives = 3; time = 0; }
  }

  // ---- Input ----
  const keys = {};
  const press = {};

  // Only capture keyboard (and swallow Space/arrow scrolling) when the canvas is
  // actually on screen — otherwise the page can't be scrolled with the keyboard.
  let gameVisible = true;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      gameVisible = entries[0].isIntersecting;
    }, { threshold: 0.25 });
    io.observe(canvas);
  } else {
    const checkVis = () => {
      const r = canvas.getBoundingClientRect();
      gameVisible = r.bottom > 0 && r.top < (window.innerHeight || 0);
    };
    window.addEventListener('scroll', checkVis, { passive: true });
    checkVis();
  }

  function setKey(e, v) {
    const k = e.key.toLowerCase();
    let mapped = null;
    if (k === 'arrowleft' || k === 'a') mapped = 'left';
    else if (k === 'arrowright' || k === 'd') mapped = 'right';
    else if (k === 'arrowup' || k === 'w' || k === ' ') mapped = 'jump';
    else if (k === 'p') mapped = 'pause';
    if (mapped) {
      e.preventDefault();
      if (v && !keys[mapped]) press[mapped] = true;
      keys[mapped] = v;
    }
  }
  window.addEventListener('keydown', (e) => {
    if (!gameVisible) return;                 // let the page scroll normally when game is off-screen
    if (e.repeat && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); return; }
    if ((state === 'title' || state === 'win' || state === 'over') && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault(); startGame(); return;
    }
    if (e.key.toLowerCase() === 'p' && state === 'play') { e.preventDefault(); state = 'paused'; return; }
    else if (e.key.toLowerCase() === 'p' && state === 'paused') { e.preventDefault(); state = 'play'; last = performance.now(); return; }
    setKey(e, true);
  });
  window.addEventListener('keyup', (e) => setKey(e, false));

  // Touch buttons
  function bindTouch(id, name) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => { e.preventDefault(); if (!keys[name]) press[name] = true; keys[name] = true; el.classList.add('held'); };
    const off = (e) => { e.preventDefault(); keys[name] = false; el.classList.remove('held'); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
    el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }
  bindTouch('btn-left', 'left'); bindTouch('btn-right', 'right'); bindTouch('btn-jump', 'jump');
  canvas.addEventListener('pointerdown', () => { if (state !== 'play' && state !== 'paused') startGame(); });

  const startBtn = document.getElementById('game-start');
  if (startBtn) startBtn.addEventListener('click', startGame);
  const pauseBtn = document.getElementById('game-pause');
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    if (state === 'play') state = 'paused';
    else if (state === 'paused') { state = 'play'; last = performance.now(); }
  });

  function startGame() { reset(true); state = 'play'; last = performance.now(); }

  // ---- Physics constants ----
  const GRAV = 2500, ACC = 2600, FRIC = 2100, MAXVX = 320, JUMP = 760, STOMP = 560;

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update(dt) {
    if (state !== 'play') return;
    time += dt;
    player.t += dt;

    // horizontal
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir !== 0) { player.vx += dir * ACC * dt; player.face = dir; }
    else { // friction
      const s = Math.sign(player.vx); player.vx -= s * FRIC * dt;
      if (Math.sign(player.vx) !== s) player.vx = 0;
    }
    player.vx = Math.max(-MAXVX, Math.min(MAXVX, player.vx));

    // jump w/ coyote + buffer
    player.coyote = player.onGround ? 0.1 : Math.max(0, player.coyote - dt);
    player.buffer = press.jump ? 0.12 : Math.max(0, player.buffer - dt);
    if (player.buffer > 0 && player.coyote > 0) {
      player.vy = -JUMP; player.onGround = false; player.coyote = 0; player.buffer = 0;
      spawnDust(player.x + player.w / 2, player.y + player.h, 8);
    }
    // variable jump height: extra gravity while still rising if jump is released
    if (player.vy < 0 && !keys.jump) player.vy += GRAV * 1.7 * dt;

    player.vy += GRAV * dt;
    if (player.vy > 1100) player.vy = 1100;

    // integrate X + collide
    player.x += player.vx * dt;
    for (const p of platforms) {
      if (aabb(player.x, player.y, player.w, player.h, p[0], p[1], p[2], p[3])) {
        if (player.vx > 0) player.x = p[0] - player.w;
        else if (player.vx < 0) player.x = p[0] + p[2];
        player.vx = 0;
      }
    }
    player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));

    // integrate Y + collide
    player.onGround = false;
    player.y += player.vy * dt;
    for (const p of platforms) {
      if (aabb(player.x, player.y, player.w, player.h, p[0], p[1], p[2], p[3])) {
        if (player.vy > 0) { player.y = p[1] - player.h; player.onGround = true; if (player.vy > 380) spawnDust(player.x + player.w / 2, player.y + player.h, 6); }
        else if (player.vy < 0) player.y = p[1] + p[3];
        player.vy = 0;
      }
    }
    if (player.onGround && Math.abs(player.vx) > 40) player.anim += dt * 12; else player.anim = 0;

    // fall death
    if (player.y > VH + 220) hurt();

    // camera
    const tcam = player.x + player.w / 2 - VW / 2;
    cam += (tcam - cam) * Math.min(1, dt * 6);
    cam = Math.max(0, Math.min(WORLD_W - VW, cam));

    // coins
    for (const c of coins) {
      c.t += dt;
      if (!c.got && aabb(player.x, player.y, player.w, player.h, c.x - 12, c.y - 12, 24, 24)) {
        c.got = true; collected++; score += 100; spawnSpark(c.x, c.y);
      }
    }

    // enemies
    for (const e of enemies) {
      if (e.dead) { e.t += dt; continue; }
      e.x += e.dir * 60 * dt; e.t += dt;
      if (e.x < e.min) { e.x = e.min; e.dir = 1; }
      if (e.x > e.max) { e.x = e.max; e.dir = -1; }
      if (aabb(player.x, player.y, player.w, player.h, e.x - 18, e.y - 24, 36, 30)) {
        if (player.vy > 0 && player.y + player.h - player.vy * dt <= e.y - 14) {
          e.dead = true; e.t = 0; player.vy = -STOMP; score += 150; shake = 6; spawnSpark(e.x, e.y - 10);
        } else { hurt(); }
      }
    }

    // flag / win
    if (player.x + player.w > FLAG.x && player.x < FLAG.x + 30) {
      score += lives * 200 + Math.max(0, Math.round(120 - time)) * 10;
      if (bestTime === null || time < bestTime) bestTime = time;
      state = 'win';
    }

    // particles
    for (const pt of particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 900 * dt; }
    particles = particles.filter((p) => p.t < p.life);

    if (shake > 0) shake = Math.max(0, shake - dt * 30);

    // clear edge-triggers
    press.jump = false; press.left = false; press.right = false; press.pause = false;
  }

  function hurt() {
    lives--; shake = 10; spawnSpark(player.x + player.w / 2, player.y + player.h / 2);
    if (lives <= 0) { state = 'over'; return; }
    player.x = SPAWN.x; player.y = SPAWN.y; player.vx = 0; player.vy = 0; cam = 0;
    player.onGround = false; player.coyote = 0; player.buffer = 0;
    press.jump = false;                                          // drop any buffered jump on respawn
  }

  function spawnDust(x, y, n) {
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 60, t: 0, life: 0.5, c: '#fff1e2', r: 2 + Math.random() * 2 });
  }
  function spawnSpark(x, y) {
    for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 180; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, t: 0, life: 0.6, c: ['#ffc24b', '#2ee6c4', '#ff5e7d'][i % 3], r: 2 + Math.random() * 2.5 }); }
  }

  // ---- Render ----
  function draw() {
    ctx.save();
    ctx.scale(scale, scale);
    let sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
    ctx.clearRect(0, 0, VW, VH);

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#241b3e'); sky.addColorStop(0.5, '#3a2a5e'); sky.addColorStop(1, '#ff8a6a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);

    // sun
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffe2a8';
    ctx.beginPath(); ctx.arc(760 - cam * 0.05, 150, 54, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(760 - cam * 0.05, 150, 100, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    ctx.translate(sx, sy);

    // far hills
    drawHills(cam * 0.2, 360, '#5a3f7a', 0.9, 220);
    drawHills(cam * 0.4, 410, '#7a4f8a', 1, 170);
    // fireflies
    for (let i = 0; i < 26; i++) {
      const fx = ((i * 137 - cam * 0.5) % (VW + 40) + VW + 40) % (VW + 40) - 20;
      const fy = 120 + (i * 53 % 260) + Math.sin(time * 2 + i) * 8;
      ctx.fillStyle = 'rgba(255,226,168,' + (0.25 + 0.25 * Math.sin(time * 3 + i)) + ')';
      ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // near trees
    drawHills(cam * 0.6, 450, '#2f2150', 1, 130);

    ctx.translate(-cam, 0);

    // platforms
    for (const p of platforms) drawPlatform(p[0], p[1], p[2], p[3]);

    // coins
    for (const c of coins) if (!c.got) drawCoin(c.x, c.y, c.t);

    // flag
    drawFlag(FLAG.x, FLAG.y);

    // enemies
    for (const e of enemies) drawEnemy(e);

    // player
    drawVela(player.x + player.w / 2, player.y + player.h, player.face, player.anim, player.onGround, player.vy);

    // particles
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, 1 - pt.t / pt.life); ctx.fillStyle = pt.c;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // HUD
    drawHUD();
    // overlays
    if (state !== 'play') drawOverlay();
  }

  function drawHills(off, baseY, color, alpha, amp) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, VH);
    for (let x = 0; x <= VW; x += 30) {
      const wx = x + off;
      const y = baseY - Math.sin(wx * 0.004) * amp * 0.5 - Math.sin(wx * 0.0013 + 2) * amp * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function drawPlatform(x, y, w, h) {
    ctx.fillStyle = '#6f4730'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = '#57b368'; ctx.fillRect(x, y - 8, w, 12);
    ctx.fillStyle = '#3f8d52';
    for (let gx = x + 4; gx < x + w; gx += 16) { ctx.fillRect(gx, y - 12, 4, 6); }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + h - 8, w, 8);
  }

  function drawCoin(x, y, t) {
    const sxk = Math.abs(Math.cos(t * 4));
    ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 3);
    ctx.fillStyle = '#ffc24b'; ctx.beginPath(); ctx.ellipse(0, 0, 9 * sxk + 1.5, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(-2 * sxk, -2, 3 * sxk + .8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b9842a'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
  }

  function drawFlag(x, y) {
    ctx.fillStyle = '#cfd6e6'; ctx.fillRect(x, y - 120, 5, 120);
    ctx.fillStyle = '#2ee6c4';
    const wob = Math.sin(time * 4) * 4;
    ctx.beginPath(); ctx.moveTo(x + 5, y - 118); ctx.lineTo(x + 52 + wob, y - 104); ctx.lineTo(x + 5, y - 90); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0f1017'; ctx.beginPath(); ctx.arc(x + 2.5, y - 120, 5, 0, Math.PI * 2); ctx.fill();
  }

  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.dead) { ctx.globalAlpha = Math.max(0, 1 - e.t / 0.4); ctx.scale(1, Math.max(0.1, 1 - e.t * 3)); }
    const squash = Math.sin(e.t * 8) * 2;
    ctx.fillStyle = '#8b6cff';
    ctx.beginPath(); ctx.ellipse(0, -10 + squash / 2, 18, 16 - squash, 0, Math.PI, 0); ctx.lineTo(18, 0); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6, -14, 4, 0, Math.PI * 2); ctx.arc(7, -14, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#241a26'; ctx.beginPath(); ctx.arc(-6 + e.dir * 1.5, -14, 2, 0, Math.PI * 2); ctx.arc(7 + e.dir * 1.5, -14, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Vela the fox — drawn from primitives, anchored at feet-centre (x,y)
  function drawVela(x, y, face, anim, onGround, vy) {
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    const bob = onGround ? Math.sin(anim) * 1.5 : 0;
    const legSwing = onGround ? Math.sin(anim) * 5 : 3;
    const sq = !onGround ? (vy < 0 ? 1.08 : 0.94) : 1;
    // tail
    ctx.fillStyle = '#ff7a5e';
    ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(-30, -30, -26, -8); ctx.quadraticCurveTo(-20, -16, -8, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff1e2'; ctx.beginPath(); ctx.arc(-27, -12, 5, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.fillStyle = '#fff1e2';
    ctx.fillRect(-8 - legSwing * 0.3, -10, 6, 10 + legSwing * 0.5);
    ctx.fillRect(3 + legSwing * 0.3, -10, 6, 10 - legSwing * 0.5);
    // body
    ctx.save(); ctx.translate(0, -22 + bob); ctx.scale(1, sq);
    ctx.fillStyle = '#ff8a5c';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1e2'; ctx.beginPath(); ctx.ellipse(2, 4, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // scarf
    ctx.fillStyle = '#2ee6c4'; ctx.fillRect(-11, -26 + bob, 22, 6);
    ctx.fillStyle = '#27c9b0'; ctx.beginPath(); ctx.moveTo(6, -22 + bob); ctx.lineTo(13, -10 + bob); ctx.lineTo(7, -10 + bob); ctx.closePath(); ctx.fill();
    // head
    ctx.save(); ctx.translate(4, -36 + bob);
    ctx.fillStyle = '#ff9a6a'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    // ears
    ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-12, -18); ctx.lineTo(-2, -9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(12, -18); ctx.lineTo(3, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1f2b'; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-10, -15); ctx.lineTo(-4, -9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(10, -15); ctx.lineTo(4, -9); ctx.closePath(); ctx.fill();
    // face mask
    ctx.fillStyle = '#fff3e8'; ctx.beginPath(); ctx.arc(2, 3, 7, 0, Math.PI * 2); ctx.fill();
    // snout + nose
    ctx.fillStyle = '#fff8f0'; ctx.beginPath(); ctx.arc(8, 4, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1f2b'; ctx.beginPath(); ctx.arc(10, 3, 1.6, 0, Math.PI * 2); ctx.fill();
    // eye
    ctx.fillStyle = '#241a26'; ctx.beginPath(); ctx.arc(3, -1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3.6, -1.6, .7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawHUD() {
    ctx.save(); ctx.scale(scale, scale);
    ctx.font = '600 20px "Space Grotesk", sans-serif';
    // coins
    ctx.fillStyle = '#ffc24b'; ctx.beginPath(); ctx.arc(34, 34, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(collected + '/' + coins.length, 50, 36);
    // score
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText('SCORE ' + String(score).padStart(5, '0'), 150, 36);
    ctx.fillText('TIME ' + time.toFixed(1) + 's', 320, 36);
    // lives (hearts)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < lives ? '#ff5e7d' : 'rgba(255,255,255,.18)';
      const hx = VW - 40 - i * 30, hy = 34;
      ctx.beginPath();
      ctx.moveTo(hx, hy + 4); ctx.bezierCurveTo(hx - 9, hy - 6, hx - 9, hy - 9, hx, hy - 3);
      ctx.bezierCurveTo(hx + 9, hy - 9, hx + 9, hy - 6, hx, hy + 4); ctx.fill();
    }
    ctx.restore();
  }

  function drawOverlay() {
    ctx.save(); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(10,11,15,.74)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (state === 'title') {
      ctx.fillStyle = '#fff'; ctx.font = '700 52px "Space Grotesk", sans-serif';
      ctx.fillText("Vela's Run", VW / 2, VH / 2 - 60);
      ctx.fillStyle = '#9aa3b6'; ctx.font = '400 18px Inter, sans-serif';
      ctx.fillText('Collect coins · stomp the slimes · reach the flag', VW / 2, VH / 2 - 10);
      ctx.fillStyle = '#2ee6c4'; ctx.font = '600 20px "Space Grotesk", sans-serif';
      ctx.fillText('Press SPACE or tap to play', VW / 2, VH / 2 + 40);
      ctx.fillStyle = '#626a80'; ctx.font = '400 14px "JetBrains Mono", monospace';
      ctx.fillText('← → / A D  move      ↑ / W / Space  jump      P  pause', VW / 2, VH / 2 + 84);
    } else if (state === 'paused') {
      ctx.fillStyle = '#fff'; ctx.font = '700 40px "Space Grotesk", sans-serif';
      ctx.fillText('Paused', VW / 2, VH / 2 - 6);
      ctx.fillStyle = '#9aa3b6'; ctx.font = '400 16px Inter, sans-serif';
      ctx.fillText('Press P to resume', VW / 2, VH / 2 + 30);
    } else if (state === 'win') {
      ctx.fillStyle = '#2ee6c4'; ctx.font = '700 50px "Space Grotesk", sans-serif';
      ctx.fillText('Level Clear!', VW / 2, VH / 2 - 60);
      ctx.fillStyle = '#fff'; ctx.font = '500 22px "JetBrains Mono", monospace';
      ctx.fillText('Score ' + score + '  ·  ' + collected + '/' + coins.length + ' coins  ·  ' + time.toFixed(1) + 's', VW / 2, VH / 2 - 8);
      if (bestTime !== null) { ctx.fillStyle = '#9aa3b6'; ctx.font = '400 16px Inter'; ctx.fillText('Best time ' + bestTime.toFixed(1) + 's', VW / 2, VH / 2 + 26); }
      ctx.fillStyle = '#2ee6c4'; ctx.font = '600 18px "Space Grotesk", sans-serif';
      ctx.fillText('Press SPACE or tap to play again', VW / 2, VH / 2 + 64);
    } else if (state === 'over') {
      ctx.fillStyle = '#ff5e7d'; ctx.font = '700 50px "Space Grotesk", sans-serif';
      ctx.fillText('Game Over', VW / 2, VH / 2 - 40);
      ctx.fillStyle = '#9aa3b6'; ctx.font = '400 18px Inter, sans-serif';
      ctx.fillText('Score ' + score, VW / 2, VH / 2 + 4);
      ctx.fillStyle = '#2ee6c4'; ctx.font = '600 18px "Space Grotesk", sans-serif';
      ctx.fillText('Press SPACE or tap to retry', VW / 2, VH / 2 + 44);
    }
    ctx.restore();
  }

  // ---- Loop ----
  let last = performance.now(), acc = 0;
  const STEP = 1 / 120;
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (state === 'play') {
      acc += dt;
      if (acc > 0.2) acc = 0.2;               // never let the accumulator spiral after a stall
      let guard = 0;
      while (acc >= STEP && guard++ < 16) { update(STEP); acc -= STEP; }
    }
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  reset(true);
  requestAnimationFrame(frame);
})();
