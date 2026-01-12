import {useState} from "react"
import type {FormEvent} from "react"
import {useAuth} from "../../state/authStore"
import {RegisterModal} from "./RegisterModal"

type Props = {onClose: () => void}

export function AuthModal({onClose}: Props) {
  const {login, error: authError, loading} = useAuth()
  const [username,setUsername] = useState("")
  const [password,setPassword] = useState("")
  const [error,setError] = useState<string|undefined>()
  const [showRegister,setShowRegister] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    try {
      await login(username, password)
      onClose()
    } catch (err:any) {
      setError(err.message)
    }
  }

  const showError = error || authError

  return (
    <div className="modal auth-modal" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>X</button>
        <div className="modal-body" style={{gridTemplateColumns:"1fr"}}>
          <div className="modal-info" style={{gap:"14px"}}>
            <h3 style={{margin:0, color:"#0f172a"}}>Login</h3>
            <form className="auth-form" onSubmit={submit}>
              <label>
                <span>Username</span>
                <input value={username} onChange={e => setUsername(e.target.value)} required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </label>
              <div className="auth-actions">
                <button type="submit" disabled={loading}>{loading ? "..." : "Login"}</button>
              </div>
            </form>
            {showError && <p className="alert error">{showError}</p>}
            <div className="auth-footer">
              <span className="muted">No account?</span>
              <button className="auth-btn ghost" type="button" onClick={() => setShowRegister(true)}>Register</button>
            </div>
          </div>
        </div>
      </div>
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  )
}
