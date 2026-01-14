const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"
const BIDDING_URL = import.meta.env.VITE_BIDDING_URL || "http://localhost:3001"
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:3003"
const GATEWAY_WS = import.meta.env.VITE_GATEWAY_WS_URL || "ws://localhost:3002/ws"
const NOTIFY_URL = import.meta.env.VITE_NOTIFY_URL || "http://localhost:4005"

let token: string | null = null

export function setAuthToken(t: string | null) {
  token = t
}

async function req(path: string, options?: RequestInit) {
  const headers: Record<string,string> = {"Content-Type":"application/json", ...(options?.headers as any || {})}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...options
  })
  const text = await res.text()
  let body: any
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new Error(body?.error || body?.message || `Request failed: ${res.status}`)
  return body
}

async function reqBidding(path: string, options?: RequestInit) {
  const headers: Record<string,string> = {"Content-Type":"application/json", ...(options?.headers as any || {})}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BIDDING_URL}${path}`, {headers, ...options})
  const text = await res.text()
  let body: any
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new Error(body?.error || body?.message || `Request failed: ${res.status}`)
  return body
}

export const api = {
  listProducts: (page=1, limit=20, mine?: boolean) => req(`/products?page=${page}&limit=${limit}${mine ? "&mine=true" : ""}`),
  createProduct: (data: any) => req("/products", {method:"POST", body: JSON.stringify(data)}),
  updateProduct: (id: string, data: any) => req(`/products/${id}`, {method:"PUT", body: JSON.stringify(data)}),
  deleteProduct: (id: string) => req(`/products/${id}`, {method:"DELETE"}),

  listOrders: (mine=false, page=1, limit=20) => req(`/orders?page=${page}&limit=${limit}${mine ? "" : ""}`),
  createOrder: (data: any) => req("/orders", {method:"POST", body: JSON.stringify(data)}),
  deleteOrder: (id: string) => req(`/orders/${id}`, {method:"DELETE"}),
  listAuctions: (page=1, limit=20, status?: string) => reqBidding(`/auctions?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`),
  createAuction: (data: any) => reqBidding("/auctions", {method:"POST", body: JSON.stringify(data)}),
  placeBid: (id: string, data: any) => reqBidding(`/auctions/${id}/bids`, {method:"POST", body: JSON.stringify(data)}),
  updateAuctionStatus: (id: string, status: string) => reqBidding(`/auctions/${id}/status`, {method:"PUT", body: JSON.stringify({status})}),
  closeAuction: (id: string) => reqBidding(`/auctions/${id}/close`, {method:"POST"}),
  expireAuction: (id: string, force=false) => reqBidding(`/auctions/${id}/expire${force ? "?force=true" : ""}`, {method:"POST"}),
  deleteAuction: (id: string) => reqBidding(`/auctions/${id}`, {method:"DELETE"}),
  gatewayWsUrl: (auctionId?: string) => auctionId ? `${GATEWAY_WS}?auctionId=${auctionId}` : GATEWAY_WS,
  register: (data: any) => fetch(`${AUTH_URL}/register`, {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(data)
  }).then(async res => {
    const txt = await res.text()
    let body: any
    try { body = txt ? JSON.parse(txt) : null } catch { body = txt }
    if (!res.ok) throw new Error(body?.error || `Register failed: ${res.status}`)
    return body
  }),
  telegramInit: (userId: string) => fetch(`${NOTIFY_URL}/auth/telegram/jwt`, {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({userId})
  }).then(async res => {
    const txt = await res.text()
    let body: any
    try { body = txt ? JSON.parse(txt) : null } catch { body = txt }
    if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`)
    return body
  }),
  telegramBinding: (userId: string) => fetch(`${NOTIFY_URL}/auth/telegram/binding?userId=${encodeURIComponent(userId)}`).then(async res => {
    const txt = await res.text()
    let body: any
    try { body = txt ? JSON.parse(txt) : null } catch { body = txt }
    if (res.status === 404) return null
    if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`)
    return body
  }),
  telegramUnlink: (userId: string) => fetch(`${NOTIFY_URL}/auth/telegram/binding`, {
    method:"DELETE",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({userId})
  }).then(async res => {
    if (res.status === 204) return {}
    const txt = await res.text()
    let body: any
    try { body = txt ? JSON.parse(txt) : null } catch { body = txt }
    if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`)
    return body
  })
}
