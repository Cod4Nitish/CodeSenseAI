/**
 * CodeSense AI — application shell (router + auth + global top bar).
 * by Nitish Singh
 *
 *   /           → Landing page (first thing visitors see)
 *   /app        → Review Workspace (editor ↔ diagnostics) - works without login
 *   /dashboard  → Executive Dashboard (KPIs, charts, audit history)
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import TopBar from "./components/TopBar";
import Workspace from "./pages/Workspace";
import Dashboard from "./pages/Dashboard";
import PRReview from "./pages/PRReview";
import Landing from "./pages/Landing";
import Learn from "./pages/Learn";
import Product from "./pages/site/Product";
import About from "./pages/site/About";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import NotFound from "./pages/errors/NotFound";
import DebugCrash from "./pages/errors/DebugCrash";
import RouteErrorBoundary from "./components/errors/ErrorBoundary";
import OfflineBanner from "./components/errors/OfflineBanner";
import { Toaster } from "./components/auth/AuthForms";
import InstallDialog from "./components/InstallDialog";
import BottomNav from "./components/BottomNav";

export default function App() {
  return (
    <BrowserRouter>
      <RouteErrorBoundary>
      <AuthProvider>
        <div className="app-shell">
          <TopBar />
          <OfflineBanner />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Workspace />} />
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/product" element={<Product />} />
            <Route path="/about" element={<About />} />
            <Route path="/pr" element={<PRReview />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/__crash" element={<DebugCrash />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <BottomNav />
          <InstallDialog />
        </div>
      </AuthProvider>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}
