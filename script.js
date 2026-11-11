/* =========================================================
   MOODWAVE — script.js  (version « vraies chansons »)
   1. Configuration (humeurs + chansons sélectionnées)
   2. Accès à l'API iTunes (recherche et chargement des titres)
   3. État de l'application + sauvegarde (localStorage)
   4. Utilitaires
   5. Rendu de l'interface
   6. Recherche
   7. Bibliothèque et playlists
   8. Lecteur audio
   9. Menus
   10. Navigation
   11. Événements + démarrage
   ========================================================= */

/* ---------- 1. CONFIGURATION ---------- */

// Les 5 humeurs. Chaque humeur a ses couleurs et une sélection de VRAIES chansons
// (identifiants du catalogue Apple Music / iTunes).
const MOODS = [
  { id: 'chill', name: 'Chill', emoji: '🌙', c1: '#6C5CE7', c2: '#00CEC9',
    desc: 'On ralentit le rythme', pill: 'Un peu de calme, beaucoup de son',
    caption: 'Un peu de douceur pour ta soirée.', sub: 'Des sons doux pour décompresser',
    tracks: [1532252603, 1294891012, 1531532767, 1146195714, 1614063459, 1688642838] },
  { id: 'motive', name: 'Motivé', emoji: '⚡', c1: '#FF6B35', c2: '#FF2E63',
    desc: "Le plein d'énergie", pill: 'Monte le son, fonce',
    caption: 'De quoi te donner un vrai coup de boost.', sub: "Des titres qui donnent envie d'avancer",
    tracks: [1440903439, 1442846328, 207445080, 1411628233, 1440907873, 1243164657] },
  { id: 'concentre', name: 'Concentré', emoji: '🎯', c1: '#00B894', c2: '#0984E3',
    desc: 'Dans la bulle', pill: 'Moins de bruit, plus de focus',
    caption: 'Le calme parfait pour avancer.', sub: 'Du piano et des musiques de film pour rester concentré',
    tracks: [380350246, 1368090483, 485353578, 883501723, 1440762319, 1453571333] },
  { id: 'melancolique', name: 'Mélancolique', emoji: '🌧️', c1: '#4B6CB7', c2: '#182848',
    desc: "Laisser parler l'émotion", pill: 'Prends le temps de ressentir',
    caption: 'Des chansons pour les jours gris.', sub: 'Des titres pour accompagner tes pensées',
    tracks: [403037927, 1536561036, 1450695872, 192760096, 1776748883, 1440814425] },
  { id: 'joyeux', name: 'Joyeux', emoji: '☀️', c1: '#FDCB6E', c2: '#FF7675',
    desc: 'Du soleil dans les oreilles', pill: 'Le soleil, version musique',
    caption: 'De la bonne humeur à partager.', sub: 'Des tubes lumineux pour sourire',
    tracks: [863835363, 1316260648, 956024318, 1538003843, 1623677811, 1444107530] },
];

// Idées proposées sous la barre de recherche
const SUGGESTIONS = ['Burna Boy', 'Aya Nakamura', 'Wally Seck', 'Youssou N\'Dour', 'Rema', 'Drake', 'Tayc', 'Billie Eilish', 'Afrobeats', 'Rap français'];

const API = 'https://itunes.apple.com';
const COUNTRY = 'FR'; // catalogue français (titres disponibles en France)

/* ---------- 2. ACCÈS À L'API ITUNES ---------- */

// Transforme un résultat de l'API en objet "chanson" simple pour notre application
function toTrack(r) {
  return {
    id: r.trackId,
    title: r.trackName,
    artist: r.artistName,
    album: r.collectionName || '',
    cover: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'), // pochette en haute définition
    thumb: (r.artworkUrl100 || '').replace('100x100bb', '120x120bb'),
    preview: r.previewUrl,           // extrait officiel de 30 secondes
    length: r.trackTimeMillis || 0,  // durée de la chanson complète
    genre: r.primaryGenreName || '',
    url: r.trackViewUrl || '',       // lien vers Apple Music
  };
}

