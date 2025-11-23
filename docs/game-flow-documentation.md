# Casino Game Drag & Drop Flow Documentation

This document details the step-by-step function calls and logic flow that generate the console log sequence from the casino-style card game. It maps user interactions to the underlying React Native/Expo implementation, explaining how drag & drop mechanics, game state management, and card game rules interact.

## Table of Contents
1. [Game Overview](#game-overview)
2. [Console Log Sequence Analysis](#console-log-sequence-analysis)
3. [Detailed Function Flow](#detailed-function-flow)
4. [Key Components & Files](#key-components--files)
5. [State Management & Logging](#state-management--logging)
6. [Implementation Notes](#implementation-notes)

## Game Overview

This is a multiplayer casino card game (similar to Cassino) implemented in React Native/Expo. The game features:
- Real-time drag & drop card interactions
- Build creation and reinforcement mechanics
- Capture logic with complex rules
- Turn-based multiplayer with state synchronization

The console logs trace a sequence where:
1. Player 1 trails a 3♦ (King of Diamonds)
2. Player 2 builds a 5-sum with 2♠ (2 of Spades) on the table's 3♦

## Console Log Sequence Analysis

```
WARN  `setBehaviorAsync` is not supported with edge-to-edge enabled.
LOG  [DragDrop] No drop zones registered
LOG  🔍 DRAG END: Creating draggedItem with currentPlayer=0 for card 3♦
LOG  🎯 GAME BOARD: handleDragEnd called with dropPosition.handled=false
LOG  🎯 GAME BOARD: Drop not handled, trailing card 3
GROUP    %cMove: Player 1 trailed a 3 color: blue; font-weight: bold;
LOG    Table Cards: ["3♦"]
LOG    Player 1 Hand: ["3♣", "4♣", "5♥", "5♣", "10♥", "10♠", "3♥", "6♦", "8♣"]
LOG    Player 2 Hand: ["7♠", "4♥", "7♦", "5♦", "9♣", "6♠", "6♣", "9♠", "2♥"]
LOG    Player 1 Captures: 0
LOG    Player 2 Captures: 0
LOG    Next turn: Player 2
LOG  [DropZone] Registered new zone loose-stack-3-♦ at (363.1999816894531, 62.93333435058594) size 64x88
LOG  [DragDrop] Checking 1 drop zones for position (389.6229248046875, 93.73645782470703)
LOG  [DragDrop] Zone loose-stack-3-♦: bounds(353.5999816894531,49.733334350585935,83.2x114.4) expanded(313.5999816894531,9.733334350585935,163.2x194.4) inside:true
LOG  [DragDrop] Zone loose-stack-3-♦: distance=14.3 area=9518.08 priority=14.3
LOG  [DragDrop] Selected best zone: loose-stack-3-♦
LOG  🔍 DRAG DEBUG: Creating draggedItem with currentPlayer=1 for card 2♠
LOG  [DropZone] loose-stack-3-♦ received drop attempt
LOG  🎯 DROP ON CARD: hand -> loose {"draggedItem": {"card": {"rank": "2", "suit": "♠", "value": 2}, "player": 1, "source": "hand", "stackId": undefined}, "targetInfo": {"cardId": "3-♦", "rank": "3", "suit": "♦", "type": "loose"}}
LOG  🎯 DROP PROCESSING: Player 2 dropping 2♠ from hand onto loose
LOG  [DropZone] loose-stack-3-♦ handled drop successfully
LOG  [DragDrop] Drop handled successfully
LOG  🔍 DRAG END: Creating draggedItem with currentPlayer=1 for card 2♠
LOG  🎯 GAME BOARD: handleDragEnd called with dropPosition.handled=true
LOG  ✅ GAME BOARD: Drop was handled, skipping trail
LOG  [DropZone] Registered new zone temp-1763919526460 at (363.1999816894531, 66.66667175292969) size 64x88
GROUP    %cMove: Player 2 created a build of 5 color: blue; font-weight: bold;
LOG    Table Cards: ["Build(5)"]
LOG    Player 1 Hand: ["3♣", "4♣", "5♥", "5♣", "10♥", "10♠", "3♥", "6♦", "8♣"]
LOG    Player 2 Hand: ["7♠", "4♥", "7♦", "5♦", "9♣", "6♠", "6♣", "9♠", "2♥"]
LOG    Player 1 Captures: 0
LOG    Player 2 Captures: 0
LOG    Next turn: Player 1
LOG  [DropZone] Registered new zone build-1763919537926-kypj4zh6l at (363.1999816894531, 66.66667175292969) size 64x88
```

## Detailed Function Flow

### Phase 1: Player 1 Trails 3♦

1. **User Interaction**: Player 1 drags 3♦ from hand to empty table area
2. **DraggableCard.onPanResponderRelease()** (`components/DraggableCard.tsx`)
   - Detects drag gesture end
   - Checks registered drop zones (none exist initially)
   - Since no valid drop zones found, sets `dropPosition.handled = false`
   - Creates `draggedItem` object:
     ```typescript
     {
       card: { rank: "3", suit: "♦", value: 3 },
       source: "hand",
       player: 0,
       stackId: undefined
     }
     ```
   - Calls `onDragEnd(draggedItem, dropPosition)`

3. **GameBoard.handleDragEnd()** (`components/GameBoard.tsx`)
   - Receives `dropPosition.handled = false`
   - Checks if `draggedItem.source === 'hand'` and `!dropPosition.handled`
   - Calls `handleTrailCard(draggedItem.card, draggedItem.player, dropPosition)`

4. **useGameActions.handleTrailCard()** (`components/useGameActions.ts`)
   - Validates trail action using `validateTrail()`
   - Updates game state via `handleTrail(gameState, card)`
   - Calls `logGameState("Player 1 trailed a 3", nextPlayer(newState))`

5. **game-logic.handleTrail()** (`game-logic/game-actions.js`)
   - Removes card from player's hand using `removeCardFromHand()`
   - Adds card to `tableCards` array
   - Returns updated state with `nextPlayer()` to advance turn

### Phase 2: Drop Zone Registration

6. **DropZone Registration** (`components/DropZone.js`)
   - After trail completes, table re-renders
   - `DropZone` components register themselves with global drop zone registry
   - Each zone provides:
     - Bounds coordinates for hit detection
     - `onDrop` callback function
     - `stackId` identifier
   - Loose card 3♦ registers as zone "loose-stack-3-♦"

### Phase 3: Player 2 Builds on 3♦ with 2♠

7. **User Interaction**: Player 2 drags 2♠ from hand toward table area
8. **DraggableCard.onPanResponderRelease()** (`components/DraggableCard.tsx`)
   - Detects gesture end at position `(389.622..., 93.736...)`
   - Checks drop zones:
     - Finds "loose-stack-3-♦" zone
     - Calculates priority based on distance and area
     - Selects best zone and calls `bestZone.onDrop(draggedItem)`

9. **Handle Drop Processing** (`components/useGameActions.ts`)
   - `handleDropOnCard(draggedItem, targetInfo)` called:
     ```typescript
     // Logs: "🎯 DROP ON CARD: hand -> loose"
     // Identifies target as "loose" card 3♦
     ```

10. **Build Logic Processing**
    - Since drop is on a loose table card (not a build), enters build drop detection
    - Calculates possible actions for dropping 2♠ on 3♦:
      - Capture: 2 + 3 = 5? No (only if capturing card equals sum)
      - Extended build: No (no opponent's build)
      - New build: 2 + 3 = 5 ✅ (sum build possible)
    - Only one action possible, executes immediately

11. **game-logic.handleBuild()** (`game-logic/game-actions.js`)
    - Validates build using `validateBuild()`
    - Removes both cards (3♦ from table, 2♠ from hand)
    - Creates new build object:
      ```javascript
      {
        buildId: generateBuildId(),
        type: 'build',
        cards: [biggerCard, smallerCard], // Sorted by rank
        value: 5,
        owner: currentPlayer
      }
      ```
    - Updates table cards and hands
    - Calls `logGameState("Player 2 built a 5", nextPlayer(newState))`

12. **Completion**
    - `DraggableCard` continues execution
    - `onDragEnd` called with `dropPosition.handled = true`
    - `GameBoard.handleDragEnd` skips trail since drop was handled
    - New drop zones registered for the created build

## Key Components & Files

### Touch & Gesture Handling
- **`components/DraggableCard.tsx`**: PanResponder-based gesture handling, drop zone detection, priority system
- **`components/DropZone.js`**: Drop zone registration, bounds management, callback handling

### Game Board & UI
- **`components/GameBoard.tsx`**: Main game container, coordinates drag events to game logic
- **`components/PlayerHand.tsx`**: Hand rendering and drag initiation
- **`components/TableCards.tsx`**: Table rendering with drop zones

### Game Logic Layer
- **`components/useGameActions.ts`**: React hook coordinating UI actions to game logic, contains `handleDropOnCard`
- **`game-logic/game-actions.js`**: Core game state mutations (trail, build, capture, etc.)
- **`game-logic/card-operations.js`**: Card manipulation utilities (sorting, removing, calculating sums)

### State Management
- **`game-logic/game-state.js`**: Game state structure, logging via `logGameState()`, turn management

## State Management & Logging

### Game State Structure
```typescript
interface GameState {
  playerHands: Card[][];
  tableCards: (Card | Build | TemporaryStack)[];
  playerCaptures: Card[][][];
  currentPlayer: number;
  round: number;
  // ... additional fields
}
```

### Logging System
- **`logGameState(description, gameState)`**: Formats and logs game state changes
- Uses `console.group()` for collapsible log sections
- Shows hands, table cards, captures, and next player
- Called after each game-altering action (trails, builds, captures)

### Turn Management
- **`nextPlayer(gameState)`**: Advances `currentPlayer` (0 → 1, 1 → 0)
- **`updateGameState(gameState, updates)`**: Immutable state updates
- Always called after successful actions to end turns

## Implementation Notes

### Drop Zone Priority System
Drop zones are selected using a priority algorithm:
- Distance from drop point to zone center
- Area-based priority (smaller zones preferred)
- Formula: `priorityScore = distance + (zoneArea > 10000 ? 1000 : 0)`

### Build Mechanics
- **Sum builds**: Create builds by combining cards totaling a specific value
- **Equal builds**: Multiple cards of same value (reinforces)
- **Build ownership**: Transfers on certain actions
- **Extension rules**: Complex rules about when builds can be extended

### Validation Layer
- **`game-logic/validation.js`**: Rule enforcement for all actions
- Integrate with `cannotCreateBuild`, etc. from UI helpers
- Prevents invalid moves before state mutation

### Async Considerations
- All game state updates are synchronous
- UI re-renders trigger after state changes
- Drop zone registration happens during render cycle

This flow demonstrates a complete drag-drop game interaction cycle, from user gesture through validation, state mutation, logging, and turn advancement.
