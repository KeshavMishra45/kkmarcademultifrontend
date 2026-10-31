/* KKM Games: Anime Memory Match. Uses helpers from app.js / games.js (view, store, onWin, LEVELS, lvDef, lvP ...). */
const MEM_THEMES = {
  naru: { name: 'Naruto',               n: 16 },
  kono: { name: 'Konosuba',             n: 16 },
  onep: { name: 'One Piece',            n: 16 },
  dxd:  { name: 'DxD & Date A Live',    n: 12 },
  mix:  { name: 'Mixed' },
};
const memTiles = k => Array.from({ length: MEM_THEMES[k].n }, (_, i) => `${k}${String(i + 1).padStart(2, '0')}`);
const memShuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const memTheme = () => { const t = store.get('memtheme', 'naru'); return MEM_THEMES[t] ? t : 'naru'; };
const memPick = (theme, pairs) => { // tiles for this board. A small theme is topped up from the others.
  const keys = Object.keys(MEM_THEMES).filter(k => k !== 'mix');
  if (theme === 'mix') return memShuffle(keys.flatMap(memTiles)).slice(0, pairs);
  const own = memShuffle(memTiles(theme)), rest = memShuffle(keys.filter(k => k !== theme).flatMap(memTiles));
  return [...own, ...rest].slice(0, pairs);
};
function memThemePicker() {
  const t = memTheme();
  return `<h3 class="sec">Pick a theme</h3><div class="themes">${Object.entries(MEM_THEMES).map(([k, v]) =>
    `<button class="theme ${k === t ? 'on' : ''}" data-theme="${k}">${k === 'mix' ? '🎲' : `<img src="assets/img/mem/${k}01.jpg" alt="">`}<span>${v.name}</span></button>`).join('')}</div>`;
}
function memThemeBind() {
  document.querySelectorAll('.theme').forEach(b => b.onclick = () => {
    store.set('memtheme', b.dataset.theme);
    document.querySelectorAll('.theme').forEach(x => x.classList.toggle('on', x === b));
  });
}
const memBest = l => (store.get('membest', {}))[l];

function memoryMatch(lvId = 'easy') {
  if (gameCleanup) gameCleanup();
  const id = 'mem', L = lvDef(id, lvId), theme = memTheme(), pairs = L.cols * L.rows / 2;
  const picks = memPick(theme, pairs), deck = memShuffle([...picks, ...picks].map((src, i) => ({ src, k: src })));
  const idx = LEVELS.mem.findIndex(x => x.id === lvId), next = LEVELS.mem[idx + 1];
  let first = null, lock = false, moves = 0, found = 0, t0 = 0, secs = 0, over = false, alive = true, tm = null;
  picks.forEach(s => { const i = new Image(); i.src = `assets/img/mem/${s}.jpg`; });
  const fmtT = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  view.innerHTML = `<section class="page game-page play mem-page"><a class="back" href="#/games">← All games</a>
    <h2>Memory Match</h2>
    <p class="muted">Flip two cards at a time and find every matching pair.</p>
    ${lvLine('memory-match', id, lvId, ` (${L.cols} × ${L.rows}) · Theme: <b>${MEM_THEMES[theme].name}</b>`)}
    ${loginHint()}
    <div class="gstats" id="gstats"></div>
    <div class="pac-hud mem-hud">
      <div class="chip"><span>Moves</span><b id="mMoves">0</b></div>
      <div class="chip"><span>Pairs</span><b id="mPairs">0/${pairs}</b></div>
      <div class="chip"><span>Time</span><b id="mTime">0:00</b></div>
    </div>
    <div class="mwrap" style="--cols:${L.cols};--rows:${L.rows}"><div class="mgrid" id="mgrid">${deck.map((c, i) => `<button class="mcard" data-i="${i}" aria-label="Card ${i + 1}, face down"><span class="mi"><span class="mf mback"></span><span class="mf mfront"><img src="assets/img/mem/${c.src}.jpg" alt="" draggable="false"></span></span></button>`).join('')}</div><div id="mend" class="mover"></div></div>
    <p class="status" id="status" aria-live="polite">Flip a card to start</p></section>`;
  const cards = [...view.querySelectorAll('.mcard')], st = $('#status');
  const refresh = () => { $('#gstats').innerHTML = statsInner(id, lvId) + (memBest(lvId) ? `<div class="chip"><span>Best (${L.name})</span><b>${memBest(lvId).moves} moves · ${fmtT(memBest(lvId).secs)}</b></div>` : ''); };
  const tick = () => { secs = Math.floor((Date.now() - t0) / 1000); $('#mTime').textContent = fmtT(secs); };
  const setUp = (i, on) => { cards[i].classList.toggle('up', on); cards[i].setAttribute('aria-label', on ? `Card ${i + 1}, ${deck[i].src}` : `Card ${i + 1}, face down`); };

  function finish() {
    over = true; clearInterval(tm); tick();
    const stars = moves <= pairs * 1.5 ? 3 : moves <= pairs * 2.4 ? 2 : 1;
    const b = store.get('membest', {}), cur = b[lvId];
    if (!cur || moves < cur.moves || (moves === cur.moves && secs < cur.secs)) { b[lvId] = { moves, secs, stars: Math.max(stars, cur ? cur.stars : 0) }; store.set('membest', b); }
    const got = onWin(id, lvId), cleared = lvP(id, lvId).n === lvDef(id, lvId).goal;
    if (got) toast('+' + WIN_POINTS);
    st.textContent = `Board cleared in ${moves} moves and ${fmtT(secs)}.${got ? ' +' + WIN_POINTS + ' points' : ' Log in to earn points.'}${cleared ? ' Level cleared! 🎉' : ''}`;
    $('#mend').innerHTML = `<div class="mresult"><div class="stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></div>
      <div class="row"><button class="btn" id="mAgain">Play again</button>${next ? `<a class="btn ghost" href="#/game/memory-match/${next.id}">Next: ${next.name} →</a>` : ''}<a class="btn ghost" href="#/game/memory-match">Change level</a></div></div>`;
    $('#mAgain').onclick = () => memoryMatch(lvId);
    refresh();
  }
  cards.forEach((c, i) => c.onclick = () => {
    if (lock || over || c.classList.contains('up')) return;
    if (!t0) { t0 = Date.now(); tm = setInterval(tick, 500); st.textContent = 'Find the pairs'; }
    setUp(i, true);
    if (first === null) { first = i; return; }
    const a = first; first = null; moves++; $('#mMoves').textContent = moves;
    if (deck[a].k === deck[i].k) {
      found++; $('#mPairs').textContent = `${found}/${pairs}`;
      setTimeout(() => { cards[a].classList.add('hit'); cards[i].classList.add('hit'); }, 350);
      if (found === pairs) setTimeout(() => alive && finish(), 700);
    } else {
      lock = true;
      setTimeout(() => { if (!alive) return; setUp(a, false); setUp(i, false); lock = false; }, L.flip);
    }
  });
  gameCleanup = () => { alive = false; clearInterval(tm); gameCleanup = null; };
  refresh();
}
