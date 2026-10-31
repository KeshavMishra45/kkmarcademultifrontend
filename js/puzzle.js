/* KKM Games: Anime Sliding Puzzle. Slide tiles into the empty space to rebuild the picture.
   Uses helpers from app.js / games.js (view, store, onWin, LEVELS, lvDef, lvP, statsInner ...). */
const PUZ_IMGS = [
  { id: 'p1', name: 'Meteor Night',   w: 563, h: 900 },
  { id: 'p2', name: 'Straw Hat Crew', w: 415, h: 739 },
  { id: 'p3', name: 'Luffy Fire',     w: 506, h: 900 },
  { id: 'p4', name: 'Water Breathing', w: 414, h: 741 },
  { id: 'p5', name: 'Sakura Street',  w: 738, h: 414 },
  { id: 'p6', name: 'Mountain Peak',  w: 597, h: 335 },
];
const puzImg = () => PUZ_IMGS.find(p => p.id === store.get('puzimg', 'p2')) || PUZ_IMGS[1];
function puzPicker() {
  const cur = puzImg().id;
  return `<h3 class="sec">Pick a picture</h3><div class="puzpick">${PUZ_IMGS.map(p =>
    `<button class="pimg ${p.id === cur ? 'on' : ''}" data-img="${p.id}" aria-label="${p.name}"><img src="assets/img/puz/${p.id}.jpg" alt="${p.name}"></button>`).join('')}</div>`;
}
function puzBind() {
  document.querySelectorAll('.pimg').forEach(b => b.onclick = () => {
    store.set('puzimg', b.dataset.img);
    document.querySelectorAll('.pimg').forEach(x => x.classList.toggle('on', x === b));
  });
}
const puzBest = l => (store.get('puzbest', {}))[l];

