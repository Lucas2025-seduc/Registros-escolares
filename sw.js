const CACHE_NAME = 'ocorridos-cache-v1';

// Lista CRÍTICA de recursos para funcionamento Offline.
// Baseado na análise do seu HTML original.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Dependências CDN vitais detectadas no seu código
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

// Instalação: Cache inicial dos arquivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching external resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Força ativação imediata
  );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume controle das páginas imediatamente
  );
});

// Fetch: Estratégia Stale-While-Revalidate
// Serve o conteúdo do cache rapidamente, enquanto busca atualização na rede em segundo plano
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET ou esquemas chrome-extension, etc.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Se a resposta da rede for válida, atualiza o cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || networkResponse.type === 'cors') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
            // Fallback para erros de rede (opcional: retornar página offline customizada)
             console.log('[Service Worker] Falha na rede e sem cache para:', event.request.url);
        });

        // Retorna o cache se existir, senão espera a rede
        return cachedResponse || fetchPromise;
      });
    })
  );
});
