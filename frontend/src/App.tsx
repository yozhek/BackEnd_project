import {useEffect,useMemo,useState} from "react"
import {api} from "./api"
import type {Product,Order} from "./types"

type CartItem = {product: Product, quantity: number}
type Tab = "home" | "sellers" | "cart" | "buyer" | "sellerProfile"

type SellerModalState = {
  product: Product
  draft: Partial<Product>
  editMode: boolean
  dirty: boolean
}

function App() {
  const [activeTabState,setActiveTabState] = useState<Tab>("home")
  const [products,setProducts] = useState<Product[]>([])
  const [orders,setOrders] = useState<Order[]>([])
  const [search,setSearch] = useState("")
  const [productForm,setProductForm] = useState({title:"", price:"", discountPercent:"", category:"", description:"", imageBase64:""})
  const [cart,setCart] = useState<CartItem[]>([])
  const [buyerProfile,setBuyerProfile] = useState({name:"", email:""})
  const [sellerProfile,setSellerProfile] = useState({name:"", email:""})
  const [error,setError] = useState<string|undefined>()
  const [status,setStatus] = useState<string|undefined>()
  const [selectedProduct,setSelectedProduct] = useState<Product|null>(null)
  const [selectedQty,setSelectedQty] = useState(1)
  const [sellerModal,setSellerModal] = useState<SellerModalState|null>(null)
  const [openOrderId,setOpenOrderId] = useState<string|null>(null)

  const activeTab = activeTabState

  useEffect(() => { load() }, [])

  useEffect(() => {
    const saved = localStorage.getItem("cart")
    if (saved) { try { setCart(JSON.parse(saved)) } catch {} }
    const bp = localStorage.getItem("buyerProfile")
    if (bp) { try { setBuyerProfile(JSON.parse(bp)) } catch {} }
    const sp = localStorage.getItem("sellerProfile")
    if (sp) { try { setSellerProfile(JSON.parse(sp)) } catch {} }
    const tab = localStorage.getItem("activeTab") as Tab | null
    if (tab) setActiveTabState(tab)
  }, [])

  useEffect(() => { localStorage.setItem("cart", JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem("buyerProfile", JSON.stringify(buyerProfile)) }, [buyerProfile])
  useEffect(() => { localStorage.setItem("sellerProfile", JSON.stringify(sellerProfile)) }, [sellerProfile])
  useEffect(() => { localStorage.setItem("activeTab", activeTab) }, [activeTab])

  function selectTab(tab: Tab) {
    setActiveTabState(tab)
    setStatus(undefined)
    setError(undefined)
  }

  async function load() {
    setError(undefined)
    try {
      const [p,o] = await Promise.all([api.listProducts(), api.listOrders()])
      setProducts(p.items || [])
      setOrders(o.items || [])
    } catch (e:any) { setError(e.message) }
  }

  function parseNumber(value: string) {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }

  function readFile(file: File) {
    return new Promise<string>((resolve,reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function handleCreateProduct(e: any) {
    e.preventDefault()
    setError(undefined)
    setStatus(undefined)
    const price = parseNumber(productForm.price)
    if (price === undefined || price <= 0) return setError("Price must be greater than 0")
    const discount = productForm.discountPercent.trim() === "" ? undefined : parseNumber(productForm.discountPercent)
    if (discount !== undefined && (discount <= 0 || discount > 100)) return setError("Discount must be > 0 and <= 100")
    const payload: any = {
      title: productForm.title.trim(),
      price,
      category: productForm.category.trim(),
      description: productForm.description.trim()
    }
    if (discount !== undefined) payload.discountPercent = discount
    if (productForm.imageBase64) payload.imageBase64 = productForm.imageBase64
    try {
      await api.createProduct(payload)
      setProductForm({title:"", price:"", discountPercent:"", category:"", description:"", imageBase64:""})
      setStatus("Product created")
      await load()
      selectTab("home")
    } catch (err:any) { setError(err.message) }
  }

  async function handleUpdateProduct(id: string, patch: Partial<Product>) {
    setError(undefined)
    setStatus(undefined)
    try {
      await api.updateProduct(id, patch)
      setStatus("Product updated")
      await load()
    } catch (err:any) { setError(err.message) }
  }

  async function handleDeleteProduct(id: string) {
    setError(undefined)
    setStatus(undefined)
    try {
      const ok = window.confirm("Delete this product?")
      if (!ok) return
      await api.deleteProduct(id)
      setStatus("Product removed")
      setSellerModal(null)
      await load()
    } catch (err:any) { setError(err.message) }
  }

  async function handleDeleteOrder(id: string) {
    setError(undefined)
    setStatus(undefined)
    try {
      const ok = window.confirm("Delete this order?")
      if (!ok) return
      await api.deleteOrder(id)
      setStatus("Order removed")
      await load()
    } catch (err:any) { setError(err.message) }
  }

  function addToCart(product: Product, qty=1) {
    setCart(prev => {
      const existing = prev.find(p => p.product.id === product.id)
      if (existing) return prev.map(p => p.product.id === product.id ? {...p, quantity: p.quantity + qty} : p)
      return [...prev, {product, quantity: qty}]
    })
    selectTab("cart")
  }

  function updateQuantity(id: string, value: string) {
    const qty = Number(value)
    if (!Number.isFinite(qty) || qty < 1) return
    setCart(prev => prev.map(it => it.product.id === id ? {...it, quantity: qty} : it))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(it => it.product.id !== id))
  }

  const cartTotal = useMemo(() => {
    const sum = cart.reduce((acc,it) => acc + it.product.discountedPrice * it.quantity, 0)
    return Number(sum.toFixed(2))
  }, [cart])

  async function checkout(e: any) {
    e.preventDefault()
    setError(undefined)
    setStatus(undefined)
    if (!cart.length) return setError("Cart is empty")
    const items = cart.map(it => ({productId: it.product.id, quantity: it.quantity}))
    try {
      await api.createOrder({items, status:"pending"})
      setStatus("Order created")
      setCart([])
      await load()
    } catch (err:any) { setError(err.message) }
  }

  function filteredProducts() {
    const q = search.toLowerCase()
    return products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    )
  }

  function openProductModal(p: Product) {
    setSelectedProduct(p)
    setSelectedQty(1)
  }

  function openSellerModal(p: Product) {
    setSellerModal({product: p, draft: {...p}, editMode:false, dirty:false})
  }

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products])

  async function saveSellerModal() {
    if (!sellerModal) return
    await handleUpdateProduct(sellerModal.product.id, sellerModal.draft)
    setSellerModal(prev => prev ? {...prev, editMode:false, dirty:false} : prev)
  }

  function resolveProductInfo(item: any) {
    const cached = productMap.get(item.productId)
    const title = item.productTitle || cached?.title || `Product ${item.productId}`
    const price = typeof item.productPrice === "number" ? item.productPrice : (cached?.discountedPrice ?? 0)
    return {title, price}
  }

  return (
    <div className="layout">
      <header className="hero">
        <div className="logo">BleskShop</div>
        <nav className="tabs">
          <button className={activeTab==="home"?"active":""} onClick={() => selectTab("home")}>Home</button>
          <button className={activeTab==="sellers"?"active":""} onClick={() => selectTab("sellers")}>Seller console</button>
          <button className={activeTab==="cart"?"active":""} onClick={() => selectTab("cart")}>Cart</button>
          <button className={activeTab==="buyer"?"active":""} onClick={() => selectTab("buyer")}>Buyer profile</button>
          <button className={activeTab==="sellerProfile"?"active":""} onClick={() => selectTab("sellerProfile")}>Seller profile</button>
        </nav>
      </header>

      {(error || status) && (
        <div className={error ? "alert error" : "alert success"}>
          {error || status}
        </div>
      )}

      {activeTab === "home" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Products</h2>
              <p className="muted">Browse items from the database. Click a card for details.</p>
            </div>
            <input className="search" placeholder="Search by name, category, or description" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="grid">
            {filteredProducts().map(p => (
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
              </article>
            ))}
            {!filteredProducts().length && <p className="muted">No products found</p>}
          </div>
        </section>
      )}

      {activeTab === "sellers" && (
        <section className="panel form-panel">
          <div>
            <h2>Seller console</h2>
            <p className="muted">Create a product with optional discount and image.</p>
          </div>
          <form className="form-grid" onSubmit={handleCreateProduct}>
            <label>
              <span>Title</span>
              <input value={productForm.title} onChange={e => setProductForm({...productForm, title:e.target.value})} required />
            </label>
            <label>
              <span>Price</span>
              <input type="number" min="0.01" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price:e.target.value})} required />
            </label>
            <label>
              <span>Discount % (optional)</span>
              <input type="number" min="0.01" max="100" step="0.01" value={productForm.discountPercent} onChange={e => setProductForm({...productForm, discountPercent:e.target.value})} placeholder="Leave empty for no discount" />
            </label>
            <label>
              <span>Category</span>
              <input value={productForm.category} onChange={e => setProductForm({...productForm, category:e.target.value})} required />
            </label>
            <label className="wide">
              <span>Description</span>
              <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description:e.target.value})} rows={3} required />
            </label>
            <label className="wide">
              <span>Image</span>
              <input type="file" accept="image/*" onChange={async e => {
                const file = e.target.files?.[0]
                if (file) {
                  const data = await readFile(file)
                  setProductForm(prev => ({...prev, imageBase64: data}))
                }
              }} />
              {productForm.imageBase64 && <img src={productForm.imageBase64} className="preview" alt="preview" />}
            </label>
            <div className="actions">
              <button type="submit">Publish product</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "cart" && (
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
            <form className="checkout" onSubmit={checkout}>
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
      )}

      {activeTab === "buyer" && (
        <section className="panel form-panel">
          <div>
            <h2>Buyer profile</h2>
            <p className="muted">Order history</p>
          </div>
          <div className="orders">
            <ul className="list">
              {orders.map(o => {
                const open = openOrderId === o.id
                return (
                  <li key={o.id} className="card small" onClick={() => setOpenOrderId(open ? null : o.id)}>
                    <div className="row space">
                      <div>
                        <strong>Order {o.id}</strong>
                        <p className="muted">{o.items.length} items</p>
                      </div>
                      <div className="row" style={{gap:"8px"}}>
                        <button className="danger" onClick={e => {e.stopPropagation(); handleDeleteOrder(o.id)}}>Delete</button>
                        <span className="badge">{open ? "Hide" : "Details"}</span>
                      </div>
                    </div>
                    <p>Total ${o.totalPrice.toFixed(2)}</p>
                    {open && (
                      <div className="order-items">
                        {o.items.map((it,idx) => {
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
      )}

      {activeTab === "sellerProfile" && (
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
      )}

      {selectedProduct && (
        <div className="modal" onClick={() => setSelectedProduct(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setSelectedProduct(null)}>X</button>
            <div className="modal-body">
              {selectedProduct.imageBase64 && <img src={selectedProduct.imageBase64} className="hero-image" alt={selectedProduct.title} />}
              {!selectedProduct.imageBase64 && <div className="hero-image placeholder">No image</div>}
              <div className="modal-info">
                <h3>{selectedProduct.title}</h3>
                <p className="badge">{selectedProduct.category}</p>
                <p>{selectedProduct.description}</p>
                <div className="price big">
                  <span className="now">${selectedProduct.discountedPrice.toFixed(2)}</span>
                  {selectedProduct.discountPercent > 0 && (
                    <div className="old-price">
                      <span className="was">${selectedProduct.price.toFixed(2)}</span>
                      <span className="discount">-{selectedProduct.discountPercent}%</span>
                    </div>
                  )}
                </div>
                <div className="row space">
                  <label className="qty">
                    Qty
                    <input type="number" min="1" value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value) || 1)} />
                  </label>
                  <button onClick={() => {addToCart(selectedProduct, selectedQty); setSelectedProduct(null)}}>Add to cart</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {sellerModal && (
        <div className="modal" onClick={() => setSellerModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setSellerModal(null)}>X</button>
            <div className="modal-body">
              {sellerModal.draft.imageBase64 && <img src={sellerModal.draft.imageBase64} className="hero-image" alt={sellerModal.draft.title || "image"} />}
              {!sellerModal.draft.imageBase64 && <div className="hero-image placeholder">No image</div>}
              <div className="modal-info">
                {!sellerModal.editMode && (
                  <>
                    <h3>{sellerModal.draft.title}</h3>
                    <p className="badge">{sellerModal.draft.category}</p>
                    <p>{sellerModal.draft.description}</p>
                    <div className="price big">
                      <span className="now">${(sellerModal.draft.discountedPrice ?? 0).toFixed(2)}</span>
                      {typeof sellerModal.draft.discountPercent === "number" && sellerModal.draft.discountPercent > 0 && (
                        <div className="old-price">
                          <span className="was">${(sellerModal.draft.price ?? 0).toFixed(2)}</span>
                          <span className="discount">-{sellerModal.draft.discountPercent}%</span>
                        </div>
                      )}
                    </div>
                    <div className="row space">
                      <button onClick={() => setSellerModal(prev => prev ? {...prev, editMode:true} : prev)}>Edit</button>
                      <button className="danger" onClick={() => handleDeleteProduct(sellerModal.product.id)}>Delete</button>
                    </div>
                  </>
                )}
                {sellerModal.editMode && (
                  <>
                    <Editable label="Title" value={sellerModal.draft.title || ""} onChange={v => setSellerModal(prev => prev ? {...prev, draft:{...prev.draft, title:v}, dirty:true} : prev)} />
                    <Editable label="Category" value={sellerModal.draft.category || ""} onChange={v => setSellerModal(prev => prev ? {...prev, draft:{...prev.draft, category:v}, dirty:true} : prev)} />
                    <Editable label="Description" value={sellerModal.draft.description || ""} multiline onChange={v => setSellerModal(prev => prev ? {...prev, draft:{...prev.draft, description:v}, dirty:true} : prev)} />
                    <Editable label="Price" value={String(sellerModal.draft.price ?? "")}
                      onChange={v => setSellerModal(prev => prev ? {...prev, draft:{...prev.draft, price:Number(v)}, dirty:true} : prev)} />
                    <Editable label="Discount %" value={String(sellerModal.draft.discountPercent ?? "")}
                      onChange={v => setSellerModal(prev => prev ? {...prev, draft:{...prev.draft, discountPercent:Number(v)}, dirty:true} : prev)} />
                    <div className="field-row">
                      <div className="row space">
                        <span className="field-label">Image</span>
                      </div>
                      <input type="file" accept="image/*" onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const data = await readFile(file)
                          setSellerModal(prev => prev ? {...prev, draft:{...prev.draft, imageBase64:data}, dirty:true} : prev)
                        }
                      }} />
                    </div>
                    <div className="row space">
                      <button onClick={() => setSellerModal(prev => prev ? {...prev, editMode:false, draft:{...prev.product}, dirty:false} : prev)}>Cancel</button>
                      {sellerModal.dirty && <button onClick={saveSellerModal}>Save</button>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type EditableProps = {
  label: string
  value: string
  multiline?: boolean
  onChange: (v: string) => void
}

function Editable({label,value,multiline,onChange}: EditableProps) {
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  )
}

export default App
