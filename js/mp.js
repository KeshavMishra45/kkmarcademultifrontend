/* KKM Games: online multiplayer (Socket.IO client).
   Players Online panel, challenge notifications, friend links and the live match screen.
   Uses globals from app.js / api.js: user, api, API_BASE, $, esc, avatarImg, getAv, refreshMe, IMG. */

// Online games. The screen for each lives in mp-games.js (MP_UI), the rules live on the server (backend realtime/games/).
const MP_GAMES = [
  { slug: 'tic-tac-toe',         name: 'Tic Tac Toe',         blurb: 'Three in a row wins. The server decides whose turn it is.' },
  { slug: 'rock-paper-scissors', name: 'Rock Paper Scissors', blurb: 'Best of 3. Both picks are hidden until you have both locked in.' },
  { slug: 'memory-match',        name: 'Memory Match',        blurb: 'Take turns flipping cards. Find a pair and you go again. Most pairs wins.' },
  { slug: 'sliding-puzzle',      name: 'Sliding Puzzle',      blurb: 'A race! You both get the same shuffled picture. First to rebuild it wins.' },
];

const mp = {
  socket: null, connecting: false, status: 'off',          // off | connecting | on
  error: '', online: [], game: MP_GAMES[0].slug, ui: null,
  outgoing: null, invite: null, match: null, rewarded: null,
  pendingJoin: sessionStorage.getItem('kkm_join') || null,
};

