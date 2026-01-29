# Beast Royale

A web-based absurd party battle royale game. Last beast standing wins!

## Features

- **9-19 players** per match
- **2-4 minute** rounds
- **5 starter beasts** with unique abilities
- **Chaos events** that shake up gameplay
- **Mobile & Desktop** support
- **No install required** - plays in browser

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone or navigate to the project
cd beast-royale

# Install all dependencies
npm install

# Build shared module (required first time)
cd shared && npm run build && cd ..
```

### Development

Run both server and client in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Client
npm run dev:client
```

### Access

- **Client**: http://localhost:5173
- **Server**: ws://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Stats**: http://localhost:3001/stats

## Project Structure

```
beast-royale/
├── shared/           # Shared game logic (types, constants, physics)
│   └── src/
│       ├── types.ts      # TypeScript types
│       ├── constants.ts  # Game constants
│       ├── beasts.ts     # Beast definitions
│       ├── arenas.ts     # Arena definitions
│       ├── physics.ts    # Physics utilities
│       └── chaos.ts      # Chaos event system
├── server/           # Game server (Node.js + WebSocket)
│   └── src/
│       ├── index.ts      # Server entry point
│       ├── matchmaker.ts # Matchmaking system
│       ├── match.ts      # Match game logic
│       └── connections.ts # WebSocket management
├── client/           # Web client (Vite + Pixi.js)
│   └── src/
│       ├── main.ts       # Entry point
│       ├── game.ts       # Main game class
│       ├── renderer.ts   # Pixi.js rendering
│       ├── input.ts      # Input handling
│       ├── network.ts    # WebSocket client
│       └── ui.ts         # UI management
└── README.md
```

## Controls

### Desktop

| Action | Key |
|--------|-----|
| Move | WASD / Arrow Keys |
| Attack | Space / J |
| Ability | Q / E / K |
| Panic | P / Shift |

### Mobile

- **Left side**: Virtual joystick for movement
- **Right side**: Attack and Ability buttons
- **Top left**: Panic button

## Beasts

### Starter Beasts

1. **Rock Tortoise** - Heavy, slow, high knockback resistance
2. **Honk Goose** - Fast, annoying, cone knockback ability
3. **Stretchy Ferret** - Fastest, line attack ability
4. **Boom Frog** - Explosive belly flop ability
5. **Punch Crab** - Powerful punches, can only strafe

### Achievement Beasts (10 more unlockable)
### Premium Beasts (5 more purchasable)

## Architecture

### Server

- **Node.js** with **WebSocket** (ws library)
- **Server-authoritative** - all game logic runs on server
- **20 Hz** network tick rate
- **60 Hz** internal physics

### Client

- **Pixi.js** for WebGL rendering
- **Vite** for fast development
- Client prediction with server reconciliation
- Touch and keyboard support

### Networking

- WebSocket-based real-time communication
- Full state snapshots (optimized for simplicity)
- Input buffering and sequence numbers

## License

MIT
