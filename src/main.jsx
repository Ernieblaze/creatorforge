import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './components/toast.jsx'

// PWA: register service worker in production builds
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

// Referral capture: remember ?ref=<user_id> until the visitor signs up
const refCode = new URLSearchParams(window.location.search).get('ref')
if (refCode) localStorage.setItem('cf_ref', refCode)

/** Last line of defense: a crash shows a friendly reload screen instead
 *  of a permanent white page. */
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif', background: '#0b0d14', color: '#e2e8f0' }}>
        <div>
          <p style={{ fontSize: 40 }}>😵‍💫</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '12px 0 6px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 320, margin: '0 auto' }}>
            An unexpected error occurred. Your content is safe — just reload the app.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '12px 28px', borderRadius: 12, border: 0, background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Reload CreatorForge
          </button>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
