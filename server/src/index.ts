// ============================================
// BEAST ROYALE - GAME SERVER
// ============================================

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Matchmaker } from './matchmaker.js';
import { ConnectionManager } from './connections.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  // Stats endpoint
  if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connections: connectionManager.getConnectionCount(),
      matches: matchmaker.getActiveMatchCount(),
      playersInQueue: matchmaker.getQueueSize(),
      timestamp: Date.now(),
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Initialize managers
const connectionManager = new ConnectionManager();
const matchmaker = new Matchmaker(connectionManager);

// Handle new connections
wss.on('connection', (socket, request) => {
  const clientIp = request.socket.remoteAddress || 'unknown';
  console.log(`[Server] New connection from ${clientIp}`);

  connectionManager.handleNewConnection(socket, matchmaker);
});

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════╗
║         BEAST ROYALE SERVER              ║
║                                          ║
║  Status: RUNNING                         ║
║  Port: ${PORT}                              ║
║  Host: ${HOST}                           ║
║                                          ║
║  WebSocket: ws://${HOST}:${PORT}            ║
║  Health: http://${HOST}:${PORT}/health      ║
║  Stats: http://${HOST}:${PORT}/stats        ║
╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  matchmaker.shutdown();
  wss.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  matchmaker.shutdown();
  wss.close();
  httpServer.close();
  process.exit(0);
});
