/* KKM Games front-end shell. Replace the TODO parts with real data/API later. */

// Games. `thumb` = card picture in assets/thumb/<thumb>.jpg. Each has its own route: #/game/<slug>
const GAMES = [
  { slug: 'tic-tac-toe',         name: 'Tic Tac Toe',         thumb: 'tic-tac-toe' },
  { slug: 'rock-paper-scissors', name: 'Rock Paper Scissors', thumb: 'rock-paper-scissors' },
  { slug: 'ninja-ramen-rush',    name: 'Ninja Ramen Rush',    thumb: 'ninja-ramen-rush' },
  { slug: 'sliding-puzzle',      name: 'Sliding Puzzle',      thumb: 'sliding-puzzle' },
  { slug: 'memory-match',        name: 'Memory Match',        thumb: 'memory-match' },
];

// Temporary state in localStorage (swap for a backend later)
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('kkm_' + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kkm_' + k, JSON.stringify(v)); } catch {} }
};
const today = () => new Date().toISOString().slice(0, 10);
// Daily challenges. Progress resets every day. TODO: load from backend later.
const CHALLENGES = [
  { id: 'ttt', title: 'Shuriken Showdown',   text: 'Win 3 Tic Tac Toe games.',         goal: 3, reward: 100, game: 'tic-tac-toe' },
  { id: 'rps', title: 'Fruit, Note, Kunai',  text: 'Win 3 Rock Paper Scissors rounds.', goal: 3, reward: 100, game: 'rock-paper-scissors' },
  { id: 'mem', title: 'Anime Memory',       text: 'Clear 2 Memory Match boards.',      goal: 2, reward: 100, game: 'memory-match', unit: 'boards' },
  { id: 'puz', title: 'Puzzle Master',      text: 'Solve 2 Sliding Puzzles.',          goal: 2, reward: 100, game: 'sliding-puzzle', unit: 'solves' },
  { id: 'pac', title: 'Ramen Rush',          text: 'Score 1,500 in Ninja Ramen Rush.',  goal: 1500, reward: 150, game: 'ninja-ramen-rush', unit: 'score' },
];
const BONUS = 50;      // for claiming both challenges
const WIN_POINTS = 10; // points for every single win (needs login)
function day() {
  let d = store.get('day', null);
  if (!d || d.date !== today()) d = { date: today(), claimed: {} };
  CHALLENGES.forEach(c => { if (d[c.id] == null) d[c.id] = 0; });
  store.set('day', d); return d;
}
function recordWin(id) {
  const d = day(), c = CHALLENGES.find(x => x.id === id);
  if (c && d[id] < c.goal) { d[id]++; store.set('day', d); }
}
function recordBest(id, v) {
  const d = day(), c = CHALLENGES.find(x => x.id === id);
  if (c) { d[id] = Math.min(c.goal, Math.max(d[id], v)); store.set('day', d); }
}
function addPoints(n) {
  if (!user) return false;
  points += n; syncHeader();                       // instant feedback
  api.post('/api/points', { amount: n })           // saved in MongoDB; server total wins
    .then(r => { points = r.points; syncHeader(); })
    .catch(refreshMe);
  return true;
}

