import { NavLink } from "react-router";
import "./navbar.css";

export default function Navbar() {
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
        <span aria-label="Account">◉</span>
      </div>
    </header>
  );
}
