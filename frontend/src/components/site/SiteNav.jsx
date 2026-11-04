/** Light marketing sub-nav shared by /welcome, /product, /about. */
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const LINKS = [
  ["/", "Home"],
  ["/product", "Product"],
  ["/about", "About"],
  ["/learn", "Learn"],
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const cls = ({ isActive }) => `sn-link${isActive ? " active" : ""}`;
  return (
    <header className="sn">
      <nav className="sn-in" aria-label="Site">
        <Link to="/" className="sn-brand"><img src="/favicon.svg" alt="" width="28" height="28" style={{ marginRight: 8, verticalAlign: "middle" }} />CodeSense <span>AI</span></Link>
        <div className="sn-links">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={cls}>{label}</NavLink>
          ))}
          <Link to="/app" className="stb primary sm" style={{ marginLeft: 8 }}>Open app</Link>
        </div>
        <button
          type="button" className="sn-burger" aria-expanded={open} aria-controls="sn-menu"
          aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M3 5h12M3 9h12M3 13h12" />}
          </svg>
        </button>
      </nav>
      <div id="sn-menu" className={`sn-menu${open ? " open" : ""}`}>
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={cls} onClick={() => setOpen(false)}>{label}</NavLink>
        ))}
        <Link to="/app" className="stb primary" onClick={() => setOpen(false)}>Open app</Link>
      </div>
    </header>
  );
}
