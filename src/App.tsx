import React from 'react';
import { SolanaProvider } from './context/SolanaProvider';
import { GameProvider, useGame } from './context/GameContext';
import GameView from './ui/components/GameView';
import { HUD } from './ui/components/HUD';
import { ShopUI } from './ui/components/ShopUI';
import { LeaderboardUI } from './ui/components/LeaderboardUI';
import { MobileControls } from './ui/components/MobileControls';

function AppContent() {
  const { state } = useGame();

  return (
    <div className="min-h-screen bg-black text-neon-green font-retro overflow-hidden flex flex-col items-center justify-center p-4">
      <div id="game-container" className="relative border-4 border-neon-purple shadow-[0_0_30px_rgba(188,19,254,0.4)] aspect-[4/3] w-full max-w-[800px] crt">
        <GameView />
        <HUD />
        {state.isShopOpen && <ShopUI />}
        {state.isGameOver && <LeaderboardUI />}
        <MobileControls />
      </div>

      <div className="mt-4 text-[10px] text-neon-blue opacity-50 uppercase tracking-tighter">
        NeoContra: Solana Assault // Protocol v0.1.0
      </div>
    </div>
  );
}

function App() {
  return (
    <SolanaProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SolanaProvider>
  );
}

export default App;
