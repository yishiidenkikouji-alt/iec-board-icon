/* P079: a separate, device-bound, read-only trial. Normal app storage is read only.
 * Auth persistence is managed by Firebase; no card, ticket or custom token is saved here.
 * Each card GET goes to the server with the Firebase ID token, bypassing caches.
 */
import {validCard,ticketIdentity,safeCode,decodeCard} from './startup-firebase-core.js?v=P078-ENTRY-1';
import {grantIdentity} from './startup-refresh-core.js?v=P079-ENTRY-1';
const ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
const GAS_URL='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
const KEY='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS_URL;
const $=id=>document.getElementById(id),now=()=>Math.round(performance.now());
const nonce=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const report={version:'P079-ENTRY-1',at:new Date().toISOString(),entryScriptMs:now(),mode:'preparing',authReadyMs:null,firstVerifiedCardMs:null,latestCardMs:null,requestMs:null,outcome:'preparing',background:document.hidden,errorCode:'',timing:null,refreshMode:'pending',gasRequests:0,reconnects:0,signInMs:null,latestReadMs:null};
let active=true,A,auth,stopAuth=null,expectedUid='',binding='',revision='',transport=null,limitTimer=null,displayTimer=null,checkTimer=null,serverTimer=null,refreshComplete=false,latestNonce='',reading=false,snapshotSeq=0,readController=null,displayUntil=0;
function current(){return active&&!document.hidden;}
function refresh(){ $('trialReport').value=JSON.stringify(report,null,2); }
function clearCard(){ $('ownCard').hidden=true;for(const id of ['cardName','cardLabel','cardPlace','cardWork','cardFreshness'])$(id).textContent=''; }
function close(){if(readController)readController.abort();if(stopAuth){stopAuth();stopAuth=null;}if(transport){transport.cancel();transport=null;}clearTimeout(limitTimer);clearTimeout(displayTimer);clearInterval(checkTimer);clearInterval(serverTimer);}
function fail(code,message){if(!active)return;active=false;clearCard();close();report.outcome=code;$('trialStatus').textContent=message;refresh();}
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
 const frame=document.createElement('iframe');frame.name='startup_p079_'+nonce;frame.className='trial-transport';frame.title='本人確認の通信';frame.referrerPolicy='no-referrer';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
 let form=null,sent=false,done=false,rejectRequest,timeout;
 const cleanForm=()=>{if(form){for(const input of form.elements)input.value='';form.remove();form=null;}};
 const cleanup=()=>{clearTimeout(timeout);window.removeEventListener('message',receive);cleanForm();frame.remove();};
 const cancel=()=>{if(done)return;done=true;cleanup();if(rejectRequest)rejectRequest(Error('cancelled'));};
 let resolveRequest;
 function belongs(source){try{for(let i=0,cur=source;cur&&i<10;i++,cur=cur.parent){if(cur===frame.contentWindow)return true;if(cur===window||cur===cur.parent)return false;}}catch{}return false;}
 function receive(e){if(done||!current()||!sent||!allowedOrigin(e.origin)||!belongs(e.source)||!e.data||e.data.app!=='iec-startup-trial-p079'||e.data.version!=='P079-RESPONSE-1'||e.data.nonce!==nonce)return;done=true;cleanup();resolveRequest(e.data.result);}
 const promise=new Promise((resolve,reject)=>{resolveRequest=resolve;rejectRequest=reject;});
 frame.addEventListener('load',()=>{
  if(!current()||done)return;
  if(sent){cleanForm();return;}
  form=document.createElement('form');form.method='POST';form.action=GAS_URL;form.target=frame.name;form.enctype='application/x-www-form-urlencoded';form.hidden=true;
  for(const [name,value] of Object.entries(Object.assign({p079:'startup-v1',nonce,ticket},grant?{grant}:{}))){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.appendChild(input);}
  ticket='';document.body.appendChild(form);sent=true;
  try{form.submit();}catch{cancel();}
 });
 window.addEventListener('message',receive);timeout=setTimeout(cancel,60000);frame.src='about:blank';document.body.appendChild(frame);
 return {promise,cancel};
}
async function display(data,seq){
 if(!current()||seq!==snapshotSeq)return;
 if(!validCard(data,expectedUid,binding)){fail('invalid-card','カードの登録情報を確認できませんでした。通常の業務アプリを利用してください。');return;}
 try{await stillIdentity();}catch{fail('identity-changed','登録情報が変わりました。通常の業務アプリで確認してください。');return;}
 if(!current()||seq!==snapshotSeq)return;
 const fresh=refreshComplete&&data.requestNonce===latestNonce;
 ['name','label','place','workContent'].forEach((key,i)=>{[ $('cardName'),$('cardLabel'),$('cardPlace'),$('cardWork') ][i].textContent=data.card[key];});
 $('cardFreshness').textContent=(fresh?'最新の行先を確認しました':'前回取得したカード・最新情報を確認中')+'（取得：'+new Date(data.updatedAt.toMillis()).toLocaleString('ja-JP')+'）';
 $('ownCard').hidden=false;
 if(report.firstVerifiedCardMs===null)report.firstVerifiedCardMs=now();
 if(fresh&&report.latestCardMs===null){report.latestCardMs=now();report.outcome='success';clearTimeout(limitTimer);$('trialStatus').textContent='表示 '+(report.firstVerifiedCardMs/1000).toFixed(2)+'秒 ／ 最新確認 '+(report.latestCardMs/1000).toFixed(2)+'秒';}
 else if(!refreshComplete){report.outcome='refreshing';$('trialStatus').textContent='利用権限を確認しました。最新の行先を取得しています…';}
 // A diagnostic view has a bounded display lifetime, even when a lease expires
 // without another Firestore event. Offline/hidden/revocation close it earlier.
 if(!displayUntil)displayUntil=performance.now()+60000;
 clearTimeout(displayTimer);displayTimer=setTimeout(()=>{clearCard();close();active=false;$('trialStatus').textContent='カードの表示を終了しました。計測結果はコピーできます。';},Math.max(0,Math.min(displayUntil-performance.now(),data.expiresAt.toMillis()-Date.now())));
 refresh();
}
async function readCard(){
 if(!current()||!expectedUid)return;
 const seq=++snapshotSeq;if(readController)readController.abort();const controller=new AbortController();readController=controller;
 const timeout=setTimeout(()=>{controller.abort();if(current()&&seq===snapshotSeq){clearCard();if(refreshComplete)fail('access-timeout','利用権限の再確認に時間がかかったためカードを閉じました。');}},5000);
 try{
  const user=auth.currentUser;if(!user||user.uid!==expectedUid)throw Error('identity');
  const token=await A.getIdToken(user);if(!current()||seq!==snapshotSeq)return;
  const response=await fetch('https://firestore.googleapis.com/v1/projects/ishii-board-trial-p003/databases/(default)/documents/p078Cards/'+expectedUid,{headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!response.ok){const error=Error('read');error.code=response.status===403?'permission-denied':'unavailable';throw error;}
  const data=decodeCard(await response.json());await display(data,seq);
 }catch(error){
  if(!current()||seq!==snapshotSeq)return;
  clearCard();report.errorCode=safeCode(error);refresh();
  if(refreshComplete)fail('access-ended','利用権限を確認できませんでした。通常の業務アプリを利用してください。');
 }finally{clearTimeout(timeout);if(readController===controller)readController=null;}
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
 let grant='';
 const user=auth.currentUser;
 if(user&&/^p078_[a-f0-9]{64}$/.test(user.uid)){
  const token=await A.getIdTokenResult(user);
  if(!current())return;
  if(token.claims.iecP078===true&&token.claims.binding===binding){
   try{const encoded=grantIdentity(user.uid,token.claims,binding);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(encoded));grant=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}catch{}
   if(!current())return;expectedUid=user.uid;report.mode='restored';readCard();serverTimer=setInterval(()=>{if(!readController)readCard();},10000);}
  else {await A.signOut(auth);report.mode='first-connection';}
 }else{if(user)await A.signOut(auth);report.mode='first-connection';}
 if(!expectedUid)$('trialStatus').textContent='初回の接続を準備しています…';
 stopAuth=A.onAuthStateChanged(auth,user=>{if(current()&&expectedUid&&(!user||user.uid!==expectedUid))fail('identity-changed','試作のログイン状態が変わりました。開き直してください。');});
 refresh();
 const latest=await stillIdentity();if(!current())return;
 const requestStart=now();report.gasRequests++;transport=request(latest.ticket,grant);let result=await transport.promise;transport=null;
 if(!current())return;
 if(result&&result.ok===false&&result.code==='RECONNECT_REQUIRED'&&grant){
  // A hint mismatch never authorizes a new grant. Clear the old view and use
  // the existing, fully authorized bootstrap once; no retry on denial/timeout.
  clearCard();++snapshotSeq;if(readController)readController.abort();
  clearInterval(serverTimer);serverTimer=null;report.reconnects=1;
  $('trialStatus').textContent='接続情報が変わったため、接続を準備し直しています…';refresh();
  const retry=await stillIdentity();if(!current())return;
  report.gasRequests++;transport=request(retry.ticket,'');result=await transport.promise;transport=null;
 }
 if(!current())return;report.requestMs=now()-requestStart;
 if(!result||result.ok!==true){fail('access-denied','試作が未設定・期限切れ、または利用権限を確認できません。通常の業務アプリを利用してください。');if(auth)await A.signOut(auth);return;}
 if(!/^p078_[a-f0-9]{64}$/.test(result.uid||'')||result.binding!==binding||!['reused','bootstrap'].includes(result.refreshMode))throw Error('response');
 if(result.refreshMode==='reused'&&(!grant||report.reconnects||result.uid!==expectedUid||!auth.currentUser||auth.currentUser.uid!==expectedUid))throw Error('response');
 if(result.refreshMode==='bootstrap'&&(typeof result.customToken!=='string'||!result.customToken||result.customToken.length>6000))throw Error('response');
 await stillIdentity();if(!current())return;
 ++snapshotSeq;if(readController)readController.abort();
 if(result.refreshMode==='bootstrap'){
  if(stopAuth){stopAuth();stopAuth=null;}expectedUid=result.uid;
  const signInStart=now();await A.signInWithCustomToken(auth,result.customToken);result.customToken='';if(!current())return;report.signInMs=now()-signInStart;
  stopAuth=A.onAuthStateChanged(auth,user=>{if(current()&&(!user||user.uid!==expectedUid))fail('identity-changed','試作のログイン状態が変わりました。開き直してください。');});
 }else report.signInMs=0;
 refreshComplete=true;latestNonce=nonce;report.refreshMode=result.refreshMode;
 report.timing={};for(const k of ['gasTotalMs','identityAndCardMs','identityMs','cardMs','resumeMs','lockWaitMs','liveCheckMs','mirrorWriteMs','otherServerMs']){const v=(result.timing||{})[k];report.timing[k]=Number.isFinite(v)&&v>=0&&v<600000?Math.round(v):null;}
 refresh();const readStart=now();await readCard();report.latestReadMs=now()-readStart;refresh();
 if(current()&&!serverTimer)serverTimer=setInterval(()=>{if(!readController)readCard();},10000);
}
function stop(){if(!active)return;report.background=true;const completed=report.outcome==='success';active=false;clearCard();close();if(!completed)report.outcome='interrupted';$('trialStatus').textContent='画面を離れたためカードを閉じました。計測結果はコピーできます。';refresh();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);window.addEventListener('pageshow',e=>{if(e.persisted)stop();});
window.addEventListener('offline',()=>fail('offline','通信が切れたためカードを閉じました。接続後にもう一度計測してください。'));
window.addEventListener('storage',e=>{if(current()&&(e.key===null||e.key===KEY||e.key==='iec.board.pwa.gasUrl.v1')){fail('identity-changed','登録情報が変わりました。開き直してください。');if(auth)A.signOut(auth).catch(()=>{});}});
document.addEventListener('securitypolicyviolation',()=>fail('browser-blocked','ブラウザーが接続を止めました。計測結果を共有してください。'));
$('retry').onclick=()=>location.reload();
$('copyReport').onclick=async()=>{refresh();try{await navigator.clipboard.writeText($('trialReport').value);$('copyStatus').textContent='計測結果をコピーしました。';}catch{$('trialReport').focus();$('trialReport').select();$('copyStatus').textContent='選択した結果をコピーしてください。';}};
$('forgetTrial').onclick=async()=>{clearCard();close();active=false;try{if(auth)await A.signOut(auth);$('trialStatus').textContent='試作のログインを解除しました。通常の業務アプリの登録はそのままです。';}catch{$('trialStatus').textContent='解除を確認できませんでした。開き直して再度お試しください。';}};
clearCard();refresh();limitTimer=setTimeout(()=>fail('timeout','最新確認が時間内に完了しませんでした。通常の業務アプリを利用してください。'),75000);
checkTimer=setInterval(async()=>{if(!current()||!binding||reading)return;reading=true;try{await stillIdentity();}catch{fail('identity-changed','登録情報が変わりました。開き直してください。');}finally{reading=false;}},2000);
start().catch(error=>{report.errorCode=safeCode(error);fail('unavailable','接続を確認できませんでした。いつものホーム画面アプリから開き直してください。');});
