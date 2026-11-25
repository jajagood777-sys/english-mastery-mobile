const CACHE='english-cultivation-static-v20.0.5';
const ASSETS=['./','./vocab.mjs','./cdtl.mjs',
  './discourse.mjs',
  './immersion.mjs',
  './mastery-os.mjs',
  './radio.mjs',
  './radio-offline.mjs','./ux-100.mjs',
  './studio.mjs',
  './handover.mjs',
  './motivation.mjs',
  './ai-tutor.mjs','./learning-engines.mjs','./skills-studio.mjs','./continuity-os.mjs','./index.html','./styles.css','./app.js','./scroll-stability.mjs','./neural-tts.mjs','./speech-clips.mjs','./release-safety.mjs','./core.mjs','./english-first.mjs','./recordings.mjs','./state-mirror.mjs','./fsrs-engine.mjs','./sla-enhancers.mjs','./visuals.mjs','./manifest.webmanifest','./assets/icon.svg','./assets/visuals/calligraphy-01.webp','./assets/visuals/calligraphy-02.webp','./assets/visuals/archive-03.webp','./assets/visuals/calligraphy-04.webp','./assets/visuals/quote-05.webp','./assets/visuals/archive-06.webp','./assets/visuals/portrait-07.webp','./assets/visuals/portrait-08.webp','./assets/visuals/hero-09.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('english-cultivation-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Never double-cache large ONNX/WASM assets in the app shell cache.
  if(url.pathname.includes('/kokoro-preview/runtime/')||url.pathname.includes('/kokoro-preview/live.'))return;
  // v20.0.5 iOS Safari HTTP 206 Byte-Range handler for offline cached audio
  if (/\.(?:mp3|m4a|wav|aac)$/i.test(url.pathname) && event.request.headers.has('range')) {
    event.respondWith((async () => {
      const rangeHeader = event.request.headers.get('range') || '';
      const cached = await caches.match(event.request.url);
      if (!cached) return fetch(event.request);
      const buf = await cached.arrayBuffer();
      const total = buf.byteLength;
      const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Math.min(total - 1, Number(m[2])) : total - 1;
      const chunk = buf.slice(start, end + 1);
      return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunk.byteLength)
        }
      });
    })());
    return;
  }
  // Network-First for HTML navigation so fresh deploys appear immediately on iOS Safari.
  if(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')){
    event.respondWith(
      fetch(event.request).then(response=>{
        if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
        return response;
      }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
    );
    return;
  }
  // Network-First for JS/MJS/CSS to prevent ES-module version skew on iOS Safari; SWR for images/assets.
  if(/\.(?:m?js|css)$/.test(url.pathname)){
    event.respondWith(
      fetch(event.request).then(response=>{
        if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
        return response;
      }).catch(()=>caches.match(event.request).then(cached=>cached||Response.error()))
    );
    return;
  }
  // Stale-While-Revalidate for non-code static assets (instant paint + background refresh).
  event.respondWith(
    caches.match(event.request).then(cached=>{
      const networkFetch=fetch(event.request).then(response=>{
        if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
        return response;
      }).catch(()=>cached||Response.error());
      return cached||networkFetch;
    })
  );
});

self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });

// upgraded from english-cultivation-static-v19.5.1
