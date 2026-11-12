const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {env,url,key,ticket,revision,stored,tick,ROOT}=require('./connection-diagnostics.cjs');
const cap='iec.entry.post.p082:'+key;
async function settle(){for(let i=0;i<12;i++)await tick();}
function make(options={}){
 const map=new Map([[key,stored],...(options.cap===false?[]:[[cap,'P082-POST-1']])]);const e=env(map);let clock=100,id=0;const forms=[],timers=new Map();
 e.ctx.performance={now:()=>clock};e.at=v=>clock=v;e.ctx.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};e.ctx.clearTimeout=i=>timers.delete(i);
 const create=e.ctx.document.createElement,parentForms=[];
 const childDocument={URL:options.childUrl||'about:blank',body:create('body'),defaultView:e.frame.contentWindow};
 function createOwned(tag,owner){const el=create(tag);el.ownerDocument=owner;el.remove=()=>{if(el.parentNode)el.parentNode.children=el.parentNode.children.filter(x=>x!==el);el.isConnected=false;};if(tag==='form')el.submit=()=>{if(owner===e.ctx.document)parentForms.push(el);if(options.submitFail)throw Error('blocked');forms.push({action:el.action,target:el.target,method:el.method,owner,fields:Object.fromEntries(el.children.map(i=>[i.name,i.value]))});};return el;}
 e.ctx.document.createElement=tag=>createOwned(tag,e.ctx.document);childDocument.createElement=tag=>createOwned(tag,childDocument);e.frame.contentDocument=options.noDocument?null:childDocument;e.childDocument=childDocument;e.parentForms=parentForms;
 e.ctx.IecEntryStartViewP082=()=>options.view||'personal';e.run('entry-session.js');e.forms=forms;e.timers=timers;e.ready=()=>({app:'iec-device-resume-v1',type:'hello',nonce:new URL(e.frame.src).searchParams.get('iec_resume_nonce'),page:'d'.repeat(32),startupP082:'P082-POST-1'});return e;
}
test('capable startup submits from the iframe document to _self, without named-target popup or parent form',async()=>{
 const e=make();e.frame.src=url;await settle();assert.equal(e.forms.length,1);const f=e.forms[0];assert.equal(f.action,url);assert.equal(f.method,'POST');assert.equal(f.target,'_self');assert.equal(f.owner,e.childDocument);assert.equal(e.parentForms.length,0);assert.equal(e.childDocument.body.children.length,0);assert.equal(f.fields.ticket,ticket);assert.equal(f.fields.revision,revision);assert.equal(f.fields.p082,'startup-v1');assert.equal(f.fields.view,'personal');assert(/^[a-f0-9]{64}$/.test(f.fields.nonce));assert(!e.frame.src.includes(ticket));assert(!e.ctx.document.body.children.some(x=>x.tagName==='form'));assert(!e.writes.some(k=>k===key));
 e.at(5100);await e.message(e.ready());await settle();assert.equal(e.replies.at(-1).d.postP082.waitMs,5000);assert.equal(e.replies.at(-1).d.postP082.submitted,true);assert.equal(e.replies.at(-1).d.ticket,ticket);assert(![...e.timers.values()].some(x=>x.ms===25000));

});
test('old entry, missing ticket, special URLs and hidden startup use normal GET',async()=>{
 for(const mode of ['old','empty','special','hidden']){const e=make({cap:mode!=='old'});if(mode==='empty')e.map.delete(key);if(mode==='hidden')e.ctx.document.hidden=true;e.frame.src=mode==='special'?url+'?mode=signage':url;await settle();assert.equal(e.forms.length,0);assert.equal(new URL(e.frame.src).origin,'https://script.google.com');}
});
test('capability learned only from nonce/origin/source checked hello; old server clears it',async()=>{
 const e=make({cap:false});e.frame.src=url;await settle();const m=e.ready();await e.message(m,'https://evil.invalid');await e.message({...m,nonce:'0'.repeat(64)});await e.message(m,'https://script.google.com',{});assert(!e.map.has(cap));await e.message(m);await settle();assert.equal(e.map.get(cap),'P082-POST-1');e.frame.src=url;await settle();assert.equal(e.forms.length,1);await e.message({...e.ready(),startupP082:''});await settle();assert(!e.map.has(cap));
});
test('notification startup passes only a fixed optimization view, never user or privilege information',async()=>{
 for(const view of ['talk','inbox','malicious-admin']){const e=make({view});e.frame.src=url;await settle();assert.equal(e.forms[0].fields.view,view==='malicious-admin'?'personal':view);assert.deepEqual(Object.keys(e.forms[0].fields).sort(),['label','nonce','p082','revision','ticket','view']);}
});
test('blocked submit and bounded timeout return to GET without deleting saved registration or retrying POST',async()=>{
 const e=make({submitFail:true});e.frame.src=url;await settle();assert.equal(e.forms.length,0);assert.equal(new URL(e.frame.src).origin,'https://script.google.com');assert.equal(e.map.get(key),stored);assert(!e.ctx.document.body.children.some(x=>x.tagName==='form'));
 const j=make();j.frame.src=url;await settle();const old=j.ready(),timer=[...j.timers.values()].find(x=>x.ms===25000);assert(timer);timer.fn();await settle();assert.equal(j.forms.length,1);assert.notEqual(j.ready().nonce,old.nonce);assert(!j.map.has(cap));assert.equal(j.map.get(key),stored);await j.message(old);await settle();assert.equal(j.replies.length,0);
});
test('changed or removed ticket before hello reaches child as current revision, never the submitted stale snapshot',async()=>{
 const e=make();e.frame.src=url;await settle();e.map.set(key,JSON.stringify({v:1,revision:'e'.repeat(64),ticket:'',removed:true}));await e.message(e.ready());await settle();assert.equal(e.replies.at(-1).d.ticket,'');assert.equal(e.replies.at(-1).d.revision,'e'.repeat(64));
});
test('navigation during storage read cannot send a ticket to a changed endpoint',async()=>{
 const e=make();let resolve;const original=e.ctx.IecDeviceStorageD3;e.ctx.IecDeviceStorageD3={...original,readTicket:()=>new Promise(r=>resolve=r)};e.frame.src=url;e.frame.src=url.replace('AKfycby','AKfycba');resolve({ticket,revision});await settle();assert.equal(e.forms.length,0);assert(!e.frame.src.includes(ticket));
});
test('parent timing receipts are numeric and bound to the current sequence/source, including background classification',async()=>{
 const e=make();e.frame.src=url;await settle();e.ctx.document.hidden=true;for(const fn of e.events['document:visibilitychange'])fn();e.ctx.document.hidden=false;const m=e.ready();await e.message(m);await settle();assert.equal(e.replies.at(-1).d.postP082.background,true);
 e.at(5200);await e.message({...m,type:'performanceP082',phase:'home',seq:1});assert.equal(e.replies.at(-1).d.entryMs,5200);e.at(5300);await e.message({...m,type:'performanceP082',phase:'home',seq:2});assert.equal(e.replies.at(-1).d.entryMs,5200);await e.message({...m,type:'performanceP082',phase:ticket,seq:3});const report=e.ctx.IecEntryPostP082.report();assert.equal(report.homeMs,5200);assert(!JSON.stringify(report).includes(ticket));
 const text=e.open();assert(text.includes('画面と本人確認を一括取得'));assert(text.includes('管理者提示のURLと一致'));await e.click('結果をコピー');for(const privateValue of [ticket,revision,url,m.nonce,m.page])assert(!e.ctx.copied.includes(privateValue));
});
test('old trial code and navigation are removed; existing bookmarks redirect only to normal entry',()=>{
 const dir=__dirname+'/../board-pwa/',html=fs.readFileSync(dir+'index.html','utf8');assert(!html.includes('startupTrialP076'));assert(!fs.readdirSync(dir).some(n=>/^startup-.*\.(js|css)$/.test(n)));for(const name of ['startup-trial.html','startup-direct.html','startup-firebase.html','startup-refresh.html','startup-card.html','startup-sync.html']){const s=fs.readFileSync(dir+name,'utf8');assert(s.includes('content="0;url=./"'));assert(!s.includes('<script'));assert(!s.includes('ticket'));}
});

