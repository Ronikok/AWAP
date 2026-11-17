import { NavLink } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import "./navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="rio-header">
      <div className="rio-logo">
        Rio
        <span>Elokuvateatteri</span>
      </div>

      <nav className="rio-nav">
        <NavLink to="/" end>
          Etusivu
        </NavLink>

        <NavLink to="/oulu">Oulu</NavLink>

        <NavLink to="/tampere">Tampere</NavLink>
      </nav>

      <div className="rio-nav-icons">
        <span aria-label="Search">⌕</span>
        {user ? (
          <>
            <span className="rio-user-name">{user.name}</span>
            <button className="rio-logout" onClick={logout}>
              Kirjaudu ulos
            </button>
          </>
        ) : (
          <NavLink to="/login" aria-label="Login" className="rio-account-link">
            ◉
          </NavLink>
        )}
      </div>
    </header>
  );
}
