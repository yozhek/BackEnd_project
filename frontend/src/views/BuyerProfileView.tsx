import {useState} from "react"
import {useApp} from "../state/appStore"

export function BuyerProfileView() {
  const {orders, resolveProductInfo, deleteOrder} = useApp()
  const [openOrderId,setOpenOrderId] = useState<string|null>(null)

  return (
    <section className="panel form-panel">
      <div>
        <h2>Buyer profile</h2>
        <p className="muted">Order history</p>
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

