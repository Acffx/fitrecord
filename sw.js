/* ============================================================
   FitRecord · Service Worker（离线缓存）
   © 2026 Acffx · 原创 · 保留所有权利
   未经许可禁止商用、二次发布、去除版权标识
   ============================================================ */
const CACHE = 'fitrecord-v32';
const SHELL = [
  '.',
  'index.html',
  'xian.html',
  'xian-core.js',
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
      /* v8.18: 强制通知所有 tab 重新加载（解决 SW 缓存不生效问题） */
      .then(() => self.clients.matchAll({type: 'window'}).then(function(cls){
        cls.forEach(function(c){ c.postMessage({type:'force-reload'}); });
      }))
  );
});

/* v8.8 修 SW 响应为 null 错误：catch 时必须返回有效 Response，绝不能返回 undefined */
self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'skipWaiting'){ self.skipWaiting(); }
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  /* v8.18: 所有 .js/.css/.html 强制 network-first（保证用户拿到最新代码） */
  var isCode = /\.(js|css|html)(\?|$)/.test(url);
  e.respondWith((async () => {
    if(isCode){
      try{
        var fresh = await fetch(e.request, {cache:'no-cache'});
        try{
          if(fresh && fresh.status === 200) {
            var cp = fresh.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, cp); }).catch(function(){});
          }
        }catch(_){}
        return fresh;
      }catch(_){}
    }
    let cached = null;
    let fetched = null;
    try { cached = await caches.match(e.request); } catch (_) {}
    try {
      fetched = await fetch(e.request).then((res) => {
        try {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(()=>{});
          }
        } catch (_) {}
        return res;
      }).catch(() => null);
    } catch (_) { fetched = null; }
    if (fetched) return fetched;
    if (cached) return cached;
    /* 兜底：返回 NetworkError response，避免 respondWith(null) */
    return new Response('', { status: 504, statusText: 'Offline', headers: { 'Content-Type': 'text/plain' } });
  })());
});
