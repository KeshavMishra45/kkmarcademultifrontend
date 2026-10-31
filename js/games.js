/* KKM Games: Tic Tac Toe + Rock Paper Scissors. Uses helpers from app.js (view, store, day, recordWin, addPoints...). */

let gameCleanup = null; // set by games that need cleanup (timers, key listeners)
const IMG = (n, alt = '') => `<img src="assets/img/${n}.png" alt="${alt}" draggable="false">`;

function bump(id, k) {
  const r = store.get('rec', {}); r[id] = r[id] || { w: 0, l: 0, d: 0 }; r[id][k]++; store.set('rec', r);
}
function recOf(id) { return (store.get('rec', {}))[id] || { w: 0, l: 0, d: 0 }; }
function onWin(id, lv) { bump(id, 'w'); recordWin(id); if (lv) lvAdd(id, lv); return addPoints(WIN_POINTS); }

function statsInner(id, lv) {
  const c = CHALLENGES.find(x => x.id === id), d = day(), r = recOf(id), n = Math.min(d[id], c.goal);
  const rec = (id === 'mem' || id === 'puz') ? `<div class="chip"><span>${id === 'puz' ? 'Puzzles solved' : 'Boards cleared'}</span><b>${r.w}</b></div>` : `<div class="chip"><span>Your record</span><b>${r.w}W · ${r.l}L · ${r.d}D</b></div>`;
  return `${lv ? lvChip(id, lv) : ''}<div class="chip"><span>Today's challenge</span><b>${n}/${c.goal} ${c.unit || 'wins'}</b><div class="bar"><i style="width:${n / c.goal * 100}%"></i></div></div>
    ${rec}
    <div class="chip"><span>Per win</span><b>${shk()}+${WIN_POINTS}</b></div>`;
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = shk() + msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
const loginHint = () => user ? '' : '<p class="muted small">Log in to earn points. Your wins still count toward today\'s challenge.</p>';


// ================= LEVELS (shared by every game) =================
// goal = how much you must reach to clear the level. reward = bonus points (once, needs login).
const LEVELS = {
  ttt: [
    { id: 'easy',   name: 'Easy',   desc: 'The computer mostly plays at random.',        goal: 3, reward: 30 },
    { id: 'medium', name: 'Medium', desc: 'It blocks you and likes the centre.',          goal: 4, reward: 60 },
    { id: 'hard',   name: 'Hard',   desc: 'Almost perfect. Win when it slips.',           goal: 2, reward: 100 },
  ],
  rps: [
    { id: 'easy',   name: 'Easy',   desc: 'The computer picks completely at random.',     goal: 3, reward: 30 },
    { id: 'medium', name: 'Medium', desc: 'Sometimes it counters your last pick.',        goal: 4, reward: 60 },
    { id: 'hard',   name: 'Hard',   desc: 'It learns your favourite pick. Mix it up!',    goal: 5, reward: 100 },
  ],
  pac: [
    { id: 'easy',   name: 'Easy',   desc: '5 lives, slow Akatsuki, long Kurama power.',   goal: 1000, reward: 40,  unit: 'score' },
    { id: 'medium', name: 'Medium', desc: '3 lives, steady speed.',                       goal: 2000, reward: 80,  unit: 'score' },
    { id: 'hard',   name: 'Hard',   desc: '3 lives, fast Akatsuki, short Kurama power.',  goal: 3500, reward: 150, unit: 'score' },
  ],
  puz: [
    { id: 'easy',   name: 'Easy',   desc: '3 × 3 · 8 tiles',   n: 3, goal: 3, reward: 30,  unit: 'solves' },
    { id: 'medium', name: 'Medium', desc: '4 × 4 · 15 tiles',  n: 4, goal: 3, reward: 60,  unit: 'solves' },
    { id: 'hard',   name: 'Hard',   desc: '5 × 5 · 24 tiles',  n: 5, goal: 2, reward: 100, unit: 'solves' },
    { id: 'expert', name: 'Expert', desc: '6 × 6 · 35 tiles',  n: 6, goal: 1, reward: 150, unit: 'solves' },
  ],
  mem: [
    { id: 'easy',   name: 'Easy',   desc: '4 × 3 · 6 pairs',   cols: 4, rows: 3, flip: 1100, goal: 3, reward: 30,  unit: 'clears' },
    { id: 'medium', name: 'Medium', desc: '4 × 4 · 8 pairs',   cols: 4, rows: 4, flip: 900,  goal: 3, reward: 60,  unit: 'clears' },
    { id: 'hard',   name: 'Hard',   desc: '6 × 4 · 12 pairs',  cols: 6, rows: 4, flip: 750,  goal: 2, reward: 100, unit: 'clears' },
    { id: 'expert', name: 'Expert', desc: '6 × 5 · 15 pairs',  cols: 6, rows: 5, flip: 600,  goal: 2, reward: 150, unit: 'clears' },
  ],
};
const lvDef = (g, l) => LEVELS[g].find(x => x.id === l) || LEVELS[g][0];
const lvUnit = (g, l) => lvDef(g, l).unit || 'wins';
const progAll = () => store.get('prog', {});
const lvP = (g, l) => Object.assign({ n: 0, paid: false }, (progAll()[g] || {})[l]);
function lvSave(g, l, p) { const a = progAll(); a[g] = a[g] || {}; a[g][l] = p; store.set('prog', a); }
const lvDone = (g, l) => lvP(g, l).n >= lvDef(g, l).goal;
function lvPay(g, l, p) { // pays the level reward once, as soon as the player is logged in
  const d = lvDef(g, l);
  if (p.n >= d.goal && !p.paid && user) { p.paid = true; addPoints(d.reward); setTimeout(() => toast('+' + d.reward + ' level reward'), 1100); }
}
function lvAdd(g, l) { // +1 win. Returns true when this win just cleared the level
  const p = lvP(g, l), d = lvDef(g, l), was = p.n >= d.goal; p.n++; lvPay(g, l, p); lvSave(g, l, p); return !was && p.n >= d.goal;
}
function lvBest(g, l, v) { // for score based levels. Returns true when just cleared
  const p = lvP(g, l), d = lvDef(g, l), was = p.n >= d.goal; p.n = Math.max(p.n, v); lvPay(g, l, p); lvSave(g, l, p); return !was && p.n >= d.goal;
}
function lvChip(g, l) {
  const d = lvDef(g, l), p = lvP(g, l), n = Math.min(p.n, d.goal), ok = p.n >= d.goal;
  return `<div class="chip ${ok ? 'cleared' : ''}"><span>${d.name} goal${ok ? ' · cleared ✓' : ''}</span><b>${n.toLocaleString()}/${d.goal.toLocaleString()} ${lvUnit(g, l)}</b><div class="bar"><i style="width:${n / d.goal * 100}%"></i></div></div>`;
}

// Registry: slug -> info. start(levelId) launches the game.
const GAME_INFO = {
  'tic-tac-toe':         { key: 'ttt', title: 'Tic Tac Toe',         blurb: 'Beat the computer a set number of times to clear each level.', start: l => ticTacToe(l) },
  'rock-paper-scissors': { key: 'rps', title: 'Rock Paper Scissors', blurb: 'Win rounds against a computer that gets smarter on each level.', start: l => rockPaperScissors(l) },
  'ninja-ramen-rush':    { key: 'pac', title: 'Ninja Ramen Rush',    blurb: 'Reach the target score to clear each level.', start: l => ninjaRamenRush(l) },
  'sliding-puzzle':      { key: 'puz', title: 'Sliding Puzzle',      blurb: 'Slide the scrambled tiles back into the picture. Fewer moves, more stars.', start: l => slidingPuzzle(l),
                           extra: () => puzPicker(), bind: () => puzBind() },
  'memory-match':        { key: 'mem', title: 'Memory Match',        blurb: 'Find every anime pair. Bigger boards, shorter peeks.', start: l => memoryMatch(l),
                           extra: () => memThemePicker(), bind: () => memThemeBind() },
};
function openGame(slug, sub) {
  const gi = GAME_INFO[slug]; if (!gi) return false;
  if (LEVELS[gi.key].some(l => l.id === sub)) gi.start(sub); else levelScreen(slug, gi);
  return true;
}
const clearBtn = () => `<button class="btn ghost" data-clear>Clear game history</button>`;
function levelScreen(slug, gi) {
  const k = gi.key;
  view.innerHTML = `<section class="page game-page"><a class="back" href="#/games">← All games</a>
    <h2>${gi.title}</h2><p class="muted">${gi.blurb}</p>${loginHint()}
    ${gi.extra ? gi.extra() : ''}
    <h3 class="sec">Choose a level</h3>
    <div class="lvgrid">${LEVELS[k].map(d => {
      const p = lvP(k, d.id), n = Math.min(p.n, d.goal), ok = p.n >= d.goal, u = lvUnit(k, d.id);
      return `<a class="lvcard ${ok ? 'done' : ''}" href="#/game/${slug}/${d.id}">
        <div class="lvtop"><b>${d.name}</b>${ok ? '<span class="tick">✓ Cleared</span>' : ''}</div>
        <p class="muted">${d.desc}</p>
        <p class="goal">Goal: ${k === 'pac' ? 'score ' + d.goal.toLocaleString() : (k === 'mem' ? 'clear it ' + d.goal + ' times' : k === 'puz' ? 'solve it ' + d.goal + (d.goal > 1 ? ' times' : ' time') : 'beat it ' + d.goal + ' times')}</p>
        <div class="bar"><i style="width:${n / d.goal * 100}%"></i></div>
        <div class="lvfoot"><span class="muted">${n.toLocaleString()}/${d.goal.toLocaleString()} ${u}</span><span class="reward">${shk()}+${d.reward}</span></div></a>`;
    }).join('')}</div>
    <p style="margin-top:2rem">${clearBtn()}</p></section>`;
  document.querySelectorAll('.shk:empty').forEach(e => e.innerHTML = SHK);
  gi.bind && gi.bind();
}
const lvLine = (slug, k, l, extra = '') => `<p class="muted">Level: <b>${lvDef(k, l).name}</b>${extra} · <a class="lnk" href="#/game/${slug}">change level</a></p>`;

// ---------- Tic Tac Toe: you = shuriken (X), computer = Straw Hat logo (O) ----------
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const winnerOf = b => { for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { p: b[l[0]], line: l }; return null; };
function minimax(b, turn) { // O = computer. +1 O wins, -1 X wins
  const w = winnerOf(b); if (w) return w.p === 'O' ? 1 : -1; if (b.every(Boolean)) return 0;
  let best = turn === 'O' ? -2 : 2;
  for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = turn; const s = minimax(b, turn === 'O' ? 'X' : 'O'); b[i] = null; best = turn === 'O' ? Math.max(best, s) : Math.min(best, s); }
  return best;
}
function aiMove(b, lv) {
  const empty = b.map((v, i) => v ? null : i).filter(i => i !== null), rand = () => empty[Math.floor(Math.random() * empty.length)];
  const find = p => { for (const l of LINES) { const v = l.map(i => b[i]); if (v.filter(x => x === p).length === 2 && v.includes(null)) return l[v.indexOf(null)]; } return null; };
  if (lv === 'easy') { // 70% pure random, 30% takes a win or a block
    if (Math.random() < .7) return rand();
    let m = find('O'); if (m !== null) return m; m = find('X'); return m !== null ? m : rand();
  }
  if (lv === 'medium') { // always wins if it can, blocks 85% of the time, likes the centre
    let m = find('O'); if (m !== null) return m;
    m = find('X'); if (m !== null && Math.random() < .85) return m;
    if (!b[4] && Math.random() < .7) return 4;
    return rand();
  }
  if (Math.random() < .18) return rand(); // hard: perfect play with an 18% slip
  let bs = -2, best = [];
  for (const i of empty) { b[i] = 'O'; const s = minimax(b, 'X'); b[i] = null; if (s > bs) { bs = s; best = [i]; } else if (s === bs) best.push(i); }
  return best[Math.floor(Math.random() * best.length)];
}

