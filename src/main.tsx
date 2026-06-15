import { Buffer } from 'buffer'
// @solana/web3.js expects a global Buffer in the browser (used when building/
// signing transactions). Provide it before any Solana code runs, otherwise
// wallet/transaction calls throw "Buffer is not defined".
if (!(globalThis as unknown as { Buffer?: unknown }).Buffer) {
    (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
