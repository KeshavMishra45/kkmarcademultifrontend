/* KKM Games: the on-screen part of each ONLINE game. mp.js draws the frame (players, status line, buttons) and asks the
   game below to draw the middle. Each entry is a factory: MP_UI[slug]() returns a fresh object for one match with
     build(body, m)   create the board once       paint(m)  update it from the server state (runs on every update)
     status(m)        line shown while playing    turn(m)   whose turn to highlight (0/1/null)
     badge(m, i)      small text on player i's card   sym(i)  symbol on player i's card
     holding(m)       true while an animation plays (the final result text waits)   extra(m)  text added after the result
     invalid(d)       return true to hide the server's "invalid move" toast         destroy()  stop timers / listeners
   Uses globals: mp, mpEmit, mpMatchPaint, IMG, RPS (games.js), PUZ_IMGS (puzzle.js), $ (app.js). */
const MP_UI = {};

/* ===================== Tic Tac Toe ===================== */
MP_UI['tic-tac-toe'] = () => {
  const sym = i => IMG(i === 0 ? 'shuriken' : 'strawhat', i === 0 ? 'X' : 'O');
  let board;
  return {
    sym,
    turn: m => m.status === 'done' ? null : m.state.turn,
    build(body) {
      body.innerHTML = `<div class="board mm-board" id="mmBoard">${Array.from({ length: 9 }, (_, i) => `<button class="cell" data-i="${i}" aria-label="Cell ${i + 1}"></button>`).join('')}</div>`;
      board = body.firstElementChild;
      board.querySelectorAll('.cell').forEach(c => c.onclick = () => { if (mp.match) mpEmit('match:move', { matchId: mp.match.id, move: { cell: +c.dataset.i } }); });
    },
    paint(m) {
      const st = m.state, done = m.status === 'done', myTurn = !done && st.turn === m.you;
      board.querySelectorAll('.cell').forEach((c, i) => {                // only touch cells that changed, so the pop animation doesn't replay
        const v = st.board[i], key = v === null ? '' : String(v);
        if (c.dataset.v !== key) { c.dataset.v = key; c.innerHTML = v === null ? '' : sym(v); c.setAttribute('aria-label', `Cell ${i + 1}, ${v === null ? 'empty' : v === 0 ? 'shuriken' : 'Straw Hat'}`); }
        c.disabled = !myTurn || v !== null;
        c.classList.toggle('win', !!(done && m.result.line && m.result.line.includes(i)));
      });
    },
    status: m => m.state.turn === m.you ? 'Your turn' : `Waiting for ${m.players[1 - m.you].name}…`,
  };
};

