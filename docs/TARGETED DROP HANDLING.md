# Targeted Drop Handling PRD

## Overview
This PRD documents the implementation of targeted drop handling for card interactions in the Casino game. Previously, the system only supported trail drops (dropping cards on empty table space), but now supports dropping cards directly onto other cards or game elements to trigger captures, builds, and other actions.

## Core Problem Solved

### Before the Fix
- **GameBoard only handled trail attempts** - drops on empty table space
- **Individual card drop zones existed** but weren't properly utilized
- **Capture on matching cards** (like 9♥ on 9♣) failed because the drop was treated as a trail
- **Build interactions** were impossible because targeted drops weren't recognized

### After the Fix
- **Targeted drops are detected** and routed to appropriate handlers
- **Capture actions trigger** when dropping on matching cards
- **Build interactions work** for capture, extension, and creation
- **Consistent action determination** for all drop types

## Implementation Architecture

### Drop Zone Hierarchy
```tsx
// 1. Individual Card Drop Zones (highest priority)
<CardStack stackId="loose-9♣" onDropStack={handleCardDrop} />

// 2. Build Drop Zones (medium priority)  
<CardStack stackId="build-123" onDropStack={handleBuildDrop} />

// 3. Temporary Stack Drop Zones (medium priority)
<CardStack stackId="temp-456" onDropStack={handleTempStackDrop} />

// 4. Table Section Drop Zone (lowest priority - trails)
<View style={styles.tableCardsSection}>
  {/* Catches drops not handled by specific zones */}
</View>
```

### Action Determination Flow
```tsx
// utils/actionDeterminer.ts
export const determineActions = (draggedItem, targetInfo, gameState) => {
  // Route based on target type
  if (targetInfo?.type === 'loose') {
    // Dropped on a loose card
    return handleLooseCardDrop(draggedItem, targetInfo, gameState);
  } else if (targetInfo?.type === 'build') {
    // Dropped on a build
    return handleBuildDrop(draggedItem, targetInfo, gameState);
  } else if (targetInfo?.type === 'temporary_stack') {
    // Dropped on a temporary stack
    return handleTempStackDrop(draggedItem, targetInfo, gameState);
  } else {
    // No specific target - trail attempt
    return handleTrailAttempt(draggedItem, gameState);
  }
};
```

## Targeted Drop Processing

### 1. Loose Card Drop Handling
```tsx
// handlers/handleHandCardDrop.ts
const handleLooseCardDrop = (draggedItem, targetInfo, gameState) => {
  const { card: draggedCard } = draggedItem;
  const targetCard = findTargetCard(targetInfo, gameState.tableCards);

  // Check for direct capture
  if (rankValue(draggedCard.rank) === rankValue(targetCard.rank)) {
    return {
      actions: [{
        type: 'capture',
        label: `Capture ${targetCard.rank}`,
        payload: {
          draggedItem,
          selectedTableCards: [targetCard],
          targetCard
        }
      }],
      requiresModal: false
    };
  }

  // Check for build creation
  const buildValue = rankValue(draggedCard.rank) + rankValue(targetCard.rank);
  if (canCreateBuild(buildValue, gameState)) {
    return {
      actions: [{
        type: 'build',
        label: `Build ${buildValue}`,
        payload: { draggedItem, tableCardsInBuild: [targetCard], buildValue }
      }],
      requiresModal: false
    };
  }

  // Default: Create staging stack for complex combinations
  return handleCreateStagingStack(gameState, draggedCard, targetCard);
};
```

### 2. Build Drop Handling
```tsx
const handleBuildDrop = (draggedItem, targetInfo, gameState) => {
  const { card: draggedCard } = draggedItem;
  const build = findTargetBuild(targetInfo, gameState.tableCards);

  const actions = [];

  // Possibility 1: Capture the build
  if (rankValue(draggedCard.rank) === build.value) {
    actions.push({
      type: 'capture',
      label: `Capture Build (${build.value})`,
      payload: { draggedItem, targetCard: build }
    });
  }

  // Possibility 2: Extend opponent's build
  if (build.owner !== gameState.currentPlayer) {
    const validation = validateAddToOpponentBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push({
        type: 'addToOpponentBuild',
        label: `Extend to ${validation.newValue}`,
        payload: { draggedItem, buildToAddTo: build }
      });
    }
  }

  // Possibility 3: Add to own build
  if (build.owner === gameState.currentPlayer) {
    const validation = validateAddToOwnBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push({
        type: 'addToOwnBuild',
        label: `Add to Build (${validation.newValue})`,
        payload: { draggedItem, buildToAddTo: build }
      });
    }
  }

  return {
    actions,
    requiresModal: actions.length > 1
  };
};
```

