import {createContext,useContext,useEffect,useMemo,useRef,useState,ReactNode} from "react"
import {setAuthToken} from "../api/client"

type AuthState = {
  isAuth: boolean
  roles: string[]
  username: string
  email: string
  userId: string
  token: string | null
  login: (u: string, p: string) => Promise<void>
  logout: () => Promise<void>
  error?: string
  loading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

const kcUrl = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080"
const kcRealm = import.meta.env.VITE_KEYCLOAK_REALM || "marketplace"
const kcClient = import.meta.env.VITE_KEYCLOAK_CLIENT || "frontend"

type Tokens = {access: string, refresh: string}

export function AuthProvider({children}: {children: ReactNode}) {
  const [access,setAccess] = useState<string|null>(null)
  const [refresh,setRefresh] = useState<string|null>(null)
  const [error,setError] = useState<string|undefined>()
  const [loading,setLoading] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("authTokens")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Tokens
        applyTokens(parsed.access, parsed.refresh)
      } catch {}
    }
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, [])

  useEffect(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    if (!access) return
    const payload = decode(access)
    const exp = payload?.exp ? payload.exp * 1000 : 0
    const delay = Math.max(5000, exp - Date.now() - 30000)
    refreshTimer.current = setTimeout(() => { void refreshToken() }, delay)
  }, [access])

  function decode(token: string) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload
    } catch { return null }
  }

  function applyTokens(a: string, r: string) {
    setAccess(a)
    setRefresh(r)
    setAuthToken(a)
    localStorage.setItem("authTokens", JSON.stringify({access: a, refresh: r}))
  }

  async function login(username: string, password: string) {
    setLoading(true)
    setError(undefined)
    try {
      const data = await tokenRequest({
        grant_type: "password",
        client_id: kcClient,
        username,
        password
      })
      applyTokens(data.access_token, data.refresh_token)
    } catch (e:any) {
      setError(e.message || "Login failed")
      throw e
    } finally { setLoading(false) }
  }

  async function refreshToken() {
    if (!refresh) return
    try {
      const data = await tokenRequest({
        grant_type: "refresh_token",
        client_id: kcClient,
        refresh_token: refresh
      })
      applyTokens(data.access_token, data.refresh_token)
    } catch {
      await logout()
    }
  }

  async function logout() {
    setAccess(null)
    setRefresh(null)
    setAuthToken(null)
    localStorage.removeItem("authTokens")
  }

  async function tokenRequest(params: Record<string,string>) {
    const body = new URLSearchParams()
    Object.entries(params).forEach(([k,v]) => body.set(k,v))
    const res = await fetch(`${kcUrl}/realms/${kcRealm}/protocol/openid-connect/token`, {
      method:"POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded"},
      body
    })
    const txt = await res.text()
    let json: any
    try { json = txt ? JSON.parse(txt) : {} } catch { json = {} }
    if (!res.ok) {
      const msg = json.error_description || json.error || `Token request failed: ${res.status}`
      throw new Error(msg)
    }
    return json
  }

  const payload = access ? decode(access) : null
  const roles = useMemo(() => {
    const list = payload?.realm_access?.roles
    return Array.isArray(list) ? list : []
  }, [payload])
  const username = payload?.preferred_username || payload?.email || ""

  const value: AuthState = {
    isAuth: !!access,
    roles,
    username,
    email: payload?.email || "",
    userId: payload?.sub || "",
    token: access,
    login,
    logout,
    error,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("AuthContext missing")
  return ctx
}
