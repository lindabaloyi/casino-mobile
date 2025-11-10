# Matchmaking System Refactor PRD

## Overview
This PRD outlines the refactoring of the multiplayer matchmaking system to implement a proper waiting queue, addressing issues with immediate game starts, stale connections, and race conditions during player connections/disconnections.

## Current Issues
- No waiting queue: Games start immediately when 2 players connect
- Stale connections: Disconnected players can cause matchmaking problems
- Race conditions: Multiple players connecting simultaneously can lead to inconsistent state
- No proper player readiness check before game initialization

## Proposed Solution
Implement a waiting queue system that collects players until exactly 2 are ready, then starts the game and clears the queue.

## Requirements

### Functional Requirements
- Players connect and join a waiting queue
- Game starts only when exactly 2 players are in the queue
- Proper player number assignment (0 or 1) upon game start
- Clean disconnect handling that removes players from queue
- Prevention of game start with stale or disconnected players

### Technical Requirements
- Replace immediate player array with waiting queue
- Emit 'game-start' event only when game initializes
- Clear waiting queue after game start
- Maintain existing game action handling logic
- Ensure TypeScript compatibility

## Implementation Plan

### Code Changes

#### 1. Update Server Variables
```typescript
// Replace
let players = [];
let gameState = null;

// With
let waitingPlayers: Socket[] = [];
let gameState: GameState | null = null;
```

#### 2. Modify Connection Handler
```typescript
io.on('connection', (socket: Socket) => {
  console.log(`[SERVER] A user connected: ${socket.id}`);
  waitingPlayers.push(socket);
  console.log(`[SERVER] Total players waiting: ${waitingPlayers.length}`);

  // If two players are waiting, start the game
  if (waitingPlayers.length === 2) {
    console.log('[SERVER] Two players found. Starting game...');
    gameState = initializeGame();

    // Assign player numbers and emit game-start event
    waitingPlayers.forEach((playerSocket, index) => {
      const playerNumber = index; // 0-indexed
      console.log(`[SERVER] Emitting game-start to ${playerSocket.id} as Player ${playerNumber}`);
      playerSocket.emit('game-start', { gameState, playerNumber });
    });

    // Clear the waiting queue
    waitingPlayers = [];
  }
});
```

#### 3. Update Disconnect Handler
```typescript
socket.on('disconnect', () => {
  console.log(`[SERVER] A user disconnected: ${socket.id}`);
  // Remove the player from the waiting queue if they were in it
  waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
  console.log(`[SERVER] Total players waiting after disconnect: ${waitingPlayers.length}`);
});
```

#### 4. Update Game Action Handler
Modify the game action handling to work with the new system:
- Remove player number emission on connection
- Ensure game actions only process when gameState exists
- Maintain existing action validation and processing logic

## Benefits
- **Reliable Matchmaking:** Ensures exactly 2 ready players before starting
- **Clean State Management:** No stale connections in active games
- **Race Condition Prevention:** Queue system handles simultaneous connections
- **Better User Experience:** Players wait properly instead of immediate starts

## Testing Scenarios
1. Player A connects → waits
2. Player B connects → game starts, both get game-start event
3. Player A disconnects before Player B connects → Player B waits
4. Two players connect simultaneously → game starts properly
5. Player disconnects during waiting → removed from queue

## Migration Notes
- Existing game action handling remains unchanged
- Client-side code needs no modifications
- Server restart required for new logic to take effect
- Monitor logs for waiting queue status during initial deployment

## Dependencies
- Socket.IO server
- Game state initialization logic
- Existing game action handlers

## Success Criteria
- Games only start with exactly 2 connected players
- No games start with disconnected players
- Waiting queue accurately reflects active connections
- All existing game functionality continues to work
- Improved matchmaking reliability in multiplayer sessions
