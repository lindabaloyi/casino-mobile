# PRD: Automatic Temp Stack Creation & Build System

## Overview
Automatic system where dropping cards together immediately creates temp stacks. No player confirmation, no modal choices - everything happens automatically based on simple rules.

## Core Principle: Automatic Everything
- **No confirmations**: Cards dropped together = automatic stack creation
- **No modal choices**: System decides what to do based on rules
- **No build selection**: Build values determined automatically
- **Immediate feedback**: Actions happen instantly or stacks disband

## Automatic Triggers

### 1. Stack Creation Trigger
```
Hand Card + Table Card = Automatic Temp Stack
```
**Code Logic**:
```javascript
// From handleHandCardDrop.ts - Loose card drops
if (targetInfo.type === 'loose') {
  // Always create staging stack - no player choice
  return handleCreateStagingStack(currentGameState, draggedCard, targetCard);
}
```

### 2. Stack Building Trigger
```
Any Card + Existing Temp Stack = Automatic Stack Growth
```
**Code Logic**:
```javascript
// From handleAddToStagingStack
if (actions.length === 0) {
  // No final move possible, so add to stack
  return handleAddToStagingStack(currentGameState, draggedCard, stack);
}
```

### 3. Build Creation Trigger
```
Hand Card + Temp Stack = Automatic Build Check
```
**Code Logic**:
```javascript
// From handleConfirmStagingStackAction
if (actions.length === 1) {
  return executeAction(currentGameState, actions[0]); // Auto-execute
}
// Multiple actions would show modal, but we avoid this
```

## Simple Rules Engine

### Rule 1: One Stack Per Player
```javascript
const playerAlreadyHasTempStack = tableCards.some(
  s => s.type === 'temporary_stack' && s.owner === currentPlayer
);
if (playerAlreadyHasTempStack) {
  showError("You can only have one staging stack at a time.");
  return currentGameState;
}
```

### Rule 2: Must Have Hand Card
```javascript
const handCardsInStack = stack.cards.filter(c => c.source === 'hand');
if (handCardsInStack.length !== 1) {
  showError("A final move must be made with exactly one card from your hand.");
  return handleDisbandStagingStack(currentGameState, stack);
}
```

### Rule 3: Automatic Build Value Detection
```javascript
const possibleBuilds = findPossibleBuildsFromStack(stack, playerHand, tableCards, currentPlayer);
// System automatically selects valid build values
possibleBuilds.forEach(value => {
  actions.push(createActionOption('createBuildWithValue', `Create a Build of ${value}`, {
    stack: stack, buildValue: value, draggedItem: handCard
  }));
});
```

### Rule 4: Invalid = Disband
```javascript
if (actions.length === 0) {
  showError("This combination is not a valid capture or build.");
  return handleDisbandStagingStack(currentGameState, stack);
}
```

## User Experience Flow

### Happy Path: Automatic Build Creation
1. Player drags 7♥ from hand to 7♠ on table
2. **System automatically creates temp stack** (no choice)
3. Player drags 3♦ from hand to the stack
4. **System automatically adds card to stack** (no choice)
5. Player drags 10♣ from hand to the stack
6. **System automatically checks: Can this make a build?**
7. **If yes**: Build created automatically
8. **If no**: Stack disbanded with error message

### Error Path: Invalid Combinations
1. Player creates invalid stack combination
2. System detects no valid build possible
3. **Automatic disband**: Cards return to original positions
4. Error message explains why

## Accept & Decline Button Design

### Visual Design
```jsx
// From TableCards.tsx - TempStack Component
<TouchableOpacity
  style={styles.confirmStackButton}
  onPress={() => onConfirmStack(stack)}
>
  <Text style={styles.confirmStackText}>✓</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.cancelStackButton}
  onPress={() => onCancelStack(stack)}
>
  <Text style={styles.cancelStackText}>×</Text>
</TouchableOpacity>
```

### Button Styling
```javascript
// Accept Button (Green ✓)
confirmStackButton: {
  position: 'absolute',
  top: -10,
  left: -10,
  backgroundColor: '#4CAF50',  // Green
  borderRadius: 15,
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1,
}

// Decline Button (Red ×)
cancelStackButton: {
  position: 'absolute',
  top: -10,
  right: -10,
  backgroundColor: '#F44336',  // Red
  borderRadius: 15,
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1,
}
```

