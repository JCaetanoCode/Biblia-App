
// ============================================================
// DATA & STATE
// ============================================================

const AT_BOOKS = [
  "Gênesis","Êxodo","Levítico","Números","Deuteronômio",
  "Josué","Juízes","Rute","1 Samuel","2 Samuel",
  "1 Reis","2 Reis","1 Crônicas","2 Crônicas","Esdras",
  "Neemias","Ester","Jó","Salmos","Provérbios",
  "Eclesiastes","Cantares","Isaías","Jeremias","Lamentações",
  "Ezequiel","Daniel","Oseias","Joel","Amós",
  "Obadias","Jonas","Miquéias","Naum","Habacuque",
  "Sofonias","Ageu","Zacarias","Malaquias"
];
const NT_BOOKS = [
  "Mateus","Marcos","Lucas","João","Atos",
  "Romanos","1 Coríntios","2 Coríntios","Gálatas","Efésios",
  "Filipenses","Colossenses","1 Tessalonicenses","2 Tessalonicenses",
  "1 Timóteo","2 Timóteo","Tito","Filemom","Hebreus",
  "Tiago","1 Pedro","2 Pedro","1 João","2 João",
  "3 João","Judas","Apocalipse"
];
const ALL_BOOKS = [...AT_BOOKS, ...NT_BOOKS];

// Standard chapter counts for each book
const CHAPTER_COUNTS = [
  50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,
  12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,
  28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,
  5,5,3,5,1,1,1,22
];

const state = {
  version: 'acf',
  tab: 'at',
  panel: 'book',
  book: null,       // index 0-based
  chapter: null,    // index 0-based
  bibleData: {},
  verseFontSize: 17,
  searchScope: 'all'
};

// ============================================================
// BIBLE DATA LOADER (inline fallback + JSON file loading)
// ============================================================

// We build a minimal inline structure for demo, and try to fetch JSON files
// The JSON format expected: array of books, each book has array of chapters,
// each chapter is array of verse strings.
// Common formats: { "livros": [...] } or flat array

async function loadBible(version) {
  if (state.bibleData[version]) return state.bibleData[version];
  
  try {
    const resp = await fetch(`${version}.json`);
    if (!resp.ok) throw new Error('not found');
    const raw = await resp.json();
    
    // Normalize different JSON formats
    let data = normalizeBibleData(raw);
    state.bibleData[version] = data;
    return data;
  } catch(e) {
    // Use demo data if file not found
    console.warn(`Could not load ${version}.json, using demo data`);
    const demo = buildDemoData();
    state.bibleData[version] = demo;
    return demo;
  }
}

function normalizeBibleData(raw) {
  // Format 1: array of books where each is {name, chapters: [[verse, ...], ...]}
  if (Array.isArray(raw) && raw[0] && raw[0].chapters) {
    return raw.map(b => b.chapters.map(ch => 
      Array.isArray(ch) ? ch : ch.verses || []
    ));
  }
  // Format 2: array of books where each is array of chapters
  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    return raw;
  }
  // Format 3: {livros: [...]} or {books: [...]}
  const books = raw.livros || raw.books || raw.verses || raw;
  if (Array.isArray(books)) {
    return normalizeBibleData(books);
  }
  // Format 4: object with numeric keys
  if (typeof raw === 'object') {
    const keys = Object.keys(raw).sort((a,b) => Number(a)-Number(b));
    return keys.map(k => {
      const book = raw[k];
      if (Array.isArray(book)) return book.map(ch => Array.isArray(ch) ? ch : Object.values(ch));
      const cKeys = Object.keys(book).sort((a,b)=>Number(a)-Number(b));
      return cKeys.map(ck => {
        const ch = book[ck];
        if (Array.isArray(ch)) return ch;
        const vKeys = Object.keys(ch).sort((a,b)=>Number(a)-Number(b));
        return vKeys.map(vk => ch[vk]);
      });
    });
  }
  return [];
}

