/**
 * Basic Service Worker for Daily AI
 * Provides basic offline support and caching
 */

const CACHE_NAME = 'daily-ai-v4';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/css/timeline.css',
  '/css/modern-features.css',
  '/css/responsive-navigation.css',
  '/js/app.js',
  '/js/state.js',
  '/js/ui.js',
  '/js/taskLogic.js',
  '/js/data.js',
  '/js/components/TaskModalContainer.js',
  '/js/components/TimelineContainer.js',
  '/js/components/TimelineHeader.js',
  '/js/components/TimelineGrid.js',
  '/js/utils/AppInitializer.js',
  '/js/utils/ModernBrowserChecker.js',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.log('SW: Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Prefer fresh HTML for navigations (SPA shell), fallback to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For static assets and API calls, use cache-first fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});

console.log('SW: Service Worker loaded');
