const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {env,url,key,ticket,revision,stored,URL_KEY,tick}=require('./connection-diagnostics.cjs');
const database=require('./storage-idb.cjs'),connectionKey='connection:/iec-board-icon/board-pwa/';
const otherUrl=url.replace('AKfycby','AKfycba');
async function settle(){for(let i=0;i<30;i++)await tick();}
function client(db,map=new Map(),bundle=false){
 const e=env(map,{skipDiagnostics:true,config:url});let clock=100;
 e.ctx.performance={now:()=>clock};e.at=ms=>clock=ms;e.ctx.indexedDB=db.api;
 e.run(bundle?'entry-startup-d11.js':'connection-diagnostics.js');if(!bundle)e.run('entry-session.js');
 e.store=e.ctx.IecDeviceStorageD3;return e;
}
function hello(e){return{app:'iec-device-resume-v1',nonce:new URL(e.frame.src).searchParams.get('iec_resume_nonce'),page:'d'.repeat(32),type:'hello'};}
(async()=>{
 // Normal restarts need no write transaction or redundant compatibility write.
 let db=database();db.records.set(connectionKey,{v:1,url});db.records.set(key,JSON.parse(stored));
 let e=client(db,new Map([[URL_KEY,url],[key,stored]]));
 assert.equal(await e.store.connection(),url);assert.equal((await e.store.readTicket(key)).ticket,ticket);
 assert.deepEqual(db.stats.transactions.map(t=>t.mode),['readonly','readonly']);assert.equal(db.stats.puts,0);assert.equal(e.writes.length,0);
 // Existing writes retain durable transaction/readback and revision checks.
 const next=await e.store.writeTicket(key,revision,ticket);assert.notEqual(next.revision,revision);
 assert.equal(db.stats.transactions.at(-1).mode,'readwrite');assert.equal(db.stats.transactions.at(-1).settings.durability,'strict');
 await assert.rejects(e.store.writeTicket(key,revision,ticket),x=>x.code==='conflict');
 // A fresh record is still migrated transactionally. A tombstone/new endpoint
 // appearing between the read-only miss and migration wins over stale local data.
 db=database();e=client(db,new Map([[key,stored]]));assert.equal((await e.store.readTicket(key)).ticket,ticket);
 assert.deepEqual(db.stats.transactions.map(t=>t.mode),['readonly','readwrite']);assert.equal(db.stats.puts,1);
 db=database();db.options.afterCommit=({mode,records})=>{if(mode==='readonly'){db.options.afterCommit=null;records.set(key,{v:1,revision:'e'.repeat(64),ticket:'',removed:true})}};
 e=client(db,new Map([[key,stored]]));assert.equal((await e.store.readTicket(key)).removed,true);assert.equal(db.stats.puts,0);assert.equal(JSON.parse(e.map.get(key)).removed,true);
 db=database();db.options.afterCommit=({mode,records})=>{if(mode==='readonly'){db.options.afterCommit=null;records.set(connectionKey,{v:1,url:otherUrl})}};
 e=client(db,new Map([[URL_KEY,url]]));assert.equal(await e.store.connection(),otherUrl);assert.equal(db.stats.puts,0);
 // An absent record and no local legacy value need no empty write transaction.
 db=database();e=client(db);assert.equal(await e.store.connection(),url);assert.equal((await e.store.readTicket(key)).ticket,'');assert.equal(db.stats.puts,0);assert(db.stats.transactions.every(t=>t.mode==='readonly'));

 // Execute the generated production bundle and actual resume protocol. Only
 // validated child messages can finish the Google wait stage.
 db=database();db.records.set(connectionKey,{v:1,url});db.records.set(key,JSON.parse(stored));
 e=client(db,new Map([[URL_KEY,url],[key,stored]]),true);e.at(250);await settle();
 assert.equal(new URL(e.frame.src).pathname,new URL(url).pathname);assert.equal(e.elements.entryVersion.textContent,'2026.11.12-D11');
 assert.match(e.open(),/接続先の端末確認：0.15秒/);assert.match(e.text(),/Google側の画面準備・通信：未計測/);
 e.at(5250);const message=hello(e);
 await e.message(message,'https://evil.example');await e.message({...message,nonce:'0'.repeat(64)});await e.message(message,'https://script.google.com',{});
 assert.match(e.open(),/Google側の画面準備・通信：未計測/);assert.equal(e.replies.length,0);
 await e.message(message);e.at(5290);await settle();
 assert.equal(e.replies.at(-1).d.ticket,ticket);assert.match(e.open(),/Google側の画面準備・通信：5.00秒/);assert.match(e.text(),/保存情報の読み出し・受け渡し準備：0.04秒/);
 assert.match(e.text(),/保存情報の受け渡し準備完了（入口の読み込みから）：5.29秒/);
 const projection=JSON.parse(JSON.stringify(e.replies.at(-1).d.startupTimingD5));
 assert.deepEqual(projection,{version:'D5-ENTRY-1',entryScriptMs:100,connectionCheckMs:150,frameStartMs:250,frameToHelloMs:5000,restoreReadMs:40,ticketReadyMs:5290,attempt:1,background:false});
 for(const secret of [url,ticket,revision,message.nonce,message.page])assert(!JSON.stringify(projection).includes(secret));
 projection.ticketReadyMs=1;assert.equal(e.ctx.IecConnectionDiagnosticsD1.timingForApp().ticketReadyMs,5290);
 assert.deepEqual(db.stats.transactions.map(t=>t.mode),['readonly','readonly']);
 const initialReport=e.text();e.at(8000);await e.message(message);await settle();assert.equal(e.open().match(/Google側の画面準備・通信：[^\n]+/)[0],initialReport.match(/Google側の画面準備・通信：[^\n]+/)[0]);
 e.ctx.IecConnectionDiagnosticsD1.launch('untrusted '+ticket);await e.click('結果をコピー');
 for(const secret of [url,ticket,revision,message.nonce,message.page,'#private'])assert(!e.ctx.copied.includes(secret));
 // Reload times are reset; late work from the prior nonce cannot complete them.
 e.at(9000);e.frame.src=url;e.ctx.document.hidden=true;e.events['document:visibilitychange'].forEach(fn=>fn());e.ctx.document.hidden=false;
 await e.message(message);await settle();assert.match(e.open(),/画面の読み込み回数：2回/);assert.match(e.text(),/Google側の画面準備・通信：未計測/);assert.match(e.text(),/計測中のバックグラウンド移行：あり/);
 e.at(12000);await e.message(hello(e));await settle();assert.match(e.open(),/Google側の画面準備・通信：3.00秒/);

 // No fake successful handoff time if durable ticket storage cannot be read.
 db=database({readFail:true});e=client(db,new Map([[key,stored]]));e.frame.src=url;await e.message(hello(e));await settle();assert(e.replies.at(-1).d.error);assert.match(e.open(),/保存情報の読み出し・受け渡し準備：未計測/);
 assert.equal(e.replies.at(-1).d.startupTimingD5,undefined);
 // The additive timing field may be absent or broken without blocking restore.
 db=database();db.records.set(key,JSON.parse(stored));e=client(db,new Map([[key,stored]]));e.ctx.IecConnectionDiagnosticsD1={launch(){},session(){},storage(){},timingForApp(){throw Error('timing unavailable')}};e.frame.src=url;await e.message(hello(e));await settle();assert.equal(e.replies.at(-1).d.ticket,ticket);assert.equal(e.replies.at(-1).d.startupTimingD5,null);
 const dir=__dirname+'/../board-pwa/',html=fs.readFileSync(dir+'index.html','utf8'),bundle=fs.readFileSync(dir+'entry-startup-d11.js','utf8');
 assert(html.includes('src="./config.js"'));assert(html.includes('src="./entry-startup-d11.js"'));
 for(const name of ['connection-diagnostics.js','entry-session.js','app.js'])assert(!html.includes('src="./'+name+'"'));
 assert(!bundle.includes('IEC_PWA_CONFIG ='));assert(!bundle.includes('function doGet('));new vm.Script(bundle);
 console.log('PASS D5: routine startup uses 2 read-only / 0 write transactions; previous-card preview read removed; no redundant mirror write; migration race/tombstones and strict saves retained; production bundle starts app; validated parent-clock timing, reload/hidden handling, failed read state and redaction.');
})().catch(error=>{console.error(error);process.exitCode=1});