/* ---------- connection ---------- */
function mpLoadLib() {
  if (window.io) return Promise.resolve();
  if (mp.libP) return mp.libP;
  mp.libP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = API_BASE + '/socket.io/socket.io.js';          // served by the backend, so the versions always match
    s.onload = res; s.onerror = () => { mp.libP = null; rej(new Error('lib')); };
    document.head.appendChild(s);
  });
  return mp.libP;
}
// Called from syncHeader(): connect when logged in, disconnect when logged out.
function mpSync() {
  if (user && api.token) { if (!mp.socket && !mp.connecting) mpConnect(); }
  else mpDisconnect();
}
async function mpConnect() {
  mp.connecting = true; mp.status = 'connecting'; mp.error = ''; mpPaint();
  try { await mpLoadLib(); }
  catch { mp.connecting = false; mp.status = 'off'; mp.error = "Can't reach the multiplayer server."; mpPaint(); setTimeout(mpSync, 8000); return; }
  if (!user) { mp.connecting = false; mp.status = 'off'; return; }
  const s = io(API_BASE, { auth: { token: api.token } });
  mp.socket = s; mp.connecting = false;
  s.on('connect', () => {
    mp.status = 'on'; mp.error = ''; mpPaint();
    if (mp.pendingJoin) { const c = mp.pendingJoin; mp.pendingJoin = null; sessionStorage.removeItem('kkm_join'); s.emit('invite:join', { code: c }); }
  });
  s.on('disconnect', () => { mp.status = 'connecting'; mpPaint(); });
  s.on('connect_error', e => {
    if (e && e.message === 'unauthorized') { mpDisconnect(); mp.error = 'Please log in again.'; } else mp.status = 'connecting';
    mpPaint();
  });

  s.on('presence:list', list => { mp.online = list; mpPaint(); });
  s.on('mp:error', d => mpNote(d.message));

  // challenges
  s.on('challenge:incoming', c => mpShowIncoming(c));
  s.on('challenge:sent', c => { mp.outgoing = c; mpShowOutgoing(c); });
  s.on('challenge:closed', d => {
    mpPopRemove('in-' + d.id);
    if (mp.outgoing && mp.outgoing.id === d.id) {
      const who = mp.outgoing.to.name; mpPopRemove('out-' + d.id); mp.outgoing = null;
      const msg = { declined: `${who} declined your challenge.`, expired: `${who} didn't answer in time.`, busy: `${who} is busy right now.`, cancelled: '' }[d.reason];
      if (msg) mpNote(msg);
    }
  });

  // friend links
  s.on('invite:created', inv => { mp.invite = inv; mpShowInvite(); });
  s.on('invite:closed', d => {
    if (!mp.invite || mp.invite.code !== d.code) return;
    mp.invite = null; mpHideInvite();
    if (d.reason === 'expired') mpNote('Your friend link expired. Make a new one any time.');
  });
  s.on('invite:error', d => mpNote(d.message));

  // matches
  s.on('match:start', m => {
    mp.match = m; mp.rewarded = null; mpPopsClear(); mpHideInvite(); mp.invite = null;
    if (/^#\/game\//.test(location.hash)) location.hash = '#/games';        // leave any single-player game so its timers and keys stop
    mpMatchPaint(true);
  });
  s.on('match:state', m => {
    if (!mp.match && m.status === 'done') return;                // I already left this finished match
    const fresh = !mp.match || mp.match.id !== m.id; mp.match = m; mpMatchPaint(fresh); });
  s.on('match:opponent', d => {
    if (!mp.match) return;
    const opp = mp.match.players[1 - mp.match.you]; opp.connected = d.connected; mpMatchPaint(false);
  });
  s.on('match:invalid', d => { if (mp.ui && mp.ui.invalid && mp.ui.invalid(d)) return; mpNote(d.message); });
}
function mpDisconnect() {
  if (mp.socket) { mp.socket.disconnect(); mp.socket = null; }
  mp.connecting = false; mp.status = 'off'; mp.online = []; mp.outgoing = null; mp.invite = null; mp.match = null;
  mpPopsClear(); mpHideInvite(); mpUiDestroy(); $('#mpMatch')?.remove(); mpPaint();
}
const mpEmit = (ev, d) => { if (mp.socket && mp.socket.connected) mp.socket.emit(ev, d); else mpNote('Not connected yet. Try again in a moment.'); };

/* ---------- small helpers ---------- */
function mpNote(msg) {
  document.querySelectorAll('.toast.mpn').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast mpn'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
const mpAv = p => `<span class="av">${avatarImg(getAv(p.avatar))}</span>`;
const mpGameName = slug => (MP_GAMES.find(g => g.slug === slug) || {}).name || slug;
const mpBlurb = slug => (MP_GAMES.find(g => g.slug === slug) || {}).blurb || '';

/* ---------- Players Online panel (Games page) ---------- */
function mpPanelHTML() { return '<div class="panel mp-panel" id="mpPanel"></div>'; }
function mpPaint() {
  const el = $('#mpPanel'); if (!el) return;
  if (!user) {
    el.innerHTML = `<h3>Play with others</h3><p class="muted">Challenge players who are online, or send a friend a link to play together.</p><button class="btn" id="mpLogin">Log in to play online</button>`;
    $('#mpLogin').onclick = () => $('#loginBtn').click(); return;
  }
  const head = `<div class="mp-head"><h3>Play with others</h3>
    <div class="mp-ctl"><label class="muted small" for="mpGame">Game</label>
    <select id="mpGame">${MP_GAMES.map(g => `<option value="${g.slug}" ${g.slug === mp.game ? 'selected' : ''}>${g.name}</option>`).join('')}</select>
    <button class="btn" id="mpInvite" ${mp.status === 'on' ? '' : 'disabled'}>Invite a friend</button></div>
    <p class="muted small mp-blurb" id="mpBlurb">${esc(mpBlurb(mp.game))}</p></div>`;
  let body;
  if (mp.status !== 'on') body = `<p class="muted mp-conn"><i class="spin"></i>${esc(mp.error) || 'Connecting to the multiplayer server… the first connection can take up to a minute while the server wakes up.'}</p>`;
  else {
    const others = mp.online.filter(p => p.playerId !== user.playerId);
    body = `<p class="muted small">Online now (${others.length})</p>` + (others.length
      ? `<ul class="mp-list">${others.map(p => `<li>${mpAv(p)}<span class="nm">${esc(p.name)}<small>@${esc(p.playerId)}</small></span>
          <span class="mp-chip ${p.status}">${p.status === 'playing' ? 'In a match' : 'Available'}</span>
          <button class="btn ghost" data-ch="${esc(p.playerId)}" ${p.status === 'playing' ? 'disabled' : ''}>Challenge</button></li>`).join('')}</ul>`
      : '<p class="muted mp-empty">No one else is online right now. Send a friend a link with <b>Invite a friend</b>.</p>');
  }
  el.innerHTML = head + body;
  $('#mpGame').onchange = e => { mp.game = e.target.value; $('#mpBlurb').textContent = mpBlurb(mp.game); };
  const inv = $('#mpInvite'); if (inv) inv.onclick = () => mpEmit('invite:create', { game: mp.game });
  el.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => mpEmit('challenge:send', { to: b.dataset.ch, game: mp.game }));
}

/* ---------- challenge pop-ups ---------- */
function mpPops() { let p = $('#mpPops'); if (!p) { p = document.createElement('div'); p.id = 'mpPops'; p.setAttribute('aria-live', 'polite'); document.body.appendChild(p); } return p; }
function mpPopRemove(key) { document.querySelector(`.mp-pop[data-k="${key}"]`)?.remove(); }
function mpPopsClear() { $('#mpPops')?.remove(); }
function mpShowIncoming(c) {
  if (!c.from || document.querySelector(`.mp-pop[data-k="in-${c.id}"]`)) return;
  const d = document.createElement('div'); d.className = 'mp-pop'; d.dataset.k = 'in-' + c.id;
  d.innerHTML = `<div class="mp-pop-top">${mpAv(c.from)}<div><b>${esc(c.from.name)}</b> challenges you to <b>${esc(c.gameName)}</b><small>@${esc(c.from.playerId)}</small></div></div>
    <div class="mp-pop-btns"><button class="btn ghost" data-a="0">Decline</button><button class="btn" data-a="1">Accept</button></div>
    <i class="mp-bar" style="animation-duration:${c.ttl}ms"></i>`;
  d.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { mpEmit('challenge:respond', { id: c.id, accept: b.dataset.a === '1' }); d.remove(); });
  mpPops().appendChild(d);
}
function mpShowOutgoing(c) {
  mpPopRemove('out-' + c.id);
  const d = document.createElement('div'); d.className = 'mp-pop'; d.dataset.k = 'out-' + c.id;
  d.innerHTML = `<div class="mp-pop-top">${mpAv(c.to)}<div>Waiting for <b>${esc(c.to.name)}</b> to accept <b>${esc(c.gameName)}</b>…</div></div>
    <div class="mp-pop-btns"><button class="btn ghost" data-a="x">Cancel</button></div><i class="mp-bar" style="animation-duration:${c.ttl}ms"></i>`;
  d.querySelector('[data-a]').onclick = () => { mpEmit('challenge:cancel', { id: c.id }); };
  mpPops().appendChild(d);
}

