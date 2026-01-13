import {useApp} from "../state/appStore"

export function Alerts() {
  const {error, status, clearMessages, selectedProduct, sellerModal, selectedAuction} = useApp() as any
  if (!error && !status) return null
  const floating = !!(selectedProduct || sellerModal || selectedAuction)
  const className = `${error ? "alert error" : "alert success"}${floating ? " floating-alert" : ""}`
  return (
    <div className={className} style={{display:"flex", alignItems:"center", gap:"10px"}}>
      <span style={{flex:1}}>{error || status}</span>
      <button className="ghost" onClick={clearMessages}>X</button>
    </div>
  )
}
