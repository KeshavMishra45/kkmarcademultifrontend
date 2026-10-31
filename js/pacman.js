/* Ninja Ramen Rush: a Pac-Man style game. Naruto vs the Akatsuki in a ninja castle.
   Ramen = power pellet: Naruto turns into raged Kurama and can eat the Akatsuki. */
const PAC_MAP = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '   #.#       #.#   ',
  '####.# ##-## #.####',
  '    .  #GGG#  .    ',
  '####.# ##### #.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];
const PAC_ROSTER = ['itachi', 'pain', 'kisame', 'deidara', 'tobi', 'sasori', 'hidan', 'konan', 'orochimaru'];
const PAC_NAME = { itachi: 'Itachi', pain: 'Pain', kisame: 'Kisame', deidara: 'Deidara', tobi: 'Tobi', sasori: 'Sasori', hidan: 'Hidan', konan: 'Konan', orochimaru: 'Orochimaru' };
// Difficulty settings. p = Naruto speed, g = Akatsuki speed (tiles per second), k = Kurama seconds.
// (The old single speed was p 6.4 / g 5.3, which felt too fast; Medium is now about 15% slower.)
const PAC_CFG = {
  easy:   { name: 'Easy',   p: 4.8, g: 3.7, lives: 5, k: 9 },
  medium: { name: 'Medium', p: 5.4, g: 4.5, lives: 3, k: 8 },
  hard:   { name: 'Hard',   p: 5.9, g: 5.1, lives: 3, k: 6 },
};
const PD = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PD_LIST = ['up', 'left', 'down', 'right'];
const POPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const PAC_MODES = [['scatter', 7], ['chase', 20], ['scatter', 7], ['chase', 20], ['scatter', 5], ['chase', 1e9]];

