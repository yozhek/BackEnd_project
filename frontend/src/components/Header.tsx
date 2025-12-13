import {NavLink} from "react-router-dom"
import {useApp} from "../state/appStore"

type Props = {
  activeTab: "home"|"sellers"|"cart"|"buyer"|"sellerProfile"
}

export function Header({activeTab}: Props) {
  const {setSearch} = useApp()
  const linkClass = (tab: string) => activeTab === tab ? "active" : ""
  return (
    <header className="hero">
      <NavLink className="logo" to="/" onClick={() => setSearch("")}>BleskShop</NavLink>
      <nav className="tabs">
        <NavLink className={linkClass("home")} to="/">Home</NavLink>
        <NavLink className={linkClass("sellers")} to="/sellers">Seller console</NavLink>
        <NavLink className={linkClass("cart")} to="/cart">Cart</NavLink>
        <NavLink className={linkClass("buyer")} to="/buyer">Buyer profile</NavLink>
        <NavLink className={linkClass("sellerProfile")} to="/seller">Seller profile</NavLink>
      </nav>
    </header>
  )
}
