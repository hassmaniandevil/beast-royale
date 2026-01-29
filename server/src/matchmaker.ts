// ============================================
// BEAST ROYALE - MATCHMAKER
// ============================================

import { v4 as uuidv4 } from 'uuid';
// Override constants for easier testing
const MIN_PLAYERS = 1;  // Was 9 - now start with 1 player
const MAX_PLAYERS = 19;
const MATCH_FILL_TIMEOUT = 5000;  // Was 30000 - now 5 seconds
const MATCH_START_COUNTDOWN = 3000;  // Was 8000 - now 3 seconds
const MATCH_START_COUNTDOWN_SHORT = 2000;
const BOT_FILL_DELAY = 2000;  // Was 20000 - now 2 seconds
const BOT_FILL_THRESHOLD = 1;  // Was 5 - now 1 player
import { ConnectionManager, Connection } from './connections.js';
import { Match } from './match.js';
import { getRandomArena } from '@beast-royale/shared';

interface QueuedPlayer {
  connection: Connection;
  queuedAt: number;
}

interface PendingMatch {
  id: string;
  players: Connection[];
  arena: string;
  createdAt: number;
  countdown: number;
  countdownStarted: boolean;
}

export class Matchmaker {
  private connectionManager: ConnectionManager;
  private queue: QueuedPlayer[] = [];
  private pendingMatches: Map<string, PendingMatch> = new Map();
  private activeMatches: Map<string, Match> = new Map();
  private matchmakingInterval: NodeJS.Timeout;
  private tickInterval: NodeJS.Timeout;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;

    // Run matchmaking logic every 500ms
    this.matchmakingInterval = setInterval(() => this.processQueue(), 500);

    // Tick active matches at 60Hz
    this.tickInterval = setInterval(() => this.tickMatches(), 1000 / 60);