function buildDemoData() {
  // Build minimal demo: Genesis 1-3 + John 1, rest placeholder
  const data = [];
  for (let b = 0; b < 66; b++) {
    const chapCount = CHAPTER_COUNTS[b];
    const chapters = [];
    for (let c = 0; c < chapCount; c++) {
      const verseCount = Math.floor(Math.random() * 25) + 5;
      const verses = [];
      for (let v = 0; v < verseCount; v++) {
        verses.push(`[${ALL_BOOKS[b]} ${c+1}:${v+1}] — Este versículo é um texto demonstrativo. Carregue o arquivo ${state.version}.json para ver o conteúdo real da Bíblia.`);
      }
      chapters.push(verses);
    }
    data.push(chapters);
  }
  return data;
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderBooks() {
  const atEl = document.getElementById('books-at');
  const ntEl = document.getElementById('books-nt');
  
  atEl.innerHTML = `<div class="testament-label">Antigo Testamento</div>
    <div class="book-grid">${AT_BOOKS.map((b,i) =>
      `<div class="book-btn" data-idx="${i}">${b}</div>`
    ).join('')}</div>`;

  ntEl.innerHTML = `<div class="testament-label">Novo Testamento</div>
    <div class="book-grid">${NT_BOOKS.map((b,i) =>
      `<div class="book-btn" data-idx="${AT_BOOKS.length + i}">${b}</div>`
    ).join('')}</div>`;

  atEl.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => selectBook(parseInt(btn.dataset.idx)));
  });
  ntEl.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => selectBook(parseInt(btn.dataset.idx)));
  });
}

function selectBook(idx) {
  state.book = idx;
  renderChapters(idx);
  showPanel('chapter');
}

function renderChapters(bookIdx) {
  const name = ALL_BOOKS[bookIdx];
  const count = CHAPTER_COUNTS[bookIdx];
  document.getElementById('chapter-title').textContent = name;
  const grid = document.getElementById('chapter-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const btn = document.createElement('div');
    btn.className = 'chap-btn';
    btn.textContent = i;
    btn.addEventListener('click', () => selectChapter(i - 1));
    grid.appendChild(btn);
  }
}

async function selectChapter(chapIdx) {
  state.chapter = chapIdx;
  showPanel('reading');
  await renderChapterContent(state.book, chapIdx);
}