// Appel à l'API : on utilise fetch, et en secours la technique JSONP si fetch est bloqué
async function apiGet(path, params) {
  const query = new URLSearchParams({ ...params, country: COUNTRY }).toString();
  // 1) Notre relais Vercel (/api/itunes) : indispensable sur iPhone, où Apple redirige
  //    les recherches vers l'application Musique au lieu de renvoyer les résultats.
  if (location.protocol.startsWith('http')) {
    try {
      const res = await fetch(`/api/itunes?type=${path}&${query}`);
      if (res.ok) return await res.json();
    } catch { /* relais indisponible : on essaie en direct */ }
  }
  // 2) Sinon l'API iTunes en direct, et 3) JSONP en dernier secours.
  try {
    const res = await fetch(`${API}/${path}?${query}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    return jsonp(`${API}/${path}?${query}`);
  }
}

// JSONP : charge la réponse comme un script (contourne les blocages réseau de certains navigateurs)
function jsonp(url) {
  return new Promise((resolve, reject) => {
    const name = 'mw_cb_' + Date.now() + Math.floor(Math.random() * 1000);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 10000);
    function cleanup() { clearTimeout(timer); delete window[name]; script.remove(); }
    window[name] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('network')); };
    script.src = `${url}&callback=${name}`;
    document.head.appendChild(script);
  });
}

// Recherche de chansons par mot-clé
async function searchSongs(term) {
  const data = await apiGet('search', { term, media: 'music', entity: 'song', limit: 30 });
  return data.results.filter(r => r.kind === 'song' && r.previewUrl).map(toTrack);
}

// Chargement de chansons précises par identifiant (avec mémoire pour ne pas recharger)
async function lookupSongs(ids) {
  const missing = ids.filter(id => !state.known[id]);
  if (missing.length) {
    const data = await apiGet('lookup', { id: missing.join(','), entity: 'song' });
    data.results.filter(r => r.wrapperType === 'track' && r.previewUrl).forEach(r => remember(toTrack(r)));
  }
  return ids.map(id => state.known[id]).filter(Boolean);
}

/* ---------- 3. ÉTAT + SAUVEGARDE ---------- */

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('moodwave2-' + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('moodwave2-' + key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

const state = {
  mood: store.get('mood', 'chill'),
  known: store.get('known', {}),          // toutes les chansons déjà chargées { id: chanson }
  library: store.get('library', []),      // ids des chansons de MA bibliothèque
  playlists: store.get('playlists', [
    { id: 1, name: 'Nuits douces', tracks: [1532252603, 1146195714, 403037927] },
    { id: 2, name: 'Dans ma bulle', tracks: [380350246, 485353578, 1440762319] },
    { id: 3, name: 'Les jours de soleil', tracks: [863835363, 1316260648, 956024318] },
  ]),
  volume: store.get('volume', 0.8),
  moodTracks: [],      // chansons de l'humeur affichée
  results: [],         // résultats de la dernière recherche
  queue: [], queueName: '', index: -1,
  shuffle: false, repeat: 'off',
  openPlaylist: null,
};

// Mémorise une chanson (pour la bibliothèque et les playlists, même après rechargement)
function remember(track) { state.known[track.id] = track; }
function saveKnown() {
  // On ne garde en mémoire que les chansons utiles (bibliothèque + playlists) pour rester léger
  const keep = new Set([...state.library, ...state.playlists.flatMap(p => p.tracks)]);
  const slim = {};
  keep.forEach(id => { if (state.known[id]) slim[id] = state.known[id]; });
  store.set('known', slim);
}

/* ---------- 4. UTILITAIRES ---------- */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const audio = $('#audio');
const moodById = id => MOODS.find(m => m.id === id);
const current = () => state.queue[state.index];
const inLibrary = id => state.library.includes(id);
const pad2 = n => String(n).padStart(2, '0');
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
const formatLength = ms => formatTime(ms / 1000);
const totalMinutes = list => Math.max(1, Math.round(list.reduce((s, t) => s + t.length, 0) / 60000));

// Protège les textes avant de les insérer dans la page (sécurité XSS)
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- 5. RENDU DE L'INTERFACE ---------- */

function applyMoodTheme(moodId) {
  const m = moodById(moodId);
  document.body.dataset.mood = m.id;
  document.documentElement.style.setProperty('--c1', m.c1);
  document.documentElement.style.setProperty('--c2', m.c2);
  $('#mood-pill').textContent = m.pill;
  $('#mood-caption').textContent = m.caption;
}

function renderMoods() {
  $('#moods').innerHTML = MOODS.map(m => `
    <button class="mood-card ${m.id === state.mood ? 'active' : ''}" role="radio"
      aria-checked="${m.id === state.mood}" data-mood="${m.id}" style="--m1:${m.c1}; --m2:${m.c2}">
      <span class="mood-emoji">${m.emoji}</span>
      <span class="mood-check"><svg><use href="#i-check"/></svg></span>
      <span class="mood-name">${m.name}</span>
      <span class="mood-desc">${m.desc}</span>
    </button>`).join('') + '<p class="moods-note">Une humeur.<br>Ton moment à toi.</p>';
}

// Une ligne de chanson, utilisée dans toutes les listes
function trackRow(t, i, context) {
  const isCurrent = current()?.id === t.id;
  const saved = inLibrary(t.id);
  return `
    <li class="track ${isCurrent ? 'current' : ''}" data-id="${t.id}" data-context="${context}">
      <span class="t-num">${isCurrent ? '<span class="eq"><i></i><i></i><i></i></span>' : pad2(i + 1)}</span>
      <span class="t-main">
        <span class="t-cover"><img class="cover cover-xs" src="${esc(t.thumb)}" alt="" loading="lazy"><svg class="t-play"><use href="#i-play"/></svg></span>
        <span class="t-text">
          <span class="t-title">${esc(t.title)}</span>
          <span class="t-artist-inline">${esc(t.artist)}</span>
        </span>
      </span>
      <span class="t-album">${esc(t.album)}</span>
      <span class="t-dur">${formatLength(t.length)}</span>
      <button class="icon-btn add-btn ${saved ? 'on' : ''}" data-action="add" aria-label="${saved ? 'Retirer de' : 'Ajouter à'} ma bibliothèque" title="${saved ? 'Dans ta bibliothèque' : 'Ajouter à ma bibliothèque'}"><svg><use href="${saved ? '#i-check' : '#i-plus'}"/></svg></button>
      <button class="icon-btn" data-action="menu" aria-label="Plus d'options"><svg><use href="#i-dots"/></svg></button>
    </li>`;
}

function renderList(selector, list, context) {
  $(selector).innerHTML = list.map((t, i) => trackRow(t, i, context)).join('');
}

// Petits blocs gris animés pendant le chargement
function skeleton(selector, n = 6) {
  $(selector).innerHTML = Array.from({ length: n }, () =>
    '<li class="track skeleton"><span></span><span class="t-main"><i class="cover cover-xs"></i><i class="bar"></i></span><i class="bar short"></i><span></span><span></span><span></span></li>').join('');
}

function setStatus(selector, message) {
  const el = $(selector);
  el.hidden = !message;
  el.textContent = message || '';
}

// Accueil : playlist de l'humeur (vraies chansons chargées depuis l'API)
let moodRequest = 0;
async function renderMoodPlaylist() {
  const m = moodById(state.mood);
  $('#mood-title').textContent = `Ta playlist ${m.name}`;
  $('#mood-sub').textContent = m.sub;
  const ticket = ++moodRequest;
  if (!m.tracks.every(id => state.known[id])) skeleton('#mood-tracks', m.tracks.length);
  setStatus('#mood-status', '');
  try {
    const list = await lookupSongs(m.tracks);
    if (ticket !== moodRequest) return; // l'utilisateur a changé d'humeur entre-temps
    state.moodTracks = list;
    $('#mood-sub').textContent = `${m.sub} · ${plural(list.length, 'titre')}, ${totalMinutes(list)} min`;
    renderList('#mood-tracks', list, 'mood');
  } catch {
    if (ticket !== moodRequest) return;
    $('#mood-tracks').innerHTML = '';
    setStatus('#mood-status', 'Impossible de charger les chansons. Vérifie ta connexion Internet puis recharge la page.');
  }
}

function renderLibrary() {
  const all = state.library.map(id => state.known[id]).filter(Boolean);
  const q = $('#lib-filter').value.trim().toLowerCase();
  const list = all.filter(t => !q || `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q));
  $('#lib-sub').textContent = all.length ? `${plural(all.length, 'chanson')} · ${totalMinutes(all)} min` : '';
  $('#lib-count').textContent = all.length;
  renderList('#lib-tracks', list, 'library');
  $('#lib-empty').hidden = all.length > 0;
  $('#lib-filter-wrap').hidden = all.length < 2;
  $('#lib-head').hidden = list.length === 0;
  $('#lib-play').hidden = all.length === 0;
}

