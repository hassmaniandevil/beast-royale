// ============================================
// BEAST ROYALE - UI MANAGER
// ============================================

import { MatchState, PlayerState, STARTER_BEASTS, BEASTS, getBeast, ARENAS, VentState, PowerUpState } from '@beast-royale/shared';
import { Game } from './game';
import { drawBeastIcon } from './beast-icons';

// Beast color mappings (Among Us style)
const BEAST_COLORS: Record<string, string> = {
  rock_tortoise: '#50ef39',   // Lime - sturdy tank
  honk_goose: '#f5f557',      // Yellow - chaotic goose
  boom_frog: '#117f2d',       // Green - explosive
  punch_crab: '#c51111',      // Red - aggressive
  stretchy_ferret: '#ed54ba', // Pink - agile
  default: '#6b2fbb',         // Purple
};

// Arena data for UI
const ARENA_DATA: Record<string, { emoji: string; color: string; desc: string }> = {
  random: { emoji: '🎲', color: 'linear-gradient(135deg, #a855f7, #ec4899)', desc: 'A random arena each match' },
  colosseum: { emoji: '🏛️', color: 'linear-gradient(135deg, #f59e0b, #d97706)', desc: 'Classic arena with rotating hazards' },
  slippery_slopes: { emoji: '🏔️', color: 'linear-gradient(135deg, #06b6d4, #0284c7)', desc: 'Icy arena with lots of bounce pads' },
  chaos_factory: { emoji: '🏭', color: 'linear-gradient(135deg, #64748b, #475569)', desc: 'Industrial zone with conveyor belts' },
};

// Tips for matchmaking screen
const TIPS = [
  'Use your ability (Q) to knock multiple enemies at once!',
  'Stay near the center as the zone shrinks!',
  'Heavier beasts knock back lighter ones more easily.',
  'The Panic Button (P) might save your life... or embarrass you!',
  'Watch out for hazards - they can knock you off the map!',
  'Attack enemies near the edge for easy eliminations!',
  'Chaos events can change the rules - stay alert!',
  'Lightweight beasts are faster but easier to knock back.',
];

export class UIManager {
  private game: Game;
  private announcementTimeout: NodeJS.Timeout | null = null;
  private selectedArena: string = 'random';

  constructor(game: Game) {
    this.game = game;
  }

