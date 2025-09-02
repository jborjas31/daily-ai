/**
 * Basic Service Worker for Daily AI
 * Provides basic offline support and caching
 */

const CACHE_NAME = 'daily-ai-v2';
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .catch((error) => {
            // If network fails and it's a navigation request, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            throw error;
          });
      })
  );
});

console.log('SW: Service Worker loaded');
