/* KKM Games: The Game Dojo.
   1) Card click -> one fire screen "Entering KKM Dojo" -> dojo opens.
   2) Every game route lives inside the dojo: title bar + a wooden INSTRUCTIONS sign that unrolls on click. */

const DOJO_RULES = {
  'tic-tac-toe': [
    'You play the <b>shuriken</b>. The computer plays the <b>Straw Hat</b> mark.',
    'Tap an empty square to place your mark. You move first.',
    'Line up <b>three in a row</b> (across, down or diagonal) to win.',
    'Win the number of games shown in the level goal to clear the level.',
    'Each win gives +10 points when you are logged in.',
  ],
  'rock-paper-scissors': [
    '<b>Devil Fruit</b> beats <b>Kunai</b>.',
    '<b>Kunai</b> beats <b>Death Note</b>.',
    '<b>Death Note</b> beats <b>Devil Fruit</b>.',
    'Pick a weapon and the computer picks at the same time. Same pick is a draw.',
    'Harder levels learn from your last picks, so mix it up. Win rounds to clear the level.',
  ],
  'ninja-ramen-rush': [
    'Move with the <b>arrow keys</b> or <b>WASD</b>. On a phone, swipe on the board or use the pad.',
    'Eat every chakra orb to clear the maze.',
    'Dodge the <b>Akatsuki</b>. Touching one costs a life.',
    'Grab <b>ramen</b> to unleash Kurama and chase them down for bonus points.',
    'Press <b>P</b> to pause. Reach the target score to clear the level.',
  ],
  'sliding-puzzle': [
    'Tap a tile next to the empty gap to slide it in.',
    'Rebuild the full picture to solve the puzzle.',
    '<b>Peek</b> shows the finished picture, <b>Numbers</b> labels the tiles, <b>Shuffle</b> starts over.',
    'Fewer moves and a faster time give a better best score.',
    'Solve it the number of times in the level goal to clear the level.',
  ],
  'memory-match': [
    'Flip two cards at a time.',
    'If they match they stay face up. If not, they flip back, so remember where they were.',
    'Find <b>every pair</b> to clear the board.',
    'Fewer moves earn more stars. The timer starts on your first flip.',
    'Clear boards to finish the level goal.',
  ],
};

/* ---------- dojo shell (title + instructions sign) ---------- */
function dojoLeave() {
  document.body.classList.remove('dojo');
  document.getElementById('dojoUI')?.remove();
}
function dojoSync(seg, slug) {
  const gi = seg === 'game' && typeof GAME_INFO !== 'undefined' ? GAME_INFO[slug] : null;
  if (!gi) return dojoLeave();
  const first = !document.body.classList.contains('dojo');
  document.body.classList.add('dojo');
  let ui = document.getElementById('dojoUI');
  const open = ui ? ui.classList.contains('open') && ui.dataset.slug === slug : false;
  ui?.remove();
  ui = document.createElement('div');
  ui.id = 'dojoUI'; ui.dataset.slug = slug;
  if (open) ui.classList.add('open');
  const rules = DOJO_RULES[slug] || [gi.blurb];
  ui.innerHTML = `
    <h1 class="dojo-title">THE GAME DOJO - ${gi.title.toUpperCase()}</h1>
    <div class="dcol">
    <div class="isign">
      <button class="iplank" aria-expanded="${open}" aria-controls="iscroll">INSTRUCTIONS<i aria-hidden="true">▾</i></button>
      <div class="iscroll" id="iscroll" role="region" aria-label="${gi.title} instructions">
        <div class="ipaper"><div class="pin">
          <h3>${gi.title}</h3>
          <ol>${rules.map(r => `<li>${r}</li>`).join('')}</ol>
          <p class="isig">KKM 忍者</p>
        </div></div>
      </div>
    </div>
    <div class="dstatwrap" hidden><div class="dplank">GAME STATS</div><div class="dstats" id="dstats"></div></div>
    </div>`;
  document.body.appendChild(ui);
  const btn = ui.querySelector('.iplank');
  btn.onclick = () => { const o = ui.classList.toggle('open'); btn.setAttribute('aria-expanded', o); };
  if (first) ui.classList.add('fresh');
  dojoStats();
}

/* On wide screens the level line, goal, scores/lives/timer and the back link move into the left GAME STATS panel,
   so the board gets the whole centre of the screen. Runs again every time a game re-renders (Play again etc). */
