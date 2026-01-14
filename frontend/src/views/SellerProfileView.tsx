import {useEffect,useState} from "react"
import {useApp} from "../state/appStore"
import {api} from "../api/client"

export function SellerProfileView() {
  const {products, auctions, openSellerModal, openAuctionModal, isSeller, username, email, userId, deleteAuction, closeAuction} = useApp()
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
      setTgLink("")
      setTgStatus("Unlinked")
    } catch (e:any) {
      setTgStatus(e.message || "Failed to unlink")
    }
  }

  if (!isSeller) {
    return (
      <section className="panel">
        <h3>Only sellers can view this page.</h3>
        <p className="muted">Login as seller to manage your listings.</p>
      </section>
    )
  }
  const mine = userId ? products.filter(p => p.ownerId === userId) : []
  const nonAuctionProducts = mine.filter(p => !p.isAuction)
  const myAuctions = userId ? auctions.filter(a => a.sellerId === userId && a.status !== "closed" && a.status !== "cancelled") : []
  return (
    <section className="panel form-panel">
      <div>
        <h2>Seller profile</h2>
        <div className="profile-card" style={{width:"100%"}}>
          <div className="profile-row">
            <span className="profile-label">Username:</span>
            <span className="profile-value">{username || "Seller"}</span>
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
        <p className="muted" style={{marginTop:"10px"}}>Your listings</p>
      </div>
      <div className="grid">
        {nonAuctionProducts.map(p => (
          <article key={p.id} className="card" onClick={() => openSellerModal(p)}>
            <div className="card-title">
              <div className="title-block">
                {p.imageBase64 && <img src={p.imageBase64} className="thumb" alt={p.title} />}
                {!p.imageBase64 && <div className="thumb placeholder">No image</div>}
                <div>
                  <h3>{p.title}</h3>
                  <p className="badge">{p.category}</p>
                </div>
              </div>
              <div className="price">
                <span className="now">${p.discountedPrice.toFixed(2)}</span>
                {p.discountPercent > 0 && (
                  <div className="old-price">
                    <span className="was">${p.price.toFixed(2)}</span>
                    <span className="discount">-{p.discountPercent}%</span>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
        {!mine.length && <p className="muted">No products yet</p>}
      </div>
      <p className="muted" style={{marginTop:"16px"}}>Your auctions</p>
      <div className="grid">
        {myAuctions.map(a => (
          <article key={a.id} className="card" onClick={() => openAuctionModal(a)}>
            <div className="card-title">
              <div className="title-block">
                {a.imageBase64 ? <img src={a.imageBase64} className="thumb" alt={a.productTitle} /> : <div className="thumb placeholder">No image</div>}
                <div>
                  <h3>{a.productTitle}</h3>
                  {a.category && <p className="badge">{a.category}</p>}
                  <p className="muted small">Status: <span className={`pill ${a.status === "awaiting_payment" ? "warn" : ""}`}>{a.status}</span></p>
                  <p className="muted small">Ends: {new Date(a.endsAt).toLocaleString()}</p>
                  {a.status === "awaiting_payment" && a.paymentExpiresAt && (
                    <p className="muted small">Payment expires: {new Date(a.paymentExpiresAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
              <div className="price">
                <span className="now">${(a.currentAmount ?? a.startPrice).toFixed(2)}</span>
              </div>
            </div>
          </article>
        ))}
        {!myAuctions.length && <p className="muted">No auctions yet</p>}
      </div>
    </section>
  )
}
