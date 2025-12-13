import {useApp} from "../state/appStore"

export function CartView() {
  const {cart, removeFromCart, updateQuantity, checkout, cartTotal} = useApp()
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Cart</h2>
          <p className="muted">Items you plan to order.</p>
        </div>
      </div>
      {!cart.length && <p className="muted">Your cart is empty</p>}
      <ul className="list">
        {cart.map(item => (
          <li key={item.product.id} className="card">
            <div className="row space">
              <div className="title-block">
                {item.product.imageBase64 && <img src={item.product.imageBase64} className="thumb" alt={item.product.title} />}
                {!item.product.imageBase64 && <div className="thumb placeholder">No image</div>}
                <div>
                  <strong>{item.product.title}</strong>
                  <p className="muted">{item.product.category}</p>
                </div>
              </div>
              <button type="button" onClick={() => removeFromCart(item.product.id)}>Remove</button>
            </div>
            <div className="row space">
              <span>${item.product.discountedPrice.toFixed(2)}</span>
              <input type="number" min="1" value={item.quantity} onChange={e => updateQuantity(item.product.id, e.target.value)} />
            </div>
          </li>
        ))}
      </ul>
      {cart.length > 0 && (
        <form className="checkout" onSubmit={e => {e.preventDefault(); checkout()}}>
          <div className="summary">
            <div>
              <p className="muted">Total</p>
              <p className="total">${cartTotal.toFixed(2)}</p>
            </div>
            <button type="submit">Place order</button>
          </div>
        </form>
      )}
    </section>
  )
}
