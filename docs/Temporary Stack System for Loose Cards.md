# Implementation Guide: Temporary Stack System for Loose Cards

## Overview

This guide provides step-by-step instructions for implementing the temporary stack system where players can drag loose cards on the table to create temporary stacks, then use hand cards to capture the entire stack. This feature enables complex capture combinations and strategic card management.

## Prerequisites

- Existing drag-and-drop system for cards
- Game state management with table cards, player hands, and captures
- Card validation and game action handlers
- UI components for displaying cards and stacks

## Step 1: Enable Loose Card Draggability

### 1.1 Update Card Components

Ensure all loose cards on the table are draggable:

```typescript
// In TableCards.tsx or equivalent
const LooseCard = ({ card, onDragStart, onDragEnd }) => {
  return (
    <DraggableCard
      card={card}
      dragSource="table"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={styles.looseCard}
    />
  );
};
```

### 1.2 Add Drag Handlers

Implement drag handlers in the main game component:

```typescript
const handleCardDragStart = (card, position) => {
  setDraggedItem({
    card,
    source: 'table',
    position
  });
};

const handleCardDragEnd = (targetInfo) => {
  if (targetInfo.type === 'loose') {
    // Handle loose card to loose card drop
    const newState = handleTableCardDrop(draggedItem, targetInfo, gameState, showError);
    updateGameState(newState);
  }
};
```

## Step 2: Implement Temporary Stack Creation

### 2.1 Create Stack Data Structure

Add the temporary stack type to your game types:

```typescript
// In types/gameTypes.ts
export type TemporaryStack = {
  stackId: string;
  type: 'temporary_stack';
  cards: Card[];
  owner: number;
};
```

### 2.2 Implement Stack Creation Logic

Create the handler for creating temporary stacks from loose cards:

```typescript
// In game-actions.js
export const handleCreateTemporaryCaptureStack = (gameState, draggedCard, targetCard) => {
  const { tableCards, currentPlayer } = gameState;

  // Validate only loose cards can be used
  if (draggedCard.source !== 'table' || targetCard.source !== 'table') {
    return { error: 'Only loose cards can create temporary stacks' };
  }

  // Check if player already has a temporary stack
  const existingStack = tableCards.find(
    card => card.type === 'temporary_stack' && card.owner === currentPlayer
  );

  if (existingStack) {
    return handleAddToTemporaryCaptureStack(gameState, draggedCard, existingStack);
  }

  // Create new stack with proper ordering (smaller cards on top)
  const handValue = rankValue(draggedCard.rank);
  const tableValue = rankValue(targetCard.rank);
  const orderedCards = handValue < tableValue
    ? [{ ...targetCard, source: 'table' }, { ...draggedCard, source: 'table' }]
    : [{ ...draggedCard, source: 'table' }, { ...targetCard, source: 'table' }];

  const newStack = {
    stackId: `temp_capture_${Date.now()}`,
    type: 'temporary_stack',
    cards: orderedCards,
    owner: currentPlayer,
    totalValue: handValue + tableValue
  };

  // Remove both cards from table and add the stack
  const newTableCards = tableCards
    .filter(c => c !== draggedCard && c !== targetCard)
    .concat(newStack);

  return updateGameState(gameState, { tableCards: newTableCards });
};
```

### 2.3 Add Stack Building Logic

Allow adding more loose cards to existing stacks:

```typescript
export const handleAddToTemporaryCaptureStack = (gameState, draggedCard, targetStack) => {
  // Validate card is loose
  if (draggedCard.source !== 'table') {
    return { error: 'Only loose cards can be added to temporary stacks' };
  }

  // Check stack size limit (optional, default 5)
  if (targetStack.cards.length >= MAX_STACK_SIZE) {
    return { error: 'Stack is full' };
  }

  const updatedStack = {
    ...targetStack,
    cards: [...targetStack.cards, { ...draggedCard, source: 'table' }],
    totalValue: targetStack.totalValue + rankValue(draggedCard.rank)
  };

  // Update table: replace old stack with updated one, remove dragged card
  const newTableCards = gameState.tableCards.map(card =>
    card.stackId === targetStack.stackId ? updatedStack : card
  ).filter(c => c !== draggedCard);

  return updateGameState(gameState, { tableCards: newTableCards });
};
```

## Step 3: Implement Stack Capture Mechanism

### 3.1 Create Capture Handler

Implement the logic for capturing temporary stacks with hand cards:

```typescript
export const handleCaptureTemporaryStack = (gameState, captureCard, targetStack) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;

  // Validate capture card is from hand
  if (captureCard.source !== 'hand') {
    return { error: 'Capture must use a card from hand' };
  }

  // Validate value match
  if (rankValue(captureCard.rank) !== targetStack.totalValue) {
    return { error: 'Capture card value must equal stack total' };
  }

  // Remove capture card from hand
  const handIndex = playerHands[currentPlayer].findIndex(c => c === captureCard);
  const newHands = [...playerHands];
  newHands[currentPlayer] = newHands[currentPlayer].filter((_, i) => i !== handIndex);

  // Remove stack from table
  const newTableCards = tableCards.filter(c => c.stackId !== targetStack.stackId);

  // Add captured cards to player's capture pile
  const capturedGroup = [...targetStack.cards, captureCard];
  const newCaptures = [...playerCaptures];
  newCaptures[currentPlayer] = [...newCaptures[currentPlayer], capturedGroup];

  return nextPlayer(updateGameState(gameState, {
    playerHands: newHands,
    tableCards: newTableCards,
    playerCaptures: newCaptures
  }));
};
```

