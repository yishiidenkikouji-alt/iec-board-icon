import {decodeCard,validCard} from './startup-firebase-core.js?v=P078-ENTRY-1';
export function decodeSyncedCard(response){
 const d=decodeCard(response),f=response.fields.syncP081?.mapValue?.fields;
 d.sync=null;if(!f)return d;
 const date=k=>Date.parse(f[k]?.timestampValue);
 d.sync={version:f.version?.stringValue,status:f.status?.stringValue,checkedAt:date('checkedAt'),validUntil:date('validUntil'),windowUntil:date('windowUntil')};
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