### 3. Temporary Stack Drop Handling
```tsx
const handleTempStackDrop = (draggedItem, targetInfo, gameState) => {
  const stack = findTargetStack(targetInfo, gameState.tableCards);

  // Handle complex staging stack interactions
  return processStagingStackDrop(draggedItem, stack, gameState);
};
```

## Drop Zone Detection System

### CardStack Drop Zone Registration
```tsx
// components/CardStack.tsx
const CardStack = ({ stackId, cards, onDropStack }) => {
  const stackRef = useRef(null);
  const [dropZoneBounds, setDropZoneBounds] = useState(null);

  useEffect(() => {
    if (!dropZoneBounds || !onDropStack) return;

    const dropZone = {
      stackId,
      bounds: dropZoneBounds,
      onDrop: (draggedItem) => {
        // Create target info based on stack type
        const targetInfo = createTargetInfo(stackId, cards);
        return handleTargetedDrop(draggedItem, targetInfo);
      }
    };

    global.dropZones.push(dropZone);
  }, [dropZoneBounds, onDropStack]);

  const handleLayout = (event) => {
    stackRef.current?.measureInWindow((pageX, pageY, width, height) => {
      const bounds = {
        x: pageX - (width * 0.15),  // 15% expansion
        y: pageY - (height * 0.15),
        width: width * 1.3,         // 30% total expansion
        height: height * 1.3
      };
      setDropZoneBounds(bounds);
    });
  };

  return (
    <View ref={stackRef} onLayout={handleLayout}>
      {/* Card content */}
    </View>
  );
};
```

### Target Info Creation
```tsx
const createTargetInfo = (stackId, cards) => {
  if (stackId.startsWith('loose-')) {
    return {
      type: 'loose',
      cardId: stackId.replace('loose-', ''),
      rank: cards[0].rank,
      suit: cards[0].suit
    };
  } else if (stackId.startsWith('build-')) {
    return {
      type: 'build',
      buildId: stackId.replace('build-', '')
    };
  } else if (stackId.startsWith('temp-')) {
    return {
      type: 'temporary_stack',
      stackId: stackId
    };
  }
  return null;
};
```

## GameBoard Integration

### Drop Event Processing
```tsx
// components/GameBoard.tsx
const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any): boolean => {
  if (!isMyTurn) {
    setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
    return false;
  }

  console.log(`🎯 DROP: ${draggedItem.source} -> ${targetInfo?.type || 'empty'}`, { draggedItem, targetInfo });

  // Determine possible actions for this drop
  const result = determineActions(draggedItem, targetInfo, gameState);

  if (result.errorMessage) {
    setErrorModal({ visible: true, title: 'Invalid Move', message: result.errorMessage });
    return false;
  }

  if (result.actions.length === 0) {
    setErrorModal({ visible: true, title: 'Invalid Move', message: 'No valid actions available.' });
    return false;
  }

  // Handle single action
  if (result.actions.length === 1) {
    sendAction(result.actions[0].type, result.actions[0].payload);
    return true;
  }

  // Handle multiple actions with modal
  if (result.actions.length > 1) {
    setModalInfo({
      title: 'Choose Action',
      message: 'Multiple actions possible',
      actions: result.actions
    });
    return true;
  }

  return false;
}, [sendAction, isMyTurn, gameState]);
```

### Drag End Processing
```tsx
const handleDragEnd = useCallback((draggedItem, dropPosition) => {
  if (dropPosition.handled) {
    // Already processed by a drop zone
    return;
  }

  // Check if any drop zones were hit
  const hitZone = findDropZone(dropPosition);
  if (hitZone) {
    dropPosition.handled = true;
    const result = hitZone.onDrop(draggedItem);
    if (result) return;
  }

  // No drop zone hit - treat as trail attempt
  handleTrailAttempt(draggedItem, dropPosition);
}, [gameState]);
```

## Action Resolution Examples

