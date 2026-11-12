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

