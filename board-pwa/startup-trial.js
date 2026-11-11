/* Public launcher only. Must be under the EXISTING /board-pwa/ origin/path.
 * Target remains disabled until Hosting ownership/deployment is verified.
 * Never accept a target URL or ticket via query/hash/config supplied by a user.
 */
(function(){
 'use strict';
 const TRIAL_ORIGIN='https://ishii-board-p003-startup-p076.web.app'; // Set only after verifying the deployed site belongs to this project.
 const GAS_URL='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
 const ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
 if(window.top!==window||new URL('./',location.href).href!==ROOT)return;
 const APP='iec-startup-trial-p076',frame=document.getElementById('trialFrame'),status=document.getElementById('trialStatus'),output=document.getElementById('trialReport');
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 let active=true,page='',reading=false,sent=false,deadline=null;
 const report={version:'P076-ENTRY-1',at:new Date().toISOString(),entryScriptMs:Math.round(performance.now()),connectionReadyMs:null,frameStartMs:null,appHelloMs:null,ticketReadyMs:null,totalToCardMs:null,outcome:'preparing',background:!!document.hidden,timing:null};
 function refresh(){output.value=JSON.stringify(report,null,2);}
 function fail(code,message){report.outcome=code;status.textContent=message;active=false;clearTimeout(deadline);frame.hidden=true;frame.removeAttribute('src');refresh();}
 function current(){return active&&!document.hidden;}
 document.getElementById('copyReport').onclick=async()=>{refresh();try{await navigator.clipboard.writeText(output.value);document.getElementById('copyStatus').textContent='計測結果をコピーしました。';}catch{output.focus();output.select();document.getElementById('copyStatus').textContent='選択した結果をコピーしてください。';}};
 document.getElementById('retry').onclick=()=>location.reload();
 window.addEventListener('message',async function(event){
  const d=event.data;if(!current()||event.origin!==TRIAL_ORIGIN||event.source!==frame.contentWindow||!d||d.app!==APP||d.nonce!==nonce||!/^[a-f0-9]{32}$/.test(d.page||''))return;
  if(d.type==='hello'){
   if(sent||reading||page&&page!==d.page)return;page=d.page;reading=true;report.appHelloMs=Math.round(performance.now());
   try{
    const store=window.IecDeviceStorageD3;if(!store)throw Error('store');
    // Read the live canonical record; no cached ticket and no authentication bypass.
    if(await store.connection()!==GAS_URL||!current())throw Error('connection');
    const saved=await store.readTicket('iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS_URL,current);
    if(!current())return;if(!saved||!saved.ticket)throw Error('empty');
    sent=true;report.ticketReadyMs=Math.round(performance.now());report.outcome='verifying';refresh();
    frame.contentWindow.postMessage({app:APP,type:'ticket',nonce,page,ticket:saved.ticket},TRIAL_ORIGIN);
    status.textContent='本人確認と最新の行先を取得しています…';
   }catch{if(current())fail('entry-unavailable','この画面では保存済みの本人情報を確認できません。通常の業務アプリを開き、本人確認してから試してください。');}finally{reading=false;}
   return;
  }
  if(!sent||d.page!==page)return;
  if(d.type==='rendered'){
   clearTimeout(deadline);report.outcome='success';report.totalToCardMs=Math.round(performance.now());report.background=report.background||d.background===true;report.timing={};
   for(const k of ['appScriptMs','apiMs','appToCardMs','gatewayMs','gasTotalMs','identityAndCardMs','identityMs','cardMs']){const v=(d.timing||{})[k];report.timing[k]=typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=600000?Math.round(v):null;}
   status.textContent='本人カードを表示しました。入口の読み込みから '+(report.totalToCardMs/1000).toFixed(2)+'秒';refresh();
  }else if(d.type==='failed')fail(['NOT_ENABLED','ACCESS_DENIED','CARD_UNAVAILABLE','RATE_LIMIT','TIMEOUT'].includes(d.code)?d.code:'CONNECTION','試作の接続を完了できませんでした。計測結果をコピーし、通常の業務アプリを利用してください。');
 });
 function stop(){if(active){report.background=true;fail('interrupted','画面を閉じたため計測を終了しました。もう一度計測できます。');}}
 window.addEventListener('storage',event=>{if(active&&(event.key===null||event.key==='iec.board.pwa.gasUrl.v1'||event.key==='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS_URL))fail('identity-changed','別の画面で登録情報が変わりました。通常の業務アプリで確認してから開き直してください。');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);window.addEventListener('pageshow',e=>{if(e.persisted)stop();});
 refresh();
 (async()=>{
  if(!/^https:\/\/ishii-board-p003-startup-p076\.web\.app$/.test(TRIAL_ORIGIN)){fail('not-configured','試作は公開準備中です。通常の業務アプリを利用できます。');return;}
  try{if(!window.IecDeviceStorageD3||await window.IecDeviceStorageD3.connection()!==GAS_URL)throw Error('connection');if(!current())return;report.connectionReadyMs=Math.round(performance.now());report.frameStartMs=Math.round(performance.now());report.outcome='loading';frame.src=TRIAL_ORIGIN+'/startup-p076/?nonce='+nonce;frame.hidden=false;status.textContent='試作の画面を開いています…';deadline=setTimeout(()=>fail('TIMEOUT','接続に時間がかかっています。通常の業務アプリを利用してください。'),60000);refresh();}catch{fail('entry-unavailable','通常の業務アプリで本人確認してから試してください。');}
 })();
})();
