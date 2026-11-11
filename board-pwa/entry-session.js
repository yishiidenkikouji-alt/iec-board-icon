/* D4: read-only startup checks; D3 device storage stays authoritative.
 * localStorage remains a compatibility copy. Neither store leaves this origin.
 * Explicit removals are tombstones, so an older copy cannot resurrect a login.
 * A read error is never converted to an empty identity. GAS verifies every ticket.
 */
(function(){
  'use strict';
  const ROOT=new URL('./',location.href);
  if(window.top!==window||ROOT.origin!=='https://yishiidenkikouji-alt.github.io'||ROOT.pathname!=='/iec-board-icon/board-pwa/')return;
  const URL_KEY='iec.board.pwa.gasUrl.v1',PREFIX='iec.entry.resume.v1:'+ROOT.pathname+':';
  const CONNECTION='connection:'+ROOT.pathname,DB='iec-entry-store-d3';
  let protectionStarted=false;
  function diagnostic(kind,code){try{if(window.IecConnectionDiagnosticsD1)window.IecConnectionDiagnosticsD1.storage(kind,code);}catch(ignore){}}
  function error(code){const e=new Error(code==='conflict'?'別の画面で保存情報が変わりました。開き直して確認してください。':'端末の保存情報を確認できません。情報は消していません。アプリを開き直してください。');e.code=code;return e;}
  function normalise(value){try{const u=new URL(String(value||'').trim());if(u.protocol!=='https:'||u.hostname!=='script.google.com'||u.port||u.username||u.password||!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(u.pathname))return '';return u.origin+u.pathname.replace(/\/$/,'');}catch(e){return '';}}
  function validTicket(t){return typeof t==='string'&&t.length<=2000&&/^iec-resume-v1\.[A-Za-z0-9_-]{50,1600}\.[A-Za-z0-9_-]{43}$/.test(t);}
  function validate(row){
    if(!row||row.v!==1||!/^[a-f0-9]{64}$/.test(row.revision)||!(validTicket(row.ticket)&&!row.removed||row.ticket===''&&row.removed===true))throw error('format');
    return {v:1,revision:row.revision,ticket:row.ticket,...(row.removed?{removed:true}:{})};
  }
  function ticketKey(key){if(typeof key!=='string'||!key.startsWith(PREFIX)||key.length===PREFIX.length||normalise(key.slice(PREFIX.length))!==key.slice(PREFIX.length))throw error('key');}
  function localTicket(key){const text=localStorage.getItem(key);if(!text)return null;try{return validate(JSON.parse(text));}catch(e){throw error('format');}}
  function random(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
  function mirror(key,row){
    try{const text=JSON.stringify(row);if(localStorage.getItem(key)===text)return true;localStorage.setItem(key,text);if(localStorage.getItem(key)!==text)throw error('storage');return true;}catch(e){return false;}
  }
  function open(){return new Promise((resolve,reject)=>{
    let ended=false,request;
    const timer=setTimeout(()=>finish(error('timeout')),1800);
    function finish(failure,db){if(ended){if(db)db.close();return;}ended=true;clearTimeout(timer);failure?reject(failure):resolve(db);}
    try{
      request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{if(!ended)request.result.createObjectStore('records');else request.transaction.abort();};
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();finish(null,db);};
      request.onerror=()=>finish(error('storage'));
      request.onblocked=()=>finish(error('blocked'));
    }catch(e){finish(error('storage'));}
  });}
  async function transaction(key,work,current,mode='readwrite'){
    const db=await open();
    try{return await new Promise((resolve,reject)=>{
      let tx,result,failure,ended=false;
      const timer=setTimeout(()=>abort(error('timeout')),2500);
      function finish(e){if(ended)return;ended=true;clearTimeout(timer);e?reject(e):resolve(result);}
      function abort(e){failure=e;try{if(tx)tx.abort();}catch(ignore){}finish(e);}
      try{
        if(!current())throw error('navigation');
        if(mode==='readonly')tx=db.transaction('records','readonly');
        else try{tx=db.transaction('records','readwrite',{durability:'strict'});}catch(e){if(e.name!=='TypeError')throw e;tx=db.transaction('records','readwrite');}
        tx.onabort=()=>finish(failure||error('storage'));tx.onerror=()=>{failure=failure||error('storage');};
        tx.oncomplete=()=>finish(current()?null:error('navigation'));
        const store=tx.objectStore('records'),request=store.get(key);
        request.onsuccess=()=>{
          try{
            if(!current())throw error('navigation');
            function put(row){
              store.put(row,key);
              const verify=store.get(key);
              verify.onsuccess=()=>{if(!current())abort(error('navigation'));else if(JSON.stringify(verify.result)!==JSON.stringify(row))abort(error('storage'));};
            }
            result=work(request.result,put);
          }catch(e){abort(e.code?e:error('storage'));}
        };
      }catch(e){abort(e.code?e:error('storage'));}
    });}finally{db.close();}
  }
  function hasDb(){return typeof indexedDB!=='undefined';}
  async function protect(){
    if(protectionStarted)return;protectionStarted=true;
    try{
      if(!navigator.storage||!navigator.storage.persisted){diagnostic('protection','unsupported');return;}
      diagnostic('protection','checking');
      if(await navigator.storage.persisted()){diagnostic('protection','granted');return;}
      diagnostic('protection','checking');
      const ok=navigator.storage.persist?await navigator.storage.persist():false;
      diagnostic('protection',ok?'granted':'denied');
    }catch(e){diagnostic('protection','error');}
  }
  async function readTicket(key,current=()=>true){
    ticketKey(key);let recovered=false,migrated=false,legacyCandidate=null,backupFailed=false;
    try{
      let row;
      if(!hasDb()){row=localTicket(key);diagnostic('backup','unsupported');}
      else try{
        function existing(stored){const value=validate(stored);let local=null;try{local=localTicket(key);}catch(ignore){}recovered=!!value.ticket&&(!local||local.revision!==value.revision);return value;}
        const stored=await transaction(key,value=>value,current,'readonly');
        if(stored!==undefined)row=existing(stored);
        else if(!localTicket(key))row=null;
        else row=await transaction(key,(stored,put)=>{
          // Re-read inside the write transaction: a concurrent removal or newer
          // record must win over the compatibility copy used for migration.
          if(stored!==undefined)return existing(stored);
          const local=localTicket(key);if(local){legacyCandidate=local;put(local);migrated=true;}return local;
        },current);
      }catch(e){
        // A confirmed legacy ticket still works if only its initial backup write
        // fails. A failed read or an existing canonical record never uses this path.
        if(!legacyCandidate||e.code!=='storage'||!current())throw e;row=legacyCandidate;backupFailed=true;
      }
      if(!current())throw error('navigation');
      if(row){const copied=mirror(key,row);if(hasDb())diagnostic('backup',backupFailed?'migrationError':copied?(recovered?'recovered':migrated?'migrated':row.removed?'removed':'ready'):'mirrorError');if(row.ticket)void protect();}
      else if(hasDb())diagnostic('backup','empty');
      return row||{revision:'',ticket:''};
    }catch(e){if(e.code!=='navigation')diagnostic('backup','error');throw e;}
  }
  async function writeTicket(key,expected,ticket,current=()=>true){
    ticketKey(key);if(typeof expected!=='string'||!(ticket===''||validTicket(ticket)))throw error('format');
    const next={v:1,revision:random(),ticket,...(ticket===''?{removed:true}:{})};
    function change(old,put){const prior=old===undefined?localTicket(key):validate(old);if((prior?prior.revision:'')!==expected)throw error('conflict');put(next);return next;}
    try{
      if(hasDb())await transaction(key,change,current);
      else {if(!current())throw error('navigation');change(undefined,row=>{if(!mirror(key,row))throw error('storage');});}
      if(!current())throw error('navigation');
      const copied=mirror(key,next);diagnostic('backup',hasDb()?(copied?(ticket?'saved':'removed'):'mirrorError'):'unsupported');
      if(ticket)void protect();return next;
    }catch(e){if(e.code!=='navigation'&&e.code!=='conflict')diagnostic('backup','error');throw e;}
  }
  async function connection(){
    let local='';try{local=normalise(localStorage.getItem(URL_KEY));}catch(ignore){}
    const configured=normalise((window.IEC_PWA_CONFIG||{}).gasUrl);
    try{
      if(hasDb()){
        const row=await transaction(CONNECTION,value=>value,()=>true,'readonly');
        let url=row&&normalise(row.url);
        if(!url&&local)url=await transaction(CONNECTION,(latest,put)=>{const stored=latest&&normalise(latest.url);if(stored)return stored;put({v:1,url:local});return local;},()=>true);
        if(url){if(local!==url)try{localStorage.setItem(URL_KEY,url);}catch(ignore){}diagnostic('connection',local===url?'saved':'backup');return url;}
      }
    }catch(e){diagnostic('connection','error');}
    diagnostic('connection',local?'saved':configured?'common':'empty');return local||configured;
  }
  async function saveConnection(value){
    const url=normalise(value);if(!url)throw error('format');
    if(hasDb())await transaction(CONNECTION,(old,put)=>{put({v:1,url});return url;},()=>true);
    let copied=false;try{localStorage.setItem(URL_KEY,url);copied=localStorage.getItem(URL_KEY)===url;}catch(ignore){}
    if(!hasDb()&&!copied)throw error('storage');diagnostic('connection',copied?'saved':'backup');return url;
  }
  window.IecDeviceStorageD3=Object.freeze({readTicket,writeTicket,connection,saveConnection,protect});
})();