  setupMenu(): void {
    // Setup name input
    this.setupNameInput();

    // Setup beast selector
    this.setupBeastSelector();

    // Setup play button
    const playButton = document.getElementById('play-button');
    if (playButton) {
      playButton.addEventListener('click', () => {
        this.game.play();
      });
    }

    // Setup play again button
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        this.game.playAgain();
      });
    }

    // Setup main menu button
    const mainMenuBtn = document.getElementById('main-menu-btn');
    if (mainMenuBtn) {
      mainMenuBtn.addEventListener('click', () => {
        this.game.playAgain();
      });
    }

    // Setup cancel matchmaking button
    const cancelBtn = document.getElementById('cancel-matchmaking');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.game.cancelMatchmaking();
      });
    }
  }

  private setupNameInput(): void {
    const nameInput = document.getElementById('name-input') as HTMLInputElement;
    const randomizeBtn = document.getElementById('randomize-name');

    if (nameInput) {
      // Set initial random name
      nameInput.value = this.generateDisplayName();

      // Update game display name on change
      nameInput.addEventListener('input', () => {
        const name = nameInput.value.trim() || this.generateDisplayName();
        this.game.setDisplayName(name);
      });

      // Trigger initial update
      this.game.setDisplayName(nameInput.value);
    }

    if (randomizeBtn && nameInput) {
      randomizeBtn.addEventListener('click', () => {
        nameInput.value = this.generateDisplayName();
        this.game.setDisplayName(nameInput.value);
      });
    }
  }

  private setupBeastSelector(): void {
    const beastSelector = document.getElementById('beast-selector');
    if (!beastSelector) return;

    beastSelector.innerHTML = '';

    for (const beastId of STARTER_BEASTS) {
      const beast = getBeast(beastId);
      if (!beast) continue;

      const card = document.createElement('div');
      card.className = `beast-card ${beastId === this.game.getSelectedBeast() ? 'selected' : ''}`;
      card.dataset.beastId = beastId;

      // Create canvas for beast icon
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      canvas.className = 'beast-canvas';
      drawBeastIcon(canvas, beastId);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'beast-card-name';
      nameDiv.textContent = beast.name.split(' ')[0];

      card.appendChild(canvas);
      card.appendChild(nameDiv);

      card.addEventListener('click', () => {
        this.game.selectBeast(beastId);
        this.updateBeastInfoPanel(beastId);
      });

      beastSelector.appendChild(card);
    }

    // Show info panel for initially selected beast
    this.updateBeastInfoPanel(this.game.getSelectedBeast());
  }

  private setupArenaSelector(): void {
    const arenaSelector = document.getElementById('arena-selector');
    if (!arenaSelector) return;

    arenaSelector.innerHTML = '';

    // Add random option first
    const randomCard = document.createElement('div');
    randomCard.className = 'arena-card selected';
    randomCard.dataset.arenaId = 'random';

    const randomData = ARENA_DATA.random;
    randomCard.innerHTML = `
      <div class="arena-random-badge">Recommended</div>
      <div class="arena-preview" style="background: ${randomData.color}">${randomData.emoji}</div>
      <div class="arena-card-name">Random</div>
      <div class="arena-card-desc">${randomData.desc}</div>
    `;

    randomCard.addEventListener('click', () => {
      this.selectArena('random');
    });

    arenaSelector.appendChild(randomCard);

    // Add actual arenas
    for (const arena of Object.values(ARENAS)) {
      const card = document.createElement('div');
      card.className = 'arena-card';
      card.dataset.arenaId = arena.id;

      const arenaData = ARENA_DATA[arena.id] || { emoji: '🗺️', color: '#333', desc: 'A challenging arena' };

      card.innerHTML = `
        <div class="arena-preview" style="background: ${arenaData.color}">${arenaData.emoji}</div>
        <div class="arena-card-name">${arena.name}</div>
        <div class="arena-card-desc">${arenaData.desc}</div>
      `;

      card.addEventListener('click', () => {
        this.selectArena(arena.id);
      });

      arenaSelector.appendChild(card);
    }
  }

  private selectArena(arenaId: string): void {
    this.selectedArena = arenaId;
    this.game.setSelectedArena(arenaId);

    // Update UI
    const cards = document.querySelectorAll('.arena-card');
    cards.forEach((card) => {
      const element = card as HTMLElement;
      if (element.dataset.arenaId === arenaId) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    });
  }

  private updateBeastInfoPanel(beastId: string): void {
    const beast = getBeast(beastId);
    if (!beast) return;

    const blobEl = document.getElementById('beast-info-blob');
    const nameEl = document.getElementById('beast-info-name');
    const typeEl = document.getElementById('beast-info-type');
    const statHealth = document.getElementById('stat-health');
    const statSpeed = document.getElementById('stat-speed');
    const statPower = document.getElementById('stat-power');
    const statWeight = document.getElementById('stat-weight');
    const abilityNameEl = document.getElementById('ability-name');
    const abilityDescEl = document.getElementById('ability-desc');

    // Draw beast icon on canvas in info panel
    if (blobEl) {
      // Replace blob div with canvas if not already
      let canvas = blobEl.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        blobEl.innerHTML = '';
        blobEl.appendChild(canvas);
        (blobEl as HTMLElement).style.background = 'transparent';
      }
      drawBeastIcon(canvas, beastId);
    }
    if (nameEl) nameEl.textContent = beast.name;

    // Create role label based on weight
    const roleLabels: Record<string, string> = {
      heavy: 'Tank',
      medium: 'Brawler',
      light: 'Speedster',
    };
    if (typeEl) typeEl.textContent = `${beast.weight.charAt(0).toUpperCase() + beast.weight.slice(1)} • ${roleLabels[beast.weight] || 'Fighter'}`;

    // Calculate stat percentages (normalize to 0-100)
    if (statHealth) statHealth.style.width = `${(beast.health / 150) * 100}%`;
    if (statSpeed) statSpeed.style.width = `${(beast.speed / 1.5) * 100}%`;
    if (statPower) statPower.style.width = `${(beast.attackPower / 1.6) * 100}%`;

    // Weight based on class
    const weightValue = beast.weight === 'heavy' ? 0.95 : beast.weight === 'medium' ? 0.65 : 0.35;
    if (statWeight) statWeight.style.width = `${weightValue * 100}%`;

    // Parse ability from "special" field
    const specialParts = beast.special.split(' - ');
    const abilityNameText = specialParts[0] || 'Special';
    const abilityDescText = specialParts[1] || beast.quirk;

    if (abilityNameEl) abilityNameEl.textContent = `✨ ${abilityNameText}`;
    if (abilityDescEl) abilityDescEl.textContent = abilityDescText;
  }

  private generateDisplayName(): string {
    const adjectives = ['Brave', 'Sneaky', 'Mighty', 'Swift', 'Clever', 'Wild', 'Bold', 'Happy', 'Cosmic', 'Electric'];
    const nouns = ['Beast', 'Warrior', 'Champion', 'Fighter', 'Legend', 'Hero', 'Noodle', 'Potato', 'Pickle', 'Waffle'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);

    return `${adj}${noun}${num}`;
  }

  setPlayerName(name: string): void {
    const nameInput = document.getElementById('name-input') as HTMLInputElement;
    if (nameInput && !nameInput.value) {
      nameInput.value = name;
    }
  }

  setConnectionStatus(connected: boolean): void {
    const playButton = document.getElementById('play-button') as HTMLButtonElement;
    const serverHint = document.getElementById('server-hint');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    if (playButton) {
      if (connected) {
        playButton.disabled = false;
        playButton.textContent = 'PLAY';
      } else {
        playButton.disabled = true;
        playButton.textContent = 'SERVER OFFLINE';
      }
    }

    if (statusDot) {
      if (connected) {
        statusDot.classList.add('online');
      } else {
        statusDot.classList.remove('online');
      }
    }

    if (statusText) {
      statusText.textContent = connected ? 'Server connected' : 'Server offline';
    }

    if (serverHint) {
      if (connected) {
        serverHint.classList.remove('visible');
      } else {
        serverHint.classList.add('visible');
      }
    }
  }

  updateBeastSelection(selectedBeastId: string): void {
    const cards = document.querySelectorAll('.beast-card');
    cards.forEach((card) => {
      const element = card as HTMLElement;
      if (element.dataset.beastId === selectedBeastId) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    });

    this.updateBeastInfoPanel(selectedBeastId);
  }

  // ============================================
  // MATCHMAKING
  // ============================================

  showMatchmaking(): void {
    const screen = document.getElementById('matchmaking-screen');
    if (screen) {
      screen.classList.add('visible');
    }

    // Update beast icon in matchmaking
    const beastId = this.game.getSelectedBeast();
    const matchmakingBlob = document.getElementById('matchmaking-blob');
    if (matchmakingBlob) {
      // Replace blob div with canvas if not already
      let canvas = matchmakingBlob.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        matchmakingBlob.innerHTML = '';
        matchmakingBlob.appendChild(canvas);
        (matchmakingBlob as HTMLElement).style.background = 'transparent';
      }
      drawBeastIcon(canvas, beastId);
    }

    // Set random tip
    const tipEl = document.getElementById('matchmaking-tip');
    if (tipEl) {
      tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    }

    this.updateMatchmakingStatus(1, 9, 'Searching for match...');
  }

  showMatchFound(countdown: number): void {
    const title = document.getElementById('matchmaking-title');
    const status = document.getElementById('matchmaking-status');

    if (title) {
      title.textContent = 'Match Found!';
    }
    if (status) {
      status.textContent = `Starting in ${Math.ceil(countdown / 1000)}...`;
    }
  }

  updateMatchmakingStatus(current: number, max: number, status: string): void {
    const playersEl = document.getElementById('matchmaking-players');
    const statusEl = document.getElementById('matchmaking-status');
    const barEl = document.getElementById('matchmaking-bar');

    if (playersEl) {
      playersEl.textContent = `${current}/${max}`;
    }
    if (statusEl) {
      statusEl.textContent = status;
    }
    if (barEl) {
      barEl.style.width = `${(current / max) * 100}%`;
    }
  }

  hideMatchmaking(): void {
    const screen = document.getElementById('matchmaking-screen');
    if (screen) {
      screen.classList.remove('visible');
    }

    // Reset title
    const title = document.getElementById('matchmaking-title');
    if (title) {
      title.textContent = 'Finding Match';
    }
  }

  // ============================================
  // HUD
  // ============================================

  showHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.classList.add('visible');
    }
  }

  hideHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.classList.remove('visible');
    }
  }

  update(state: MatchState, localPlayer: PlayerState | null): void {
    // Update players remaining
    const playersRemaining = document.getElementById('players-remaining');
    if (playersRemaining) {
      playersRemaining.textContent = String(state.remainingPlayers);
    }

    // Update match time
    const matchTime = document.getElementById('match-time');
    if (matchTime) {
      const minutes = Math.floor(state.currentTime / 60000);
      const seconds = Math.floor((state.currentTime % 60000) / 1000);
      matchTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update phase indicator
    const phaseEl = document.getElementById('hud-phase');
    if (phaseEl) {
      phaseEl.textContent = state.phase.toUpperCase();

      // Color based on phase
      const phaseColors: Record<string, string> = {
        scatter: 'rgba(34, 197, 94, 0.3)',
        escalation: 'rgba(59, 130, 246, 0.3)',
        crisis: 'rgba(249, 115, 22, 0.3)',
        finale: 'rgba(239, 68, 68, 0.3)',
        overtime: 'rgba(168, 85, 247, 0.3)',
      };
      phaseEl.style.background = phaseColors[state.phase] || 'rgba(168, 85, 247, 0.3)';
    }

    // Update health bar
    if (localPlayer) {
      const healthBar = document.getElementById('health-bar') as HTMLElement;
      const healthCurrent = document.getElementById('health-current');
      const healthMax = document.getElementById('health-max');

      if (healthBar) {
        const healthPercent = (localPlayer.health / localPlayer.maxHealth) * 100;
        healthBar.style.width = `${healthPercent}%`;

        if (healthPercent <= 30) {
          healthBar.classList.add('low');
        } else {
          healthBar.classList.remove('low');
        }
      }

      if (healthCurrent) {
        healthCurrent.textContent = String(Math.max(0, Math.round(localPlayer.health)));
      }
      if (healthMax) {
        healthMax.textContent = String(localPlayer.maxHealth);
      }

      // Update ability indicator
      const abilityIndicator = document.getElementById('ability-indicator');
      const abilityCooldown = document.getElementById('ability-cooldown') as HTMLElement;

      if (abilityIndicator && abilityCooldown) {
        const beast = getBeast(localPlayer.beastId);
        if (beast) {
          const cooldownPercent = (localPlayer.abilityCooldownRemaining / beast.abilityCooldown) * 100;

          if (cooldownPercent <= 0) {
            abilityIndicator.classList.add('ready');
            abilityCooldown.style.width = '100%';
          } else {
            abilityIndicator.classList.remove('ready');
            abilityCooldown.style.width = `${100 - cooldownPercent}%`;
          }
        }
      }

      // Update attack indicator
      const attackIndicator = document.getElementById('attack-indicator');
      if (attackIndicator) {
        const beast = getBeast(localPlayer.beastId);
        if (beast && localPlayer.attackCooldownRemaining <= 0) {
          attackIndicator.classList.add('ready');
        } else {
          attackIndicator.classList.remove('ready');
        }
      }
    }
  }

  // ============================================
  // ANNOUNCEMENTS
  // ============================================

  showAnnouncement(
    text: string,
    type: 'info' | 'warning' | 'chaos' | 'death' | 'victory' = 'info'
  ): void {
    const announcement = document.getElementById('announcement');
    if (!announcement) return;

    // Clear previous timeout
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }

    // Remove previous type classes
    announcement.classList.remove('chaos', 'death', 'victory');

    // Set text and type
    announcement.textContent = text;
    if (type === 'chaos' || type === 'death' || type === 'victory') {
      announcement.classList.add(type);
    }

    // Show
    announcement.classList.add('visible');

    // Hide after 3 seconds
    this.announcementTimeout = setTimeout(() => {
      announcement.classList.remove('visible');
    }, 3000);
  }

  // ============================================
  // RESULTS
  // ============================================

  showResults(data: any): void {
    const resultsScreen = document.getElementById('results-screen');
    const resultTitle = document.getElementById('result-title');
    const resultPlacement = document.getElementById('result-placement');
    const statEliminations = document.getElementById('stat-eliminations');
    const statTime = document.getElementById('stat-time');
    const statDamage = document.getElementById('stat-damage');
    const statChaos = document.getElementById('stat-chaos');
    const statXp = document.getElementById('stat-xp');

    if (resultsScreen) {
      resultsScreen.classList.add('visible');
    }

    if (resultTitle) {
      if (data.yourStats.placement === 1) {
        resultTitle.textContent = 'VICTORY!';
        resultTitle.classList.add('winner');
        resultTitle.classList.remove('eliminated');
      } else {
        resultTitle.textContent = 'ELIMINATED';
        resultTitle.classList.add('eliminated');
        resultTitle.classList.remove('winner');
      }
    }

    if (resultPlacement) {
      resultPlacement.textContent = `#${data.yourStats.placement}`;
    }

    if (statEliminations) {
      statEliminations.textContent = String(data.yourStats.eliminations);
    }

    if (statTime) {
      const minutes = Math.floor(data.yourStats.timeAlive / 60000);
      const seconds = Math.floor((data.yourStats.timeAlive % 60000) / 1000);
      statTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (statDamage) {
      statDamage.textContent = String(data.yourStats.damageDealt);
    }

    if (statChaos) {
      statChaos.textContent = String(data.yourStats.chaosEventsSurvived || 0);
    }

    if (statXp) {
      statXp.textContent = `+${data.yourStats.xpEarned} XP`;
    }
  }

  hideResults(): void {
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen) {
      resultsScreen.classList.remove('visible');
    }
  }

  // ============================================
  // POWER-UP INDICATORS
  // ============================================

  updatePowerUpIndicators(player: PlayerState): void {
    const container = document.getElementById('powerup-indicators');
    if (!container) return;

    // Clear existing indicators
    container.innerHTML = '';

    // Add indicators for active power-ups
    for (const pu of player.activePowerUps) {
      const indicator = document.createElement('div');
      indicator.className = `powerup-indicator powerup-${pu.type}`;

      const icons: Record<string, string> = {
        speed_boost: '⚡',
        damage_boost: '🗡️',
        shield: '🛡️',
        ability_refresh: '✨',
      };

      const colors: Record<string, string> = {
        speed_boost: '#3b82f6',
        damage_boost: '#ef4444',
        shield: '#a855f7',
        ability_refresh: '#22c55e',
      };

      indicator.innerHTML = `
        <span class="powerup-icon">${icons[pu.type] || '⭐'}</span>
        <div class="powerup-timer" style="background: ${colors[pu.type] || '#fbbf24'}"></div>
      `;

      container.appendChild(indicator);
    }
  }

  // ============================================
  // VENT INTERACTION PROMPT
  // ============================================

  showVentPrompt(show: boolean): void {
    let prompt = document.getElementById('vent-prompt');

    if (show) {
      if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'vent-prompt';
        prompt.className = 'interaction-prompt';
        prompt.innerHTML = `
          <span class="prompt-key">E</span>
          <span class="prompt-text">Enter Vent</span>
        `;
        document.body.appendChild(prompt);
      }
      prompt.classList.add('visible');
    } else if (prompt) {
      prompt.classList.remove('visible');
    }
  }

  // ============================================
  // STUN INDICATOR
  // ============================================

  showStunIndicator(show: boolean): void {
    let indicator = document.getElementById('stun-indicator');

    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'stun-indicator';
        indicator.className = 'stun-overlay';
        indicator.innerHTML = `
          <div class="stun-stars">⭐ STUNNED ⭐</div>
        `;
        document.body.appendChild(indicator);
      }
      indicator.classList.add('visible');
    } else if (indicator) {
      indicator.classList.remove('visible');
    }
  }

  // ============================================
  // HIDDEN INDICATOR
  // ============================================

  showHiddenIndicator(show: boolean): void {
    let indicator = document.getElementById('hidden-indicator');

    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'hidden-indicator';
        indicator.className = 'hidden-indicator';
        indicator.innerHTML = `
          <span class="hidden-icon">👁️</span>
          <span class="hidden-text">Hidden</span>
        `;
        document.body.appendChild(indicator);
      }
      indicator.classList.add('visible');
    } else if (indicator) {
      indicator.classList.remove('visible');
    }
  }

  // ============================================
  // PANIC EFFECT
  // ============================================

  showPanicEffect(): void {
    // Create panic overlay
    let overlay = document.getElementById('panic-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'panic-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.1s;
      `;
      document.body.appendChild(overlay);
    }

    // Random panic outcomes with visual effects
    const outcomes = [
      { text: 'AAAAAAH!', color: '#ff4444', emoji: '😱' },
      { text: '*HONK*', color: '#ffdd44', emoji: '🦆' },
      { text: 'TRIP!', color: '#ff8844', emoji: '🍌' },
      { text: '*SPIN*', color: '#44ddff', emoji: '🌀' },
      { text: '🎉 CONFETTI! 🎉', color: '#ff44ff', emoji: '🎊' },
      { text: '...nothing', color: '#888888', emoji: '😐' },
      { text: 'CLUTCH!', color: '#44ff44', emoji: '⭐' },
      { text: 'SHOCKWAVE!', color: '#ffaa00', emoji: '💥' },
    ];

    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    overlay.innerHTML = `
      <div style="
        font-size: 64px;
        font-weight: bold;
        color: ${outcome.color};
        text-shadow: 4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
        animation: panicPop 0.5s ease-out;
        text-align: center;
      ">
        <div style="font-size: 80px;">${outcome.emoji}</div>
        <div>${outcome.text}</div>
      </div>
    `;

    // Add animation keyframes if not exists
    if (!document.getElementById('panic-styles')) {
      const style = document.createElement('style');
      style.id = 'panic-styles';
      style.textContent = `
        @keyframes panicPop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes panicShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Show and animate
    overlay.style.opacity = '1';

    // Screen shake effect
    document.body.style.animation = 'panicShake 0.1s ease-in-out 3';
    setTimeout(() => {
      document.body.style.animation = '';
    }, 300);

    // Hide after animation
    setTimeout(() => {
      overlay.style.opacity = '0';
    }, 500);
  }
}
