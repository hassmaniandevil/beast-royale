// ============================================
// BEAST ROYALE - MAIN GAME CLASS
// ============================================

import { Application } from 'pixi.js';
import { Renderer } from './renderer';
import { InputManager } from './input';
import { NetworkManager } from './network';
import { UIManager } from './ui';
import { audio } from './audio';
import {
  MatchState,
  PlayerState,
  ServerMessage,
  STARTER_BEASTS,
  BEASTS,
} from '@beast-royale/shared';

export type GameState = 'loading' | 'menu' | 'matchmaking' | 'playing' | 'spectating' | 'results';

export class Game {
  private app: Application | null = null;
  private renderer: Renderer | null = null;
  private input: InputManager | null = null;
  private network: NetworkManager | null = null;
  private ui: UIManager | null = null;

  private state: GameState = 'loading';
  private playerId: string | null = null;
  private sessionId: string | null = null;
  private displayName: string = '';
  private selectedBeast: string = 'rock_tortoise';
  private selectedArena: string = 'random';

  private matchState: MatchState | null = null;
  private localPlayer: PlayerState | null = null;

  private lastUpdateTime: number = 0;
  private inputSequence: number = 0;

  async initialize(): Promise<void> {
    console.log('[Game] Initializing...');

    // Update loading progress
    this.updateLoadingProgress(10, 'Creating renderer...');

    // Create Pixi application
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.app = new Application();

    await this.app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.updateLoadingProgress(30, 'Loading assets...');

    // Initialize renderer
    this.renderer = new Renderer(this.app);
    await this.renderer.loadAssets();

    this.updateLoadingProgress(60, 'Setting up controls...');

    // Initialize input
    this.input = new InputManager(this);

    this.updateLoadingProgress(80, 'Connecting to server...');

    // Initialize network
    this.network = new NetworkManager(this);
    await this.network.connect();

    this.updateLoadingProgress(90, 'Preparing UI...');

    // Initialize UI
    this.ui = new UIManager(this);
    this.ui.setupMenu();

    // Check connection status
    if (!this.network.isConnected()) {
      this.updateLoadingProgress(100, 'Server offline - Start server first!');
      this.ui.setConnectionStatus(false);
    } else {
      this.updateLoadingProgress(100, 'Ready!');
      this.ui.setConnectionStatus(true);
    }

    // Hide loading screen
    setTimeout(() => {
      this.hideLoadingScreen();
      this.showMenu();
    }, 500);

    // Start game loop
    this.app.ticker.add(() => this.update());

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());