/* ===================== Rock Paper Scissors (best of 3, picks revealed together) ===================== */
MP_UI['rock-paper-scissors'] = () => {
  const timers = [], later = (fn, ms) => timers.push(setTimeout(fn, ms));
  let shown, busy = false, msg = '', meEl, opEl, roundEl, btns = [];
  const info = id => RPS.find(r => r.id === id);
  const hand = (el, id, cls = '', mark = '?') => {
    el.className = 'hand ' + cls;
    el.innerHTML = id ? IMG(info(id).img, info(id).name) : `<span class="q ${mark === '✔' ? 'lock' : ''}">${mark}</span>`;
  };
  const roundResult = (m, r) => r.winner === null ? 'd' : r.winner === m.you ? 'w' : 'l';
  const showRound = (m, r) => {                                                    // static: both picks, winner highlighted
    const res = roundResult(m, r);
    hand(meEl, r.picks[m.you], res === 'w' ? 'won' : res === 'l' ? 'lost' : '');
    hand(opEl, r.picks[1 - m.you], res === 'l' ? 'won' : res === 'w' ? 'lost' : '');
  };
  function reveal(m, r) {                                                          // shake, then show both picks at once
    const opp = m.players[1 - m.you];
    busy = true; msg = '…'; hand(meEl, null, 'shake'); hand(opEl, null, 'shake');
    later(() => {
      showRound(m, r);
      const a = info(r.picks[m.you]).name, b = info(r.picks[1 - m.you]).name, res = roundResult(m, r);
      msg = res === 'd' ? `Both picked ${a}. Draw round, pick again!` : res === 'w' ? `${a} beats ${b}. You take the round!` : `${b} beats ${a}. ${opp.name} takes the round.`;
      mpMatchPaint(false);
    }, 800);
    later(() => { busy = false; msg = ''; mpMatchPaint(false); }, 2500);
  }
  return {
    holding: () => busy,
    badge: (m, i) => `<span aria-label="${m.state.scores[i]} of ${m.state.need} rounds won">${'●'.repeat(m.state.scores[i])}${'○'.repeat(Math.max(0, m.state.need - m.state.scores[i]))}</span>`,
    build(body, m) {
      body.innerHTML = `<p class="mm-sub" id="rpsRound"></p>
        <div class="arena"><div><div class="hand" id="rpsMe"></div><p class="muted">You</p></div><span class="vs">VS</span><div><div class="hand" id="rpsOp"></div><p class="muted">${esc(m.players[1 - m.you].name)}</p></div></div>
        <div class="picks mm-picks">${RPS.map(r => `<button class="pick" data-id="${r.id}" aria-label="${r.name}">${IMG(r.img)}<span>${r.name}</span></button>`).join('')}</div>`;
      meEl = $('#rpsMe', body); opEl = $('#rpsOp', body); roundEl = $('#rpsRound', body);
      btns = [...body.querySelectorAll('.pick')];
      btns.forEach(b => b.onclick = () => { const mm = mp.match; if (mm && mm.status === 'playing' && !busy && mm.state.mine === null) mpEmit('match:move', { matchId: mm.id, move: { pick: b.dataset.id } }); });
    },
    paint(m) {
      const st = m.state, done = m.status === 'done', you = m.you;
      if (shown === undefined) shown = st.rounds.length;                           // first paint (e.g. after a refresh): no animation
      else if (st.rounds.length > shown) { shown = st.rounds.length; reveal(m, st.rounds[shown - 1]); }
      roundEl.textContent = done ? `Final score ${st.scores[you]} – ${st.scores[1 - you]}` : `Round ${st.rounds.length + 1} · first to ${st.need} round wins`;
      if (!busy) {
        if (done && st.rounds.length) showRound(m, st.rounds[st.rounds.length - 1]);
        else { hand(meEl, st.mine); hand(opEl, null, '', st.locked[1 - you] ? '✔' : '?'); }
      }
      btns.forEach(b => { b.disabled = done || busy || st.mine !== null; b.classList.toggle('chosen', st.mine === b.dataset.id); });
    },
    status(m) {
      if (busy) return msg;
      const st = m.state, opp = m.players[1 - m.you];
      if (st.mine) return `Locked in. Waiting for ${opp.name}…`;
      if (st.locked[1 - m.you]) return `${opp.name} has picked. Your move!`;
      return st.rounds.length ? 'Pick your weapon' : 'Pick your weapon. Both picks are revealed together.';
    },
    extra: m => `Rounds won: you ${m.state.scores[m.you]}, ${m.players[1 - m.you].name} ${m.state.scores[1 - m.you]}.`,
    destroy() { timers.forEach(clearTimeout); },
  };
};

/* ===================== Memory Match (keep your turn while you find pairs) ===================== */
MP_UI['memory-match'] = () => {
  let grid, cards = [];
  return {
    turn: m => m.status === 'done' ? null : m.state.turn,
    badge: (m, i) => `${m.state.scores[i]} pair${m.state.scores[i] === 1 ? '' : 's'}`,
    build(body, m) {
      const st = m.state;
      body.innerHTML = `<div class="mwrap mm-mem" style="--cols:${st.cols};--rows:${st.rows}"><div class="mgrid" id="mmGrid">${Array.from({ length: st.cols * st.rows }, (_, i) =>
        `<button class="mcard" data-i="${i}" aria-label="Card ${i + 1}, face down"><span class="mi"><span class="mf mback"></span><span class="mf mfront"><img alt="" draggable="false"></span></span></button>`).join('')}</div></div>`;
      grid = $('#mmGrid', body); cards = [...grid.children];
      cards.forEach((c, i) => c.onclick = () => {
        const mm = mp.match; if (!mm || mm.status !== 'playing') return;
        const s = mm.state; if (s.turn !== mm.you || s.locked || s.cards[i] !== null) return;
        mpEmit('match:move', { matchId: mm.id, move: { cell: i } });
      });
    },
    paint(m) {
      const st = m.state, myTurn = m.status === 'playing' && st.turn === m.you && !st.locked;
      grid.classList.toggle('wait', !myTurn);
      cards.forEach((c, i) => {
        const key = st.cards[i], up = key !== null, o = st.owner[i], img = c.querySelector('img');
        if (up && img.dataset.k !== key) { img.dataset.k = key; img.src = `assets/img/mem/${key}.jpg`; }   // a picture only exists in the browser once the server shows it
        c.classList.toggle('up', up);
        c.classList.toggle('hit', o !== null);
        c.classList.toggle('mine', o === m.you);
        c.classList.toggle('theirs', o !== null && o !== m.you);
        c.setAttribute('aria-label', `Card ${i + 1}, ${up ? 'face up' : 'face down'}`);
      });
    },
    status(m) {
      const st = m.state, opp = m.players[1 - m.you], left = st.pairs - st.scores[0] - st.scores[1];
      if (st.locked) return st.turn === m.you ? 'No match. The cards flip back…' : `${opp.name} missed. The cards flip back…`;
      return st.turn === m.you ? `Your turn. Find a pair and you go again! (${left} left)` : `${opp.name}'s turn…`;
    },
    extra: m => `Pairs: you ${m.state.scores[m.you]}, ${m.players[1 - m.you].name} ${m.state.scores[1 - m.you]}.`,
  };
};

