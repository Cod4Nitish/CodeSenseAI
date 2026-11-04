/**
 * BottomNav - app-style tab bar. Only visible in the installed app on phones (see App.css).
 * by Nitish Singh
 */
import { NavLink, useLocation } from "react-router-dom";
import { tick } from "../lib/haptics";

const HIDE = ["/", "/product", "/about", "/login", "/signup", "/forgot-password"];
const I = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

const TABS = [
  ["/app", "Review", <svg key="a" {...I}><path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" /></svg>],
  ["/pr", "PR", <svg key="b" {...I}><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M6 8.5v7M18 15.5V9a3 3 0 0 0-3-3h-3m0 0 2.5-2.5M12 6l2.5 2.5" /></svg>],
  ["/learn", "Learn", <svg key="c" {...I}><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM7 11v5c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-5" /></svg>],
  ["/dashboard", "Dashboard", <svg key="d" {...I}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>],
];

export default function BottomNav() {
  const { pathname } = useLocation();
  if (HIDE.includes(pathname.replace(/\/+$/, "") || "/")) return null;
  return (
    <nav className="bottom-nav" aria-label="App">
      {TABS.map(([to, label, icon]) => (
        <NavLink key={to} to={to} end={to === "/app"} onClick={tick} className={({ isActive }) => `bn-item${isActive ? " on" : ""}`}>
          {icon}<span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
