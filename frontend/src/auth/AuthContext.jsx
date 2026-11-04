/**
 * CodeSense AI — authentication context.
 * by Nitish Singh
 *
 * Owns: the current user, the bearer token (persisted to localStorage via the
 * api module), and the sign-in modal. Everything auth-related in the app reads
 * from `useAuth()`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { auth as authApi, setToken, clearToken, getToken } from "../api";
import { useLocation, useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authed | anon
  const navigate = useNavigate();
  const location = useLocation();
  const locRef = useRef(location);
  locRef.current = location;

  const applySession = useCallback((payload) => {
    setToken(payload.access_token);
    setUser(payload.user);
    setStatus("authed");
  }, []);

  /* full-page sign-in (replaces the old modal); ?next= returns the user here */
  const goLogin = useCallback(
    (reason) => {
      const { pathname, search } = locRef.current;
      if (/^\/(login|signup|forgot-password)/.test(pathname)) return;
      const q = new URLSearchParams({ next: pathname + search });
      if (reason) q.set("reason", reason);
      navigate(`/login?${q}`);
    },
    [navigate]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anon");
  }, []);

  /* ── bootstrap: validate any stored token once on load ──────────────── */
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setStatus("anon");
      return;
    }
    authApi
      .me()
      .then((profile) => {
        if (!cancelled) {
          setUser(profile);
          setStatus("authed");
        }
      })
      .catch(() => {
        if (!cancelled) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  /* ── react to a 401 from anywhere in the app ───────────────────────── */
  useEffect(() => {
    function onUnauthorized() {
      if (getToken()) {
        logout();
        goLogin("expired");
      }
    }
    window.addEventListener("codesense:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("codesense:unauthorized", onUnauthorized);
  }, [logout, goLogin]);

  /* ── actions exposed to the tree ──────────────────────────────────── */
  const login = useCallback(
    async (email, password) => applySession(await authApi.login(email, password)),
    [applySession]
  );

  const register = useCallback(
    async (email, fullName, password) =>
      applySession(await authApi.register(email, fullName, password)),
    [applySession]
  );

  const demoLogin = useCallback(
    async () => applySession(await authApi.demo()),
    [applySession]
  );

  const promptLogin = useCallback(() => goLogin(), [goLogin]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthed: status === "authed",
      isLoading: status === "loading",
      login,
      register,
      demoLogin,
      logout,
      promptLogin,
      closeModal: () => {},
    }),
    [user, status, login, register, demoLogin, logout, promptLogin]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
