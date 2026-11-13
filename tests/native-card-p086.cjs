const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,settle}=require('./helpers/native-fixture.cjs');
const args=['id','user','',false,true],context={id:'id',user:'user',token:''};
const consume=h=>h.w.IecNativeHost.call(h.frame.contentWindow,'getHomeBoard123',args,context);
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('restored startup sends the live card while bootstrap is still pending, consumes once and refreshes normally',async()=>{
 const boot=deferred(),card=deferred(),h=fixture({capability:true,supported:true,bootstrapDelay:boot.promise,cardDelay:card.promise});
 try{h.start();await settle();assert.deepEqual(h.calls.map(c=>c.body.op).sort(),['bootstrap','startupCard']);assert.equal(h.frame.srcdoc,'');
  boot.resolve();await settle();assert(h.frame.srcdoc.includes('REAL_APP'));let complete=false;const result=consume(h).then(r=>{complete=true;return r;});await settle();assert.equal(complete,false);
  card.resolve();assert.equal((await result).data[0].place,'current-place');assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,0);
  await consume(h);assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,1);
  const diag=h.w.IecNativeP086.diagnostics();assert.equal(diag.operationReadyP086.cardRequestP086.state,'complete');assert.equal(diag.operationReadyP086.gasCalls,2);
 }finally{boot.resolve();card.resolve();h.close();}
});
test('first FIX2 launch learns capability then starts a single live read; FIX1 launches stay unchanged',async()=>{
 const h=fixture({supported:true});try{h.start();await settle();assert.deepEqual(h.calls.map(c=>c.body.op),['bootstrap','startupCard']);await consume(h);assert.equal(h.calls.length,2);}finally{h.close();}
});
test('talk and inbox startup do not prefetch unused cards',async()=>{
 for(const view of ['talk','inbox']){const h=fixture({supported:true,capability:true,view});try{h.start();await settle();assert.deepEqual(h.calls.map(c=>c.body.op),['bootstrap']);}finally{h.close();}}
});
test('foreign card args and intervening operations cannot consume an earlier snapshot',async()=>{
 for(const action of ['foreign','write']){const h=fixture({supported:true,capability:true});try{
  h.start();await settle();if(action==='write')await h.w.IecNativeHost.call(h.frame.contentWindow,'submitDailyReport',[],context);
  else await h.w.IecNativeHost.call(h.frame.contentWindow,'getHomeBoard123',['id','other','',false,true],context);
  await consume(h);assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,2);
 }finally{h.close();}}
});
test('saved ticket change while prefetched card is pending invalidates the frame instead of applying it',async()=>{
 const card=deferred(),h=fixture({supported:true,capability:true,cardDelay:card.promise});try{
  h.start();await settle();const pending=consume(h);await settle();h.setTicket('new-ticket');card.resolve();await assert.rejects(pending);await settle();assert.equal(h.counts().signouts,1);assert(!h.frame.srcdoc.includes('REAL_APP'));
 }finally{card.resolve();h.close();}
});
test('read failure does not silently retry, while an unsupported read after rollback safely uses the ordinary route',async()=>{
 for(const code of ['UNAVAILABLE','REQUEST']){const h=fixture({supported:true,capability:true,cardError:code});try{
  h.start();await settle();if(code==='REQUEST'){await consume(h);assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,1);}
  else{await assert.rejects(consume(h));assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,0);}
  assert.equal(h.counts().fallback,0);
 }finally{h.close();}}
});
test('backend rollback discards an early unsupported read and removes only the capability hint',async()=>{
 const h=fixture({capability:true,cardError:'REQUEST'});try{h.start();await settle();await consume(h);assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,1);assert.equal(h.w.localStorage.getItem('iec.entry.card.p086:/iec-board-icon/board-pwa/'),null);}finally{h.close();}
});
test('navigation while a live read is pending cannot restore a private card or invoke a fallback',async()=>{
 const card=deferred(),h=fixture({supported:true,capability:true,cardDelay:card.promise});try{h.start();await settle();const pending=consume(h);await settle();h.w.IecNativeP086.cancel();card.resolve();await assert.rejects(pending);assert.equal(h.counts().fallback,0);}finally{card.resolve();h.close();}
});
test('a card left unused beyond the startup window is discarded and a fresh ordinary read is sent',async()=>{
 const h=fixture({supported:true,capability:true});try{h.start();await settle();h.w.performance.now=()=>10000;await consume(h);
  assert.equal(h.calls.filter(c=>c.body.op==='startupCard').length,1);assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,1);
  assert.equal(h.w.IecNativeP086.diagnostics().operationReadyP086.cardRequestP086.state,'discarded');
 }finally{h.close();}
});
test('initial enrollment completes before any card read, even if a previous capability hint exists',async()=>{
 const h=fixture({supported:true,capability:true});try{h.auth.currentUser=null;h.start();await settle();assert.deepEqual(h.calls.map(c=>c.body.op),['enroll','bootstrap','startupCard']);await consume(h);assert.equal(h.counts().signins,1);}finally{h.close();}
});
