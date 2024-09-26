const staticCacheConstant = 'static_cache';
const dynamicCacheConstant = 'dynamic_cache';

const assets = [
    '/',
    '/index.html',
    '/js/app.js',
    '/js/homeUI.js',
    '/css/styles.css',
    '/img/illustration.png',
    '/pages/fallback.html',
    '/css/fallback.css',
    'https://www.gstatic.com/firebasejs/5.11.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/5.11.0/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/5.11.0/firebase-storage.js',
];

// limit cash size -> if it is full, delete the oldest cashes 
const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        if(keys.length > size){
          cache.delete(keys[0]).then(limitCacheSize(name, size));  // call until all of the excess caches have been deleted 
        }
      });
    });
};

// listen for sw install event -> for caching
self.addEventListener('install', installEvent => { 
   installEvent.waitUntil(
      caches.open(staticCacheConstant)  // if !exist -> creates cache for static site parts, else opens existing
      .then(cache => {    // add resources to cache ... app shell
          console.log('[SW] caching app shell');
          cache.addAll(assets);
       })
    )
})

// listen for when sw becomes active  -> new sw has been activated -> recache static shell (delete old one)
self.addEventListener('activate', activateEvent => {
    activateEvent.waitUntil(
        caches.keys()  // caches names
        .then( keys => {
            return Promise.all(keys.filter(key => key !== dynamicCacheConstant && key !== staticCacheConstant).map(key => caches.delete(key)))
        })
    )
})

// listen for fetch events (when fetching something from server)
// intercept all fetching requests for cached assets..

self.addEventListener('fetch', evt => {
    if (evt.request.url.indexOf('firestore.googleapis.com') === -1) {
      evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
          if (cacheRes) {
            return cacheRes; // Return cached response if available
          } else {
            return fetch(evt.request)
              .then(fetchRes => {
                if (!fetchRes || fetchRes.status !== 200 || fetchRes.type !== 'basic') {
                  return fetchRes;
                }
  
                const responseToCache = fetchRes.clone();
                return caches.open(dynamicCacheConstant).then(cache => {
                  cache.put(evt.request, responseToCache); // Cache the response
                  return fetchRes;
                });
              })
              .catch(err => {
                console.error('Fetch error:', err);
                return new Response('Fetch failed');
              });
          }
        }).catch(err => {
          console.error('Cache match error:', err);
          return new Response('Cache match failed');
        })
      );
    }
});
  