/* ===================== Sliding Puzzle (race: same shuffled picture for both) ===================== */
MP_UI['sliding-puzzle'] = () => {
  let M = null, board, stage, cd, timeEl, movesEl, meEl, opEl, img, url, n = 4, tiles = [], seq = 0, moves = 0;
  let t0 = 0, tm = null, nums = false, resync = false, lastSend = 0;
  const fmtT = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const elapsed = () => performance.now() - t0;                          // ms since the race started (negative during the countdown)
  const home = t => t.reduce((c, v, i) => c + (v === i ? 1 : 0), 0);
  const emptyAt = () => tiles.indexOf(-1);
  function slide(pos) {                                                  // same rule as the server (the server re-checks every move)
    const empty = emptyAt(), N = n;
    if (!Number.isInteger(pos) || pos < 0 || pos >= N * N || pos === empty) return false;
    const er = Math.floor(empty / N), ec = empty % N, pr = Math.floor(pos / N), pc = pos % N;
    if (er !== pr && ec !== pc) return false;
    const step = er === pr ? (pc < ec ? 1 : -1) : (pr < er ? N : -N);
    let cur = empty; while (cur !== pos) { tiles[cur] = tiles[cur - step]; cur -= step; }
    tiles[pos] = -1; return true;
  }
  function fit() {                                                       // fit the board in the space left on screen
    if (!stage || !stage.isConnected) return;
    const ar = img.w / img.h, r = stage.getBoundingClientRect();
    const aw = stage.clientWidth, ah = Math.max(150, innerHeight - r.top - (innerWidth <= 480 ? 150 : 160));
    let w = Math.min(aw, 440), h = w / ar; if (h > ah) { h = ah; w = h * ar; }
    board.style.width = w + 'px'; board.style.height = h + 'px';
  }
  function place() {
    board.querySelectorAll('.ptile').forEach(b => {
      const p = +b.dataset.p, pos = tiles.indexOf(p), r = Math.floor(pos / n), c = pos % n;
      b.style.transform = `translate(${c * 100}%,${r * 100}%)`; b.classList.toggle('ok', pos === p);
    });
    movesEl.textContent = moves; meEl.textContent = `${home(tiles)}/${n * n - 1}`;
  }
  function click(p) {
    const m = mp.match; if (!m || m.status !== 'playing' || elapsed() < 0) return;
    if (!(mp.socket && mp.socket.connected)) return mpEmit('match:move', {});          // shows "not connected"; nothing is moved locally
    const pos = tiles.indexOf(p); if (!slide(pos)) return;
    seq++; moves++; lastSend = performance.now(); place();                              // slide right away; the server's answer confirms it
    mp.socket.emit('match:move', { matchId: m.id, move: { pos, seq } });
  }
  const onKey = e => {
    if (e.repeat || !mp.match || mp.match.status !== 'playing') return;
    if (e.target.closest && e.target.closest('input,textarea,select,dialog')) return;
    const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0], w: [0, 1], s: [0, -1], a: [1, 0], d: [-1, 0] }[e.key];
    if (!d) return; e.preventDefault();
    const em = emptyAt(), r = Math.floor(em / n) + d[1], c = em % n + d[0];       // arrow = move the tile on that side of the gap into it
    if (r >= 0 && r < n && c >= 0 && c < n) click(tiles[r * n + c]);
  };
  function tick() {
    if (!M || M.status === 'done') return;
    const el = elapsed();
    if (el < 0) { cd.textContent = Math.ceil(-el / 1000); cd.className = 'pz-cd on'; timeEl.textContent = '0:00'; }
    else { timeEl.textContent = fmtT(el); if (el < 800) { cd.textContent = 'GO!'; cd.className = 'pz-cd on go'; } else { cd.textContent = ''; cd.className = 'pz-cd'; } }
  }
  return {
    build(body, m) {
      const st = m.state; n = st.n;
      img = PUZ_IMGS.find(p => p.id === st.img) || PUZ_IMGS[0]; url = `assets/img/puz/${img.id}.jpg`;
      tiles = st.tiles.slice(); seq = st.ack; moves = st.moves; t0 = performance.now() - st.clock;
      body.innerHTML = `<div class="pz-info"><span>Time <b id="pzTime">0:00</b></span><span>Moves <b id="pzMoves">0</b></span><span>You <b id="pzMe">0</b></span><span>Rival <b id="pzOp">0</b></span></div>
        <div class="pstage" id="pzStage"><div class="pboard" id="pzBoard"></div></div>
        <div class="ptools"><button class="btn ghost" id="pzPeek">👁 Peek</button><button class="btn ghost" id="pzNum">#  Numbers</button></div>`;
      stage = $('#pzStage', body); board = $('#pzBoard', body); timeEl = $('#pzTime', body); movesEl = $('#pzMoves', body); meEl = $('#pzMe', body); opEl = $('#pzOp', body);
      board.style.setProperty('--img', `url(${url})`);
      for (let p = 0; p < n * n - 1; p++) {
        const b = document.createElement('button'), r = Math.floor(p / n), c = p % n;
        b.className = 'ptile'; b.dataset.p = p; b.setAttribute('aria-label', `Tile ${p + 1}`);
        b.style.cssText = `width:${100 / n}%;height:${100 / n}%;background-image:url(${url});background-size:${n * 100}% ${n * 100}%;background-position:${c / (n - 1) * 100}% ${r / (n - 1) * 100}%`;
        const at = tiles.indexOf(p); b.style.transform = `translate(${at % n * 100}%,${Math.floor(at / n) * 100}%)`;   // start in place: no fly-in from the corner
        b.innerHTML = `<i>${p + 1}</i>`; b.onclick = () => click(p); board.appendChild(b);
      }
      cd = document.createElement('div'); cd.className = 'pz-cd'; cd.setAttribute('aria-live', 'assertive'); board.appendChild(cd);
      $('#pzPeek', body).onpointerdown = () => board.classList.add('peek');
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#pzPeek', body).addEventListener(ev, () => board.classList.remove('peek')));
      $('#pzNum', body).onclick = () => { nums = !nums; board.classList.toggle('nums', nums); };
      addEventListener('keydown', onKey); addEventListener('resize', fit);
      new Image().src = url; fit(); setTimeout(fit, 120);
    },
    paint(m) {
      M = m; const st = m.state, done = m.status === 'done';
      t0 = performance.now() - st.clock;
      // The server is the boss: take its board once it has seen all my slides (or if it ever disagrees / went quiet), otherwise keep my own
      if (done || st.ack >= seq || resync || performance.now() - lastSend > 2500) { tiles = st.tiles.slice(); seq = st.ack; moves = st.moves; resync = false; }
      place();
      opEl.textContent = `${st.opponent.placed}/${n * n - 1}`;
      board.classList.toggle('done', done && m.result.winner === m.you);
      if (done) { clearInterval(tm); tm = null; cd.className = 'pz-cd'; timeEl.textContent = fmtT(m.result.stats ? m.result.stats.time : elapsed()); }
      else { if (!tm) tm = setInterval(tick, 100); tick(); }
      fit();
    },
    status: m => `First to rebuild the picture wins. ${m.players[1 - m.you].name} has ${m.state.opponent.placed}/${m.state.n * m.state.n - 1} tiles home.`,
    invalid() { resync = true; return true; },                           // a rejected slide just snaps my board back to the server's
    extra(m) {
      const r = m.result, s = r.stats; if (!s || r.reason !== 'win') return '';
      return r.winner === m.you ? `Solved in ${fmtT(s.time)} with ${s.moves[m.you]} moves.` : `${m.players[1 - m.you].name} solved it in ${fmtT(s.time)}.`;
    },
    destroy() { clearInterval(tm); tm = null; removeEventListener('keydown', onKey); removeEventListener('resize', fit); },
  };
};
