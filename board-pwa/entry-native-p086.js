/* Public transport code only; private application HTML is fetched after authorization. */
(function(){
 'use strict';
 const API='https://asia-northeast1-ishii-board-trial-p003.cloudfunctions.net/businessAppP086';
 const GAS='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
 const CHOICE='iec.entry.native.p086:/iec-board-icon/board-pwa/';
 function selected(){try{return localStorage.getItem(CHOICE)==='1';}catch(ignore){return false;}}
 function enabled(){const c=window.IEC_PWA_CONFIG||{};return c.nativeP086===true||(c.nativeP086OptIn===true&&selected());}
 function choose(value){
  if(typeof value!=='boolean')throw Error('起動方式を確認してください。');
  localStorage.setItem(CHOICE,value?'1':'0');
  if(localStorage.getItem(CHOICE)!==(value?'1':'0'))throw Error('起動方式を保存できませんでした。');
  return value;
 }
 let sdkPromise=null,active=null,signInQueue=Promise.resolve();
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&(active.metrics.latestCardMs===null||active.metrics.talkReadyMs===null))active.background=true;});
 const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=86400000?Math.round(v):null;
 function numbers(source,keys){const out={};for(const k of keys)out[k]=number(source&&source[k]);return out;}
 function currentDiagnostics(){
  const s=active;if(!s||s.cancelled||!s.attached||!s.current())return null;
  let extra={},talk={};
  try{const w=s.frame.contentWindow;extra=typeof w.IecNativeReportP086==='function'?(w.IecNativeReportP086()||{}):{};talk=w.IecTalkP012?(w.IecTalkP012.diagnostics()||{}):{};}catch(ignore){}
  const report={version:'P086-ENTRY-DIAG-1',at:s.at,background:s.background,operationReadyP086:{
   version:'P086-OPERATIONS-1',path:'firebase',...numbers(s.metrics,['screenReadyMs','latestCardMs','talkReadyMs','privateHtmlMs','bootstrapMs']),gasCalls:number(s.gasCalls),
   revision:extra.revision==='P086-FIX-1'?'P086-FIX-1':'unconfirmed',
   rpcErrors:(Array.isArray(extra.rpcErrors)?extra.rpcErrors:[]).filter(e=>e&&typeof e==='object').slice(-8).map(e=>({
    method:typeof e.method==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,89}$/.test(e.method)?e.method:'unknown',
    code:['AUTH','RECONNECT','REQUEST','NORMAL_ENTRY_REQUIRED','DUPLICATE','RPC','UNAVAILABLE','RATE_LIMIT','UNKNOWN'].includes(e.code)?e.code:'UNKNOWN'
   })),cardTransport:extra.cardTransport?{version:extra.cardTransport.version==='P086-READ-2'?'P086-READ-2':'unconfirmed',...numbers(extra.cardTransport,['resumeMs','gateMs','rpcMs','gasDispatchMs','bulkReads','propertyReadsAvoided','bulkMs'])}:null},
   talk:{connected:talk.connected===true,directActive:!!(talk.direct&&talk.direct.active),
    connection:numbers(talk.connection,['sdkMs','issueMs','signInMs','claimsMs','firstSnapshotMs','totalMs']),
    gates:Object.fromEntries(['person','device','control','feed'].map(k=>[k,!!(talk.permissionGatesP071&&talk.permissionGatesP071[k])]))}};
  return report;
 }
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
 function sdk(){
  if(!sdkPromise)sdkPromise=Promise.all([import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js')]).then(async([app,lib])=>{
   const instance=app.initializeApp({apiKey:'AIzaSyA8kXcaabbAGJeme8SqhdBEcW9_2bDE95A',authDomain:'ishii-board-trial-p003.firebaseapp.com',projectId:'ishii-board-trial-p003',appId:'1:370469807597:web:f708cc81213706a80673e4'},'iec-native-p086');
   const auth=lib.initializeAuth(instance,{persistence:[lib.indexedDBLocalPersistence,lib.browserLocalPersistence,lib.browserSessionPersistence]});
   await auth.authStateReady();return {auth,lib};
  });
  return sdkPromise;
 }
 function cancel(){if(active){active.cancelled=true;clearInterval(active.check);active=null;}window.IecNativeHost=null;}
 function scriptJson(x){return JSON.stringify(x).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
 function start(o){
  if(!enabled()||o.url!==GAS)return false;
  cancel();const s={cancelled:false,attached:false,check:null,ticketHash:'',key:o.key,originTicket:'',gasCalls:0,checking:false,
   metrics:{version:'P086-OPERATIONS-1',path:'firebase',screenReadyMs:null,latestCardMs:null,talkReadyMs:null,privateHtmlMs:null,bootstrapMs:null}};
  active=s;const current=()=>active===s&&!s.cancelled&&o.current();
  s.current=current;s.frame=o.frame;s.at=new Date().toISOString();s.background=!!document.hidden;
  function failBeforeStart(){if(!current()||s.attached)return;cancel();o.fallback();}
  async function unchanged(){
   const saved=await window.IecDeviceStorageD3.readTicket(o.key,current);
   if(!current()||saved.ticket!==s.originTicket)throw Object.assign(Error('保存した利用者が変わりました。'),{code:'RECONNECT'});
  }
  async function request(body,authenticated=true){
   const {auth}=await sdk();if(!current())throw Error('navigation');
   if(authenticated)await unchanged();
   const headers={'Content-Type':'application/json'};
   if(authenticated){if(!auth.currentUser)throw Object.assign(Error('本人確認が必要です。'),{code:'AUTH'});headers.Authorization='Bearer '+await auth.currentUser.getIdToken();headers['X-IEC-Ticket-Hash']=s.ticketHash;}
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),75000);
   try{
    const response=await fetch(API,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:controller.signal});
    const data=await response.json();if(!current())throw Error('navigation');
    if(!response.ok||data.ok!==true)throw Object.assign(Error(data.message||'応答を確認できません。'),{code:data.code||'UNAVAILABLE'});
    return data.result;
   }finally{clearTimeout(timer);}
  }
  function invalidate(){
   if(!current())return;s.cancelled=true;clearInterval(s.check);
   try{o.frame.contentWindow.suspendDeviceIdentity_('本人確認を更新してください。入口を開き直してください。');}catch(ignore){}
   o.frame.removeAttribute('srcdoc');o.frame.srcdoc='<p style="font:18px sans-serif;padding:24px">本人確認を更新してください。業務アプリを開き直してください。</p>';
   void sdk().then(x=>x.lib.signOut(x.auth));
  }
  async function launch(){
   const saved=await window.IecDeviceStorageD3.readTicket(o.key,current);
   if(!saved.ticket||!current())return failBeforeStart();
   s.originTicket=saved.ticket;s.ticketHash=await hash(saved.ticket);
   const {auth,lib}=await sdk();await signInQueue;if(!current())return;let result;
   const started=performance.now();
   if(auth.currentUser)try{result=await request({op:'bootstrap'});}catch(e){if(!['AUTH','RECONNECT'].includes(e.code))throw e;}
   if(!result){
    const grant=await request({op:'enroll',ticket:saved.ticket},false);
    if(!current()||grant.version!=='P086-NATIVE-1'||grant.ticketHash!==s.ticketHash)throw Error('grant');
    await (signInQueue=signInQueue.catch(()=>{}).then(async()=>{if(!current())throw Error('navigation');await unchanged();await lib.signInWithCustomToken(auth,grant.customToken);if(!current()){await lib.signOut(auth);throw Error('navigation');}}));
    result=await request({op:'bootstrap'});
   }
   if(!current()||result.version!=='P086-NATIVE-1'||typeof result.html!=='string'||!result.html.includes('data-native-p086'))throw Error('bootstrap');
   s.metrics.bootstrapMs=Math.round(performance.now()-started);
   const host={access:result.access,nonce:o.nonce,matches:w=>current()&&w===o.frame.contentWindow,
    call:async(w,method,args,context)=>{
     if(!host.matches(w))throw Error('navigation');
     try{if(!['getClientModule212','issueFirebaseP012','getDeviceAccessConfigV2'].includes(method))s.gasCalls++;
      return await request({op:'rpc',method,args,context,requestId:random()});
     }catch(e){if(['AUTH','RECONNECT'].includes(e.code))invalidate();throw e;}
    },
    mark:key=>{if(current()&&Object.hasOwn(s.metrics,key)&&s.metrics[key]===null){s.metrics[key]=Math.round(performance.now());if(key==='screenReadyMs')window.dispatchEvent(new CustomEvent('iec-entry-navigationP082',{detail:{phase:'ready'}}));}},
    report:()=>({...s.metrics,gasCalls:s.gasCalls}),invalidate,
    normalEntry:()=>{if(!current())return;cancel();o.frame.removeAttribute('srcdoc');o.fallback();}};
   window.IecNativeHost=Object.freeze(host);s.attached=true;
   const bootstrap={nonce:o.nonce,boardUrl:GAS,serverReleaseP017:'2026.11.12-r253-P014-P84',talkP012:true,initialP010:true,initialCardP074:false,confirmationSendVersion:134,nativeP086:true};
   o.frame.srcdoc=result.html.replace('<script type="application/json" id="deviceResumeBootstrap">{}</script>',()=>'<script type="application/json" id="deviceResumeBootstrap">'+scriptJson(bootstrap)+'</script>');
   s.metrics.privateHtmlMs=Math.round(performance.now());
   // Stop reads/display after revocation, and also recheck before each operation.
   s.check=setInterval(async()=>{if(!current()||document.hidden||s.checking)return;s.checking=true;try{await request({op:'check'});}catch(e){if(['AUTH','RECONNECT'].includes(e.code))invalidate();}finally{s.checking=false;}},60000);
  }
  void launch().catch(failBeforeStart);return true;
 }
 window.IecNativeP086=Object.freeze({start,cancel,selected,choose,diagnostics:currentDiagnostics,active:()=>!!(active&&active.attached&&!active.cancelled)});
})();
