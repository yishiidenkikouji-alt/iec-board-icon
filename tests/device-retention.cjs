const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {env,url,key,ticket,revision,stored,URL_KEY,tick}=require('./connection-diagnostics.cjs');
const database=require('./storage-idb.cjs');
const otherUrl=url.replace('AKfycby','AKfycba'),nextTicket=ticket.replace(/A/g,'C');
function client(db,map=new Map(),options={}){
  const e=env(map,options);e.ctx.indexedDB=db.api;
  e.ctx.setTimeout=(fn,ms)=>{const timer=setTimeout(fn,ms);if(ms>=10000)timer.unref();return timer;};e.ctx.clearTimeout=clearTimeout;
  e.ctx.navigator.storage={persisted:async()=>false,persist:async()=>options.persistent!==false};
  e.run('entry-session.js');e.store=e.ctx.IecDeviceStorageD3;return e;
}
async function settle(){for(let i=0;i<15;i++)await tick();}
async function hello(e){
  e.frame.src=url;const nonce=new URL(e.frame.src).searchParams.get('iec_resume_nonce');
  e.base={app:'iec-device-resume-v1',nonce,page:'d'.repeat(32)};
  await e.message({...e.base,type:'hello'});await settle();return e.replies.at(-1).d;
}
(async()=>{
  // An existing registration is migrated before any loss. Recreating the entire
  // page with empty localStorage still returns the same server-verifiable ticket.
  let db=database(),e=client(db,new Map([[key,stored],[URL_KEY,otherUrl]]));
  assert.equal(await e.store.connection(),otherUrl);
  assert.equal((await hello(e)).ticket,ticket);assert.equal(db.records.get(key).ticket,ticket);
  e=client(db,new Map(),{config:url});
  assert.equal(await e.store.connection(),otherUrl);
  assert.equal((await hello(e)).ticket,ticket);assert.match(e.open(),/予備保存から復元/);
  assert.equal(JSON.parse(e.map.get(key)).ticket,ticket);
  await settle();assert.match(e.open(),/自動削除の抑制：有効/);
  // No private data appears in the copied diagnostic report.
  await e.click('結果をコピー');for(const secret of [ticket,revision,url,otherUrl])assert.ok(!e.ctx.copied.includes(secret));

  // A fresh installation reaches the company entry without saving an identity.
  db=database();e=client(db);e.run('config.js');assert.equal(await e.store.connection(),url);
  assert.equal((await hello(e)).ticket,'');assert.equal(e.map.has(key),false);
  // Save ACK is issued after committed readback, and survives a fresh context.
  await e.message({...e.base,type:'save',seq:1,requestId:'save',expectedRevision:'',ticket});
  assert.notEqual(e.replies.at(-1).d.type,'ack');await settle();
  const saved=e.replies.at(-1).d;assert.equal(saved.ok,true);assert.ok(saved.revision);
  assert.equal((await hello(client(db))).ticket,ticket);

  // A removed record wins over an old local copy. Registration can subsequently
  // proceed with the tombstone's new revision; an old tab cannot overwrite it.
  const removed=await e.store.writeTicket(key,saved.revision,'');
  e=client(db,new Map([[key,stored]]));let row=await e.store.readTicket(key);
  assert.equal(row.ticket,'');assert.equal(row.revision,removed.revision);
  await assert.rejects(e.store.writeTicket(key,revision,ticket),x=>x.code==='conflict');
  row=await e.store.writeTicket(key,removed.revision,nextTicket);
  assert.equal((await e.store.readTicket(key)).ticket,nextTicket);

  // Cross-tab CAS is inside one IDB transaction, not a check followed by a write.
  const a=client(db),b=client(db);
  const writes=await Promise.allSettled([a.store.writeTicket(key,row.revision,ticket),b.store.writeTicket(key,row.revision,nextTicket)]);
  assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(writes.find(r=>r.status==='rejected').reason.code,'conflict');

  // Failed read/write/verification cannot look like an empty or successful save.
  for(const failure of ['readFail','writeFail','dropWrites']){
    db=database();e=client(db,new Map([[key,stored]]));await e.store.readTicket(key);
    const before=JSON.stringify([...db.records]);db.options[failure]=true;
    if(failure==='readFail')await assert.rejects(e.store.readTicket(key));
    else await assert.rejects(e.store.writeTicket(key,revision,nextTicket));
    assert.equal(JSON.stringify([...db.records]),before);assert.equal(JSON.parse(e.map.get(key)).ticket,ticket);
    assert.match(e.open(),/未登録とは判定していません/);
  }
  // Failing the first backup write must not discard a usable legacy ticket.
  db=database({writeFail:true});e=client(db,new Map([[key,stored]]));
  assert.equal((await hello(e)).ticket,ticket);assert.equal(db.records.size,0);
  assert.match(e.open(),/通常保存は確認済み・予備保存に失敗/);
  // localStorage failure no longer prevents a durable ticket from being read/saved.
  db=database();e=client(db,new Map([[key,stored]]));await e.store.readTicket(key);
  e=client(db,new Map(),{writeFail:true,persistent:false});row=await e.store.readTicket(key);
  assert.equal(row.ticket,ticket);row=await e.store.writeTicket(key,row.revision,nextTicket);
  assert.equal(db.records.get(key).ticket,nextTicket);assert.match(e.open(),/予備保存は確認済み・通常保存に失敗/);
  await settle();assert.match(e.open(),/未許可/);
  // Missing local data is not assumed when a storage API reports a read failure.
  e=client(database(),new Map([[key,stored]]),{readFail:true});await assert.rejects(e.store.readTicket(key));
  // DB open errors preserve both stores and report an explicit ready error.
  db=database({openFail:true});e=client(db,new Map([[key,stored]]));const failed=await hello(e);
  assert.ok(failed.error);assert.equal(e.map.get(key),stored);assert.equal(db.records.size,0);
  assert.ok(!e.open().includes('private open failure'));

  // Delayed work from the old frame must neither write into the new connection
  // nor send a credential-bearing response to it.
  db=database();e=client(db,new Map([[key,stored]]));e.frame.src=url;
  let nonce=new URL(e.frame.src).searchParams.get('iec_resume_nonce');
  await e.message({app:'iec-device-resume-v1',nonce,page:'d'.repeat(32),type:'hello'});
  e.frame.src=otherUrl;await settle();assert.equal(e.replies.length,0);assert.equal(db.records.size,0);
  e=client(db,new Map([[key,stored]]));await hello(e);const before=JSON.stringify([...db.records]);
  await e.message({...e.base,type:'save',seq:1,requestId:'old-frame',expectedRevision:revision,ticket:nextTicket});
  e.frame.src=otherUrl;await settle();assert.equal(JSON.stringify([...db.records]),before);assert.ok(!e.replies.some(r=>r.d.requestId==='old-frame'));

  // A slow startup cannot overwrite an explicit connection change.
  db=database();e=client(db,new Map([[URL_KEY,url]]));e.run('app.js');
  e.ctx.document.getElementById('gasUrl').value=otherUrl;
  await e.elements.connectionForm.onsubmit({preventDefault(){}});await settle();
  assert.equal(new URL(e.frame.src).pathname,new URL(otherUrl).pathname);
  assert.equal(await e.store.connection(),otherUrl);

  // A blocked or hung DB returns a bounded error, never an empty registration.
  for(const options of [{blocked:true},{hangOpen:true}]){
    e=client(database(options),new Map([[key,stored]]));
    e.ctx.setTimeout=(fn,ms)=>setTimeout(fn,Math.min(ms,20));
    await assert.rejects(e.store.readTicket(key));assert.equal(e.map.get(key),stored);
  }
  const html=fs.readFileSync(__dirname+'/../board-pwa/index.html','utf8');
  assert.ok(html.indexOf('config.js')<html.indexOf('entry-startup-d12.js'));
  const bundle=fs.readFileSync(__dirname+'/../board-pwa/entry-startup-d12.js','utf8');assert.ok(bundle.indexOf('/* entry-session.js */')<bundle.indexOf('/* app.js */'));
  assert.ok(fs.readFileSync(__dirname+'/../board-pwa/sw.js','utf8').includes('v56-entry-d12'));
  console.log('PASS: D3 migration/restart after local loss; common and custom endpoint recovery; committed ACK; cross-tab CAS; tombstones; storage failure/timeout; origin isolation; navigation races; private diagnostic redaction; persistence grant/denial; B3 startup change precedence.');
})().catch(e=>{console.error(e);process.exitCode=1;});

