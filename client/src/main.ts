// ============================================
// BEAST ROYALE - CLIENT ENTRY POINT
// ============================================

import { Game } from './game';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.initialize();
});
