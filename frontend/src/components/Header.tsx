import {NavLink} from "react-router-dom"
import {useApp} from "../state/appStore"
import {useAuth} from "../state/authStore"
import {AuthModal} from "./modals/AuthModal"
import {useState} from "react"

type Props = {
  activeTab: "home"|"sellers"|"cart"|"buyer"|"sellerProfile"
}

export function Header({activeTab}: Props) {
  const {setSearch, isBuyer, isSeller} = useApp()
  const {isAuth, username, logout} = useAuth()
  const [showAuth,setShowAuth] = useState(false)
  const linkClass = (tab: string) => activeTab === tab ? "active" : ""
  return (
    <header className="hero">
      <NavLink className="logo" to="/" onClick={() => setSearch("")}>BleskShop</NavLink>
      <nav className="tabs">
        <NavLink className={linkClass("home")} to="/">Home</NavLink>
        {isSeller && <NavLink className={linkClass("sellers")} to="/sellers">Seller console</NavLink>}
        {isBuyer && <NavLink className={linkClass("cart")} to="/cart">Cart</NavLink>}
        {isBuyer && <NavLink className={linkClass("buyer")} to="/buyer">Buyer profile</NavLink>}
        {isSeller && <NavLink className={linkClass("sellerProfile")} to="/seller">Seller profile</NavLink>}
      </nav>
      <div className="auth">
        {isAuth ? (
          <>
            <span className="auth-user">{username}</span>
            <button className="auth-btn" onClick={() => logout()}>Logout</button>
          </>
        ) : (
          <button className="auth-btn" onClick={() => setShowAuth(true)}>Login</button>
        )}
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  )
}