// ---- Shuriken (red + black) used for points ----
const SHK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#d3122f" d="M12 0L15 9L12 12L9 9ZM12 24L9 15L12 12L15 15Z"/><path fill="#111" stroke="#555" stroke-width=".3" d="M24 12L15 9L12 12L15 15ZM0 12L9 15L12 12L9 9Z"/><circle cx="12" cy="12" r="2.6" fill="#07062a" stroke="#d3122f" stroke-width="1"/></svg>`;
const shk = () => `<span class="shk">${SHK}</span>`;
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- Tiers + medals ----
const TIERS = [
  { n: 'Bronze',   min: 0,     c: '#cd7f32' },
  { n: 'Silver',   min: 1000,  c: '#c9ced9' },
  { n: 'Gold',     min: 3000,  c: '#ffcf4a' },
  { n: 'Platinum', min: 6000,  c: '#7fe3ff' },
  { n: 'Diamond',  min: 10000, c: '#b58cff' },
];
const tierOf = p => [...TIERS].reverse().find(t => p >= t.min) || TIERS[0];
const SILVER = TIERS[1];
const medal = t => `<svg class="medal" viewBox="0 0 40 54" role="img" aria-label="${t.n} medal">
  <path d="M9 0L20 22L24 22L15 0Z" fill="#c4122f"/><path d="M31 0L20 22L16 22L25 0Z" fill="#1d3fa8"/>
  <circle cx="20" cy="34" r="16" fill="${t.c}" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>
  <circle cx="20" cy="34" r="11.5" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>
  <polygon points="20,26 22.3,31.5 28.2,31.9 23.7,35.7 25.1,41.4 20,38.3 14.9,41.4 16.3,35.7 11.8,31.9 17.7,31.5" fill="rgba(255,255,255,.85)"/></svg>`;

// ---- Avatars (round PNGs in assets/avatars) + matching cut-out "popup" characters (assets/pop) ----
// Ids a1..a10 must match backend/catalog.js
const AVATARS = [
  { id: 'a1',  name: 'Luffy',    price: 0    },
  { id: 'a2',  name: 'Naruto',   price: 500  },
  { id: 'a3',  name: 'Sasuke',   price: 800  },
  { id: 'a4',  name: 'Goku',     price: 1200 },
  { id: 'a5',  name: 'Vegeta',   price: 1500 },
  { id: 'a6',  name: 'Kakashi',  price: 2000 },
  { id: 'a7',  name: 'Itachi',   price: 2500 },
  { id: 'a8',  name: 'Tanjiro',  price: 3000 },
  { id: 'a9',  name: 'Rengoku',  price: 3500 },
  { id: 'a10', name: 'Gojo',     price: 4000 },
];
const avatarImg = a => `<img src="assets/avatars/${a.id}.png" alt="${a.name}" draggable="false">`;
const popSrc = a => `assets/pop/${a.id}.png`;
const GUEST_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 5-7 8-7s7 2 8 7"/></svg>`;

// ---- Banners (assets/banners/b1..b10.jpg). Ids must match backend/catalog.js ----
const BANNER_LIST = [
  ['b1', 'Hidden Village', 0], ['b2', 'Pirate Seas', 500], ['b3', 'Neon Tokyo', 800], ['b4', 'Spirit Tree', 1200], ['b5', 'Lava Fortress', 1500],
  ['b6', 'Sky Citadel', 2000], ['b7', 'Deep Ocean', 2500], ['b8', 'Desert Oasis', 3000], ['b9', 'Treehouse Forest', 3500], ['b10', 'Crystal Cavern', 4000],
];
const BANNERS = BANNER_LIST.map(([id, name, price]) => ({ id, name, price, css: `url('assets/banners/${id}.jpg')` }));
const getAv = id => AVATARS.find(a => a.id === id) || AVATARS[0];
const getBn = id => BANNERS.find(b => b.id === id) || BANNERS[0];

// ---- Profile text ----
const DEFAULT_DESCS = [
  'Just here to play, win and level up.',
  'Chasing the next high score, one game at a time.',
  'Night owl gamer. Strategy first, snacks second.',
];
const prof = () => store.get('profile', { desc: '', fav: GAMES[0].name, auto: Math.floor(Math.random() * DEFAULT_DESCS.length) });
const saveProf = p => store.set('profile', p);
const descOf = p => (p.desc && p.desc.trim()) || DEFAULT_DESCS[p.auto % DEFAULT_DESCS.length];

