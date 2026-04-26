// ============================================================
// SERVICE WORKER — Bíblia Sagrada PWA
// ============================================================

const CACHE_NAME = 'biblia-sagrada-v1';

// Arquivos que serão cacheados imediatamente na instalação
const STATIC_ASSETS = [
  './biblia-app.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap'
];

// Arquivos das versões bíblicas (serão cacheados quando acessados pela 1ª vez)
const BIBLE_FILES = [
  './acf.json',
  './aa.json',
  './nvi.json'
];

// ——— INSTALL: pré-cacheia assets estáticos ———
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cacheia assets estáticos obrigatórios
      return cache.addAll(STATIC_ASSETS).then(() => {
        // Tenta cachear os JSONs da Bíblia (pode falhar se não existirem)
        return Promise.allSettled(
          BIBLE_FILES.map(file =>
            fetch(file).then(res => {
              if (res.ok) return cache.put(file, res);
            }).catch(() => {})
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// ——— ACTIVATE: limpa caches antigos ———
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ——— FETCH: estratégia por tipo de arquivo ———
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Fontes do Google: Cache First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // JSONs da Bíblia: Cache First (são grandes, raramente mudam)
  if (url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirstWithUpdate(event.request));
    return;
  }

  // HTML principal: Network First com fallback para cache
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Demais recursos: Cache First
  event.respondWith(cacheFirst(event.request));
});

// ——— Estratégias de cache ———

// Cache First: usa cache se disponível, senão busca na rede e salva
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — conteúdo não disponível', { status: 503 });
  }
}

// Cache First with Background Update: retorna do cache mas atualiza em background
async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await networkFetch || new Response(JSON.stringify([]), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Network First: tenta rede, fallback para cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ——— MENSAGENS: permite forçar atualização do cache ———
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();

  if (event.data === 'CACHE_BIBLES') {
    caches.open(CACHE_NAME).then(cache => {
      BIBLE_FILES.forEach(file => {
        fetch(file).then(res => { if (res.ok) cache.put(file, res); }).catch(() => {});
      });
    });
  }
});
