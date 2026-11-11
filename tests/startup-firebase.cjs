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
 const A={indexedDBLocalPersistence:'idb',browserLocalPersistence:'local',initializeAuth(app,c){initialized.auth=c;return auth;},getIdToken:async()=>'PRIVATE_ID_TOKEN',getIdTokenResult:async()=>({claims:{iecP078:true,binding}}),signOut:async()=>{signouts++;auth.currentUser=null;if(authCallback)authCallback(null);},signInWithCustomToken:async(a,token)=>{initialized.token=token;auth.currentUser=user;if(authCallback)authCallback(user);return {user};},onAuthStateChanged:(a,fn)=>{authCallback=fn;queueMicrotask(()=>{if(authCallback===fn)fn(auth.currentUser);});return()=>{if(authCallback===fn)authCallback=null;};}};
 const context={URL,Uint8Array,TextEncoder,TextDecoder,atob:s=>Buffer.from(s,'base64').toString('binary'),crypto:{getRandomValues:a=>webcrypto.getRandomValues(a),subtle:{digest:async(a,b)=>createHash('sha256').update(b).digest()}},AbortController,fetch:async(url,opt)=>{initialized.path=url;initialized.fetch=opt;return new Promise(resolve=>{fetchReply=resolve;});},performance:{now:()=>clock},navigator:{clipboard:{writeText:async s=>context.copied=s}},location:new URL(ROOT+'startup-firebase.html'),document:{hidden:false,body:create('body'),createElement:create,getElementById:node,addEventListener:(k,fn)=>(events[k]??=[]).push(fn)},addEventListener:(k,fn)=>(events[k]??=[]).push(fn),removeEventListener:(k,fn)=>events[k]=(events[k]||[]).filter(x=>x!==fn),setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>{timers.set(++timerId,{fn,ms,interval:true});return timerId;},clearInterval:id=>timers.delete(id),loadSDK:async url=>url.includes('firebase-app')?{initializeApp:(c,name)=>{initialized.name=name;return {};}}:A,IecDeviceStorageD3:{connection:async()=>GAS,readTicket:async()=>saved}};
 context.window=context;context.top=context;vm.createContext(context);
 const core=fs.readFileSync(path.join(root,'startup-firebase-core.js'),'utf8').replaceAll('export function','function');
 const code=fs.readFileSync(path.join(root,'startup-firebase.js'),'utf8').replace(/^import .+;\n/m,'').replaceAll('import(sdk+','loadSDK(sdk+');vm.runInContext(core+'\n'+code,context);await settle();
 const dispatch=async(k,e={})=>{for(const fn of events[k]||[])await fn(e);await settle();};
 const data=(fresh=false)=>({uid,binding,card:{name:'PRIVATE_NAME',label:'test',place:'PRIVATE_PLACE',workContent:'<img onerror=evil()>'},updatedAt:{toMillis:()=>Date.now()},expiresAt:{toMillis:()=>Date.now()+600000},requestNonce:fresh?posts[0].fields.nonce:'3'.repeat(64)});
 const snap=async({fresh=false}={})=>{const d=data(fresh),str=value=>({stringValue:value}),fields={uid:str(d.uid),binding:str(d.binding),requestNonce:str(d.requestNonce),updatedAt:{timestampValue:new Date(d.updatedAt.toMillis()).toISOString()},expiresAt:{timestampValue:new Date(d.expiresAt.toMillis()).toISOString()},card:{mapValue:{fields:Object.fromEntries(Object.entries(d.card).map(([k,v])=>[k,str(v)]))}}};if(fetchReply){const resolve=fetchReply;fetchReply=null;resolve({ok:true,status:200,json:async()=>({fields})});}await settle();};
 const reply=async(patch={},origin='https://script.googleusercontent.com',source=created.find(c=>c.tag==='iframe')?.contentWindow)=>{await dispatch('message',{origin,source,data:{app:'iec-startup-trial-p078',version:'P078-RESPONSE-1',nonce:posts[0]?.fields.nonce,result:{ok:true,uid,binding,customToken:'PRIVATE_CUSTOM_TOKEN',timing:{gasTotalMs:1000,identityMs:100,cardMs:300,identityAndCardMs:500}},...patch}});};
 return {context,initialized,posts,created,timers,node,dispatch,snap,reply,setSaved:v=>saved=v,at:v=>clock=v,report:()=>JSON.parse(node('trialReport').value),deny:async()=>{if(fetchReply){const resolve=fetchReply;fetchReply=null;resolve({ok:false,status:403});}await settle();},signouts:()=>signouts};
}
test('restored auth is isolated and only server-confirmed snapshots display; latest timing is separate',async()=>{
 const h=await launch();assert.equal(h.initialized.name,'iec-startup-p078');assert.equal(h.initialized.fetch.cache,'no-store');assert.equal(h.initialized.fetch.credentials,'omit');assert.equal(h.report().mode,'restored');assert.equal(h.posts.length,1);assert.equal(h.posts[0].method,'POST');assert.equal(h.posts[0].action,GAS);assert.deepEqual(Object.keys(h.posts[0].fields),['p078','nonce','ticket']);
 assert(h.node('ownCard').hidden); // No previous card before a successful server response.
 h.at(800);await h.snap();assert.equal(h.report().firstVerifiedCardMs,800);assert.equal(h.report().latestCardMs,null);assert.match(h.node('cardFreshness').textContent,/前回取得/);
 h.at(5000);await h.reply();await h.snap({fresh:true});assert.equal(h.report().latestCardMs,5000);assert.equal(h.report().outcome,'success');assert.match(h.node('cardFreshness').textContent,/最新の行先を確認/);
 await h.node('copyReport').onclick();for(const value of [ticket,binding,uid,'PRIVATE_NAME','PRIVATE_PLACE','PRIVATE_CUSTOM_TOKEN',GAS])assert(!h.context.copied.includes(value));
});
test('first connection waits for verified bootstrap then reads own Firestore doc',async()=>{
 const h=await launch(false);assert.equal(h.report().mode,'first-connection');assert.equal(h.initialized.path,undefined);assert(h.node('ownCard').hidden);await h.reply();assert(h.initialized.path.endsWith('/p078Cards/'+uid));await h.snap({fresh:true});assert.equal(h.report().outcome,'success');
});
test('spoofed message origin/source/nonce cannot sign in',async()=>{
 const h=await launch(false);await h.reply({},'https://evil.invalid');await h.reply({},'https://script.googleusercontent.com',{});await h.reply({nonce:'bad'});assert.equal(h.initialized.token,undefined);assert(h.node('ownCard').hidden);await h.reply();assert.equal(h.initialized.token,'PRIVATE_CUSTOM_TOKEN');
});
test('repeat server check, offline and hidden clear private fields',async()=>{
 for(const how of ['deny','timeout','offline','hidden']){const h=await launch();await h.snap();await h.reply();await h.snap({fresh:true});assert(!h.node('ownCard').hidden);if(['deny','timeout'].includes(how)){const interval=[...h.timers.values()].find(t=>t.interval&&t.ms===10000);interval.fn();await settle();if(how==='deny')await h.deny();else [...h.timers.values()].find(t=>t.ms===5000).fn();}if(how==='offline')await h.dispatch('offline');if(how==='hidden'){h.context.document.hidden=true;await h.dispatch('visibilitychange');}assert(h.node('ownCard').hidden);assert.equal(h.node('cardName').textContent,'');}
});
test('canonical ticket removal and local identity change prevent late snapshot/response display',async()=>{
 const h=await launch();h.setSaved({ticket:'',removed:true,revision:'r2'});await h.snap();assert(h.node('ownCard').hidden);assert.equal(h.report().outcome,'identity-changed');await h.reply();assert(h.node('ownCard').hidden);
 const j=await launch();await j.dispatch('storage',{key:null});await j.reply();assert(j.node('ownCard').hidden);assert.equal(j.signouts(),1);
});
test('failed bootstrap clears restored card; retries never happen automatically',async()=>{
 const h=await launch();await h.snap();await h.reply({result:{ok:false,code:'ACCESS_DENIED'}});assert(h.node('ownCard').hidden);assert.notEqual(h.report().outcome,'success');assert.equal(h.posts.length,1);
 const j=await launch();await j.snap();const t=[...j.timers.values()].find(t=>t.ms===75000);t.fn();await settle();assert(j.node('ownCard').hidden);assert.equal(j.posts.length,1);
});
test('forget trial signs out only its named Firebase auth; no normal identity write',async()=>{
 const h=await launch();await h.snap();await h.node('forgetTrial').onclick();assert.equal(h.signouts(),1);assert(h.node('ownCard').hidden);assert.match(h.node('trialStatus').textContent,/通常の業務アプリの登録はそのまま/);
 const s=fs.readFileSync(path.join(root,'startup-firebase.js'),'utf8');assert(!/localStorage\.(?:setItem|removeItem)|\.writeTicket\(/.test(s));
});