### 3.2 Update Hand Card Drop Handler

Modify the hand card drop handler to detect stack captures:

```typescript
// In handleHandCardDrop.ts - when dropping on temporary_stack
if (targetInfo.type === 'temporary_stack') {
  const stack = tableCards.find(s =>
    s.type === 'temporary_stack' && s.stackId === targetInfo.stackId
  );

  if (!stack) {
    showError("Stack not found.");
    return currentGameState;
  }

  // Check for direct capture
  const sumOfStack = calculateCardSum(stack.cards);
  const captureValue = rankValue(draggedCard.rank);

  if (captureValue === sumOfStack) {
    // Immediate capture
    console.log(`Direct capture: ${draggedCard.rank} captures temp stack (sum=${sumOfStack})`);
    return handleCapture(currentGameState, draggedItem, [stack]);
  }

  // If no direct capture possible, add to stack for building
  return handleAddToStagingStack(currentGameState, draggedCard, stack);
}
```

## Step 4: Create UI Components

### 4.1 Temporary Stack Display Component

Create a component to display temporary stacks:

```jsx
const TemporaryCaptureStack = ({ stack, onCaptureDrop }) => {
  const topCard = stack.cards[stack.cards.length - 1];

  return (
    <DropZone
      acceptTypes={['hand_card']}
      onDrop={onCaptureDrop}
      style={styles.stackContainer}
    >
      <Card card={topCard} size="normal" />
      <View style={styles.stackIndicator}>
        <Text style={styles.stackValue}>{stack.totalValue}</Text>
        <Text style={styles.cardCount}>{stack.cards.length} cards</Text>
      </View>
    </DropZone>
  );
};
```

### 4.2 Add Visual Feedback

Implement visual feedback for drag operations:

```jsx
const DragFeedback = ({ isDragging, dragPosition, validDrop }) => {
  return (
    <Animated.View
      style={[
        styles.dragFeedback,
        {
          left: dragPosition.x,
          top: dragPosition.y,
          backgroundColor: validDrop ? 'green' : 'red',
          opacity: isDragging ? 0.8 : 0
        }
      ]}
    />
  );
};
```

## Step 5: Integrate with Game Flow

### 5.1 Update Main Game Component

Integrate the new handlers into the main game component:

```typescript
const handleDrop = (draggedItem, targetInfo) => {
  let newState = gameState;

  if (draggedItem.source === 'table') {
    newState = handleTableCardDrop(draggedItem, targetInfo, gameState, showError);
  } else if (draggedItem.source === 'hand') {
    newState = handleHandCardDrop(draggedItem, targetInfo, gameState, showError, setModalInfo, executeAction, createActionOption, generatePossibleActions);
  } else if (draggedItem.source === 'temporary_stack') {
    newState = handleTemporaryStackDrop(draggedItem, targetInfo, gameState, showError);
  }

  if (newState !== gameState) {
    updateGameState(newState);
  }
};
```

### 5.2 Add Validation Rules

Implement validation to ensure game rules are followed:

```typescript
// Validation rules for temporary stacks
const validateTemporaryStackCreation = (draggedCard, targetCard, currentPlayer, tableCards) => {
  // Only loose cards can be used
  if (draggedCard.source !== 'table' || targetCard.source !== 'table') {
    return { valid: false, message: 'Only loose cards can create temporary stacks' };
  }

  // Player can only have one temporary stack
  const existingStack = tableCards.find(
    card => card.type === 'temporary_stack' && card.owner === currentPlayer
  );

  if (existingStack) {
    return { valid: false, message: 'You can only have one temporary stack active' };
  }

  return { valid: true };
};
```

## Step 6: Add Error Handling and Edge Cases

### 6.1 Implement Error Messages

Add comprehensive error handling:

```typescript
const showError = (message) => {
  setErrorMessage(message);
  // Auto-hide after 3 seconds
  setTimeout(() => setErrorMessage(''), 3000);
};
```

### 6.2 Handle Invalid Moves

Implement snap-back behavior for invalid drops:

```typescript
const handleInvalidDrop = (draggedItem) => {
  // Animate card back to original position
  animateCardReturn(draggedItem.card, draggedItem.originalPosition);
  showError("Invalid move");
};
```

### 6.3 Add Stack Disbanding

Allow players to cancel temporary stacks:

```typescript
export const handleCancelTemporaryStack = (gameState, stackToCancel) => {
  // Return cards to their original positions
  const handCards = stackToCancel.cards.filter(c => c.source === 'hand');
  const tableCards = stackToCancel.cards.filter(c => c.source !== 'hand');

  // Update game state
  const newPlayerHands = gameState.playerHands.map((hand, index) =>
    index === stackToCancel.owner ? [...hand, ...handCards] : hand
  );

  const newTableCards = gameState.tableCards
    .filter(c => c.stackId !== stackToCancel.stackId)
    .concat(tableCards);

  return updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards
  });
};
```

## Step 7: Testing and Validation

### 7.1 Unit Tests

Create unit tests for the core functionality:

```javascript
describe('Temporary Stack Creation', () => {
  test('should create stack from two loose cards', () => {
    const gameState = createTestGameState();
    const draggedCard = { rank: '5', suit: '♥', source: 'table' };
    const targetCard = { rank: '3', suit: '♠', source: 'table' };

    const result = handleCreateTemporaryCaptureStack(gameState, draggedCard, targetCard);

    expect(result.tableCards).toContainEqual(
      expect.objectContaining({
        type: 'temporary_stack',
        cards: expect.any(Array),
        totalValue: 8
      })
    );
  });

  test('should capture stack with matching hand card', () => {
    const gameState = createTestGameState();
    const captureCard = { rank: '8', suit: '♦', source: 'hand' };
    const targetStack = createTestStack([{ rank: '5', suit: '♥' }, { rank: '3', suit: '♠' }]);

    const result = handleCaptureTemporaryStack(gameState, captureCard, targetStack);

    expect(result.playerCaptures[0]).toContainEqual(
      expect.arrayContaining([
        expect.objectContaining({ rank: '5', suit: '♥' }),
        expect.objectContaining({ rank: '3', suit: '♠' }),
        expect.objectContaining({ rank: '8', suit: '♦' })
      ])
    );
  });
});
```

### 7.2 Integration Tests

Test the complete user flow:

```javascript
describe('Complete Stack Flow', () => {
  test('player can create stack and capture it', () => {
    // 1. Create stack from loose cards
    // 2. Drop hand card on stack
    // 3. Verify capture occurs
    // 4. Verify turn ends
  });
});
```

## Step 8: Performance Optimization

### 8.1 Optimize Collision Detection

Use efficient collision detection for drag targets:

```typescript
const getDropTarget = (dropPosition, tableCards) => {
  // Use spatial partitioning or bounding box checks
  return tableCards.find(card => isPointInCardBounds(dropPosition, card));
};
```

### 8.2 Cache Calculations

Cache expensive calculations like stack totals:

```typescript
const getStackTotalValue = (stack) => {
  if (!stack._cachedTotal) {
    stack._cachedTotal = calculateCardSum(stack.cards);
  }
  return stack._cachedTotal;
};
```

## Step 9: UI Polish and Animation

### 9.1 Add Smooth Animations

Implement smooth drag animations:

```typescript
const animateCardDrag = (cardElement, startPos, endPos) => {
  return new Promise(resolve => {
    cardElement.animate([
      { transform: `translate(${startPos.x}px, ${startPos.y}px)` },
      { transform: `translate(${endPos.x}px, ${endPos.y}px)` }
    ], {
      duration: 200,
      easing: 'ease-out'
    }).addEventListener('finish', resolve);
  });
};
```

### 9.2 Add Visual Indicators

Add visual indicators for valid drop targets:

```typescript
const highlightValidTargets = (draggedItem, tableCards) => {
  tableCards.forEach(card => {
    if (isValidDropTarget(draggedItem, card)) {
      card.element.classList.add('valid-drop-target');
    }
  });
};
```

## Step 10: Documentation and Deployment

### 10.1 Update Game Rules

Document the new mechanic in game rules:

```markdown
## Temporary Stacks

Players can combine loose cards on the table by dragging them together to create temporary stacks. These stacks can then be captured by playing a card from hand that matches the total value of all cards in the stack.

**Example:** A stack containing 5♥ + 3♠ (total value 8) can be captured by playing any 8 from hand.
```

### 10.2 Add Tutorials

Create in-game tutorials for new players:

```typescript
const showStackTutorial = () => {
  const tutorial = {
    title: "Temporary Stacks",
    steps: [
      "Drag loose cards together to create stacks",
      "Use hand cards to capture entire stacks",
      "Combine multiple cards for complex captures"
    ]
  };
  showTutorial(tutorial);
};
```

## Common Issues and Solutions

### Issue: Cards not stacking properly
**Solution:** Ensure proper collision detection and z-index management

### Issue: Invalid captures allowed
**Solution:** Add comprehensive validation before executing captures

### Issue: Performance issues with many cards
**Solution:** Implement spatial partitioning and reduce DOM updates

### Issue: Players confused about stack values
**Solution:** Add clear visual indicators showing stack totals

## Future Enhancements

- **Stack size limits**: Prevent overly large stacks
- **Advanced combinations**: Support for complex capture patterns
- **Undo functionality**: Allow players to undo stack modifications
- **Visual improvements**: Enhanced animations and particle effects
- **Sound design**: Audio feedback for successful captures

This implementation guide provides a complete roadmap for adding the temporary stack capture system to your casino card game.
