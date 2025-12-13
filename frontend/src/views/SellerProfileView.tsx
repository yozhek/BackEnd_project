import {useApp} from "../state/appStore"

export function SellerProfileView() {
  const {products, openSellerModal} = useApp()
  return (
    <section className="panel form-panel">
      <div>
        <h2>Seller profile</h2>
        <p className="muted">Your listings</p>
      </div>
      <div className="grid">
        {products.map(p => (
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
        {!products.length && <p className="muted">No products yet</p>}
      </div>
    </section>
  )
}
