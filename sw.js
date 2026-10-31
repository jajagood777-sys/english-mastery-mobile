const CACHE='english-cultivation-static-v4.3.3';
const ASSETS=['./','./index.html','./styles.css','./app.js','./core.mjs','./visuals.mjs','./manifest.webmanifest','./assets/icon.svg','./assets/visuals/calligraphy-01.webp','./assets/visuals/calligraphy-02.webp','./assets/visuals/archive-03.webp','./assets/visuals/calligraphy-04.webp','./assets/visuals/quote-05.webp','./assets/visuals/archive-06.webp','./assets/visuals/portrait-07.webp','./assets/visuals/portrait-08.webp','./assets/visuals/hero-09.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));
});
