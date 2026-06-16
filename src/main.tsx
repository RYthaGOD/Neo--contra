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
import { sounds } from './game/SoundManager'
import './index.css'

// Resume the WebAudio context on the first real user gesture. Mobile browsers
// (iOS/Android) only start audio from inside a gesture handler, so without this
// the game is silent on phones. Cheap + idempotent, so we leave it attached to
// re-resume if the context gets suspended (e.g. after backgrounding the tab).
const unlockAudio = () => sounds.unlock();
['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
  window.addEventListener(ev, unlockAudio, { passive: true }))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
