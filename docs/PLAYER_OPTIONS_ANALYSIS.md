# Player Options Analysis System

## Overview
The Casino card game implements an intelligent analysis system that evaluates all possible legal moves when a player drops a card, presenting multiple strategic options through an interactive modal interface. This system transforms simple card drops into rich decision-making opportunities, allowing players to choose between captures, builds, and other complex actions.

## Core Analysis Engine

### Action Determination Pipeline
```tsx
// utils/actionDeterminer.ts - Main analysis entry point
export const determineActions = (
  draggedItem: DraggedItem,
  targetInfo: TargetInfo,
  gameState: GameState
): {
  actions: ActionOption[];
  requiresModal: boolean;
  errorMessage?: string;
} => {
  // Analyze all possible legal moves for this card drop
  const possibleActions = analyzePossibleActions(draggedItem, targetInfo, gameState);

  if (possibleActions.length === 0) {
    return {
      actions: [],
      requiresModal: false,
      errorMessage: "No valid actions available for this move."
    };
  }

  if (possibleActions.length === 1) {
    // Single clear action - execute immediately
    return {
      actions: possibleActions,
      requiresModal: false
    };
  }

  // Multiple options - present modal for player choice
  return {
    actions: possibleActions,
    requiresModal: true
  };
};
```

### Comprehensive Action Analysis
```tsx
const analyzePossibleActions = (draggedItem, targetInfo, gameState) => {
  const actions = [];
  const { card: draggedCard } = draggedItem;
  const { tableCards, playerHands, currentPlayer } = gameState;

  // 1. Analyze Capture Possibilities
  const captureActions = analyzeCaptures(draggedCard, targetInfo, tableCards);
  actions.push(...captureActions);

  // 2. Analyze Build Possibilities
  const buildActions = analyzeBuilds(draggedCard, targetInfo, gameState);
  actions.push(...buildActions);

  // 3. Analyze Complex Combinations
  const complexActions = analyzeComplexMoves(draggedCard, targetInfo, gameState);
  actions.push(...complexActions);

  // 4. Filter by Game Rules and Player State
  return filterValidActions(actions, gameState);
};
```

## Example: Dropping 4♠ on 4♥

### Scenario Setup
```
Table: [4♥]  (loose card)
Hand: [4♠, 7♦, K♣]
Player has no active builds
Round: 1
```

### Analysis Process
```tsx
// When 4♠ is dropped on 4♥, the system analyzes:

const draggedCard = { rank: '4', suit: '♠' };
const targetInfo = { type: 'loose', cardId: '4♥', rank: '4', suit: '♥' };
const gameState = { tableCards: [/*4♥*/], playerHands: [/*...*/], currentPlayer: 0 };
```

### Generated Action Options

#### Option 1: Direct Capture
```javascript
{
  type: 'capture',
  label: 'Capture 4♥',
  payload: {
    draggedItem: { card: { rank: '4', suit: '♠' }, source: 'hand' },
    selectedTableCards: [{ rank: '4', suit: '♥' }],
    targetCard: { rank: '4', suit: '♥' }
  }
}
// Reasoning: Both cards have rank value 4, so 4♠ can capture 4♥
```

#### Option 2: Create Build of 4
```javascript
{
  type: 'build',
  label: 'Build 4',
  payload: {
    draggedItem: { card: { rank: '4', suit: '♠' }, source: 'hand' },
    tableCardsInBuild: [{ rank: '4', suit: '♥' }],
    buildValue: 4,
    biggerCard: null,  // Same value cards
    smallerCard: null
  }
}
// Reasoning: Two 4s can form a build of 4, and player has another 4 in hand to capture later
```

#### Option 3: Create Build of 8 (4+4)
```javascript
{
  type: 'build',
  label: 'Build 8',
  payload: {
    draggedItem: { card: { rank: '4', suit: '♠' }, source: 'hand' },
    tableCardsInBuild: [{ rank: '4', suit: '♥' }],
    buildValue: 8,
    biggerCard: null,
    smallerCard: null
  }
}
// Reasoning: 4 + 4 = 8, and player has an 8 in hand to capture the build later
```

### Modal Presentation
```tsx
// Multiple actions detected - show modal
setModalInfo({
  title: 'Choose Your Action',
  message: 'What would you like to do with your 4♠?',
  actions: [
    { type: 'capture', label: 'Capture 4♥' },
    { type: 'build', label: 'Build 4' },
    { type: 'build', label: 'Build 8' }
  ]
});
```

## Action Analysis Algorithms

