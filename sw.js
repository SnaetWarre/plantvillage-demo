// PlantVillage PWA Service Worker
// Provides offline support by caching the model and assets

const CACHE_NAME = 'plantvillage-v7'; // Added logits debugging
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.svg',
    '/model.onnx',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort.min.js',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort-wasm.wasm',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort-wasm-simd.wasm'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache:', error);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] Serving from cache:', event.request.url);
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        
                        // Cache the fetched response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);
                        // Return offline page if available
                        return caches.match('/index.html');
                    });
            })
    );
});
