import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setStatsConfig } from './services/stats/config.js'

// Seed stats config from persisted preferences once at startup so pure stats
// code doesn't have to touch localStorage on every recompute.
try {
    const v = localStorage.getItem('useSampleVariance');
    if (v !== null) setStatsConfig({ useSampleVariance: JSON.parse(v) });
} catch { /* ignore */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