const playlistTracks = p => p.tracks.map(id => state.known[id]).filter(Boolean);

function renderPlaylists() {
  const color = i => MOODS[i % MOODS.length].c2;
  $('#spaces').innerHTML = state.playlists.map((p, i) =>
    `<li><button data-pl="${p.id}"><span class="dot" style="background:${color(i)}"></span>${esc(p.name)}</button></li>`).join('');

  $('#pl-grid').innerHTML = state.playlists.map(p => {
    const covers = playlistTracks(p).slice(0, 4);
    const art = covers.length >= 4
      ? `<span class="cover cover-md mosaic">${covers.map(t => `<img src="${esc(t.thumb)}" alt="">`).join('')}</span>`
      : covers.length ? `<img class="cover cover-md" src="${esc(covers[0].cover)}" alt="">`
      : '<span class="cover cover-md cover-empty"><svg><use href="#i-list"/></svg></span>';
    return `<button class="pl-card" data-pl="${p.id}">${art}<strong>${esc(p.name)}</strong><span>${plural(p.tracks.length, 'titre')}</span></button>`;
  }).join('');
  $('#pl-empty').hidden = state.playlists.length > 0;

  const open = state.playlists.find(p => p.id === state.openPlaylist);
  $('#pl-list-view').hidden = !!open;
  $('#pl-detail-view').hidden = !open;
  if (open) {
    const list = playlistTracks(open);
    $('#pl-title').textContent = open.name;
    $('#pl-sub').textContent = list.length ? `${plural(list.length, 'titre')}, ${totalMinutes(list)} min` : 'Playlist vide';
    renderList('#pl-tracks', list, 'playlist');
    $('#pl-tracks-empty').hidden = list.length > 0;
    $('#pl-head').hidden = list.length === 0;
  }
}