test('unavailable or already navigated iframe uses GET immediately without a parent form or a popup',async()=>{
 for(const options of [{noDocument:true},{childUrl:'https://script.google.com/old'}]){const e=make(options);e.frame.src=url;await settle();assert.equal(e.forms.length,0);assert.equal(e.parentForms.length,0);assert.equal(e.map.get(key),stored);assert.equal(new URL(e.frame.src).origin,'https://script.google.com');assert.equal(e.ctx.IecEntryPostP082.report().path,'fallback');assert(![...e.timers.values()].some(x=>x.ms===25000));}
 const e=make();Object.defineProperty(e.frame,'contentDocument',{get(){throw Error('cross-origin')}});e.frame.src=url;await settle();assert.equal(e.forms.length,0);assert.equal(e.parentForms.length,0);assert.equal(e.map.get(key),stored);assert.equal(e.ctx.IecEntryPostP082.report().path,'fallback');
});
test('a missing body or different content window cannot receive the transient credential form',async()=>{
 for(const change of [e=>e.childDocument.body=null,e=>e.childDocument.defaultView={}]){const e=make();change(e);e.frame.src=url;await settle();assert.equal(e.forms.length,0);assert.equal(e.parentForms.length,0);assert.equal(e.ctx.IecEntryPostP082.report().path,'fallback');assert.equal(e.map.get(key),stored);}
});

