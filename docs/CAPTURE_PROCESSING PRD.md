# Capture Processing PRD

## Overview
This PRD details the complete capture processing system in the Casino card game, covering what happens after a capture action is triggered, how captured cards are organized and positioned, and how they are placed in the player's capture pile for scoring.

## Capture Action Flow

### 1. Capture Initiation
```tsx
// Capture triggered by dropping matching cards
const result = determineActions(draggedItem, targetInfo, gameState);
if (result.actions[0].type === 'capture') {
  // Execute capture
  sendAction('capture', result.actions[0].payload);
}
```

### 2. Server-Side Processing
```javascript
// server/server.js - game-action handler
case 'capture':
  newGameState = handleCapture(gameState, action.payload.draggedItem, action.payload.selectedTableCards);
  break;
```

### 3. Capture Handler Execution
```javascript
// game-logic/game-actions.js - handleCapture
export const handleCapture = (gameState, draggedItem, selectedTableCards, opponentCard = null) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;
  const { card: selectedCard, source } = draggedItem;

  // 1. Remove capturing card from source
  let newPlayerHands = playerHands;
  let newTableCards = tableCards;
  let actualCardUsed = selectedCard;

  if (source === 'hand') {
    const removalResult = removeCardFromHand(playerHands, currentPlayer, selectedCard);
    newPlayerHands = removalResult.updatedHands;
    actualCardUsed = removalResult.cardRemoved;
  }

  // 2. Remove captured cards from table
  const finalTableCards = removeCardsFromTable(newTableCards, selectedTableCards);

  // 3. Create capture group with proper ordering
  const capturedCards = flattenCapturedCards(selectedTableCards);
  const captureGroup = createCaptureStack(actualCardUsed, capturedCards, opponentCard);

  // 4. Add to player's captures
  const newPlayerCaptures = [...playerCaptures];
  newPlayerCaptures[currentPlayer] = [...newPlayerCaptures[currentPlayer], captureGroup];

  // 5. Update game state and advance turn
  return nextPlayer(updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: newPlayerCaptures,
    lastCapturer: currentPlayer
  }));
};
```

## Capture Pile Data Structure

### Player Captures Array
```javascript
// Game state structure
const gameState = {
  playerCaptures: [
    // Player 0's capture groups
    [
      [{rank: '9', suit: '♥'}, {rank: '9', suit: '♣'}],  // First capture group
      [{rank: '7', suit: '♦'}, {rank: '7', suit: '♠'}]   // Second capture group
    ],
    // Player 1's capture groups
    [
      [{rank: '8', suit: '♥'}, {rank: '8', suit: '♦'}]  // First capture group
    ]
  ]
};
```

### Capture Group Organization
- **Multiple Groups**: Each player can have multiple capture groups
- **Chronological Order**: Groups added in order of capture
- **Card Ordering**: Cards within groups follow capture rules

## Capture Stack Creation Rules

### Standard Capture Ordering
```javascript
// game-logic/card-operations.js - createCaptureStack
export const createCaptureStack = (capturingCard, capturedCards, opponentCard = null) => {
  if (opponentCard) {
    // When opponent's card is involved: [table cards, opponent's card, capturing card]
    const tableCards = capturedCards.filter(card => !card.sourceType || card.sourceType !== 'opponent_capture');
    return [...tableCards, opponentCard, capturingCard];
  } else {
    // Standard capture: [captured cards, capturing card]
    return [...capturedCards, capturingCard];
  }
};
```

### Capture Ordering Examples
```javascript
// Example 1: Simple capture (9♥ captures 9♣)
createCaptureStack(
  {rank: '9', suit: '♥'},  // capturing card
  [{rank: '9', suit: '♣'}], // captured cards
  null                      // no opponent card
);
// Result: [{rank: '9', suit: '♣'}, {rank: '9', suit: '♥'}]

// Example 2: Multiple cards (7♥ captures 5♠ + 2♦)
createCaptureStack(
  {rank: '7', suit: '♥'},  // capturing card
  [{rank: '5', suit: '♠'}, {rank: '2', suit: '♦'}], // captured cards
  null
);
// Result: [{rank: '5', suit: '♠'}, {rank: '2', suit: '♦'}, {rank: '7', suit: '♥'}]
```

## Capture Pile Positioning and Display

