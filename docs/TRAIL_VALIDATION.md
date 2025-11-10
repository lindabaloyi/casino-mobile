# Trail Validation PRD

## Overview
This PRD details the validation rules for trailing cards in the Casino card game, specifically explaining why players cannot trail a card when there are capturable cards of the same rank already on the table.

## Core Casino Rule: No Trailing When Capture is Possible

### The Rule
**Players cannot trail a card if there are cards of the same rank on the table that could be captured with that card.**

### Why This Rule Exists
- **Game Flow**: Trailing should only occur when no captures are possible
- **Strategy**: Forces players to capture when available, keeping the game moving
- **Fairness**: Prevents players from "saving" cards for later when immediate captures exist

### Example Scenarios

#### ❌ Invalid Trail: 6 on table, trying to trail 6
```
Table: [6♥]
Hand: [6♠, 8♦, K♣]
Action: Drag 6♠ to empty table area
Result: **REJECTED** - Card animates back to hand
```

#### ✅ Valid Trail: No matching ranks on table
```
Table: [7♥, 9♦]
Hand: [6♠, 8♦, K♣]
Action: Drag 6♠ to empty table area
Result: **ALLOWED** - 6♠ placed on table
```

## Implementation Details

### Validation Logic Flow

#### 1. Drag Initiation
```tsx
// Player starts dragging a card from hand
const handleDragStart = (card) => {
  setDraggedCard(card);
  // No validation here - drag always starts
};
```

#### 2. Drop Zone Detection
```tsx
// When card is released, check drop position
onPanResponderRelease: (event, gestureState) => {
  const dropPosition = {
    x: event.nativeEvent.pageX,
    y: event.nativeEvent.pageY,
    handled: false,
    attempted: false
  };

  // Check if dropped on empty area (trail attempt)
  if (dropPosition.x && dropPosition.y && !dropPosition.handled) {
    // This is a trail attempt
    handleTrailAttempt(draggedItem, dropPosition);
  }
};
```

#### 3. Action Determination
```tsx
// In GameBoard handleDragEnd
const handleDragEnd = (draggedItem, dropPosition) => {
  if (dropPosition.handled === false && dropPosition.attempted === false) {
    // Trail attempt - determine possible actions
    const result = determineActions(draggedItem, { type: null }, gameState);

    if (result.errorMessage) {
      // Trail validation failed
      showError(result.errorMessage);
      return;
    }

    if (result.actions.length > 0) {
      // Capture actions available - cannot trail
      if (result.actions.length === 1) {
        sendAction(result.actions[0].type, result.actions[0].payload);
      } else {
        setModalInfo({
          title: 'Choose Action',
          message: 'Multiple actions possible',
          actions: result.actions
        });
      }
    } else {
      // No capture actions - trail is allowed
      sendAction('trail', { card: draggedItem.card });
    }
  }
};
```

### Action Determination Logic
```tsx
// In determineActions (utils/actionDeterminer.ts)
export const determineActions = (draggedItem, targetInfo, gameState) => {
  if (draggedItem.source === 'hand') {
    // Check for possible captures with this card
    const captureActions = findPossibleCaptures(draggedItem.card, gameState.tableCards);

    if (captureActions.length > 0) {
      // Cannot trail - must capture instead
      return {
        actions: captureActions,
        requiresModal: captureActions.length > 1,
        errorMessage: null
      };
    } else {
      // No captures possible - trail allowed
      return {
        actions: [{
          type: 'trail',
          label: 'Trail Card',
          payload: { draggedItem, card: draggedItem.card }
        }],
        requiresModal: false,
        errorMessage: null
      };
    }
  }
};
```

