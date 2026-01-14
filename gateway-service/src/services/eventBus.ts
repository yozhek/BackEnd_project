type IncomingEvent = {
  type: string
  payload: any
}

export function handleIncoming(event: IncomingEvent, broadcast: (ev:any)=>void) {
  if (!event || typeof event.type !== "string" || !event.type.trim()) return {ok:false, error:"missing type"}
  if (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload)) {
    return {ok:false, error:"payload must be object"}
  }
  broadcast(event)
  return {ok:true}
}