function renderGreeting() {
  const h = new Date().getHours();
  $('#greeting').textContent = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
}

// Redessine toutes les listes (après un ajout, un changement de chanson…)
function refreshLists() {
  if (state.moodTracks.length) renderList('#mood-tracks', state.moodTracks, 'mood');
  if (state.results.length) renderList('#search-results', state.results, 'search');
  renderLibrary();
  renderPlaylists();
}

// FONCTIONNALITÉ PRINCIPALE : choisir une humeur
function selectMood(moodId) {
  state.mood = moodId;
  store.set('mood', moodId);
  applyMoodTheme(moodId);
  renderMoods();
  renderMoodPlaylist();
}

/* ---------- 6. RECHERCHE ---------- */

let searchTimer, searchRequest = 0;

function renderSuggestions() {
  $('#suggest-chips').innerHTML = SUGGESTIONS.map(s => `<button class="chip" type="button" data-q="${esc(s)}">${esc(s)}</button>`).join('');
}

// Lance la recherche (appelée pendant la frappe, avec un petit délai)
async function runSearch(term) {
  term = term.trim();
  $('#search-clear').hidden = !term;
  $('#search-suggest').hidden = !!term;
  const ticket = ++searchRequest;
  if (term.length < 2) {
    state.results = [];
    $('#search-results').innerHTML = '';
    $('#search-head').hidden = true;
    $('#search-info').textContent = '';
    setStatus('#search-status', '');
    return;
  }
  $('#search-head').hidden = false;
  $('#search-info').textContent = `Recherche de « ${term} »…`;
  setStatus('#search-status', '');
  skeleton('#search-results');
  try {
    const results = await searchSongs(term);
    if (ticket !== searchRequest) return; // une recherche plus récente est en cours
    state.results = results;
    results.forEach(remember);
    renderList('#search-results', results, 'search');
    $('#search-head').hidden = results.length === 0;
    $('#search-info').textContent = results.length ? `${plural(results.length, 'résultat')} pour « ${term} »` : '';
    setStatus('#search-status', results.length ? '' : `Aucune chanson trouvée pour « ${term} ». Essaie avec un autre mot.`);
  } catch {
    if (ticket !== searchRequest) return;
    $('#search-results').innerHTML = '';
    $('#search-head').hidden = true;
    $('#search-info').textContent = '';
    setStatus('#search-status', 'La recherche ne répond pas. Vérifie ta connexion Internet et réessaie.');
  }
}

function searchFor(term) {
  $('#search').value = term;
  if (location.hash !== '#rechercher') location.hash = '#rechercher';
  runSearch(term);
  setTimeout(() => $('#search').focus(), 50);
}

/* ---------- 7. BIBLIOTHÈQUE ET PLAYLISTS ---------- */