### Capture Detection Algorithm
```tsx
const findPossibleCaptures = (card, tableCards) => {
  const actions = [];
  const cardValue = rankValue(card.rank);

  // Check each table card/stack for possible captures
  tableCards.forEach(tableItem => {
    if (tableItem.type === 'loose') {
      // Single card capture
      if (rankValue(tableItem.rank) === cardValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${tableItem.rank}`,
          payload: {
            draggedItem: { card, source: 'hand' },
            selectedTableCards: [tableItem],
            targetCard: tableItem
          }
        });
      }
    } else if (tableItem.type === 'build') {
      // Build capture
      if (tableItem.value === cardValue) {
        actions.push({
          type: 'capture',
          label: `Capture Build (${tableItem.value})`,
          payload: {
            draggedItem: { card, source: 'hand' },
            targetCard: tableItem
          }
        });
      }
    }
    // Add more capture type checks...
  });

  return actions;
};
```

## Additional Trail Restrictions

### 1. Active Build Restriction (Round 1)
```tsx
// In validateTrail (game-logic/validation.js)
export const validateTrail = (tableCards, card, playerIndex, round) => {
  if (round === 1) {
    if (hasActiveBuild(tableCards, playerIndex)) {
      return {
        valid: false,
        message: "Cannot trail while you own an active build. Capture, build, or use temp builds instead."
      };
    }
  }
  return { valid: true };
};
```

### 2. Single Build Limit
```tsx
// Players can only have one active build at a time
if (hasActiveBuild(tableCards, playerIndex)) {
  return {
    valid: false,
    message: "You can only have one active build at a time. Use temp builds for card manipulation."
  };
}
```

## User Experience Flow

### Invalid Trail Attempt
1. **User Action**: Drag 6♠ toward empty table area when 6♥ is on table
2. **System Detection**: `determineActions` finds capture possibility
3. **Modal Display**: "Choose Action" modal appears with capture option
4. **Forced Choice**: User must capture or cancel action
5. **No Trail Option**: Trail action not available in modal

### Valid Trail Attempt
1. **User Action**: Drag 6♠ toward empty table area when no 6s on table
2. **System Detection**: `determineActions` finds no capture possibilities
3. **Immediate Action**: Trail action executes automatically
4. **Visual Feedback**: Card appears on table, turn advances

## Error Messages

### Capture Required
```
"Cannot trail this card. You must capture the matching card(s) on the table first."
```

### Build Restriction
```
"Cannot trail while you own an active build. Capture, build, or use temp builds instead."
```

### Multiple Actions
```
"Multiple actions possible with this card. Choose capture or build action."
```

## Code Locations

### Client-Side Validation
- **Action Determination**: `utils/actionDeterminer.ts`
- **Trail Handling**: `components/GameBoard.tsx` (`handleDragEnd`)
- **UI Feedback**: Error modals and card animations

### Server-Side Validation
- **Trail Validation**: `game-logic/validation.js` (`validateTrail`)
- **Action Processing**: `server/server.js` (game-action handler)
- **State Updates**: `game-logic/game-actions.js` (`handleTrail`)

## Testing Scenarios

### Capture Prevention
1. Place 6♥ on table
2. Attempt to trail 6♠
3. Verify capture modal appears
4. Verify trail not available

### Valid Trail
1. Clear table
2. Attempt to trail any card
3. Verify card appears on table
4. Verify turn advances

### Build Restrictions
1. Create active build
2. Attempt to trail in Round 1
3. Verify error message
4. Verify card returns to hand

## Benefits of This Rule

### Strategic Depth
- Forces tactical decisions about when to capture vs. save cards
- Prevents passive play styles
- Encourages table reading and opponent hand deduction

### Game Flow
- Keeps games moving by requiring captures when available
- Reduces stalemates from over-cautious play
- Maintains engagement through constant decision-making

### Learning Curve
- Teaches fundamental Casino strategy
- Clear feedback when invalid moves attempted
- Progressive difficulty as players learn capture patterns

## Future Enhancements

### Advanced Validation
- **Multi-card captures**: Detect when trailing would prevent complex captures
- **Build interactions**: Consider build extension possibilities
- **Opponent modeling**: Suggest trails that block opponent captures

### UI Improvements
- **Visual hints**: Highlight capturable cards when hovering trail
- **Trail preview**: Show where card would land before release
- **Undo trails**: Allow undoing trails within turn limit

This validation system ensures the Casino game maintains its strategic integrity while providing clear, helpful feedback to players attempting invalid moves.