### CapturedCards Component Structure
```tsx
// components/CapturedCards.tsx
const CapturedCards = ({ 
  captures,     // Array of capture groups
  playerIndex,  // Which player's captures
  hasCards,     // Whether there are any captures
  topCard,      // Top card for display
  isOpponent,   // Whether these are opponent's captures
  isMinimal     // Compact display mode
}) => {
  const allCapturedCards = captures.flat(); // Flatten all groups

  return (
    <View style={isMinimal ? styles.minimalCaptures : styles.captures}>
      {hasCards ? (
        <CardStack 
          cards={allCapturedCards} 
          isBuild={true}              // Display as stack
          stackId={`captures-${playerIndex}`}
          draggable={isOpponent}      // Only opponent cards draggable
          dragSource="captured"
        />
      ) : (
        <View style={isMinimal ? styles.emptyMinimalCaptures : styles.emptyCaptures} />
      )}
    </View>
  );
};
```

### Visual Positioning Rules
```tsx
const styles = StyleSheet.create({
  captures: {
    alignItems: 'center',
    padding: 4,
  },
  minimalCaptures: {
    alignItems: 'center',
    padding: 2,
  },
  emptyCaptures: {
    width: 50,
    height: 70,
    borderWidth: 2,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 8,
    margin: 2,
  },
  emptyMinimalCaptures: {
    width: 40,
    height: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 6,
    margin: 2,
  },
});
```

### CardStack Display Logic
```tsx
// components/CardStack.tsx - For capture piles
const CardStack = ({ cards, isBuild, stackId }) => {
  // Show only the top card visually
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  return (
    <View style={styles.stackContainer}>
      {/* Top card display */}
      <Card card={topCard} size="normal" />

      {/* Build value indicator (for captures, shows total cards) */}
      {isBuild && cardCount > 1 && (
        <View style={styles.cardCountContainer}>
          <Text style={styles.cardCountText}>{cardCount}</Text>
        </View>
      )}
    </View>
  );
};
```

## Capture Pile Management

### Adding New Capture Groups
```javascript
// When a capture occurs
const newPlayerCaptures = [...playerCaptures];
newPlayerCaptures[currentPlayer] = [
  ...newPlayerCaptures[currentPlayer],  // Existing groups
  captureGroup                          // New capture group
];
```

### Capture Pile State Updates
```javascript
// Client receives updated game state
useEffect(() => {
  setGameState(initialState);
  // CapturedCards components automatically re-render with new captures
}, [initialState]);
```

### Opponent Capture Access
```tsx
// Opponent's captures are visible but protected
const CapturedCards = ({ isOpponent, captures, onCardPress }) => {
  return (
    <TouchableOpacity 
      onPress={() => isOpponent && onCardPress(topCard, 'opponentCapture')}
      disabled={!isOpponent}
    >
      {/* Display logic */}
    </TouchableOpacity>
  );
};
```

## Scoring and Capture Pile Analysis

### Capture Pile Flattening for Scoring
```javascript
// game-logic/game-actions.js - calculateScores
const calculateScores = (playerCaptures) => {
  const allPlayerCards = playerCaptures.map(captures => captures.flat());
  
  // Count cards for "Most Cards" scoring
  const cardCounts = allPlayerCards.map(cards => cards.length);
  
  // Count spades for "Most Spades" scoring
  const spadeCounts = allPlayerCards.map(cards => 
    cards.filter(c => c.suit === '♠').length
  );
  
  // Count special cards
  const specialCards = allPlayerCards.map(cards => ({
    aces: cards.filter(c => c.rank === 'A').length,
    bigCasino: cards.filter(c => c.rank === '10' && c.suit === '♦').length,
    littleCasino: cards.filter(c => c.rank === '2' && c.suit === '♠').length
  }));
  
  // Calculate final scores
  // ...
};
```

### Capture Group Preservation
- **Individual Groups Maintained**: Each capture remains as separate group for scoring
- **Order Preserved**: Groups stay in capture order
- **Card Relationships**: Cards within groups maintain their capture relationships

## Complex Capture Scenarios

### Multi-Card Captures
```javascript
// Capturing multiple cards with one capturing card
const selectedTableCards = [
  {rank: '5', suit: '♠'},
  {rank: '2', suit: '♦'}
];
const capturingCard = {rank: '7', suit: '♥'};

// Result: [5♠, 2♦, 7♥] - captured cards first, capturing card last
```

### Build Captures
```javascript
// Capturing an entire build
const selectedTableCards = [{
  type: 'build',
  buildId: 'build-123',
  cards: [{rank: '6', suit: '♥'}, {rank: '6', suit: '♦'}],
  value: 6
}];
const capturingCard = {rank: '6', suit: '♣'};

// Result: [6♥, 6♦, 6♣] - build cards first, capturing card last
```

