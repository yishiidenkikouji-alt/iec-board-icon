/* Offline cache is limited to these public shell files. Never cache GAS, data,
 * identities, tokens, URLs saved by the user, or responses from other origins.
 * No push or background refresh is implemented in this foreground-only trial.
 */
'use strict';
const ROOT=new URL('./',self.location.href);
const PREFIX='iec-board-pwa-shell:'+ROOT.pathname+':';
const CACHE=PREFIX+'v1';
const FILES=['./','./index.html','./styles.css','./config.js','./app.js','./manifest.webmanifest'];
const PUBLIC_URLS=FILES.map(path=>new URL(path,ROOT).href);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_URLS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==ROOT.origin || !url.pathname.startsWith(ROOT.pathname))return;
  const plain=new URL(url.pathname,ROOT.origin).href;
  if(!PUBLIC_URLS.includes(plain))return;
  const request=new Request(plain,{cache:'no-cache',credentials:'same-origin'});
  event.respondWith(fetch(request).then(response=>{
    if(response.ok && response.type!=='opaque'){
      const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(plain,copy)));
    }
    return response;
  }).catch(()=>caches.match(plain).then(saved=>saved||Response.error())));
});