    console.log('[Game] Initialized successfully');
  }

  private updateLoadingProgress(percent: number, text: string): void {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    if (loadingBar) {
      loadingBar.style.width = `${percent}%`;
    }
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }

  private showMenu(): void {
    this.state = 'menu';
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      mainMenu.classList.add('visible');
    }
    // Play menu music
    audio.startMusic(3); // Menu Chill track
  }

  private hideMenu(): void {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
      mainMenu.classList.remove('visible');
    }
  }

  private handleResize(): void {
    if (!this.app) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.app.renderer.resize(width, height);

    if (this.renderer) {
      this.renderer.handleResize(width, height);
    }
  }

  // ============================================
  // GAME LOOP
  // ============================================

  private update(): void {
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    if (this.state === 'playing' && this.matchState) {
      // Process input and send to server
      this.processInput();

      // Update renderer
      if (this.renderer) {
        this.renderer.update(this.matchState, this.playerId, deltaTime);
      }

      // Update UI
      if (this.ui) {
        this.ui.update(this.matchState, this.localPlayer);
      }
    }
  }

  private processInput(): void {
    if (!this.input || !this.network || !this.localPlayer) return;

    const inputState = this.input.getInputState();
    this.inputSequence++;

    // Send input to server
    this.network.sendInput({
      sequenceNumber: this.inputSequence,
      timestamp: Date.now(),
      movement: inputState.movement,
      attack: inputState.attack,
      ability: inputState.ability,
      panic: false,
      interact: inputState.interact,
      aimDirection: inputState.aimDirection,
    });

    // Clear one-shot inputs
    this.input.clearOneShot();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  async play(): Promise<void> {
    if (this.state !== 'menu') return;

    // Initialize audio on first interaction (browser requirement)
    await audio.init();

    // Check if connected to server
    if (!this.network?.isConnected()) {
      if (this.ui) {
        this.ui.showAnnouncement('Server offline! Start the server first.', 'warning');
      }
      audio.playSound('defeat');
      return;
    }

    console.log(`[Game] Starting game with beast: ${this.selectedBeast}`);

    audio.playSound('click');
    this.state = 'matchmaking';
    this.hideMenu();

    if (this.ui) {
      this.ui.showMatchmaking();
    }

    // Send join request
    if (this.network) {
      this.network.sendJoin(this.displayName, this.selectedBeast);
    }
  }

  selectBeast(beastId: string): void {
    this.selectedBeast = beastId;
    audio.playSound('select');
    if (this.ui) {
      this.ui.updateBeastSelection(beastId);
    }
  }

  setDisplayName(name: string): void {
    this.displayName = name;
  }

  setSelectedArena(arenaId: string): void {
    this.selectedArena = arenaId;
  }

  getSelectedArena(): string {
    return this.selectedArena;
  }

  panic(): void {
    if (this.state !== 'playing' || !this.network) return;
    this.network.sendPanic();
    // Play panic sound with random variation
    audio.playSound('panic', Math.random());
    // Show visual panic effect
    if (this.ui) {
      this.ui.showPanicEffect();
    }
  }

  playAgain(): void {
    if (this.ui) {
      this.ui.hideResults();
    }
    this.showMenu();
  }

  cancelMatchmaking(): void {
    if (this.state !== 'matchmaking') return;

    this.state = 'menu';
    if (this.ui) {
      this.ui.hideMatchmaking();
    }
    this.showMenu();
    // Note: Server will handle the disconnection automatically
  }

  getSelectedBeast(): string {
    return this.selectedBeast;
  }

  getState(): GameState {
    return this.state;
  }

  getApp(): Application | null {
    return this.app;
  }

  // ============================================
  // NETWORK CALLBACKS
  // ============================================

  handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'joined':
        this.playerId = message.data.playerId;
        this.sessionId = message.data.sessionId;
        console.log(`[Game] Joined as ${this.displayName} (${this.playerId})`);
        break;

      case 'match_found':
        console.log(`[Game] Match found: ${message.data.matchId} (${message.data.playerCount} players)`);
        if (this.ui) {
          this.ui.updateMatchmakingStatus(
            message.data.playerCount,
            9,
            message.data.countdown > 0 ? `Starting in ${Math.ceil(message.data.countdown / 1000)}...` : 'Waiting for players...'
          );
          if (message.data.countdown <= 3000) {
            this.ui.showMatchFound(message.data.countdown);
            audio.playSound('countdown');
          }
        }
        break;

      case 'match_start':
        // Update playerId to match the one assigned by the server for this match
        this.playerId = message.data.playerId;
        console.log(`[Game] Match starting! Player ID: ${this.playerId}`);
        audio.playSound('match_start');
        audio.startMusic(0); // Battle Theme
        break;

      case 'snapshot':
        this.handleSnapshot(message.data);
        break;

      case 'delta':
        // Handle delta updates (not implemented in this version)
        break;

      case 'death':
        console.log(`[Game] Player died: ${message.data.victimName}`);
        audio.playSound('death');
        if (message.data.victimId === this.playerId) {
          this.state = 'spectating';
          audio.playSound('defeat');
        }
        break;

      case 'announce':
        if (this.ui) {
          this.ui.showAnnouncement(message.data.text, message.data.type);
        }
        // Play zone warning for zone announcements
        if (message.data.type === 'warning') {
          audio.playSound('zone_warning');
        }
        break;

      case 'chaos':
        console.log(`[Game] Chaos event: ${message.data.type}`);
        audio.playSound('chaos_event');
        audio.startMusic(1); // Switch to Chaos Mode music
        break;

      case 'end':
        this.handleMatchEnd(message.data);
        break;

      case 'pong':
        const latency = Date.now() - message.data.clientTimestamp;
        console.log(`[Game] Latency: ${latency}ms`);
        break;

      case 'error':
        console.error(`[Game] Server error: ${message.data.message}`);
        break;
    }
  }

  private handleSnapshot(state: MatchState): void {
    this.matchState = state;

    // Find local player
    this.localPlayer = state.players.find(p => p.id === this.playerId) || null;

    // Transition to playing state if needed
    if (this.state === 'matchmaking' && state.status === 'running') {
      this.state = 'playing';
      if (this.ui) {
        this.ui.hideMatchmaking();
        this.ui.showHUD();
      }
      if (this.input) {
        this.input.enable();
      }
    }

    // Render the state
    if (this.renderer) {
      this.renderer.renderState(state, this.playerId);
    }
  }

  private handleMatchEnd(data: any): void {
    this.state = 'results';

    if (this.input) {
      this.input.disable();
    }

    // Play victory or defeat sound based on placement
    if (data.yourStats?.placement === 1) {
      audio.playSound('victory');
      audio.startMusic(4); // Victory fanfare
    } else {
      audio.playSound('defeat');
    }

    if (this.ui) {
      this.ui.hideHUD();
      this.ui.showResults(data);
    }

    // Clear match state
    this.matchState = null;
    this.localPlayer = null;
  }

  handleDisconnect(): void {
    console.log('[Game] Disconnected from server');
    // Show reconnection UI or return to menu
    this.state = 'menu';
    this.showMenu();
  }

}