    console.log('[Matchmaker] Initialized');
  }

  addToQueue(connection: Connection): void {
    // Check if already in queue
    if (this.queue.some((q) => q.connection.id === connection.id)) {
      console.log(`[Matchmaker] Player ${connection.displayName} already in queue`);
      return;
    }

    // Check if already in a match
    if (connection.match) {
      console.log(`[Matchmaker] Player ${connection.displayName} already in match`);
      return;
    }

    this.queue.push({
      connection,
      queuedAt: Date.now(),
    });

    console.log(`[Matchmaker] Player ${connection.displayName} added to queue (${this.queue.length} in queue)`);

    // Try to add to existing pending match first
    this.tryAddToPendingMatch(connection);
  }

  removeFromQueue(connection: Connection): void {
    const index = this.queue.findIndex((q) => q.connection.id === connection.id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`[Matchmaker] Player ${connection.displayName} removed from queue`);
    }

    // Also remove from pending matches
    for (const [matchId, pending] of this.pendingMatches) {
      const playerIndex = pending.players.findIndex((p) => p.id === connection.id);
      if (playerIndex !== -1) {
        pending.players.splice(playerIndex, 1);
        console.log(`[Matchmaker] Player removed from pending match ${matchId}`);

        // If pending match is now empty, remove it
        if (pending.players.length === 0) {
          this.pendingMatches.delete(matchId);
        }
      }
    }
  }

  private tryAddToPendingMatch(connection: Connection): boolean {
    for (const [matchId, pending] of this.pendingMatches) {
      if (pending.players.length < MAX_PLAYERS) {
        pending.players.push(connection);

        // Remove from queue
        const queueIndex = this.queue.findIndex((q) => q.connection.id === connection.id);
        if (queueIndex !== -1) {
          this.queue.splice(queueIndex, 1);
        }

        // Notify player they found a match
        this.connectionManager.send(connection, {
          type: 'match_found',
          data: {
            matchId: pending.id,
            arena: pending.arena,
            playerCount: pending.players.length,
            countdown: pending.countdown,
          },
        });

        // Reset countdown if countdown started
        if (pending.countdownStarted) {
          pending.countdown = MATCH_START_COUNTDOWN_SHORT;
        }

        console.log(`[Matchmaker] Player ${connection.displayName} joined pending match ${matchId} (${pending.players.length}/${MAX_PLAYERS})`);

        return true;
      }
    }
    return false;
  }

  private processQueue(): void {
    const now = Date.now();

    // Process pending matches
    for (const [matchId, pending] of this.pendingMatches) {
      // Start countdown immediately when we have at least 1 player
      if (pending.players.length >= MIN_PLAYERS && !pending.countdownStarted) {
        pending.countdownStarted = true;
        pending.countdown = MATCH_START_COUNTDOWN;
        console.log(`[Matchmaker] Match ${matchId} countdown started (${pending.players.length} players)`);
      }

      // Tick countdown
      if (pending.countdownStarted) {
        pending.countdown -= 500;

        // Start match when countdown ends or at max players
        if (pending.countdown <= 0 || pending.players.length >= MAX_PLAYERS) {
          this.startMatch(pending);
          this.pendingMatches.delete(matchId);
        }
      }
    }

    // Create new pending matches from queue
    if (this.queue.length > 0 && this.pendingMatches.size === 0) {
      this.createPendingMatch();
    }

    // If we have players waiting too long, try to create match with bots
    for (const queued of this.queue) {
      if (now - queued.queuedAt > BOT_FILL_DELAY && this.pendingMatches.size === 0) {
        this.createPendingMatch();
        break;
      }
    }
  }

  private createPendingMatch(): void {
    if (this.queue.length === 0) return;

    const matchId = uuidv4();
    const arena = getRandomArena();

    const pending: PendingMatch = {
      id: matchId,
      players: [],
      arena: arena.id,
      createdAt: Date.now(),
      countdown: MATCH_START_COUNTDOWN,
      countdownStarted: false,
    };

    // Add players from queue (up to max)
    while (this.queue.length > 0 && pending.players.length < MAX_PLAYERS) {
      const queued = this.queue.shift()!;
      pending.players.push(queued.connection);

      // Notify player
      this.connectionManager.send(queued.connection, {
        type: 'match_found',
        data: {
          matchId: pending.id,
          arena: pending.arena,
          playerCount: pending.players.length,
          countdown: pending.countdown,
        },
      });
    }

    this.pendingMatches.set(matchId, pending);
    console.log(`[Matchmaker] Created pending match ${matchId} with ${pending.players.length} players`);
  }

  private addBotsToMatch(pending: PendingMatch, count: number): void {
    console.log(`[Matchmaker] Adding ${count} bots to match ${pending.id}`);
    // Bots are handled in the Match class - we just need to tell it how many
    // The pending match just tracks real players
  }

  private startMatch(pending: PendingMatch): void {
    console.log(`[Matchmaker] Starting match ${pending.id} with ${pending.players.length} players`);

    // Add bots to make the game interesting (at least 5 total players)
    const minTotalPlayers = 5;
    const botCount = Math.max(0, minTotalPlayers - pending.players.length);

    // Create the match
    const match = new Match(
      pending.id,
      pending.arena,
      pending.players,
      botCount,
      this.connectionManager,
      (matchId) => this.handleMatchEnd(matchId)
    );

    // Register connections with match and notify them of their player ID
    for (const connection of pending.players) {
      const playerId = match.getPlayerIdForConnection(connection.id);
      if (playerId) {
        this.connectionManager.setPlayerMatch(connection, match, playerId);

        // Send the actual player ID to the client
        this.connectionManager.send(connection, {
          type: 'match_start',
          data: {
            matchId: pending.id,
            playerId: playerId,
            arena: pending.arena,
          },
        });
      }
    }

    this.activeMatches.set(pending.id, match);

    // Start the match
    match.start();
  }

  private handleMatchEnd(matchId: string): void {
    const match = this.activeMatches.get(matchId);
    if (!match) return;

    console.log(`[Matchmaker] Match ${matchId} ended`);

    // Clear player match associations
    for (const connection of match.getConnections()) {
      this.connectionManager.clearPlayerMatch(connection);
    }

    // Remove match
    this.activeMatches.delete(matchId);
  }

  private tickMatches(): void {
    const deltaTime = 1000 / 60;  // ~16.67ms

    for (const match of this.activeMatches.values()) {
      match.tick(deltaTime);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getActiveMatchCount(): number {
    return this.activeMatches.size;
  }

  shutdown(): void {
    clearInterval(this.matchmakingInterval);
    clearInterval(this.tickInterval);

    // End all active matches
    for (const match of this.activeMatches.values()) {
      match.forceEnd();
    }

    console.log('[Matchmaker] Shutdown complete');
  }
}
