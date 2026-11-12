/* P081: a separate, device-bound, read-only trial. Normal app storage is read only.
 * Auth persistence is managed by Firebase; no card, ticket or custom token is saved here.
 * Each card GET goes to the server with the Firebase ID token, bypassing caches.
 */
import {validCard,ticketIdentity,safeCode} from './startup-firebase-core.js?v=P078-ENTRY-1';
import {grantIdentity} from './startup-refresh-core.js?v=P079-ENTRY-1';
import {decodeSyncedCard,syncFresh,syncCheck} from './startup-sync-core.js?v=P081-ENTRY-2';
const ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
const GAS_URL='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
const KEY='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS_URL;
const $=id=>document.getElementById(id),now=()=>Math.round(performance.now());
const nonce=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const report={version:'P081-ENTRY-2',at:new Date().toISOString(),entryScriptMs:now(),mode:'preparing',authReadyMs:null,firstVerifiedCardMs:null,syncedCardMs:null,sourceAgeMs:null,firstReadMs:null,fallbackReason:'',requestMs:null,outcome:'preparing',background:document.hidden,errorCode:'',timing:null,refreshMode:'pending',gasRequests:0,reconnects:0,signInMs:null,latestReadMs:null,syncState:'pending',syncAttempt:null,syncCheck:null,transport:{state:'not-started',requestStartMs:null,frameReadyMs:null,submitReturnedMs:null,loadsAfterSubmit:0,lastFrameLoadMs:null,replyMessages:0,replyVersion:'none',replyNonce:'unchecked',responseMs:null,waitMs:null,blockedDirective:''}};
let active=true,A,auth,stopAuth=null,expectedUid='',binding='',revision='',transport=null,limitTimer=null,displayTimer=null,checkTimer=null,serverTimer=null,reading=false,snapshotSeq=0,readController=null,displayUntil=0,freshTimer=null,lastData=null,grantHint='',refreshPromise=null;
function current(){return active&&!document.hidden;}
function refresh(){ $('trialReport').value=JSON.stringify(report,null,2); }
function clearCard(){ $('ownCard').hidden=true;for(const id of ['cardName','cardLabel','cardPlace','cardWork','cardFreshness'])$(id).textContent=''; }
function close(){clearTimeout(freshTimer);if(readController)readController.abort();if(stopAuth){stopAuth();stopAuth=null;}if(transport){transport.cancel();transport=null;}clearTimeout(limitTimer);clearTimeout(displayTimer);clearInterval(checkTimer);clearInterval(serverTimer);}
function fail(code,message){if(!active)return;active=false;report.outcome=code;clearCard();close();$('trialStatus').textContent=message;refresh();}
function endDisplay(){
 if(!active)return;
 if(!['success','stopped'].includes(report.outcome)){
  if(['preparing','waiting'].includes(report.transport.state)){report.transport.state='timeout';report.errorCode='response-timeout';}
  else report.errorCode='sync-timeout';
  fail('timeout','同期の確認が時間内に終わりませんでした。計測結果をコピーして共有してください。');return;
 }
 active=false;clearCard();close();$('trialStatus').textContent='カードの表示を終了しました。計測結果はコピーできます。';refresh();
}
async function identity(){
 const store=window.IecDeviceStorageD3;
 if(!store||!current()||await store.connection()!==GAS_URL)throw Error('identity');
 const saved=await store.readTicket(KEY,current);
 if(!current()||!saved||saved.removed||!saved.ticket)throw Error('identity');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ticketIdentity(saved.ticket)));
 return {...saved,binding:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
}
async function stillIdentity(){const s=await identity();if(s.binding!==binding||s.revision!==revision)throw Error('identity');return s;}
function allowedOrigin(origin){return origin==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);}
function request(ticket,grant){
 const trace=report.transport={state:'preparing',requestStartMs:now(),frameReadyMs:null,submitReturnedMs:null,loadsAfterSubmit:0,lastFrameLoadMs:null,replyMessages:0,replyVersion:'none',replyNonce:'unchecked',responseMs:null,waitMs:null,blockedDirective:''};
 const frame=document.createElement('iframe');frame.name='startup_p081_'+nonce;frame.className='trial-transport';frame.title='本人確認の通信';frame.referrerPolicy='no-referrer';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
 let form=null,sent=false,done=false,rejectRequest,timeout;
 const cleanForm=()=>{if(form){for(const input of form.elements)input.value='';form.remove();form=null;}};
 const cleanup=()=>{clearTimeout(timeout);window.removeEventListener('message',receive);cleanForm();frame.remove();};
 const cancel=(code='cancelled')=>{if(done)return;done=true;if(trace.state!=='timeout')trace.state=code==='response-timeout'?'timeout':code;trace.waitMs=now()-trace.requestStartMs;cleanup();if(rejectRequest){const error=Error('transport');error.code=code;rejectRequest(error);}};
 let resolveRequest;
 function belongs(source){try{for(let i=0,cur=source;cur&&i<10;i++,cur=cur.parent){if(cur===frame.contentWindow)return true;if(cur===window||cur===cur.parent)return false;}}catch{}return false;}
 function receive(e){
  if(done||!current()||!sent||!allowedOrigin(e.origin)||!belongs(e.source)||!e.data||!['iec-startup-trial-p077','iec-startup-trial-p078','iec-startup-trial-p079','iec-startup-trial-p080','iec-startup-trial-p081'].includes(e.data.app))return;
  trace.replyMessages=Math.min(99,trace.replyMessages+1);trace.replyVersion=e.data.app==='iec-startup-trial-p081'&&e.data.version==='P081-RESPONSE-1'?'matched':['P077-RESPONSE-1','P078-RESPONSE-1','P079-RESPONSE-1','P080-RESPONSE-1'].includes(e.data.version)?'older':'different';trace.replyNonce=e.data.nonce===nonce?'matched':'different';refresh();
  if(trace.replyVersion!=='matched'||trace.replyNonce!=='matched')return;
  done=true;trace.state='response';trace.responseMs=now();trace.waitMs=now()-trace.requestStartMs;cleanup();resolveRequest(e.data.result);
 }
 const promise=new Promise((resolve,reject)=>{resolveRequest=resolve;rejectRequest=reject;});
 frame.addEventListener('load',()=>{
  if(!current()||done)return;
  if(sent){trace.loadsAfterSubmit=Math.min(99,trace.loadsAfterSubmit+1);trace.lastFrameLoadMs=now();cleanForm();refresh();return;}
  trace.frameReadyMs=now();
  form=document.createElement('form');form.method='POST';form.action=GAS_URL;form.target=frame.name;form.enctype='application/x-www-form-urlencoded';form.hidden=true;
  for(const [name,value] of Object.entries(Object.assign({p081:'startup-v1',nonce,ticket},grant?{grant}:{}))){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.appendChild(input);}
  ticket='';document.body.appendChild(form);sent=true;
  try{form.submit();trace.state='waiting';trace.submitReturnedMs=now();refresh();}catch{cancel('submit-failed');}
 });
 window.addEventListener('message',receive);timeout=setTimeout(()=>cancel('response-timeout'),60000);frame.src='about:blank';document.body.appendChild(frame);
 return {promise,cancel};
}
async function display(data,seq){
 if(!current()||seq!==snapshotSeq)return false;
 if(!validCard(data,expectedUid,binding)){fail('invalid-card','カードの登録情報を確認できませんでした。');return false;}
 try{await stillIdentity();}catch{fail('identity-changed','登録情報が変わりました。通常の業務アプリで確認してください。');return false;}
 if(!current()||seq!==snapshotSeq)return false;
 const fresh=syncFresh(data,expectedUid,binding);report.syncCheck=syncCheck(data,expectedUid,binding);lastData=data;
 ['name','label','place','workContent'].forEach((key,i)=>{[$('cardName'),$('cardLabel'),$('cardPlace'),$('cardWork')][i].textContent=data.card[key];});
 $('cardFreshness').textContent=(fresh?'同期時点の行先':'前回の行先・更新待ち')+'（確認：'+new Date(data.updatedAt.toMillis()).toLocaleString('ja-JP')+'）';
 $('ownCard').hidden=false;
 if(report.firstVerifiedCardMs===null)report.firstVerifiedCardMs=now();
 clearTimeout(freshTimer);
 if(fresh){
  if(report.syncedCardMs===null){report.syncedCardMs=now();report.sourceAgeMs=Math.max(0,Date.now()-data.sync.checkedAt);}
  report.outcome='success';report.syncState='ready';clearTimeout(limitTimer);
  $('trialStatus').textContent='同期済みカードを '+(report.syncedCardMs/1000).toFixed(2)+'秒で表示しました。';
  freshTimer=setTimeout(()=>{if(!current()||lastData!==data)return;$('cardFreshness').textContent='前回の行先・更新待ち（確認：'+new Date(data.updatedAt.toMillis()).toLocaleString('ja-JP')+'）';report.syncState='stale';report.outcome='refreshing';refresh();ensureRefresh('boundary');},Math.max(1,data.sync.validUntil-Date.now()));
 }else{
  report.syncState=data.sync?.status==='stopped'?'stopped':'stale';report.outcome=report.syncState==='stopped'?'stopped':'refreshing';
  $('trialStatus').textContent=report.syncState==='stopped'?'自動同期は停止されています。':'同期を確認しています…';
 }
 if(!displayUntil)displayUntil=performance.now()+60000;
 clearTimeout(displayTimer);displayTimer=setTimeout(endDisplay,Math.max(0,Math.min(displayUntil-performance.now(),data.expiresAt.toMillis()-Date.now())));
 refresh();return fresh;
}
async function readCard(){
 if(!current()||!expectedUid)return false;
 const seq=++snapshotSeq;if(readController)readController.abort();const controller=new AbortController();readController=controller;
 const timeout=setTimeout(()=>{controller.abort();if(current()&&seq===snapshotSeq)fail('access-timeout','利用権限の確認に時間がかかったためカードを閉じました。');},5000);
 try{
  const user=auth.currentUser;if(!user||user.uid!==expectedUid)throw Error('identity');
  const token=await A.getIdToken(user);if(!current()||seq!==snapshotSeq)return false;
  const response=await fetch('https://firestore.googleapis.com/v1/projects/ishii-board-trial-p003/databases/(default)/documents/p078Cards/'+expectedUid,{headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!response.ok){const error=Error('read');error.code=response.status===403?'permission-denied':'unavailable';throw error;}
  return await display(decodeSyncedCard(await response.json()),seq);
 }catch(error){if(current()&&seq===snapshotSeq){report.errorCode=safeCode(error);fail('access-ended','利用権限を確認できません。P080で接続を確認してください。');}return false;}
 finally{clearTimeout(timeout);if(readController===controller)readController=null;}
}
function beginChecks(){if(current()&&!serverTimer)serverTimer=setInterval(async()=>{if(!current()||readController)return;const fresh=await readCard();if(current()&&!fresh)ensureRefresh('stale');},10000);}
function ensureRefresh(reason){
 if(!current()||report.gasRequests||report.syncState==='stopped')return refreshPromise;
 report.fallbackReason=reason;refreshPromise=refreshFromGas().catch(error=>{if(!current())return;report.errorCode=['response-timeout','submit-failed'].includes(error?.code)?error.code:safeCode(error);fail(report.errorCode==='response-timeout'?'timeout':'unavailable',report.errorCode==='response-timeout'?'試作から応答が戻りませんでした。計測結果をコピーして共有してください。':'再同期できませんでした。計測結果をコピーして共有してください。');});return refreshPromise;
}
async function refreshFromGas(){
 const latest=await stillIdentity();if(!current())return;
 const requestStart=now();report.gasRequests++;report.refreshMode='request';refresh();
 transport=request(latest.ticket,grantHint);let result=await transport.promise;transport=null;
 if(!current())return;
 if(result&&result.ok===false&&result.code==='RECONNECT_REQUIRED'&&grantHint){
  clearCard();++snapshotSeq;if(readController)readController.abort();report.reconnects=1;
  const retry=await stillIdentity();if(!current())return;report.gasRequests++;transport=request(retry.ticket,'');result=await transport.promise;transport=null;
 }
 if(!current())return;report.requestMs=now()-requestStart;
 if(!result||result.ok!==true){fail('access-denied','P081の設定・利用期限・本人確認を確認できません。P080で接続を確認してください。');return;}
 if(!/^p078_[a-f0-9]{64}$/.test(result.uid||'')||result.binding!==binding||!['reused','bootstrap'].includes(result.refreshMode))throw Error('response');
 if(result.refreshMode==='reused'&&(!grantHint||report.reconnects||result.uid!==expectedUid||auth.currentUser?.uid!==expectedUid))throw Error('response');
 if(result.refreshMode==='bootstrap'&&(typeof result.customToken!=='string'||!result.customToken||result.customToken.length>6000))throw Error('response');
 await stillIdentity();if(!current())return;
 ++snapshotSeq;if(readController)readController.abort();
 if(result.refreshMode==='bootstrap'){
  if(stopAuth){stopAuth();stopAuth=null;}expectedUid=result.uid;const t=now();await A.signInWithCustomToken(auth,result.customToken);result.customToken='';if(!current())return;report.signInMs=now()-t;
  stopAuth=A.onAuthStateChanged(auth,user=>{if(current()&&(!user||user.uid!==expectedUid))fail('identity-changed','試作のログイン状態が変わりました。');});
 }else report.signInMs=0;
 report.refreshMode=result.refreshMode;report.syncAttempt={state:['ready','pending','inactive','busy','no-grant'].includes(result.syncP081?.state)?result.syncP081.state:'unknown',stage:['source','card','verify','mirror'].includes(result.syncP081?.stage)?result.syncP081.stage:'',serverMs:Number.isFinite(result.syncP081?.serverMs)&&result.syncP081.serverMs>=0&&result.syncP081.serverMs<600000?Math.round(result.syncP081.serverMs):null};report.timing={};
 for(const k of ['gasTotalMs','identityAndCardMs','identityMs','cardMs']){const v=result.timing?.[k];report.timing[k]=Number.isFinite(v)&&v>=0&&v<600000?Math.round(v):null;}
 const t=now();await readCard();report.latestReadMs=now()-t;refresh();beginChecks();
}
async function start(){
 if(window.top!==window||new URL('./',location.href).href!==ROOT||document.hidden){fail('interrupted','いつものホーム画面アプリの試作リンクから開いてください。');return;}
 const saved=await identity();binding=saved.binding;revision=saved.revision;
 const sdk='https://www.gstatic.com/firebasejs/13.0.0/';
 const modules=await Promise.all([import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js')]);
 if(!current())return;A=modules[1];
 const app=modules[0].initializeApp({apiKey:'AIzaSyA8kXcaabbAGJeme8SqhdBEcW9_2bDE95A',authDomain:'ishii-board-trial-p003.firebaseapp.com',projectId:'ishii-board-trial-p003',appId:'1:370469807597:web:f708cc81213706a80673e4'},'iec-startup-p078');
 auth=A.initializeAuth(app,{persistence:[A.indexedDBLocalPersistence,A.browserLocalPersistence]});
 await auth.authStateReady();if(!current())return;report.authReadyMs=now();
 const user=auth.currentUser;
 if(user&&/^p078_[a-f0-9]{64}$/.test(user.uid)){
  const token=await A.getIdTokenResult(user);if(!current())return;
  if(token.claims.iecP078===true&&token.claims.binding===binding){
   const encoded=grantIdentity(user.uid,token.claims,binding),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(encoded));
   grantHint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');expectedUid=user.uid;report.mode='restored';
  }else{await A.signOut(auth);report.mode='first-connection';}
 }else{if(user)await A.signOut(auth);report.mode='first-connection';}
 if(!current())return;
 stopAuth=A.onAuthStateChanged(auth,user=>{if(current()&&expectedUid&&(!user||user.uid!==expectedUid))fail('identity-changed','試作のログイン状態が変わりました。');});
 refresh();
 if(expectedUid){
  const t=now(),fresh=await readCard();report.firstReadMs=now()-t;
  if(!current())return;
  if(fresh){report.refreshMode='mirror';report.signInMs=0;refresh();beginChecks();return;}
 }
 await ensureRefresh(expectedUid?'stale':'first-connection');beginChecks();
}
function stop(){if(!active)return;report.background=true;const completed=report.outcome==='success';active=false;clearCard();close();if(!completed)report.outcome='interrupted';$('trialStatus').textContent='画面を離れたためカードを閉じました。計測結果はコピーできます。';refresh();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);window.addEventListener('pageshow',e=>{if(e.persisted)stop();});
window.addEventListener('offline',()=>fail('offline','通信が切れたためカードを閉じました。接続後にもう一度計測してください。'));
window.addEventListener('storage',e=>{if(current()&&(e.key===null||e.key===KEY||e.key==='iec.board.pwa.gasUrl.v1')){fail('identity-changed','登録情報が変わりました。開き直してください。');if(auth)A.signOut(auth).catch(()=>{});}});
document.addEventListener('securitypolicyviolation',e=>{if(!current())return;report.transport.blockedDirective=['frame-src','form-action','script-src','script-src-elem','connect-src'].includes(e.effectiveDirective)?e.effectiveDirective:'other';fail('browser-blocked','ブラウザーが接続を止めました。計測結果を共有してください。');});
$('retry').onclick=()=>location.reload();
$('copyReport').onclick=async()=>{refresh();try{await navigator.clipboard.writeText($('trialReport').value);$('copyStatus').textContent='計測結果をコピーしました。';}catch{$('trialReport').focus();$('trialReport').select();$('copyStatus').textContent='選択した結果をコピーしてください。';}};
$('forgetTrial').onclick=async()=>{clearCard();close();active=false;try{if(auth)await A.signOut(auth);$('trialStatus').textContent='試作のログインを解除しました。通常の業務アプリの登録はそのままです。';}catch{$('trialStatus').textContent='解除を確認できませんでした。開き直して再度お試しください。';}};
clearCard();refresh();limitTimer=setTimeout(endDisplay,75000);
checkTimer=setInterval(async()=>{if(!current()||!binding||reading)return;reading=true;try{await stillIdentity();}catch{fail('identity-changed','登録情報が変わりました。開き直してください。');}finally{reading=false;}},2000);
start().catch(error=>{if(!current())return;report.errorCode=safeCode(error);fail('unavailable','接続を確認できませんでした。いつものホーム画面アプリから開き直してください。');});
