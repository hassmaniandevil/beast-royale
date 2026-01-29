// ============================================
// BEAST ROYALE - NETWORK MANAGER
// ============================================

import { ClientMessage, ServerMessage, PlayerInput } from '@beast-royale/shared';
import { Game } from './game';

export class NetworkManager {
  private game: Game;
  private socket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private serverUrl: string;

  constructor(game: Game) {
    this.game = game;

    // Determine server URL
    const host = window.location.hostname;

    // Use localhost for development, Railway server for production
    if (host === 'localhost' || host === '127.0.0.1') {
      this.serverUrl = `ws://${host}:3001`;
    } else {
      // Production server on Railway
      this.serverUrl = 'wss://beast-royale-server-production.up.railway.app';
    }

    console.log(`[Network] Server URL: ${this.serverUrl}`);
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      console.log('[Network] Connecting to server...');

      try {
        this.socket = new WebSocket(this.serverUrl);
      } catch (error) {
        console.error('[Network] Failed to create WebSocket:', error);
        resolve(); // Don't block, continue without connection
        return;
      }

      this.socket.onopen = () => {
        console.log('[Network] Connected');
        this.reconnectAttempts = 0;
        this.startPing();
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.game.handleMessage(message);
        } catch (error) {
          console.error('[Network] Failed to parse message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`[Network] Disconnected (code: ${event.code})`);
        this.stopPing();
        // Don't auto-reconnect on initial failure
        if (this.reconnectAttempts > 0) {
          this.handleDisconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.warn('[Network] Socket error - server may be offline');
      };

      // Timeout for initial connection - resolve anyway to not block UI
      setTimeout(() => {
        if (this.socket?.readyState !== WebSocket.OPEN) {
          console.warn('[Network] Connection timeout - continuing without server');
          resolve();
        }
      }, 3000);
    });
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Network] Reconnecting (attempt ${this.reconnectAttempts})...`);

      setTimeout(() => {
        this.connect().catch(() => {
          // Will retry automatically
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log('[Network] Max reconnect attempts reached');
      this.game.handleDisconnect();
    }
  }

  private startPing(): void {
    // Send ping every 5 seconds
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', data: { timestamp: Date.now() } });
    }, 5000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ============================================
  // SEND METHODS
  // ============================================

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  sendJoin(displayName: string, beastId: string): void {
    this.send({
      type: 'join',
      data: {
        displayName,
        beastId,
        skinId: null,
        sessionToken: null,
      },
    });
  }

  sendInput(input: PlayerInput): void {
    this.send({
      type: 'input',
      data: input,
    });
  }

  sendPanic(): void {
    this.send({ type: 'panic', data: {} });
  }

  sendFinalWords(message: string): void {
    this.send({ type: 'final_words', data: { message } });
  }

  sendSelectBeast(beastId: string): void {
    this.send({ type: 'select_beast', data: { beastId } });
  }

  // ============================================
  // UTILITY
  // ============================================

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.stopPing();
    this.socket?.close();
  }
}
