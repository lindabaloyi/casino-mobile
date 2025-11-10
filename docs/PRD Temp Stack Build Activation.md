# Product Requirements Document: Temporary Stack/Build Activation System

## Overview

The Temporary Stack/Build Activation system is a core gameplay mechanic in the multiplayer casino card game that empowers players to strategically combine cards before finalizing powerful build actions. This system allows players to stage complex card combinations during their turn without immediately committing to an action, providing enhanced tactical depth and the ability to create builds that enable adding more cards in subsequent turns.

## Business Value

- **Strategic Depth**: Players can experiment with card combinations without turn commitment
- **Build Power**: Temporary stacks enable creation of extendable builds that allow adding more cards
- **Game Flow**: Prevents turn-ending mistakes while maintaining game pace
- **Player Agency**: Gives players control over complex multi-card operations

## Technical Architecture

### Core Components

#### 1. Temporary Stack Data Structure
```typescript
type TemporaryStack = {
  stackId: string;
  type: 'temporary_stack';
  cards: CardType[];
  owner: number;
};
```

#### 2. Build Data Structure
```typescript
type BuildType = {
  buildId: string;
  type: 'build';
  cards: CardType[];
  value: number;
  owner: number;
  isExtendable: boolean;
};
```

## Activation Mechanisms

### 1. Creating Temporary Stacks

#### UI Flow: Drag and Drop Activation
- **Trigger**: Player drags a card from hand, table, or opponent's captures
- **Target**: Empty table area or existing cards/stacks
- **Visual Feedback**: Cards stack visually with smaller cards on top
- **Validation**: Only one temporary stack per player allowed

#### Code Implementation
```javascript
// From game-actions.js - handleCreateStagingStack
export const handleCreateStagingStack = (gameState, handCard, tableCard) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // CASINO RULE: Players can only have one temp build active at a time
  const playerAlreadyHasTempStack = tableCards.some(
    s => s.type === 'temporary_stack' && s.owner === currentPlayer
  );
  if (playerAlreadyHasTempStack) {
    console.error("You can only have one staging stack at a time.");
    return gameState;
  }

  // Build ordered stack with smaller cards on top
  const orderedCards = handValue < tableValue
    ? [{ ...tableCard, source: 'table' }, { ...handCard, source: 'hand' }]
    : [{ ...handCard, source: 'hand' }, { ...tableCard, source: 'table' }];

  const newStack = {
    stackId: `temp-${Date.now()}`,
    type: 'temporary_stack',
    cards: orderedCards,
    owner: currentPlayer,
  };

  // Remove hand card and replace table card with stack
  const removalResult = removeCardFromHand(playerHands, currentPlayer, handCard);
  const finalTableCards = removeCardsFromTable(tableCards, [tableCard]);
  finalTableCards.push(newStack);

  return updateGameState(gameState, {
    playerHands: removalResult.updatedHands,
    tableCards: finalTableCards
  });
};
```

### 2. Adding Cards to Temporary Stacks

#### UI Flow: Progressive Building
- **Trigger**: Drag additional cards onto existing temporary stack
- **Visual**: Cards add to stack with proper ordering (bigger cards at bottom)
- **Feedback**: Stack height increases, card count updates
- **Limit**: No explicit limit, but validation prevents invalid combinations

#### Code Implementation
```javascript
// From game-actions.js - handleAddToStagingStack
export const handleAddToStagingStack = (gameState, handCard, targetStack) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // Remove card from hand
  const removalResult = removeCardFromHand(playerHands, currentPlayer, handCard);

  // Add to existing stack
  const newStack = {
    ...targetStack,
    cards: [...targetStack.cards, { ...handCard, source: 'hand' }]
  };

  // Update table
  const stackIndex = tableCards.findIndex(s => s.stackId === targetStack.stackId);
  const newTableCards = [...tableCards];
  newTableCards[stackIndex] = newStack;

  return updateGameState(gameState, {
    playerHands: removalResult.updatedHands,
    tableCards: newTableCards
  });
};
```

### 3. Finalizing Temporary Stacks into Builds

#### UI Flow: Confirmation Action
- **Trigger**: Player taps "Confirm" button on temporary stack
- **Validation**: System checks if stack can form valid build
- **Options**: If multiple build values possible, show selection modal
- **Result**: Stack converts to permanent build, turn ends

#### Code Implementation
```javascript
// From game-actions.js - handleFinalizeStagingStack
export const handleFinalizeStagingStack = (gameState, stack) => {
  const { playerHands, tableCards, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Find all possible valid builds
  const possibleBuilds = findPossibleBuildsFromStack(stack, playerHand, tableCards, currentPlayer);

  if (possibleBuilds.length === 0) {
    return { error: true, message: "This stack does not form a valid build." };
  }

  if (possibleBuilds.length > 1) {
    // Return options for UI to handle
    return {
      options: possibleBuilds,
      stack,
      draggedItem: { card: handCardUsed, source: 'hand' }
    };
  }

  // Create single possible build
  const buildValue = possibleBuilds[0];
  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: finalCardsInBuild,
    value: buildValue,
    owner: currentPlayer,
    isExtendable: true, // Builds are extendable by default
  };

  const newTableCards = removeCardsFromTable(tableCards, [stack]);
  newTableCards.push(newBuild);

  return nextPlayer(updateGameState(gameState, { tableCards: newTableCards }));
};
```