function slidingPuzzle(lvId = 'easy') {
  if (gameCleanup) gameCleanup();
  const id = 'puz', L = lvDef(id, lvId), N = L.n, img = puzImg(), url = `assets/img/puz/${img.id}.jpg`;
  const idx = LEVELS.puz.findIndex(x => x.id === lvId), next = LEVELS.puz[idx + 1];
  const fmtT = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  let tiles, empty, moves = 0, t0 = 0, secs = 0, tm = null, over = false, alive = true, nums = false, ready = false;
  // tiles[pos] = piece number (0 .. N*N-2), empty cell is the piece N*N-1 (stored as -1)
  const solved = () => tiles.every((v, i) => v === (i === N * N - 1 ? -1 : i));
  function scramble() {
    tiles = Array.from({ length: N * N }, (_, i) => i === N * N - 1 ? -1 : i); empty = N * N - 1;
    let prev = -1;
    for (let k = 0; k < N * N * 24 || solved(); k++) { // random legal moves from the solved state, so it is always solvable
      const r = Math.floor(empty / N), c = empty % N, opts = [];
      if (r > 0) opts.push(empty - N); if (r < N - 1) opts.push(empty + N); if (c > 0) opts.push(empty - 1); if (c < N - 1) opts.push(empty + 1);
      const o = opts.filter(x => x !== prev), pick = o[Math.floor(Math.random() * o.length)];
      tiles[empty] = tiles[pick]; tiles[pick] = -1; prev = empty; empty = pick;
    }
  }
  view.innerHTML = `<section class="page game-page play puz-page">
    <div class="ptop"><a class="back" href="#/games">← All games</a><h2>Sliding Puzzle</h2></div>
    <p class="muted">Slide the tiles into the empty space to rebuild the picture.</p>
    ${lvLine('sliding-puzzle', id, lvId, ` (${N} × ${N}) · ${img.name}`)}
    ${loginHint()}
    <div class="pac-hud puz-hud">
      <div id="pLv" style="display:contents"></div>
      <div class="chip"><span>Moves</span><b id="pMoves">0</b></div>
      <div class="chip"><span>Time</span><b id="pTime">0:00</b></div>
      <div class="chip"><span>Best</span><b id="pBest">–</b></div>
    </div>
    <div class="pstage" id="pstage"><div class="pboard" id="pboard"></div><div id="mend" class="mover"></div></div>
    <p class="status" id="status" aria-live="polite">Tap a tile next to the gap</p>
    <div class="ptools"><button class="btn ghost" id="pPeek">👁 Peek</button><button class="btn ghost" id="pNum">#  Numbers</button><button class="btn ghost" id="pShuf">⟳ Shuffle</button></div></section>`;
  const stage = $('#pstage'), board = $('#pboard'), st = $('#status');
  const refresh = () => { $('#pLv').innerHTML = lvChip(id, lvId); const b = puzBest(lvId); $('#pBest').textContent = b ? `${b.moves} · ${fmtT(b.secs)}` : '–'; };
  const tick = () => { secs = Math.floor((Date.now() - t0) / 1000); $('#pTime').textContent = fmtT(secs); };

  // fit the board inside the space left on screen (no page scrolling)
  function fit() {
    const r = stage.getBoundingClientRect(), ar = img.w / img.h;
    const aw = stage.clientWidth, ah = Math.max(120, window.innerHeight - r.top - (innerWidth <= 480 ? 118 : 128));
    let w = Math.min(aw, 640), h = w / ar; if (h > ah) { h = ah; w = h * ar; }
    board.style.width = w + 'px'; board.style.height = h + 'px';
  }
  function build() {
    board.innerHTML = ''; board.style.setProperty('--img', `url(${url})`);
    for (let p = 0; p < N * N - 1; p++) {
      const b = document.createElement('button'), r = Math.floor(p / N), c = p % N;
      b.className = 'ptile'; b.dataset.p = p; b.setAttribute('aria-label', `Tile ${p + 1}`);
      b.style.cssText = `width:${100 / N}%;height:${100 / N}%;background-image:url(${url});background-size:${N * 100}% ${N * 100}%;background-position:${N > 1 ? c / (N - 1) * 100 : 0}% ${N > 1 ? r / (N - 1) * 100 : 0}%`;
      b.innerHTML = `<i>${p + 1}</i>`;
      b.onclick = () => clickTile(p);
      board.appendChild(b);
    }
    board.classList.toggle('nums', nums);
    place();
  }
  const posOf = p => tiles.indexOf(p);
  function place() {
    board.querySelectorAll('.ptile').forEach(b => {
      const p = +b.dataset.p, pos = posOf(p), r = Math.floor(pos / N), c = pos % N;
      b.style.transform = `translate(${c * 100}%,${r * 100}%)`;
      b.classList.toggle('ok', pos === p);
    });
  }
  function move(pos) { // slide the line of tiles between pos and the empty cell
    const er = Math.floor(empty / N), ec = empty % N, pr = Math.floor(pos / N), pc = pos % N;
    if (er !== pr && ec !== pc) return false;
    const step = er === pr ? (pc < ec ? 1 : -1) : (pr < er ? N : -N);
    let cur = empty; while (cur !== pos) { tiles[cur] = tiles[cur - step]; cur -= step; }
    tiles[pos] = -1; empty = pos; return true;
  }
  function clickTile(p) {
    if (over || !ready) return;
    const pos = posOf(p); if (!move(pos)) return;
    if (!t0) { t0 = Date.now(); tm = setInterval(tick, 500); st.textContent = 'Keep sliding!'; }
    moves++; $('#pMoves').textContent = moves; place();
    if (solved()) setTimeout(() => alive && finish(), 350);
  }
  function key(dx, dy) { // arrow = move the tile that is on that side of the gap into it
    const r = Math.floor(empty / N), c = empty % N, rr = r + dy, cc = c + dx;
    if (rr < 0 || rr >= N || cc < 0 || cc >= N) return; clickTile(tiles[rr * N + cc]);
  }
  const onKey = e => {
    if (e.target.closest && e.target.closest('input,textarea,select,dialog')) return;
    const m = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0], w: [0, 1], s: [0, -1], a: [1, 0], d: [-1, 0] }[e.key];
    if (m) { e.preventDefault(); key(m[0], m[1]); }
  };
  function finish() {
    over = true; clearInterval(tm); tick(); board.classList.add('done');
    const par = N * N * (N + 1) * 1.6, stars = moves <= par * .6 ? 3 : moves <= par ? 2 : 1;
    const b = store.get('puzbest', {}), cur = b[lvId];
    if (!cur || moves < cur.moves || (moves === cur.moves && secs < cur.secs)) { b[lvId] = { moves, secs }; store.set('puzbest', b); }
    const got = onWin(id, lvId), cleared = lvP(id, lvId).n === lvDef(id, lvId).goal;
    if (got) toast('+' + WIN_POINTS);
    st.textContent = `Solved in ${moves} moves and ${fmtT(secs)}.${got ? ' +' + WIN_POINTS + ' points' : ' Log in to earn points.'}${cleared ? ' Level cleared! 🎉' : ''}`;
    $('#mend').innerHTML = `<div class="mresult"><div class="stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></div>
      <div class="row"><button class="btn" id="pAgain">Play again</button>${next ? `<a class="btn ghost" href="#/game/sliding-puzzle/${next.id}">Next: ${next.name} →</a>` : ''}<a class="btn ghost" href="#/game/sliding-puzzle">Change level</a></div></div>`;
    $('#pAgain').onclick = () => slidingPuzzle(lvId);
    refresh();
  }
  function start() {
    clearInterval(tm); t0 = 0; secs = 0; moves = 0; over = false; ready = true; $('#mend').innerHTML = '';
    $('#pMoves').textContent = 0; $('#pTime').textContent = '0:00'; board.classList.remove('done');
    st.textContent = 'Tap a tile next to the gap'; scramble(); place();
  }
  $('#pPeek').onpointerdown = () => board.classList.add('peek');
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#pPeek').addEventListener(ev, () => board.classList.remove('peek')));
  $('#pNum').onclick = () => { nums = !nums; board.classList.toggle('nums', nums); };
  $('#pShuf').onclick = start;
  addEventListener('keydown', onKey); addEventListener('resize', fit);
  gameCleanup = () => { alive = false; clearInterval(tm); removeEventListener('keydown', onKey); removeEventListener('resize', fit); gameCleanup = null; };
  const pre = new Image(); pre.src = url;
  scramble(); build(); ready = true; refresh(); fit(); setTimeout(fit, 120);
}
