const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto,createHash}=require('node:crypto');
const root=path.join(__dirname,'../board-pwa'),ROOT='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
const GAS='https://script.google.com/macros/s/AKfycbyDl12j_i0NvCN45tSVgM0ngzAWE73hpuz69Mm9MMRQT_gZkrNJXgJNlGqAee-YG_7c/exec';
const payload={v:1,i:'iec-device-v3:'+'1'.repeat(32),r:'r1',b:'private-binding',e:Date.now()+3600000};
const ticket='iec-resume-v1.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+'a'.repeat(43),binding=createHash('sha256').update(JSON.stringify([payload.i,payload.r,payload.b])).digest('hex'),uid='p078_'+'2'.repeat(64);
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
async function launch(restored=true){
 const nodes={},events={},created=[],posts=[],timers=new Map();let timerId=0,clock=10,authCallback,signouts=0,fetchReply=null;
 let saved={ticket,revision:'r1'};const initialized={};
 function create(tag){const listeners={};const n={tag,hidden:false,value:'',textContent:'',children:[],get elements(){return this.children;},appendChild(c){this.children.push(c);if(c.tag==='iframe')queueMicrotask(()=>c.emit('load'));},remove(){this.removed=true;},setAttribute(){},focus(){},select(){},addEventListener(k,fn){(listeners[k]??=[]).push(fn);},async emit(k,e={}){for(const fn of listeners[k]||[])await fn(e);},submit(){posts.push({action:this.action,method:this.method,fields:Object.fromEntries(this.children.map(c=>[c.name,c.value]))});}};if(tag==='iframe')n.contentWindow={};created.push(n);return n;}
 const node=id=>nodes[id]??=create(id),user={uid};const auth={currentUser:restored?user:null,authStateReady:async()=>{}};
 const A={indexedDBLocalPersistence:'idb',browserLocalPersistence:'local',initializeAuth(app,c){initialized.auth=c;return auth;},getIdToken:async()=>'PRIVATE_ID_TOKEN',getIdTokenResult:async()=>({claims:{iecP078:true,binding,personUid:'p006_self',sid:'2'.repeat(64),pv:'pv',dv:'dv',epoch:'ep',trialEpoch:'trial'}}),signOut:async()=>{signouts++;auth.currentUser=null;if(authCallback)authCallback(null);},signInWithCustomToken:async(a,token)=>{initialized.token=token;auth.currentUser=user;if(authCallback)authCallback(user);return {user};},onAuthStateChanged:(a,fn)=>{authCallback=fn;queueMicrotask(()=>{if(authCallback===fn)fn(auth.currentUser);});return()=>{if(authCallback===fn)authCallback=null;};}};
 const context={URL,Uint8Array,TextEncoder,TextDecoder,atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:{getRandomValues:a=>webcrypto.getRandomValues(a),subtle:{digest:async(a,b)=>createHash('sha256').update(b).digest()}},AbortController,fetch:async(url,opt)=>{initialized.path=url;initialized.fetch=opt;return new Promise(resolve=>{fetchReply=resolve;});},performance:{now:()=>clock},navigator:{clipboard:{writeText:async s=>context.copied=s}},location:new URL(ROOT+'startup-sync.html'),document:{hidden:false,body:create('body'),createElement:create,getElementById:node,addEventListener:(k,fn)=>(events[k]??=[]).push(fn)},addEventListener:(k,fn)=>(events[k]??=[]).push(fn),removeEventListener:(k,fn)=>events[k]=(events[k]||[]).filter(x=>x!==fn),setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>{timers.set(++timerId,{fn,ms,interval:true});return timerId;},clearInterval:id=>timers.delete(id),loadSDK:async url=>url.includes('firebase-app')?{initializeApp:(c,name)=>{initialized.name=name;return {};}}:A,IecDeviceStorageD3:{connection:async()=>GAS,readTicket:async()=>saved}};
 context.window=context;context.top=context;vm.createContext(context);
 const core=fs.readFileSync(path.join(root,'startup-firebase-core.js'),'utf8').replaceAll('export function','function')+'\n'+fs.readFileSync(path.join(root,'startup-refresh-core.js'),'utf8').replaceAll('export function','function');
 const profileCore=fs.readFileSync(path.join(root,'startup-sync-core.js'),'utf8').replace(/^import .+;\n/gm,'').replaceAll('export function','function');
 const code=fs.readFileSync(path.join(root,'startup-sync.js'),'utf8').replace(/^import .+;\n/gm,'').replaceAll('import(sdk+','loadSDK(sdk+');vm.runInContext(core+'\n'+profileCore+'\n'+code,context);await settle();
 const dispatch=async(k,e={})=>{for(const fn of events[k]||[])await fn(e);await settle();};
 const data=(fresh=false)=>({uid,binding,card:{name:'PRIVATE_NAME',label:'test',place:'PRIVATE_PLACE',workContent:'<img onerror=evil()>'},updatedAt:{toMillis:()=>Date.now()},expiresAt:{toMillis:()=>Date.now()+600000},requestNonce:fresh?posts[0].fields.nonce:'3'.repeat(64)});
 const snap=async({fresh=false,synced=true,age=5000,until=85000,status='ready',stampPatch={}}={})=>{const d=data(fresh),str=value=>({stringValue:value}),fields={uid:str(d.uid),binding:str(d.binding),requestNonce:str(d.requestNonce),updatedAt:{timestampValue:new Date(d.updatedAt.toMillis()).toISOString()},expiresAt:{timestampValue:new Date(d.expiresAt.toMillis()).toISOString()},card:{mapValue:{fields:Object.fromEntries(Object.entries(d.card).map(([k,v])=>[k,str(v)]))}}};if(synced){const checked=Date.now()-age;fields.updatedAt={timestampValue:new Date(checked).toISOString()};fields.syncP081={mapValue:{fields:{version:str('P081-SYNC-1'),status:str(status),checkedAt:{timestampValue:new Date(checked).toISOString()},validUntil:{timestampValue:new Date(checked+until).toISOString()},windowUntil:{timestampValue:new Date(checked+3600000).toISOString()},...stampPatch}}};}if(fetchReply){const resolve=fetchReply;fetchReply=null;resolve({ok:true,status:200,json:async()=>({fields})});}await settle();};
 const reply=async(patch={},origin='https://script.googleusercontent.com',source=created.filter(c=>c.tag==='iframe'&&!c.removed).at(-1)?.contentWindow)=>{await dispatch('message',{origin,source,data:{app:'iec-startup-trial-p081',version:'P081-RESPONSE-1',nonce:posts[0]?.fields.nonce,result:{ok:true,uid,binding,refreshMode:restored?'reused':'bootstrap',...(restored?{}:{customToken:'PRIVATE_CUSTOM_TOKEN'}),timing:{gasTotalMs:1000,identityMs:100,cardMs:300,identityAndCardMs:500}},...patch}});};
 return {context,initialized,posts,created,timers,node,dispatch,snap,reply,setSaved:v=>saved=v,at:v=>clock=v,report:()=>JSON.parse(node('trialReport').value),deny:async()=>{if(fetchReply){const resolve=fetchReply;fetchReply=null;resolve({ok:false,status:403});}await settle();},signouts:()=>signouts,auth,claims:A};
}