function toggleLibrary(id) {
  const t = state.known[id];
  if (inLibrary(id)) {
    state.library = state.library.filter(x => x !== id);
    toast('Retiré de ta bibliothèque');
  } else {
    state.library.unshift(id); // les derniers ajouts en premier
    toast(`« ${t ? t.title : 'Chanson'} » ajouté à ta bibliothèque`);
  }
  store.set('library', state.library);
  saveKnown();
  refreshLists();
  updateNowPlaying();
}

function createPlaylist(name) {
  const p = { id: Date.now(), name: name.trim(), tracks: [] };
  state.playlists.push(p);
  store.set('playlists', state.playlists);
  return p;
}

function addToPlaylist(plId, trackId) {
  const p = state.playlists.find(x => x.id === plId);
  if (!p) return;
  if (p.tracks.includes(trackId)) return toast(`Déjà dans « ${p.name} »`);
  p.tracks.push(trackId);
  store.set('playlists', state.playlists);
  saveKnown();
  toast(`Ajouté à « ${p.name} »`);
  renderPlaylists();
}

async function openPlaylist(id) {
  state.openPlaylist = id;
  if (location.hash !== '#playlists') location.hash = '#playlists';
  const p = state.playlists.find(x => x.id === id);
  renderPlaylists();
  // Les playlists de départ ne contiennent que des identifiants : on charge les chansons si besoin
  if (p && p.tracks.some(t => !state.known[t])) {
    try { await lookupSongs(p.tracks); saveKnown(); renderPlaylists(); } catch { toast('Impossible de charger la playlist'); }
  }
}

/* ---------- 8. LECTEUR AUDIO ---------- */

function playQueue(list, start = 0, name = '') {
  if (!list.length) return;
  state.queue = [...list];
  state.queueName = name;
  state.index = Math.max(0, start);
  loadTrack(true);
}

function loadTrack(autoplay) {
  const t = current();
  if (!t) return;
  audio.src = t.preview;
  if (autoplay) audio.play().catch(() => { /* lecture bloquée tant que l'utilisateur n'a pas cliqué */ });
  updateNowPlaying();
  refreshLists();
}

function togglePlay() {
  if (!current()) {
    if (state.moodTracks.length) return playQueue(state.moodTracks, 0, `Ta playlist ${moodById(state.mood).name}`);
    return toast('Choisis une chanson pour commencer');
  }
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}

function next(auto = false) {
  if (!state.queue.length) return;
  if (auto && state.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
  if (state.shuffle && state.queue.length > 1) {
    let r;
    do { r = Math.floor(Math.random() * state.queue.length); } while (r === state.index);
    state.index = r;
  } else if (state.index < state.queue.length - 1) {
    state.index++;
  } else if (state.repeat === 'all' || !auto) {
    state.index = 0;
  } else {
    audio.pause(); audio.currentTime = 0; return;
  }
  loadTrack(true);
}

function prev() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  state.index = (state.index - 1 + state.queue.length) % state.queue.length;
  loadTrack(true);
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  syncModeButtons();
  toast(state.shuffle ? 'Lecture aléatoire activée' : 'Lecture aléatoire désactivée');
}

function cycleRepeat() {
  state.repeat = { off: 'all', all: 'one', one: 'off' }[state.repeat];
  syncModeButtons();
  toast({ off: 'Répétition désactivée', all: 'Répéter la playlist', one: 'Répéter ce titre' }[state.repeat]);
}

function syncModeButtons() {
  $$('#shuffle, [data-proxy="shuffle"]').forEach(b => { b.classList.toggle('on', state.shuffle); b.setAttribute('aria-pressed', state.shuffle); });
  $$('#repeat, [data-proxy="repeat"]').forEach(b => { b.classList.toggle('on', state.repeat !== 'off'); b.dataset.mode = state.repeat; });
}

function updateNowPlaying() {
  const t = current();
  if (!t) return;
  $('#p-title').textContent = t.title;
  $('#p-artist').textContent = t.artist;
  $('#p-cover').src = t.thumb;
  $('#full-title').textContent = t.title;
  $('#full-artist').textContent = t.artist;
  $('#full-cover').src = t.cover;
  $('#full-cover').alt = `Pochette de ${t.title}`;
  $('#full-context').textContent = state.queueName || 'Lecture en cours';
  $('#full-badge').textContent = `${t.genre || 'Extrait'} · 30 s`;
  $('#full-link').href = t.url || 'https://music.apple.com';
  const saved = inLibrary(t.id);
  $$('#p-add, #full-add').forEach(b => {
    b.classList.toggle('on', saved);
    b.querySelector('use').setAttribute('href', saved ? '#i-check' : '#i-plus');
    b.setAttribute('aria-label', saved ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque');
  });
  if ('mediaSession' in navigator && 'MediaMetadata' in window) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: [{ src: t.cover, sizes: '600x600', type: 'image/jpeg' }] });
  }
}