/* ---------- friend link ---------- */
function mpLink(code) { return location.origin + location.pathname + '#/join/' + code; }
function mpShowInvite() {
  mpHideInvite();
  const inv = mp.invite, link = mpLink(inv.code);
  const w = document.createElement('div'); w.id = 'mpInv'; w.className = 'mp-modal';
  w.innerHTML = `<div class="mp-card" role="dialog" aria-label="Invite a friend">
    <h3>Invite a friend</h3>
    <p class="muted">Send this link to your friend. When they open it and log in, a <b>${esc(inv.gameName)}</b> match starts. The link works once and expires in 10 minutes.</p>
    <div class="mp-linkrow"><input id="mpLinkIn" readonly value="${esc(link)}" aria-label="Friend link"><button class="btn" id="mpCopy">Copy</button></div>
    <p class="muted mp-conn"><i class="spin"></i>Waiting for your friend to join… (keep this page open)</p>
    <div class="row">${navigator.share ? '<button class="btn ghost" id="mpShare">Share…</button>' : ''}<button class="btn ghost" id="mpInvCancel">Cancel</button></div></div>`;
  document.body.appendChild(w);
  $('#mpLinkIn').onfocus = e => e.target.select();
  $('#mpCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); mpNote('Link copied!'); }
    catch { $('#mpLinkIn').select(); document.execCommand && document.execCommand('copy'); mpNote('Link copied!'); }
  };
  const sh = $('#mpShare'); if (sh) sh.onclick = () => navigator.share({ title: 'KKM Games', text: `Play ${inv.gameName} with me on KKM Games!`, url: link }).catch(() => {});
  $('#mpInvCancel').onclick = () => { mpEmit('invite:cancel', { code: inv.code }); mp.invite = null; mpHideInvite(); };
}
function mpHideInvite() { $('#mpInv')?.remove(); }

// #/join/CODE: open this when a friend sends you a link
function mpJoinRoute(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code) {
    if (mp.socket && mp.status === 'on') mp.socket.emit('invite:join', { code });
    else {
      mp.pendingJoin = code; sessionStorage.setItem('kkm_join', code);
      if (!api.token) { mpNote("Log in to join your friend's game."); $('#loginBtn').click(); }
      else mpSync();                                      // logged in but still connecting: joins as soon as it connects
    }
  }
  location.replace(location.pathname + location.search + '#/games');
}

