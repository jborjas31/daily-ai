# PWA Caching Strategy Implementation Spec

## ⚡ **Medium Priority Requirement**
**Priority**: MEDIUM  
**Phase**: Phase 12 - PWA Features & Polish  
**Impact**: Poor offline experience, slow loading, unnecessary network requests

---

## 📋 **Caching Strategy Overview**

### **Multi-Layer Caching Approach**
1. **Static Assets**: Cache-First (CSS, JS, icons, fonts)
2. **App Shell**: Cache-First with background updates
3. **Dynamic Data**: Network-First with fallback
4. **User Data**: Cache-First with background sync
5. **Images**: Cache-First with size limits

---

## 🎯 **Service Worker Implementation**

### **1. Service Worker Registration & Lifecycle**

```javascript
// sw-register.js
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            console.log('ServiceWorker registered:', registration.scope);
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        showUpdateNotification();
                    }
                });
            });
            
            return registration;
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
}

function showUpdateNotification() {
    const notification = {
        type: 'info',
        title: 'App Update Available',
        message: 'A new version is ready. Refresh to get the latest features.',
        actions: [
            { text: 'Refresh Now', action: () => window.location.reload() },
            { text: 'Later', action: () => dismissNotification() }
        ],
        persistent: true
    };
    
    showNotification(notification);
}
```

### **2. Cache Configuration & Strategies**

```javascript
// sw.js - Service Worker
const CACHE_VERSION = 'v1.2.0';
const CACHE_NAMES = {
    static: `daily-ai-static-${CACHE_VERSION}`,
    dynamic: `daily-ai-dynamic-${CACHE_VERSION}`,
    userData: `daily-ai-userdata-${CACHE_VERSION}`,
    images: `daily-ai-images-${CACHE_VERSION}`
};

// Cache size limits
const CACHE_LIMITS = {
    static: 50,      // 50 static files max
    dynamic: 100,    // 100 dynamic responses max  
    userData: 1000,  // 1000 user data entries max
    images: 20       // 20 images max
};

// Static assets to pre-cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/timeline.css',
    '/css/components.css', 
    '/js/app.js',
    '/js/firebase.js',
    '/js/ui.js',
    '/js/taskLogic.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAMES.static)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()) // Force activation
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        cleanupOldCaches().then(() => self.clients.claim())
    );
});

async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name.startsWith('daily-ai-') && !Object.values(CACHE_NAMES).includes(name)
    );
    
    return Promise.all(
        oldCaches.map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
        })
    );
}
```

### **3. Fetch Event Handling with Strategy Selection**

```javascript
// Fetch event - route requests to appropriate strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Route to appropriate strategy
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.static));
    } else if (isUserData(url)) {
        event.respondWith(cacheFirstWithSyncStrategy(request, CACHE_NAMES.userData));
    } else if (isFirebaseAPI(url)) {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic));
    } else if (isImageResource(url)) {
        event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
    } else {
        event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic));
    }
});

// Strategy implementations
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Return cached version immediately
            return cachedResponse;
        }
        
        // Fetch from network and cache
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return cached version or offline fallback
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        return cachedResponse || createOfflineFallback(request);
    }
}

async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            await cache.put(request, networkResponse.clone());
            await trimCache(cacheName, CACHE_LIMITS.dynamic);
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback to cached version
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        return cachedResponse || createOfflineFallback(request);
    }
}

async function cacheFirstWithSyncStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Return cached version immediately
        backgroundSync(request, cacheName);
        return cachedResponse;
    }
    
    // If not cached, fetch from network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            await cache.put(request, networkResponse.clone());
            await trimCache(cacheName, CACHE_LIMITS.userData);
        }
        return networkResponse;
    } catch (error) {
        return createOfflineFallback(request);
    }
}

// Background sync for fresh data
async function backgroundSync(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            const cache = await caches.open(cacheName);
            await cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Background sync failed - cached version still valid
        console.log('Background sync failed for:', request.url);
    }
}
```

### **4. Cache Management & Optimization**

```javascript
// Cache size management
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length <= maxItems) return;
    
    // Remove oldest entries
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    
    console.log(`Trimmed ${keysToDelete.length} items from ${cacheName}`);
}

// Smart cache invalidation
async function invalidateUserDataCache(userId) {
    const cache = await caches.open(CACHE_NAMES.userData);
    const keys = await cache.keys();
    
    // Remove user-specific cached data
    const userDataKeys = keys.filter(key => key.url.includes(`users/${userId}`));
    await Promise.all(userDataKeys.map(key => cache.delete(key)));
    
    console.log(`Invalidated ${userDataKeys.length} user data cache entries`);
}

// Preload critical user data
async function preloadUserData(userId) {
    const criticalEndpoints = [
        `/api/users/${userId}`,
        `/api/users/${userId}/tasks?active=true`,
        `/api/users/${userId}/task_instances?date=${getCurrentDate()}`
    ];
    
    const cache = await caches.open(CACHE_NAMES.userData);
    
    for (const endpoint of criticalEndpoints) {
        try {
            const response = await fetch(endpoint);
            if (response.status === 200) {
                await cache.put(endpoint, response.clone());
            }
        } catch (error) {
            console.log('Failed to preload:', endpoint);
        }
    }
}
```

### **5. Offline Fallback Pages**

