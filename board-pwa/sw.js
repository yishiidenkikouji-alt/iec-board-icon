/* Offline cache is limited to these public shell files. Never cache GAS, data,
 * identities, tokens, URLs saved by the user, or responses from other origins.
 * Notification state is isolated in IndexedDB; payloads contain counts only.
 */
'use strict';
const ROOT=new URL('./',self.location.href);
const PREFIX='iec-board-pwa-shell:'+ROOT.pathname+':';
const CACHE=PREFIX+'v46-d4-entry-startup';
const FILES=['./','./index.html','./styles.css','./config.js','./entry-startup.js','./connection-diagnostics.js','./entry-session.js','./app.js','./push139.js','./settings-menu.js','./manifest.webmanifest'];
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
    const route=noticeRouteP015_(event.notification.data&&event.notification.data.routeP015);
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      const url=new URL(client.url);
      if(url.origin===ROOT.origin&&(url.pathname===ROOT.pathname||url.pathname===ROOT.pathname+'index.html')){
        try{client.postMessage({type:'push-open139',routeP015:route});return await client.focus();}catch(e){}
      }
    }
    const target=new URL(ROOT.href);target.hash='notice='+encodeURIComponent(JSON.stringify(route));return self.clients.openWindow(target.href);
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
function noticeRouteP015_(r){
 if(r&&r.view==='talk'&&/^(company|reports|health|(?:dm|grp)-[a-f0-9]{32})$/.test(r.room))return {view:'talk',room:r.room};
 if(r&&r.view==='approval')return {view:'approval'};
 return {view:'inbox'};
}
let pushQueueP015=Promise.resolve();
function queuePushP015_(fn){const next=pushQueueP015.then(fn,fn);pushQueueP015=next.catch(()=>{});return next;}
function validTotalsB1_(value){return value&&['unread','actions','total'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0&&value[k]<=999999)&&value.total===value.unread+value.actions;}
async function applyBadgeB1_(total){
 if(total===0&&typeof self.navigator.clearAppBadge==='function')await self.navigator.clearAppBadge();
 else if(typeof self.navigator.setAppBadge==='function')await self.navigator.setAppBadge(total);
}
async function clearReadNotificationsB1_(){
 const tags=['iec-board-badge:'+ROOT.pathname+':snapshot','iec-push139-update','iec-push139-test','iec-push139-settings'];
 const shown=await self.registration.getNotifications();
 shown.filter(notification=>tags.includes(notification.tag)).forEach(notification=>notification.close());
}
self.addEventListener('message',event=>{
 if(!event.data||!['push-channel139','badge-stateB1'].includes(event.data.type)||!event.ports||!event.ports[0])return;
 const port=event.ports[0];
 event.waitUntil(queuePushP015_(async()=>{
  try{
   const url=new URL(event.source&&event.source.url||'');if(url.origin!==ROOT.origin||![ROOT.pathname,ROOT.pathname+'index.html'].includes(url.pathname))throw new Error('origin');
   if(event.data.type==='badge-stateB1'){
    const data=event.data;
    if(!validTotalsB1_(data)||!Number.isFinite(data.at)||data.at>Date.now()+60000||data.at<Date.now()-10*60*1000)throw new Error('counts');
    let old=null,readable=true,persisted=true;
    try{old=await pushState139_();}catch(e){readable=false;persisted=false;}
    old=old||{channel:'',sequence:0,totals:null};
    if(data.expectedSequence!=null&&(!Number.isSafeInteger(data.expectedSequence)||!readable||data.expectedSequence!==old.sequence)){port.postMessage({ok:true,ignored:true});return;}
    // Serialize foreground reads with pushes; an older tab must not overwrite
    // a more recent snapshot. Only aggregate counts are persisted.
    if(data.at<(old.totalsAt||0)){port.postMessage({ok:true,ignored:true});return;}
    old.totals={unread:data.unread,actions:data.actions,total:data.total,routeP015:{view:'inbox'}};old.totalsAt=data.at;
    // The OS notification must clear even if count-history storage fails.
    // Never overwrite the subscription channel after a failed storage read.
    if(readable){try{await pushState139_(old);}catch(e){persisted=false;}}
    if(data.total===0)await clearReadNotificationsB1_();
    await applyBadgeB1_(data.total);port.postMessage({ok:true,persisted:persisted});return;
   }
   const channel=event.data.channel;if(channel!==''&&!/^[a-f0-9]{32}$/.test(channel))throw new Error('channel');
   const old=await pushState139_();if(!old||old.channel!==channel)await pushState139_({channel:channel,sequence:0,totals:null});port.postMessage({ok:true});
  }catch(e){port.postMessage({ok:false});}
 }));
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
 event.waitUntil(queuePushP015_(async()=>{
  let data=null,stored=null;try{data=event.data&&event.data.json();stored=await pushState139_();}catch(e){}
  const valid=data&&data.v===139&&stored&&stored.channel&&data.channel===stored.channel&&Number.isSafeInteger(data.sequence)&&data.sequence>0&&validTotalsB1_(data);
  if(!valid){await self.registration.showNotification('業務アプリ',{body:'通知の内容を確認できませんでした。アプリを開いて最新情報をご確認ください。',tag:'iec-push139-settings',silent:true,data:{push139:true}});return;}
  const duplicate=data.sequence<=stored.sequence;
  const older=!data.test&&stored.totals&&Number.isFinite(data.at)&&data.at<=(stored.totalsAt||0);
  if(!duplicate){stored.sequence=data.sequence;if(!data.test&&!older){stored.totals={unread:data.unread,actions:data.actions,total:data.total,routeP015:noticeRouteP015_(data.routeP015)};stored.totalsAt=Number.isFinite(data.at)&&data.at<=Date.now()+60000?data.at:0;}try{await pushState139_(stored);}catch(e){}}
  const totals=(duplicate||older)&&stored.totals?stored.totals:data;
  await self.registration.showNotification(data.test?'業務アプリ：通知テスト':'業務アプリ',{
   body:data.test?'通知テストです。音はiPhoneの消音・集中モード・通知設定に従います。':'未読'+totals.unread+'件・要確認'+totals.actions+'件',
   tag:data.test?'iec-push139-test':'iec-push139-update',lang:'ja',icon:new URL('../business-app-icon.png',ROOT).href,
   silent:!!duplicate||!!older||(data.sound218?!soundAllowed218_(data.sound218):data.silent218===true),renotify:!duplicate&&!older,data:{push139:true,routeP015:noticeRouteP015_(totals.routeP015)}
  });
  if(!data.test){try{await applyBadgeB1_(totals.total);}catch(e){}}
  // A delayed push still has to display a notification. If the app is open,
  // let its verified zero reconcile it; guard against a newer intervening push.
  if(!data.test&&(duplicate||older)&&totals.total===0){try{
   const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
   windows.forEach(client=>{const url=new URL(client.url);if(client.visibilityState==='visible'&&url.origin===ROOT.origin&&[ROOT.pathname,ROOT.pathname+'index.html'].includes(url.pathname))client.postMessage({type:'badge-recheckB2',sequence:stored.sequence});});
  }catch(e){}}
 }));
});




