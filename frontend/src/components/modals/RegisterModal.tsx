import {useState} from "react"
import type {FormEvent} from "react"
import {api} from "../../api/client"

type Props = {onClose: () => void}

export function RegisterModal({onClose}: Props) {
  const [username,setUsername] = useState("")
  const [password,setPassword] = useState("")
  const [email,setEmail] = useState("")
  const [role,setRole] = useState("buyer")
  const [status,setStatus] = useState<string|undefined>()
  const [error,setError] = useState<string|undefined>()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setStatus(undefined)
    setError(undefined)
    try {
      await api.register({username, password, email, role})
      setStatus("User created. You can now log in.")
      setUsername("")
      setPassword("")
      setEmail("")
    } catch (err:any) {
      setError(err.message)
    }
  }

  return (
    <div className="modal auth-modal" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>X</button>
        <div className="modal-body" style={{gridTemplateColumns:"1fr"}}>
          <div className="modal-info" style={{gap:"14px"}}>
            <h3 style={{margin:0, color:"#0f172a"}}>Register</h3>
            <form className="auth-form" onSubmit={submit}>
              <label>
                <span>Username</span>
                <input value={username} onChange={e => setUsername(e.target.value)} required />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </label>
              <label>
                <span>Role</span>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
              </label>
              <div className="auth-actions">
                <button type="submit">Register</button>
              </div>
            </form>
            {status && <p className="alert success">{status}</p>}
            {error && <p className="alert error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
