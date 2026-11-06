const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const dir=__dirname+'/../board-pwa/',ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
const channel='a'.repeat(32),page='b'.repeat(32),tick=()=>new Promise(resolve=>setImmediate(resolve));
function workerEnv(saved=new Map(),options={}){
 const handlers={},badges=[],shown=[],closed=[],rechecks=[];
 const notifications=[{tag:'iec-push139-update'},{tag:'iec-push139-test'},{tag:'iec-push139-settings'},{tag:'iec-board-badge:/iec-board-icon/board-pwa/:snapshot'},{tag:'unrelated'}];
 notifications.forEach(n=>n.close=()=>{closed.push(n.tag);notifications.splice(notifications.indexOf(n),1);});
 const indexedDB={open(){
  const request={};setImmediate(()=>{
   if(options.readFail){request.error=Error('storage');request.onerror();return;}
   request.result={close(){},transaction(name,mode){
    const tx={objectStore(){return {
     get(key){const r={};setImmediate(()=>{r.result=structuredClone(saved.get(key));r.onsuccess();tx.oncomplete();});return r;},
     put(value,key){if(options.writeFail){setImmediate(()=>{tx.error=Error('storage');tx.onerror();});return;}saved.set(key,structuredClone(value));setImmediate(()=>tx.oncomplete());}
    };}};return tx;
   }};request.onsuccess();
  });return request;
 }};
 const self={location:new URL(ROOT+'sw.js'),clients:{matchAll:async()=>[{url:ROOT,visibilityState:'visible',postMessage:data=>rechecks.push(data)},{url:ROOT,visibilityState:'hidden',postMessage(){throw Error('hidden');}}]},navigator:{setAppBadge:async n=>badges.push(n),clearAppBadge:async()=>badges.push(0)},registration:{
  getNotifications:async()=>notifications.slice(),showNotification:async(title,options)=>shown.push({title,...options})
 },addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(fs.readFileSync(dir+'sw.js','utf8'),{self,indexedDB,URL,console,Date,Promise});
 async function message(data,url=ROOT){let task,reply;handlers.message({data,source:{url},ports:[{postMessage:v=>reply=v}],waitUntil:p=>task=p});await task;return reply;}
 async function push(data){let task;handlers.push({data:{json:()=>data},waitUntil:p=>task=p});await task;}
 return {message,push,badges,shown,closed,saved,notifications,rechecks};
}
function appEnv(){
 const events={},elements={},posts=[],timers=new Map();let timerId=0,readyResolve;
 const frame=elements.boardFrame={hidden:true,contentWindow:{postMessage(data){posts.push(data);}}};
 const registration={scope:ROOT,active:{postMessage(data,ports){messages.push(data);queueMicrotask(()=>ports[0].reply({ok:true}));}}},messages=[];
 const serviceWorker={ready:new Promise(resolve=>readyResolve=resolve),register:async()=>registration,addEventListener:(name,fn)=>events['sw:'+name]=fn};
 class MessageChannel{
  constructor(){this.port1={close(){}};this.port2={reply:data=>this.port1.onmessage({data})};}
 }
 const ctx={URL,URLSearchParams,crypto:webcrypto,Uint32Array,MessageChannel,console,queueMicrotask,
  document:{hidden:false,getElementById(id){return elements[id]??(elements[id]={hidden:true});},addEventListener(name,fn){events['doc:'+name]=fn;}},
  navigator:{userAgent:'Android',serviceWorker},Notification:{permission:'granted',requestPermission:async()=> 'granted'},
  matchMedia:()=>({matches:true}),location:new URL(ROOT),history:{replaceState(){}},localStorage:{getItem:()=>null},
  setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);},setInterval(){},
  isSecureContext:true,Event:class{constructor(type){this.type=type;}},
  addEventListener(name,fn){(events[name]??=[]).push(fn);},dispatchEvent(e){for(const fn of events[e.type]||[])fn(e);}
 };
 ctx.window=ctx;ctx.top=ctx;frame.contentWindow.parent=ctx;
 vm.runInNewContext(fs.readFileSync(dir+'app.js','utf8'),ctx);
 function receive(data,origin='https://script.google.com',source=frame.contentWindow){for(const fn of events.message||[])fn({data:{app:'iec-board-badge',protocol:1,pageId:page,...data},origin,source});}
 receive({type:'hello'});const session=posts.at(-1).session;let sequence=0;
 function state(total,extras={}){receive({type:'state',session,sequence:++sequence,status:'ready',count:total,unread:total,actions:0,updatedAt:Date.now(),...extras});}
 return {ctx,state,receive,session,messages,posts,events,registration,timers,ready:()=>readyResolve(registration)};
}
(async()=>{
 // Android Web Push has the foreground notification trial disabled by default.
 // A validated zero must still reach the worker; startup/unknown counts must not.
 let a=appEnv();a.ready();await tick();assert.equal(a.messages.length,0);
 a.state(0);await tick();assert.equal(a.messages.at(-1).total,0);
 const sent=a.messages.length;a.state(0,{status:'unavailable'});await tick();assert.equal(a.messages.length,sent);
 a.state(1,{unread:null,actions:null});await tick();assert.equal(a.messages.length,sent);
 a.receive({type:'state',session:a.session,sequence:100,status:'ready',count:0,unread:0,actions:0,updatedAt:Date.now()},'https://evil.example');await tick();assert.equal(a.messages.length,sent);
 a.ctx.document.hidden=true;a.state(0);await tick();assert.equal(a.messages.length,sent);a.ctx.document.hidden=false;
 // Resuming must ask GAS to publish current counters, even outside the inbox.
 a.events['doc:visibilitychange']();assert.ok(a.posts.some(p=>p.type==='status-request'));
 a.state(0);await tick();assert.equal(a.messages.at(-1).total,0);
 const confirmed=a.messages.length;
 a.state(0,{complete:false});await tick();assert.equal(a.messages.length,confirmed);
 a.state(0,{previous:true});await tick();assert.equal(a.messages.length,confirmed);
 a.state(0,{unread:1,actions:0});await tick();assert.equal(a.messages.length,confirmed);
 a.state(0,{unread:undefined,actions:undefined});await tick();assert.equal(a.messages.at(-1).total,0);
 a.events['sw:message']({source:{scriptURL:ROOT+'sw.js'},data:{type:'badge-recheckB2',sequence:9}});await tick();assert.equal(a.messages.at(-1).expectedSequence,9);
 // Coalesce changes while the worker is still starting; never replay the old 1.
 a=appEnv();a.state(1);a.state(0);a.ready();await tick();await tick();assert.deepEqual(a.messages.map(m=>m.total),[0]);
 // A replaced worker receives the current verified value without a reload.
 a.events['sw:controllerchange']();await tick();assert.equal(a.messages.at(-1).total,0);
 // Failed/old workers are retried, without a server polling loop.
 a.registration.active.postMessage=()=>{};a.state(0);await tick();
 const timeout=[...a.timers.values()].find(t=>t.ms===6000);assert.ok(timeout);timeout.fn();await tick();
 const retry=[...a.timers.values()].find(t=>t.ms===3000);assert.ok(retry);
 a.registration.active.postMessage=(data,ports)=>{a.messages.push(data);queueMicrotask(()=>ports[0].reply({ok:true}));};retry.fn();await tick();assert.equal(a.messages.at(-1).total,0);
 // Worker tests exercise durable state and real message/push event handlers.
 let w=workerEnv();assert.equal((await w.message({type:'push-channel139',channel})).ok,true);
 const now=Date.now(),snapshot={type:'badge-stateB1',unread:0,actions:0,total:0,at:now};
 assert.equal((await w.message(snapshot,'https://evil.example/')).ok,false);assert.equal(w.badges.length,0);
 for(const bad of [{total:-1},{unread:1},{at:now-11*60000},{at:now+61000}])assert.equal((await w.message({...snapshot,...bad})).ok,false);
 assert.equal((await w.message(snapshot)).ok,true);assert.equal(w.badges.at(-1),0);
 assert.deepEqual(w.closed.sort(),['iec-push139-update','iec-push139-test','iec-push139-settings','iec-board-badge:/iec-board-icon/board-pwa/:snapshot'].sort());
 assert.deepEqual(w.notifications.map(n=>n.tag),['unrelated']);
 for(const options of [{readFail:true},{writeFail:true}]){
  const broken=workerEnv(new Map(w.saved),options),reply=await broken.message(snapshot);
  assert.equal(reply.ok,true);assert.equal(reply.persisted,false);assert.equal(broken.badges.at(-1),0);
  assert.deepEqual(broken.notifications.map(n=>n.tag),['unrelated']);
  assert.equal(broken.saved.get('/iec-board-icon/board-pwa/').channel,channel);
 }
 const pending=workerEnv();await pending.message({...snapshot,total:1,unread:1});assert.equal(pending.closed.length,0);
 // Restarting the worker preserves the foreground checkpoint. A delayed 1 and
 // its duplicate must not restore the numeric badge; every push stays visible.
 w=workerEnv(w.saved);const push={v:139,channel,sequence:1,unread:1,actions:0,total:1,at:now-1000};
 await w.push(push);assert.equal(w.badges.at(-1),0);assert.match(w.shown.at(-1).body,/未読0件/);assert.equal(w.shown.at(-1).silent,true);
 assert.equal(w.rechecks.at(-1).sequence,1);
 await w.push(push);assert.equal(w.badges.at(-1),0);assert.equal(w.shown.length,2);
 // Newer messages still notify and increment, including their original route.
 await w.push({...push,sequence:2,at:now+1,routeP015:{view:'talk',room:'company'}});assert.equal(w.badges.at(-1),1);assert.equal(w.shown.at(-1).data.routeP015.room,'company');
 assert.equal((await w.message({...snapshot,at:now+10,expectedSequence:1})).ignored,true);assert.equal(w.badges.at(-1),1);
 await w.message(snapshot);assert.equal(w.badges.at(-1),1); // older tab rejected
 await w.message({...snapshot,at:now+2});assert.equal(w.badges.at(-1),0);
 await w.push({...push,sequence:3,test:true,at:now+3});assert.equal(w.badges.at(-1),0);assert.match(w.shown.at(-1).title,/通知テスト/);
 // Channel changes isolate the next user's count history.
 await w.message({type:'push-channel139',channel:'c'.repeat(32)});
 assert.equal(w.saved.get('/iec-board-icon/board-pwa/').totals,null);
 console.log('PASS: Android actual zero with trial disabled; unknown/hidden/untrusted values; startup coalescing; worker replacement/retry; notification cleanup scope; durable stale/duplicate push ordering; fresh push routing; test/channel isolation.');
})().catch(error=>{console.error(error);process.exit(1);});
