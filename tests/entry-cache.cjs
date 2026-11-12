const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root='https://yishiidenkikouji-alt.github.io/iec-board-icon/board-pwa/';
const dir=__dirname+'/../board-pwa/';
function worker({failInstall=false}={}){
 const events={},stored=new Map(),requests=[],deleted=[];let skipped=0,claimed=0;
 const cache={
  async addAll(values){for(const r of values){requests.push(r);if(failInstall)throw Error('offline');stored.set(r.url,new Response(r.cache==='reload'?'new-public-file':'old-http-cache'));}},
  async match(url){return stored.get(url)?.clone();},async put(url,value){stored.set(url,value);}
 };
 const ctx={URL,Request,Response,Promise,Map,Date,Number,Array,
  fetch:async()=>{throw Error('offline');},
  caches:{open:async()=>cache,keys:async()=>[],delete:async key=>deleted.push(key)},
  self:{location:{href:root+'sw.js'},addEventListener:(name,fn)=>events[name]=fn,
   skipWaiting:async()=>{skipped++;},clients:{claim:async()=>{claimed++;}}}
 };
 vm.runInNewContext(fs.readFileSync(dir+'sw.js','utf8'),ctx);
 function install(){let done;events.install({waitUntil:p=>done=p});return done;}
 function fetch(url){let response,done;events.fetch({request:new Request(url),respondWith:p=>response=p,waitUntil:p=>done=p});return {response,done};}
 return {install,fetch,stored,requests,deleted,status:()=>({skipped,claimed})};
}
test('a new worker populates its shell from fresh HTTP responses, including the versioned entry',async()=>{
 const w=worker();await w.install();assert.equal(w.status().skipped,1);
 const html=fs.readFileSync(dir+'index.html','utf8');
 const match=html.match(/src="\.\/(entry-startup-[^"]+\.js)"/);assert(match);
 const bundleUrl=new URL(match[1],root).href;
 for(const r of w.requests){assert.equal(r.cache,'reload');assert.equal(r.credentials,'same-origin');assert.equal(new URL(r.url).origin,new URL(root).origin);}
 assert.equal(await w.stored.get(root).clone().text(),'new-public-file');
 assert.equal(await w.stored.get(bundleUrl).clone().text(),'new-public-file');
 // A prior index can still resolve its legacy filename. It cannot replace the
 // distinct resource requested by the new index, even with an older cached copy.
 w.stored.set(root+'entry-startup.js',new Response('old-entry-bundle'));
 const result=w.fetch(bundleUrl);assert.equal(await (await result.response).text(),'new-public-file');await result.done;
 assert.equal(fs.readFileSync(dir+match[1],'utf8'),fs.readFileSync(dir+'entry-startup.js','utf8'));
});
test('failed installation cannot activate an incomplete shell or remove existing caches',async()=>{
 const w=worker({failInstall:true});await assert.rejects(w.install(),/offline/);
 assert.deepEqual(w.status(),{skipped:0,claimed:0});assert.deepEqual(w.deleted,[]);
});
test('shell caching does not intercept GAS, Firebase, or non-allowlisted files',()=>{
 const w=worker();for(const url of ['https://script.google.com/macros/s/example/exec','https://ishii-board-p003-startup-p076.web.app/business-assets/p083/part.js',root+'private.json'])assert.equal(w.fetch(url).response,undefined);
});
