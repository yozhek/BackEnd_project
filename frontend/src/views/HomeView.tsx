import {useApp} from "../state/appStore"

export function HomeView() {
  const {products, search, setSearch, openProductModal, isSeller, isBuyer, isAuth} = useApp()
  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  )
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Products</h2>
          <p className="muted">Browse items from the Marketplace. Click a card for details.</p>
        </div>
        <input className="search" placeholder="Search by name, category, or description" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid">
        {filtered.map(p => (
          <article key={p.id} className="card" onClick={() => openProductModal(p)}>
            <div className="card-title">
              <div className="title-block">
                {p.imageBase64 && <img src={p.imageBase64} alt={p.title} className="thumb" />}
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
            {(!isAuth || isSeller) && <p className="muted small-note">Login as buyer to add items to cart</p>}
          </article>
        ))}
        {!filtered.length && <p className="muted">No products found</p>}
      </div>
    </section>
  )
}