// ---- State ----
// Account data (profile, avatar/banner, points) now lives in MongoDB via the backend (js/api.js).
// Game records, best scores, level progress and daily challenges still stay in localStorage.
const DEFAULT_INV = () => ({ avatars: ['a1'], banners: ['b1'], av: 'a1', bn: 'b1' });
let user = null;
let inv = DEFAULT_INV();
let points = 0;
const unlimited = () => false;
function applyServerUser(u) {
  user = { id: u.id, playerId: u.playerId, name: u.name };
  inv = { avatars: u.avatars, banners: u.banners, av: u.avatar, bn: u.banner };
  points = u.points;
  const p = prof(); p.desc = u.description || ''; saveProf(p);
}
function clearUser() { user = null; inv = DEFAULT_INV(); points = 0; }
async function refreshMe() {
  try { applyServerUser((await api.get('/api/auth/me')).user); syncHeader(); }
  catch (e) { if (e.status === 401) { api.setToken(null); clearUser(); syncHeader(); } }
}
const afford = price => unlimited() || points >= price;
const fmt = n => unlimited() ? '∞' : n.toLocaleString();
const myTier = () => tierOf(unlimited() ? Infinity : points);
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');

function syncHeader() {
  mpSync();
  $('#pts').textContent = fmt(points);
  document.querySelectorAll('.shk:empty').forEach(e => e.innerHTML = SHK);
  $('#miniAv').innerHTML = user ? avatarImg(getAv(inv.av)) : GUEST_ICON;
  $('#loginBtn').textContent = user ? 'Log out (' + user.name + ')' : 'Log in';
}

const artHTML = g => `<div class="art thumb"><img src="assets/thumb/${g.thumb}.jpg" alt="" draggable="false"></div>`;
const cardHTML = (g, i) => `
  <a class="card" href="#/game/${g.slug}" data-i="${i}" aria-label="${g.name}">
    ${artHTML(g)}
    <div class="name">${g.name}</div>
  </a>`;

