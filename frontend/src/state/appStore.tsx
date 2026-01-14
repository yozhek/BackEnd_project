import {createContext,useContext,useEffect,useMemo,useState,ReactNode, Dispatch, SetStateAction} from "react"
import {api} from "../api/client"
import type {Product,Order,OrderItem,Auction} from "../types"

export type ProductForm = {title: string, price: string, discountPercent: string, category: string, description: string, imageBase64: string}
export type SellerModalState = {product: Product, draft: Partial<Product>, editMode: boolean, dirty: boolean}

const defaultForm: ProductForm = {title:"", price:"", discountPercent:"", category:"", description:"", imageBase64:""}

type AppState = {
  products: Product[]
  auctions: Auction[]
  orders: Order[]
  cart: {product: Product, quantity: number, expiresAt?: string, auctionId?: string, auctionProductId?: string, auctionBid?: number}[]
  buyerProfile: {name: string, email: string}
  sellerProfile: {name: string, email: string}
  search: string
  selectedProduct: Product|null
  selectedAuction: Auction|null
  selectedQty: number
  sellerModal: SellerModalState|null
  productForm: ProductForm
  isAuth: boolean
  roles: string[]
  isBuyer: boolean
  isSeller: boolean
  userId: string
  username: string
  email: string
  status?: string
  error?: string
  wsConnected?: boolean
}

type AppActions = {
  setSearch: (v: string) => void
  openProductModal: (p: Product) => void
  closeProductModal: () => void
  openSellerModal: (p: Product) => void
  closeSellerModal: () => void
  openAuctionModal: (a: Auction) => void
  closeAuctionModal: () => void
  setSellerModal: Dispatch<SetStateAction<SellerModalState|null>>
  setSelectedQty: (n: number) => void
  setProductForm: Dispatch<SetStateAction<ProductForm>>
  addToCart: (p: Product, qty?: number) => void
  updateQuantity: (id: string, value: string) => void
  removeFromCart: (id: string) => Promise<void>
  checkout: () => Promise<void>
  createProduct: (e: any) => Promise<void>
  saveSellerModal: () => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  createAuction: (payload: any) => Promise<void>
  deleteAuction: (id: string) => Promise<void>
  closeAuction: (id: string) => Promise<void>
  placeBid: (id: string, amount: number) => Promise<void>
  resolveProductInfo: (item: OrderItem) => {title: string, price: number}
  cartTotal: number
  clearMessages: () => void
  refreshAuctions: () => Promise<void>
  setError: Dispatch<SetStateAction<string|undefined>>
}

type AppContextType = AppState & AppActions & {load: () => Promise<void>}

const AppContext = createContext<AppContextType | null>(null)

function mergeAuctions(base: Auction[], updates: Auction[]) {
  const map = new Map(base.map(a => [a.id, a]))
  for (const item of updates) {
    if (!item.id) continue
    const existing = map.get(item.id)
    map.set(item.id, existing ? {...existing, ...item} : item)
  }
  return Array.from(map.values())
}

