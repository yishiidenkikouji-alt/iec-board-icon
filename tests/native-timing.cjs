const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,settle}=require('./helpers/native-fixture.cjs');
test('client stages and server durations are bounded; resource timing exports no URLs, tokens or arbitrary fields',async()=>{
 const h=fixture();try{
  h.start();await settle();h.w.IecNativeHost.mark('latestCardMs');
  const base=h.w.fetch,entries=[];
  h.w.performance.getEntriesByType=()=>entries;
  h.w.fetch=async(url,options)=>{
   assert.equal(url,'https://asia-northeast1-ishii-board-trial-p003.cloudfunctions.net/businessAppP086?p086_load_check=1');
   const start=h.w.performance.now();
   const r=await base(url,options);r.headers={get:()=> 'app;dur=24,encode;dur=2,private;desc="PRIVATE_TEXT"'};
   entries.push({name:url,initiatorType:'fetch',startTime:start,fetchStart:start,duration:45,requestStart:start+10,responseStart:start+40,responseEnd:start+45,domainLookupStart:start,domainLookupEnd:start+2,connectStart:start+2,connectEnd:start+5,secureConnectionStart:start+3,nextHopProtocol:'h2',private:'SECRET'});
   entries.push({name:'https://example.com/SECRET',initiatorType:'fetch',startTime:start});return r;
  };
  const report=await h.w.IecNativeP086.measureConcurrentReads();
  assert.equal(report.version,'P086-CONCURRENT-READ-3');assert.equal(report.baseline.client.handlerMs,24);assert.equal(report.baseline.client.encodeMs,2);
  assert.equal(report.concurrent.browserResources.rows.length,15);assert.equal(report.baseline.browserResources.length,1);
  assert(report.concurrent.browserResources.rows.map(row=>Object.fromEntries(report.concurrent.browserResources.columns.map((k,i)=>[k,row[i]]))).every(x=>x.protocol==='h2'&&x.preRequestMs===10&&x.waitResponseMs===30));
  assert.doesNotMatch(JSON.stringify(report),/SECRET|PRIVATE|https:|ID_TOKEN|current-place/);
  assert.equal(report.concurrent.samples.rows.length,15);assert.equal(report.concurrent.resourceRowsNotCorrelated,true);
  const columns=report.concurrent.samples.columns;assert(columns.includes('transport.gasLockWaitMs'));
  assert(report.concurrent.samples.rows.every(row=>row.length===columns.length&&row[columns.indexOf('transport.gasLockWaitMs')]===null));
  const worst=JSON.parse(JSON.stringify(report));worst.concurrent.samples.rows=worst.concurrent.samples.rows.map(row=>row.map((v,i)=>i<3?v:75000));
  assert(Buffer.byteLength(JSON.stringify(worst))<10000,'full 15-request export must fit the observed clipboard limit');
 }finally{h.close();}
});
test('a browser without timing permission is reported as unavailable rather than zero waiting',async()=>{
 const h=fixture();try{
  h.start();await settle();h.w.IecNativeHost.mark('latestCardMs');const base=h.w.fetch,entries=[];
  h.w.performance.getEntriesByType=()=>entries;
  h.w.fetch=async(url,options)=>{entries.push({name:url,initiatorType:'fetch',startTime:h.w.performance.now(),duration:100,requestStart:0,responseStart:0,responseEnd:0,nextHopProtocol:'PRIVATE_PROTOCOL'});return base(url,options);};
  const report=await h.w.IecNativeP086.measureConcurrentReads();
  assert.equal(report.baseline.client.handlerMs,null);assert(report.concurrent.browserResources.rows.map(row=>Object.fromEntries(report.concurrent.browserResources.columns.map((k,i)=>[k,row[i]]))).every(x=>!x.timingAvailable&&x.preRequestMs===null&&x.protocol==='unknown'));
 }finally{h.close();}
});