test('P081 restored valid synced card displays after an authorized GET with zero GAS calls',async()=>{
 const h=await launch();assert.equal(h.initialized.name,'iec-startup-p078');assert.equal(h.posts.length,0);assert(h.node('ownCard').hidden);
 h.at(1300);await h.snap();assert.equal(h.report().outcome,'success');assert.equal(h.report().syncedCardMs,1300);assert.equal(h.report().refreshMode,'mirror');assert.equal(h.report().gasRequests,0);assert.equal(h.report().signInMs,0);assert.match(h.node('cardFreshness').textContent,/同期時点/);assert(!h.node('cardFreshness').textContent.includes('最新'));
 assert.equal(h.initialized.fetch.cache,'no-store');assert.equal(h.initialized.fetch.credentials,'omit');assert(h.initialized.path.endsWith('/p078Cards/'+uid));
 await h.node('copyReport').onclick();for(const v of [ticket,binding,uid,'PRIVATE_NAME','PRIVATE_PLACE','PRIVATE_ID_TOKEN',GAS])assert(!h.context.copied.includes(v));
});
test('expired or missing sync uses one existing authorized GAS fallback; not relabeled fresh prematurely',async()=>{
 for(const patch of [{synced:false},{age:95000},{until:1000},{stampPatch:{validUntil:{timestampValue:new Date(Date.now()+10000000).toISOString()}}}]){
  const h=await launch();await h.snap(patch);assert.equal(h.posts.length,1);assert.equal(h.posts[0].fields.p081,'startup-v1');assert.match(h.posts[0].fields.grant,/^[a-f0-9]{64}$/);assert.equal(h.report().syncedCardMs,null);assert.match(h.node('cardFreshness').textContent,/更新待ち/);
  await h.reply();await h.snap();assert.equal(h.report().outcome,'success');assert.equal(h.report().gasRequests,1);assert.equal(h.initialized.token,undefined);
 }
});
test('first connection still requires the signed-ticket bootstrap before reading any own card',async()=>{
 const h=await launch(false);assert.equal(h.posts.length,1);assert.equal(h.posts[0].fields.grant,undefined);assert(h.node('ownCard').hidden);await h.reply();assert.equal(h.initialized.token,'PRIVATE_CUSTOM_TOKEN');await h.snap();assert.equal(h.report().outcome,'success');
});
test('spoofed origin/source/nonce cannot bootstrap or display',async()=>{
 const h=await launch(false);await h.reply({},'https://evil.test');await h.reply({},'https://script.googleusercontent.com',{});await h.reply({nonce:'bad'});assert.equal(h.initialized.token,undefined);assert(h.node('ownCard').hidden);await h.reply();assert.equal(h.initialized.token,'PRIVATE_CUSTOM_TOKEN');
});
test('revocation, failed permission reads and timeouts clear cards without renewing any grant',async()=>{
 for(const how of ['deny','timeout']){const h=await launch();await h.snap();const interval=[...h.timers.values()].find(t=>t.interval&&t.ms===10000);interval.fn();await settle();if(how==='deny')await h.deny();else [...h.timers.values()].find(t=>t.ms===5000).fn();await settle();assert(h.node('ownCard').hidden);assert.equal(h.posts.length,0);assert.equal(h.initialized.token,undefined);}
 const h=await launch();await h.deny();assert(h.node('ownCard').hidden);assert.equal(h.posts.length,0);
});
test('hidden/offline/local ticket removal clears private fields and blocks late responses',async()=>{
 for(const how of ['hidden','offline','removed']){const h=await launch();await h.snap();if(how==='hidden'){h.context.document.hidden=true;await h.dispatch('visibilitychange');}else if(how==='offline')await h.dispatch('offline');else{h.setSaved({removed:true,ticket:'',revision:'new'});[...h.timers.values()].find(t=>t.interval&&t.ms===2000).fn();await settle();}assert(h.node('ownCard').hidden);assert.equal(h.node('cardName').textContent,'');}
 const h=await launch(false);h.setSaved({removed:true,ticket:'',revision:'new'});await h.reply();assert(h.node('ownCard').hidden);assert.equal(h.initialized.token,undefined);
});
test('known boundary expires the synced label and allows only one fallback in this view',async()=>{
 const h=await launch();await h.snap({until:30000});const timer=[...h.timers.values()].find(t=>!t.interval&&t.ms>20000&&t.ms<30000);assert(timer);timer.fn();await settle();assert.match(h.node('cardFreshness').textContent,/更新待ち/);assert.equal(h.posts.length,1);assert.equal(h.report().fallbackReason,'boundary');
 await h.reply();await h.snap({synced:false});assert.notEqual(h.report().syncState,'ready');const interval=[...h.timers.values()].find(t=>t.interval&&t.ms===10000);interval.fn();await settle();await h.snap({synced:false});assert.equal(h.posts.length,1);
});
test('stopped sync does not automatically restart the trial',async()=>{
 const h=await launch();await h.snap({status:'stopped'});assert.equal(h.posts.length,0);assert.equal(h.report().syncState,'stopped');assert.match(h.node('trialStatus').textContent,/停止/);
});
test('fallback denial clears prior card and never loops',async()=>{
 const h=await launch();await h.snap({synced:false});await h.reply({result:{ok:false,code:'ACCESS_DENIED'}});assert(h.node('ownCard').hidden);assert.equal(h.posts.length,1);assert.equal(h.report().outcome,'access-denied');
});
test('changed grant permits at most one fully authorized reconnect',async()=>{
 const h=await launch();await h.snap({synced:false});await h.reply({result:{ok:false,code:'RECONNECT_REQUIRED'}});assert(h.node('ownCard').hidden);assert.equal(h.posts.length,2);assert.equal(h.posts[1].fields.grant,undefined);
 await h.reply({result:{ok:true,uid,binding,refreshMode:'bootstrap',customToken:'NEW_TOKEN'}});await h.snap();assert.equal(h.report().outcome,'success');assert.equal(h.report().reconnects,1);
 const j=await launch();await j.snap({synced:false});await j.reply({result:{ok:false,code:'RECONNECT_REQUIRED'}});await j.reply({result:{ok:false,code:'RECONNECT_REQUIRED'}});assert.equal(j.posts.length,2);assert.equal(j.report().outcome,'access-denied');
});
test('forget trial never edits the normal ticket or card storage',async()=>{
 const h=await launch();await h.snap();await h.node('forgetTrial').onclick();assert.equal(h.signouts(),1);assert(h.node('ownCard').hidden);const s=fs.readFileSync(path.join(root,'startup-sync.js'),'utf8');assert(!/localStorage\.(?:setItem|removeItem)|\.writeTicket\(/.test(s));
});
test('freshness validator rejects future, mismatched, oversized-window and expired grant stamps',()=>{
 const ctx={};vm.createContext(ctx);let code=fs.readFileSync(path.join(root,'startup-firebase-core.js'),'utf8').replaceAll('export function','function')+'\n'+fs.readFileSync(path.join(root,'startup-sync-core.js'),'utf8').replace(/^import .+;\n/gm,'').replaceAll('export function','function');vm.runInContext(code,ctx);
 const now=100000,d={uid,binding,card:{name:'self',label:'',place:'',workContent:''},requestNonce:'a'.repeat(64),updatedAt:{toMillis:()=>95000},expiresAt:{toMillis:()=>200000},sync:{version:'P081-SYNC-1',status:'ready',checkedAt:95000,validUntil:180000,windowUntil:200000}};
 assert.equal(ctx.syncFresh(d,uid,binding,now),true);
 for(const patch of [{checkedAt:100001},{checkedAt:94000},{validUntil:190001},{validUntil:99999},{windowUntil:170000},{status:'pending'},{version:'old'}])assert.equal(ctx.syncFresh({...d,sync:{...d.sync,...patch}},uid,binding,now),false);
 assert.equal(ctx.syncFresh({...d,expiresAt:{toMillis:()=>170000}},uid,binding,now),false);
});

test('display deadline while GAS is pending records a terminal timeout, not refreshing plus unavailable',async()=>{
 const h=await launch();await h.snap({synced:false});assert.equal(h.posts.length,1);
 const displayDeadline=[...h.timers.values()].find(t=>!t.interval&&t.ms===60000);
 h.at(61400);displayDeadline.fn();await settle();await h.node('copyReport').onclick();
 assert.equal(h.report().outcome,'timeout');assert.equal(h.report().errorCode,'response-timeout');
 assert.equal(h.report().requestMs,null);assert.equal(h.report().transport.state,'timeout');
 assert(h.report().transport.waitMs>=60000);assert(h.node('ownCard').hidden);
 await h.reply();assert.equal(h.report().outcome,'timeout');assert(h.node('ownCard').hidden);
});

test('transport diagnostics distinguish submit, loaded frame, rejected older response and matched response',async()=>{
 const h=await launch();await h.snap({synced:false});const frame=h.created.filter(c=>c.tag==='iframe'&&!c.removed).at(-1);
 assert.equal(h.report().transport.state,'waiting');assert.equal(h.report().transport.submitReturnedMs,10);
 h.at(2000);await frame.emit('load');assert.equal(h.report().transport.loadsAfterSubmit,1);assert.equal(h.report().transport.lastFrameLoadMs,2000);
 await h.reply({app:'iec-startup-trial-p080',version:'P080-RESPONSE-1'});assert.equal(h.report().transport.replyVersion,'older');assert.equal(h.report().requestMs,null);assert.equal(h.initialized.token,undefined);
 await h.reply({nonce:'PRIVATE_WRONG_NONCE'});assert.equal(h.report().transport.replyNonce,'different');assert.equal(h.report().transport.state,'waiting');
 h.at(4000);await h.reply();await h.snap();assert.equal(h.report().transport.state,'response');assert.equal(h.report().transport.replyVersion,'matched');assert.equal(h.report().transport.replyNonce,'matched');assert.equal(h.report().transport.responseMs,4000);assert.equal(h.report().outcome,'success');
 await h.node('copyReport').onclick();for(const v of [ticket,uid,binding,'PRIVATE_WRONG_NONCE','PRIVATE_NAME',GAS])assert(!h.context.copied.includes(v));
});

test('pending request timeouts terminate while intentional cancellation preserves the actual reason',async()=>{
 const h=await launch(false);h.at(60010);[...h.timers.values()].find(t=>!t.interval&&t.ms===60000).fn();await settle();
 assert.equal(h.report().outcome,'timeout');assert.equal(h.report().errorCode,'response-timeout');assert.equal(h.report().transport.waitMs,60000);
 for(const how of ['hidden','offline','blocked','forget']){
  const j=await launch();await j.snap({synced:false});
  if(how==='hidden'){j.context.document.hidden=true;await j.dispatch('visibilitychange');}
  if(how==='offline')await j.dispatch('offline');
  if(how==='blocked')await j.dispatch('securitypolicyviolation',{effectiveDirective:'form-action',blockedURI:GAS+'?PRIVATE',sample:ticket});
  if(how==='forget')await j.node('forgetTrial').onclick();
  await settle();await j.node('copyReport').onclick();assert.equal(j.report().errorCode,'');assert(j.node('ownCard').hidden);assert.equal(j.report().transport.state,'cancelled');
  if(how==='hidden')assert.equal(j.report().outcome,'interrupted');
  if(how==='offline')assert.equal(j.report().outcome,'offline');
  if(how==='blocked'){assert.equal(j.report().outcome,'browser-blocked');assert.equal(j.report().transport.blockedDirective,'form-action');assert(!j.context.copied.includes('PRIVATE'));assert(!j.context.copied.includes(ticket));}
 }
});

test('sync diagnostics classify missing, expired, stopped and malformed stamps without copying values',async()=>{
 for(const [patch,expected] of [[{synced:false},'missing'],[{age:95000},'age-expired'],[{until:1000},'boundary-expired'],[{status:'stopped'},'stopped'],[{age:-1000},'clock-ahead'],[{stampPatch:{version:{stringValue:ticket}}},'invalid-stamp']]){
  const h=await launch();await h.snap(patch);assert.equal(h.report().syncCheck.reason,expected);await h.node('copyReport').onclick();assert(!h.context.copied.includes(ticket));
  if(expected==='stopped'){[...h.timers.values()].find(t=>!t.interval&&t.ms===60000).fn();await settle();await h.node('copyReport').onclick();assert.equal(h.report().outcome,'stopped');assert.equal(h.report().errorCode,'');}
 }
});

