# GameBoard Multiplayer PRD

## Overview
This PRD details the multiplayer gameboard implementation for the casino card game, providing a comprehensive view of the UI structure, code architecture, and game logic integration for both Player 0 and Player 2 perspectives.

## GameBoard Architecture

### Component Structure
The GameBoard component dynamically renders either single-player or multiplayer mode based on the presence of the `sendAction` prop:

```tsx
function GameBoard({ initialState, playerNumber, sendAction, onRestart, onBackToMenu }) {
  if (sendAction) {
    return <MultiplayerGameBoard ... />;
  }
  return <SinglePlayerGameBoard ... />;
}
```

### Multiplayer Layout Overview
```
┌─────────────────────────────────────────────────┐
│ Status Section (Round, Current Player)          │
├─────────────────────────────────────────────────┤
│ Main Game Area                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Table Cards Section (Flex: 3)              │ │
│ │ - Interactive card table                    │ │
│ │ - Drop zones for card actions               │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Opponent Captured Section (Flex: 1)        │ │
│ │ - Shows opponent's captured card stacks     │ │
│ │ - Minimal UI, non-interactive              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
├─────────────────────────────────────────────────┤
│ Player Hands Section                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ Player Hand Area (Flex: 1)                 │ │
│ │ - Current player's hand                     │ │
│ │ - Draggable cards                           │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Player Captured Area                       │ │
│ │ - Current player's captured stacks          │ │
│ │ - Interactive for viewing                   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Player Perspective Management

### Player Number Assignment
- **Player 0**: First player to connect, starts the game
- **Player 1**: Second player to connect
- `playerNumber` prop determines the client's perspective (1-based for display, 0-based for arrays)

### Perspective-Specific Rendering
```tsx
// Determine player indices
const selfPlayerIndex = playerNumber - 1;        // 0 or 1
const opponentPlayerIndex = selfPlayerIndex === 0 ? 1 : 0;