### Example 1: 9♥ dropped on 9♣ (Capture)
```
Input:
- draggedItem: { card: { rank: '9', suit: '♥' }, source: 'hand' }
- targetInfo: { type: 'loose', cardId: '9♣', rank: '9', suit: '♣' }

Process:
1. determineActions called with targetInfo.type === 'loose'
2. handleLooseCardDrop checks rankValue('9') === rankValue('9') ✓
3. Returns single capture action
4. Modal shows "Capture 9♣" option
5. User selects → capture executes
```

### Example 2: 3♠ dropped on 4♥ (Build)
```
Input:
- draggedItem: { card: { rank: '3', suit: '♠' }, source: 'hand' }
- targetInfo: { type: 'loose', cardId: '4♥', rank: '4', suit: '♥' }

Process:
1. determineActions called with targetInfo.type === 'loose'
2. handleLooseCardDrop checks ranks: 3 ≠ 4
3. Calculates buildValue = 3 + 4 = 7
4. Checks if player has 7 for capture → assumes yes
5. Returns build action "Build 7"
6. Action executes immediately
```

### Example 3: 8♦ dropped on opponent's build of 8 (Multiple Actions)
```
Input:
- draggedItem: { card: { rank: '8', suit: '♦' }, source: 'hand' }
- targetInfo: { type: 'build', buildId: '123' }

Process:
1. determineActions called with targetInfo.type === 'build'
2. handleBuildDrop finds build with value 8
3. Checks possibilities:
   - Capture: 8 = 8 ✓ → "Capture Build (8)"
   - Extend opponent: validation fails (can't extend own build)
   - Add to own: validation fails (different logic)
4. Returns multiple actions → modal appears
5. User chooses capture or other valid actions
```

## Error Handling

### Invalid Drop Scenarios
```tsx
const validateTargetedDrop = (draggedItem, targetInfo, gameState) => {
  // Check if target still exists
  if (!findTarget(targetInfo, gameState.tableCards)) {
    return { valid: false, message: "Target no longer exists" };
  }

  // Check if action is allowed
  if (!isValidAction(draggedItem, targetInfo, gameState)) {
    return { valid: false, message: "Invalid action for this target" };
  }

  return { valid: true };
};
```

### Fallback Behavior
- **No valid actions**: Card animates back to hand
- **Target disappeared**: Error message shown
- **Network issues**: Local state preserved, retry possible

## Performance Optimizations

### Drop Zone Management
- **Lazy registration**: Zones created only after layout measurement
- **Bounds caching**: Measurements stored to avoid recalculation
- **Cleanup**: Zones removed when components unmount

### Action Determination Caching
- **Result memoization**: Previous determinations cached
- **Early validation**: Invalid actions rejected quickly
- **Batch processing**: Multiple possibilities checked efficiently

## Testing Scenarios

### Capture Scenarios
1. **Direct capture**: 9♥ on 9♣ → Modal with capture option
2. **Build capture**: 7♠ on build of 7 → Capture build option
3. **Multiple captures**: Card that can capture multiple targets → Modal with choices

### Build Scenarios
1. **Simple build**: 3♠ on 4♥ = 7, player has 7♣ → Build created
2. **Invalid build**: Same cards but player lacks capture card → Error
3. **Build extension**: Add card to existing build → Extend or reinforce

### Complex Interactions
1. **Staging stacks**: Drop on temporary stacks for complex combinations
2. **Opponent builds**: Extend or reinforce opponent's builds
3. **Multi-card captures**: Capture combinations spanning multiple cards

## Benefits

### User Experience
- **Intuitive interactions**: Drop directly on intended targets
- **Visual feedback**: Clear indication of valid drop zones
- **Action clarity**: Modal explains available options

### Game Flow
- **Strategic depth**: More interaction possibilities
- **Faster gameplay**: Direct actions reduce click sequences
- **Error reduction**: Visual targeting prevents mistakes

### Technical Advantages
- **Modular design**: Each drop type handled separately
- **Extensible system**: New interaction types easily added
- **Performance**: Efficient drop zone detection and action resolution

## Future Enhancements

### Advanced Targeting
- **Swipe gestures**: Swipe between cards for quick actions
- **Multi-select**: Select multiple cards for complex captures
- **Drag previews**: Show action preview during drag

### Smart Suggestions
- **Action hints**: Highlight recommended drop targets
- **Auto-complete**: Automatically choose obvious actions
- **Undo support**: Allow reversing targeted actions

This targeted drop handling system transforms the game from simple trail-based play to rich, interactive card manipulation, enabling all the complex capture and build mechanics that make Casino strategically engaging.