function ticTacToe(lv = 'easy') {
  const id = 'ttt', b = Array(9).fill(null); let over = false, busy = false;
  view.innerHTML = `<section class="page game-page play"><a class="back" href="#/games">← All games</a>
    <h2>Tic Tac Toe</h2>
    <p class="muted">You are the ${IMG('shuriken', 'shuriken')} shuriken. The computer plays the ${IMG('strawhat', 'Straw Hat')} Straw Hat logo. Get three in a row.</p>
    ${lvLine('tic-tac-toe', id, lv)}
    ${loginHint()}
    <div class="gstats" id="gstats"></div>
    <div class="board" id="board">${Array.from({ length: 9 }, (_, i) => `<button class="cell" aria-label="Cell ${i + 1}, empty"></button>`).join('')}</div>
    <p class="status" id="status" aria-live="polite">Your turn</p>
    <button class="btn" id="again" hidden>Play again</button></section>`;
  const cells = [...view.querySelectorAll('.cell')], st = $('#status'), refresh = () => { $('#gstats').innerHTML = statsInner(id, lv); };
  const place = (i, p) => {
    b[i] = p; cells[i].innerHTML = IMG(p === 'X' ? 'shuriken' : 'strawhat'); cells[i].disabled = true;
    cells[i].setAttribute('aria-label', `Cell ${i + 1}, ${p === 'X' ? 'shuriken' : 'Straw Hat'}`);
  };
  const check = () => {
    const w = winnerOf(b);
    if (w) {
      over = true; w.line.forEach(i => cells[i].classList.add('win'));
      if (w.p === 'X') { const got = onWin(id, lv), cl = lvDone(id, lv); st.textContent = (got ? `You win! +${WIN_POINTS} points` : 'You win! Log in to earn points.') + (cl && lvP(id, lv).n === lvDef(id, lv).goal ? ' Level cleared! 🎉' : ''); if (got) toast('+' + WIN_POINTS); }
      else { bump(id, 'l'); st.textContent = 'Straw Hat wins. Try again!'; }
    } else if (b.every(Boolean)) { over = true; bump(id, 'd'); st.textContent = "It's a draw."; }
    if (over) { cells.forEach(c => c.disabled = true); $('#again').hidden = false; refresh(); }
    return over;
  };
  cells.forEach((c, i) => c.onclick = () => {
    if (over || busy || b[i]) return;
    place(i, 'X'); if (check()) return;
    busy = true; st.textContent = 'Straw Hat is thinking…';
    setTimeout(() => {
      if (!c.isConnected) return;
      place(aiMove(b, lv), 'O'); busy = false;
      if (!check()) st.textContent = 'Your turn';
    }, 600);
  });
  $('#again').onclick = () => ticTacToe(lv);
  refresh();
}