## Power Enhancement: Extendable Builds

### Core Benefit
Temporary stacks enable creation of **extendable builds** that allow players to add more cards in future turns, significantly increasing strategic options.

### Build Extension Mechanics

#### 1. Extendable Build Properties
```typescript
type ExtendableBuild = {
  buildId: string;
  type: 'build';
  cards: CardType[];
  value: number;
  owner: number;
  isExtendable: true; // Key property for power enhancement
};
```

#### 2. Adding Cards to Extendable Builds
```javascript
// From game-actions.js - handleAddToOpponentBuild
export const handleAddToOpponentBuild = (gameState, draggedItem, buildToAddTo) => {
  const newBuildValue = buildToAddTo.value + rankValue(playerCard.rank);

  // Create enhanced build with additional card
  const newBuildCards = [...buildToAddTo.cards, playerCard];
  const sortedCards = newBuildCards.sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: sortedCards,
    value: newBuildValue,
    owner: currentPlayer, // Ownership transfers to current player
    isExtendable: sortedCards.length < 5, // Can extend until 5 cards
  };

  // Update table: remove old build, add enhanced one
  const newTableCards = tableCards.filter(b => b.buildId !== buildToAddTo.buildId);
  newTableCards.push(newBuild);

  return nextPlayer(updateGameState(gameState, {
    tableCards: newTableCards,
    playerHands: newPlayerHands
  }));
};
```

### UI Components

#### 1. Temporary Stack Visualization
```jsx
// From CardStack.tsx - Temporary Stack Display
const CardStack = ({ stackId, cards, dragSource }) => {
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  return (
    <TouchableOpacity style={styles.stackContainer}>
      <Card card={topCard} size="normal" />
      {/* Show card count for stacks > 1, but hide for temp stacks */}
      {cardCount > 1 && dragSource !== 'temporary_stack' && (
        <View style={styles.stackIndicator}>
          <Text style={styles.stackCount}>{cardCount}+</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
```

#### 2. Build Stack Visualization
```jsx
// From BuildStack.tsx - Build Display with Extendable Indicator
const BuildStack = ({ build, onPress, selected }) => {
  return (
    <TouchableOpacity style={[styles.container, selected && styles.selected]}>
      <Text style={styles.buildLabel}>Build {build.value}</Text>
      <Text style={styles.ownerLabel}>Player {build.owner + 1}</Text>

      <View style={styles.cardsContainer}>
        {build.cards.map((card, index) => (
          <Card key={index} card={card} size="small" disabled={true} />
        ))}
      </View>

      <Text style={styles.cardCount}>{build.cards.length} cards</Text>

      {/* Power indicator: shows extendable status */}
      {build.isExtendable && (
        <Text style={styles.extendableLabel}>Extendable</Text>
      )}
    </TouchableOpacity>
  );
};
```

## Validation Rules

### Temporary Stack Creation
- Players can only have one temporary stack active at a time
- Must include at least one card from hand
- Can combine cards from hand, table, and opponent's captures
- Cards must be properly ordered (smaller values on top)

### Build Finalization
- Must contain exactly one hand card
- Cards must be partitionable into sums matching a value in player's remaining hand
- Cannot create build if player already owns an active build
- Build value cannot exceed 10

### Build Extension
- Only extendable builds can be extended
- Cannot extend beyond 5 cards
- New value cannot exceed 10
- Player must have capture card for new value

## Error Handling

### Invalid Stack Disbanding
```javascript
// From game-actions.js - handleDisbandStagingStack
export const handleDisbandStagingStack = (gameState, stackToDisband) => {
  // Return cards to original sources
  const handCards = stack.cards.filter(c => c.source === 'hand');
  const opponentCards = stack.cards.filter(c => c.source === 'opponentCapture');
  const tableCards = stack.cards.filter(c => c.source !== 'hand' && c.source !== 'opponentCapture');

  // Restore game state
  const newPlayerHands = [...gameState.playerHands];
  newPlayerHands[currentPlayer] = [...newPlayerHands[currentPlayer], ...handCards];

  // Remove stack from table and add back loose cards
  const newTableCards = gameState.tableCards.filter(s => s.stackId !== stackToDisband.stackId);
  newTableCards.push(...tableCards);

  return updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards
  });
};
```

## User Experience Flow

1. **Initiation**: Player drags card to create temporary stack
2. **Building**: Player adds more cards to increase power
3. **Validation**: System validates combinations in real-time
4. **Confirmation**: Player confirms to finalize into extendable build
5. **Power Gain**: Build allows adding more cards in future turns
6. **Strategic Advantage**: Player can now extend opponent's builds or reinforce own

## Performance Considerations

- Temporary stacks are lightweight objects with minimal rendering overhead
- Validation occurs on-demand during drag operations
- Card ordering calculations are O(n log n) for sorting
- UI updates are batched to prevent excessive re-renders

## Future Enhancements

- Visual stacking animations for better feedback
- Undo functionality for temporary stack modifications
- Advanced combo suggestions based on available cards
- Multi-touch support for simultaneous card staging
