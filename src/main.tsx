import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementsByClassName('chat-container')[0] as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
