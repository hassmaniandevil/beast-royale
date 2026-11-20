# HANDOVER.md — Beast Royale
> Status: IN PROGRESS

## What This Product Is
Beast Royale is a web-based absurd party battle royale game where 9-19 players pick from unique creature characters and fight in 2-4 minute rounds. Last beast standing wins. No install required -- it plays in the browser on mobile and desktop.

## Tech Stack
- **Framework:** Node.js + WebSocket (ws) server, Vite + Pixi.js client
- **Language:** TypeScript 5.3
- **Database:** None (stateless game server)
- **Auth:** None
- **Payments:** None
- **Hosting:** Railway (server via Dockerfile), client served via Vite
- **Other:** npm workspaces monorepo, procedural audio system, server-authoritative architecture (20 Hz network tick, 60 Hz physics)

## What Is Built and Working
- Full monorepo scaffold (shared/server/client workspaces)
- Server-authoritative game loop with WebSocket real-time communication
- Matchmaking system
- Match game logic with physics
- 5 starter beasts with unique abilities (Rock Tortoise, Honk Goose, Stretchy Ferret, Boom Frog, Punch Crab)
- 30 total beasts with unique creature-specific graphics and icons
- Arena definitions and chaos event system
- Pixi.js WebGL rendering with client prediction and server reconciliation
- Input handling (keyboard WASD/arrows + mobile virtual joystick)
- Procedural audio system with music and sound effects
- Panic visual feedback
- Railway deployment with Dockerfile
- Mobile and desktop support

## What Is Unfinished
- Achievement beasts unlock system (10 unlockable mentioned in README)
- Premium beasts purchase flow (5 purchasable mentioned in README)
- Persistent accounts / player profiles
- Leaderboards and stats tracking
- Production client hosting/deployment (only server on Railway)
- Advanced combat mechanics (session notes mention making fights "20x more interesting")
- Among Us-style multiplayer features (mentioned in session notes)

## Known Bugs
- None identified from commit history

## Project Structure
```
beast-royale/
  client/
    src/
      audio.ts        # Procedural audio system
      beast-icons.ts  # Creature icons for selection
      effects.ts      # Visual effects
      game.ts         # Main game class
      input.ts        # Input handling (keyboard + touch)
      main.ts         # Entry point
      network.ts      # WebSocket client
      renderer.ts     # Pixi.js rendering
      ui.ts           # UI management
  server/
    src/
      connections.ts  # WebSocket management
      index.ts        # Server entry point
      match.ts        # Match game logic
      matchmaker.ts   # Matchmaking system
  shared/
    src/
      arenas.ts       # Arena definitions
      beasts.ts       # Beast definitions (30 creatures)
      chaos.ts        # Chaos event system
      constants.ts    # Game constants
      physics.ts      # Physics utilities
      types.ts        # TypeScript types
  Dockerfile          # Railway deployment
  railway.json        # Railway config
```

## How to Run It
```bash
# Install dependencies
npm install

# Build shared module (required first time)
cd shared && npm run build && cd ..

# Run both server and client
npm run dev

# Or run separately:
npm run dev:server   # ws://localhost:3001
npm run dev:client   # http://localhost:5173
```

**Endpoints:** Client at `http://localhost:5173`, Server at `ws://localhost:3001`, Health check at `http://localhost:3001/health`, Stats at `http://localhost:3001/stats`

## Next Steps (In Order)
1. Enhance combat mechanics with more depth, animations, and level layers
2. Add persistent player accounts and profiles
3. Implement achievement beast unlock system
4. Build leaderboards and stats tracking
5. Set up client production deployment (Vercel or similar)
6. Add premium beasts purchase flow
7. Polish mobile experience and add more chaos events

## Key Documentation
- `README.md` — full project overview, controls, beast list, architecture
