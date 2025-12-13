import {createContext,useContext,useEffect,useMemo,useState,ReactNode, Dispatch, SetStateAction} from "react"
import {api} from "../api/client"
import type {Product,Order,OrderItem} from "../types"

export type ProductForm = {title: string, price: string, discountPercent: string, category: string, description: string, imageBase64: string}
export type SellerModalState = {product: Product, draft: Partial<Product>, editMode: boolean, dirty: boolean}

const defaultForm: ProductForm = {title:"", price:"", discountPercent:"", category:"", description:"", imageBase64:""}

type AppState = {
  products: Product[]
  orders: Order[]
  cart: {product: Product, quantity: number}[]
  buyerProfile: {name: string, email: string}
  sellerProfile: {name: string, email: string}
  search: string
  selectedProduct: Product|null
  selectedQty: number
  sellerModal: SellerModalState|null
  productForm: ProductForm
  status?: string
  error?: string
}

type AppActions = {
  setSearch: (v: string) => void
  openProductModal: (p: Product) => void
  closeProductModal: () => void
  openSellerModal: (p: Product) => void
  closeSellerModal: () => void
  setSellerModal: Dispatch<SetStateAction<SellerModalState|null>>
  setSelectedQty: (n: number) => void
  setProductForm: Dispatch<SetStateAction<ProductForm>>
  addToCart: (p: Product, qty?: number) => void
  updateQuantity: (id: string, value: string) => void
  removeFromCart: (id: string) => void
  checkout: () => Promise<void>
  createProduct: (e: any) => Promise<void>
  saveSellerModal: () => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  resolveProductInfo: (item: OrderItem) => {title: string, price: number}
  cartTotal: number
  clearMessages: () => void
}

type AppContextType = AppState & AppActions & {load: () => Promise<void>}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({children}: {children: ReactNode}) {
  const [products,setProducts] = useState<Product[]>([])
  const [orders,setOrders] = useState<Order[]>([])
  const [search,setSearch] = useState("")
  const [productForm,setProductForm] = useState<ProductForm>(defaultForm)
  const [cart,setCart] = useState<{product: Product, quantity: number}[]>([])
  const [buyerProfile,setBuyerProfile] = useState({name:"", email:""})
  const [sellerProfile,setSellerProfile] = useState({name:"", email:""})
  const [selectedProduct,setSelectedProduct] = useState<Product|null>(null)
  const [selectedQty,setSelectedQty] = useState(1)
  const [sellerModal,setSellerModal] = useState<SellerModalState|null>(null)
  const [status,setStatus] = useState<string|undefined>()
  const [error,setError] = useState<string|undefined>()

  useEffect(() => { load() }, [])

  useEffect(() => {
    const saved = localStorage.getItem("cart")
    if (saved) { try { setCart(JSON.parse(saved)) } catch {} }
    const bp = localStorage.getItem("buyerProfile")
    if (bp) { try { setBuyerProfile(JSON.parse(bp)) } catch {} }
    const sp = localStorage.getItem("sellerProfile")
    if (sp) { try { setSellerProfile(JSON.parse(sp)) } catch {} }
  }, [])

  useEffect(() => { localStorage.setItem("cart", JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem("buyerProfile", JSON.stringify(buyerProfile)) }, [buyerProfile])
  useEffect(() => { localStorage.setItem("sellerProfile", JSON.stringify(sellerProfile)) }, [sellerProfile])

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

  async function createProduct(e: any) {
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
    await api.createProduct(payload)
    setProductForm(defaultForm)
    setStatus("Product created")
    await load()
  }

  async function saveSellerModal() {
    if (!sellerModal) return
    setError(undefined)
    setStatus(undefined)
    const d = sellerModal.draft
    if (typeof d.title !== "undefined" && !String(d.title).trim()) { setError("Title is required"); return }
    if (typeof d.category !== "undefined" && !String(d.category).trim()) { setError("Category is required"); return }
    if (typeof d.description !== "undefined" && !String(d.description).trim()) { setError("Description is required"); return }
    if (typeof d.price !== "undefined") {
      const price = Number(d.price)
      if (!Number.isFinite(price) || price <= 0) { setError("Price must be greater than 0"); return }
    }
    if (typeof d.discountPercent !== "undefined") {
      const discount = Number(d.discountPercent)
      if (!Number.isFinite(discount) || discount <= 0 || discount > 100) { setError("Discount must be > 0 and <= 100"); return }
    }
    await api.updateProduct(sellerModal.product.id, d)
    setStatus("Product updated")
    setSellerModal(prev => prev ? {...prev, editMode:false, dirty:false} : prev)
    await load()
  }

  async function deleteProduct(id: string) {
    const ok = window.confirm("Delete this product?")
    if (!ok) return
    await api.deleteProduct(id)
    setStatus("Product removed")
    setSellerModal(null)
    await load()
  }

  async function deleteOrder(id: string) {
    const ok = window.confirm("Delete this order?")
    if (!ok) return
    await api.deleteOrder(id)
    setStatus("Order removed")
    await load()
  }

  function addToCart(product: Product, qty=1) {
    setCart(prev => {
      const existing = prev.find(p => p.product.id === product.id)
      if (existing) return prev.map(p => p.product.id === product.id ? {...p, quantity: p.quantity + qty} : p)
      return [...prev, {product, quantity: qty}]
    })
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

  async function checkout() {
    setError(undefined)
    setStatus(undefined)
    if (!cart.length) { setError("Cart is empty"); return }
    const items = cart.map(it => ({productId: it.product.id, quantity: it.quantity}))
    await api.createOrder({items, status:"pending"})
    setStatus("Order created")
    setCart([])
    await load()
  }

  function clearMessages() {
    setError(undefined)
    setStatus(undefined)
  }

  function resolveProductInfo(item: OrderItem) {
    const cached = products.find(p => p.id === item.productId)
    const title = item.productTitle || cached?.title || `Product ${item.productId}`
    const price = typeof item.productPrice === "number" ? item.productPrice : (cached?.discountedPrice ?? 0)
    return {title, price}
  }

  function openProductModal(p: Product) {
    setSelectedProduct(p)
    setSelectedQty(1)
  }

  function closeProductModal() { setSelectedProduct(null) }

  function openSellerModal(p: Product) {
    setSellerModal({product: p, draft: {...p}, editMode:false, dirty:false})
  }

  function closeSellerModal() { setSellerModal(null) }

  const value: AppContextType = {
    products, orders, cart, buyerProfile, sellerProfile, search, selectedProduct, selectedQty, sellerModal, productForm, status, error,
    setSearch,
    openProductModal,
    closeProductModal,
    openSellerModal,
    closeSellerModal,
    setSellerModal,
    setSelectedQty,
    setProductForm,
    addToCart,
    updateQuantity,
    removeFromCart,
    checkout,
    createProduct,
    saveSellerModal,
    deleteProduct,
    deleteOrder,
    load,
    resolveProductInfo,
    cartTotal,
    clearMessages
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("AppContext missing")
  return ctx
}

