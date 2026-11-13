const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,settle}=require('./helpers/native-fixture.cjs');
test('disabled native path does no SDK/network work',async()=>{const h=fixture();try{h.w.IEC_PWA_CONFIG.nativeP086=false;assert.equal(h.start(),false);await settle();assert.equal(h.calls.length,0);}finally{h.close();}});
test('invitation mode performs no native work until this device opts in',async()=>{const h=fixture();try{h.w.IEC_PWA_CONFIG={nativeP086:false,nativeP086OptIn:true};assert.equal(h.start(),false);assert.equal(h.w.IecNativeP086.selected(),false);await settle();assert.equal(h.calls.length,0);assert.equal(h.counts().signins,0);}finally{h.close();}});
test('device choice takes effect on next launch and does not clear tickets or start a request itself',async()=>{const h=fixture();try{h.w.IEC_PWA_CONFIG={nativeP086:false,nativeP086OptIn:true};h.w.localStorage.setItem('saved-existing-ticket','keep');h.w.IecNativeP086.choose(true);await settle();assert.equal(h.calls.length,0);assert.equal(h.w.localStorage.getItem('saved-existing-ticket'),'keep');assert.equal(h.start(),true);await settle();assert.deepEqual(h.calls.map(x=>x.body.op),['bootstrap']);h.w.IecNativeP086.cancel();h.w.IecNativeP086.choose(false);assert.equal(h.start(),false);assert.equal(h.w.localStorage.getItem('saved-existing-ticket'),'keep');}finally{h.close();}});
test('remote rollback overrides a saved device choice',async()=>{const h=fixture();try{h.w.IecNativeP086.choose(true);h.w.IEC_PWA_CONFIG={nativeP086:false,nativeP086OptIn:false};assert.equal(h.start(),false);await settle();assert.equal(h.calls.length,0);}finally{h.close();}});
test('restored native login fetches authorized private UI once; no preview or enrollment request',async()=>{const h=fixture();try{assert(h.start());await settle();assert.deepEqual(h.calls.map(x=>x.body.op),['bootstrap']);assert(h.frame.srcdoc.includes('REAL_APP'));assert.equal(h.calls[0].options.headers.Authorization,'Bearer ID_TOKEN');assert.equal(h.calls[0].options.cache,'no-store');assert.equal(h.counts().fallback,0);}finally{h.close();}});
test('first connection enrolls through signed ticket then uses a separate native login',async()=>{const h=fixture();try{h.auth.currentUser=null;h.start();await settle();assert.deepEqual(h.calls.map(x=>x.body.op),['enroll','bootstrap']);assert.equal(h.counts().signins,1);}finally{h.close();}});
test('failed initial bootstrap returns to the ordinary app once',async()=>{const h=fixture();try{h.setFailure('UNAVAILABLE');h.start();await settle();assert.equal(h.counts().fallback,1);assert.equal(h.frame.srcdoc,'');}finally{h.close();}});
test('an operation timeout does not fall back and resend through GAS',async()=>{const h=fixture();try{h.start();await settle();h.setFailure('UNAVAILABLE');await assert.rejects(h.w.IecNativeHost.call(h.frame.contentWindow,'submitDailyReport',[],{}));assert.equal(h.counts().fallback,0);assert.equal(h.calls.filter(x=>x.body.op==='rpc').length,1);}finally{h.close();}});
test('changed saved user invalidates the old app before another RPC can be sent',async()=>{const h=fixture();try{h.start();await settle();h.setTicket('other-ticket');await assert.rejects(h.w.IecNativeHost.call(h.frame.contentWindow,'submitDailyReport',[],{}));await settle();assert.equal(h.calls.filter(x=>x.body.op==='rpc').length,0);assert.equal(h.counts().signouts,1);assert(!h.frame.srcdoc.includes('REAL_APP'));}finally{h.close();}});
test('foreign frame and late bootstrap after navigation cannot call or restore private app',async()=>{const h=fixture();try{h.start();await settle();await assert.rejects(h.w.IecNativeHost.call({},'submitDailyReport',[],{}));h.w.IecNativeP086.cancel();assert.equal(h.w.IecNativeHost,null);}finally{h.close();}});
test('current-launch diagnostic is short, excludes secrets/history, and performs no requests',async()=>{
 const h=fixture();try{
  assert.equal(h.w.IecNativeP086.diagnostics(),null);h.start();await settle();
  h.w.localStorage.setItem('IEC_DIAGNOSTICS232','SECRET_OLD_HISTORY');
  h.frame.contentWindow.IecNativeReportP086=()=>({revision:'P086-FIX-1',ticket:'SECRET_TICKET',
   rpcErrors:[{method:'issueFirebaseP012',code:'REQUEST',message:'SECRET_ERROR',context:'SECRET_USER'}],
   cardTransport:{version:'P086-READ-2',resumeMs:100,gateMs:150,rpcMs:800,gasDispatchMs:1050,secret:'SECRET_KEY'}});
  h.frame.contentWindow.IecTalkP012={diagnostics:()=>({connected:true,direct:{active:true,rooms:8},
   connection:{issueMs:707,totalMs:1800,customToken:'SECRET_TOKEN'},permissionGatesP071:{person:true,device:true,control:true,feed:true},identity:'SECRET_ID'})};
  const n=h.calls.length,r=h.w.IecNativeP086.diagnostics(),text=JSON.stringify(r);
  assert.equal(r.operationReadyP086.revision,'P086-FIX-1');assert.equal(r.operationReadyP086.cardTransport.resumeMs,100);
  assert.equal(r.talk.connection.issueMs,707);assert.equal(r.talk.connected,true);assert(text.length<3000);
  assert(!text.includes('SECRET'));assert(!text.includes('ID_TOKEN'));assert(!text.includes('https://'));
  assert.equal(h.calls.length,n);h.w.IecNativeP086.cancel();assert.equal(h.w.IecNativeP086.diagnostics(),null);
 }finally{h.close();}
});