### Capture Analysis
```tsx
const analyzeCaptures = (draggedCard, targetInfo, tableCards) => {
  const actions = [];
  const draggedValue = rankValue(draggedCard.rank);

  if (targetInfo.type === 'loose') {
    // Single card capture
    const targetCard = findTargetCard(targetInfo, tableCards);
    if (rankValue(targetCard.rank) === draggedValue) {
      actions.push(createCaptureAction(draggedCard, [targetCard], targetCard));
    }
  } else if (targetInfo.type === 'build') {
    // Build capture
    const build = findTargetBuild(targetInfo, tableCards);
    if (build.value === draggedValue) {
      actions.push(createCaptureAction(draggedCard, [build], build));
    }
  }

  // Check for multi-card captures
  const multiCardCaptures = analyzeMultiCardCaptures(draggedCard, tableCards);
  actions.push(...multiCardCaptures);

  return actions;
};
```

### Build Analysis
```tsx
const analyzeBuilds = (draggedCard, targetInfo, gameState) => {
  const actions = [];
  const { tableCards, playerHands, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  if (targetInfo.type === 'loose') {
    const targetCard = findTargetCard(targetInfo, tableCards);
    const draggedValue = rankValue(draggedCard.rank);
    const targetValue = rankValue(targetCard.rank);

    // Calculate possible build values
    const possibleValues = [
      draggedValue,                    // Single value build
      draggedValue + targetValue,      // Sum build
      // Add more complex calculations...
    ];

    possibleValues.forEach(buildValue => {
      if (canCreateBuild(buildValue, playerHand)) {
        actions.push(createBuildAction(draggedCard, [targetCard], buildValue));
      }
    });
  }

  return actions;
};
```

### Complex Move Analysis
```tsx
const analyzeComplexMoves = (draggedCard, targetInfo, gameState) => {
  const actions = [];

  // Analyze opponent's build interactions
  const opponentBuildActions = analyzeOpponentBuildMoves(draggedCard, targetInfo, gameState);
  actions.push(...opponentBuildActions);

  // Analyze temporary stack possibilities
  const tempStackActions = analyzeTempStackMoves(draggedCard, targetInfo, gameState);
  actions.push(...tempStackActions);

  // Analyze multi-card combinations
  const comboActions = analyzeCardCombinations(draggedCard, targetInfo, gameState);
  actions.push(...comboActions);

  return actions;
};
```

## Build Creation Validation

### Capture Card Requirement
```tsx
const canCreateBuild = (buildValue, playerHand) => {
  // Player must have a card to capture this build later
  return playerHand.some(card => rankValue(card.rank) === buildValue);
};

// Example: Building 8 requires having an 8 in hand
const hasEight = playerHand.some(card => rankValue(card.rank) === 8);
if (!hasEight) {
  // Cannot create build of 8
  return false;
}
```

### Build Ownership Rules
```tsx
const validateBuildCreation = (buildValue, gameState) => {
  const { tableCards, currentPlayer } = gameState;

  // Rule 1: Cannot have multiple active builds
  const hasActiveBuild = tableCards.some(card =>
    card.type === 'build' && card.owner === currentPlayer
  );

  if (hasActiveBuild) {
    return {
      valid: false,
      message: "You can only have one active build at a time."
    };
  }

  // Rule 2: Opponent cannot have same value build
  const opponentHasSameValue = tableCards.some(card =>
    card.type === 'build' &&
    card.owner !== currentPlayer &&
    card.value === buildValue
  );

  if (opponentHasSameValue) {
    return {
      valid: false,
      message: `Opponent already has a build of ${buildValue}.`
    };
  }

  return { valid: true };
};
```

## Modal System Implementation

