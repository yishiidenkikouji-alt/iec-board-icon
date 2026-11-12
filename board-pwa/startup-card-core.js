// Anonymous numeric diagnostics only. Never copy arbitrary server objects.
export function safeCardProfile(value) {
  if(!value||value.version!=='P080-CARD-1')return null;
  const result={version:'P080-CARD-1',path:['computed','row-cache','shared-cache','fixed-manual','personal-preferred'].includes(value.path)?value.path:'unknown',stagesMs:{}};
  for(const k of ['rowCacheHits','sharedCacheHits','fixedManualSkips','sharedCalendarSkips','calendarDayCalls','calendarCacheHits','calendarSourceLookups','calendarDirectLookups','calendarFailures','calendarDayMs','calendarLookupMs','rowLookupMs','sharedLookupMs','rpcTotalMs']){
    const v=value[k];result[k]=Number.isFinite(v)&&v>=0&&v<600000?Math.round(v):null;
  }
  for(const k of ['access','scope','board','verify']){const v=(value.stagesMs||{})[k];if(Number.isFinite(v)&&v>=0&&v<600000)result.stagesMs[k]=Math.round(v);}
  return result;
}