function ninjaRamenRush(lvId = 'medium') {
  if (gameCleanup) gameCleanup();
  if (!PAC_CFG[lvId]) lvId = 'medium';
  const cfg = PAC_CFG[lvId];
  const T = 28, W = 19, H = 21, dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.innerHTML = `<section class="page game-page play pac-page"><a class="back" href="#/games">← All games</a>
    <h2>Ninja Ramen Rush</h2>
    <p class="muted">Eat every chakra orb, dodge the Akatsuki, and grab ramen to unleash Kurama.</p>
    ${lvLine('ninja-ramen-rush', 'pac', lvId)}
    ${loginHint()}
    <div class="gstats" id="gstats"></div>
    <div class="pac-hud">
      <div class="chip"><span>Score</span><b id="hScore">0</b></div>
      <div class="chip"><span>Level</span><b id="hLevel">1</b></div>
      <div class="chip"><span>Lives</span><b id="hLives"></b></div>
      <div class="chip"><span>Kurama power</span><div class="bar"><i id="hK" style="width:0"></i></div></div>
    </div>
    <div class="castle">
      <svg class="roof" viewBox="0 0 600 64" aria-hidden="true"><path d="M0 60Q150 54 235 30Q285 10 300 0Q315 10 365 30Q450 54 600 60L600 64L0 64Z" fill="#3d3f45" stroke="#16171a" stroke-width="3"/><circle cx="300" cy="6" r="4" fill="#ffcf4a"/><text x="300" y="52" text-anchor="middle" fill="#ffcf4a" font-family="Permanent Marker, cursive" font-size="17" letter-spacing="3">NINJA CASTLE · 忍</text></svg>
      <div class="pac-wrap"><canvas id="pac" aria-label="Ninja Ramen Rush game board"></canvas><div class="pac-ov" id="ov"></div></div>
    </div>
    <p class="muted small" id="hHunt"></p>
    <div class="dpad" aria-label="Controls"><button data-d="up" aria-label="Up">▲</button><button data-d="left" aria-label="Left">◀</button><button data-d="right" aria-label="Right">▶</button><button data-d="down" aria-label="Down">▼</button></div>
    <p class="muted small">Arrow keys or WASD, or swipe on the board. P pauses. Earn +1 point for every 100 you score.</p></section>`;
  const cv = $('#pac'), ctx = cv.getContext('2d'), ovEl = $('#ov');
  cv.width = W * T * dpr; cv.height = H * T * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // ----- maze -----
  const base = PAC_MAP.map(r => r.split(''));
  const reach = Array.from({ length: H }, () => Array(W).fill(false));
  let start = { x: 9, y: 15 }, door = { x: 9, y: 8 };
  base.forEach((row, y) => row.forEach((ch, x) => { if (ch === 'P') start = { x, y }; if (ch === '-') door = { x, y }; }));
  { const q = [[start.x, start.y]]; reach[start.y][start.x] = true;
    while (q.length) { const [x, y] = q.pop();
      for (const d of PD_LIST) { const nx = (x + PD[d][0] + W) % W, ny = y + PD[d][1];
        if (ny < 0 || ny >= H || base[ny][nx] === '#' || reach[ny][nx]) continue; reach[ny][nx] = true; q.push([nx, ny]); } } }
  const solid = (x, y) => { if (y < 0 || y >= H) return true; x = (x + W) % W; return base[y][x] === '#' || !reach[y][x]; };
  const isDoor = (x, y) => x === door.x && y === door.y;
  let dots, left;
  const resetDots = () => { left = 0; dots = base.map((row, y) => row.map((ch, x) => { if (!reach[y][x]) return 0; if (ch === '.') { left++; return 1; } if (ch === 'o') { left++; return 2; } return 0; })); };

  // ----- sprites -----
  const spr = {}, fright = {}, white = {};
  const tint = (img, color) => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 96, 96); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, 96, 96); return c; };
  let loaded = false;
  Promise.all(['naruto', 'kurama', 'kurama_calm', 'ramen', 'defeated', ...PAC_ROSTER].map(n => new Promise(res => { const i = new Image(); i.onload = () => { spr[n] = i; res(); }; i.onerror = res; i.src = `assets/img/${n}.png`; })))
    .then(() => { PAC_ROSTER.forEach(n => { if (spr[n]) { fright[n] = tint(spr[n], 'rgba(40,70,255,.62)'); white[n] = tint(spr[n], 'rgba(255,255,255,.7)'); } }); loaded = true; });

  // ----- static maze layer (ninja castle) -----
  const rr = (x, px, py, w, h, r) => { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); };
  const bgc = (() => {
    const c = document.createElement('canvas'); c.width = W * T * dpr; c.height = H * T * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr);
    const g = x.createLinearGradient(0, 0, 0, H * T); g.addColorStop(0, '#34363b'); g.addColorStop(1, '#27282c'); x.fillStyle = g; x.fillRect(0, 0, W * T, H * T);
    for (let r = 0; r < H; r++) for (let c2 = 0; c2 < W; c2++) { if (solid(c2, r)) continue; const sh = ((c2 * 7 + r * 13) % 5) / 5; x.fillStyle = `rgba(${sh > .5 ? '255,255,255' : '0,0,0'},${.03 + sh * .05})`; x.fillRect(c2 * T + 1, r * T + 1, T - 2, T - 2); }
    x.strokeStyle = 'rgba(0,0,0,.38)'; x.lineWidth = 1;
    for (let i = 0; i <= W; i++) { x.beginPath(); x.moveTo(i * T, 0); x.lineTo(i * T, H * T); x.stroke(); }
    for (let i = 0; i <= H; i++) { x.beginPath(); x.moveTo(0, i * T); x.lineTo(W * T, i * T); x.stroke(); }
    x.fillStyle = 'rgba(110,70,30,.28)'; x.fillRect(8 * T, 9 * T, 3 * T, T);
    for (let r = 0; r < H; r++) for (let cI = 0; cI < W; cI++) {
      if (!solid(cI, r)) continue;
      const px = cI * T, py = r * T, gr = x.createLinearGradient(px, py, px, py + T);
      gr.addColorStop(0, '#9a9da3'); gr.addColorStop(1, '#5a5d63'); x.fillStyle = gr; rr(x, px + 1, py + 1, T - 2, T - 2, 4); x.fill();
      x.strokeStyle = 'rgba(20,20,24,.55)'; x.lineWidth = 1; x.beginPath();
      const off = (r % 2) ? T * .3 : T * .7;
      x.moveTo(px + 2, py + T / 2); x.lineTo(px + T - 2, py + T / 2); x.moveTo(px + off, py + 2); x.lineTo(px + off, py + T / 2); x.moveTo(px + T - off, py + T / 2); x.lineTo(px + T - off, py + T - 2); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(px + 3, py + 2, T - 6, 2);
      x.strokeStyle = '#17181b'; x.lineWidth = 2.5; x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 5; x.beginPath();
      if (!solid(cI, r - 1) && r > 0) { x.moveTo(px + 1, py + 1); x.lineTo(px + T - 1, py + 1); }
      if (!solid(cI, r + 1) && r < H - 1) { x.moveTo(px + 1, py + T - 1); x.lineTo(px + T - 1, py + T - 1); }
      if (!solid(cI - 1, r) && cI > 0) { x.moveTo(px + 1, py + 1); x.lineTo(px + 1, py + T - 1); }
      if (!solid(cI + 1, r) && cI < W - 1) { x.moveTo(px + T - 1, py + 1); x.lineTo(px + T - 1, py + T - 1); }
      x.stroke(); x.shadowBlur = 0;
      if (base[r][cI] !== '#' && (cI === 1 || cI === W - 2)) { // paper lanterns in the side courtyards
        const lx = px + T / 2, ly = py + T / 2, lg = x.createRadialGradient(lx, ly, 1, lx, ly, 15); lg.addColorStop(0, 'rgba(255,170,80,.7)'); lg.addColorStop(1, 'rgba(255,80,60,0)');
        x.fillStyle = lg; x.fillRect(lx - 15, ly - 15, 30, 30); x.fillStyle = '#e0223c'; x.beginPath(); x.ellipse(lx, ly, 6, 8, 0, 0, 7); x.fill();
        x.fillStyle = '#ffcf4a'; x.fillRect(lx - 4, ly - 10, 8, 2); x.fillRect(lx - 4, ly + 8, 8, 2);
      }
    }
    x.fillStyle = '#ffcf4a'; x.shadowColor = '#ffcf4a'; x.shadowBlur = 8; x.fillRect(door.x * T + 3, door.y * T + T / 2 - 2, T - 6, 4); x.shadowBlur = 0;
    return c;
  })();

  // ----- game state -----
  let state = 'idle', stateT = 0, score = 0, lives = cfg.lives, level = 1, kurama = 0, combo = 0, modeIdx = 0, modeT = 0, t = 0;
  let cleared = false, paused = false, alive = true, awarded = false, player, ghosts, popups = [], raf = 0, last = performance.now(), flash = 0;
  const lv = () => ({ p: cfg.p + Math.min(level - 1, 5) * .12, g: cfg.g + Math.min(level - 1, 6) * .2, k: Math.max(3.5, cfg.k - (level - 1) * .7) });
  const SLOTS = [{ x: 9, y: 7, st: 'normal', rel: 0, c: [17, 0] }, { x: 8, y: 9, st: 'house', rel: 2.5, c: [1, 0] }, { x: 10, y: 9, st: 'house', rel: 5, c: [17, 20] }, { x: 9, y: 9, st: 'house', rel: 7.5, c: [1, 20] }];
  function resetActors() {
    player = { tx: start.x, ty: start.y, dir: 'left', want: 'left', prog: 0, moving: false };
    ghosts = SLOTS.map((s, i) => ({ id: PAC_ROSTER[(i + (level - 1) * 4) % 9], slot: i, tx: s.x, ty: s.y, dir: 'left', prog: 0, state: s.st, rel: Math.max(.5, s.rel - (level - 1) * .3), moving: s.st === 'normal', rev: false, corner: s.c }));
    modeIdx = 0; modeT = 0; kurama = 0; combo = 0; popups = [];
    $('#hHunt').textContent = 'Hunting you: ' + ghosts.map(g => PAC_NAME[g.id]).join(' · ');
  }
  const rb = () => { recordBest('pac', score); if (lvBest('pac', lvId, score)) { cleared = true; toast('Level cleared! 🎉'); } };
  const modeNow = () => PAC_MODES[modeIdx][0];
  const canP = (x, y, d) => { const nx = (x + PD[d][0] + W) % W, ny = y + PD[d][1]; return !solid(nx, ny) && !isDoor(nx, ny); };
  const ghostCan = (g, x, y, d) => { const nx = (x + PD[d][0] + W) % W, ny = y + PD[d][1]; if (solid(nx, ny)) return false; if (isDoor(nx, ny)) return g.state === 'leaving' || g.state === 'dead'; return true; };
  const pos = e => e.moving ? [e.tx + PD[e.dir][0] * e.prog, e.ty + PD[e.dir][1] * e.prog] : [e.tx, e.ty];
  function reverse(e) { if (!e.moving) return; e.tx = (e.tx + PD[e.dir][0] + W) % W; e.ty += PD[e.dir][1]; e.dir = POPP[e.dir]; e.prog = 1 - e.prog; }
  function step(e, dist, arrive) {
    e.prog += dist;
    while (e.prog >= 1) {
      e.prog -= 1; e.tx = (e.tx + PD[e.dir][0] + W) % W; e.ty += PD[e.dir][1];
      const nd = arrive(e); if (!nd) { e.prog = 0; e.moving = false; return; } e.dir = nd;
    }
  }
  function bfsDir(sx, sy, gx, gy, g) {
    if (sx === gx && sy === gy) return null;
    const seen = new Set([sy * W + sx]), q = [[sx, sy, null]];
    while (q.length) { const [x, y, fd] = q.shift();
      for (const d of PD_LIST) { if (!ghostCan(g, x, y, d)) continue; const nx = (x + PD[d][0] + W) % W, ny = y + PD[d][1], k = ny * W + nx;
        if (seen.has(k)) continue; seen.add(k); const f = fd || d; if (nx === gx && ny === gy) return f; q.push([nx, ny, f]); } }
    return null;
  }
  function target(g) {
    if (modeNow() === 'scatter') return g.corner;
    const p = player, pd = PD[p.dir];
    if (g.slot === 0) return [p.tx, p.ty];
    if (g.slot === 1) return [p.tx + pd[0] * 4, p.ty + pd[1] * 4];
    if (g.slot === 2) { const a = ghosts[0], ax = p.tx + pd[0] * 2, ay = p.ty + pd[1] * 2; return [a.tx + (ax - a.tx) * 2, a.ty + (ay - a.ty) * 2]; }
    return ((g.tx - p.tx) ** 2 + (g.ty - p.ty) ** 2 > 64) ? [p.tx, p.ty] : g.corner;
  }
  function ghostArrive(g) {
    if (g.state === 'dead' && g.tx === 9 && g.ty === 9) { g.state = 'leaving'; g.rev = true; }
    if (g.state === 'leaving' && g.tx === 9 && g.ty === 7) g.state = 'normal';
    if (g.state === 'dead') return bfsDir(g.tx, g.ty, 9, 9, g) || g.dir;
    if (g.state === 'leaving') return bfsDir(g.tx, g.ty, 9, 7, g) || g.dir;
    const opts = PD_LIST.filter(d => d !== POPP[g.dir] && ghostCan(g, g.tx, g.ty, d));
    if (!opts.length) { const r = POPP[g.dir]; return ghostCan(g, g.tx, g.ty, r) ? r : null; }
    if (opts.length === 1) return opts[0];
    if (kurama > 0 && !g.rev) return opts[Math.floor(Math.random() * opts.length)];
    const [gx, gy] = target(g); let best = opts[0], bd = 1e9;
    for (const d of opts) { const dd = (g.tx + PD[d][0] - gx) ** 2 + (g.ty + PD[d][1] - gy) ** 2; if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  const eatable = g => kurama > 0 && !g.rev && g.state !== 'dead';
  const gSpeed = g => g.state === 'dead' ? 10 : g.state === 'leaving' ? 4 : eatable(g) ? 3 : lv().g;
  function updateGhost(g, dt) {
    if (g.state === 'house') { g.rel -= dt; if (g.rel <= 0) { g.state = 'leaving'; g.dir = bfsDir(g.tx, g.ty, 9, 7, g) || 'up'; g.moving = true; g.prog = 0; } return; }
    if (!g.moving) { g.moving = true; g.prog = 0; g.dir = ghostArrive(g) || g.dir; }
    step(g, gSpeed(g) * dt, ghostArrive);
  }
  function eatAt(x, y) {
    const v = dots[y][x]; if (!v) return; dots[y][x] = 0; left--;
    if (v === 1) score += 10; else { score += 50; startKurama(); }
    if (left === 0) { state = 'clear'; stateT = 0; }
  }
  function startKurama() {
    kurama = lv().k; combo = 0; flash = .6; ghosts.forEach(g => { g.rev = false; if (g.state === 'normal') reverse(g); });
    const [px, py] = pos(player); popups.push({ x: px, y: py - 1, txt: 'KURAMA MODE!', life: 1.4, big: true });
  }
  function playerArrive(p) { eatAt(p.tx, p.ty); if (canP(p.tx, p.ty, p.want)) return p.want; if (canP(p.tx, p.ty, p.dir)) return p.dir; return null; }
  function updatePlayer(dt) {
    const p = player, sp = lv().p + (kurama > 0 ? .5 : 0);
    if (p.moving && p.want === POPP[p.dir] && p.prog > 0) reverse(p);
    if (!p.moving) { const d = canP(p.tx, p.ty, p.want) ? p.want : (canP(p.tx, p.ty, p.dir) ? p.dir : null); if (!d) return; p.dir = d; p.moving = true; p.prog = 0; }
    step(p, sp * dt, playerArrive);
  }
  function die() { state = 'dying'; stateT = 0; rb(); pacStats(); }
  function eatGhost(g) { combo++; const pts = 100 * 2 ** combo; score += pts; const [x, y] = pos(g); popups.push({ x, y, txt: pts, life: 1 }); g.state = 'dead'; g.rev = false; }
  function finalize() {
    if (awarded) return; awarded = true; rb();
    store.set('pacbest', Math.max(store.get('pacbest', 0), score));
    const earn = Math.floor(score / 100); if (earn > 0 && addPoints(earn)) toast('+' + earn); pacStats();
  }
  function gameOver() {
    state = 'over'; finalize(); const earn = Math.floor(score / 100);
    ov(`<div class="go"><img src="assets/img/defeated.png" alt="Naruto, defeated"><h3>Naruto was defeated!</h3><p>Score <b>${score.toLocaleString()}</b> · Level <b>${level}</b></p>
      <p class="muted">${user ? (earn ? '+' + earn + ' points earned' : 'Score 100 or more to earn points') : 'Log in to earn points'}</p><div class="row"><button class="btn" id="retry">Play again</button><a class="btn ghost" href="#/game/ninja-ramen-rush">Change level</a></div></div>`);
    $('#retry').onclick = () => ninjaRamenRush(lvId);
  }
  function update(dt) {
    t += dt; stateT += dt; flash = Math.max(0, flash - dt);
    popups.forEach(p => { p.life -= dt; p.y -= dt * .8; }); popups = popups.filter(p => p.life > 0);
    if (state === 'ready') { if (stateT > 1.4) { state = 'play'; stateT = 0; } return; }
    if (state === 'dying') { if (stateT > 1.8) { lives--; if (lives <= 0) { gameOver(); } else { resetActors(); state = 'ready'; stateT = 0; } } return; }
    if (state === 'clear') { if (stateT > 2) { level++; resetDots(); resetActors(); state = 'ready'; stateT = 0; rb(); pacStats(); } return; }
    if (state !== 'play') return;
    if (kurama > 0) kurama = Math.max(0, kurama - dt);
    else { modeT += dt; if (modeT >= PAC_MODES[modeIdx][1]) { modeT = 0; modeIdx = Math.min(modeIdx + 1, PAC_MODES.length - 1); ghosts.forEach(g => { if (g.state === 'normal') reverse(g); }); } }
    updatePlayer(dt); if (state !== 'play') return;
    ghosts.forEach(g => updateGhost(g, dt));
    const [px, py] = pos(player);
    for (const g of ghosts) {
      if (g.state === 'house' || g.state === 'dead') continue; const [gx, gy] = pos(g);
      if (Math.hypot(gx - px, gy - py) < .62) { if (eatable(g)) eatGhost(g); else { die(); break; } }
    }
  }

  // ----- drawing -----
  const img = (im, cx, cy, size, o = {}) => { if (!im) return; ctx.save(); ctx.translate(cx, cy); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.drawImage(im, -size / 2, -size / 2, size, size); ctx.restore(); };
  function draw() {
    ctx.clearRect(0, 0, W * T, H * T); ctx.drawImage(bgc, 0, 0, W * T, H * T);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = dots[y][x]; if (!v) continue; const cx = x * T + T / 2, cy = y * T + T / 2;
      if (v === 1) { ctx.fillStyle = 'rgba(255,200,90,.25)'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe3a0'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,170,60,.25)'; ctx.beginPath(); ctx.arc(cx, cy, 14 + Math.sin(t * 5) * 2, 0, 7); ctx.fill(); img(spr.ramen, cx, cy + Math.sin(t * 5) * 1.5, T * 1.05); }
    }
    ghosts.forEach(g => {
      const [gx, gy] = pos(g), cx = gx * T + T / 2, cy = gy * T + T / 2 + Math.sin(t * 8 + g.slot) * 1.5;
      if (g.state === 'dead') { ctx.fillStyle = '#fff'; [-5, 5].forEach(o => { ctx.beginPath(); ctx.arc(cx + o, cy, 4.5, 0, 7); ctx.fill(); }); ctx.fillStyle = '#1a2cff'; [-5, 5].forEach(o => { ctx.beginPath(); ctx.arc(cx + o, cy, 2, 0, 7); ctx.fill(); }); return; }
      let im = spr[g.id];
      if (eatable(g)) im = (kurama < 2 && Math.floor(t * 8) % 2) ? white[g.id] : fright[g.id];
      img(im, cx, cy, T * 1.14, { flip: g.dir === 'left' && false });
    });
    const [px, py] = pos(player), cx = px * T + T / 2, cy = py * T + T / 2;
    if (state === 'dying') {
      const k = Math.min(1, stateT / 1.2); img(spr.defeated, cx, cy - k * 6, T * (1.3 + k * .9), { rot: Math.sin(stateT * 9) * .18 * (1 - k * .5), alpha: stateT > 1.4 ? 1 - (stateT - 1.4) / .4 : 1 });
    } else {
      const k = kurama > 0 && !(kurama < 2 && Math.floor(t * 8) % 2);
      if (kurama > 0) { const ag = ctx.createRadialGradient(cx, cy, 2, cx, cy, T * 1.3); ag.addColorStop(0, 'rgba(255,70,30,.6)'); ag.addColorStop(1, 'rgba(255,40,20,0)'); ctx.fillStyle = ag; ctx.fillRect(cx - T * 1.3, cy - T * 1.3, T * 2.6, T * 2.6); }
      const sc = 1 + (player.moving ? Math.sin(t * 16) * .07 : 0);
      img(k ? spr.kurama : spr.naruto, cx, cy, T * (k ? 1.55 : 1.18) * sc, { flip: player.dir === 'left' });
    }
    if (flash > 0) { ctx.strokeStyle = `rgba(255,120,40,${flash / .6})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, (.6 - flash) * 260, 0, 7); ctx.stroke(); }
    popups.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.big ? '#ff8a3a' : '#ffe6a0'; ctx.font = p.big ? 'bold 17px Outfit, sans-serif' : 'bold 14px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.txt, Math.min(Math.max(p.x * T + T / 2, p.big ? 70 : 20), W * T - (p.big ? 70 : 20)), p.y * T + T / 2); ctx.globalAlpha = 1; });
    ctx.textAlign = 'center';
    if (state === 'ready') { ctx.fillStyle = '#ffcf4a'; ctx.font = 'bold 20px Outfit, sans-serif'; ctx.fillText(lives === cfg.lives && level === 1 && score === 0 ? 'READY!' : 'LEVEL ' + level, W * T / 2, 11 * T + 20); }
    if (state === 'clear') { if (Math.floor(stateT * 6) % 2) { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(0, 0, W * T, H * T); } ctx.fillStyle = '#ffcf4a'; ctx.font = 'bold 22px Outfit, sans-serif'; ctx.fillText('LEVEL CLEARED!', W * T / 2, 11 * T + 20); }
  }
  let hs = -1, hl = -1, hv = -1;
  function hud() {
    if (score !== hs) { hs = score; $('#hScore').textContent = score.toLocaleString(); }
    if (level !== hl) { hl = level; $('#hLevel').textContent = level; }
    if (lives !== hv) { hv = lives; $('#hLives').innerHTML = Array.from({ length: Math.max(0, lives) }, () => '<img src="assets/img/naruto.png" alt="">').join(''); }
    $('#hK').style.width = (kurama > 0 ? kurama / lv().k * 100 : 0) + '%';
  }
  function pacStats() {
    const el = $('#gstats'); if (!el) return;
    const c = CHALLENGES.find(x => x.id === 'pac'), d = day(), n = Math.min(d.pac, c.goal);
    el.innerHTML = lvChip('pac', lvId) + `<div class="chip"><span>Today's challenge</span><b>${n.toLocaleString()}/${c.goal.toLocaleString()} score</b><div class="bar"><i style="width:${n / c.goal * 100}%"></i></div></div>
      <div class="chip"><span>Best score</span><b>${store.get('pacbest', 0).toLocaleString()}</b></div>`;
  }

  // ----- overlay, input, loop -----
  function ov(html) { ovEl.innerHTML = html || ''; ovEl.style.display = html ? 'grid' : 'none'; }
  function begin() { if (state !== 'idle') return; state = 'ready'; stateT = 0; ov(null); }
  function setDir(d) { if (state === 'idle') begin(); if (state !== 'over') player.want = d; }
  function togglePause() { if (state === 'idle' || state === 'over') return; paused = !paused; last = performance.now(); ov(paused ? '<div class="go"><h3>Paused</h3><p class="muted">Press P to resume</p></div>' : null); }
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  const onKey = e => { if (e.target.closest && e.target.closest('input,textarea,select,dialog')) return; if (e.key === 'p' || e.key === 'P') return togglePause(); if (e.key === ' ') e.preventDefault(); const d = KEYS[e.key]; if (d) { e.preventDefault(); setDir(d); } };
  const onVis = () => { if (document.hidden && !paused) togglePause(); };
  addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis);
  let sx = 0, sy = 0;
  cv.addEventListener('touchstart', e => { const p = e.changedTouches[0]; sx = p.clientX; sy = p.clientY; if (state === 'idle') begin(); }, { passive: true });
  cv.addEventListener('touchend', e => { const p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }, { passive: true });
  view.querySelectorAll('.dpad button').forEach(b => b.onpointerdown = e => { e.preventDefault(); setDir(b.dataset.d); });
  ovEl.onclick = () => { if (state === 'idle') begin(); };
  gameCleanup = () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); if (!awarded && score > 0) finalize(); gameCleanup = null; };
  function frame(now) { if (!alive) return; const dt = Math.min((now - last) / 1000, .05); last = now; if (!paused && loaded) update(dt); if (loaded) { draw(); hud(); } raf = requestAnimationFrame(frame); }

  resetDots(); resetActors(); pacStats(); hud();
  ov(`<div class="go idle"><div class="trio"><img src="assets/img/naruto.png" alt=""><img src="assets/img/ramen.png" alt=""><img src="assets/img/kurama.png" alt=""></div><h3>Ninja Ramen Rush</h3>
    <p>Eat every chakra orb. Grab ramen to unleash Kurama and hunt the Akatsuki.</p><p class="muted">Press an arrow key or tap to start</p></div>`);
  raf = requestAnimationFrame(frame);
}
