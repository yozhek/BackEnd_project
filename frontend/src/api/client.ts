const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {"Content-Type":"application/json", ...(options?.headers || {})},
    ...options
  })
  const text = await res.text()
  let body: any
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new Error(body?.error || body?.message || `Request failed: ${res.status}`)
  return body
}

export const api = {
  listProducts: (page=1, limit=20) => req(`/products?page=${page}&limit=${limit}`),
  createProduct: (data: any) => req("/products", {method:"POST", body: JSON.stringify(data)}),
  updateProduct: (id: string, data: any) => req(`/products/${id}`, {method:"PUT", body: JSON.stringify(data)}),
  deleteProduct: (id: string) => req(`/products/${id}`, {method:"DELETE"}),

  listOrders: (page=1, limit=20) => req(`/orders?page=${page}&limit=${limit}`),
  createOrder: (data: any) => req("/orders", {method:"POST", body: JSON.stringify(data)}),
  deleteOrder: (id: string) => req(`/orders/${id}`, {method:"DELETE"})
}