test('P83 delivery capability is learned only from the configured nonce-bound hello',async()=>{
 const e=make(),delivery='iec.entry.delivery.p083:'+key;e.frame.src=url;await settle();const d={...e.ready(),deliveryP083:'P083-DELIVERY-1'};
 for(const [msg,origin,source] of [[d,'https://evil.invalid',undefined],[{...d,nonce:'0'.repeat(64)},'https://script.google.com',undefined],[d,'https://script.google.com',{}]])await e.message(msg,origin,source);
 assert(!e.map.has(delivery));await e.message(d);await settle();assert.equal(e.map.get(delivery),'P083-DELIVERY-1');
 e.frame.src=url;await settle();assert.equal(e.forms.at(-1).fields.delivery,'P083');assert.equal(new URL(e.frame.src).searchParams.get('iec_delivery'),'P083');assert(!e.frame.src.includes(ticket));await e.message(e.ready());await settle();assert(!e.map.has(delivery));
});
test('P83 external failure falls back once inside the same iframe and preserves registration',async()=>{
 const e=make();e.map.set('iec.entry.delivery.p083:'+key,'P083-DELIVERY-1');e.frame.src=url;await settle();const before=e.ready(),d={app:'iec-delivery-p083',version:'P083-DELIVERY-1',type:'fallback',nonce:before.nonce,url:'https://evil.invalid'};
 await e.message(d,'https://evil.invalid');await e.message({...d,nonce:'0'.repeat(64)});await e.message(d,'https://script.google.com',{});assert.equal(e.ready().nonce,before.nonce);
 await e.message(d);await settle();assert.equal(new URL(e.frame.src).searchParams.get('iec_delivery'),'inline');assert.equal(new URL(e.frame.src).origin,'https://script.google.com');assert.equal(e.forms.length,1);assert.equal(e.map.get(key),stored);assert.equal(e.parentForms.length,0);
 const current=e.ready().nonce;await e.message({...d,nonce:current});await settle();assert.equal(e.ready().nonce,current);await e.message(before);await settle();assert.equal(e.replies.length,0);
});
test('P83 timeout and already-navigated iframe remain on the bounded GET fallback',async()=>{
 const e=make();e.map.set('iec.entry.delivery.p083:'+key,'P083-DELIVERY-1');e.frame.src=url;await settle();[...e.timers.values()].find(x=>x.ms===25000).fn();await settle();assert.equal(new URL(e.frame.src).searchParams.get('iec_delivery'),'inline');assert.equal(e.forms.length,1);assert.equal(e.map.get(key),stored);
});
test('P83 fallback remains available if capability storage is lost during the request',async()=>{
 const e=make();const k='iec.entry.delivery.p083:'+key;e.map.set(k,'P083-DELIVERY-1');e.frame.src=url;await settle();e.map.delete(k);await e.message({app:'iec-delivery-p083',version:'P083-DELIVERY-1',type:'fallback',nonce:e.ready().nonce});await settle();assert.equal(new URL(e.frame.src).searchParams.get('iec_delivery'),'inline');assert.equal(e.map.get(key),stored);
});
test('P83 preloads four fixed integrity-pinned public programs, without executing code in the entry',async()=>{
 const e=make();e.ctx.document.head=e.ctx.document.createElement('head');e.map.set('iec.entry.delivery.p083:'+key,'P083-DELIVERY-1');e.frame.src=url;await settle();const links=e.ctx.document.head.children;assert.equal(links.length,4);assert.equal(new Set(links.map(x=>x.href)).size,4);
 for(const l of links){assert.equal(l.tagName,'link');assert.equal(l.rel,'preload');assert.equal(l.as,'script');assert.equal(l.crossOrigin,'anonymous');assert.equal(l.referrerPolicy,'no-referrer');assert(/^sha384-/.test(l.integrity));assert.equal(new URL(l.href).origin,'https://ishii-board-p003-startup-p076.web.app');assert(!l.href.includes(ticket));}
 e.frame.src=url;await settle();assert.equal(links.length,4);
});

