const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const src=fs.readFileSync(require('node:path').join(__dirname,'../board-pwa/push139.js'),'utf8');
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function fixture(){
 const dom=new JSDOM('<div id="settingsSheet"><div class="sheet-heading"></div></div>',{url:'https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let now=100000,hidden=false,request=async()=>{throw Error('一時エラー');};const calls=[];
 w.Date.now=()=>now;Object.defineProperty(w.document,'hidden',{get:()=>hidden});
 w.IecPushTransport139={connected:()=>true,request:async method=>{calls.push(method);return request();}};
 vm.runInContext(src,dom.getInternalVMContext());
 return {w,calls,emit:type=>w.dispatchEvent(new w.Event('iec-push-'+type+'139')),advance:n=>now+=n,hide:v=>hidden=v,setRequest:f=>request=f,close:()=>dom.window.close()};
}
test('ready bursts deduplicate and failures back off without timers, while manual settings remains available',async()=>{
 const h=fixture();try{
  for(let i=0;i<50;i++)h.emit('ready');await flush();assert.equal(h.calls.length,1);
  for(const wait of [30000,60000,120000,240000,300000]){h.advance(wait-1);h.emit('ready');await flush();const n=h.calls.length;h.advance(1);h.emit('ready');await flush();assert.equal(h.calls.length,n+1);}
  const n=h.calls.length;h.emit('settings');await flush();assert.equal(h.calls.length,n+1);
  h.setRequest(async()=>({active:true,enabled:true}));h.emit('settings');await flush();const done=h.calls.length;h.advance(3600000);h.emit('ready');await flush();assert.equal(h.calls.length,done);
  assert(h.calls.every(x=>x==='status'));
 }finally{h.close();}
});
test('background events do not retry; returning to foreground and identity reset work',async()=>{
 const h=fixture();try{h.hide(true);h.emit('ready');await flush();assert.equal(h.calls.length,0);h.hide(false);h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await flush();assert.equal(h.calls.length,1);h.emit('reset');h.emit('ready');await flush();assert.equal(h.calls.length,2);}finally{h.close();}
});
test('old in-flight result cannot set new identity state or impose its cooldown',async()=>{
 const h=fixture();try{let reject;h.setRequest(()=>new Promise((_,r)=>reject=r));h.emit('ready');h.emit('reset');reject(Error('old failure'));await flush();h.setRequest(async()=>({active:true,enabled:false}));h.emit('ready');await flush();assert.equal(h.calls.length,2);assert(!h.w.document.getElementById('pushResult139').textContent.includes('old'));}finally{h.close();}
});
