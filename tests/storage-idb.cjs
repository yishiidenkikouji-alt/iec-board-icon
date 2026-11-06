// Minimal transaction scheduler for failure/race tests. Requests are asynchronous;
// readwrite transactions serialize across connections and publish only at commit.
const {setImmediate}=require('node:timers');
module.exports=function database(options={}){
  const records=new Map(),queue=[];let active=false,created=false;
  function schedule(){if(active||!queue.length)return;active=true;queue.shift()();}
  function transaction(){
    let stopped=false,started=false,pending=0,snapshot;const operations=[];
    const tx={error:null,abort(){if(stopped)return;stopped=true;setImmediate(()=>{if(tx.onabort)tx.onabort();if(started){active=false;schedule();}});},objectStore(){return {
      get:key=>request('get',key),put:(value,key)=>request('put',key,value)
    };}};
    function check(){setImmediate(()=>{
      if(stopped||pending)return;
      stopped=true;records.clear();for(const [key,value] of snapshot)records.set(key,value);
      if(tx.oncomplete)tx.oncomplete();active=false;schedule();
    });}
    function request(kind,key,value){
      const r={};pending++;
      function run(){setImmediate(()=>{
        if(stopped)return;
        if(options.readFail&&kind==='get'||options.writeFail&&kind==='put'){
          tx.error=r.error=Error('private storage failure');if(r.onerror)r.onerror();if(tx.onerror)tx.onerror();tx.abort();return;
        }
        if(kind==='get')r.result=structuredClone(snapshot.get(key));
        else if(!options.dropWrites)snapshot.set(key,structuredClone(value));
        if(r.onsuccess)r.onsuccess();pending--;check();
      });}
      if(started)run();else operations.push(run);return r;
    }
    queue.push(()=>{if(stopped){active=false;schedule();return;}started=true;snapshot=new Map(structuredClone([...records]));for(const fn of operations)fn();check();});
    setImmediate(schedule);return tx;
  }
  const api={open(){
    const r={};if(options.hangOpen)return r;
    setImmediate(()=>{
      if(options.openFail){r.error=Error('private open failure');r.onerror();return;}
      if(options.blocked){r.onblocked();return;}
      r.result={close(){},createObjectStore(){},transaction};
      if(!created){created=true;r.transaction={abort(){}};if(r.onupgradeneeded)r.onupgradeneeded();}
      r.onsuccess();
    });return r;
  }};
  return {api,records,options};
};
