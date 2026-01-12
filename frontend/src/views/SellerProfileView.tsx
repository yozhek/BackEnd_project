import {useApp} from "../state/appStore"

export function SellerProfileView() {
  const {products, openSellerModal, isSeller, username, email, userId} = useApp()
  if (!isSeller) {
    return (
      <section className="panel">
        <h3>Only sellers can view this page.</h3>
        <p className="muted">Login as seller to manage your listings.</p>
      </section>
    )
  }
  const mine = userId ? products.filter(p => p.ownerId === userId) : []
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
        {mine.map(p => (
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
    </section>
  )
}
