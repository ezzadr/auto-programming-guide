/* Auto Programming Guide service worker: app shell + encrypted guides cached for offline use */
var SHELL_CACHE = 'apg-shell-v3';
var GUIDE_CACHE = 'apg-guides';
var SHELL = [
  './', 'index.html', 'manifest.json',
  'vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(SHELL_CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== SHELL_CACHE && k !== GUIDE_CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Guide files (encrypted .bin, renamed on every build, or plain .pdf): cache-first, stored once fetched.
  if (/\/guides\/.+\.pdf$/i.test(url.pathname) || /\/enc\/.+\.bin$/i.test(url.pathname)){
    e.respondWith(caches.open(GUIDE_CACHE).then(function(c){
      return c.match(url.pathname).then(function(hit){
        if (hit) return hit;
        return fetch(req.url).then(function(res){
          if (res.ok && res.status === 200) c.put(url.pathname, res.clone());
          return res;
        });
      });
    }));
    return;
  }

  // App shell + manifest: network-first so updates arrive, cached copy when offline.
  e.respondWith(fetch(req, /enc\.json/.test(url.pathname) ? {cache: 'no-store'} : undefined).then(function(res){
    if (res.ok) caches.open(SHELL_CACHE).then(function(c){ c.put(req, res.clone()); });
    return res;
  }).catch(function(){
    return caches.match(req, {ignoreSearch:true}).then(function(hit){ return hit || caches.match('index.html'); });
  }));
});
