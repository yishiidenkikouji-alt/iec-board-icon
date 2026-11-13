/* D4: local-only connection and startup timing diagnostics. Never export tickets, revisions, URLs,
 * names, codes, or arbitrary error messages. This module only writes a separate
 * timestamp on an explicit test; device storage reports redacted status codes. */
(function(){
  'use strict';
  const ROOT=new URL('./',location.href);
  if(window.top!==window||ROOT.origin!=='https://yishiidenkikouji-alt.github.io'||ROOT.pathname!=='/iec-board-icon/board-pwa/')return;
  const VERSION='2026.11.13-D14',URL_KEY='iec.board.pwa.gasUrl.v1';
  const PREFIX='iec.entry.resume.v1:'+ROOT.pathname+':';
  const TEST_KEY='iec.entry.diagnostic.v1:'+ROOT.pathname;
  const EXPECTED='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
  const labels={waiting:'接続待ち',prepared:'復元の通信準備済み',unavailable:'復元の通信準備に失敗',empty:'保存データなしをGASへ通知',sent:'保存データをGASへ渡しました（検証結果は未確認）',readError:'保存データを読み出せませんでした',saved:'本人確認用データの保存・読み戻し成功',removed:'GASの要求で本人確認用データを解除',conflict:'別画面での変更と競合し保存を中止',writeError:'本人確認用データの保存・解除に失敗'};
  let stage='waiting',connectionSave='この起動中は未実施',testResult='未実施',panel=null,output=null,lastFocus=null;
  let bridgeStatus='waiting';
  // Use one parent-page clock; no URL, nonce, ticket or child clock is recorded.
  const fallbackStart=Date.now();
  function now(){try{if(window.performance&&typeof window.performance.now==='function')return window.performance.now();}catch(ignore){}return Date.now()-fallbackStart;}
  const timing={entryScript:now(),connectionStart:null,connectionReady:null,frameStart:null,gasHello:null,ticketReady:null,attempt:0,hidden:false};
  function launch(code){
    if(!['connection-start','connection-ready','frame-start','gas-hello','ticket-ready'].includes(code))return;
    const at=now();if(!Number.isFinite(at)||at<0)return;
    if(code==='connection-start'){timing.connectionStart=at;timing.connectionReady=null;}
    else if(code==='connection-ready'){if(timing.connectionStart!==null&&timing.connectionReady===null)timing.connectionReady=at;}
    else if(code==='frame-start'){timing.frameStart=at;timing.gasHello=null;timing.ticketReady=null;timing.attempt++;timing.hidden=!!document.hidden;}
    else if(code==='gas-hello'){if(timing.frameStart!==null&&timing.gasHello===null)timing.gasHello=at;}
    else if(timing.gasHello!==null&&timing.ticketReady===null)timing.ticketReady=at;
    refresh();
  }
  document.addEventListener('visibilitychange',function(){if(document.hidden&&timing.frameStart!==null&&timing.ticketReady===null)timing.hidden=true;});
  function seconds(start,end){return start!==null&&end!==null&&end>=start?((end-start)/1000).toFixed(2)+'秒':'未計測';}
  // A fixed numeric projection accompanies the existing, validated ready reply.
  // No extra messages, requests or storage; never export the diagnostic text.
  function timingForApp(){
    const safe=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=3600000?Math.round(v):null;
    const span=(a,b)=>a!==null&&b!==null&&b>=a?safe(b-a):null;
    return {version:'D5-ENTRY-1',entryScriptMs:safe(timing.entryScript),connectionCheckMs:span(timing.connectionStart,timing.connectionReady),frameStartMs:safe(timing.frameStart),frameToHelloMs:span(timing.frameStart,timing.gasHello),restoreReadMs:span(timing.gasHello,timing.ticketReady),ticketReadyMs:safe(timing.ticketReady),attempt:timing.attempt,background:timing.hidden};
  }
  function transportRowsP082(){let r={};try{r=window.IecEntryPostP082?window.IecEntryPostP082.report():{};}catch(ignore){}return ['起動方式：'+({combined:'画面と本人確認を一括取得',fallback:'従来の起動へ切替',normal:'従来の起動'}[r.path]||'確認中'),'入口から利用準備：'+(Number.isFinite(r.homeMs)?(r.homeMs/1000).toFixed(2)+'秒':'未計測'),'入口から本人カード：'+(Number.isFinite(r.cardMs)?(r.cardMs/1000).toFixed(2)+'秒':'未計測')];}
  function deliveryRowsP083(){
    let r={};try{r=window.IecEntryDeliveryP083?window.IecEntryDeliveryP083.report():{};}catch(ignore){}
    return ['分割配信の要求：'+({assets:'あり',inline:'なし','not-started':'未開始'}[r.request]||'未確認'),
      'GASからの分割配信対応通知：'+(r.advertised===true?'対応':r.advertised===false?'非対応':'未受信'),
      '従来配信への切替：'+({resource:'ファイル読み込み失敗',timeout:'応答待ち上限'}[r.fallback]||'なし')];
  }
  function timingRows(){return ['【入口の待ち時間 D9】',
    '画面の読み込み回数：'+timing.attempt+'回',
    '入口のスクリプト開始（入口の読み込みから）：'+seconds(0,timing.entryScript),
    '接続先の端末確認：'+seconds(timing.connectionStart,timing.connectionReady),
    '画面読み込み開始（入口の読み込みから）：'+seconds(0,timing.frameStart),
    'Google側の画面準備・通信：'+seconds(timing.frameStart,timing.gasHello),
    '保存情報の読み出し・受け渡し準備：'+seconds(timing.gasHello,timing.ticketReady),
    '保存情報の受け渡し準備完了（入口の読み込みから）：'+seconds(0,timing.ticketReady),
    '計測中のバックグラウンド移行：'+(timing.hidden?'あり（閉じていた時間を含む可能性）':'なし'),
    '※入口の読み込み開始から計測します。アイコンを押してからブラウザーが起動する時間は含みません。',
    '※一括取得では、Google側の画面準備・通信に本人確認とカード取得も含みます。入口からの表示時間で比較してください。'];}
  const storageLabels={
    backup:{migrationError:'通常保存は確認済み・予備保存に失敗',checking:'確認中',empty:'なし',ready:'あり・形式確認済み（有効性はGASで確認）',migrated:'従来の保存から移行済み',recovered:'予備保存から復元',saved:'保存・読み戻し成功',removed:'登録解除済み（古い情報の復元を停止）',mirrorError:'予備保存は確認済み・通常保存に失敗',error:'読み書き失敗（未登録とは判定していません）',unsupported:'非対応・通常保存のみ'},
    protection:{unchecked:'未確認',checking:'確認中',granted:'有効',denied:'未許可（ブラウザーによる判断）',unsupported:'非対応',error:'確認できません'},
    connection:{saved:'端末の保存設定',backup:'端末の予備保存',common:'会社の共通設定',empty:'接続先なし',error:'予備保存の確認に失敗'}
  };
  const storageState={backup:'checking',protection:'unchecked',connection:'empty'};
  const floating=document.createElement('button');floating.type='button';floating.id='connectionDiagnosticLauncherD3';floating.textContent='接続診断 D14';floating.setAttribute('aria-haspopup','dialog');
  // Reserve space outside the application frame. A fixed bottom launcher covered
  // the talk submit button, especially when its composer wrapped on a phone.
  floating.style.cssText='min-height:44px;padding:9px 12px;border:1px solid #52687c;border-radius:10px;background:#fff;color:#203040;font:14px/1.4 system-ui,sans-serif;';
  const launcherDock=document.createElement('div'),entryBar=document.getElementById('entryBar');
  launcherDock.id='connectionDiagnosticDockD14';
  launcherDock.style.cssText='order:-1;flex:0 0 auto;display:flex;justify-content:flex-end;padding:2px max(8px,env(safe-area-inset-right,0px)) 2px max(8px,env(safe-area-inset-left,0px));background:#eceff1;';
  floating.onclick=open;launcherDock.appendChild(floating);document.body.appendChild(launcherDock);
  function launcherVisibility(){launcherDock.hidden=!!(entryBar&&!entryBar.hidden)||(bridgeStatus==='ready'&&!(window.IEC_PWA_CONFIG||{}).nativeP086OptIn);}
  if(entryBar)new MutationObserver(launcherVisibility).observe(entryBar,{attributes:true,attributeFilter:['hidden']});
  launcherVisibility();
  function normalise(value){try{const u=new URL(String(value||'').trim());if(u.protocol!=='https:'||u.hostname!=='script.google.com'||u.port||u.username||u.password||!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(u.pathname))return '';return u.origin+u.pathname.replace(/\/$/,'');}catch(e){return '';}}
  function ticketStatus(url){
    if(!url)return '接続先がないため未確認';
    try{const raw=localStorage.getItem(PREFIX+url);if(!raw)return 'なし';
      let d;try{d=JSON.parse(raw);}catch(e){return 'あり・形式不正';}
      if(d&&d.v===1&&/^[a-f0-9]{64}$/.test(d.revision)&&d.removed===true&&d.ticket==='')return '登録解除済み';
      return d&&d.v===1&&/^[a-f0-9]{64}$/.test(d.revision)&&typeof d.ticket==='string'&&d.ticket.length<=2000&&/^iec-resume-v1\.[A-Za-z0-9_-]{50,1600}\.[A-Za-z0-9_-]{43}$/.test(d.ticket)?'あり・形式確認済み（有効性は未確認）':'あり・形式不正';
    }catch(e){return '読み出し失敗';}
  }
  function marker(){try{const raw=localStorage.getItem(TEST_KEY);if(raw===null)return 'なし（未実施または保持されていません）';const d=JSON.parse(raw);return d&&d.v===1&&Number.isSafeInteger(d.at)&&d.at>0&&d.at<8640000000000000?new Date(d.at).toISOString():'形式不正';}catch(e){return '読み出し失敗';}}
  function snapshot(){
    let saved='',savedState='なし';
    try{const raw=localStorage.getItem(URL_KEY);saved=normalise(raw);savedState=saved?'あり':raw?'あり・形式不正':'なし';}catch(e){savedState='読み出し失敗';}
    const configured=normalise((window.IEC_PWA_CONFIG||{}).gasUrl),url=saved||configured;
    let others='未確認';try{let count=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(PREFIX)&&k!==PREFIX+url)count++;}others=String(count)+'件';}catch(e){others='読み出し失敗';}
    return {saved:savedState,source:saved?'端末の保存設定':configured?'共通設定':'接続先なし',match:url?(url===EXPECTED?'管理者提示のURLと一致':'管理者提示のURLと異なる'):'未設定',ticket:ticketStatus(url),other:others,marker:marker()};
  }
  const startedAt=new Date().toISOString(),startup=snapshot();
  function rows(s){return ['接続先の端末保存：'+s.saved,'接続先の選択元：'+s.source,'接続先の照合：'+s.match,'本人確認用データ：'+s.ticket,'別の接続先の保存データ：'+s.other,'保存テストの記録：'+s.marker];}
  function report(){
    const frame=document.getElementById('boardFrame');let frameState='未設定';
    try{const url=frame&&frame.src;frameState=url?(normalise(url)===EXPECTED?'管理者提示のURLと一致':'設定あり・別の接続先または形式'):'未設定';}catch(e){frameState='確認できません';}
    const ua=navigator.userAgent||'',chrome=/Chrome\/([\d.]+)/.exec(ua),android=/Android\s+([\d.]+)/.exec(ua);
    return ['接続診断 '+VERSION,'入口版：'+String((document.getElementById('entryVersion')||{}).textContent||'未確認'),'端末保持版：'+String((document.getElementById('entrySessionVersion')||{}).textContent||'未確認'),'起動日時：'+startedAt,'確認日時：'+new Date().toISOString(),'起動方法：'+((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true?'ホーム画面アプリ':'ブラウザー'),'環境：'+(android?'Android '+android[1]:/iPhone|iPad|iPod/.test(ua)?'iOS系':'その他')+(chrome?' / Chrome '+chrome[1]:''),'通信状態：'+(navigator.onLine===false?'オフライン':'オンライン表示（GAS接続の保証ではありません）'),'',...transportRowsP082(),...deliveryRowsP083(),...timingRows(),'','【起動時】',...rows(startup),'','【現在】',...rows(snapshot()),'表示先：'+frameState,'復元連携：'+labels[stage],'件数連携状態：'+bridgeStatus,'接続先の保存操作：'+connectionSave,'今回の保存テスト：'+testResult,'本人確認の予備保存：'+storageLabels.backup[storageState.backup],'自動削除の抑制：'+storageLabels.protection[storageState.protection],'接続先の復元元：'+storageLabels.connection[storageState.connection],'','※保存データがあっても、本人確認の成功を意味しません。','※この診断は自動送信しません。利用者コード・認証情報・氏名・URLは含めていません。'].join('\n');
  }
  function refresh(){if(output)output.value=report();}
  window.IecConnectionDiagnosticsD1=Object.freeze({
    launch:launch,
    timingForApp:timingForApp,
    storage:function(kind,code){if(storageLabels[kind]&&Object.prototype.hasOwnProperty.call(storageLabels[kind],code)){storageState[kind]=code;refresh();}},
    session:function(code){if(Object.prototype.hasOwnProperty.call(labels,code)){stage=code;refresh();}},
    bridge:function(status){if(['waiting','ready','unavailable','reset','no-user'].includes(status)){bridgeStatus=status;launcherVisibility();refresh();}},
    connection:function(ok){connectionSave=ok===true?'保存・読み戻し成功':'保存または読み戻しに失敗';refresh();}
  });
  function open(){
    if(!panel){
      panel=document.createElement('dialog');panel.id='connectionDiagnosticD1';panel.setAttribute('aria-label','接続診断');
      panel.style.cssText='box-sizing:border-box;width:calc(100% - 24px);max-width:620px;max-height:90dvh;overflow:auto;border:1px solid #b9c8d5;border-radius:12px;background:#fff;color:#203040;padding:18px;font:15px/1.6 system-ui,sans-serif;';
      const h=document.createElement('h2');h.textContent='接続診断 D14';h.style.margin='0 0 8px';panel.appendChild(h);
      if(window.IecNativeP086&&typeof window.IecNativeP086.diagnostics==='function'){
        const copy=document.createElement('button');copy.type='button';copy.textContent='今回の起動診断をコピー';copy.style.cssText='padding:10px 12px;min-height:44px;font:inherit;';
        copy.onclick=async function(){
          const current=window.IecNativeP086.diagnostics();
          if(!current){status.textContent='今回の新しい起動方式の記録はありません。「結果をコピー」で接続診断を共有してください。';return;}
          const text=JSON.stringify(current,null,2);output.value=text;
          try{await navigator.clipboard.writeText(text);status.textContent='今回1回分の起動診断をコピーしました。そのまま貼り付けて送ってください。';}
          catch(ignore){output.focus();output.select();status.textContent='選択した今回の起動診断をコピーしてください。';}
        };
        panel.appendChild(copy);
      }
      if((window.IEC_PWA_CONFIG||{}).nativeP086OptIn===true&&window.IecNativeP086){
        const native=window.IecNativeP086,description=document.createElement('p'),choice=document.createElement('button'),notice=document.createElement('p');
        description.textContent='起動方式の切り替え：利用を案内された端末で設定してください。設定は次回起動から適用されます。';
        choice.type='button';choice.id='nativeStartupChoiceP086';choice.style.cssText='padding:10px 12px;min-height:44px;font:inherit;';
        const label=()=>{choice.textContent=native.selected()?'通常の起動方式に戻す':'新しい起動方式を使う';};
        label();notice.setAttribute('role','status');
        choice.onclick=function(){try{const on=native.choose(!native.selected());label();notice.textContent=(on?'新しい起動方式を設定しました。':'通常の起動方式に設定しました。')+'入力中の内容を保存してから、アプリを閉じて、いつものアイコンから開き直してください。';}catch(ignore){notice.textContent='起動方式を保存できませんでした。現在の画面で操作を続けられます。';}};
        panel.appendChild(description);panel.appendChild(choice);panel.appendChild(notice);
      }
      const info=document.createElement('p');info.textContent='最初に結果をコピーしてください。保存テストは確認用の日時だけを保存します。テスト後にアプリを閉じて開き直すと、記録が残るか確認できます。登録情報は変更しません。';panel.appendChild(info);
      output=document.createElement('textarea');output.readOnly=true;output.setAttribute('aria-label','共有用の診断結果');output.style.cssText='box-sizing:border-box;width:100%;height:42vh;min-height:180px;font:14px/1.6 system-ui,sans-serif;color:#203040;background:#f4f7fa;';panel.appendChild(output);
      const status=document.createElement('p');status.setAttribute('role','status');panel.appendChild(status);
      function button(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='margin:4px;padding:10px 12px;min-height:44px;font:inherit;';b.onclick=fn;panel.appendChild(b);return b;}
      button('結果をコピー',async function(){refresh();try{await navigator.clipboard.writeText(output.value);status.textContent='診断結果をコピーしました。管理者へ貼り付けて送ってください。';}catch(e){output.focus();output.select();status.textContent='コピーできませんでした。選択した文字をコピーするか、この画面のスクショを送ってください。';}});
      button('保存テスト',function(){
        try{const text=JSON.stringify({v:1,at:Date.now()});localStorage.setItem(TEST_KEY,text);testResult=localStorage.getItem(TEST_KEY)===text?'書き込み・読み戻し成功':'書き込み後の内容が一致しません';}catch(e){testResult='書き込み・読み戻し失敗';}
        refresh();status.textContent=testResult==='書き込み・読み戻し成功'?'テスト成功。結果を控えてから、アプリを閉じて開き直し「起動時」の保存テスト記録を確認してください。':testResult;
      });
      button('結果を更新',refresh);
      button('閉じる',function(){panel.close();if(lastFocus&&lastFocus.isConnected)lastFocus.focus();});
      document.body.appendChild(panel);
    }
    lastFocus=document.activeElement;refresh();if(!panel.open)panel.showModal();
  }
  // Accessible before GAS/identity is available; also retained in connection settings.
  [document.getElementById('entryBar'),document.getElementById('startGuide'),document.getElementById('connectionDetails')].forEach(function(parent){
    if(!parent)return;const b=document.createElement('button');b.type='button';b.textContent='接続診断';b.style.cssText='font:inherit;padding:8px 10px;min-height:44px;';b.onclick=open;parent.appendChild(b);
  });
})();