// ---- Home: hero + shuffling cards. order[slot] = game index ----
let timer = null, order = [0, 1, 2, 3, 4];
function paintSlots(flash = []) {
  document.querySelectorAll('.stage .card').forEach(c => {
    const i = +c.dataset.i;
    c.className = 'card slot-' + order.indexOf(i);
    if (flash.includes(i)) { c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1200); }
  });
  document.querySelectorAll('.dots i').forEach((d, n) => d.classList.toggle('on', n === order[2]));
}
function shuffleTwo() {
  const a = Math.floor(Math.random() * 5);
  let b; do { b = Math.floor(Math.random() * 5); } while (b === a);
  [order[a], order[b]] = [order[b], order[a]];
  paintSlots([order[a], order[b]]);
}
function scheduleShuffle() {
  clearTimeout(timer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  timer = setTimeout(() => { shuffleTwo(); scheduleShuffle(); }, 7000 + Math.random() * 2000); // every 7-9 s
}
function rotate(dir) {
  order = dir > 0 ? [order[4], ...order.slice(0, 4)] : [...order.slice(1), order[0]];
  paintSlots(); scheduleShuffle();
}
function home() {
  const d = day(), done = CHALLENGES.filter(c => d[c.id] >= c.goal).length;
  view.innerHTML = `
  <section class="hero">
    <div>
      <p class="kicker">PLAY · EXPLORE · ENJOY</p>
      <h1>KKM Games</h1>
      <p class="tag">REAL GAMES. REAL STORIES. YOUR WORLD.</p>
      <p class="lead">Dive into a collection of unique games crafted for every kind of player. Adventure, strategy, creativity and more, all in one place.</p>
      <div class="cta"><a class="btn" href="#/games">Explore Games →</a></div>
      <div class="strip">
        <a class="chip" href="#/challenge"><span>Today's challenges</span><b>${done}/${CHALLENGES.length} done</b><span>Daily goals</span></a>
        <a class="chip" href="#/challenge"><span>Total points</span><b>${shk()}${fmt(points)}</b><span>${user ? esc(user.name) : 'Log in to save'}</span></a>
      </div>
    </div>
    <div class="stage" role="group" aria-label="Featured games">
      <button class="arrow l" aria-label="Previous">‹</button>
      ${GAMES.map(cardHTML).join('')}
      <button class="arrow r" aria-label="Next">›</button>
      <div class="dots">${GAMES.map(() => '<i></i>').join('')}</div>
    </div>
  </section>`;
  order = [0, 1, 2, 3, 4];
  paintSlots();
  $('.arrow.l').onclick = () => rotate(-1);
  $('.arrow.r').onclick = () => rotate(1);
  scheduleShuffle();
}

function games() {
  view.innerHTML = `<section class="page"><h2>Games</h2><p class="muted">Pick a game, then pick a level.</p>
    ${mpPanelHTML()}
    <div class="grid">${GAMES.map(cardHTML).join('')}</div>
    <p style="margin-top:2rem">${clearBtn()}</p></section>`;
  mpPaint();
}
function game(slug, sub) {
  if (openGame(slug, sub)) return;
  const g = GAMES.find(x => x.slug === slug);
  view.innerHTML = g
    ? `<section class="page"><h2>${g.name}</h2><p class="muted">Route: #/game/${g.slug}</p>
       <div class="panel"><h3>Coming soon</h3><p class="muted">Connect this route to the real game later.</p><a class="btn ghost" href="#/games">← All games</a></div></section>`
    : `<section class="page"><h2>Page not found</h2><a class="btn" href="#/games">Back to games</a></section>`;
}
function challenge() {
  const d = day(), both = CHALLENGES.every(c => d.claimed[c.id]);
  const row = c => {
    const n = Math.min(d[c.id], c.goal), ready = n >= c.goal;
    return `<div class="panel ch"><div class="ch-top"><h3>${c.title}</h3><span class="reward">${shk()}+${c.reward}</span></div>
      <p class="muted">${c.text}</p><div class="bar"><i style="width:${n / c.goal * 100}%"></i></div>
      <div class="ch-foot"><span class="muted">${n.toLocaleString()}/${c.goal.toLocaleString()} ${c.unit || 'wins'}</span>
      ${d.claimed[c.id] ? '<button class="btn" disabled>Claimed</button>' : ready ? `<button class="btn" data-claim="${c.id}">Claim</button>` : `<a class="btn ghost" href="#/game/${c.game}">Play →</a>`}</div></div>`;
  };
  view.innerHTML = `<section class="page"><h2>Today's Challenges</h2>
    <p class="muted">Resets every day. Every win also gives +${WIN_POINTS} points when you are logged in.</p>
    ${CHALLENGES.map(row).join('')}
    <div class="panel ch"><div class="ch-top"><h3>Finish all</h3><span class="reward">${shk()}+${BONUS}</span></div>
      <p class="muted">Claim every challenge above to unlock a bonus.</p>
      <div class="ch-foot"><span></span>${d.claimed.bonus ? '<button class="btn" disabled>Claimed</button>' : both ? '<button class="btn" data-claim="bonus">Claim</button>' : '<button class="btn ghost" disabled>Locked</button>'}</div></div>
    <div class="panel"><p class="muted">Total points</p><div class="big">${shk()}${fmt(points)}</div></div>
    <p style="margin-top:1.5rem">${clearBtn()}</p></section>`;
  view.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
    if (!user) return $('#loginDlg').showModal();
    const cid = b.dataset.claim, c = CHALLENGES.find(x => x.id === cid), dd = day();
    dd.claimed[cid] = true; store.set('day', dd);
    addPoints(c ? c.reward : BONUS); challenge();
  });
}