/* ---------- live match screen (full-screen overlay, works on any page) ---------- */
/* This is the frame: the two players on top, the status line and the buttons. The board in the middle comes from MP_UI[game] (mp-games.js). */
function mpUiDestroy() { if (mp.ui && mp.ui.destroy) mp.ui.destroy(); mp.ui = null; }
function mpMatchPaint(fresh) {
  const m = mp.match; if (!m) return;
  const factory = MP_UI[m.game]; if (!factory) return;
  let w = $('#mpMatch');
  const me = m.players[m.you], opp = m.players[1 - m.you], done = m.status === 'done', r = m.result;
  if (!w || fresh || !mp.ui) {
    mpUiDestroy(); w?.remove();
    w = document.createElement('div'); w.id = 'mpMatch'; w.className = 'mp-modal solid';
    w.innerHTML = `<div class="mm-wrap" role="dialog" aria-label="${esc(m.gameName)} match">
      <div class="mm-top" id="mmTop"></div>
      <h3 class="mm-title">${esc(m.gameName)}</h3>
      <div class="mm-body" id="mmBody"></div>
      <p class="status" id="mmStatus" aria-live="polite"></p>
      <div class="mm-actions" id="mmActions"></div></div>`;
    document.body.appendChild(w);
    mp.ui = factory();
    mpPaintTop(m);                                    // draw the player cards first so the board can measure the space that is left
    mp.ui.build($('#mmBody'), m);
  }
  const ui = mp.ui;
  mpPaintTop(m);
  ui.paint(m);

  const hold = !!(ui.holding && ui.holding(m)), pts = r && r.reward && r.reward[me.playerId];
  let text;
  if (!done) text = !opp.connected ? `${opp.name} disconnected. Waiting up to ${Math.round(m.graceMs / 1000)}s for them to come back…` : ui.status(m);
  else if (hold) text = ui.status(m);                  // an animation is still playing: don't give the result away yet
  else {
    const extra = ui.extra ? ' ' + ui.extra(m) : '';
    if (r.winner === null) text = "It's a draw." + extra;
    else if (r.winner === m.you) text = (r.reason === 'resign' ? `${opp.name} resigned. ` : r.reason === 'forfeit' ? `${opp.name} left the match. ` : r.reason === 'timeout' ? "Time's up! " : '') + `You win!${pts ? ` +${pts} points${extra ? '.' : ''}` : ''}` + extra;
    else text = (r.reason === 'timeout' ? "Time's up! " : '') + `${opp.name} wins.` + extra;
  }
  $('#mmStatus').textContent = text;
  $('#mmStatus').className = 'status' + (done && !hold && r.winner === m.you ? ' good' : '');

  const A = $('#mmActions'), sig = [done, hold, m.rematch.you, m.rematch.opponent, m.opponentLeft, opp.connected].join('|');
  if (A.dataset.sig !== sig) {                         // only rebuild the buttons when they change, so a click is never lost to a repaint
    A.dataset.sig = sig;
    if (!done) {
      A.innerHTML = '<button class="btn ghost" id="mmResign">Resign</button>';
      $('#mmResign').onclick = () => { if (confirm('Resign this match? Your opponent will win.')) mpEmit('match:resign', { matchId: mp.match.id }); };
    } else if (hold) A.innerHTML = '';
    else {
      const canRe = !m.opponentLeft && opp.connected;
      A.innerHTML = `<button class="btn" id="mmRe" ${!canRe || m.rematch.you ? 'disabled' : ''}>${m.opponentLeft ? 'Opponent left' : m.rematch.you ? `Waiting for ${esc(opp.name)}…` : m.rematch.opponent ? 'Accept rematch' : 'Rematch'}</button>
        <button class="btn ghost" id="mmLeave">Leave</button>`;
      $('#mmRe').onclick = () => mpEmit('match:rematch', { matchId: mp.match.id });
      $('#mmLeave').onclick = () => { mpEmit('match:leave', { matchId: mp.match.id }); mp.match = null; mpUiDestroy(); $('#mpMatch')?.remove(); mpPaint(); };
    }
  }
  if (done && !hold && mp.rewarded !== m.id) { mp.rewarded = m.id; refreshMe(); }   // the server added the win points: reload them
}
function mpPaintTop(m) {
  const ui = mp.ui, done = m.status === 'done', turn = ui && ui.turn ? ui.turn(m) : null;
  $('#mmTop').innerHTML = [0, 1].map(i => { const p = m.players[i], badge = ui && ui.badge ? ui.badge(m, i) : '';
    return `<div class="mm-pl ${!done && turn === i ? 'turn' : ''} ${p.connected ? '' : 'off'}">${mpAv(p)}${ui && ui.sym ? `<span class="mm-sym">${ui.sym(i)}</span>` : ''}
      <b>${esc(p.name)}${i === m.you ? ' (you)' : ''}</b><small>@${esc(p.playerId)}${p.connected ? '' : ' · offline'}</small>${badge ? `<span class="mm-badge">${badge}</span>` : ''}</div>`; }).join('<span class="mm-vs">VS</span>');
}
