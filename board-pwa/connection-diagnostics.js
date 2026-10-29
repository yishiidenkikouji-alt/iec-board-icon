/* D2: local-only connection diagnostics. Never export tickets, revisions, URLs,
 * names, codes, or arbitrary error messages. Only the explicit test writes a
 * separate timestamp; existing connection and authentication data is read-only. */
(function(){
  'use strict';
  const ROOT=new URL('./',location.href);
  if(window.top!==window||ROOT.origin!=='https://yishiidenkikouji-alt.github.io'||ROOT.pathname!=='/iec-board-icon/board-pwa/')return;
  const VERSION='2026.10.29-D2',URL_KEY='iec.board.pwa.gasUrl.v1';
  const PREFIX='iec.entry.resume.v1:'+ROOT.pathname+':';
  const TEST_KEY='iec.entry.diagnostic.v1:'+ROOT.pathname;
  const EXPECTED='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
  const labels={waiting:'接続待ち',prepared:'復元の通信準備済み',unavailable:'復元の通信準備に失敗',empty:'保存データなしをGASへ通知',sent:'保存データをGASへ渡しました（検証結果は未確認）',readError:'保存データを読み出せませんでした',saved:'本人確認用データの保存・読み戻し成功',removed:'GASの要求で本人確認用データを解除',conflict:'別画面での変更と競合し保存を中止',writeError:'本人確認用データの保存・解除に失敗'};
  let stage='waiting',connectionSave='この起動中は未実施',testResult='未実施',panel=null,output=null,lastFocus=null;
  let bridgeStatus='waiting';
  const floating=document.createElement('button');floating.type='button';floating.id='connectionDiagnosticLauncherD2';floating.textContent='接続診断 D2';floating.setAttribute('aria-haspopup','dialog');
  floating.style.cssText='position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:2000;min-height:44px;padding:9px 12px;border:1px solid #52687c;border-radius:10px;background:#fff;color:#203040;box-shadow:0 2px 8px #0003;font:14px/1.4 system-ui,sans-serif;';
  floating.onclick=open;document.body.appendChild(floating);
  function normalise(value){try{const u=new URL(String(value||'').trim());if(u.protocol!=='https:'||u.hostname!=='script.google.com'||u.port||u.username||u.password||!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(u.pathname))return '';return u.origin+u.pathname.replace(/\/$/,'');}catch(e){return '';}}
  function ticketStatus(url){
    if(!url)return '接続先がないため未確認';
    try{const raw=localStorage.getItem(PREFIX+url);if(!raw)return 'なし';
      let d;try{d=JSON.parse(raw);}catch(e){return 'あり・形式不正';}
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
    try{const url=frame&&frame.getAttribute('src');frameState=url?(normalise(url)===EXPECTED?'管理者提示のURLと一致':'設定あり・別の接続先または形式'):'未設定';}catch(e){frameState='確認できません';}
    const ua=navigator.userAgent||'',chrome=/Chrome\/([\d.]+)/.exec(ua),android=/Android\s+([\d.]+)/.exec(ua);
    return ['接続診断 '+VERSION,'起動日時：'+startedAt,'確認日時：'+new Date().toISOString(),'起動方法：'+((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true?'ホーム画面アプリ':'ブラウザー'),'環境：'+(android?'Android '+android[1]:/iPhone|iPad|iPod/.test(ua)?'iOS系':'その他')+(chrome?' / Chrome '+chrome[1]:''),'通信状態：'+(navigator.onLine===false?'オフライン':'オンライン表示（GAS接続の保証ではありません）'),'','【起動時】',...rows(startup),'','【現在】',...rows(snapshot()),'表示先：'+frameState,'復元連携：'+labels[stage],'件数連携状態：'+bridgeStatus,'接続先の保存操作：'+connectionSave,'今回の保存テスト：'+testResult,'','※保存データがあっても、本人確認の成功を意味しません。','※この診断は自動送信しません。利用者コード・認証情報・氏名・URLは含めていません。'].join('\n');
  }
  function refresh(){if(output)output.value=report();}
  window.IecConnectionDiagnosticsD1=Object.freeze({
    session:function(code){if(Object.prototype.hasOwnProperty.call(labels,code)){stage=code;refresh();}},
    bridge:function(status){if(['waiting','ready','unavailable','reset','no-user'].includes(status)){bridgeStatus=status;floating.hidden=status==='ready';refresh();}},
    connection:function(ok){connectionSave=ok===true?'保存・読み戻し成功':'保存または読み戻しに失敗';refresh();}
  });
  function open(){
    if(!panel){
      panel=document.createElement('dialog');panel.id='connectionDiagnosticD1';panel.setAttribute('aria-label','接続診断');
      panel.style.cssText='box-sizing:border-box;width:calc(100% - 24px);max-width:620px;max-height:90dvh;overflow:auto;border:1px solid #b9c8d5;border-radius:12px;background:#fff;color:#203040;padding:18px;font:15px/1.6 system-ui,sans-serif;';
      const h=document.createElement('h2');h.textContent='接続診断 D2';h.style.margin='0 0 8px';panel.appendChild(h);
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
