const test=require('node:test'),assert=require('node:assert/strict');
const {env,key,stored}=require('./connection-diagnostics.cjs');
test('invited-device choice is reachable after normal startup and does not change registration',()=>{
 const e=env(new Map([[key,stored]]));let selected=false,writes=0;
 e.ctx.IEC_PWA_CONFIG.nativeP086OptIn=true;
 e.ctx.IecNativeP086={selected:()=>selected,choose:value=>{selected=value;writes++;return value;}};
 e.elements.entryBar.hidden=true;
 e.ctx.IecConnectionDiagnosticsD1.bridge('ready');
 const dock=e.ctx.document.body.children.find(x=>x.id==='connectionDiagnosticDockD17');
 assert.equal(dock.hidden,false);dock.children[0].onclick();e.click('新しい起動方式を使う');
 assert.equal(selected,true);assert.equal(writes,1);assert.equal(e.map.get(key),stored);assert.equal(e.frame.src,'');
 e.click('通常の起動方式に戻す');assert.equal(selected,false);assert.equal(e.map.get(key),stored);assert.equal(e.writes.length,0);
});
test('current-launch copy uses the fresh short report and preserves registration',async()=>{
 const e=env(new Map([[key,stored]]));let reads=0;
 e.ctx.IecNativeP086={diagnostics:()=>({version:'P086-ENTRY-DIAG-1',attempt:++reads})};
 e.open();await e.click('今回の起動診断をコピー');assert.equal(JSON.parse(e.ctx.copied).attempt,1);
 await e.click('今回の起動診断をコピー');assert.equal(JSON.parse(e.ctx.copied).attempt,2);
 assert.equal(e.map.get(key),stored);assert.equal(e.writes.length,0);
 e.ctx.IecNativeP086.diagnostics=()=>null;await e.click('今回の起動診断をコピー');
 assert.equal(JSON.parse(e.ctx.copied).attempt,2);
});