// ---- Profile card (slides out from the right, banner as background) ----
let lastFocus = null;
function closeCard() {
  const w = $('#pcardWrap'); if (!w) return;
  w.classList.add('out'); setTimeout(() => { w.remove(); lastFocus && lastFocus.focus && lastFocus.focus(); }, 300);
}
function openCard(p) {
  $('#pcardWrap')?.remove();
  lastFocus = document.activeElement;
  const av = getAv(p.av);
  const w = document.createElement('div');
  w.id = 'pcardWrap';
  w.innerHTML = `<div class="pc-bd"></div>
    <aside class="pcard" role="dialog" aria-label="${esc(p.name)} profile">
      <div class="pc-top">
        <div class="pc-ban" style="background-image:${getBn(p.bn).css}"></div>
        <img class="pc-pop" src="${popSrc(av)}" alt="${esc(av.name)}" draggable="false">
        <button class="pc-x" aria-label="Close">✕</button>
      </div>
      <div class="pc-body">
        <div class="pc-medal">${medal(p.tier)}<span>${p.tier.n} tier</span></div>
        <h3>${esc(p.name)}</h3>
        ${p.playerId ? `<div class="pc-id">@${esc(p.playerId)}</div>` : ''}
        <p class="pc-desc">${esc(p.desc)}</p>
        <div class="pc-stats">
          <div><span>Points</span><b>${shk()}${p.pts}</b></div>
          ${p.rank ? `<div><span>Rank</span><b>#${p.rank}</b></div>` : ''}
          ${p.fav ? `<div><span>Favourite game</span><b>${esc(p.fav)}</b></div>` : ''}
        </div>
      </div>
    </aside>`;
  document.body.appendChild(w);
  w.querySelector('.pc-x').focus();
  w.querySelector('.pc-x').onclick = closeCard;
  w.querySelector('.pc-bd').onclick = closeCard;
  w.onclick = e => { if (e.target === w) closeCard(); };
}
addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });

const SEARCH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
const toRow = (p, i) => ({
  id: p.id, playerId: p.playerId, name: p.name, av: p.avatar, bn: p.banner, tier: tierOf(p.points), me: !!user && p.id === user.id,
  desc: (p.description && p.description.trim()) || DEFAULT_DESCS[i % DEFAULT_DESCS.length], pts: p.points.toLocaleString(), rank: p.rank,
});
const lbRow = (r, i, showRank) => `<li class="${r.me ? 'me' : ''}" tabindex="0" role="button" data-i="${i}">${showRank ? `<span class="rk">${i + 1}</span>` : ''}
  <span class="av">${avatarImg(getAv(r.av))}</span><span class="nm">${esc(r.name)}${r.me ? ' (you)' : ''}<small>@${esc(r.playerId)}</small></span>
  <span class="lbm">${medal(r.tier)}</span><b>${shk()}${r.pts}</b></li>`;
function bindRows(ol, rows) {
  ol.querySelectorAll('li').forEach(li => {
    const open = () => openPlayer(rows[+li.dataset.i]);
    li.onclick = open; li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
}
// Opens a player's card. Fetches the overall rank too (works for players outside the top 50).
async function openPlayer(r) {
  openCard(r);
  if (r.rank || !r.playerId) return;
  try {
    const { player } = await api.get('/api/players/' + encodeURIComponent(r.playerId));
    const stats = $('#pcardWrap .pc-stats');
    if (stats && !stats.querySelector('[data-rank]')) {
      r.rank = player.rank;
      stats.children[0].insertAdjacentHTML('afterend', `<div data-rank><span>Rank</span><b>#${player.rank}</b></div>`);
    }
  } catch {}
}

