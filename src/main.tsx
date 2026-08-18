import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'
import './auth.css'
import './dashboard.css'
import './analytics.css'
import './home.css'
import './profile.css'
import './categories.css'
registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
