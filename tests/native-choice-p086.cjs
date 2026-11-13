const test=require('node:test'),assert=require('node:assert/strict');
const {env,key,stored}=require('./connection-diagnostics.cjs');
test('invited-device choice is reachable after normal startup and does not change registration',()=>{
 const e=env(new Map([[key,stored]]));let selected=false,writes=0;
 e.ctx.IEC_PWA_CONFIG.nativeP086OptIn=true;
 e.ctx.IecNativeP086={selected:()=>selected,choose:value=>{selected=value;writes++;return value;}};
 e.ctx.IecConnectionDiagnosticsD1.bridge('ready');
 const launcher=e.ctx.document.body.children.find(x=>x.id==='connectionDiagnosticLauncherD3');
 assert.equal(launcher.hidden,false);e.open();e.click('新しい起動方式を使う');
 assert.equal(selected,true);assert.equal(writes,1);assert.equal(e.map.get(key),stored);assert.equal(e.frame.src,'');
 e.click('通常の起動方式に戻す');assert.equal(selected,false);assert.equal(e.map.get(key),stored);assert.equal(e.writes.length,0);
});
