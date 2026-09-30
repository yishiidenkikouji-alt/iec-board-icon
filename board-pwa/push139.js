/* iPhone/Android Web Push registration. Credentials stay in the GAS frame. */
(function(){
 'use strict';
 const transport=window.IecPushTransport139,ROOT=new URL('./',location.href);
 if(!transport||window.top!==window)return;
 const panel=document.createElement('section');panel.id='pushSettings139';
 panel.innerHTML='<h3>🔔 通知</h3><p id="pushStatus139" role="status">通知設定を確認しています。</p><div class="buttons"><button type="button" id="pushEnable139">通知を有効にする</button><button type="button" id="pushTest139">テスト通知を送る</button><button type="button" id="pushStop139">この端末の通知を停止</button></div><p class="small">新しい未読、または要対応の件数が増えたときに通知します。自動確認は約5分ごとです。音はiPhoneの消音・集中モード・通知設定に従います。</p><p id="pushAdminHelp139" class="small" hidden>最初の1回だけ、システム管理者が会社共通の自動送信を開始してください。</p><div class="buttons"><button type="button" id="pushSetup139" hidden>通知の初回設定・自動送信を開始</button></div><p id="pushResult139" role="status" aria-live="polite"></p>';
 const header=document.querySelector('#settingsSheet .sheet-heading');header.insertAdjacentElement('afterend',panel);
 const el=id=>document.getElementById(id);let info=null,busy=false,checked=false,refreshing=null,epoch=0;
 function standalone(){return !!navigator.standalone||matchMedia('(display-mode: standalone)').matches;}
 function reason(){
  if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'この環境では通知を利用できません。iPhoneはiOS 16.4以降で、ホーム画面に追加したアイコンから開いてください。';
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios&&!standalone())return 'Safariの共有メニューから「ホーム画面に追加」し、そのアイコンから開いてください。';return '';
 }
 function status(){
  const why=reason(),permission='Notification' in window?Notification.permission:'unavailable';
  el('pushStatus139').textContent=why||!transport.connected()?'業務アプリとの接続を確認してください。':!info?'通知設定を確認しています。':!info.active?'会社共通の通知送信が未設定です。':info.enabled?'この端末の通知：有効'+(info.lastError?' ／ '+info.lastError:''):'この端末の通知：停止中';
  if(why)el('pushStatus139').textContent=why;
  if(!why&&permission==='denied')el('pushStatus139').textContent='通知が拒否されています。iPhoneの「設定 → 通知 → 業務アプリ」で通知を許可してください。';
  el('pushEnable139').disabled=busy||!!why||!info||!info.active||!transport.connected();
  el('pushTest139').disabled=busy||!!why||!info||!info.enabled||permission!=='granted'||!transport.connected();
  el('pushStop139').disabled=busy||!!why;
  el('pushSetup139').hidden=!(info&&info.canSetup&&!info.active);el('pushAdminHelp139').hidden=el('pushSetup139').hidden;el('pushSetup139').disabled=busy;
 }
 function note(s){el('pushResult139').textContent=String(s||'');}
 function bytes(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
 function b64(a){let s='';a.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function random(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');}
 async function worker(){
  let timer;try{return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('通知の準備が完了していません。入口全体を開き直してください。')),12000);})]);}finally{clearTimeout(timer);}
 }
 async function localChannel(channel){
  const reg=await worker();if(reg.scope!==ROOT.href||!reg.active)throw new Error('通知の入口を確認してください。');
  return new Promise((resolve,reject)=>{const ports=new MessageChannel(),timer=setTimeout(()=>{ports.port1.close();reject(new Error('通知の入口が旧版です。アプリを開き直してください。'));},6000);ports.port1.onmessage=e=>{clearTimeout(timer);ports.port1.close();e.data&&e.data.ok?resolve():reject(new Error('端末に通知設定を保存できません。'));};reg.active.postMessage({type:'push-channel139',channel:channel},[ports.port2]);});
 }
 async function syncLocal(value){
  if(reason())return;
  const reg=await worker(),sub=await reg.pushManager.getSubscription();
  const hash=sub?b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint)))):'';
  const valid=value.enabled&&sub&&hash===value.endpointHash&&Notification.permission==='granted';
  await localChannel(valid?value.channel:'');value.enabled=!!valid;if(valid)await transport.usePush(true);
 }
 async function refresh(){
  if(refreshing)return refreshing;
  const generation=epoch;
  refreshing=(async()=>{try{const value=await transport.request('status');if(generation!==epoch)return;await syncLocal(value);if(generation!==epoch)return;info=value;checked=true;status();}catch(e){if(generation===epoch){note(e.message||e);status();}}finally{refreshing=null;}})();return refreshing;
 }
 async function act(fn){if(busy)return;busy=true;status();note('処理しています…');try{await fn();}catch(e){note(e.message||e);}finally{busy=false;status();}}
 el('pushSetup139').onclick=()=>act(async()=>{
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  let material={privateKey:(await crypto.subtle.exportKey('jwk',pair.privateKey)).d,seed:b64(crypto.getRandomValues(new Uint8Array(32)))};
  try{info=await transport.request('setup',material);note('自動送信を開始しました。次に「通知を有効にする」を押してください。');}finally{material=null;}
 });
 el('pushEnable139').onclick=function(){
  // Request OS permission synchronously in the direct tap, before network/SW awaits.
  if(busy)return;const why=reason();if(why){note(why);return;}
  let permission;try{permission=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();}catch(e){note(e.message||e);return;}
  return act(async()=>{
   if(await permission!=='granted')throw new Error('通知が許可されていません。iPhoneの通知設定を確認してください。');
   if(!info||!info.active)throw new Error('先に会社共通の初回設定を完了してください。');
   const reg=await worker(),key=bytes(info.publicKey);let sub=await reg.pushManager.getSubscription();
   if(sub&&sub.options&&sub.options.applicationServerKey&&b64(new Uint8Array(sub.options.applicationServerKey))!==info.publicKey){await sub.unsubscribe();sub=null;}
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   const channel=random();await localChannel(channel);
   try{info=await transport.request('subscribe',{subscription:sub.toJSON(),channel:channel});await syncLocal(info);}catch(e){await refresh();throw e;}
   note('通知を有効にしました。「テスト通知を送る」で確認できます。登録前からある未読は繰り返し通知しません。');
  });
 };
 el('pushTest139').onclick=()=>act(async()=>{const result=await transport.request('test');note(result.message);});
 el('pushStop139').onclick=()=>act(async()=>{
  const reg=await worker(),sub=await reg.pushManager.getSubscription();await localChannel('');if(sub)await sub.unsubscribe();if(info)info.enabled=false;
  try{await transport.request('unsubscribe');note('この端末の通知を停止しました。');}catch(e){note('端末の通知は停止しました。サーバーの停止確認は、接続後にもう一度押してください。');}
 });
 window.addEventListener('iec-push-settings139',()=>{status();void refresh();});
 window.addEventListener('iec-push-ready139',()=>{if(!checked&&!busy)void refresh();});
 window.addEventListener('iec-push-reset139',()=>{epoch++;info=null;checked=false;status();if(!reason())void localChannel('').catch(()=>{});});
 navigator.serviceWorker&&navigator.serviceWorker.addEventListener('message',event=>{if(event.data&&event.data.type==='push-open139')transport.refresh();});
 status();
})();