function updatePlayIcons() {
  const playing = !audio.paused;
  document.body.classList.toggle('is-playing', playing);
  document.title = playing && current() ? `${current().title} · ${current().artist} — MOODWAVE` : 'MOODWAVE — La musique qui suit ton humeur';
  $$('#play, [data-proxy="play"]').forEach(b => {
    b.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    b.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
  });
  const moodPlaying = playing && state.queueName === `Ta playlist ${moodById(state.mood).name}`;
  $('#play-mood use').setAttribute('href', moodPlaying ? '#i-pause' : '#i-play');
  $('#play-mood span').textContent = moodPlaying ? 'Pause' : 'Tout lire';
}

function updateProgress() {
  const d = audio.duration || 30;
  const pct = (audio.currentTime / d) * 100 || 0;
  $$('#seek, #full-seek').forEach(r => {
    if (document.activeElement !== r) r.value = pct;
    r.style.setProperty('--fill', pct + '%');
  });
  $('#mini-bar').style.width = pct + '%';
  $$('#cur, #full-cur').forEach(el => { el.textContent = formatTime(audio.currentTime); });
  $$('#dur, #full-dur').forEach(el => { el.textContent = formatTime(d); });
}

function seekTo(pct) { if (audio.duration) audio.currentTime = (pct / 100) * audio.duration; }

function setVolume(v) {
  state.volume = v;
  audio.volume = v;
  store.set('volume', v);
  $('#vol').value = v;
  $('#vol').style.setProperty('--fill', v * 100 + '%');
  $('#mute use').setAttribute('href', v === 0 ? '#i-mute' : '#i-volume');
}

/* ---------- 9. MENUS ---------- */

function showMenu(html, anchor) {
  const menu = $('#menu');
  menu.innerHTML = html;
  menu.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  menu.style.top = Math.max(8, r.bottom + h + 8 > window.innerHeight ? r.top - h - 6 : r.bottom + 6) + 'px';
}
function closeMenu() { $('#menu').hidden = true; }

// Menu ⋯ d'une chanson
function openTrackMenu(trackId, anchor, context) {
  const t = state.known[trackId];
  const saved = inLibrary(trackId);
  const items = state.playlists.map(p => `<button data-act="add" data-pl="${p.id}" data-track="${trackId}">${esc(p.name)}</button>`).join('');
  const remove = context === 'playlist' ? `<button data-act="remove" data-track="${trackId}" class="menu-danger">Retirer de cette playlist</button>` : '';
  showMenu(`
    <button data-act="lib" data-track="${trackId}" class="menu-accent">${saved ? '✓ Retirer de ma bibliothèque' : '＋ Ajouter à ma bibliothèque'}</button>
    <button data-act="artist" data-track="${trackId}">Plus de titres de ${esc(t?.artist || 'cet artiste')}</button>
    ${t?.url ? `<a class="menu-link" href="${esc(t.url)}" target="_blank" rel="noopener">Écouter en entier sur Apple Music ↗</a>` : ''}
    <hr><p class="eyebrow">Ajouter à une playlist</p>${items}
    <button data-act="new" data-track="${trackId}">＋ Nouvelle playlist</button>${remove ? '<hr>' + remove : ''}`, anchor);
}

function openQueueMenu(anchor) {
  if (!state.queue.length) return toast("La file d'attente est vide");
  const items = state.queue.map((t, i) =>
    `<button data-act="jump" data-index="${i}" class="${i === state.index ? 'is-current' : ''}">${pad2(i + 1)} · ${esc(t.title)} — ${esc(t.artist)}</button>`).join('');
  showMenu(`<p class="eyebrow">File d'attente · ${esc(state.queueName || 'Lecture en cours')}</p>${items}`, anchor);
}

/* ---------- 10. NAVIGATION ---------- */

const VIEWS = ['accueil', 'rechercher', 'bibliotheque', 'playlists'];

