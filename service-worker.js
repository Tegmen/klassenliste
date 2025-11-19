/**
 * Service Worker für Klassenliste PWA
 * Ermöglicht Offline-Funktionalität
 */

const CACHE_NAME = 'klassenliste-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/storage.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

/**
 * Installation - Dateien cachen
 */
self.addEventListener('install', event => {
    console.log('Service Worker: Installation');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Dateien werden gecacht');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

/**
 * Aktivierung - Alte Caches löschen
 */
self.addEventListener('activate', event => {
    console.log('Service Worker: Aktivierung');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Alter Cache wird gelöscht', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

/**
 * Fetch - Cache-First-Strategie
 */
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache Hit - Rückgabe aus Cache
                if (response) {
                    return response;
                }

                // Cache Miss - Vom Netzwerk laden
                return fetch(event.request).then(
                    response => {
                        // Ungültige Response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Response klonen (kann nur einmal gelesen werden)
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
            .catch(() => {
                // Offline Fallback
                console.log('Service Worker: Netzwerkfehler, Offline-Modus');
            })
    );
});

/**
 * Background Sync (optional für zukünftige Features)
 */
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Platzhalter für zukünftige Sync-Funktionalität
    console.log('Service Worker: Daten synchronisieren');
}
