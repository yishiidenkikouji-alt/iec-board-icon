const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,settle}=require('./helpers/native-fixture.cjs');
const args=['id','user','',false,true],context={id:'id',user:'user',token:''};
const consume=h=>h.w.IecNativeHost.call(h.frame.contentWindow,'getHomeBoard123',args,context);
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('Push status failure before the first card request preserves the ongoing read',async()=>{
 const card=deferred(),h=fixture({capability:true,supported:true,cardDelay:card.promise,rpcErrors:{getWebPushStatus139:'RPC'}});
 try{h.start();await settle();await assert.rejects(h.w.IecNativeHost.call(h.frame.contentWindow,'getWebPushStatus139',[],context));
  const result=consume(h);await settle();card.resolve();assert.equal((await result).data[0].place,'current-place');
  assert.equal(h.calls.filter(c=>c.body.op==='startupCard').length,1);assert.equal(h.calls.filter(c=>c.body.method==='getHomeBoard123').length,0);
  assert.equal(h.w.IecNativeP086.diagnostics().operationReadyP086.cardRequestP086.state,'complete');
 }finally{card.resolve();h.close();}
});
test('a slow bootstrap can claim a still-pending card after the old three-second deadline',async()=>{
 const boot=deferred(),card=deferred(),h=fixture({capability:true,supported:true,bootstrapDelay:boot.promise,cardDelay:card.promise});
 try{h.start();await settle();h.w.performance.now=()=>5000;boot.resolve();await settle();const result=consume(h);await settle();card.resolve();
  assert.equal((await result).data[0].place,'current-place');assert.equal(h.calls.filter(c=>c.body.op==='rpc').length,0);
 }finally{boot.resolve();card.resolve();h.close();}
});
test('background read after a response arrives does not discard the fresh card',async()=>{
 const h=fixture({capability:true,supported:true});try{h.start();await settle();
  await h.w.IecNativeHost.call(h.frame.contentWindow,'getHomeQuickData140',[],context);
  assert.equal((await consume(h)).data[0].place,'current-place');assert.equal(h.calls.filter(c=>c.body.method==='getHomeBoard123').length,0);
 }finally{h.close();}
});
test('a write after the card has been claimed prevents that earlier response from being reused',async()=>{
 const card=deferred(),h=fixture({capability:true,supported:true,cardDelay:card.promise});try{
  h.start();await settle();const pending=consume(h);await settle();await h.w.IecNativeHost.call(h.frame.contentWindow,'submitDailyReport',[],context);
  card.resolve();assert.equal((await pending).saved,true);assert.equal(h.calls.filter(c=>c.body.method==='getHomeBoard123').length,1);
  const d=h.w.IecNativeP086.diagnostics().operationReadyP086.cardRequestP086;
  assert.equal(d.discardReason,'other-operation');assert.equal(d.discardMethod,'submitDailyReport');
 }finally{card.resolve();h.close();}
});
test('unknown reads remain conservative, and expired responses report an explicit reason',async()=>{
 for(const scenario of ['unknown','expired']){const h=fixture({capability:true,supported:true});try{
  h.start();await settle();if(scenario==='unknown')await h.w.IecNativeHost.call(h.frame.contentWindow,'getUnknown',[],context);else h.w.performance.now=()=>10000;
  await consume(h);const d=h.w.IecNativeP086.diagnostics().operationReadyP086.cardRequestP086;
  assert.equal(d.state,'discarded');assert.equal(d.discardReason,scenario==='unknown'?'other-operation':'result-expired');
 }finally{h.close();}}
});
test('only known timing numbers and discard codes appear in the diagnostic report',async()=>{
 const h=fixture({capability:true,supported:true});try{h.start();await settle();
  h.frame.contentWindow.IecNativeReportP086=()=>({revision:'P086-FIX-3',cardTransport:{version:'P086-READ-4',upstreamPostMs:1234,upstreamRedirectMs:321,gasBeforeDispatchMs:7,gasRequestMs:1500,url:'SECRET',ticket:'SECRET'}});
  const d=h.w.IecNativeP086.diagnostics();assert.equal(d.operationReadyP086.revision,'P086-FIX-3');assert.equal(d.operationReadyP086.cardTransport.upstreamPostMs,1234);assert(!JSON.stringify(d).includes('SECRET'));
 }finally{h.close();}
});
