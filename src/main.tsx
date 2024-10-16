import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ZoomDesktop from './ZoomDesktop.tsx'
import './reset.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ZoomDesktop />
  </StrictMode>,
)