// Turn management
const isMyTurn = gameState.currentPlayer === playerNumber;
```

## Component Breakdown

### StatusSection Component
Displays current game status and turn indicator:

```tsx
const StatusSection = React.memo(({ round, currentPlayer }) => {
  const getPlayerColor = (player: number) => {
    return player === 0 ? '#FF5722' : '#2196F3'; // Orange for P1, Blue for P2
  };

  return (
    <View style={styles.statusSection}>
      <Text style={styles.statusText}>Round: {round}</Text>
      <View style={[styles.playerTurnTag, { backgroundColor: getPlayerColor(currentPlayer) }]}>
        <Text style={styles.playerTurnText}>P{currentPlayer + 1}</Text>
      </View>
    </View>
  );
});
```

### TableCardsSection Component
Central gameplay area handling card interactions:

```tsx
const TableCardsSection = React.memo(({
  tableCards,
  onDropOnCard,
  currentPlayer,
  onCancelStack,
  onConfirmStack,
  onDragStart,
  onDragEnd,
  onDragMove,
  isDragging
}) => (
  <View style={styles.tableCardsSection}>
    <TableCards
      cards={tableCards}
      onDropOnCard={onDropOnCard}
      currentPlayer={currentPlayer}
      onCancelStack={onCancelStack}
      onConfirmStack={onConfirmStack}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      isDragging={isDragging}
    />
  </View>
));
```

### OpponentCapturedSection Component
Shows opponent's captured cards (read-only):

```tsx
const OpponentCapturedSection = React.memo(({
  playerCaptures,
  currentPlayer,
  onDragStart,
  onDragEnd,
  onDragMove
}) => {
  const opponentIndex = 1 - currentPlayer;
  const capturedGroups = playerCaptures[opponentIndex] || [];

  return (
    <View style={styles.opponentCapturedList}>
      <CapturedCards
        captures={capturedGroups}
        playerIndex={opponentIndex}
        isOpponent={true}
        isMinimal={true}
        // Drag handlers are empty for opponent cards
      />
    </View>
  );
});
```

### PlayerHandsSection Component
Displays current player's hand and captured cards:

```tsx
const PlayerHandsSection = React.memo(({
  playerHands,
  currentPlayer,
  onDragStart,
  onDragEnd,
  onDragMove,
  playerCaptures,
  tableCards,
  isMyTurn
}) => {
  const playerIndex = currentPlayer >= 1 ? currentPlayer - 1 : currentPlayer;

  return (
    <View style={styles.playerHandsSection}>
      <View style={styles.playerHandArea}>
        <PlayerHand
          player={playerIndex}
          cards={playerHands[playerIndex]}
          isCurrent={isMyTurn}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragMove={onDragMove}
          currentPlayer={currentPlayer}
          tableCards={tableCards}
        />
      </View>
      <PlayerCapturedSection
        playerCaptures={playerCaptures}
        currentPlayer={playerIndex}
      />
    </View>
  );
});
```

## Drag and Drop Logic

### Turn-Based Drag Validation
```tsx
const handleDragStart = useCallback((card) => {
  console.log(`handleDragStart: isMyTurn=${isMyTurn}`);
  if (!isMyTurn) {
    console.log('Not my turn, ignoring drag start');
    return;
  }
  setDragTurnState({ isMyTurn: true, currentPlayer: gameState.currentPlayer });
  setDraggedCard(card);
}, [isMyTurn, gameState.currentPlayer]);
```

### Drop Handling with Action Determination
```tsx
const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any): boolean => {
  if (!isMyTurn) {
    setErrorModal({
      visible: true,
      title: 'Not Your Turn',
      message: 'Please wait for your turn.'
    });
    return false;
  }

  const result = determineActions(draggedItem, targetInfo, gameState);

  if (result.errorMessage) {
    setErrorModal({
      visible: true,
      title: 'Invalid Move',
      message: result.errorMessage
    });
    return false;
  }

  if (result.actions.length === 1) {
    sendAction(result.actions[0].type, result.actions[0].payload);
    return true;
  } else {
    setModalInfo({
      title: 'Choose Your Action',
      message: 'What would you like to do?',
      actions: result.actions
    });
    return true;
  }
}, [sendAction, isMyTurn, gameState]);
```

## UI Styling Specifications

### Color Scheme
- **Background**: Dark green (#1B5E20) - casino table
- **Status Bar**: Medium green (#2E7D32)
- **Player 0**: Orange (#FF5722)
- **Player 1**: Blue (#2196F3)
- **Text**: White (#FFFFFF)
- **Borders**: Light green (#4CAF50)

### Layout Proportions
- **Status Section**: Fixed height, centered content
- **Main Game Area**: Flex 1, row layout
  - Table Cards: Flex 3
  - Opponent Captures: Flex 1, max width 80px
- **Player Hands**: Row layout with hand and captures

### Responsive Design
- Landscape orientation enforced
- Flexible layouts using flex properties
- Minimum touch targets (44px)
- Readable font sizes for mobile

## Game State Synchronization

### Server State Reception
```tsx
useEffect(() => {
  setGameState(initialState);
}, [initialState]);
```

### Action Sending
```tsx
const sendAction = (type, payload) => {
  // Send to server via socket
  socket.emit('game-action', { type, payload });
};
```

## Error Handling and Modals

### Turn Validation
- Drag operations blocked when not player's turn
- Error modal displays "Not Your Turn" message

### Invalid Move Handling
- Action determination validates moves client-side
- Invalid moves show error modal with specific message

### Action Modal for Multiple Choices
```tsx
<ActionModal
  modalInfo={modalInfo}
  onAction={handleModalAction}
  onCancel={closeModal}
/>
```

## Game Over Screen

### Scoring Display
Shows detailed breakdown for both players:
- Total points
- Card count bonus
- Spades bonus
- Aces bonus
- Special cards (Big/Little Casino)

### Winner Declaration
- Highlights winning player
- Handles tie scenarios

## Performance Optimizations

### Memoization
- All major components wrapped with `React.memo`
- Callback functions use `useCallback`
- State updates are immutable

### Selective Re-renders
- Components only re-render when relevant props change
- Player-specific data filtering prevents unnecessary updates

## Testing Scenarios

### Player 0 Perspective
1. Connect as first player
2. See own hand and opponent's captures
3. Make moves during turn 0, 2, 4...
4. Observe opponent's moves during their turns

### Player 1 Perspective
1. Connect as second player
2. See own hand and opponent's captures
3. Wait for Player 0's first move
4. Make moves during turn 1, 3, 5...

### Edge Cases
1. **Disconnect Handling**: Game continues with remaining player
2. **Turn Synchronization**: UI updates immediately on state change
3. **Drag State Reset**: Clean state on invalid moves
4. **Modal Conflicts**: Only one modal visible at a time

## Dependencies
- React Native components
- Socket.IO for real-time communication
- Custom components: PlayerHand, TableCards, CapturedCards, ActionModal, ErrorModal
- Game logic: determineActions, card operations
- Navigation: SafeAreaView, StatusBar

## Success Criteria
- Both players see identical game state (except private hands)
- Turn-based interaction works flawlessly
- Drag and drop operations are responsive
- Error handling prevents invalid game states
- UI remains performant with complex card layouts
- Game over screen displays accurate scoring
