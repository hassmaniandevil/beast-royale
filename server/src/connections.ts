// ============================================
// BEAST ROYALE - CONNECTION MANAGER
// ============================================

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  ClientMessage,
  ServerMessage,
  PlayerInput,
  JoinMessage,
} from '@beast-royale/shared';
import { Matchmaker } from './matchmaker.js';
import { Match } from './match.js';

export interface Connection {
  id: string;
  socket: WebSocket;
  playerId: string | null;
  sessionId: string;
  displayName: string;
  beastId: string;
  skinId: string | null;
  match: Match | null;
  lastPing: number;
  latency: number;
}

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private playerToConnection: Map<string, string> = new Map();

  constructor() {
    // Ping all connections periodically
    setInterval(() => this.pingAll(), 5000);
  }

  handleNewConnection(socket: WebSocket, matchmaker: Matchmaker): void {
    const connectionId = uuidv4();
    const sessionId = uuidv4();

    const connection: Connection = {
      id: connectionId,
      socket,
      playerId: null,
      sessionId,
      displayName: this.generateRandomName(),
      beastId: 'rock_tortoise',
      skinId: null,
      match: null,
      lastPing: Date.now(),
      latency: 0,
    };

    this.connections.set(connectionId, connection);

    // Set up message handler
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(connection, message, matchmaker);
      } catch (error) {
        console.error(`[Connection ${connectionId}] Failed to parse message:`, error);
      }
    });

    // Set up close handler
    socket.on('close', () => {
      this.handleDisconnect(connection, matchmaker);
    });

    // Set up error handler
    socket.on('error', (error) => {
      console.error(`[Connection ${connectionId}] Socket error:`, error);
    });

    // Send initial joined message
    this.send(connection, {
      type: 'joined',
      data: {
        playerId: connectionId,
        sessionId,
      },
    });

    console.log(`[Connection ${connectionId}] Connected, session: ${sessionId}`);
  }

  private handleMessage(
    connection: Connection,
    message: ClientMessage,
    matchmaker: Matchmaker
  ): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(connection, message.data, matchmaker);
        break;

      case 'input':
        this.handleInput(connection, message.data);
        break;

      case 'ping':
        this.handlePing(connection, message.data.timestamp);
        break;

      case 'panic':
        this.handlePanic(connection);
        break;

      case 'final_words':
        this.handleFinalWords(connection, message.data.message);
        break;

      case 'select_beast':
        this.handleSelectBeast(connection, message.data.beastId);
        break;

      default:
        console.warn(`[Connection ${connection.id}] Unknown message type`);
    }
  }

  private handleJoin(
    connection: Connection,
    data: JoinMessage,
    matchmaker: Matchmaker
  ): void {
    // Update connection with player info
    connection.displayName = this.sanitizeName(data.displayName);
    connection.beastId = data.beastId;
    connection.skinId = data.skinId;

    console.log(`[Connection ${connection.id}] Player "${connection.displayName}" joining with ${connection.beastId}`);

    // Add to matchmaking queue
    matchmaker.addToQueue(connection);
  }

  private handleInput(connection: Connection, input: PlayerInput): void {
    if (!connection.match || !connection.playerId) {
      return;
    }

    connection.match.handlePlayerInput(connection.playerId, input);
  }

  private handlePing(connection: Connection, clientTimestamp: number): void {
    const serverTimestamp = Date.now();
    connection.lastPing = serverTimestamp;
    connection.latency = serverTimestamp - clientTimestamp;

    this.send(connection, {
      type: 'pong',
      data: {
        clientTimestamp,
        serverTimestamp,
      },
    });
  }

  private handlePanic(connection: Connection): void {
    if (!connection.match || !connection.playerId) {
      return;
    }

    connection.match.handlePanic(connection.playerId);
  }

  private handleFinalWords(connection: Connection, message: string): void {
    if (!connection.match || !connection.playerId) {
      return;
    }

    const sanitized = this.sanitizeMessage(message);
    connection.match.handleFinalWords(connection.playerId, sanitized);
  }

  private handleSelectBeast(connection: Connection, beastId: string): void {
    // Only allow beast selection when not in a match
    if (connection.match) {
      return;
    }

    // Validate beast ID (would check unlocks in real implementation)
    connection.beastId = beastId;
    console.log(`[Connection ${connection.id}] Selected beast: ${beastId}`);
  }

  private handleDisconnect(connection: Connection, matchmaker: Matchmaker): void {
    console.log(`[Connection ${connection.id}] Disconnected`);

    // Remove from queue if queued
    matchmaker.removeFromQueue(connection);

    // Handle match disconnect
    if (connection.match && connection.playerId) {
      connection.match.handlePlayerDisconnect(connection.playerId);
    }

    // Clean up
    if (connection.playerId) {
      this.playerToConnection.delete(connection.playerId);
    }
    this.connections.delete(connection.id);
  }

  private pingAll(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const [id, connection] of this.connections) {
      // Check for timeout
      if (now - connection.lastPing > timeout) {
        console.log(`[Connection ${id}] Timed out`);
        connection.socket.close();
        continue;
      }

      // Send ping (client should respond with ping message)
      if (connection.socket.readyState === WebSocket.OPEN) {
        // The client will send a ping message periodically
      }
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  send(connection: Connection, message: ServerMessage): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  }

  broadcast(connections: Connection[], message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const connection of connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(data);
      }
    }
  }

  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionByPlayerId(playerId: string): Connection | undefined {
    const connectionId = this.playerToConnection.get(playerId);
    if (connectionId) {
      return this.connections.get(connectionId);
    }
    return undefined;
  }

  setPlayerMatch(connection: Connection, match: Match, playerId: string): void {
    connection.match = match;
    connection.playerId = playerId;
    this.playerToConnection.set(playerId, connection.id);
  }

  clearPlayerMatch(connection: Connection): void {
    if (connection.playerId) {
      this.playerToConnection.delete(connection.playerId);
    }
    connection.match = null;
    connection.playerId = null;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  // ============================================
  // UTILITY
  // ============================================

  private generateRandomName(): string {
    const adjectives = [
      'Brave', 'Sneaky', 'Mighty', 'Swift', 'Clever',
      'Fierce', 'Wild', 'Calm', 'Bold', 'Quick',
      'Happy', 'Grumpy', 'Sleepy', 'Dizzy', 'Fuzzy',
    ];
    const nouns = [
      'Beast', 'Warrior', 'Champion', 'Fighter', 'Hunter',
      'Legend', 'Hero', 'Creature', 'Monster', 'Critter',
      'Noodle', 'Potato', 'Nugget', 'Pancake', 'Waffle',
    ];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);

    return `${adj}${noun}${num}`;
  }

  private sanitizeName(name: string): string {
    // Remove special characters, limit length
    let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    if (sanitized.length < 2) {
      sanitized = this.generateRandomName();
    }
    return sanitized;
  }

  private sanitizeMessage(message: string): string {
    // Basic profanity filter would go here
    // For now, just limit length and remove special chars
    return message.replace(/[<>]/g, '').slice(0, 20);
  }
}
