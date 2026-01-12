type IncomingEvent = {
  type: string
  payload: any
}

export function handleIncoming(event: IncomingEvent, broadcast: (ev:any)=>void) {
  if (!event?.type) return {ok:false, error:"missing type"}
  broadcast(event)
  return {ok:true}
}
