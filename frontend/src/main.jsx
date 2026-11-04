import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './themes.css'
import './lib/install'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: makes the app installable and keeps the UI usable offline. Skipped on localhost
// so local development never serves stale files.
if ('serviceWorker' in navigator && import.meta.env.PROD && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
