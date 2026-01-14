import {useEffect,useState} from "react"
import {useApp} from "../state/appStore"
import {api} from "../api/client"

export function BuyerProfileView() {
  const {orders, resolveProductInfo, deleteOrder, isBuyer, username, email, userId} = useApp()
  const [openOrderId,setOpenOrderId] = useState<string|null>(null)
  const [tgToken,setTgToken] = useState("")
  const [tgLink,setTgLink] = useState("")
  const [tgStatus,setTgStatus] = useState<string>("")
  const [tgBound,setTgBound] = useState(false)
  const [tgUsername,setTgUsername] = useState<string>("")
  const [polling,setPolling] = useState(false)

  useEffect(() => {
    async function loadBinding() {
      if (!userId) return
      try {
        const b = await api.telegramBinding(userId)
        if (b) {
          setTgBound(true)
          setTgUsername(b.username || "")
        } else {
          setTgBound(false)
          setTgUsername("")
        }
      } catch {
        setTgBound(false)
        setTgUsername("")
      }
    }
    loadBinding()
  }, [userId])

  async function pollBinding(attempts=0) {
    if (!userId || attempts > 12 || tgBound) { setPolling(false); return }
    try {
      const b = await api.telegramBinding(userId)
      if (b) {
        setTgBound(true)
        setTgUsername(b.username || "")
        setTgStatus("Linked")
        setTgToken("")
        setTgLink("")
        setPolling(false)
        return
      }
    } catch {}
    setTimeout(() => pollBinding(attempts+1), 5000)
  }

  async function linkTelegram() {
    if (!userId) return
    try {
      const res = await api.telegramInit(userId)
      setTgToken(res.token)
      setTgLink(res.link)
      setTgStatus("Open Telegram and tap Start to link.")
      setPolling(true)
      setTimeout(() => pollBinding(0), 1000)
      if (res.link) window.open(res.link, "_blank")
    } catch (e:any) {
      setTgStatus(e.message || "Failed to start linking")
    }
  }

  async function unlinkTelegram() {
    if (!userId) return
    try {
      await api.telegramUnlink(userId)
      setTgBound(false)
      setTgUsername("")
      setTgToken("")
      setTgStatus("Unlinked")
    } catch (e:any) {
      setTgStatus(e.message || "Failed to unlink")
    }
  }

  if (!isBuyer) {
    return (
      <section className="panel">
        <h3>Only buyers can view this page.</h3>
        <p className="muted">Login as buyer to see your orders.</p>
      </section>
    )
  }

  return (
    <section className="panel form-panel">
      <div>
        <h2>Buyer profile</h2>
        <div className="profile-card" style={{width:"100%"}}>
          <div className="profile-row">
            <span className="profile-label">Username:</span>
            <span className="profile-value">{username || "Buyer"}</span>
          </div>
          {email && (
            <div className="profile-row">
              <span className="profile-label">Email:</span>
              <span className="profile-value">{email}</span>
            </div>
          )}
        </div>
        <div className="profile-card" style={{marginTop:"10px", width:"100%", gap:"8px"}}>
          <div className="row" style={{gap:"10px", alignItems:"center"}}>
            <div className="profile-row" style={{gap:"6px"}}>
              <span className="profile-label">Telegram:</span>
              <span className="profile-value">{tgBound ? (tgUsername || "Linked") : "Not linked"}</span>
            </div>
            {!tgBound && (
              <button type="button" style={{minWidth:"140px"}} onClick={linkTelegram}>Link Telegram</button>
            )}
            {tgBound && (
              <button className="danger" type="button" style={{minWidth:"140px"}} onClick={unlinkTelegram}>Unlink Telegram</button>
            )}
          </div>
        </div>
        <p className="muted" style={{marginTop:"10px"}}>Order history</p>
      </div>
      <div className="orders">
        <ul className="list">
          {orders.map((o: any) => {
            const open = openOrderId === o.id
            return (
              <li key={o.id} className="card small" onClick={() => setOpenOrderId(open ? null : o.id)}>
                <div className="row space">
                  <div>
                    <strong>Order {o.id}</strong>
                    <p className="muted">{o.items.length} items</p>
                  </div>
                  <div className="row" style={{gap:"8px"}}>
                    <button className="danger" onClick={e => {e.stopPropagation(); deleteOrder(o.id)}}>Delete</button>
                    <span className="badge">{open ? "Hide" : "Details"}</span>
                  </div>
                </div>
                <p>Total ${o.totalPrice.toFixed(2)}</p>
                {open && (
                  <div className="order-items">
                    {o.items.map((it: any,idx: number) => {
                      const info = resolveProductInfo(it)
                      const subtotal = Number((info.price * it.quantity).toFixed(2))
                      return (
                        <div key={idx} className="row space">
                          <span>{info.title}</span>
                          <span>{it.quantity} x ${info.price.toFixed(2)} = ${subtotal.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })}
          {!orders.length && <p className="muted">No orders yet</p>}
        </ul>
      </div>
    </section>
  )
}
