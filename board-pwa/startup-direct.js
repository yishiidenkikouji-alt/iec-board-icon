/* Opt-in P077 direct POST trial. Only fixed destinations and current D3 storage.
 * The normal app and P076 gateway remain unchanged. No identity writes or retries.
 */
(function(){
 'use strict';
 const GAS_URL='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
 const ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
 if(window.top!==window||new URL('./',location.href).href!==ROOT)return;
 const KEY='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS_URL;
 const APP='iec-startup-trial-p077',frame=document.getElementById('trialFrame'),status=document.getElementById('trialStatus'),output=document.getElementById('trialReport');
 const card=document.getElementById('ownCard'),cardFields=['cardName','cardLabel','cardPlace','cardWork'];
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 let active=true,sent=false,received=false,revision='',deadline=null;
 const report={version:'P077-ENTRY-1',at:new Date().toISOString(),entryScriptMs:Math.round(performance.now()),connectionReadyMs:null,ticketReadyMs:null,requestStartMs:null,responseMs:null,totalToCardMs:null,outcome:'preparing',background:!!document.hidden,timing:null,entryCheck:{mode:'browser',storageModule:false,commonConfig:'missing',connection:'unchecked',ticket:'unchecked',errorCode:''}};
 try{if(navigator.standalone===true||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches))report.entryCheck.mode='standalone';}catch(ignore){}
 const SAME_APP_HELP='いつものホーム画面アプリの［起動速度を試す］から開いてください。';
 function current(){return active&&!document.hidden;}
 function refresh(){output.value=JSON.stringify(report,null,2);}
 function clearCard(){card.hidden=true;for(const id of cardFields)document.getElementById(id).textContent='';}
 function fail(code,message){active=false;clearTimeout(deadline);clearCard();frame.removeAttribute('src');frame.remove();report.outcome=code;status.textContent=message;refresh();}
 function entryError(code){const e=new Error('entry check');e.entryCode=code;return e;}
 function recordError(error){if(['format','storage','blocked','timeout','navigation','key'].includes(error&&error.code))report.entryCheck.errorCode=error.code;}
 function entryFailure(error){
  recordError(error);
  const code=['storage-module-unavailable','connection-read-failed','connection-missing','connection-mismatch','ticket-missing','ticket-removed','ticket-read-failed','ticket-format','identity-changed'].includes(error&&error.entryCode)?error.entryCode:'entry-unavailable';
  const lead=code==='ticket-missing'?'この画面には保存済みの本人確認情報がありません。':code==='ticket-removed'?'この画面の登録は解除されています。':code==='identity-changed'?'確認中に登録情報が変わりました。':code==='connection-mismatch'?'接続先が今回の試作対象と異なります。':'保存された接続情報を確認できませんでした。';
  fail(code,lead+' '+SAME_APP_HELP);
 }
 async function checkConnection(){
  const store=window.IecDeviceStorageD3;
  report.entryCheck.storageModule=!!(store&&typeof store.connection==='function'&&typeof store.readTicket==='function');
  const common=(window.IEC_PWA_CONFIG||{}).gasUrl;report.entryCheck.commonConfig=common===GAS_URL?'matched':common?'different':'missing';
  if(!report.entryCheck.storageModule)throw entryError('storage-module-unavailable');
  let url;try{url=await store.connection();}catch(error){recordError(error);report.entryCheck.connection='read-error';throw entryError('connection-read-failed');}
  if(!current())throw entryError('interrupted');
  report.entryCheck.connection=!url?'missing':url===GAS_URL?'matched':'different';
  if(!url)throw entryError('connection-missing');if(url!==GAS_URL)throw entryError('connection-mismatch');
  return store;
 }
 async function readTicket(store){
  let saved;try{saved=await store.readTicket(KEY,current);}catch(error){recordError(error);report.entryCheck.ticket='read-error';throw entryError('ticket-read-failed');}
  if(!current())throw entryError('interrupted');
  report.entryCheck.ticket=saved&&saved.removed?'removed':saved&&saved.ticket?'present':'missing';
  if(saved&&saved.removed)throw entryError('ticket-removed');if(!saved||!saved.ticket)throw entryError('ticket-missing');
  if(typeof saved.ticket!=='string'||!/^iec-resume-v1\.[A-Za-z0-9_-]{50,1600}\.[A-Za-z0-9_-]{43}$/.test(saved.ticket)||typeof saved.revision!=='string'||!saved.revision){report.entryCheck.ticket='invalid';throw entryError('ticket-format');}
  return saved;
 }
 function belongs(source){
  try{for(let depth=0,cur=source;cur&&depth<10;depth++,cur=cur.parent){if(cur===frame.contentWindow)return true;if(cur===window||cur===cur.parent)return false;}}catch(ignore){}
  return false;
 }
 function allowedOrigin(origin){return origin==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);}
 function submit(ticket){
  // A form navigation permits a body-only POST; no token in a URL, log or saved state.
  const form=document.createElement('form');form.method='POST';form.action=GAS_URL;form.enctype='application/x-www-form-urlencoded';form.acceptCharset='UTF-8';form.hidden=true;
  frame.name='startup_p077_'+nonce;form.target=frame.name;
  const inputs=[];
  try{
   for(const [name,value] of Object.entries({p077:'startup-v1',nonce,ticket})){
    const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.appendChild(input);inputs.push(input);
   }
   document.body.appendChild(form);report.requestStartMs=Math.round(performance.now());sent=true;form.submit();
  }finally{for(const input of inputs)input.value='';form.remove();}
 }
 window.addEventListener('message',async function(event){
  const d=event.data;
  if(!current()||!sent||received||!allowedOrigin(event.origin)||!belongs(event.source)||!d||d.app!==APP||d.version!=='P077-RESPONSE-1'||d.nonce!==nonce)return;
  received=true;report.responseMs=Math.round(performance.now());
  const result=d.result;
  if(!result||result.ok!==true){
   const code=['NOT_ENABLED','ACCESS_DENIED','CARD_UNAVAILABLE'].includes(result&&result.code)?result.code:'CONNECTION';
   fail(code,'本人確認またはカード取得を完了できませんでした。通常の業務アプリを利用し、計測結果を共有してください。');return;
  }
  if(!result.card||['name','label','place','workContent'].some(k=>typeof result.card[k]!=='string'||result.card[k].length>3000)||!result.card.name){fail('INVALID_RESPONSE','試作の応答を確認できませんでした。通常の業務アプリを利用してください。');return;}
  try{
   // Do not display a response after a local logout, connection switch or re-registration.
   const latest=await readTicket(await checkConnection());
   if(latest.revision!==revision)throw entryError('identity-changed');
   if(!current())return;
   report.timing={requestMs:report.responseMs-report.requestStartMs};
   for(const k of ['gasTotalMs','identityAndCardMs','identityMs','cardMs']){const v=(result.timing||{})[k];report.timing[k]=typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=600000?Math.round(v):null;}
   ['name','label','place','workContent'].forEach((key,i)=>{document.getElementById(cardFields[i]).textContent=result.card[key];});card.hidden=false;
   frame.removeAttribute('src');frame.remove();
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!current())return;clearTimeout(deadline);report.outcome='success';report.totalToCardMs=Math.round(performance.now());status.textContent='本人カードを表示しました。入口の読み込みから '+(report.totalToCardMs/1000).toFixed(2)+'秒';refresh();
   }));
  }catch(error){if(current())entryFailure(error);}
 });
 function stop(){if(active){report.background=true;fail('interrupted','画面を閉じたため計測を終了しました。もう一度計測できます。');}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);window.addEventListener('pageshow',e=>{if(e.persisted)stop();});
 window.addEventListener('storage',e=>{if(active&&(e.key===null||e.key==='iec.board.pwa.gasUrl.v1'||e.key===KEY))fail('identity-changed','登録情報が変わりました。通常の業務アプリで確認してから開き直してください。');});
 document.getElementById('copyReport').onclick=async()=>{refresh();try{await navigator.clipboard.writeText(output.value);document.getElementById('copyStatus').textContent='計測結果をコピーしました。';}catch{output.focus();output.select();document.getElementById('copyStatus').textContent='選択した結果をコピーしてください。';}};
 document.getElementById('retry').onclick=()=>location.reload();
 clearCard();refresh();
 deadline=setTimeout(()=>{if(active)fail('TIMEOUT','試作から応答がありませんでした。追加ファイルの反映を確認し、通常の業務アプリを利用してください。');},60000);
 (async()=>{
  try{
   const store=await checkConnection();report.connectionReadyMs=Math.round(performance.now());
   const saved=await readTicket(store);if(!current())return;
   revision=saved.revision;report.ticketReadyMs=Math.round(performance.now());report.outcome='verifying';
   status.textContent='本人確認と最新の行先を取得しています…';submit(saved.ticket);refresh();
  }catch(error){if(current())entryFailure(error);}
 })();
})();