function route() {
  const view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'accueil';
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  $$('[data-link]').forEach(a => a.classList.toggle('active', a.dataset.link === view));
  $('.top-search').hidden = view === 'rechercher'; // la page Recherche a déjà sa grande barre
  if (view !== 'playlists') state.openPlaylist = null;
  if (view === 'bibliotheque') renderLibrary();
  renderPlaylists();
  $('#main').scrollTo(0, 0);
  window.scrollTo(0, 0);
  closeMenu();
  if (view === 'rechercher' && window.innerWidth > 860) setTimeout(() => $('#search').focus(), 50);
}

function openFull(open) {
  $('#full').classList.toggle('open', open);
  $('#full').setAttribute('aria-hidden', String(!open));
}

/* ---------- 11. ÉVÉNEMENTS ---------- */

$('#moods').addEventListener('click', e => {
  const card = e.target.closest('.mood-card');
  if (card) selectMood(card.dataset.mood);
});

// Liste correspondant à l'endroit cliqué (pour savoir quoi lire ensuite)
function listForContext(context) {
  if (context === 'mood') return [state.moodTracks, `Ta playlist ${moodById(state.mood).name}`];
  if (context === 'search') return [state.results, `Recherche : ${$('#search').value.trim()}`];
  if (context === 'library') return [state.library.map(id => state.known[id]).filter(Boolean), 'Ma bibliothèque'];
  const p = state.playlists.find(x => x.id === state.openPlaylist);
  return p ? [playlistTracks(p), p.name] : [[], ''];
}

// Délégation d'événements : un seul écouteur par liste
$$('.tracks').forEach(ol => ol.addEventListener('click', e => {
  const row = e.target.closest('.track:not(.skeleton)');
  if (!row) return;
  const id = Number(row.dataset.id);
  const btn = e.target.closest('[data-action]');
  if (btn?.dataset.action === 'add') return toggleLibrary(id);
  if (btn?.dataset.action === 'menu') { e.stopPropagation(); return openTrackMenu(id, btn, row.dataset.context); }
  if (current()?.id === id) return togglePlay();
  const [list, name] = listForContext(row.dataset.context);
  playQueue(list, list.findIndex(t => t.id === id), name);
}));

$('#play-mood').addEventListener('click', () => {
  const name = `Ta playlist ${moodById(state.mood).name}`;
  if (state.queueName === name && current()) return togglePlay();
  playQueue(state.moodTracks, 0, name);
});
$('#lib-play').addEventListener('click', () => { const [list, name] = listForContext('library'); playQueue(list, 0, name); });

// Recherche : pendant la frappe (délai de 350 ms pour ne pas surcharger l'API)
$('#search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(e.target.value), 350);
});
$('#search-form').addEventListener('submit', e => { e.preventDefault(); clearTimeout(searchTimer); runSearch($('#search').value); });
$('#search-clear').addEventListener('click', () => { $('#search').value = ''; runSearch(''); $('#search').focus(); });
$('#suggest-chips').addEventListener('click', e => { const c = e.target.closest('[data-q]'); if (c) searchFor(c.dataset.q); });
// Barre de recherche du haut (ordinateur) : envoie vers la page Rechercher
$('#top-search').addEventListener('submit', e => { e.preventDefault(); searchFor($('#top-search-input').value); $('#top-search-input').value = ''; });
$('#top-search-input').addEventListener('input', e => {
  if (e.target.value.trim().length >= 2) { const v = e.target.value; e.target.value = ''; searchFor(v); }
});
$('#lib-filter').addEventListener('input', renderLibrary);

// Lecteur
$('#play').addEventListener('click', togglePlay);
$('#next').addEventListener('click', () => next());
$('#prev').addEventListener('click', prev);
$('#shuffle').addEventListener('click', toggleShuffle);
$('#repeat').addEventListener('click', cycleRepeat);
$$('#p-add, #full-add').forEach(b => b.addEventListener('click', () => { if (current()) toggleLibrary(current().id); }));
$$('[data-proxy]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.proxy).click()));
$$('#seek, #full-seek').forEach(r => r.addEventListener('input', () => seekTo(Number(r.value))));
$('#vol').addEventListener('input', e => setVolume(Number(e.target.value)));
let volumeBeforeMute = 0.8;
$('#mute').addEventListener('click', () => { if (state.volume > 0) { volumeBeforeMute = state.volume; setVolume(0); } else setVolume(volumeBeforeMute || 0.8); });
$('#queue-btn').addEventListener('click', e => { e.stopPropagation(); openQueueMenu(e.currentTarget); });
$('#full-queue').addEventListener('click', e => { e.stopPropagation(); openQueueMenu(e.currentTarget); });
$('#full-more').addEventListener('click', e => { e.stopPropagation(); if (current()) openTrackMenu(current().id, e.currentTarget, ''); });

audio.addEventListener('play', updatePlayIcons);
audio.addEventListener('pause', updatePlayIcons);
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateProgress);
audio.addEventListener('ended', () => next(true));
audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  toast('Extrait indisponible, passage au titre suivant');
  setTimeout(() => next(true), 800);
});

