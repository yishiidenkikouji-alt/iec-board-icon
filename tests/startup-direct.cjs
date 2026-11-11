const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const dir=path.join(__dirname,'../board-pwa'),ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
const GAS='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec',KEY='iec.entry.resume.v1:/iec-board-icon/board-pwa/:'+GAS;
const TICKET='iec-resume-v1.'+'A'.repeat(70)+'.'+'B'.repeat(43),REVISION='c'.repeat(64),saved=JSON.stringify({v:1,revision:REVISION,ticket:TICKET});
const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
async function launch(records=new Map([[KEY,saved]]),options={}){
 const nodes={},events={},posts=[],writes=[],timers=new Map(),created=[],paints=[];let id=0,clock=20;
 function create(tag){
  const n={tag,children:[],textContent:'',value:'',hidden:false,removed:false,focus(){},select(){},remove(){this.removed=true;},removeAttribute(k){delete this[k];},appendChild(child){this.children.push(child);},submit(){posts.push({action:this.action,method:this.method,enctype:this.enctype,target:this.target,fields:Object.fromEntries(this.children.map(x=>[x.name,x.value]))});}};created.push(n);return n;
 }
 function node(name){if(!nodes[name]){nodes[name]=create(name);if(name==='trialFrame')nodes[name].contentWindow={};}return nodes[name];}
 const localStorage={getItem:k=>{if(options.readFail)throw Error('PRIVATE_ERROR');return records.get(k)||null;},setItem:(k,v)=>{writes.push(k);records.set(k,v);}};
 const ctx={URL,URLSearchParams,crypto:webcrypto,Uint8Array,location:new URL(ROOT+'startup-direct.html?v=P077-ENTRY-1'+(options.query||'')),localStorage,performance:{now:()=>clock},navigator:{standalone:true,clipboard:{writeText:async s=>ctx.copied=s}},document:{hidden:false,body:create('body'),createElement:create,getElementById:k=>k==='boardFrame'?null:node(k),addEventListener:(k,fn)=>(events[k]??=[]).push(fn)},addEventListener:(k,fn)=>(events[k]??=[]).push(fn),setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:n=>timers.delete(n),requestAnimationFrame:fn=>paints.push(fn)};
 ctx.window=ctx;ctx.top=ctx;vm.createContext(ctx);
 const html=fs.readFileSync(path.join(dir,'startup-direct.html'),'utf8'),scripts=[...html.matchAll(/<script defer src="\.\/([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m=>m[1]);
 for(const name of scripts){if(options.skipConfig&&name==='config.js'||options.skipStorage&&name==='entry-session.js')continue;vm.runInContext(fs.readFileSync(path.join(dir,name),'utf8'),ctx,{filename:name});}
 await settle();
 const frame=node('trialFrame'),source={parent:frame.contentWindow},result={ok:true,card:{name:'PRIVATE_NAME',label:'現場',place:'PRIVATE_PLACE',workContent:'<img src=x onerror=alert(1)>'},timing:{gasTotalMs:1000,identityMs:300,cardMs:600,identityAndCardMs:950,secret:'PRIVATE_TIMING'}};
 const data=()=>({app:'iec-startup-trial-p077',version:'P077-RESPONSE-1',nonce:posts[0]?.fields.nonce,result});
 const dispatch=async(kind,event)=>{for(const fn of events[kind]||[])await fn(event);await settle();};
 return{ctx,nodes,node,frame,source,posts,writes,created,timers,records,scripts,result,data,dispatch,at:n=>clock=n,report:()=>JSON.parse(node('trialReport').value),message:(d=data(),origin='https://n-example-script.googleusercontent.com',src=source)=>dispatch('message',{origin,source:src,data:d}),paint:async()=>{while(paints.length){paints.shift()();await settle();}}};
}
test('current storage sends one body-only POST to the fixed GAS URL, clears token inputs and never writes identity',async()=>{
 const h=await launch(undefined,{query:'&target=https://evil.invalid&ticket=not-a-ticket'});assert.deepEqual(h.scripts,['config.js','entry-session.js','startup-direct.js']);assert.equal(h.posts.length,1);
 const p=h.posts[0];assert.equal(p.action,GAS);assert.equal(p.method,'POST');assert.equal(p.enctype,'application/x-www-form-urlencoded');assert.equal(p.fields.ticket,TICKET);assert.match(p.fields.nonce,/^[a-f0-9]{64}$/);assert.deepEqual(Object.keys(p.fields),['p077','nonce','ticket']);assert.equal(p.target,h.frame.name);
 assert(h.created.filter(n=>n.tag==='input').every(n=>n.value===''));assert(h.created.find(n=>n.tag==='form').removed);assert.equal(h.writes.length,0);assert.equal(h.node('ownCard').hidden,true);assert.equal(h.report().outcome,'verifying');
});
test('origin, owned iframe ancestry, nonce and response version all gate the card',async()=>{
 const h=await launch(),good=h.data();
 for(const [data,origin,source] of [[good,'https://evil.invalid',h.source],[good,'https://example.googleusercontent.com',h.source],[good,'https://script.googleusercontent.com.evil.invalid',h.source],[good,'https://script.googleusercontent.com',{}],[{...good,nonce:'0'.repeat(64)},undefined,undefined],[{...good,version:'old'},undefined,undefined]])await h.message(data,origin,source);
 assert.equal(h.node('ownCard').hidden,true);assert.equal(h.report().responseMs,null);
 h.at(4000);await h.message();await h.paint();assert.equal(h.report().outcome,'success');assert.equal(h.node('cardName').textContent,'PRIVATE_NAME');assert.equal(h.node('cardWork').textContent,h.result.card.workContent);assert(h.frame.removed);
 await h.message({...good,result:{ok:false,code:'ACCESS_DENIED'}});assert.equal(h.report().outcome,'success');
});
test('diagnostics and clipboard include only selected timing/status fields; total is recorded after paint',async()=>{
 const h=await launch();h.at(3900);await h.message();assert.equal(h.report().outcome,'verifying');h.at(4000);await h.paint();await h.node('copyReport').onclick();
 assert.equal(h.report().totalToCardMs,4000);assert.equal(h.report().timing.requestMs,3880);assert.equal(h.report().timing.gasTotalMs,1000);
 for(const value of [TICKET,REVISION,GAS,h.posts[0].fields.nonce,'PRIVATE_NAME','PRIVATE_PLACE','PRIVATE_TIMING'])assert(!h.ctx.copied.includes(value));assert.equal(h.writes.length,0);
});
test('missing, tombstoned or unreadable identity and another connection never make a request',async()=>{
 for(const [records,options,code] of [[new Map(),{},'ticket-missing'],[new Map([[KEY,JSON.stringify({v:1,revision:REVISION,ticket:'',removed:true})]]),{},'ticket-removed'],[new Map([[KEY,'PRIVATE_INVALID']]),{},'ticket-read-failed'],[new Map([[KEY,saved]]),{readFail:true},'ticket-read-failed'],[new Map([[KEY,saved],['iec.board.pwa.gasUrl.v1',GAS.replace('AKfycby','AKfycba')]]),{},'connection-mismatch'],[new Map(),{skipConfig:true},'connection-missing'],[new Map(),{skipStorage:true},'storage-module-unavailable']]){
  const h=await launch(records,options);assert.equal(h.report().outcome,code);assert.equal(h.posts.length,0);assert.equal(h.writes.length,0);assert(h.node('ownCard').hidden);
 }
});
test('changes to canonical identity while awaiting a response prevent its display',async()=>{
 for(const value of [JSON.stringify({v:1,revision:'d'.repeat(64),ticket:TICKET}),JSON.stringify({v:1,revision:REVISION,removed:true,ticket:''})]){
  const h=await launch();h.records.set(KEY,value);await h.message();await h.paint();assert.notEqual(h.report().outcome,'success');assert(h.node('ownCard').hidden);assert.equal(h.node('cardName').textContent,'');
 }
 const h=await launch();h.records.set('iec.board.pwa.gasUrl.v1',GAS.replace('AKfycby','AKfycba'));await h.message();assert.equal(h.report().outcome,'connection-mismatch');assert(h.node('ownCard').hidden);
});
test('background, BFCache, external logout and timeout clear the card and ignore late results without retrying',async()=>{
 for(const event of ['visibilitychange','pagehide','pageshow','storage']){
  const h=await launch();await h.message();await h.paint();assert.equal(h.report().outcome,'success');
  if(event==='visibilitychange')h.ctx.document.hidden=true;
  await h.dispatch(event,event==='pageshow'?{persisted:true}:event==='storage'?{key:KEY}:{});await h.message();await h.paint();
  assert.notEqual(h.report().outcome,'success');assert(h.node('ownCard').hidden);assert.equal(h.node('cardName').textContent,'');assert.equal(h.posts.length,1);
 }
 const h=await launch();[...h.timers.values()].find(t=>t.ms===60000).fn();await h.message();assert.equal(h.report().outcome,'TIMEOUT');assert(h.node('ownCard').hidden);assert.equal(h.posts.length,1);
});
test('failed, malformed and oversized responses fail closed',async()=>{
 for(const mutate of [r=>{r.ok=false;r.code='ACCESS_DENIED'},r=>{r.card.name=''},r=>{r.card.place='x'.repeat(3001)},r=>{r.card=null}]){
  const h=await launch();mutate(h.result);await h.message();await h.paint();assert.notEqual(h.report().outcome,'success');assert(h.node('ownCard').hidden);
 }
});
test('opt-in pages stay under the installed app scope and outside the service-worker cache',()=>{
 const html=fs.readFileSync(path.join(dir,'startup-direct.html'),'utf8');assert(html.includes('form-action https://script.google.com'));assert(!html.includes('unsafe-inline'));
 const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');assert(!sw.includes('startup-direct'));
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8'));assert(new URL('startup-direct.html',ROOT).href.startsWith(new URL(manifest.scope,ROOT).href));
});
