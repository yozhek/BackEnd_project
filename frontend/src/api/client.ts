const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"
const AUTH_URL = import.meta.env.VITE_AUTH_URL || "http://localhost:3003"

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

export const api = {
  listProducts: (page=1, limit=20, mine?: boolean) => req(`/products?page=${page}&limit=${limit}${mine ? "&mine=true" : ""}`),
  createProduct: (data: any) => req("/products", {method:"POST", body: JSON.stringify(data)}),
  updateProduct: (id: string, data: any) => req(`/products/${id}`, {method:"PUT", body: JSON.stringify(data)}),
  deleteProduct: (id: string) => req(`/products/${id}`, {method:"DELETE"}),

  listOrders: (mine=false, page=1, limit=20) => req(`/orders?page=${page}&limit=${limit}${mine ? "" : ""}`),
  createOrder: (data: any) => req("/orders", {method:"POST", body: JSON.stringify(data)}),
  deleteOrder: (id: string) => req(`/orders/${id}`, {method:"DELETE"}),
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
  })
}