### Opponent Card Integration
```javascript
// Using opponent's captured card in capture
const opponentCard = {rank: '8', suit: '♠'};
const capturedCards = [{rank: '8', suit: '♥'}];
const capturingCard = {rank: '8', suit: '♦'};

// Result: [8♥, 8♠, 8♦] - table card, opponent card, capturing card
```

## Capture Pile UI States

### Empty Capture Pile
```tsx
// No captures yet
const captures = []; // Empty array
const hasCards = false;

// Displays empty dotted border box
<View style={styles.emptyCaptures} />
```

### Single Capture Group
```tsx
// One capture group with 2 cards
const captures = [
  [{rank: '9', suit: '♥'}, {rank: '9', suit: '♣'}]
];
const allCapturedCards = [{rank: '9', suit: '♥'}, {rank: '9', suit: '♣'}];

// Displays stack with 9♣ on top, count indicator shows "2"
```

### Multiple Capture Groups
```tsx
// Two separate capture groups
const captures = [
  [{rank: '9', suit: '♥'}, {rank: '9', suit: '♣'}],  // First capture
  [{rank: '7', suit: '♦'}, {rank: '7', suit: '♠'}]   // Second capture
];
const allCapturedCards = [
  {rank: '9', suit: '♥'}, {rank: '9', suit: '♣'},
  {rank: '7', suit: '♦'}, {rank: '7', suit: '♠'}
];

// Displays stack with 7♠ on top, count shows "4"
```

## Performance Optimizations

### Capture Pile Memoization
```tsx
const CapturedCards = memo(({ captures, playerIndex, hasCards }) => {
  // Only re-renders when captures change
  const allCapturedCards = useMemo(() => captures.flat(), [captures]);
  
  return (
    <CardStack 
      cards={allCapturedCards}
      stackId={`captures-${playerIndex}`}
    />
  );
});
```

### Efficient State Updates
```tsx
// Only update captures that changed
const newPlayerCaptures = [...playerCaptures];
newPlayerCaptures[currentPlayer] = [...newPlayerCaptures[currentPlayer], captureGroup];

// Avoid unnecessary re-renders of other players' captures
```

## Error Handling and Validation

### Invalid Capture Attempts
```tsx
const validateCapture = (draggedItem, selectedTableCards, gameState) => {
  // Check if cards can actually capture each other
  const capturingValue = rankValue(draggedItem.card.rank);
  const capturedValues = selectedTableCards.map(card => {
    if (card.type === 'build') return card.value;
    return rankValue(card.rank);
  });
  
  const canCapture = capturedValues.every(value => value === capturingValue);
  
  if (!canCapture) {
    return { valid: false, message: "Selected cards cannot be captured with this card" };
  }
  
  return { valid: true };
};
```

### Capture Pile Integrity
```tsx
// Ensure capture piles don't get corrupted
const validateCapturePiles = (playerCaptures) => {
  playerCaptures.forEach((playerGroups, playerIndex) => {
    playerGroups.forEach((group, groupIndex) => {
      if (!Array.isArray(group) || group.length === 0) {
        console.error(`Invalid capture group for player ${playerIndex}, group ${groupIndex}`);
      }
    });
  });
};
```

## Testing Scenarios

### Basic Capture Processing
1. **Simple Capture**: 9♥ on 9♣ → Verify capture group created correctly
2. **Multi-Card Capture**: 7♥ captures 5♠ + 2♦ → Verify ordering
3. **Build Capture**: 6♣ captures build of 6 → Verify build dissolution

### Capture Pile Display
1. **Empty Pile**: No captures → Empty dotted box displays
2. **Single Group**: One capture → Stack shows with count
3. **Multiple Groups**: Several captures → Flattened stack with total count

### Scoring Integration
1. **Card Counting**: Verify all captured cards counted for "Most Cards"
2. **Spade Counting**: Verify spade cards counted for "Most Spades"
3. **Special Cards**: Verify Aces, Big/Little Casino counted correctly

## Benefits

### Game Integrity
- **Accurate Scoring**: Proper capture group organization ensures correct point calculation
- **Rule Enforcement**: Capture ordering rules maintained for game validity
- **State Consistency**: Server and client capture piles stay synchronized

### User Experience
- **Visual Feedback**: Clear display of capture progress
- **Strategic Insight**: Players can see opponent's capture patterns
- **Performance**: Efficient rendering of capture piles

### Technical Advantages
- **Modular Design**: Capture processing separated from display logic
- **Scalable Architecture**: Easy to add new capture types
- **Memory Efficient**: Lazy loading and memoization prevent unnecessary re-renders

This capture processing system ensures that every aspect of card capturing - from the initial action through final positioning in capture piles - is handled correctly, maintaining both game rules and user experience standards.
