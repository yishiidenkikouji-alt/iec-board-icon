/* P085: authenticated own-card preview on the ordinary entry. No cached PII.
 * Every visible card came from an online Firestore GET with live rule checks.
 * The existing GAS frame remains responsible for every operation and latest data.
 */
(function(){
 'use strict';
 const ORIGIN='https://yishiidenkikouji-alt.github.io',ROOT='/iec-board-icon/board-pwa/';
 if(location.origin!==ORIGIN||window.top!==window||new URL('./',location.href).pathname!==ROOT)return;
 const PROJECT='ishii-board-trial-p003',VERSION='P085-ENTRY-1';
 let epoch=0,run=null,authPromise=null,overlay=null,expiryTimer=null,readTimer=null,abort=null;
 let stats={version:VERSION,path:'normal',firstCardMs:null,normalHomeMs:null,latestCardMs:null,sourceAgeMs:null,prepared:false,reason:''};
 const now=()=>Math.round(performance.now());
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
 function ticketIdentity(ticket){
  if(typeof ticket!=='string'||!/^iec-resume-v1\.[A-Za-z0-9_-]{50,1600}\.[A-Za-z0-9_-]{43}$/.test(ticket))throw Error('ticket');
  const raw=ticket.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0))));
  if(p.v!==1||!/^iec-device-v3:[a-f0-9]{32}$/.test(p.i||'')||typeof p.r!=='string'||!p.r||typeof p.b!=='string'||!p.b||!Number.isFinite(p.e)||p.e<=Date.now())throw Error('ticket');
  return JSON.stringify([p.i,p.r,p.b]);
 }
 async function sdk(){
  if(!authPromise)authPromise=(async()=>{
   const base='https://www.gstatic.com/firebasejs/13.0.0/';
   const [app,auth]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js')]);
   const instance=app.initializeApp({apiKey:'AIzaSyA8kXcaabbAGJeme8SqhdBEcW9_2bDE95A',authDomain:PROJECT+'.firebaseapp.com',projectId:PROJECT,appId:'1:370469807597:web:f708cc81213706a80673e4'},'iec-entry-card-p085');
   const session=auth.initializeAuth(instance,{persistence:[auth.indexedDBLocalPersistence,auth.browserLocalPersistence]});
   await auth.setPersistence(session,auth.indexedDBLocalPersistence).catch(()=>auth.setPersistence(session,auth.browserLocalPersistence));
   await session.authStateReady();return {session,auth};
  })().catch(e=>{authPromise=null;throw e;});
  return authPromise;
 }
 function hide(){
  clearTimeout(expiryTimer);clearTimeout(readTimer);if(abort)abort.abort();abort=null;
  if(overlay){overlay.remove();overlay=null;}
 }
 function cancel(reason){epoch++;hide();run=null;if(reason)stats.reason=reason;}
 function active(r){return run===r&&r.epoch===epoch&&r.current()&&!document.hidden&&navigator.onLine!==false&&!r.finished;}
 function decode(response,r,uid){
  const f=response&&response.fields,c=f&&f.card&&f.card.mapValue&&f.card.mapValue.fields;
  const text=(o,k)=>o&&o[k]&&o[k].stringValue;
  if(!f||!c||text(f,'uid')!==uid||text(f,'binding')!==r.binding||text(f,'endpointHash')!==r.endpointHash)throw Error('identity');
  const updated=Date.parse(f.updatedAt&&f.updatedAt.timestampValue),expires=Date.parse(f.expiresAt&&f.expiresAt.timestampValue);
  if(!Number.isFinite(updated)||!Number.isFinite(expires)||updated>Date.now()+60000||expires<=Date.now()||expires>updated+7*86400000)throw Error('expiry');
  const card={};for(const k of ['name','label','place','workContent']){const v=text(c,k);if(typeof v!=='string'||v.length>3000)throw Error('card');card[k]=v;}
  if(!card.name)return null;return {card,updated,expires};
 }
 function paint(d,r){
  if(!active(r))return;
  if(!overlay){
   overlay=document.createElement('section');overlay.id='entryCardP085';overlay.setAttribute('aria-label','本人カード');
   const panel=document.createElement('div');panel.className='entry-card-panel';overlay.appendChild(panel);
   for(const [tag,id] of [['p','entryCardTimeP085'],['h1','entryCardNameP085'],['p','entryCardLabelP085'],['h2','entryCardPlaceTitleP085'],['p','entryCardPlaceP085'],['h2','entryCardWorkTitleP085'],['p','entryCardWorkP085'],['p','entryCardProgressP085']]){const el=document.createElement(tag);el.id=id;panel.appendChild(el);}
   panel.querySelector('#entryCardPlaceTitleP085').textContent='行先';panel.querySelector('#entryCardWorkTitleP085').textContent='作業内容';
   const close=document.createElement('button');close.type='button';close.textContent='読み込み中の画面を表示';close.addEventListener('click',()=>{r.finished=true;hide();});panel.appendChild(close);
   document.getElementById('boardArea').appendChild(overlay);
  }
  for(const [key,id] of [['name','entryCardNameP085'],['label','entryCardLabelP085'],['place','entryCardPlaceP085'],['workContent','entryCardWorkP085']])overlay.querySelector('#'+id).textContent=d.card[key]||'—';
  overlay.querySelector('#entryCardTimeP085').textContent=new Date(d.updated).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+'時点・前回確認した行先';
  overlay.querySelector('#entryCardProgressP085').textContent='最新の行先を確認し、日報・勤怠などの操作画面を準備しています…';
  if(stats.firstCardMs===null)stats.firstCardMs=now();stats.path='firebase';stats.sourceAgeMs=Math.max(0,Date.now()-d.updated);
  clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{r.finished=true;hide();},Math.max(0,Math.min(d.expires-Date.now(),r.previewUntil-performance.now())));
 }
 async function read(r){
  if(!active(r))return;
  const {session}=await sdk();if(!active(r))return;
  const user=session.currentUser;if(!user||!/^p085_[a-f0-9]{64}$/.test(user.uid)){stats.reason='first-connection';hide();return;}
  const token=await user.getIdTokenResult();if(!active(r))return;
  const c=token.claims;if(c.iecP085!==true||c.binding!==r.binding||c.endpointHash!==r.endpointHash||user.uid!=='p085_'+c.sid){stats.reason='binding';hide();return;}
  abort=new AbortController();const controller=abort,timer=setTimeout(()=>controller.abort(),3500);
  try{
   const response=await fetch('https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents/p085Cards/'+user.uid,{headers:{Authorization:'Bearer '+token.token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!active(r))return;if(!response.ok)throw Error('read');
   const data=decode(await response.json(),r,user.uid);if(!active(r)||!data)return;
   const latest=await window.IecDeviceStorageD3.readTicket(r.key,r.current);
   if(!active(r)||await hash(ticketIdentity(latest.ticket))!==r.binding)return;
   paint(data,r);readTimer=setTimeout(()=>read(r).catch(()=>{if(run===r){stats.reason='read';hide();}}),5000);
  }finally{clearTimeout(timer);if(abort===controller)abort=null;}
 }
 function start(key,url,current,view,savedPromise){
  cancel();stats={version:VERSION,path:'normal',firstCardMs:null,normalHomeMs:null,latestCardMs:null,sourceAgeMs:null,prepared:false,reason:''};
  if(view!=='personal'||navigator.onLine===false||document.hidden){stats.reason='skipped';return;}
  const r={key,url,current,epoch,finished:false,previewUntil:performance.now()+20000,binding:'',endpointHash:''};run=r;
  // Nothing in this promise is on the critical path of ordinary iframe startup.
  return Promise.resolve().then(async()=>{
   const saved=await (savedPromise||window.IecDeviceStorageD3.readTicket(key,current));if(!active(r))return;
   [r.binding,r.endpointHash]=await Promise.all([hash(ticketIdentity(saved.ticket)),hash(url)]);
   if(active(r))await read(r);
  }).catch(()=>{if(run===r){stats.reason='unavailable';hide();}});
 }
 function normal(phase){
  if(phase==='home'){if(stats.normalHomeMs===null)stats.normalHomeMs=now();if(run)run.finished=true;hide();}
  if(phase==='card'&&stats.latestCardMs===null)stats.latestCardMs=now();
 }
 async function accept(grant,ticket,url,current){
  const generation=epoch,validContext=current;current=()=>epoch===generation&&validContext();
  if(!current()||document.hidden||!grant||grant.version!=='P085-CARD-1'||grant.ok!==true||!/^p085_[a-f0-9]{64}$/.test(grant.uid||'')||typeof grant.customToken!=='string'||grant.customToken.length>6000)return false;
  const [binding,endpointHash]=await Promise.all([hash(ticketIdentity(ticket)),hash(url)]);
  if(!current()||grant.binding!==binding||grant.endpointHash!==endpointHash)return false;
  const {session,auth}=await sdk();if(!current()||document.hidden)return false;
  const signed=await auth.signInWithCustomToken(session,grant.customToken);
  if(!current()||document.hidden||signed.user.uid!==grant.uid){await auth.signOut(session);return false;}
  stats.prepared=true;return true;
 }
 async function forget(){cancel('removed');try{const {session,auth}=await sdk();await auth.signOut(session);}catch(ignore){}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('background');});
 window.addEventListener('pagehide',()=>cancel('background'));window.addEventListener('offline',()=>cancel('offline'));
 window.addEventListener('storage',e=>{if(!e.key||run&&e.key===run.key)cancel('storage-change');});
 window.IecEntryCardP085=Object.freeze({start,cancel,normal,accept,forget,report:()=>({...stats})});
})();