async function renderChapterContent(bookIdx, chapIdx, highlightVerse = null) {
  const data = await loadBible(state.version);
  const bookData = data[bookIdx];
  if (!bookData || !bookData[chapIdx]) {
    document.getElementById('chapter-content').innerHTML = '<p style="padding:20px;color:var(--text3);">Conteúdo não disponível.</p>';
    return;
  }
  
  const verses = bookData[chapIdx];
  const name = ALL_BOOKS[bookIdx];
  const chapNum = chapIdx + 1;
  
  document.getElementById('reading-loc').textContent = `${name} ${chapNum}`;
  document.getElementById('header-subtitle').textContent = `${name} ${chapNum} · ${state.version.toUpperCase()}`;

  const maxVerse = document.getElementById('verse-input');
  if (maxVerse) maxVerse.max = verses.length;

  const content = document.getElementById('chapter-content');
  content.style.setProperty('--verse-size', state.verseFontSize + 'px');

  let html = `<div style="text-align:center;padding-bottom:24px;">
    <div style="font-family:'Crimson Pro',serif;font-size:28px;font-weight:600;color:var(--gold-light)">${name}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px;letter-spacing:1px">CAPÍTULO ${chapNum} · ${state.version.toUpperCase()}</div>
  </div>`;

  verses.forEach((v, i) => {
    const vNum = i + 1;
    const isHL = highlightVerse === vNum;
    html += `<div class="verse-row${isHL?' highlighted':''}" data-verse="${vNum}" id="v${vNum}">
      <span class="v-num">${vNum}</span>
      <span class="v-text">${escHtml(String(v))}</span>
    </div>`;
  });
  
  content.innerHTML = html;

  // Scroll to highlighted verse
  if (highlightVerse) {
    setTimeout(() => {
      const el = document.getElementById('v' + highlightVerse);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  // Verse click — copy ref
  content.querySelectorAll('.verse-row').forEach(row => {
    row.addEventListener('click', () => {
      const vn = row.dataset.verse;
      const ref = `${name} ${chapNum}:${vn}`;
      copyToClipboard(ref + ' — ' + verses[vn-1]);
      showToast(`📋 ${ref} copiado`);
    });
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// SEARCH
// ============================================================

let searchTimer = null;

async function doSearch(query) {
  const el = document.getElementById('search-results');
  const countEl = document.getElementById('search-count');
  
  if (!query || query.trim().length < 2) {
    el.innerHTML = `<div id="search-empty"><div class="empty-icon">✦</div><p>Digite uma palavra ou frase<br>para buscar em todo o texto bíblico</p></div>`;
    return;
  }
  
  el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3)">Buscando...</div>`;
  
  const data = await loadBible(state.version);
  const q = query.trim().toLowerCase();
  const results = [];
  
  const scope = state.searchScope;
  let startIdx = 0, endIdx = 65;
  if (scope === 'at') endIdx = AT_BOOKS.length - 1;
  if (scope === 'nt') startIdx = AT_BOOKS.length;

  for (let b = startIdx; b <= endIdx; b++) {
    if (!data[b]) continue;
    for (let c = 0; c < data[b].length; c++) {
      for (let v = 0; v < data[b][c].length; v++) {
        const text = String(data[b][c][v]);
        if (text.toLowerCase().includes(q)) {
          results.push({ bookIdx: b, chapIdx: c, verseIdx: v, text });
          if (results.length >= 200) break;
        }
      }
      if (results.length >= 200) break;
    }
    if (results.length >= 200) break;
  }

  if (results.length === 0) {
    el.innerHTML = `<div id="search-empty"><div class="empty-icon">✦</div><p>Nenhum resultado para<br><strong style="color:var(--gold)">"${escHtml(query)}"</strong></p></div>`;
    return;
  }

  const limited = results.length >= 200;
  let html = `<div id="search-count">${results.length}${limited?'+':''} resultado${results.length!==1?'s':''} para "<strong style="color:var(--gold)">${escHtml(query)}"</strong></div>`;

  results.forEach(r => {
    const bookName = ALL_BOOKS[r.bookIdx];
    const chapNum = r.chapIdx + 1;
    const verseNum = r.verseIdx + 1;
    const highlighted = highlightText(escHtml(r.text), q);
    html += `<div class="result-card" data-book="${r.bookIdx}" data-chap="${r.chapIdx}" data-verse="${verseNum}">
      <div class="result-ref">${bookName} ${chapNum}:${verseNum}</div>
      <div class="result-text">${highlighted}</div>
    </div>`;
  });

  el.innerHTML = html;

  el.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', async () => {
      const b = parseInt(card.dataset.book);
      const c = parseInt(card.dataset.chap);
      const v = parseInt(card.dataset.verse);
      state.book = b;
      state.chapter = c;
      showPanel('reading');
      await renderChapterContent(b, c, v);
      showSearchPanel(false);
    });
  });
}

function highlightText(text, query) {
  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

// ============================================================
// PANELS & NAVIGATION
// ============================================================

function showPanel(name) {
  state.panel = name;
  document.getElementById('book-panel').classList.toggle('visible', name === 'book');
  document.getElementById('chapter-panel').classList.toggle('visible', name === 'chapter');
  document.getElementById('reading-panel').classList.toggle('visible', name === 'reading');
  document.getElementById('search-panel').classList.toggle('visible', name === 'search');
  document.getElementById('verse-jump').style.display = name === 'reading' ? 'flex' : 'none';
  document.getElementById('nav-tabs').style.display = name === 'book' ? 'flex' : 'none';

  if (name === 'book') {
    document.getElementById('main').scrollTop = 0;
    updateTabHighlight();
  }
}

function updateTabHighlight() {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === state.tab);
  });
  // Scroll to correct testament
  if (state.tab === 'at') {
    document.getElementById('books-at').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    document.getElementById('books-nt').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function showSearchPanel(show) {
  if (show) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));
    document.getElementById('search-panel').classList.add('visible');
    document.getElementById('verse-jump').style.display = 'none';
    document.getElementById('nav-tabs').style.display = 'none';
    document.getElementById('btn-search').classList.add('active');
    setTimeout(() => document.getElementById('search-input').focus(), 100);
    state.panel = 'search';
  } else {
    document.getElementById('btn-search').classList.remove('active');
    const prev = state.panel === 'search' ? 'book' : state.panel;
    showPanel(prev === 'search' ? 'book' : prev);
  }
}

// ============================================================
// VERSION CHANGE
// ============================================================

