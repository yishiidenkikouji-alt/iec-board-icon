const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').join(__dirname,'../board-pwa/entry-native-p086.js'),'utf8').replaceAll("import('https://", "loadSDK('https://");
const GAS='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
const settle=async()=>{for(let i=0;i<15;i++)await new Promise(r=>setImmediate(r));};
function fixture(){
 const dom=new JSDOM('<!doctype html><iframe id="boardFrame"></iframe>',{url:'https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,frame=w.document.querySelector('iframe'),calls=[];let ticket='signed-ticket',fallback=0,signins=0,signouts=0,failure='',delay=null;
 Object.defineProperty(w,'crypto',{value:crypto.webcrypto});Object.assign(w,{TextEncoder,AbortController,structuredClone});
 w.IEC_PWA_CONFIG={nativeP086:true};w.IecDeviceStorageD3={readTicket:async()=>({ticket})};
 const auth={currentUser:{getIdToken:async()=> 'ID_TOKEN'},authStateReady:async()=>{}};
 const lib={initializeAuth:()=>auth,indexedDBLocalPersistence:{},browserLocalPersistence:{},browserSessionPersistence:{},signInWithCustomToken:async()=>{signins++;auth.currentUser={getIdToken:async()=> 'ID_TOKEN'};},signOut:async()=>{signouts++;auth.currentUser=null;}};
 w.loadSDK=async url=>url.endsWith('firebase-app.js')?{initializeApp:()=>({})}:lib;
 w.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({body,options});if(delay)await delay;
  if(failure)return {ok:false,json:async()=>({ok:false,code:failure})};
  const result=body.op==='enroll'?{version:'P086-NATIVE-1',customToken:'CUSTOM',ticketHash:crypto.createHash('sha256').update(ticket).digest('hex')}:
   body.op==='bootstrap'?{version:'P086-NATIVE-1',html:'<html><head><script data-native-p086></script><script type="application/json" id="deviceResumeBootstrap">{}</script></head><body>REAL_APP</body></html>',access:{identityKey:'id',deviceUser:'user'}}:{saved:true};
  return {ok:true,json:async()=>({ok:true,result})};
 };
 vm.runInContext(source,dom.getInternalVMContext());
 const start=()=>w.IecNativeP086.start({frame,url:GAS,key:'key',nonce:'a'.repeat(64),current:()=>true,fallback:()=>fallback++});
 return {w,frame,auth,calls,start,setTicket:v=>ticket=v,setFailure:v=>failure=v,setDelay:v=>delay=v,counts:()=>({fallback,signins,signouts}),close:()=>{w.IecNativeP086.cancel();dom.window.close();}};
}
test('disabled native path does no SDK/network work',async()=>{const h=fixture();try{h.w.IEC_PWA_CONFIG.nativeP086=false;assert.equal(h.start(),false);await settle();assert.equal(h.calls.length,0);}finally{h.close();}});
test('restored native login fetches authorized private UI once; no preview or enrollment request',async()=>{const h=fixture();try{assert(h.start());await settle();assert.deepEqual(h.calls.map(x=>x.body.op),['bootstrap']);assert(h.frame.srcdoc.includes('REAL_APP'));assert.equal(h.calls[0].options.headers.Authorization,'Bearer ID_TOKEN');assert.equal(h.calls[0].options.cache,'no-store');assert.equal(h.counts().fallback,0);}finally{h.close();}});
test('first connection enrolls through signed ticket then uses a separate native login',async()=>{const h=fixture();try{h.auth.currentUser=null;h.start();await settle();assert.deepEqual(h.calls.map(x=>x.body.op),['enroll','bootstrap']);assert.equal(h.counts().signins,1);}finally{h.close();}});
test('failed initial bootstrap returns to the ordinary app once',async()=>{const h=fixture();try{h.setFailure('UNAVAILABLE');h.start();await settle();assert.equal(h.counts().fallback,1);assert.equal(h.frame.srcdoc,'');}finally{h.close();}});
test('an operation timeout does not fall back and resend through GAS',async()=>{const h=fixture();try{h.start();await settle();h.setFailure('UNAVAILABLE');await assert.rejects(h.w.IecNativeHost.call(h.frame.contentWindow,'submitDailyReport',[],{}));assert.equal(h.counts().fallback,0);assert.equal(h.calls.filter(x=>x.body.op==='rpc').length,1);}finally{h.close();}});
test('changed saved user invalidates the old app before another RPC can be sent',async()=>{const h=fixture();try{h.start();await settle();h.setTicket('other-ticket');await assert.rejects(h.w.IecNativeHost.call(h.frame.contentWindow,'submitDailyReport',[],{}));await settle();assert.equal(h.calls.filter(x=>x.body.op==='rpc').length,0);assert.equal(h.counts().signouts,1);assert(!h.frame.srcdoc.includes('REAL_APP'));}finally{h.close();}});
test('foreign frame and late bootstrap after navigation cannot call or restore private app',async()=>{const h=fixture();try{h.start();await settle();await assert.rejects(h.w.IecNativeHost.call({},'submitDailyReport',[],{}));h.w.IecNativeP086.cancel();assert.equal(h.w.IecNativeHost,null);}finally{h.close();}});
