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
