const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(process.env.P086_ENTRY_SOURCE||require('node:path').join(__dirname,'../../board-pwa/entry-native-p086.js'),'utf8').replaceAll("import('https://", "loadSDK('https://");
const GAS='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
// WebCrypto completes on the worker pool; immediate-only loops can finish
// before its callback under parallel test load.
const settle=async()=>{for(let i=0;i<15;i++)await new Promise(r=>setTimeout(r,2));};
function fixture(settings={}){
 const dom=new JSDOM('<!doctype html><iframe id="boardFrame"></iframe>',{url:'https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/',runScripts:settings.runScripts||'outside-only',pretendToBeVisual:true});
 const w=dom.window,frame=w.document.querySelector('iframe'),calls=[];let ticket='signed-ticket',fallback=0,signins=0,signouts=0,failure='',delay=null;
 Object.defineProperty(w,'crypto',{value:crypto.webcrypto});Object.assign(w,{TextEncoder,AbortController,structuredClone});
 w.IEC_PWA_CONFIG={nativeP086:true};w.IecDeviceStorageD3={readTicket:async()=>({ticket})};
 if(settings.capability)w.localStorage.setItem('iec.entry.card.p086:/iec-board-icon/board-pwa/','P086-CARD-1');
 if(settings.view)w.IecEntryStartViewP082=()=>settings.view;
 const auth={currentUser:{getIdToken:async()=> 'ID_TOKEN'},authStateReady:async()=>{}};
 const lib={initializeAuth:()=>auth,indexedDBLocalPersistence:{},browserLocalPersistence:{},browserSessionPersistence:{},signInWithCustomToken:async()=>{signins++;auth.currentUser={getIdToken:async()=> 'ID_TOKEN'};},signOut:async()=>{signouts++;auth.currentUser=null;}};
 w.loadSDK=async url=>url.endsWith('firebase-app.js')?{initializeApp:()=>({})}:lib;
 w.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push({body,options});if(delay)await delay;
  if(body.op==='bootstrap'&&settings.bootstrapDelay)await settings.bootstrapDelay;
  if(body.op==='startupCard'&&settings.cardDelay)await settings.cardDelay;
  if(body.op==='startupCard'&&settings.cardError)return {ok:false,json:async()=>({ok:false,code:settings.cardError})};
  if(body.op==='rpc'&&settings.rpcErrors&&settings.rpcErrors[body.method])return {ok:false,json:async()=>({ok:false,code:settings.rpcErrors[body.method]})};
  if(failure)return {ok:false,json:async()=>({ok:false,code:failure})};
  const result=body.op==='enroll'?{version:'P086-NATIVE-1',customToken:'CUSTOM',ticketHash:crypto.createHash('sha256').update(ticket).digest('hex')}:
   body.op==='bootstrap'?{version:'P086-NATIVE-1',html:'<html><head><script data-native-p086></script><script type="application/json" id="deviceResumeBootstrap">{}</script></head><body>REAL_APP</body></html>',access:{identityKey:'id',deviceUser:'user'},...(settings.supported?{startupCardP086:'P086-CARD-1'}:{})}:
   body.op==='startupCard'?{data:[{name:'user',place:'current-place'}]}:{saved:true};
  return {ok:true,json:async()=>({ok:true,result})};
 };
 vm.runInContext(source,dom.getInternalVMContext());
 const start=()=>w.IecNativeP086.start({frame,url:GAS,key:'key',nonce:'a'.repeat(64),current:()=>true,fallback:()=>fallback++});
 return {w,frame,auth,calls,start,setTicket:v=>ticket=v,setFailure:v=>failure=v,setDelay:v=>delay=v,counts:()=>({fallback,signins,signouts}),close:()=>{w.IecNativeP086.cancel();dom.window.close();}};
}

module.exports={fixture,settle};