```javascript
function createOfflineFallback(request) {
    const url = new URL(request.url);
    
    if (url.pathname.includes('/api/')) {
        // API fallback - return cached data structure
        return new Response(JSON.stringify({
            offline: true,
            message: 'This data is not available offline',
            timestamp: Date.now()
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
        });
    }
    
    if (request.destination === 'image') {
        // Image fallback - return placeholder
        return caches.match('/icons/offline-placeholder.png');
    }
    
    // HTML fallback - return offline page
    return caches.match('/offline.html');
}

// URL classification helpers
function isStaticAsset(url) {
    return url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ttf)$/);
}

function isUserData(url) {
    return url.pathname.includes('/users/') && url.pathname.includes('/api/');
}

function isFirebaseAPI(url) {
    return url.hostname.includes('firebaseio.com') || 
           url.hostname.includes('googleapis.com');
}

function isImageResource(url) {
    return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/);
}
```

---

## 📱 **App Manifest Configuration**

### **manifest.json**
```json
{
  "name": "Daily AI - Task Manager",
  "short_name": "Daily AI",
  "description": "Time-based daily task manager with intelligent scheduling",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF9",
  "theme_color": "#3B82F6",
  "orientation": "portrait-primary",
  "categories": ["productivity", "utilities"],
  
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192.png", 
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512", 
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  
  "shortcuts": [
    {
      "name": "Today's Tasks",
      "short_name": "Today",
      "description": "View today's task timeline",
      "url": "/?view=today",
      "icons": [{"src": "/icons/today-shortcut.png", "sizes": "96x96"}]
    },
    {
      "name": "Add Task",
      "short_name": "Add Task", 
      "description": "Create a new task",
      "url": "/?action=add-task",
      "icons": [{"src": "/icons/add-task-shortcut.png", "sizes": "96x96"}]
    }
  ]
}
```

---

## 🔄 **Cache Update Strategies**

### **Versioned Updates**
```javascript
// Update detection and management
class CacheUpdateManager {
    constructor() {
        this.currentVersion = CACHE_VERSION;
        this.updateCheckInterval = 60 * 60 * 1000; // Check every hour
        this.startUpdateChecking();
    }
    
    startUpdateChecking() {
        // Check for updates on app focus
        window.addEventListener('focus', () => {
            this.checkForUpdates();
        });
        
        // Periodic update checks
        setInterval(() => {
            this.checkForUpdates();
        }, this.updateCheckInterval);
    }
    
    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.update();
            }
        }
    }
    
    handleUpdateAvailable() {
        // Show non-intrusive update notification
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>🎉 New version available!</span>
                <button onclick="location.reload()">Update Now</button>
                <button onclick="this.parentElement.parentElement.remove()">Later</button>
            </div>
        `;
        
        document.body.appendChild(updateBanner);
        
        // Auto-remove after 30 seconds if not interacted with
        setTimeout(() => {
            if (updateBanner.parentElement) {
                updateBanner.remove();
            }
        }, 30000);
    }
}
```

---

## 🧪 **Cache Performance Testing**

### **Cache Effectiveness Monitoring**
```javascript
class CacheAnalytics {
    constructor() {
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            networkRequests: 0,
            offlineRequests: 0
        };
    }
    
    recordCacheHit(url) {
        this.metrics.cacheHits++;
        console.log(`Cache HIT: ${url}`);
    }
    
    recordCacheMiss(url) {
        this.metrics.cacheMisses++;
        console.log(`Cache MISS: ${url}`);
    }
    
    getMetrics() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        const hitRate = total > 0 ? (this.metrics.cacheHits / total * 100).toFixed(2) : 0;
        
        return {
            ...this.metrics,
            hitRate: `${hitRate}%`,
            totalRequests: total
        };
    }
    
    logPerformanceReport() {
        const metrics = this.getMetrics();
        console.group('Cache Performance Report');
        console.log('Cache Hit Rate:', metrics.hitRate);
        console.log('Cache Hits:', metrics.cacheHits);
        console.log('Cache Misses:', metrics.cacheMisses);
        console.log('Network Requests:', metrics.networkRequests);
        console.log('Offline Requests:', metrics.offlineRequests);
        console.groupEnd();
    }
}
```

---

## ✅ **Success Criteria**

- [ ] Static assets load instantly from cache (cache-first)
- [ ] App works offline with full functionality for cached data
- [ ] Cache hit rate >80% for returning users
- [ ] App shell loads in <200ms on repeat visits
- [ ] Smooth updates without breaking user experience
- [ ] Cache size stays within reasonable limits (<50MB total)
- [ ] Background sync keeps data fresh without user intervention

---

## 🔗 **Related Files**

- Service worker: `public/sw.js`
- Registration script: `public/js/utils/sw-register.js`
- App manifest: `public/manifest.json`
- Cache analytics: `public/js/utils/cache-analytics.js`
- Offline pages: `public/offline.html`
- Icons: `public/icons/` directory

---

## 📝 **Implementation Notes**

- Use cache-first for static assets, network-first for dynamic data
- Implement smart cache limits to prevent storage bloat
- Provide clear update notifications without being intrusive
- Monitor cache performance and adjust strategies based on usage patterns
- Test thoroughly in various network conditions (online, offline, slow 3G)
- Ensure graceful fallbacks for all types of content