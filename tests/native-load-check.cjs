const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,settle}=require('./helpers/native-fixture.cjs');
async function ready(h){h.start();await settle();h.w.IecNativeHost.mark('latestCardMs');}
test('general rollout starts by default; the explicit local fallback and global rollback still work',async()=>{
 const h=fixture();try{
  h.w.IEC_PWA_CONFIG={nativeP086:true,nativeP086OptIn:true};
  assert.equal(h.w.IecNativeP086.selected(),true);assert.equal(h.start(),true);await settle();
  h.w.IecNativeP086.cancel();h.w.IecNativeP086.choose(false);assert.equal(h.w.IecNativeP086.selected(),false);assert.equal(h.start(),false);
  h.w.IecNativeP086.choose(true);h.w.IEC_PWA_CONFIG={nativeP086:false,nativeP086OptIn:false};assert.equal(h.start(),false);
 }finally{h.close();}
});
test('load check is manual, waits for the current card, and uses exactly one baseline then 15 concurrent own-card reads',async()=>{
 const h=fixture();try{
  await assert.rejects(h.w.IecNativeP086.measureConcurrentReads());assert.equal(h.calls.length,0);
  h.start();await settle();await assert.rejects(h.w.IecNativeP086.measureConcurrentReads());assert.equal(h.calls.length,1);
  h.w.IecNativeHost.mark('latestCardMs');const gasCalls=h.w.IecNativeHost.report().gasCalls;
  const original=h.w.fetch;let reads=0,inflight=0,peak=0,release;
  const barrier=new Promise(r=>release=r);
  h.w.fetch=async(url,options)=>{
   const body=JSON.parse(options.body);assert.equal(body.op,'startupCard');assert.deepEqual(Object.keys(body).sort(),['op','requestId']);
   if(++reads>1){inflight++;peak=Math.max(peak,inflight);if(inflight===15)release();await barrier;inflight--;}
   return original(url,options);
  };
  const running=h.w.IecNativeP086.measureConcurrentReads();await assert.rejects(h.w.IecNativeP086.measureConcurrentReads());
  const report=await running;
  assert.equal(reads,16);assert.equal(peak,15);assert.equal(report.baseline.ok,true);assert.equal(report.concurrent.successful,15);
  assert.equal(new Set(h.calls.filter(x=>x.body.op==='startupCard').map(x=>x.body.requestId)).size,16);
  assert.equal(report.scope,'same-session-own-card-read');assert.equal(h.w.IecNativeHost.report().gasCalls,gasCalls);
  assert.doesNotMatch(JSON.stringify(report),/ID_TOKEN|signed-ticket|current-place|"user"|identity|https:/);
  await assert.rejects(h.w.IecNativeP086.measureConcurrentReads());assert.equal(reads,16);
 }finally{h.close();}
});
test('baseline authorization failure is redacted, invalidates the session, and never launches the batch',async()=>{
 const h=fixture();try{
  await ready(h);h.setFailure('AUTH');const report=await h.w.IecNativeP086.measureConcurrentReads();await settle();
  assert.equal(report.baseline.ok,false);assert.equal(report.baseline.code,'AUTH');assert.equal(report.concurrent,null);
  assert.equal(h.calls.filter(x=>x.body.op==='startupCard').length,1);assert.equal(h.counts().signouts,1);
 }finally{h.close();}
});
test('changing the saved identity stops the load check before any card request',async()=>{
 const h=fixture();try{
  await ready(h);h.setTicket('other-ticket');const report=await h.w.IecNativeP086.measureConcurrentReads();
  assert.equal(report.baseline.code,'RECONNECT');assert.equal(report.concurrent,null);assert.equal(h.calls.filter(x=>x.body.op==='startupCard').length,0);
 }finally{h.close();}
});
test('leaving during the baseline prevents the subsequent batch',async()=>{
 const h=fixture();try{
  await ready(h);let release;h.setDelay(new Promise(r=>release=r));
  const running=h.w.IecNativeP086.measureConcurrentReads();await settle();h.w.IecNativeP086.cancel();release();
  const report=await running;assert.equal(report.baseline.ok,false);assert.equal(report.concurrent,null);
  assert.equal(h.calls.filter(x=>x.body.op==='startupCard').length,1);
 }finally{h.close();}
});
test('load failures are counted without retries or untrusted error text',async()=>{
 const h=fixture();try{
  await ready(h);const original=h.w.fetch;let n=0;
  h.w.fetch=async(...args)=>{n++;if(n>1&&n%2===0)return {ok:false,json:async()=>({ok:false,code:'RATE_LIMIT',message:'PRIVATE_ERROR'})};return original(...args);};
  const report=await h.w.IecNativeP086.measureConcurrentReads();assert.equal(n,16);
  assert.equal(report.concurrent.failed,8);assert.equal(report.concurrent.successful,7);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_ERROR/);
 }finally{h.close();}
});
test('diagnostic button does not measure on open and copies the measurement independently of startup diagnostics',async()=>{
 const {env}=require('./connection-diagnostics.cjs'),e=env();let measured=0;
 const report={version:'P086-CONCURRENT-READ-1',concurrent:{failed:0,requests:15}};
 e.ctx.IecNativeP086={measureConcurrentReads:async()=>{measured++;return report;}};
 e.open();assert.equal(measured,0);await e.click('15件同時の速度を測る');assert.equal(measured,1);
 await e.click('結果をコピー');await e.click('速度確認の結果をコピー');assert.deepEqual(JSON.parse(e.ctx.copied),report);
});
