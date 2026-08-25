import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_APP_MODE === 'demo') {
    const { seedDemoData } = await import('./utils/demoData')
    seedDemoData()
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
