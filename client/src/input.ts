// ============================================
// BEAST ROYALE - INPUT MANAGER
// ============================================

import { Vector2 } from '@beast-royale/shared';
import { Game } from './game';

export interface InputState {
  movement: Vector2;
  attack: boolean;
  ability: boolean;
  panic: boolean;
  interact: boolean;
  aimDirection: Vector2;
  // Advanced combat inputs
  attackHeld: boolean;
  dodge: boolean;
  parry: boolean;
  grab: boolean;
  superActivate: boolean;
  grabEscape: boolean;
}

export class InputManager {
  private game: Game;
  private enabled: boolean = false;
  private isMobile: boolean = false;

  // Input state
  private movement: Vector2 = { x: 0, y: 0 };
  private attack: boolean = false;
  private ability: boolean = false;
  private panic: boolean = false;
  private interact: boolean = false;
  private aimDirection: Vector2 = { x: 1, y: 0 };

  // Advanced combat state
  private attackHeld: boolean = false;
  private dodge: boolean = false;
  private parry: boolean = false;
  private grab: boolean = false;
  private superActivate: boolean = false;
  private grabEscape: boolean = false;

  // Keyboard state
  private keys: Set<string> = new Set();

  // Mouse state for aiming
  private mouseX: number = 0;
  private mouseY: number = 0;
  private playerScreenPos: Vector2 = { x: 0, y: 0 };

  // Touch/joystick state
  private joystickActive: boolean = false;
  private joystickStartX: number = 0;
  private joystickStartY: number = 0;
  private joystickCurrentX: number = 0;
  private joystickCurrentY: number = 0;

  constructor(game: Game) {
    this.game = game;
    this.isMobile = this.detectMobile();

    this.setupKeyboard();

    if (this.isMobile) {
      this.setupMobileControls();
    }
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 800;
  }