// ---------- Rock Paper Scissors: Devil Fruit = rock, Death Note = paper, Kunai = scissors ----------
const RPS = [
  { id: 'rock',     name: 'Devil Fruit', img: 'fruit',     beats: 'scissors' },
  { id: 'paper',    name: 'Death Note',  img: 'deathnote', beats: 'rock' },
  { id: 'scissors', name: 'Kunai',       img: 'kunai',     beats: 'paper' },
];
function rockPaperScissors(lv = 'easy') {
  const id = 'rps', hist = []; let busy = false;
  const beater = p => RPS.find(r => r.beats === p); // the pick that beats p
  const cpuPick = () => {
    const rnd = RPS[Math.floor(Math.random() * 3)];
    if (!hist.length || lv === 'easy') return rnd;
    if (lv === 'medium') return Math.random() < .4 ? beater(hist[hist.length - 1]) : rnd;
    const cnt = {}; hist.forEach(h => cnt[h] = (cnt[h] || 0) + 1);
    const fav = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    return Math.random() < .55 ? beater(fav) : rnd;
  };
  view.innerHTML = `<section class="page game-page play"><a class="back" href="#/games">← All games</a>
    <h2>Rock Paper Scissors</h2>
    <p class="muted">Devil Fruit is rock, Death Note is paper, Kunai is scissors. Pick one and face the computer.</p>
    ${lvLine('rock-paper-scissors', id, lv)}
    ${loginHint()}
    <div class="gstats" id="gstats"></div>
    <div class="arena">
      <div><div class="hand" id="me"><span class="q">?</span></div><p class="muted">You</p></div>
      <span class="vs">VS</span>
      <div><div class="hand" id="cpu"><span class="q">?</span></div><p class="muted">Computer</p></div>
    </div>
    <p class="status" id="status" aria-live="polite">Pick your weapon</p>
    <div class="picks">${RPS.map(r => `<button class="pick" data-id="${r.id}" aria-label="${r.name}">${IMG(r.img)}<span>${r.name}</span></button>`).join('')}</div>
    <div class="rules">${IMG('deathnote', 'Death Note')} beats ${IMG('fruit', 'Devil Fruit')} · ${IMG('fruit', 'Devil Fruit')} beats ${IMG('kunai', 'Kunai')} · ${IMG('kunai', 'Kunai')} beats ${IMG('deathnote', 'Death Note')}</div></section>`;
  const me = $('#me'), cpuEl = $('#cpu'), st = $('#status'), picks = [...view.querySelectorAll('.pick')];
  const refresh = () => { $('#gstats').innerHTML = statsInner(id, lv); };
  picks.forEach(btn => btn.onclick = () => {
    if (busy) return; busy = true; picks.forEach(p => p.disabled = true);
    const mine = RPS.find(r => r.id === btn.dataset.id), cpu = cpuPick(); hist.push(mine.id);
    me.className = cpuEl.className = 'hand shake'; me.innerHTML = cpuEl.innerHTML = '<span class="q">?</span>'; st.textContent = '…';
    setTimeout(() => {
      if (!me.isConnected) return;
      me.className = cpuEl.className = 'hand';
      me.innerHTML = IMG(mine.img, mine.name); cpuEl.innerHTML = IMG(cpu.img, cpu.name);
      const res = mine.id === cpu.id ? 'd' : mine.beats === cpu.id ? 'w' : 'l';
      if (res === 'w') {
        const got = onWin(id, lv); me.classList.add('won'); cpuEl.classList.add('lost');
        st.textContent = `${mine.name} beats ${cpu.name}. You win!${got ? ' +' + WIN_POINTS + ' points' : ' Log in to earn points.'}${lvP(id, lv).n === lvDef(id, lv).goal ? ' Level cleared! 🎉' : ''}`; if (got) toast('+' + WIN_POINTS);
      } else if (res === 'l') {
        bump(id, 'l'); cpuEl.classList.add('won'); me.classList.add('lost'); st.textContent = `${cpu.name} beats ${mine.name}. You lose.`;
      } else { bump(id, 'd'); st.textContent = 'Same pick. Draw!'; }
      refresh(); busy = false; picks.forEach(p => p.disabled = false);
    }, 800);
  });
  refresh();
}