/* D3: first-party restart-ticket store. Public code only; private ticket values
 * are generated by GAS and stored on this device, never uploaded to GitHub.
 * Only the configured GAS iframe with a per-navigation nonce can use this store.
 */
(function(){
  'use strict';
  const APP='iec-device-resume-v1', VERSION='2026.11.11-D5';
  const ROOT=new URL('./',location.href), frame=document.getElementById('boardFrame');
  if(!frame||window.top!==window||location.origin!=='https://yishiidenkikouji-alt.github.io'||ROOT.pathname!=='/iec-board-icon/board-pwa/')return;
  const state={nonce:'',page:'',source:null,origin:'',key:'',lastSeq:0,generation:0};
  function diagnostic(code){try{if(window.IecConnectionDiagnosticsD1)window.IecConnectionDiagnosticsD1.session(code);}catch(ignore){}}
  function launch(code){try{if(window.IecConnectionDiagnosticsD1&&window.IecConnectionDiagnosticsD1.launch)window.IecConnectionDiagnosticsD1.launch(code);}catch(ignore){}}
  function random(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
  function setStatus(text){const el=document.getElementById('entrySessionStatus');if(el)el.textContent=text;}
  function validTicket(value){return typeof value==='string'&&value.length<=2000&&/^iec-resume-v1\.[A-Za-z0-9_-]{50,1600}\.[A-Za-z0-9_-]{43}$/.test(value);}
  let queue=Promise.resolve();
  function storage(){if(!window.IecDeviceStorageD3)throw new Error('端末保持の更新を読み込めませんでした。アプリを開き直してください。');return window.IecDeviceStorageD3;}
  function context(){const captured={...state};captured.current=()=>state.generation===captured.generation&&state.nonce===captured.nonce&&state.page===captured.page&&state.source===captured.source&&state.origin===captured.origin;return captured;}
  function enqueue(fn){queue=queue.then(fn,fn).catch(()=>{});}
  function allowedOrigin(origin){return origin==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);}
  function belongs(source){
    try{for(let depth=0,cur=source;cur&&depth<10;depth++,cur=cur.parent){if(cur===frame.contentWindow)return true;if(cur===window||cur===cur.parent)return false;}}catch(e){}
    return false;
  }
  function reply(c,type,body){if(c.current()&&c.source)c.source.postMessage(Object.assign({app:APP,type:type,nonce:c.nonce,page:c.page},body||{}),c.origin);}
  function prepare(value){
    diagnostic('waiting');
    state.generation++;state.nonce='';state.page='';state.source=null;state.origin='';state.lastSeq=0;state.key='';
    let url;try{url=new URL(String(value));}catch(e){return value;}
    if(url.protocol!=='https:'||url.hostname!=='script.google.com'||url.username||url.password||url.port||!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(url.pathname))return value;
    state.nonce=random();diagnostic('prepared');
    state.key='iec.entry.resume.v1:'+ROOT.pathname+':'+url.origin+url.pathname.replace(/\/$/,'');
    launch('frame-start');
    // A short-lived channel nonce, NOT an identity or a login credential.
    url.searchParams.set('iec_resume_nonce',state.nonce);
    setStatus('端末保持 D5：GASとの連携を確認中…');return url.href;
  }
  // Only this application's iframe is wrapped. The existing badge code and
  // saved /exec URL remain unchanged; native src getter/setter do navigation.
  try{
    const descriptor=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');
    if(!descriptor||!descriptor.get||!descriptor.set)throw new Error('src');
    Object.defineProperty(frame,'src',{configurable:true,get:function(){return descriptor.get.call(this);},set:function(value){descriptor.set.call(this,prepare(value));}});
  }catch(e){diagnostic('unavailable');setStatus('端末保持を準備できませんでした。ブラウザーを確認してください。');return;}
  window.addEventListener('message',function(event){
    const d=event.data;
    if(!d||d.app!==APP||!state.nonce||d.nonce!==state.nonce||!/^[a-f0-9]{32}$/.test(String(d.page||''))||!allowedOrigin(event.origin)||!belongs(event.source))return;
    if(d.type==='hello'){
      if(state.source&&(state.source!==event.source||state.origin!==event.origin))return;
      if(state.page!==d.page)state.lastSeq=0;
      state.source=event.source;state.origin=event.origin;state.page=d.page;
      launch('gas-hello');
      const c=context();
      enqueue(async function(){
        if(!c.current())return;
        try{const saved=await storage().readTicket(c.key,c.current);if(!c.current())return;diagnostic(saved.ticket?'sent':'empty');launch('ticket-ready');let startupTimingD5=null;try{const diag=window.IecConnectionDiagnosticsD1;if(diag&&diag.timingForApp)startupTimingD5=diag.timingForApp();}catch(ignore){}reply(c,'ready',{revision:saved.revision,ticket:saved.ticket,version:VERSION,startupTimingD5:startupTimingD5});setStatus(saved.ticket?'端末保持 D5：保存した利用者をGASで検証中…':'端末保持 D5：未保存（GASで本人を登録後に保存します）');}
        catch(e){if(!c.current())return;diagnostic('readError');reply(c,'ready',{revision:'',ticket:'',version:VERSION,error:'端末内の保存情報を読み取れません。情報は消していません。アプリを開き直してください。'});setStatus('端末保持 D5：保存情報を読み取れません（未登録には戻していません）');}
      });
      return;
    }
    if(event.source!==state.source||event.origin!==state.origin||d.page!==state.page||!Number.isSafeInteger(d.seq)||d.seq<=state.lastSeq)return;
    state.lastSeq=d.seq;
    if(d.type!=='save'&&d.type!=='remove')return;
    const c=context(),request={type:d.type,requestId:String(d.requestId||''),expectedRevision:d.expectedRevision,ticket:d.ticket};
    enqueue(async function(){
      if(!c.current())return;
      const ack={requestId:request.requestId,ok:false};
      try{
        if(request.type==='save'&&!validTicket(request.ticket))throw new Error('復元情報の形式が不正です。');
        const saved=await storage().writeTicket(c.key,request.expectedRevision,request.type==='save'?request.ticket:'',c.current);
        if(!c.current())return;
        ack.revision=saved.revision;ack.ok=true;
        setStatus(request.type==='save'?'端末保持 D5：この端末に保存確認済み':'端末保持 D5：登録解除済み');
      }catch(e){ack.reason=e.code==='conflict'?'conflict':'storage';ack.error=String(e&&e.message||'端末への保存に失敗しました。');}
      if(!c.current())return;
      diagnostic(ack.ok?(request.type==='save'?'saved':'removed'):(ack.reason==='conflict'?'conflict':'writeError'));
      reply(c,'ack',ack);
    });
  });
  // Deliberately no transmission of tickets in URLs, logs, analytics, or fetch.
  const el=document.getElementById('entrySessionVersion');if(el)el.textContent=VERSION;
  setStatus('端末保持 D5：接続先の設定を待っています');
})();