### Button Positioning
- **Accept (✓)**: Top-left corner of temp stack
- **Decline (×)**: Top-right corner of temp stack
- **Always visible**: z-index: 1 ensures buttons appear above cards
- **Touch targets**: 30x30px for good mobile usability

## Modal Triggering Logic After Temp Stack

### When Modals Appear After Stack Confirmation

#### 1. **Multiple Build Values Possible**
```javascript
// From handleConfirmStagingStackAction
const possibleBuilds = findPossibleBuildsFromStack(stack, playerHand, tableCards, currentPlayer);

if (possibleBuilds.length > 1) {
  // MODAL TRIGGERED: Multiple build options
  setModalInfo({
    title: 'Choose Build Value',
    message: 'Multiple build values possible. Choose one:',
    actions: possibleBuilds.map(value => createActionOption(
      'createBuildWithValue',
      `Create a Build of ${value}`,
      { stack, buildValue: value, draggedItem: handCard }
    ))
  });
}
```

#### 2. **Multiple Action Types Possible**
```javascript
// When stack can be used for capture OR build OR reinforce
if (actions.length > 1) {
  setModalInfo({
    title: 'Choose Your Action',
    message: `This combination can form multiple actions. Please choose one:`,
    actions: actions
  });
}
```

#### 3. **Complex Build Scenarios**
- Stack can reinforce opponent's build AND create own build
- Stack can capture AND create build
- Multiple partition possibilities for same value

### Modal Decision Flow
```
Player clicks ✓ (Accept) on temp stack
    ↓
System analyzes stack possibilities
    ↓
if (actions.length === 0) → Auto-disband with error
if (actions.length === 1) → Auto-execute action
if (actions.length > 1) → Show modal for player choice
```

## Implementation Details

### No Modal System for Basic Stacking
- **Temp stack creation**: Fully automatic
- **Stack building**: Fully automatic
- **Build finalization**: Automatic if single option, error if invalid

### Modal Only for Complex Choices
```javascript
// Modal appears ONLY when multiple build values are possible
if (possibleBuilds.length > 1) {
  setModalInfo({
    title: 'Choose Build Value',
    message: 'Multiple build values possible. Choose one:',
    actions: buildValueOptions
  });
}
```

### Card Return Logic
```javascript
// From handleDisbandStagingStack
const handCards = stack.cards.filter(c => c.source === 'hand');
const tableCards = stack.cards.filter(c => c.source !== 'hand' && c.source !== 'opponentCapture');

// Return hand cards to player
newPlayerHands[currentPlayer] = [...newPlayerHands[currentPlayer], ...handCards];

// Return table cards to table
newTableCards.push(...tableCards);
```

## Benefits of Automatic System

### 1. **Faster Gameplay**
- No waiting for confirmations
- Immediate visual feedback
- Quicker turn completion

### 2. **Simpler UI**
- No confirmation buttons
- No complex modal choices
- Clean, intuitive interactions

### 3. **Better Flow**
- Natural card dropping behavior
- Less cognitive load on players
- More responsive feel

### 4. **Error Prevention**
- Invalid moves caught immediately
- Clear feedback on why moves fail
- Cards automatically return to safe positions

## Technical Architecture

### State Management
- **Immediate updates**: All actions update state instantly
- **Rollback capability**: Invalid moves return to previous state
- **Single source of truth**: Game state always reflects current reality

### Validation Pipeline
1. **Pre-action validation**: Check if action is possible
2. **Action execution**: Perform the action
3. **Post-action validation**: Verify result is valid
4. **Rollback on failure**: Return to previous state if invalid

### Performance Considerations
- **Lightweight operations**: Stack creation is fast
- **Minimal re-renders**: Targeted state updates
- **Efficient validation**: Quick rule checks

## Edge Cases Handled

### 1. **Multiple Build Values**
- System detects multiple possibilities
- Forces player choice via modal (rare case)

### 2. **Opponent Card Interactions**
- Special handling for captured opponent cards
- Maintains game balance

### 3. **Round Transitions**
- Different behavior in round 1 vs round 2
- Automatic trail handling in round 2

### 4. **Build Limits**
- Maximum 5 cards per build
- Automatic extendability checks

## Future Enhancements

- **Visual feedback**: Better animations for stack creation/destruction
- **Sound effects**: Audio feedback for successful/failed actions
- **Undo system**: Allow players to undo automatic actions within time limit
- **Hint system**: Suggest optimal card combinations