### Action Modal Component
```tsx
// components/actionModal.tsx
const ActionModal = ({ modalInfo, onAction, onCancel }) => {
  const { title, message, actions } = modalInfo;

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => onAction(action)}
              >
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

### Modal Action Processing
```tsx
// components/GameBoard.tsx
const handleModalAction = (selectedAction) => {
  // Send chosen action to server
  sendAction(selectedAction.type, selectedAction.payload);

  // Close modal
  setModalInfo(null);

  // Card automatically returns to hand if modal is cancelled
};
```

## Advanced Analysis Features

### Opponent Build Interactions
```tsx
const analyzeOpponentBuildMoves = (draggedCard, targetInfo, gameState) => {
  if (targetInfo.type !== 'build') return [];

  const build = findTargetBuild(targetInfo, gameState.tableCards);
  const actions = [];

  // Check if player owns this build
  if (build.owner === gameState.currentPlayer) {
    // Add to own build
    const validation = validateAddToOwnBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push(createAddToOwnBuildAction(draggedCard, build, validation.newValue));
    }
  } else {
    // Extend opponent's build
    const validation = validateAddToOpponentBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push(createExtendOpponentBuildAction(draggedCard, build, validation.newValue));
    }

    // Check for merge possibility
    const mergeValidation = validateExtendToMerge(gameState, draggedCard, build);
    if (mergeValidation.valid) {
      actions.push(createMergeBuildsAction(draggedCard, build, gameState));
    }
  }

  return actions;
};
```

### Temporary Stack Analysis
```tsx
const analyzeTempStackMoves = (draggedCard, targetInfo, gameState) => {
  if (targetInfo.type !== 'temporary_stack') return [];

  const stack = findTargetStack(targetInfo, gameState.tableCards);
  const actions = [];

  // Direct capture possibility
  const sumValue = calculateCardSum(stack.cards);
  if (rankValue(draggedCard.rank) === sumValue) {
    actions.push(createCaptureTempStackAction(draggedCard, stack));
  }

  // Build creation possibility
  const buildValidation = validateTemporaryStackBuild(stack, draggedCard, gameState);
  if (buildValidation.valid) {
    actions.push(createBuildFromStackAction(draggedCard, stack, buildValidation.newValue));
  }

  return actions;
};
```

## Performance Optimizations

### Action Caching
```tsx
// Cache analysis results for similar game states
const actionCache = new Map();

const getCachedActions = (cacheKey) => {
  return actionCache.get(cacheKey);
};

const cacheActions = (cacheKey, actions) => {
  actionCache.set(cacheKey, actions);
  // Implement LRU eviction for memory management
};
```

### Lazy Evaluation
```tsx
// Only analyze complex moves when needed
const shouldAnalyzeComplexMoves = (simpleActionsCount) => {
  return simpleActionsCount === 0; // Only if no simple actions available
};
```

### Background Processing
```tsx
// Use web workers for complex analysis (if needed)
const analyzeMovesInBackground = (draggedItem, targetInfo, gameState) => {
  return new Promise((resolve) => {
    // Perform analysis in background thread
    const worker = new Worker('moveAnalysisWorker.js');
    worker.postMessage({ draggedItem, targetInfo, gameState });
    worker.onmessage = (e) => resolve(e.data);
  });
};
```

## User Experience Enhancements

### Action Preview
```tsx
// Show preview of action results before selection
const getActionPreview = (action) => {
  switch (action.type) {
    case 'capture':
      return `Capture ${action.payload.selectedTableCards.length} card(s)`;
    case 'build':
      return `Create build of ${action.payload.buildValue}`;
    case 'extendToMerge':
      return `Merge builds into ${action.payload.ownBuild.value}`;
    default:
      return action.label;
  }
};
```

### Intelligent Action Ordering
```tsx
// Order actions by strategic value
const orderActions = (actions) => {
  const priorityOrder = {
    'capture': 1,        // Highest priority
    'extendToMerge': 2,  // Strategic value
    'build': 3,          // Medium priority
    'addToOwnBuild': 4,  // Lower priority
    'addToOpponentBuild': 5 // Lowest priority
  };

  return actions.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
};
```

## Testing Scenarios

### Simple Capture Cases
1. **Direct Match**: 7♠ on 7♥ → Single capture option
2. **Build Capture**: 5♦ on build of 5 → Single capture option
3. **No Options**: 9♣ on 7♥ → Error message

### Multiple Option Cases
1. **Capture + Build**: 4♠ on 4♥ with 8 available → Modal with 3 options
2. **Build Variations**: Multiple build values possible → Modal with build options
3. **Complex Interactions**: Opponent build extension + merge → Modal with 2 options

### Edge Cases
1. **Round Restrictions**: Different behavior in Round 1 vs Round 2
2. **Build Limits**: Cannot create multiple builds
3. **Card Availability**: Must have capture cards for builds

## Benefits

### Strategic Depth
- **Multiple Paths**: Each card drop becomes a decision point
- **Risk/Reward**: Different actions have different strategic implications
- **Learning Curve**: Teaches complex Casino tactics gradually

### User Experience
- **Clear Choices**: Modal presents all valid options
- **No Guesswork**: System prevents invalid moves
- **Flexible Play**: Players choose their preferred strategy

### Technical Advantages
- **Modular Analysis**: Each action type analyzed separately
- **Extensible System**: Easy to add new action types
- **Performance Aware**: Caching and lazy evaluation

This player options analysis system transforms simple card drops into rich strategic decisions, making the Casino game both more accessible for beginners and more challenging for experienced players.