$('#open-full').addEventListener('click', () => { if (current()) openFull(true); });
$('#expand').addEventListener('click', () => { if (current()) openFull(true); });
$('#close-full').addEventListener('click', () => openFull(false));
$('#full').addEventListener('click', e => { if (e.target.id === 'full') openFull(false); });

// Playlists
$('#new-pl').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#new-pl-name');
  if (!input.value.trim()) return;
  const p = createPlaylist(input.value);
  input.value = '';
  toast(`Playlist « ${p.name} » créée`);
  renderPlaylists();
});
$('#pl-grid').addEventListener('click', e => { const c = e.target.closest('[data-pl]'); if (c) openPlaylist(Number(c.dataset.pl)); });
$('#spaces').addEventListener('click', e => { const c = e.target.closest('[data-pl]'); if (c) openPlaylist(Number(c.dataset.pl)); });
$('#pl-back').addEventListener('click', () => { state.openPlaylist = null; renderPlaylists(); });
$('#pl-play').addEventListener('click', () => { const [list, name] = listForContext('playlist'); playQueue(list, 0, name); });

let deleteArmed = false, deleteTimer;
$('#pl-delete').addEventListener('click', () => {
  const p = state.playlists.find(x => x.id === state.openPlaylist);
  if (!p) return;
  if (!deleteArmed) {
    deleteArmed = true;
    toast('Clique encore pour supprimer la playlist');
    deleteTimer = setTimeout(() => { deleteArmed = false; }, 3000);
    return;
  }
  clearTimeout(deleteTimer);
  deleteArmed = false;
  state.playlists = state.playlists.filter(x => x.id !== p.id);
  store.set('playlists', state.playlists);
  state.openPlaylist = null;
  toast(`Playlist « ${p.name} » supprimée`);
  renderPlaylists();
});

// Actions du menu ⋯
$('#menu').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) { if (e.target.closest('a')) closeMenu(); return; }
  const trackId = Number(btn.dataset.track);
  const act = btn.dataset.act;
  if (act === 'lib') toggleLibrary(trackId);
  if (act === 'add') addToPlaylist(Number(btn.dataset.pl), trackId);
  if (act === 'new') addToPlaylist(createPlaylist(`Ma playlist ${state.playlists.length + 1}`).id, trackId);
  if (act === 'artist') { openFull(false); searchFor(state.known[trackId]?.artist || ''); }
  if (act === 'remove') {
    const p = state.playlists.find(x => x.id === state.openPlaylist);
    if (p) { p.tracks = p.tracks.filter(t => t !== trackId); store.set('playlists', state.playlists); toast('Retiré de la playlist'); renderPlaylists(); }
  }
  if (act === 'jump') { state.index = Number(btn.dataset.index); loadTrack(true); }
  closeMenu();
});
document.addEventListener('click', e => { if (!e.target.closest('#menu')) closeMenu(); });

// Raccourcis clavier : Espace = lecture/pause, Maj + flèches = suivant/précédent, / = rechercher, Échap = fermer
document.addEventListener('keydown', e => {
  if (e.target.matches('input')) { if (e.code === 'Escape') e.target.blur(); return; }
  if (e.code === 'Space' && !e.target.closest('button, a')) { e.preventDefault(); togglePlay(); }
  if (e.shiftKey && e.code === 'ArrowRight') next();
  if (e.shiftKey && e.code === 'ArrowLeft') prev();
  if (e.key === '/') { e.preventDefault(); searchFor($('#search').value); }
  if (e.code === 'Escape') { closeMenu(); openFull(false); }
});

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => next());
  navigator.mediaSession.setActionHandler('previoustrack', prev);
}

window.addEventListener('hashchange', route);

/* ---------- DÉMARRAGE ---------- */
renderGreeting();
renderSuggestions();
setVolume(state.volume);
syncModeButtons();
selectMood(state.mood);
route();
updateProgress();
