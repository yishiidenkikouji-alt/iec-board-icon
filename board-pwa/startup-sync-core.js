import {decodeCard,validCard} from './startup-firebase-core.js?v=P078-ENTRY-1';
export function decodeSyncedCard(response){
 const d=decodeCard(response),f=response.fields.syncP081?.mapValue?.fields;
 d.sync=null;if(!f)return d;
 const date=k=>Date.parse(f[k]?.timestampValue);
 const receipt=f.refreshNonce?.stringValue;
 d.sync={version:f.version?.stringValue,status:f.status?.stringValue,checkedAt:date('checkedAt'),validUntil:date('validUntil'),windowUntil:date('windowUntil'),refreshNonce:/^[a-f0-9]{64}$/.test(receipt||'')?receipt:''};
 d.sync.policy=safePolicyP081({version:f.hoursVersion?.stringValue,mode:f.hoursMode?.stringValue,remainingMs:date('windowUntil')-Date.now(),background:f.background?.stringValue});
 return d;
}
export function syncFresh(d,uid,binding,at=Date.now()){
 if(!validCard(d,uid,binding))return false;
 const s=d.sync;if(!s||s.version!=='P081-SYNC-1'||s.status!=='ready')return false;
 return [s.checkedAt,s.validUntil,s.windowUntil,at].every(Number.isFinite)&&s.checkedAt===d.updatedAt.toMillis()&&s.checkedAt<=at&&s.checkedAt>at-90000&&s.validUntil>at&&s.validUntil<=s.checkedAt+90000&&s.validUntil<=s.windowUntil&&s.validUntil<=d.expiresAt.toMillis();
}
// Fixed reason labels and bounded durations only; never expose document values.
export function syncCheck(d,uid,binding,at=Date.now()){
 const s=d&&d.sync,bounded=v=>Number.isFinite(v)&&Math.abs(v)<=604800000?Math.round(v):null;
 const result={reason:'invalid-stamp',ageMs:s?bounded(at-s.checkedAt):null,validForMs:s?bounded(s.validUntil-at):null};
 if(!s)result.reason='missing';
 else if(s.status==='stopped')result.reason='stopped';
 else if(syncFresh(d,uid,binding,at))result.reason='ready';
 else if(s.version==='P081-SYNC-1'&&s.status==='ready'&&[s.checkedAt,s.validUntil,s.windowUntil,at].every(Number.isFinite)&&s.checkedAt===d.updatedAt.toMillis()){
  result.reason=s.checkedAt>at?'clock-ahead':s.windowUntil<=at?'window-ended':at-s.checkedAt>=90000?'age-expired':s.validUntil<=at?'boundary-expired':'invalid-stamp';
 }
 return result;
}
export function safeRefreshP081(value){
 if(!value||!['P081-REFRESH-2','P081-REFRESH-3'].includes(value.version))return null;
 const latest=value.version==='P081-REFRESH-3',path=latest?'combined-sync':'single-sync';
 const result={version:value.version,path:value.path===path?path:'unknown',resumeCardRequested:value.resumeCardRequested===true};
 for(const key of latest?['resumeMs','sourceMs','cardMs','verifyMs','lockWaitMs','triggerMs','writeMs','serverTotalMs']:['resumeMs','prepareMs','triggerMs','syncMs','serverTotalMs']){
  const v=value[key];result[key]=Number.isFinite(v)&&v>=0&&v<600000?Math.round(v):null;
 }
 return result;
}
export function safePolicyP081(value){
 if(!value||value.version!=='P081-HOURS-1')return null;
 const modes=['weekday-used','saturday-used','sunday-on-use','holiday-on-use','outside-hours','calendar-unknown'];
 return {version:'P081-HOURS-1',mode:modes.includes(value.mode)?value.mode:'unknown',remainingMs:Number.isFinite(value.remainingMs)?Math.max(0,Math.min(43200000,Math.round(value.remainingMs))):null,background:['enabled','budget','no-grant'].includes(value.background)?value.background:'unknown'};
}

