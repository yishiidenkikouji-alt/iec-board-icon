const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const dir=path.join(__dirname,'../board-pwa'),ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/',ORIGIN='https://ishii-board-p003-startup-p076.web.app';
const GAS='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec',URL_KEY='iec.board.pwa.gasUrl.v1',KEY='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS;
const TICKET='iec-resume-v1.'+'A'.repeat(70)+'.'+'B'.repeat(43),REVISION='c'.repeat(64),saved=JSON.stringify({v:1,revision:REVISION,ticket:TICKET});
const settle=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
async function launch(records=new Map(),options={}){
 const nodes={},events={},messages=[],writes=[],timers=new Map();let id=0,clock=20;
 function node(name){return nodes[name]??=(name==='trialFrame'?{hidden:true,src:'',contentWindow:{postMessage:(data,origin)=>messages.push({data,origin})},removeAttribute(k){delete this[k];}}:{textContent:'',value:'',hidden:false,focus(){},select(){}});}
 const localStorage={getItem:k=>{if(options.readFail)throw Error('PRIVATE_RAW_ERROR');return records.get(k)||null;},setItem:(k,v)=>{writes.push(k);records.set(k,v);}};
 const ctx={URL,URLSearchParams,crypto:webcrypto,Uint8Array,location:new URL(ROOT+'startup-trial.html?v=P076-ENTRY-2'),localStorage,performance:{now:()=>clock},navigator:{standalone:!!options.standalone,clipboard:{writeText:async s=>ctx.copied=s}},document:{hidden:false,getElementById:k=>k==='boardFrame'?null:node(k),addEventListener:(k,fn)=>(events[k]??=[]).push(fn)},addEventListener:(k,fn)=>(events[k]??=[]).push(fn),setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:n=>timers.delete(n)};
 ctx.window=ctx;ctx.top=ctx;vm.createContext(ctx);
 const html=fs.readFileSync(path.join(dir,'startup-trial.html'),'utf8');
 const scripts=[...html.matchAll(/<script defer src="\.\/([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m=>m[1]);
 for(const name of scripts){if(options.skipConfig&&name==='config.js'||options.skipStorage&&name==='entry-session.js')continue;vm.runInContext(fs.readFileSync(path.join(dir,name),'utf8'),ctx,{filename:name});}
 await settle();
 const frame=node('trialFrame');
 const hello=()=>({app:'iec-startup-trial-p076',type:'hello',nonce:new URL(frame.src).searchParams.get('nonce'),page:'d'.repeat(32)});
 const dispatch=async(kind,event)=>{for(const fn of events[kind]||[])await fn(event);await settle();};
 return {ctx,records,messages,writes,nodes,node,frame,scripts,report:()=>JSON.parse(node('trialReport').value),hello,dispatch,at:n=>clock=n,message:data=>dispatch('message',{origin:ORIGIN,source:frame.contentWindow,data})};
}
test('actual HTML boot loads common config before storage; a saved ticket works without a separately saved connection',async()=>{
 const h=await launch(new Map([[KEY,saved]]),{standalone:true});
 assert.deepEqual(h.scripts,['config.js','entry-session.js','startup-trial.js']);
 assert.equal(h.report().outcome,'loading');assert.equal(h.report().entryCheck.commonConfig,'matched');assert.equal(h.report().entryCheck.mode,'standalone');
 await h.message(h.hello());assert.equal(h.messages.length,1);assert.equal(h.messages[0].origin,ORIGIN);assert.equal(h.messages[0].data.ticket,TICKET);assert.equal(h.records.has(URL_KEY),false);assert.equal(h.writes.length,0);
});
test('missing identity is distinguished from a missing connection; no new registration is written',async()=>{
 const h=await launch();assert.equal(h.report().entryCheck.connection,'matched');assert.equal(h.report().outcome,'loading');await h.message(h.hello());
 assert.equal(h.report().outcome,'ticket-missing');assert.equal(h.report().entryCheck.ticket,'missing');assert.equal(h.messages.length,0);assert.equal(h.records.size,0);assert.equal(h.writes.length,0);assert(h.frame.hidden);
 assert.match(h.node('trialStatus').textContent,/ホーム画面アプリ/);
});
test('a saved different connection overrides common config and is never forwarded or overwritten',async()=>{
 const different=GAS.replace('AKfycby','AKfycba'),h=await launch(new Map([[URL_KEY,different],[KEY,saved]]));
 assert.equal(h.report().outcome,'connection-mismatch');assert.equal(h.report().entryCheck.connection,'different');assert.equal(h.messages.length,0);assert.equal(h.writes.length,0);assert.equal(h.records.get(URL_KEY),different);
 assert(!h.frame.src);assert(!JSON.stringify(h.report()).includes(different));
});
test('missing modules/config and private storage errors have distinct redacted results',async()=>{
 let h=await launch(new Map(),{skipConfig:true});assert.equal(h.report().outcome,'connection-missing');assert.equal(h.report().entryCheck.commonConfig,'missing');
 h=await launch(new Map(),{skipStorage:true});assert.equal(h.report().outcome,'storage-module-unavailable');assert.equal(h.report().entryCheck.storageModule,false);
 h=await launch(new Map([[KEY,'PRIVATE_INVALID_JSON']]));await h.message(h.hello());assert.equal(h.report().outcome,'ticket-read-failed');assert.equal(h.report().entryCheck.errorCode,'format');
 h=await launch(new Map([[KEY,saved]]),{readFail:true});await h.message(h.hello());assert.equal(h.report().outcome,'ticket-read-failed');assert(!JSON.stringify(h.report()).includes('PRIVATE_RAW_ERROR'));assert.equal(h.writes.length,0);
});
test('removed registration cannot be revived by the trial',async()=>{
 const row=JSON.stringify({v:1,revision:REVISION,ticket:'',removed:true}),h=await launch(new Map([[KEY,row]]));await h.message(h.hello());
 assert.equal(h.report().outcome,'ticket-removed');assert.equal(h.messages.length,0);assert.equal(h.records.get(KEY),row);assert.equal(h.writes.length,0);
});
test('origin/source/nonce gates remain required; copied diagnostics contain no ticket, revision or URLs',async()=>{
 const h=await launch(new Map([[KEY,saved]])),hello=h.hello();
 for(const event of [{source:{},origin:ORIGIN,data:hello},{source:h.frame.contentWindow,origin:'https://example.invalid',data:hello},{source:h.frame.contentWindow,origin:ORIGIN,data:{...hello,nonce:'0'.repeat(64)}}])await h.dispatch('message',event);
 assert.equal(h.messages.length,0);await h.message(hello);assert.equal(h.messages.length,1);await h.message(hello);assert.equal(h.messages.length,1);
 h.at(2300);await h.message({...hello,type:'rendered',timing:{apiMs:2000,cardMs:40,ticket:TICKET,secret:'PRIVATE_CARD'}});await h.node('copyReport').onclick();
 assert.equal(h.report().outcome,'success');assert.equal(h.report().totalToCardMs,2300);
 for(const privateValue of [TICKET,REVISION,GAS,ORIGIN,hello.nonce,'PRIVATE_CARD'])assert(!h.ctx.copied.includes(privateValue));
 await h.dispatch('storage',{key:URL_KEY});assert.equal(h.report().outcome,'identity-changed');assert(h.frame.hidden);
});
test('regular app link navigates within the same installed-app scope without credentials',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),match=html.match(/<a href="([^"]+)" target="_self">起動速度を試す<\/a>/);assert(match);
 const target=new URL(match[1],ROOT);assert.equal(target.origin,new URL(ROOT).origin);assert.equal(target.pathname,'/iec-board-icon/board-pwa/startup-sync.html');assert.deepEqual([...target.searchParams.keys()],['v']);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8'));assert(target.href.startsWith(new URL(manifest.scope,ROOT).href));
 const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');assert(sw.includes('v49-p081-direct-entry'));assert(!sw.includes("'./startup-trial.html'"));assert(!sw.includes("'./startup-sync.html'"));
});