  enable(): void {
    this.enabled = true;

    if (this.isMobile) {
      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) {
        mobileControls.classList.add('visible');
      }
    }
  }

  disable(): void {
    this.enabled = false;
    this.reset();

    if (this.isMobile) {
      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) {
        mobileControls.classList.remove('visible');
      }
    }
  }

  reset(): void {
    this.movement = { x: 0, y: 0 };
    this.attack = false;
    this.ability = false;
    this.panic = false;
    this.interact = false;
    this.aimDirection = { x: 1, y: 0 };
    this.attackHeld = false;
    this.dodge = false;
    this.parry = false;
    this.grab = false;
    this.superActivate = false;
    this.grabEscape = false;
    this.keys.clear();
    this.joystickActive = false;
  }

  // ============================================
  // KEYBOARD
  // ============================================

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Mouse tracking for aim direction
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateAimDirection();
    });

    // Right click for parry
    window.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 2) {  // Right click
        this.parry = true;
        e.preventDefault();
      }
    });

    // Disable context menu on right click
    window.addEventListener('contextmenu', (e) => {
      if (this.enabled) {
        e.preventDefault();
      }
    });
  }

  // Called by game to update player screen position for aim calculation
  setPlayerScreenPosition(pos: Vector2): void {
    this.playerScreenPos = pos;
    this.updateAimDirection();
  }

  private updateAimDirection(): void {
    const dx = this.mouseX - this.playerScreenPos.x;
    const dy = this.mouseY - this.playerScreenPos.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 10) {  // Dead zone
      this.aimDirection = { x: dx / len, y: dy / len };
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const key = e.key.toLowerCase();
    this.keys.add(key);

    // Attack (Space or J) - tap for quick attack
    if (key === ' ' || key === 'j') {
      this.attack = true;
      this.attackHeld = true;  // Track held state for charge
      e.preventDefault();
    }

    // Ability (Q or K)
    if (key === 'q' || key === 'k') {
      this.ability = true;
      e.preventDefault();
    }

    // Interact (E) for vents, etc.
    if (key === 'e') {
      this.interact = true;
      e.preventDefault();
    }

    // Panic (P)
    if (key === 'p') {
      this.panic = true;
      this.game.panic();
      e.preventDefault();
    }

    // === ADVANCED COMBAT CONTROLS ===

    // Dodge (Shift or L)
    if (key === 'shift' || key === 'l') {
      this.dodge = true;
      e.preventDefault();
    }

    // Parry/Block (F or Right Mouse handled separately)
    if (key === 'f') {
      this.parry = true;
      e.preventDefault();
    }

    // Grab (G)
    if (key === 'g') {
      this.grab = true;
      e.preventDefault();
    }

    // Super Activate (R)
    if (key === 'r') {
      this.superActivate = true;
      e.preventDefault();
    }

    // Grab Escape (mash any key when grabbed - space works)
    if (key === ' ' || key === 'x') {
      this.grabEscape = true;
    }

    this.updateMovementFromKeys();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.delete(key);

    // Release charge attack when space/j released
    if (key === ' ' || key === 'j') {
      this.attackHeld = false;
    }

    this.updateMovementFromKeys();
  }

  private updateMovementFromKeys(): void {
    let x = 0;
    let y = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }

    this.movement = { x, y };
  }

  // ============================================
  // MOBILE CONTROLS
  // ============================================

  private setupMobileControls(): void {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickStick = document.getElementById('joystick-stick');
    const attackBtn = document.getElementById('attack-btn');
    const abilityBtn = document.getElementById('ability-btn');
    const panicBtn = document.getElementById('panic-btn');

    if (joystickContainer && joystickStick) {
      // Joystick touch handling
      joystickContainer.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystickContainer.getBoundingClientRect();
        this.joystickActive = true;
        this.joystickStartX = rect.left + rect.width / 2;
        this.joystickStartY = rect.top + rect.height / 2;
        this.handleJoystickMove(touch.clientX, touch.clientY, joystickStick);
      });

      joystickContainer.addEventListener('touchmove', (e) => {
        if (!this.enabled || !this.joystickActive) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.handleJoystickMove(touch.clientX, touch.clientY, joystickStick);
      });

      joystickContainer.addEventListener('touchend', () => {
        this.joystickActive = false;
        this.movement = { x: 0, y: 0 };
        joystickStick.style.transform = 'translate(0, 0)';
      });

      joystickContainer.addEventListener('touchcancel', () => {
        this.joystickActive = false;
        this.movement = { x: 0, y: 0 };
        joystickStick.style.transform = 'translate(0, 0)';
      });
    }

    // Button handlers
    if (attackBtn) {
      attackBtn.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.attack = true;
      });
    }

    if (abilityBtn) {
      abilityBtn.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.ability = true;
      });
    }

    if (panicBtn) {
      panicBtn.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.panic = true;
        this.game.panic();
      });
    }
  }

  private handleJoystickMove(touchX: number, touchY: number, stick: HTMLElement): void {
    const maxDistance = 40;

    let deltaX = touchX - this.joystickStartX;
    let deltaY = touchY - this.joystickStartY;

    // Clamp to max distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    // Update visual position
    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Normalize to -1 to 1
    this.movement = {
      x: deltaX / maxDistance,
      y: deltaY / maxDistance,
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getInputState(): InputState {
    return {
      movement: { ...this.movement },
      attack: this.attack,
      ability: this.ability,
      panic: this.panic,
      interact: this.interact,
      aimDirection: { ...this.aimDirection },
      // Advanced combat
      attackHeld: this.attackHeld,
      dodge: this.dodge,
      parry: this.parry,
      grab: this.grab,
      superActivate: this.superActivate,
      grabEscape: this.grabEscape,
    };
  }

  clearOneShot(): void {
    this.attack = false;
    this.ability = false;
    this.panic = false;
    this.interact = false;
    this.dodge = false;
    this.parry = false;
    this.grab = false;
    this.superActivate = false;
    this.grabEscape = false;
  }
}
