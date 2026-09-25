/* IEC GitHub Pages entry: foreground badging + Android notification trial v3.
 * Configure only the GAS /exec URL in config.js. Nothing private belongs here.
 */
(function(){
  'use strict';
  const APP='iec-board-badge', PROTOCOL=1;
  const URL_KEY='iec.board.pwa.gasUrl.v1';
  const VERSION='2026.09.25-r29-android-settings-recovery';
  const ENTRY=new URL('./',window.location.href);
  const NOTIFY_KEY='iec.board.pwa.notifications:'+ENTRY.pathname;
  const NOTIFY_TAG=APP+':'+ENTRY.pathname+':snapshot';
  const el=id=>document.getElementById(id);
  const frame=el('boardFrame');
  const state={
    gasUrl:'',source:null,origin:'',pageId:'',session:'',sequence:0,
    count:null,updatedAt:0,status:'waiting',receivedAt:0,permissionBusy:false,
    testing:false,worker:'確認中',notice:'',badgeBusy:false,badgeDesired:null,
    badgeRevision:0,lastApplied:null,loadStarted:0,notifyEnabled:false,notifyLast:null
  };
  let lastFocus=null, closeReloadTimer=null;
  function randomId(){
    return Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
  }
  function normaliseUrl(value){
    try{
      const url=new URL(String(value||'').trim());
      if(url.protocol!=='https:'||url.hostname!=='script.google.com'||url.port||url.username||url.password)return '';
      if(!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(url.pathname))return '';
      // Do not import arbitrary query parameters, identities or credentials.
      return url.origin+url.pathname.replace(/\/$/,'');
    }catch(e){return '';}
  }
  function isStandalone(){return !!((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true);}
  function environment(){
    const android=/Android/i.test(navigator.userAgent||'') ||
      /^Android$/i.test(String(navigator.userAgentData&&navigator.userAgentData.platform||''));
    const ios=!android&&(/iPhone|iPad|iPod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
    const direct=typeof navigator.setAppBadge==='function';
    // Android may expose setAppBadge without updating the launcher icon.
    // Always use opt-in visible notifications on Android, even when that API exists.
    const mode=android?'notification':direct?'badge':'unsupported';
    let permission='unavailable';try{if('Notification' in window)permission=Notification.permission;}catch(e){}
    let reason='';
    if(!window.isSecureContext)reason='HTTPSで公開した入口を開いてください。';
    else if(window.top!==window)reason='この入口は別のページへ埋め込まず、直接開いてください。';
    else if(mode==='notification'){
      // Android can request notifications even when the numeric Badging API is absent.
      if(permission==='unavailable'||typeof Notification.requestPermission!=='function'||!('serviceWorker' in navigator))
        reason='このブラウザーでは通知を利用できません。AndroidのChromeで入口を直接開いてください。';
    }else if(!isStandalone())reason=ios?'Safariの共有メニューからこの入口をホーム画面に追加し、新しいアイコンから開いてください。':'ブラウザーのアプリのインストール機能で入口を追加し、そのアイコンから開いてください。';
    else if(!direct)reason='このブラウザー・OSではアイコンのバッジ更新APIを利用できません。画面内の件数は表示できます。';
    else if(ios&&permission==='unavailable')reason='この起動環境では通知の許可を取得できません。対応OSのホーム画面アイコンから開いてください。';
    return {ios:ios,android:android,mode:mode,needsPermission:ios||mode==='notification',permission:permission,supported:!reason,reason:reason};
  }
  function canApply(){
    const env=environment();
    return env.supported&&(!env.needsPermission||env.permission==='granted')&&(env.mode!=='notification'||state.notifyEnabled);
  }
  function setNotificationEnabled(enabled){
    state.notifyEnabled=!!enabled;
    try{localStorage.setItem(NOTIFY_KEY,enabled?'1':'0');}catch(e){}
  }
  async function publishNotification(count,testing,current){
    const registration=await navigator.serviceWorker.ready;
    if(!current()||!state.notifyEnabled||Notification.permission!=='granted')return;
    if(registration.scope!==ENTRY.href||typeof registration.showNotification!=='function')
      throw new Error('入口の通知準備が完了していません。入口を開き直してください。');
    const key=(testing?'test:':'actual:')+count;
    if(count===0){
      const shown=await registration.getNotifications({tag:NOTIFY_TAG});
      if(!current())return;
      shown.forEach(notification=>notification.close());state.notifyLast=key;return;
    }
    // One snapshot notification only. Do not re-post unchanged counts after dismissal.
    if(state.notifyLast===key)return;
    await registration.showNotification(testing?'行き先ボード：通知テスト':'行き先ホワイトボード',{
      body:testing?'通知の試験です（1件）。ホーム画面の通知ドットを確認してください。':'本人の要対応：'+count+'件（取得時点）。最新の内容はボードで確認してください。',
      tag:NOTIFY_TAG,icon:new URL('../whiteboard-icon.png',ENTRY).href,
      lang:'ja',silent:true,renotify:false,
      timestamp:testing?Date.now():(state.updatedAt||Date.now())
    });
    if(current())state.notifyLast=key;
  }
  async function stopNotifications(){
    if(environment().mode!=='notification')return;
    setNotificationEnabled(false);state.testing=false;state.badgeDesired=null;state.notifyLast=null;
    const revision=++state.badgeRevision;
    render();
    try{
      const registration=await navigator.serviceWorker.getRegistration(ENTRY.href);
      if(registration&&registration.scope===ENTRY.href){
        const shown=await registration.getNotifications({tag:NOTIFY_TAG});
        if(revision===state.badgeRevision&&!state.notifyEnabled)shown.forEach(notification=>notification.close());
      }
      notice('この入口からの件数通知を停止しました。ブラウザーの通知許可自体は変更していません。');
    }catch(e){notice('件数通知は停止しました。表示済みの通知は通知欄から消してください。');}
  }
  function notice(text){state.notice=String(text||'');el('actionStatus').textContent=state.notice;}
  function stale(){return !!state.updatedAt&&Date.now()-state.updatedAt>7*60*1000;}
  function render(){
    const env=environment(), ready=state.status==='ready'&&!stale();
    el('entryVersion').textContent=VERSION;
    el('launchMode').textContent=isStandalone()?'ホーム画面アプリ':'通常のブラウザー';
    el('permissionState').textContent=({granted:'許可済み',denied:'拒否（端末の設定を確認）',default:'未許可',unavailable:'この環境では利用できません'})[env.permission]||env.permission;
    el('workerState').textContent=state.worker;
    el('bridgeState').textContent=state.source?'接続済み'+(ready?'':'／最新件数を確認中'):state.gasUrl?'連携待ち（GAS用Indexの更新・利用者登録を確認）':'接続先URLが未設定';
    el('actualCount').textContent=state.count===null?'未取得':state.count+'件'+(!ready?'（最後の取得値）':'');
    el('receivedAt').textContent=state.receivedAt?new Date(state.receivedAt).toLocaleTimeString('ja-JP'):'—';
    const notificationMode=env.mode==='notification';
    if(notificationMode){
      el('environmentStatus').textContent=env.reason||'Androidは通知に連動する点などの表示です。アイコンの数字を要対応件数にそろえることは保証できません。'+(!isStandalone()?' ホーム画面から使う場合は、Chromeのメニューから入口をインストールしてください。':'');
    }else{
      el('environmentStatus').textContent=env.reason||(env.ios&&env.permission!=='granted'
        ? env.permission==='denied'?'端末の「設定 → 通知」で、この入口の通知とバッジを確認してください。':'この入口から通知を許可すると、ホーム画面のバッジ更新を試せます。'
        : '更新APIを利用できます。実際の数字の表示はホーム画面で確認してください。');
    }
    const help=el('androidNotificationHelp'),stop=el('stopNotificationsButton');
    if(help)help.hidden=!notificationMode;
    if(stop){stop.hidden=!notificationMode;stop.disabled=!state.notifyEnabled;}
    el('permissionButton').disabled=state.permissionBusy;
    el('permissionButton').textContent=state.permissionBusy?'許可を確認中…':notificationMode
      ? env.permission==='denied'?'通知設定の確認方法':state.notifyEnabled&&env.permission==='granted'?'実件数を通知へ反映':'通知を許可して有効にする'
      :canApply()?'実件数をバッジへ反映':'バッジを有効にする';
    el('testButton').textContent=notificationMode?'テスト通知を1件表示':'試験で「1」を表示';
    const testSummary=el('testSummary'),testHelp=el('testHelp'),testFoot=el('testFoot');
    if(testSummary)testSummary.textContent=notificationMode?'実機で通知を試す':'実機で数字を試す';
    if(testHelp)testHelp.textContent=notificationMode?'テスト通知を1件表示します。端末の通知欄とホーム画面の点などを確認してください。数字「1」が出る試験ではありません。':'「試験で1を表示」は実件数とは別です。ホーム画面へ戻り、新しいアイコンの「1」を確認してください。';
    if(testFoot)testFoot.textContent=notificationMode?'試験終了でテスト通知を消し、実件数を取得済みなら件数通知へ戻します。未取得なら通知を消します。':'試験中は実件数を受け取っても「1」を維持します。終了で実件数に戻り、未取得なら試験数字を消します。';
    el('refreshButton').disabled=!state.source;
    el('endTestButton').disabled=!state.testing;
    el('reloadBoardButton').disabled=!state.gasUrl;
    let label;
    if(state.testing)label=notificationMode?'試験中：通知1件（数字バッジではありません）':'試験中：アイコンに「1」';
    else if(ready)label='本人の要対応：'+state.count+'件';
    else if(state.status==='no-user'||state.status==='reset')label='利用者・件数を確認中';
    else if(state.count!==null)label='要対応：'+state.count+'件（再確認待ち）';
    else label=state.gasUrl?'本人の件数を待っています':'接続先を設定してください';
    el('countLabel').textContent=label;
  }
  function unlockBoard(){
    const board=el('boardArea');
    if(!board)return;
    try{board.inert=false;}catch(e){}
    board.removeAttribute('inert');
    board.removeAttribute('aria-hidden');
    board.style.pointerEvents='auto';
  }
  function openSettings(focusConnection){
    if(el('sheetBackdrop').hidden)lastFocus=document.activeElement;
    el('sheetBackdrop').hidden=false;
    const env=environment();
    if(env.android)unlockBoard();
    else el('boardArea').inert=true;
    const androidBack=el('androidBackToBoardBtn');
    if(androidBack)androidBack.hidden=!env.android;
    if(focusConnection)el('connectionDetails').open=true;
    render();el('settingsSheet').focus();
  }
  function closeSettings(){
    el('sheetBackdrop').hidden=true;
    unlockBoard();
    if(lastFocus&&lastFocus.isConnected)lastFocus.focus();
  }
  function validGoogleOrigin(origin){
    // GAS's user-code frame may be script.googleusercontent.com or
    // <generated>-script.googleusercontent.com. Reject null/opaque origins.
    return origin==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);
  }
  function isChildOfBoard(source){
    try{
      let cursor=source;
      for(let depth=0;depth<10&&cursor;depth++){
        if(cursor===frame.contentWindow)return true;
        if(cursor===window||cursor===cursor.parent)return false;
        cursor=cursor.parent;
      }
    }catch(e){}
    return false;
  }
  function send(type){
    if(!state.source)return;
    state.source.postMessage({app:APP,protocol:PROTOCOL,type:type,pageId:state.pageId,session:state.session},state.origin);
  }
  function queueBadge(count){
    if(!Number.isSafeInteger(count)||count<0||count>999999)return;
    state.badgeDesired=count;state.badgeRevision++;
    void flushBadge();
  }
  async function flushBadge(){
    if(state.badgeBusy||!canApply()||state.badgeDesired===null)return;
    state.badgeBusy=true;
    let seen=0;
    try{
      do{
        const count=state.badgeDesired;seen=state.badgeRevision;
        let timer,active=true;
        try{
          const notificationMode=environment().mode==='notification';
          const operation=notificationMode
            ?publishNotification(count,state.testing,()=>active&&seen===state.badgeRevision)
            :count===0&&typeof navigator.clearAppBadge==='function'?navigator.clearAppBadge():navigator.setAppBadge(count);
          await Promise.race([Promise.resolve(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('バッジ更新の応答を確認できません。アプリを開き直してください。')),8000);})]);
        }finally{active=false;clearTimeout(timer);}
        state.lastApplied=count;
      }while(seen!==state.badgeRevision&&canApply());
      if(seen!==state.badgeRevision||!canApply())return;
      if(environment().mode==='notification')notice('通知APIの処理が完了しました。端末の通知欄で確認してください。アイコンの点・数字は端末とホームアプリの設定により異なります。');
      else notice((state.testing?'試験の「1」':'件数')+'を更新APIへ送信しました。ホーム画面へ戻り、新しいアイコンで確認してください。');
    }catch(e){notice('バッジ更新を確認できません：'+String(e&&e.message||e));}
    finally{state.badgeBusy=false;render();}
  }
  function applyActual(){
    if(state.testing){queueBadge(1);return;}
    if(state.status==='ready'&&!stale()&&state.count!==null)queueBadge(state.count);
  }
  window.addEventListener('message',function(event){
    const data=event.data;
    if(!data||data.app!==APP||data.protocol!==PROTOCOL||typeof data.pageId!=='string'||!/^[a-f0-9]{32}$/.test(data.pageId))return;
    if(!validGoogleOrigin(event.origin)||!isChildOfBoard(event.source))return;
    if(data.type==='hello'){
      if(state.source!==event.source||state.pageId!==data.pageId||state.origin!==event.origin){
        state.source=event.source;state.origin=event.origin;state.pageId=data.pageId;state.session=randomId();state.sequence=0;
        state.status='waiting';state.count=null;state.updatedAt=0;state.receivedAt=0;
      }
      send('welcome');render();return;
    }
    if(event.source!==state.source||event.origin!==state.origin||data.session!==state.session||data.pageId!==state.pageId)return;
    if(data.type==='open-settings'){openSettings(false);return;}
    if(data.type!=='state'||!Number.isSafeInteger(data.sequence)||data.sequence<=state.sequence)return;
    if(!['waiting','ready','unavailable','reset','no-user'].includes(data.status))return;
    if(data.status==='ready'){
      if(!Number.isSafeInteger(data.count)||data.count<0||data.count>999999||!Number.isFinite(data.updatedAt)||data.updatedAt>Date.now()+60000||data.updatedAt<Date.now()-10*60*1000)return;
    }
    state.sequence=data.sequence;state.status=data.status;
    if(data.status==='reset'||data.status==='no-user'){
      state.count=null;state.updatedAt=0;state.receivedAt=0;state.testing=false;
      queueBadge(0); // Do not leave a former user's badge after a user change.
    }else if(data.status==='ready'){
      state.count=data.count;state.updatedAt=data.updatedAt;state.receivedAt=Date.now();applyActual();
    }
    render();
  });
  async function permissionOrUpdate(){
    if(state.permissionBusy)return;
    const env=environment();
    if(!env.supported){notice(env.reason);render();return;}
    if(env.needsPermission&&env.permission==='denied'){notice(env.mode==='notification'?'Chromeで入口を開き、サイトの権限 → 通知を確認してください。Android本体の設定 → アプリ → Chrome（または行き先ボード）→ 通知も確認してください。拒否済みの設定はこのボタンでは変更できません。':'端末の「設定 → 通知」で、この新しい入口の通知とバッジを許可してください。拒否済みの設定はこのボタンでは変更できません。');return;}
    if(env.needsPermission&&env.permission!=='granted'){
      state.permissionBusy=true;render();let timer;
      try{
        // Must run in this direct tap handler, before any awaited network or SW work.
        const request=Notification.requestPermission();
        const permission=await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('通知許可の応答待ちです。許可画面と起動方法を確認してください。')),15000);})]);
        if(permission!=='granted'){notice('通知は許可されていません。');return;}
      }catch(e){notice(String(e&&e.message||e));return;}
      finally{clearTimeout(timer);state.permissionBusy=false;render();}
    }
    if(env.mode==='notification'){setNotificationEnabled(true);state.notifyLast=null;render();}
    if(state.testing)queueBadge(1);
    else if(state.status==='ready'&&!stale())applyActual();
    else notice(env.mode==='notification'?'通知許可を確認しました。「実機で通知を試す」→「テスト通知を1件表示」で確認してください。GAS接続後は取得した件数を通知本文に表示します。':'通知許可を確認しました。まだ実件数を取得できていません。「件数を更新」または「試験で1を表示」で確認してください。');
  }
  function configureFrame(url){
    state.gasUrl=url;state.source=null;state.origin='';state.pageId='';state.session='';state.sequence=0;
    state.count=null;state.status='waiting';state.updatedAt=0;state.receivedAt=0;state.loadStarted=Date.now();
    frame.hidden=false;el('startGuide').hidden=true;frame.src=url;
    el('gasUrl').value=url;el('directLink').href=url;el('directLink').hidden=false;render();
    clearTimeout(closeReloadTimer);
    closeReloadTimer=setTimeout(()=>{
      if(!state.source){notice('GASから連携の応答がありません。GAS用Indexを更新・再デプロイ済みか、利用者登録やログインが表示されていないか確認してください。公開範囲は変更しないでください。');render();}
    },45000);
  }
  function resume(){
    if(document.hidden)return;
    if(environment().android)unlockBoard();
    if(state.source)send('refresh');
    render();
    if(state.testing)queueBadge(1);
  }
  el('settingsButton').onclick=()=>openSettings(false);
  el('connectButton').onclick=()=>openSettings(true);
  el('closeSettings').onclick=closeSettings;
  if(el('androidBackToBoardBtn'))el('androidBackToBoardBtn').onclick=closeSettings;
  el('sheetBackdrop').onclick=event=>{if(event.target===el('sheetBackdrop'))closeSettings();};
  document.addEventListener('keydown',event=>{
    if(el('sheetBackdrop').hidden)return;
    if(event.key==='Escape'){event.preventDefault();closeSettings();}
    if(event.key==='Tab'){
      const items=Array.from(el('settingsSheet').querySelectorAll('button:not(:disabled),a[href],input,summary,[tabindex="0"]')).filter(node=>node.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===el('settingsSheet'))){event.preventDefault();if(last)last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();if(first)first.focus();}
    }
  });
  el('permissionButton').onclick=permissionOrUpdate;
  if(el('stopNotificationsButton'))el('stopNotificationsButton').onclick=stopNotifications;
  el('refreshButton').onclick=()=>{send('refresh');notice('最新件数を要求しました。GASの応答を待っています。');};
  el('testButton').onclick=()=>{
    const env=environment();
    if(!canApply()){notice(env.reason||(env.mode==='notification'?'先に「通知を許可して有効にする」を押してください。':'先に「バッジを有効にする」で通知を許可してください。'));return;}
    state.testing=true;state.notifyLast=null;queueBadge(1);render();
  };
  el('endTestButton').onclick=()=>{
    state.testing=false;
    if(state.status==='ready'&&!stale())queueBadge(state.count);else queueBadge(0);
    if(state.source)send('refresh');render();
  };
  el('connectionForm').onsubmit=event=>{
    event.preventDefault();const url=normaliseUrl(el('gasUrl').value);
    if(!url){notice('script.google.comのウェブアプリURL（末尾 /exec）を入力してください。/dev や編集画面のURLは使用できません。');return;}
    try{localStorage.setItem(URL_KEY,url);}catch(e){notice('接続先を端末に保存できません。この画面を閉じると再入力が必要です。');}
    state.testing=false;queueBadge(0);configureFrame(url);closeSettings();
  };
  el('reloadBoardButton').onclick=()=>{if(state.gasUrl){configureFrame(state.gasUrl);closeSettings();}};
  document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);
  window.addEventListener('focus',()=>{render();});
  window.addEventListener('offline',()=>{notice('オフラインです。新しい件数は取得していません。');render();});
  window.addEventListener('online',resume);
  setInterval(render,15000); // Local status display only, not a server refresh.
  async function registerWorker(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext){state.worker='利用できません（前景のAPI試験とは別）';render();return;}
    try{await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});state.worker='入口のService Workerを登録済み';}
    catch(e){state.worker='登録未完了：'+String(e&&e.message||e);}
    render();
  }
  if(window.top!==window){el('startStatus').textContent='この入口は直接開いてください。';render();return;}
  let saved='';try{saved=localStorage.getItem(URL_KEY)||'';state.notifyEnabled=localStorage.getItem(NOTIFY_KEY)==='1';}catch(e){}
  const url=normaliseUrl(saved)||normaliseUrl((window.IEC_PWA_CONFIG||{}).gasUrl);
  if(url)configureFrame(url);
  else {el('startStatus').textContent='接続先の /exec URLを「接続先設定」で登録してください。バッジ単独の実機試験は、接続前でも実行できます。';render();}
  void registerWorker();
})();
