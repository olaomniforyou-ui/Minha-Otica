import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Registra o Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {/* service worker é opcional em dev */})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