export function AppProvider({children, auth}: {children: ReactNode, auth?: {isAuth: boolean, roles: string[], userId?: string, username?: string, email?: string}}) {
  const [products,setProducts] = useState<Product[]>([])
  const [auctions,setAuctions] = useState<Auction[]>([])
  const [orders,setOrders] = useState<Order[]>([])
  const [search,setSearch] = useState("")
  const [productForm,setProductForm] = useState<ProductForm>(defaultForm)
  const [cart,setCart] = useState<{product: Product, quantity: number, expiresAt?: string, auctionId?: string, auctionProductId?: string, auctionBid?: number}[]>([])
  const [buyerProfile,setBuyerProfile] = useState({name:"", email:""})
  const [sellerProfile,setSellerProfile] = useState({name:"", email:""})
  const [selectedProduct,setSelectedProduct] = useState<Product|null>(null)
  const [selectedAuction,setSelectedAuction] = useState<Auction|null>(null)
  const [selectedQty,setSelectedQty] = useState(1)
  const [sellerModal,setSellerModal] = useState<SellerModalState|null>(null)
  const [status,setStatus] = useState<string|undefined>()
  const [error,setError] = useState<string|undefined>()
  const [wsConnected,setWsConnected] = useState<boolean>(false)
  const isAuth = auth?.isAuth ?? false
  const roles = auth?.roles ?? []
  const isBuyer = roles.includes("buyer")
  const isSeller = roles.includes("seller")
  const userId = auth?.userId || ""
  const username = auth?.username || ""
  const email = auth?.email || ""
  const defaultExpireAt = () => new Date(Date.now() + 24*3600_000).toISOString()

  useEffect(() => { load() }, [userId, isAuth, isSeller, isBuyer])
  useEffect(() => { syncAwaitingPayment() }, [userId, isAuth])
  useEffect(() => {
    const timer = setInterval(() => {
      pruneExpiredPayments()
    }, 30000)
    return () => clearInterval(timer)
  }, [cart])

  useEffect(() => {
    const cartKey = userId ? `cart_${userId}` : "cart_guest"
    const saved = localStorage.getItem(cartKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const cleaned = Array.isArray(parsed) ? parsed.filter((it: any) => {
          if (!it?.product?.id) return false
          if (it.product.isAuction && !it.auctionProductId) return false
          return true
        }) : []
        setCart(cleaned)
      } catch {
        setCart([])
      }
    } else { setCart([]) }
    const bp = localStorage.getItem("buyerProfile")
    if (bp) { try { setBuyerProfile(JSON.parse(bp)) } catch {} }
    const sp = localStorage.getItem("sellerProfile")
    if (sp) { try { setSellerProfile(JSON.parse(sp)) } catch {} }
  }, [userId])

  useEffect(() => {
    const cartKey = userId ? `cart_${userId}` : "cart_guest"
    localStorage.setItem(cartKey, JSON.stringify(cart))
  }, [cart, userId])
  useEffect(() => { localStorage.setItem("buyerProfile", JSON.stringify(buyerProfile)) }, [buyerProfile])
  useEffect(() => { localStorage.setItem("sellerProfile", JSON.stringify(sellerProfile)) }, [sellerProfile])

  useEffect(() => {
    const ws = new WebSocket(api.gatewayWsUrl())
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === "bid" && msg.payload?.auctionId) {
          setAuctions(prev => prev.map(a => a.id === msg.payload.auctionId ? {
            ...a,
            currentAmount: msg.payload.amount,
            currentWinnerId: msg.payload.bidderId,
            currentWinnerName: msg.payload.bidderName,
            bids: [...(a.bids||[]), {
              amount: msg.payload.amount,
              bidderId: msg.payload.bidderId,
              bidderName: msg.payload.bidderName,
              createdAt: new Date().toISOString()
            }]
          } : a))
        }
        if (msg.type === "auction-created" && msg.payload?.auctionId) {
          // refetch to sync all fields
          refreshAuctions()
        }
        if (msg.type === "auction-status" && msg.payload?.auctionId) {
          setAuctions(prev => prev.map(a => a.id === msg.payload.auctionId ? {...a, status: msg.payload.status} : a))
        }
        if (msg.type === "auction-deleted" && msg.payload?.auctionId) {
          setAuctions(prev => prev.filter(a => a.id !== msg.payload.auctionId))
        }
      } catch {}
    }
    return () => { ws.close() }
  }, [])

  async function load() {
    setError(undefined)
    try {
      const p = await api.listProducts()
      setProducts(p.items || [])
    } catch (e:any) { setError(e.message) }
    if (isBuyer && isAuth) {
      try {
        const o = await api.listOrders(true)
        setOrders(o.items || [])
      } catch {}
    } else {
      setOrders([])
    }
    try {
      const a = await api.listAuctions(1, 50)
      setAuctions(a.items || [])
    } catch {}
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

  async function createAuction(payload: any) {
    setError(undefined)
    setStatus(undefined)
    await api.createAuction(payload)
    setStatus("Auction created")
    await refreshAuctions()
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

  async function deleteAuction(id: string) {
    const ok = window.confirm("Delete this auction?")
    if (!ok) return
    await api.deleteAuction(id)
    setStatus("Auction removed")
    setAuctions(prev => prev.filter(a => a.id !== id))
  }

  async function closeAuction(id: string) {
    const ok = window.confirm("Close this auction now?")
    if (!ok) return
    try {
      const res = await api.closeAuction(id)
      setStatus("Awaiting payment")
      setAuctions(prev => res ? mergeAuctions(prev, [{...res, status:"awaiting_payment"} as Auction]) : prev.map(a => a.id === id ? {...a, status:"awaiting_payment"} : a))
    } catch {
      try {
        const res = await api.updateAuctionStatus(id, "awaiting_payment")
        setStatus("Awaiting payment")
        setAuctions(prev => res ? mergeAuctions(prev, [{...res, status:"awaiting_payment"} as Auction]) : prev.map(a => a.id === id ? {...a, status:"awaiting_payment"} : a))
      } catch {}
    }
    await syncAwaitingPayment()
  }

  async function deleteOrder(id: string) {
    const ok = window.confirm("Delete this order?")
    if (!ok) return
    await api.deleteOrder(id)
    setStatus("Order removed")
    await load()
  }

  function addToCart(product: Product, qty=1) {
    if (!isBuyer) return
    setStatus(undefined)
    setError(undefined)
    setCart(prev => {
      const existing = prev.find(p => p.product.id === product.id)
      if (existing) {
        setStatus("Quantity updated in cart")
        return prev.map(p => p.product.id === product.id ? {...p, quantity: p.quantity + qty} : p)
      }
      setStatus("Added to cart")
      return [...prev, {product, quantity: qty}]
    })
  }

  function updateQuantity(id: string, value: string) {
    const qty = Number(value)
    if (!Number.isFinite(qty) || qty < 1) return
    setCart(prev => prev.map(it => it.product.id === id ? {...it, quantity: qty} : it))
  }

  async function removeFromCart(id: string) {
    const item = cart.find(it => it.product.id === id)
    setCart(prev => prev.filter(it => it.product.id !== id))
    if (item?.product.isAuction) {
      const auctionId = item.auctionId || id.replace("auction:","")
      try {
        const res = await api.expireAuction(auctionId, true)
        setAuctions(prev => {
          if (res && (res as Auction).id) return mergeAuctions(prev, [res as Auction])
          return prev.filter(a => a.id !== auctionId)
        })
      } catch {
        setAuctions(prev => prev.filter(a => a.id !== auctionId))
      }
      await refreshAuctions()
      await syncAwaitingPayment()
    }
  }

  const cartTotal = useMemo(() => {
    const sum = cart.reduce((acc,it) => acc + it.product.discountedPrice * it.quantity, 0)
    return Number(sum.toFixed(2))
  }, [cart])

  async function checkout() {
    setError(undefined)
    setStatus(undefined)
    if (!isBuyer) { setError("Login as buyer to place orders"); return }
    if (!cart.length) { setError("Cart is empty"); return }
    const normalItems = cart.filter(it => !it.product.isAuction)
    const auctionItems = cart.filter(it => it.product.isAuction)
    const invalidAuction = auctionItems.find(it => !it.auctionProductId && !auctions.find(a => a.id === (it.auctionId || it.product.id.replace("auction:","")))?.productId)
    if (invalidAuction) {
      setError("Cannot create order for auction items, resyncing")
      await syncAwaitingPayment()
      return
    }
    if (normalItems.length) {
      const items = normalItems.map(it => ({productId: it.product.id, quantity: it.quantity}))
      await api.createOrder({items, status:"pending"})
    }
    if (auctionItems.length) {
      const auctionOrderItems = auctionItems.map(it => {
        const auctionId = it.auctionId || it.product.id.replace("auction:","")
        const sourceAuction = auctions.find(a => a.id === auctionId)
        const productId = it.auctionProductId || sourceAuction?.productId
        return {productId, quantity: 1}
      }).filter(it => !!it.productId)
      if (!auctionOrderItems.length) {
        setError("Cannot create order for auction items")
        return
      }
      try {
        await api.createOrder({items: auctionOrderItems, status:"pending"})
      } catch (e:any) {
        setError(e.message)
        return
      }
    }
    for (const it of auctionItems) {
      const auctionId = it.auctionId || it.product.id.replace("auction:","")
      try {
        const updated = await api.updateAuctionStatus(auctionId, "closed")
        setAuctions(prev => updated ? mergeAuctions(prev.map(a => a.id === auctionId ? {...a, status:"closed"} : a), [updated]) : prev.filter(a => a.id !== auctionId))
      } catch {
        setAuctions(prev => prev.filter(a => a.id !== auctionId))
      }
    }
    setStatus("Order created")
    setCart([])
    await load()
    await syncAwaitingPayment()
  }

  async function placeBid(id: string, amount: number) {
    setError(undefined)
    setStatus(undefined)
    if (!isBuyer) { setError("Login as buyer to bid"); return }
    if (!Number.isFinite(amount) || amount <= 0) { setError("Invalid bid"); return }
    await api.placeBid(id, {amount})
    setStatus("Bid placed")
    await refreshAuctions()
  }

  function clearMessages() {
    setError(undefined)
    setStatus(undefined)
  }

  async function refreshAuctions() {
    try {
      const [open, awaiting] = await Promise.all([
        api.listAuctions(1,50,"open"),
        api.listAuctions(1,50,"awaiting_payment")
      ])
      setAuctions(prev => {
        const archived = prev.filter(a => a.status === "closed" || a.status === "cancelled")
        return mergeAuctions(archived, [...(awaiting.items || []), ...(open.items || [])])
      })
    } catch {}
  }

  async function syncAwaitingPayment() {
    if (!userId) return
    try {
      const awaiting = await api.listAuctions(1,50,"awaiting_payment")
      const items = awaiting.items || []
      setAuctions(prev => mergeAuctions(prev, items))
      const mine = items.filter((a: Auction) => a.winnerId === userId)
      setCart(prev => {
        const others = prev.filter(it => {
          if (it.product.isAuction && !it.auctionProductId) return false
          return !(it.product.isAuction && mine.some((a: Auction) => "auction:"+a.id === it.product.id))
        })
        const toAdd = mine.map((a: Auction) => ({
          product: {
            id: "auction:"+a.id,
            title: a.productTitle,
            price: a.winnerBid || a.currentAmount || a.startPrice,
            discountedPrice: a.winnerBid || a.currentAmount || a.startPrice,
            discountPercent: 0,
            category: a.category || "auction",
            description: a.description || "",
            imageBase64: a.imageBase64,
            isAuction: true
          } as Product,
          quantity: 1,
          expiresAt: a.paymentExpiresAt || defaultExpireAt(),
          auctionId: a.id,
          auctionProductId: a.productId,
          auctionBid: a.winnerBid || a.currentAmount || a.startPrice
        }))
        return [...others, ...toAdd]
      })
    } catch {}
  }

  async function pruneExpiredPayments() {
    if (!cart.length) return
    const now = Date.now()
    const expired = cart.filter(it => it.expiresAt && new Date(it.expiresAt).getTime() <= now && it.product.isAuction)
    if (!expired.length) return
    const updatedAuctions: Auction[] = []
    const removedIds = new Set<string>()
    for (const it of expired) {
      const auctionId = it.product.id.replace("auction:","")
      try {
        const res = await api.expireAuction(auctionId)
        if (res && (res as Auction).id) updatedAuctions.push(res as Auction)
        else removedIds.add(auctionId)
      } catch {
        removedIds.add(auctionId)
      }
    }
    setCart(prev => prev.filter(it => !expired.includes(it)))
    setAuctions(prev => {
      const kept = prev.filter(a => !removedIds.has(a.id || ""))
      return mergeAuctions(kept, updatedAuctions)
    })
    await refreshAuctions()
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

  function openAuctionModal(a: Auction) {
    setSelectedAuction(a)
  }

  function closeAuctionModal() { setSelectedAuction(null) }

  function openSellerModal(p: Product) {
    setSellerModal({product: p, draft: {...p}, editMode:false, dirty:false})
  }

  function closeSellerModal() { setSellerModal(null) }

  const value: AppContextType = {
    products, auctions, orders, cart, buyerProfile, sellerProfile, search, selectedProduct, selectedAuction, selectedQty, sellerModal, productForm, status, error, isAuth, roles, isBuyer, isSeller, userId, username, email, wsConnected,
    setSearch,
    openProductModal,
    closeProductModal,
    openSellerModal,
    closeSellerModal,
    openAuctionModal,
    closeAuctionModal,
    setSellerModal,
    setSelectedQty,
    setProductForm,
    addToCart,
    updateQuantity,
    removeFromCart,
    checkout,
    createProduct,
    createAuction,
    saveSellerModal,
    deleteProduct,
    deleteAuction,
    closeAuction,
    deleteOrder,
    placeBid,
    load,
    resolveProductInfo,
    cartTotal,
    clearMessages,
    refreshAuctions,
    setError
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("AppContext missing")
  return ctx
}

