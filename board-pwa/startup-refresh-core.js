// Only a performance hint; neither this digest nor local claims grant access.
// The backend separately verifies the signed ticket and current permissions.
export function grantIdentity(uid,claims,binding) {
  if (!claims || claims.iecP078!==true || claims.binding!==binding
    || !/^[a-f0-9]{64}$/.test(binding) || !/^[a-f0-9]{64}$/.test(claims.sid||'')
    || uid!=='p078_'+claims.sid
    || !['personUid','pv','dv','epoch','trialEpoch'].every(k=>typeof claims[k]==='string'&&claims[k].length>0&&claims[k].length<=200))throw Error('grant');
  return JSON.stringify([uid,claims.personUid,claims.sid,claims.pv,claims.dv,claims.epoch,claims.trialEpoch,binding]);
}
