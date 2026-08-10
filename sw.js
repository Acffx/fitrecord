const CACHE = 'fitrecord-v4';
const SHELL = [
  '.',
  'index.html',
  'styles.css',
  'enhance.css',
  'app.js',
  'enhance.js',
  'exercises.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'img/hero_gym.jpg',
  'img/ex_press.jpg',
  'img/ex_fly.jpg',
  'img/ex_row.jpg',
  'img/ex_pulldown.jpg',
  'img/ex_squat.jpg',
  'img/ex_legpress.jpg',
  'img/ex_legcurl.jpg',
  'img/ex_ohp.jpg',
  'img/ex_latraise.jpg',
  'img/ex_curl.jpg',
  'img/ex_triext.jpg',
  'img/ex_hipthrust.jpg',
  'img/ex_crunch.jpg',
  'img/ex_cardio.jpg',
  'img/ex_hipab.jpg',
  'img/ex_facepull.jpg',
  'img/ex_hyper.jpg',
  'img/ex_calf.jpg',
  'img/ex_pullup.jpg',
  'img/ex_hangleg.jpg',
  'img/ex_kb.jpg',
  'img/ex_band.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