async function leaderboard(arg) {
  view.innerHTML = `<section class="page"><h2>Leaderboard</h2><p class="muted">Loading players...</p></section>`;
  let players = [];
  try { players = (await api.get('/api/leaderboard')).players; }
  catch (e) {
    if (!location.hash.startsWith('#/leaderboard')) return;
    view.innerHTML = `<section class="page"><h2>Leaderboard</h2><div class="panel"><p class="muted">${esc(e.message)}</p></div></section>`; return;
  }
  if (!location.hash.startsWith('#/leaderboard')) return;   // user navigated away while loading
  const rows = players.map(toRow);
  view.innerHTML = `<section class="page"><h2>Leaderboard</h2><p class="muted">Search any player by their ID or name, or click a player to open their card. Top 50 players by points.</p>
    <form class="psearch" id="lbSearch" role="search">${SEARCH_ICON}
      <input id="lbQ" type="search" placeholder="Search a player (ID or name)" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="30" aria-label="Search a player">
      <button class="psb" type="submit" aria-label="Search player">${SEARCH_ICON}</button></form>
    <div id="lbMsg" class="lbmsg muted" hidden></div>
    <ol class="lb res" id="lbRes" hidden></ol>
    ${rows.length ? '' : '<div class="panel"><p class="muted">No players yet. Be the first!</p></div>'}
    <ol class="lb" id="lbTop">${rows.map((r, i) => lbRow(r, i, true)).join('')}</ol>
    ${user ? '' : '<p class="muted">Log in to see your own rank.</p>'}</section>`;
  bindRows($('#lbTop'), rows);

  const q = $('#lbQ'), res = $('#lbRes'), top = $('#lbTop'), msg = $('#lbMsg');
  let found = [], seq = 0, t = null;
  async function run(openFirst) {
    const text = q.value.trim().replace(/^@/, '');
    const my = ++seq;
    if (!text) { found = []; res.hidden = msg.hidden = true; top.hidden = false; return; }
    msg.hidden = false; msg.textContent = 'Searching...';
    let list;
    try { list = (await api.get('/api/players/search?q=' + encodeURIComponent(text))).players; }
    catch (e) { if (my === seq) { msg.textContent = e.message; } return; }
    if (my !== seq) return;                       // a newer search is already running
    found = list.map(toRow);
    top.hidden = true; res.hidden = !found.length;
    res.innerHTML = found.map((r, i) => lbRow(r, i, false)).join(''); bindRows(res, found);
    msg.textContent = found.length ? `${found.length} player${found.length > 1 ? 's' : ''} found` : `No player found for "${text}".`;
    if (openFirst && found.length) openPlayer(found[0]);
  }
  q.oninput = () => { clearTimeout(t); t = setTimeout(() => run(false), 250); };
  $('#lbSearch').onsubmit = e => { e.preventDefault(); clearTimeout(t); run(true); };
  if (arg === 'search') q.focus();
}