function dojoStats() {
  const box = document.getElementById('dstats'); if (!box) return;
  const wrap = box.parentElement, pg = view.querySelector('.play');
  if (!pg || !matchMedia('(min-width:1000px)').matches) { box.replaceChildren(); wrap.hidden = true; return; }
  const kids = [...pg.querySelectorAll('a.back, p.muted, .gstats, .pac-hud')].filter(el => {
    if (el.matches('p.muted')) return /^(Level|Log in)/.test(el.textContent.trim());
    return el.closest('.play') === pg;
  });
  const order = el => el.matches('a.back') ? 0 : el.matches('p.muted') && /^Level/.test(el.textContent.trim()) ? 1 : el.matches('.gstats') ? 2 : el.matches('.pac-hud') ? 3 : 4;
  kids.sort((a, b) => order(a) - order(b));
  if (!kids.length) return; // already moved (the observer fires again after our own move)
  box.replaceChildren(...kids);
  wrap.hidden = false;
  if (kids.length) setTimeout(() => dispatchEvent(new Event('resize')), 0); // the sliding puzzle re-fits itself to the freed space
}
new MutationObserver(() => dojoStats()).observe(document.getElementById('view'), { childList: true });
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const ui = document.getElementById('dojoUI');
  if (ui && ui.classList.contains('open')) { ui.classList.remove('open'); ui.querySelector('.iplank').setAttribute('aria-expanded', false); }
});

/* ---------- entry transition: one fire screen ---------- */
/* Canvas fire: soft glowing particles blended additively (white-yellow core -> orange -> red) rising with a sway,
   plus a few sparks. Looks much richer than CSS blobs and costs only a few hundred sprites per frame. */
function fireStart(cv) {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const W = cv.width = Math.round(innerWidth * dpr), H = cv.height = Math.round(innerHeight * dpr);
  const ctx = cv.getContext('2d');
  const sprite = stops => {
    const s = document.createElement('canvas'); s.width = s.height = 128;
    const c = s.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); return s;
  };
  const SP = [
    sprite([[0, 'rgba(255,250,225,1)'], [.22, 'rgba(255,205,90,.9)'], [.55, 'rgba(255,120,15,.4)'], [1, 'rgba(255,60,0,0)']]),  // hot core
    sprite([[0, 'rgba(255,185,60,.95)'], [.35, 'rgba(255,100,10,.55)'], [1, 'rgba(210,35,0,0)']]),                              // orange body
    sprite([[0, 'rgba(255,85,20,.75)'], [.4, 'rgba(190,30,0,.4)'], [1, 'rgba(110,10,0,0)']]),                                   // red tips
  ];
  const ps = []; let t = 0, last = performance.now(), raf = 0, carry = 0;
  const emit = () => {
    const u = Math.random() + Math.random() + Math.random() - 1.5;        // -1.5..1.5, bell shaped
    const x = W * (.5 + u / 1.5 * .6), mid = Math.max(0, 1 - Math.abs(x / W - .5) * 1.5); // taller in the middle
    ps.push({ x, y: H + 8 * dpr, vx: (Math.random() - .5) * 30 * dpr, vy: -H * (.3 + Math.random() * .38) * (.55 + mid * .65),
      age: 0, life: .85 + Math.random() * .9, size: H * (.1 + Math.random() * .12) * (.65 + mid * .55), ph: Math.random() * 6.3, spark: false });
  };
  const spark = () => ps.push({ x: W * (.2 + Math.random() * .6), y: H, vx: (Math.random() - .5) * 90 * dpr, vy: -H * (.35 + Math.random() * .55),
    age: 0, life: 1.4 + Math.random() * 1.6, size: (5 + Math.random() * 9) * dpr, ph: Math.random() * 6.3, spark: true });
  const step = dt => {
    t += dt; carry += dt * 520; while (carry >= 1) { emit(); carry--; }
    if (Math.random() < dt * 22) spark();
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; p.age += dt;
      if (p.age >= p.life) { ps.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(t * 3.2 + p.ph) * (p.spark ? 25 : 55) * dpr) * dt; p.y += p.vy * dt;
    }
  };
  const draw = () => {
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      const f = p.age / p.life;
      if (p.spark) { ctx.globalAlpha = (1 - f) * (.55 + .45 * Math.sin(t * 30 + p.ph)); ctx.drawImage(SP[0], p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); continue; }
      const s = p.size * (1 - f * .65);
      ctx.globalAlpha = Math.pow(1 - f, 1.2) * .62;
      ctx.drawImage(SP[f < .14 ? 0 : f < .55 ? 1 : 2], p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  };
  for (let i = 0; i < 70; i++) step(1 / 60);       // pre-warm so the fire is already roaring on the first frame
  const loop = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; step(dt); draw(); raf = requestAnimationFrame(loop); };
  draw(); raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

let gateBusy = false;
function dojoGate(href) {
  if (gateBusy) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { location.hash = href; return; }
  gateBusy = true;
  const g = document.createElement('div');
  g.id = 'gate';
  g.innerHTML = `<canvas></canvas><div class="g-copy"><p>ENTERING</p><b>KKM DOJO</b></div>`;
  document.body.appendChild(g);
  const stop = fireStart(g.querySelector('canvas'));
  requestAnimationFrame(() => g.classList.add('on'));            // fade in
  setTimeout(() => { location.hash = href; g.classList.add('off'); }, 1900);   // dojo opens underneath, fire fades away
  setTimeout(() => { stop(); g.remove(); gateBusy = false; }, 2700);
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a.card');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  dojoGate(a.getAttribute('href'));
});
