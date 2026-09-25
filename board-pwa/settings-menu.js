/* r28: one Settings entrance. UI messages only: no credentials, storage writes,
 * identities, grants, notification permissions, or application data are handled.
 * The existing r22 restart bridge and app.js badge implementation are unchanged.
 */
(function(){
  'use strict';
  const APP='iec-settings-menu-v1', VERSION='2026.09.25-r28';
  const ROOT=new URL('./',location.href),frame=document.getElementById('boardFrame');
  const button=document.getElementById('settingsButton');
  if(!frame||!button||window.top!==window||location.origin!=='https://yishiidenkikouji-alt.github.io'||ROOT.pathname!=='/iec-board-icon/board-pwa/')return;
  const nativeOpen=button.onclick;
  const state={nonce:'',page:'',source:null,origin:'',seq:0,pending:0,timer:null};
  function nativeSettings(){
    button.disabled=false;button.textContent='⚙ 設定';
    if(typeof nativeOpen==='function')nativeOpen.call(button);
  }
  function currentNonce(){
    try{
      const url=new URL(frame.src);
      if(url.origin!=='https://script.google.com'||!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(url.pathname))return '';
      const nonce=url.searchParams.get('iec_resume_nonce')||'';
      return /^[a-f0-9]{64}$/.test(nonce)?nonce:'';
    }catch(e){return '';}
  }
  function reset(){
    clearTimeout(state.timer);state.nonce=currentNonce();state.page='';state.source=null;state.origin='';state.pending=0;
    button.disabled=false;button.textContent='⚙ 設定';button.title='通知・バッジ・接続先の設定';
  }
  function belongs(source){
    try{for(let depth=0,cur=source;cur&&depth<10;depth++,cur=cur.parent){if(cur===frame.contentWindow)return true;if(cur===window||cur===cur.parent)return false;}}catch(e){}
    return false;
  }
  function allowed(origin){return origin==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);}
  function send(type,extra){
    if(state.source)state.source.postMessage(Object.assign({app:APP,type:type,nonce:state.nonce,page:state.page},extra||{}),state.origin);
  }
  window.addEventListener('message',function(event){
    const data=event.data,nonce=currentNonce();
    if(!data||data.app!==APP||!nonce||data.nonce!==nonce||!/^[a-f0-9]{32}$/.test(String(data.page||''))||!allowed(event.origin)||!belongs(event.source))return;
    if(state.nonce!==nonce)reset();
    if(data.type==='ready'){
      if(state.source&&(state.source!==event.source||state.origin!==event.origin))return;
      if(state.page!==data.page){clearTimeout(state.timer);state.pending=0;button.disabled=false;}
      state.source=event.source;state.origin=event.origin;state.page=data.page;
      button.title='この端末の利用者・通知・バッジ設定';
      send('ready-ack',{version:VERSION});return;
    }
    if(event.source!==state.source||event.origin!==state.origin||data.page!==state.page||data.type!=='open-result'||data.request!==state.pending||!state.pending)return;
    clearTimeout(state.timer);state.pending=0;button.disabled=false;button.textContent='⚙ 設定';
    if(data.status==='busy'){
      button.title='利用者を確認中です。読み込みが終わってから設定を開いてください。';
      button.textContent='確認中…';const seq=state.seq;
      setTimeout(function(){if(state.seq===seq&&!state.pending)button.textContent='⚙ 設定';},1500);
    }else if(data.status==='error')nativeSettings();
  });
  button.onclick=function(){
    if(state.pending)return;
    if(currentNonce()!==state.nonce)reset();
    if(!state.source){nativeSettings();return;}
    state.pending=++state.seq;const request=state.pending;
    button.disabled=true;
    state.timer=setTimeout(function(){if(state.pending===request){state.pending=0;nativeSettings();}},3000);
    send('open',{request:request});
  };
  new MutationObserver(function(){if(currentNonce()!==state.nonce)reset();}).observe(frame,{attributes:true,attributeFilter:['src']});
  reset();
  const version=document.getElementById('settingsMenuVersion');if(version)version.textContent=VERSION;
})();