async function changeVersion(ver) {
  state.version = ver;
  document.querySelectorAll('.ver-btn').forEach(b => b.classList.toggle('active', b.dataset.ver === ver));
  document.querySelectorAll('.ver-option').forEach(o => {
    const sel = o.dataset.ver === ver;
    o.classList.toggle('selected', sel);
  });
  document.getElementById('ver-modal-overlay').classList.remove('open');
  
  showToast(`Versão ${ver.toUpperCase()} selecionada`);
  
  // Re-render current chapter if reading
  if (state.panel === 'reading' && state.book !== null && state.chapter !== null) {
    await renderChapterContent(state.book, state.chapter);
  }
  // Re-run search if in search panel
  if (state.panel === 'search') {
    const q = document.getElementById('search-input').value;
    if (q.trim().length >= 2) doSearch(q);
  }
}

// ============================================================
// UTILITIES
// ============================================================

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function copyToClipboard(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
}

// ============================================================
// INIT & EVENT LISTENERS
// ============================================================

async function init() {
  // Preload default version
  await loadBible('acf');
  
  renderBooks();
  showPanel('book');
  
  document.getElementById('loading').classList.add('hidden');
  
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.tab = tab.dataset.tab;
      updateTabHighlight();
      setTimeout(() => {
        const el = state.tab === 'at' ? document.getElementById('books-at') : document.getElementById('books-nt');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  });

  // Version bar
  document.querySelectorAll('.ver-btn').forEach(btn => {
    btn.addEventListener('click', () => changeVersion(btn.dataset.ver));
  });

  // Version modal
  document.getElementById('btn-ver').addEventListener('click', () => {
    document.getElementById('ver-modal-overlay').classList.add('open');
  });
  document.getElementById('ver-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('ver-modal-overlay'))
      document.getElementById('ver-modal-overlay').classList.remove('open');
  });
  document.querySelectorAll('.ver-option').forEach(opt => {
    opt.addEventListener('click', () => changeVersion(opt.dataset.ver));
  });

  // Chapter back
  document.getElementById('chapter-back').addEventListener('click', () => showPanel('book'));

  // Reading back
  document.getElementById('reading-back').addEventListener('click', () => {
    showPanel('chapter');
    renderChapters(state.book);
  });

  // Prev/Next chapter
  document.getElementById('prev-chap').addEventListener('click', () => {
    if (state.chapter > 0) selectChapter(state.chapter - 1);
    else if (state.book > 0) { state.book--; selectChapter(CHAPTER_COUNTS[state.book] - 1); }
  });
  document.getElementById('next-chap').addEventListener('click', () => {
    if (state.chapter < CHAPTER_COUNTS[state.book] - 1) selectChapter(state.chapter + 1);
    else if (state.book < 65) { state.book++; selectChapter(0); }
  });

  // Verse jump
  document.getElementById('verse-go').addEventListener('click', jumpToVerse);
  document.getElementById('verse-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') jumpToVerse();
  });

  function jumpToVerse() {
    const n = parseInt(document.getElementById('verse-input').value);
    if (!n || n < 1) return;
    const el = document.getElementById('v' + n);
    if (el) {
      document.querySelectorAll('.verse-row.highlighted').forEach(r => r.classList.remove('highlighted'));
      el.classList.add('highlighted');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('verse-input').value = '';
    } else {
      showToast('Versículo não encontrado');
    }
  }

  // Search
  document.getElementById('btn-search').addEventListener('click', () => {
    if (state.panel === 'search') showSearchPanel(false);
    else showSearchPanel(true);
  });
  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(e.target.value), 350);
  });
  document.getElementById('search-clear').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = `<div id="search-empty"><div class="empty-icon">✦</div><p>Digite uma palavra ou frase<br>para buscar em todo o texto bíblico</p></div>`;
  });
  document.querySelectorAll('.search-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.search-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.searchScope = opt.dataset.scope;
      const q = document.getElementById('search-input').value;
      if (q.trim().length >= 2) doSearch(q);
    });
  });

  // Font size
  document.getElementById('font-up').addEventListener('click', () => {
    state.verseFontSize = Math.min(24, state.verseFontSize + 1);
    document.getElementById('chapter-content').style.setProperty('--verse-size', state.verseFontSize + 'px');
    document.querySelectorAll('.v-text').forEach(el => el.style.fontSize = state.verseFontSize + 'px');
  });
  document.getElementById('font-down').addEventListener('click', () => {
    state.verseFontSize = Math.max(13, state.verseFontSize - 1);
    document.querySelectorAll('.v-text').forEach(el => el.style.fontSize = state.verseFontSize + 'px');
  });
}

init();
