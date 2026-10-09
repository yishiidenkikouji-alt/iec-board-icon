/* Offline cache is limited to these public shell files. Never cache GAS, data,
 * identities, tokens, URLs saved by the user, or responses from other origins.
 * Notification state is isolated in IndexedDB; payloads contain counts only.
 */
'use strict';
const ROOT=new URL('./',self.location.href);
const PREFIX='iec-board-pwa-shell:'+ROOT.pathname+':';
const CACHE=PREFIX+'v38-r218-sound';
const FILES=['./','./index.html','./styles.css','./config.js','./entry-session.js','./app.js','./push139.js','./settings-menu.js','./manifest.webmanifest'];
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
  // Return the cached public shell immediately; refresh it without blocking startup.
  const update=fetch(request).then(async response=>{
    if(response.ok&&response.type!=='opaque'){
      try{const cache=await caches.open(CACHE);await cache.put(plain,response.clone());}catch(error){/* Storage failure must not block a live response. */}
    }
    return response;
  });
  event.waitUntil(update.then(()=>undefined,()=>undefined));
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(plain)).catch(()=>null).then(saved=>{
    return saved||update.catch(()=>Response.error());
  }));
});

// Focus only this entry for its foreground or push notifications.
self.addEventListener('notificationclick',event=>{
  if(event.notification.tag!=='iec-board-badge:'+ROOT.pathname+':snapshot'&&!(event.notification.data&&event.notification.data.push139))return;
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      const url=new URL(client.url);
      if(url.origin===ROOT.origin&&(url.pathname===ROOT.pathname||url.pathname===ROOT.pathname+'index.html')){
        try{client.postMessage({type:'push-open139'});return await client.focus();}catch(e){}
      }
    }
    return self.clients.openWindow(ROOT.href);
  })());
});



/* Encrypted Web Push delivery. Store only a random channel and aggregate counts,
 * separately from the public shell cache. Always show a visible notification. */
function pushDb139_(){return new Promise((resolve,reject)=>{const request=indexedDB.open('iec-push139',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function pushState139_(next){
 const db=await pushDb139_();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('state',next===undefined?'readonly':'readwrite'),store=tx.objectStore('state');let value=null;
  if(next===undefined){const request=store.get(ROOT.pathname);request.onsuccess=()=>{value=request.result||null;};}else store.put(next,ROOT.pathname);
  tx.oncomplete=()=>resolve(next===undefined?value:next);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存できませんでした。'));
 });}finally{db.close();}
}
self.addEventListener('message',event=>{
 if(!event.data||event.data.type!=='push-channel139'||!event.ports||!event.ports[0])return;
 const port=event.ports[0];
 event.waitUntil((async()=>{
  try{
   const url=new URL(event.source&&event.source.url||'');if(url.origin!==ROOT.origin||![ROOT.pathname,ROOT.pathname+'index.html'].includes(url.pathname))throw new Error('origin');
   const channel=event.data.channel;if(channel!==''&&!/^[a-f0-9]{32}$/.test(channel))throw new Error('channel');
   const old=await pushState139_();if(!old||old.channel!==channel)await pushState139_({channel:channel,sequence:0,totals:null});port.postMessage({ok:true});
  }catch(e){port.postMessage({ok:false});}
 })());
});
// r218: decide at delivery time, including pushes queued across a time boundary.
// Missing settings retain legacy behavior; malformed schedules fail silent.
function soundAllowed218_(settings,now){
 if(!settings)return true;
 if(settings.mode==='off')return false;if(settings.mode==='always')return true;
 if(settings.mode!=='window'||!Array.isArray(settings.days)||!settings.days.length||settings.days.some(d=>!Number.isInteger(d)||d<0||d>6)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.end)||settings.start===settings.end)return false;
 const d=new Date((now==null?Date.now():Number(now))+9*3600000),day=d.getUTCDay(),minute=d.getUTCHours()*60+d.getUTCMinutes();
 const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3)),start=minutes(settings.start),end=minutes(settings.end);
 return start<end?settings.days.includes(day)&&minute>=start&&minute<end:(minute>=start&&settings.days.includes(day))||(minute<end&&settings.days.includes((day+6)%7));
}
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data=null,stored=null;try{data=event.data&&event.data.json();stored=await pushState139_();}catch(e){}
  const valid=data&&data.v===139&&stored&&stored.channel&&data.channel===stored.channel&&Number.isSafeInteger(data.sequence)&&data.sequence>0&&['unread','actions','total'].every(k=>Number.isSafeInteger(data[k])&&data[k]>=0&&data[k]<=999999)&&data.total===data.unread+data.actions;
  if(!valid){await self.registration.showNotification('業務アプリ',{body:'通知設定が変更されています。アプリを開いて確認してください。',tag:'iec-push139-settings',silent:true,data:{push139:true}});return;}
  const duplicate=data.sequence<=stored.sequence;
  if(!duplicate){stored.sequence=data.sequence;if(!data.test)stored.totals={unread:data.unread,actions:data.actions,total:data.total};try{await pushState139_(stored);}catch(e){}}
  const totals=duplicate&&stored.totals?stored.totals:data;
  await self.registration.showNotification(data.test?'業務アプリ：通知テスト':'業務アプリ',{
   body:data.test?'通知テストです。音はiPhoneの消音・集中モード・通知設定に従います。':'未読 '+totals.unread+'件 ／ 要対応 '+totals.actions+'件。アプリを開いて確認してください。',
   tag:data.test?'iec-push139-test':'iec-push139-update',lang:'ja',icon:new URL('../business-app-icon.png',ROOT).href,
   silent:!!duplicate||(data.sound218?!soundAllowed218_(data.sound218):data.silent218===true),renotify:!duplicate,data:{push139:true}
  });
  if(!data.test&&!duplicate){try{if(typeof self.navigator.setAppBadge==='function'){if(data.total)await self.navigator.setAppBadge(data.total);else if(typeof self.navigator.clearAppBadge==='function')await self.navigator.clearAppBadge();}}catch(e){}}
 })());
});

