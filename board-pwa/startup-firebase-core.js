// Pure validation shared with the browser tests. No network or storage access.
export function validCard(d, uid, binding) {
  return d && d.uid === uid && d.binding === binding
    && d.card && ['name','label','place','workContent'].every(k => typeof d.card[k] === 'string' && d.card[k].length <= 3000)
    && !!d.card.name && /^[a-f0-9]{64}$/.test(d.requestNonce || '')
    && d.updatedAt && typeof d.updatedAt.toMillis === 'function'
    && Number.isFinite(d.updatedAt.toMillis())
    && d.expiresAt && typeof d.expiresAt.toMillis === 'function'
    && Number.isFinite(d.expiresAt.toMillis());
}
export function ticketIdentity(ticket) {
  if (typeof ticket !== 'string' || !/^iec-resume-v1\.[A-Za-z0-9_-]{50,1600}\.[A-Za-z0-9_-]{43}$/.test(ticket)) throw Error('identity');
  const raw=ticket.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const bytes=Uint8Array.from(atob(raw), c=>c.charCodeAt(0));
  const p=JSON.parse(new TextDecoder().decode(bytes));
  if(p.v!==1 || !/^iec-device-v3:[a-f0-9]{32}$/.test(p.i||'') || typeof p.r!=='string' || !p.r || typeof p.b!=='string' || !p.b || !Number.isFinite(p.e))throw Error('identity');
  return JSON.stringify([p.i,p.r,p.b]);
}
export function safeCode(error) {
  const c=String(error && error.code || '').replace(/^firestore\//,'');
  return ['permission-denied','unavailable','unauthenticated','auth/network-request-failed','auth/user-disabled','auth/user-token-expired','auth/invalid-custom-token','auth/invalid-api-key'].includes(c)?c:'unavailable';
}
export function decodeCard(response) {
  const f=response&&response.fields, c=f&&f.card&&f.card.mapValue&&f.card.mapValue.fields;
  if(!f||!c)throw Error('response');
  const text=(o,k)=>o[k]&&o[k].stringValue;
  const date=k=>{const ms=Date.parse(f[k]&&f[k].timestampValue);if(!Number.isFinite(ms))throw Error('response');return {toMillis:()=>ms};};
  return {uid:text(f,'uid'),binding:text(f,'binding'),requestNonce:text(f,'requestNonce'),updatedAt:date('updatedAt'),expiresAt:date('expiresAt'),card:Object.fromEntries(['name','label','place','workContent'].map(k=>[k,text(c,k)]))};
}
