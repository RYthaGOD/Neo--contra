# NeoContra: Solana Assault

> "The mission is paramount. The blockchain is the battlefield." - Rykiri

NeoContra: Solana Assault is a high-fidelity, retro-style run-and-gun shooter reimagined for the 2026 Solana Mobile ecosystem. Built with Phaser 3 and React, it features seamless on-chain integration, micro-transactions, and a polished "Industrial Futurism" aesthetic optimized for the Seeker and Saga devices.

## 🚀 Tactical Features

- **Phaser 3 Core**: High-performance arcade physics with 8-way aiming and legacy Contra mechanics.
- **Solana Mobile Integration**: Native support for Mobile Wallet Adapter (MWA) and SPL-token interactions.
- **In-Game Armory**: A functional DeFi Shop where players can purchase power-ups and extra lives using SKR tokens.
- **Global High Command**: Real-time leaderboards powered by Supabase for cross-device competition.
- **Retro-Modern Visuals**: Authentic pixel-art assets enhanced with dynamic neon lighting and a custom CRT scanline shader.
- **Haptic Immersion**: Physical feedback via device rumble for critical in-game events.

## 🛠️ Technical Stack

- **Engine**: Phaser 3.88.2
- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Blockchain**: @solana/web3.js, @solana/wallet-adapter
- **State**: React Context API
- **Backend/DB**: Supabase
- **Offline**: Vite PWA with Workbox strategies

## 🔌 Getting Started

### 1. Environmental Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/RYthaGOD/Neo--contra.git
cd neo-contra
pnpm install
```

### 2. Configuration
Create a `.env` file based on `.env.example`:
```env
VITE_DEV_WALLET=<your_wallet_address>
VITE_SOLANA_NETWORK=devnet
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
```

### 3. Deployment
Execute the production protocol:
```bash
pnpm build
pnpm preview
```

## 🎮 Controls

### Desktop
- **Move**: Arrow Keys
- **Jump**: Up Arrow
- **Shoot**: Spacebar
- **Shop**: ESC / [S] Button

### Mobile
- **Movement**: Virtual Joystick (Left)
- **Actions**: Discrete Jump/Fire Buttons (Right)

---

Developed by **Rykiri** // Powered by **Antigravity**
