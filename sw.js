// Nome do cache ATUALIZADO para 'v3' (Isso força o navegador a recarregar o manifest novo)
const CACHE_NAME = 'registro-ocorridos-v3';

// Arquivos essenciais para o App funcionar offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // CDNs externos (Opcional: cachear para velocidade, mas o navegador gerencia cache HTTP)
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

// 1. Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando nova versão v3...');
  // Força o SW a ativar imediatamente
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cacheando arquivos estáticos');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando v3 e limpando caches antigos...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Garante que o SW controle a página imediatamente sem recarregar
  return self.clients.claim();
});

// 3. Interceptação de Requisições (Estratégia: Cache First, Network Fallback)
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou que sejam chrome-extension, etc.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se tiver no cache, retorna o cache
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não, busca na rede
      return fetch(event.request)
        .then((networkResponse) => {
          // Verifica se a resposta é válida
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            // Para requisições externas (CDN), type pode ser 'cors', então permitimos
            if (networkResponse.type !== 'cors') {
                return networkResponse;
            }
          }

          // Clona a resposta para salvar no cache e retornar ao navegador
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Se falhar (offline) e não tiver no cache, mostra página offline se existir
          // No nosso caso, como é SPA, se index.html estiver cacheado, ele carrega.
          console.log('[Service Worker] Falha na rede e item não está no cache:', event.request.url);
        });
    })
  );
});