// ---- Profile page (edit name/description free, buy avatar + banner) ----
function profile() {
  if (!user) {
    view.innerHTML = `<section class="page"><h2>Profile</h2><div class="panel"><h3>Log in to continue</h3><p class="muted">Your avatar, banner and points live here.</p><button class="btn" id="goLogin">Log in</button></div></section>`;
    $('#goLogin').onclick = () => $('#loginDlg').showModal();
    return;
  }
  const pr = prof(); saveProf(pr);
  const btn = (kind, it) => {
    const owned = inv[kind + 's'].includes(it.id), on = inv[kind === 'avatar' ? 'av' : 'bn'] === it.id;
    if (on) return `<button class="btn ghost" disabled>Equipped</button>`;
    if (owned) return `<button class="btn" data-act="equip" data-k="${kind}" data-id="${it.id}">Equip</button>`;
    return `<button class="btn" data-act="buy" data-k="${kind}" data-id="${it.id}" ${afford(it.price) ? '' : 'disabled'}>${afford(it.price) ? 'Buy' : 'Not enough'}</button>`;
  };
  const price = (kind, it) => inv[kind + 's'].includes(it.id) ? 'Owned' : (it.price ? shk() + it.price.toLocaleString() : 'Free');
  const t = myTier();
  view.innerHTML = `<section class="page">
    <div class="banner" style="background-image:${getBn(inv.bn).css}"><img class="bn-pop" src="${popSrc(getAv(inv.av))}" alt="" draggable="false"></div>
    <div class="me-head">
      <div class="avcol"><div class="av">${avatarImg(getAv(inv.av))}</div><div class="pc-medal">${medal(t)}<span>${t.n}</span></div></div>
      <div class="who"><h2>${esc(user.name)}</h2><p class="muted" style="margin:.2rem 0 .6rem">@${esc(user.playerId)} · ${shk()}${fmt(points)}</p>
        <button class="btn ghost" id="preview">Preview my card</button></div>
    </div>
    <form class="panel edit" id="editForm">
      <h3>Edit profile</h3><p class="muted">Name, description and favourite game are free to change anytime.</p>
      <label>Name<input id="eName" maxlength="24" value="${esc(user.name)}"></label>
      <label>Description<textarea id="eDesc" maxlength="140" rows="3" placeholder="${esc(DEFAULT_DESCS[pr.auto % 3])}">${esc(pr.desc)}</textarea></label>
      <p class="muted small">Leave it empty to show a default gamer line.</p>
      <label>Favourite game<select id="eFav">${GAMES.map(g => `<option ${g.name === pr.fav ? 'selected' : ''}>${g.name}</option>`).join('')}</select></label>
      <div class="row"><span class="muted" id="saved"></span><button class="btn" type="submit">Save</button></div>
    </form>
    <h3 class="sec">Avatars</h3>
    <div class="shop">${AVATARS.map(a => `<div class="item ${inv.av === a.id ? 'eq' : ''}"><div class="av">${avatarImg(a)}</div><b>${a.name}</b><div class="price">${price('avatar', a)}</div>${btn('avatar', a)}</div>`).join('')}</div>
    <h3 class="sec">Banners</h3>
    <div class="shop">${BANNERS.map(b => `<div class="item ${inv.bn === b.id ? 'eq' : ''}"><div class="bn" style="background-image:${b.css}"></div><b>${b.name}</b><div class="price">${price('banner', b)}</div>${btn('banner', b)}</div>`).join('')}</div>
  </section>`;
  $('#editForm').onsubmit = async e => {
    e.preventDefault();
    pr.fav = $('#eFav').value; saveProf(pr);                       // favourite game stays local
    try {
      const r = await api.put('/api/profile', { name: $('#eName').value.trim() || user.name, description: $('#eDesc').value.trim() });
      applyServerUser(r.user); syncHeader(); profile(); $('#saved').textContent = 'Saved';
    } catch (err) { $('#saved').textContent = err.message; }
  };
  $('#preview').onclick = () => openCard({ name: user.name, playerId: user.playerId, av: inv.av, bn: inv.bn, tier: t, desc: descOf(pr), pts: fmt(points), fav: pr.fav });
  view.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      const r = await api.post('/api/shop/' + b.dataset.act, { kind: b.dataset.k, id: b.dataset.id });
      applyServerUser(r.user);
    } catch (err) { toast(err.message); if (err.status === 401) { api.setToken(null); clearUser(); } else await refreshMe(); }
    syncHeader(); profile();
  });
}

const routes = { '': home, games, challenge, leaderboard, profile, me: profile, join: mpJoinRoute };
function route() {
  if (gameCleanup) gameCleanup();
  clearTimeout(timer); $('#pcardWrap')?.remove();
  const [seg, arg, sub] = location.hash.replace(/^#\/?/, '').split('/');
  if (seg === 'game') game(arg, sub); else (routes[seg] || (() => game('')))(arg);
  dojoSync(seg, arg);
  const key = seg === '' ? 'home' : seg === 'game' ? 'games' : seg;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === key));
  $('#miniAv').classList.toggle('active', seg === 'profile' || seg === 'me');
  $('#searchBtn').classList.toggle('active', seg === 'leaderboard' && arg === 'search');
  scrollTo(0, 0);
}
addEventListener('hashchange', route);

