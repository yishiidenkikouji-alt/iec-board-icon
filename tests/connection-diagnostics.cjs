const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const dir=__dirname+'/../board-pwa/',ORIGIN='https://yishiidenkikouji-alt.github.io',ROOT=ORIGIN+'/iec-board-icon/board-pwa/';
const URL_KEY='iec.board.pwa.gasUrl.v1',TEST_KEY='iec.entry.diagnostic.v1:/iec-board-icon/board-pwa/';
const url='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
const key='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+url;
const ticket='iec-resume-v1.'+'A'.repeat(50)+'.'+'B'.repeat(43),revision='c'.repeat(64),stored=JSON.stringify({v:1,revision,ticket});
function env(map=new Map(),options={}){
 const elements={},events={},writes=[];let ctx;
 class Element{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.hidden=false;this.textContent='';this.value='';this.style={};this.attributes={};this.isConnected=true;this._src='';}
  appendChild(e){this.children.push(e);e.parentNode=this;return e;}
  setAttribute(k,v){this.attributes[k]=String(v);}
  getAttribute(k){return k==='src'?this._src:(this.attributes[k]??null);}
  removeAttribute(k){delete this.attributes[k];}
  addEventListener(k,fn){(this.events??={})[k]=fn;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  focus(){ctx.document.activeElement=this;}
  select(){this.selected=true;}
  querySelectorAll(){return this.children;}
  getClientRects(){return [{}];}
 }
 class Frame extends Element{get src(){return this._src;}set src(x){this._src=String(x);}}
 const frame=elements.boardFrame=new Frame();const replies=[];frame.contentWindow={postMessage:(d,o)=>replies.push({d,o})};
 const body=new Element('body'),doc={body,activeElement:null,hidden:false,getElementById(id){return elements[id]??(elements[id]=new Element());},createElement(t){return new Element(t);},addEventListener(k,fn){events['document:'+k]=fn;}};
 elements.sheetBackdrop=new Element();elements.sheetBackdrop.hidden=true;
 const storage={getItem(k){if(options.readFail)throw Error('private raw text');return map.has(k)?map.get(k):null;},setItem(k,v){if(options.writeFail)throw Error('secret error');writes.push(k);if(!options.dropWrites)map.set(k,String(v));},removeItem(k){if(options.writeFail)throw Error('secret error');writes.push(k);map.delete(k);},get length(){if(options.readFail)throw Error('read');return map.size;},key(i){return [...map.keys()][i]??null;}};
 ctx={URL,URLSearchParams,crypto:webcrypto,console,Uint8Array,Uint32Array,HTMLIFrameElement:Frame,localStorage:storage,document:doc,location:new URL(ROOT+'?installed=1#private'),navigator:{userAgent:'Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0',onLine:true,clipboard:{writeText:async t=>{ctx.copied=t;}}},IEC_PWA_CONFIG:{gasUrl:options.config||''},matchMedia:()=>({matches:true}),setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame:fn=>fn(),MutationObserver:class{observe(){}},Event:class{constructor(type){this.type=type;}},history:{replaceState(){}},isSecureContext:true,addEventListener(k,fn){(events[k]??=[]).push(fn);},dispatchEvent(e){for(const fn of events[e.type]||[])fn(e);}};
 ctx.window=ctx;ctx.top=ctx;frame.contentWindow.parent=ctx;vm.createContext(ctx);
 function run(p){vm.runInContext(fs.readFileSync(dir+p,'utf8'),ctx,{filename:p});}
 function descendants(e){return [e,...e.children.flatMap(descendants)];}
 function open(){elements.entryBar.children.find(x=>x.textContent==='接続診断').onclick();return text();}
 function text(){return descendants(body).find(e=>e.tagName==='textarea').value;}
 function click(label){return descendants(body).find(e=>e.textContent===label&&e.tagName==='button').onclick();}
 run('connection-diagnostics.js');
 return {ctx,run,elements,frame,replies,open,text,click,map,writes,message(d,origin='https://script.google.com',source=frame.contentWindow){for(const fn of events.message||[])fn({data:d,origin,source});}};
}
(async()=>{
 let e=env();assert.match(e.open(),/接続先の端末保存：なし/);assert.equal(e.writes.length,0);assert.equal(e.elements.entryBar.children.length,1);
 e.click('保存テスト');assert.deepEqual(e.writes,[TEST_KEY]);assert.match(e.text(),/書き込み・読み戻し成功/);const marker=e.map.get(TEST_KEY);
 e=env(e.map);assert.match(e.open().split('【現在】')[0],/保存テストの記録：\d{4}-/);assert.equal(e.map.get(TEST_KEY),marker);assert.equal(e.writes.length,0);
 for(const options of [{readFail:true},{writeFail:true},{dropWrites:true}]){e=env(new Map(),options);e.open();e.click('保存テスト');assert.doesNotMatch(e.text(),/今回の保存テスト：書き込み・読み戻し成功/);assert.doesNotMatch(e.text(),/secret error|private raw/);}
 e=env(new Map([[URL_KEY,url],[key,stored]]));assert.match(e.open(),/形式確認済み/);assert.match(e.text(),/管理者提示のURLと一致/);await e.click('結果をコピー');assert.equal(e.ctx.copied,e.text());for(const secret of [ticket,revision,url,'#private'])assert.ok(!e.ctx.copied.includes(secret));assert.equal(e.writes.length,0);
 e=env(new Map([[URL_KEY,'invalid-secret-url'],[key,stored],[TEST_KEY,JSON.stringify({v:1,at:'secret-date'})]]));assert.match(e.open(),/あり・形式不正/);assert.match(e.text(),/別の接続先の保存データ：1件/);assert.doesNotMatch(e.text(),/invalid-secret|secret-date/);
 e=env(new Map([[URL_KEY,url],[key,'bad-secret-ticket']]));assert.match(e.open(),/本人確認用データ：あり・形式不正/);assert.ok(!e.text().includes('bad-secret-ticket'));assert.equal(e.map.get(key),'bad-secret-ticket');
 e=env(new Map(),{config:url});assert.match(e.open(),/接続先の選択元：共通設定/);
 // Existing resume protocol, exercising real origin/source/nonce/revision validation.
 e=env(new Map([[URL_KEY,url],[key,stored]]));e.run('entry-session.js');e.frame.src=url;e.open();
 let nonce=new URL(e.frame.src).searchParams.get('iec_resume_nonce'),page='d'.repeat(32),base={app:'iec-device-resume-v1',nonce,page};
 e.message({...base,type:'hello'},'https://evil.example');e.message({...base,type:'hello',nonce:'e'.repeat(64)});e.message({...base,type:'hello'},'https://script.google.com',{});assert.equal(e.replies.length,0);
 e.message({...base,type:'hello'});assert.equal(e.replies.at(-1).d.ticket,ticket);assert.match(e.text(),/保存データをGASへ渡しました/);
 e.message({...base,type:'save',seq:1,requestId:'1',expectedRevision:revision,ticket});assert.equal(e.replies.at(-1).d.ok,true);assert.match(e.text(),/保存・読み戻し成功/);const updated=JSON.parse(e.map.get(key));assert.notEqual(updated.revision,revision);
 e.message({...base,type:'save',seq:2,requestId:'2',expectedRevision:revision,ticket});assert.equal(e.replies.at(-1).d.reason,'conflict');assert.match(e.text(),/競合/);assert.deepEqual(JSON.parse(e.map.get(key)),updated);
 e.message({...base,type:'remove',seq:3,requestId:'3',expectedRevision:updated.revision});assert.equal(e.replies.at(-1).d.ok,true);assert.match(e.text(),/GASの要求で/);assert.equal(e.map.has(key),false);
 e=env(new Map([[URL_KEY,url],[key,stored]]),{readFail:true});e.run('entry-session.js');e.frame.src=url;e.open();nonce=new URL(e.frame.src).searchParams.get('iec_resume_nonce');e.message({...base,nonce,type:'hello'});assert.equal(e.replies.at(-1).d.ticket,'');assert.match(e.text(),/保存データを読み出せません/);
 // The complete app initializes without diagnostics prerequisites and preserves routing.
 e=env();e.run('entry-session.js');e.run('app.js');e.open();e.ctx.document.getElementById('gasUrl').value=url;e.elements.connectionForm.onsubmit({preventDefault(){}});assert.equal(e.map.get(URL_KEY),url);assert.match(e.text(),/接続先の保存操作：保存・読み戻し成功/);assert.equal(new URL(e.frame.src).pathname,new URL(url).pathname);
 e=env(new Map(),{writeFail:true});e.run('entry-session.js');e.run('app.js');e.open();e.ctx.document.getElementById('gasUrl').value=url;e.elements.connectionForm.onsubmit({preventDefault(){}});assert.match(e.text(),/接続先の保存操作：保存または読み戻しに失敗/);assert.equal(e.map.size,0);
 // Diagnostics missing / broken cannot block normal authentication.
 e=env(new Map([[URL_KEY,url],[key,stored]]));delete e.ctx.IecConnectionDiagnosticsD1;e.run('entry-session.js');e.frame.src=url;nonce=new URL(e.frame.src).searchParams.get('iec_resume_nonce');e.message({...base,nonce,type:'hello'});assert.equal(e.replies.at(-1).d.ticket,ticket);
 e=env(new Map([[URL_KEY,url],[key,stored]]));e.ctx.IecConnectionDiagnosticsD1={session(){throw Error('broken UI');}};e.run('entry-session.js');e.frame.src=url;nonce=new URL(e.frame.src).searchParams.get('iec_resume_nonce');e.message({...base,nonce,type:'hello'});assert.equal(e.replies.at(-1).d.ticket,ticket);
 const html=fs.readFileSync(dir+'index.html','utf8'),sw=fs.readFileSync(dir+'sw.js','utf8');assert.ok(html.indexOf('connection-diagnostics.js')<html.indexOf('entry-session.js'));assert.ok(sw.includes("'./connection-diagnostics.js'"));assert.ok(sw.includes('v41-d1-connection-diagnostics'));
 console.log('PASS: startup/current states, persistence marker across reload, denied/dropped storage, malformed data, redaction/copy, resume protocol origin/nonce/source/conflict/save/remove, real app submit, missing/broken diagnostics isolation, SW inclusion.');
})().catch(e=>{console.error(e);process.exit(1);});
