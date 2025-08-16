// Service Worker for Multi-Agent Research Tool
const CACHE_NAME = 'research-tool-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/research',
  '/history',
  '/favorites',
  '/offline.html',
  '/manifest.json',
  // Add other static assets as needed
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/research/,
  /\/api\/health/,
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      networkFirstWithCache(request)
    );
    return;
  }

  // Handle static resources
  event.respondWith(
    cacheFirstWithNetwork(request)
  );
});

// Network first, fallback to cache (for API requests)
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for failed API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection.' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache first, fallback to network (for static resources)
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Failed to fetch:', request.url, error);
    throw error;
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'research-search') {
    event.waitUntil(syncPendingSearches());
  }
});

// Handle pending searches when back online
async function syncPendingSearches() {
  try {
    // Get pending searches from IndexedDB
    const pendingSearches = await getPendingSearches();
    
    for (const search of pendingSearches) {
      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(search.data)
        });
        
        if (response.ok) {
          // Remove from pending and notify user
          await removePendingSearch(search.id);
          await notifySearchComplete(search);
        }
      } catch (error) {
        console.log('[ServiceWorker] Failed to sync search:', error);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: 'Your research analysis is complete!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Results',
        icon: '/icons/action-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Research Complete', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/research')
    );
  }
});

// IndexedDB helpers for offline functionality
async function getPendingSearches() {
  // Implementation would use IndexedDB to store pending searches
  return [];
}

async function removePendingSearch(id) {
  // Implementation would remove search from IndexedDB
}

async function notifySearchComplete(search) {
  // Implementation would show notification to user
}

// Cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}