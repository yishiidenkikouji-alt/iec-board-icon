const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').join(__dirname,'../board-pwa/settings-menu.js'),'utf8');
function fixture(){
 const dom=new JSDOM('<header id="entryBar"><button id="settingsButton"></button></header><main id="boardArea"><iframe id="boardFrame"></iframe></main><div id="sheetBackdrop" hidden></div>',{url:'https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/',runScripts:'outside-only'}),w=dom.window,f=w.document.querySelector('iframe'),sent=[];
 w.IecNativeHost={nonce:'a'.repeat(64),matches:v=>v===f.contentWindow};f.contentWindow.postMessage=d=>sent.push(d);
 vm.runInContext(source,dom.getInternalVMContext());
 const emit=(origin=w.location.origin,source=f.contentWindow)=>w.dispatchEvent(new w.MessageEvent('message',{origin,source,data:{app:'iec-settings-menu-v1',type:'ready',nonce:'a'.repeat(64),page:'b'.repeat(32)}}));
 return {w,dom,f,sent,emit,click:()=>w.document.getElementById('settingsButton').click()};
}
test('settings handoff accepts only the current authenticated native frame',()=>{const h=fixture();try{h.emit('https://evil.example');h.emit(h.w.location.origin,h.w);assert.equal(h.sent.length,0);h.emit();assert.equal(h.sent[0].type,'ready-ack');h.click();assert.equal(h.sent.at(-1).type,'open');}finally{h.dom.window.close();}});
