import {useApp} from "../state/appStore"

export function SellerProfileView() {
  const {products, auctions, openSellerModal, openAuctionModal, isSeller, username, email, userId, deleteAuction, closeAuction} = useApp()
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
        <div className="profile-card">
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