test('delivery diagnosis distinguishes request, validated capability, and fallback without exposing saved credentials',async()=>{
 const e=make();assert.equal(e.ctx.IecEntryDeliveryP083.report().request,'not-started');
 e.frame.src=url;await settle();assert.equal(e.ctx.IecEntryDeliveryP083.report().request,'inline');
 const hello={...e.ready(),deliveryP083:'P083-DELIVERY-1'};
 await e.message(hello,'https://evil.invalid');assert.equal(e.ctx.IecEntryDeliveryP083.report().advertised,null);
 await e.message(hello);await settle();assert.equal(e.ctx.IecEntryDeliveryP083.report().advertised,true);
 assert.match(e.open(),/分割配信の要求：なし/);assert.match(e.text(),/GASからの分割配信対応通知：対応/);
 e.frame.src=url;await settle();assert.equal(e.ctx.IecEntryDeliveryP083.report().request,'assets');
 assert.equal(e.forms.at(-1).fields.delivery,'P083');assert.match(e.open(),/分割配信の要求：あり/);
 assert.match(e.text(),/GASからの分割配信対応通知：未受信/);
 await e.message({app:'iec-delivery-p083',version:'P083-DELIVERY-1',type:'fallback',nonce:e.ready().nonce});await settle();
 const r=e.ctx.IecEntryDeliveryP083.report();assert.equal(r.request,'inline');assert.equal(r.fallback,'resource');
 assert.match(e.open(),/従来配信への切替：ファイル読み込み失敗/);await e.click('結果をコピー');
 for(const secret of [url,ticket,revision,e.ready().nonce,hello.page]){assert(!JSON.stringify(r).includes(secret));assert(!e.ctx.copied.includes(secret));}
 const timed=make();timed.map.set('iec.entry.delivery.p083:'+key,'P083-DELIVERY-1');timed.frame.src=url;await settle();
 [...timed.timers.values()].find(t=>t.ms===25000).fn();await settle();
 assert.equal(timed.ctx.IecEntryDeliveryP083.report().fallback,'timeout');assert.match(timed.open(),/従来配信への切替：応答待ち上限/);
});


test('P085 preparations are bound to the existing configured frame, nonce, generation and request page',async()=>{
 const e=make(),accepted=[];e.ctx.IecEntryCardP085={start(){},cancel(){},normal(){},report:()=>({version:'P085-ENTRY-1',path:'normal'}),accept:async(...args)=>accepted.push(args),forget:async()=>{}};
 e.frame.src=url;await settle();await e.message(e.ready());await settle();
 const hello={app:'iec-entry-card-p085',type:'hello',nonce:e.ready().nonce,page:'f'.repeat(32)};
 for(const [data,origin,source] of [[hello,'https://evil.invalid',undefined],[{...hello,nonce:'0'.repeat(64)},'https://script.google.com',undefined],[hello,'https://script.google.com',{}]])await e.message(data,origin,source);
 await settle();assert(!e.replies.some(r=>r.d.type==='prepare'));
 await e.message(hello);await settle();const prepared=e.replies.filter(r=>r.d.type==='prepare');assert.equal(prepared.length,1);assert.equal(prepared[0].d.ticket,ticket);
 await e.message(hello);await settle();assert.equal(e.replies.filter(r=>r.d.type==='prepare').length,1);
 await e.message({...hello,type:'grant',page:'a'.repeat(32),result:{}});await settle();assert.equal(accepted.length,0);
 await e.message({...hello,type:'grant',result:{ok:true}});await settle();assert.equal(accepted.length,1);assert.equal(accepted[0][1],ticket);assert.equal(accepted[0][2],url);
 e.frame.src=url;await settle();await e.message({...hello,type:'grant',result:{ok:true}});await settle();assert.equal(accepted.length,1);
});
test('P085 preparation is not started from unrelated/nested iframe messages or background app',async()=>{
 const e=make();e.ctx.IecEntryCardP085={start(){},cancel(){},report:()=>({}),accept:()=>{throw Error('must not sign in')}};e.frame.src=url;await settle();await e.message(e.ready());await settle();e.ctx.document.hidden=true;
 await e.message({app:'iec-entry-card-p085',type:'hello',nonce:e.ready().nonce,page:'f'.repeat(32)});await settle();assert(!e.replies.some(r=>r.d.type==='prepare'));
});
