/* P017: health-only first-party storage. No person/ticket in URL or network fetch. */
(function(){
 'use strict';
 const ORIGIN='https://yishiidenkikouji-alt.github.io',APP='iec-health-entry-p017';
 const frame=document.getElementById('healthFrame'),label=document.getElementById('healthStatus'),fallback=document.getElementById('fallback');
 if(window.top!==window||location.origin!==ORIGIN||location.pathname!=='/iec-board-icon/board-pwa/health/')return;
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
 const valid=t=>typeof t==='string'&&t.length<=3000&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(t);
 let url,gate;try{
  const params=new URLSearchParams(location.hash.slice(1));gate=params.get('gate');url=new URL(params.get('url'));
  if(!/^[a-f0-9]{64}$/.test(gate||'')||url.origin!=='https://script.google.com'||url.username||url.password||url.port||!/^\/(?:a\/[^/]+\/)?macros\/s\/[A-Za-z0-9_-]{20,256}\/exec\/?$/.test(url.pathname))throw Error('link');
 }catch(e){label.textContent='案内リンクを確認できません。管理者から届いた体調確認リンクを開いてください。';return;}
 url.search='';url.hash='';url.searchParams.set('health241',gate);fallback.href=url.href;fallback.hidden=false;
 const key='iec.health.entry.p017:'+url.origin+url.pathname+':'+gate,nonce=random();let source=null,origin='',page='',lastSeq=0;
 url.searchParams.set('healthHostP017',nonce);
 function read(){const raw=localStorage.getItem(key);if(!raw)return {revision:'',ticket:''};const d=JSON.parse(raw);if(!d||d.v!==1||!/^[a-f0-9]{64}$/.test(d.revision)||!valid(d.ticket))throw Error('保存した登録情報を確認できません。');return d;}
 function belongs(child){try{for(let i=0,w=child;w&&i<10;i++,w=w.parent){if(w===frame.contentWindow)return true;if(w===window||w===w.parent)return false;}}catch(ignore){}return false;}
 function allowed(o){return o==='https://script.google.com'||/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(o);}
 function reply(type,data){source.postMessage(Object.assign({app:APP,type,nonce,page},data),origin);}
 window.addEventListener('message',function(e){
  const d=e.data;if(!d||d.app!==APP||d.nonce!==nonce||!/^[a-f0-9]{32}$/.test(String(d.page||''))||!allowed(e.origin)||!belongs(e.source))return;
  if(d.type==='hello'){
   if(source&&(source!==e.source||origin!==e.origin))return;
   if(page!==d.page)lastSeq=0;source=e.source;origin=e.origin;page=d.page;
   try{const s=read();reply('ready',{revision:s.revision,ticket:s.ticket});label.textContent=s.ticket?'保存した本人登録を確認しています。':'初回は会社と名前を登録してください。';}
   catch(error){reply('ready',{revision:'',ticket:'',error:'端末の保存領域を読み取れません。'});label.textContent='本人登録の保存領域を利用できません。';}return;
  }
  if(e.source!==source||e.origin!==origin||d.page!==page||!Number.isSafeInteger(d.seq)||d.seq<=lastSeq||!['save','remove'].includes(d.type))return;
  lastSeq=d.seq;const ack={requestId:String(d.requestId||''),ok:false};
  try{
   const old=read();if(typeof d.expectedRevision!=='string'||d.expectedRevision!==old.revision)throw Error('別の画面で本人登録が変更されています。入口を開き直してください。');
   if(d.type==='save'){
    if(!valid(d.ticket))throw Error('本人登録の形式を確認できません。');
    const next={v:1,revision:random(),ticket:d.ticket},text=JSON.stringify(next);localStorage.setItem(key,text);
    if(localStorage.getItem(key)!==text)throw Error('端末への保存を確認できませんでした。');ack.revision=next.revision;label.textContent='この端末に本人登録を保存しました。';
   }else{localStorage.removeItem(key);if(localStorage.getItem(key)!==null)throw Error('端末の登録解除を確認できませんでした。');ack.revision='';label.textContent='本人登録を解除しました。';}
   ack.ok=true;
  }catch(error){ack.error=String(error.message||'登録を保存できませんでした。');label.textContent=ack.error;}
  reply('ack',ack);
 });
 window.addEventListener('storage',function(e){if(e.key===key)label.textContent='別の画面で本人登録が変更されました。回答前に入口を開き直してください。';});
 frame.src=url.href;
})();