// ---- Login / register (unique player ID + password, handled by the backend) ----
let authMode = 'login';
const ID_RE = /^[a-z0-9_]{3,20}$/;
const cleanId = v => String(v || '').trim().replace(/^@/, '').toLowerCase();
let idTimer = null, idSeq = 0;
function idHint(text, cls) { const m = $('#idMsg'); m.textContent = text || ''; m.className = 'idmsg ' + (cls || ''); }
function setAuthMode(m) {
  authMode = m;
  const reg = m === 'register';
  $('#authTitle').textContent = reg ? 'Create account' : 'Log in';
  $('#authSub').textContent = reg ? 'Pick a name and a unique player ID, then add a password (8+ characters).' : 'Welcome back. Log in with your player ID and password.';
  $('#nameRow').style.display = reg ? 'block' : 'none';
  $('#uPass').autocomplete = reg ? 'new-password' : 'current-password';
  $('#loginGo').textContent = reg ? 'Sign up' : 'Log in';
  $('#authSwitch').textContent = reg ? 'Already have an account? Log in' : 'New here? Create an account';
  $('#authErr').textContent = '';
  idHint(reg ? '3-20 characters: letters, numbers, underscore.' : '');
}
// live "is this ID free?" check while signing up
$('#uId').addEventListener('input', () => {
  if (authMode !== 'register') return;
  clearTimeout(idTimer);
  const id = cleanId($('#uId').value);
  if (!id) return idHint('3-20 characters: letters, numbers, underscore.');
  if (!ID_RE.test(id)) return idHint('Use 3-20 letters, numbers or underscore.', 'bad');
  idHint('Checking...');
  const my = ++idSeq;
  idTimer = setTimeout(async () => {
    try { const r = await api.get('/api/auth/check-id?id=' + encodeURIComponent(id)); if (my === idSeq) idHint(r.message, r.available ? 'ok' : 'bad'); }
    catch { if (my === idSeq) idHint(''); }
  }, 350);
});
$('#authSwitch').onclick = e => { e.preventDefault(); setAuthMode(authMode === 'login' ? 'register' : 'login'); };
$('#authCancel').onclick = () => $('#loginDlg').close();
$('#loginBtn').onclick = () => {
  if (user) { api.setToken(null); clearUser(); syncHeader(); return route(); }
  setAuthMode('login'); $('#loginDlg').showModal();
};
$('#searchBtn').onclick = () => { const q = $('#lbQ'); if (q) q.focus(); };   // already on the leaderboard: just focus the box
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#authErr'), go = $('#loginGo');
  const playerId = cleanId($('#uId').value), password = $('#uPass').value, name = $('#uName').value.trim();
  if (!playerId || !password) { err.textContent = 'Enter your player ID and password.'; return; }
  if (authMode === 'register' && !ID_RE.test(playerId)) { err.textContent = 'Player ID must be 3-20 characters: letters, numbers or underscore.'; return; }
  go.disabled = true; err.textContent = '';
  try {
    const r = await api.post('/api/auth/' + authMode, authMode === 'register' ? { name, playerId, password } : { playerId, password });
    api.setToken(r.token); applyServerUser(r.user);
    $('#uPass').value = ''; $('#loginDlg').close(); syncHeader(); route();
  } catch (ex) { err.textContent = ex.message; }
  go.disabled = false;
});

// ---- Clear game history (records, level progress, best scores, daily challenge). Points and purchases stay. ----
document.addEventListener('click', e => { if (e.target.closest('[data-clear]')) $('#clearDlg').showModal(); });
$('#clearForm').addEventListener('submit', e => {
  if (e.submitter && e.submitter.value === 'ok') {
    ['rec', 'prog', 'pacbest', 'membest', 'day'].forEach(k => store.set(k, null));
    setTimeout(() => { route(); toast('History cleared'); }, 0);
  }
});

(async () => {
  if (api.token) await refreshMe();   // restores the logged-in user from the saved token
  syncHeader(); route();
})();
