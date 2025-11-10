# Dragging System Documentation

## Overview
The casino card game implements a sophisticated drag-and-drop system that allows players to move cards from their hand to table cards, create builds, capture sequences, and perform various game actions. This document details how dragging works, especially for moving cards from the player deck to table cards.

## Core Components

### 1. DraggableCard Component
The `DraggableCard` component wraps individual cards with pan responder functionality for touch-based dragging.

#### Key Features:
- **PanResponder Integration**: Uses React Native's PanResponder for gesture recognition
- **Threshold-Based Drag Start**: Only starts dragging after moving 8 pixels to prevent accidental drags
- **Global Drop Zone Registry**: Checks against globally registered drop zones on release
- **Animated Feedback**: Provides visual feedback during drag operations

#### Code Structure:
```tsx
const DraggableCard = ({
  card,
  onDragStart,
  onDragEnd,
  onDragMove,
  disabled,
  size = 'normal',
  draggable,
  currentPlayer,
  source = 'hand',
  stackId = null
}: DraggableCardProps) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [hasStartedDrag, setHasStartedDrag] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => draggable && !disabled,
    onMoveShouldSetPanResponder: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      return distance > 8;
    },
    // ... drag handling logic
  });
};
```

### 2. PlayerHand Component
The `PlayerHand` component renders a player's hand cards as draggable elements.

#### Single Card Drag Logic:
```tsx
const PlayerHand = memo<PlayerHandProps>(({
  player,
  cards,
  isCurrent,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer,
  tableCards = []
}) => {
  // Check if current player has used a hand card in their temporary stack
  const hasUsedHandCardInTurn = tableCards.some(
    item => item.type === 'temporary_stack' &&
            item.owner === currentPlayer &&
            item.cards &&
            item.cards.some(card => card.source === 'hand')
  );

  // Disable hand card dragging if player has already used a hand card this turn
  const canDragHandCards = isCurrent && !hasUsedHandCardInTurn;

  console.log(`[PlayerHand] Player ${player}, isCurrent=${isCurrent}, currentPlayer=${currentPlayer}, hasUsedHandCardInTurn=${hasUsedHandCardInTurn}, canDragHandCards=${canDragHandCards}`);

  return (
    <View style={styles.playerHand}>
      {cards.map((card, index) => {
        const handKey = `hand-p${player}-${index}-${card.rank}-${card.suit}`;

        return (
          <DraggableCard
            key={handKey}
            card={card}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            disabled={!canDragHandCards}
            draggable={canDragHandCards}
            size="normal"
            currentPlayer={currentPlayer}
            source="hand"
          />
        );
      })}
    </View>
  );
});
```

#### Single Card Drag Enforcement:
- **Turn-Based Restriction**: Only current player can drag cards
- **One Card Per Turn**: Once a hand card is used in a temporary stack, remaining hand cards become disabled
- **Visual Feedback**: Disabled cards appear non-interactive
- **State Tracking**: `hasUsedHandCardInTurn` prevents multiple hand card usage

### 3. CardStack Component
The `CardStack` component handles drop zone registration and management for table cards.

#### Global Drop Zone Registry:
```tsx
// Global dropZones interface is declared here
declare global {
  var dropZones: any[] | undefined;
}
```

#### Drop Zone Registration:
```tsx
useEffect(() => {
  // Initialize global registry if needed
  if (!global.dropZones) global.dropZones = [];

  // Register drop zone with layout measurements
  const handleLayout = (event: any) => {
    stackRef.current?.measureInWindow((pageX, pageY) => {
      const dropZone = {
        stackId,
        bounds: {
          x: pageX - (width * 0.15),  // 15% expansion for easier dropping
          y: pageY - (height * 0.15),
          width: width * 1.3,
          height: height * 1.3
        },
        onDrop: (draggedItem: any) => {
          console.log(`[DropZone] ${stackId} received drop attempt for ${draggedItem.card?.rank}${draggedItem.card?.suit} from ${draggedItem.source}`);
          if (onDropStack) {
            const success = onDropStack(draggedItem);
            console.log(`[DropZone] ${stackId} onDropStack returned: ${success}`);
            return success;
          }
          console.log(`[DropZone] ${stackId} no drop handler available`);
          return false;
        }
      };

      // Update or add to global registry
      global.dropZones = global.dropZones.filter((zone: any) => zone.stackId !== stackId);
      global.dropZones.push(dropZone);
    });
  };
}, [stackId, onDropStack]);
```

### 4. TableCards Component
The `TableCards` component renders all table elements and manages drop zone interactions.

#### Table Card Positioning and Alignment:
```tsx
const TableCards = ({
  cards,
  onDropOnCard,
  currentPlayer,
  onCancelStack,
  onConfirmStack,
  onCardPress = () => {},
  onDragStart,
  onDragEnd,
  onDragMove,
  isDragging = false
}: TableCardsProps) => {
  const memoizedOnDropOnCard = useCallback(onDropOnCard, [onDropOnCard]);

  return (
    <View style={styles.tableCards}>
      <View style={styles.cardsContainer}>
        {cards.length === 0 ? (
          <View style={styles.emptyTable}>
            <Text style={styles.emptyText}>No cards on table</Text>
          </View>
        ) : (
          cards.map((item, index) => {
            // Build positioning
            if (item.type === 'build') {
              return (
                <BuildStack
                  key={item.buildId ? `build-${item.buildId}` : `build-fallback-${index}`}
                  build={item as BuildType}
                  onDropStack={memoizedOnDropOnCard}
                  onCardPress={onCardPress}
                />
              );
            }

            // Temporary stack positioning
            if (item.type === 'temporary_stack') {
              return (
                <TempStack
                  key={item.stackId ? `stack-${item.stackId}` : `stack-fallback-${index}`}
                  stack={item as TempStackType}
                  onDropOnCard={memoizedOnDropOnCard}
                  currentPlayer={currentPlayer}
                  onCancelStack={onCancelStack}
                  onConfirmStack={onConfirmStack}
                  onCardPress={onCardPress}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragMove={onDragMove}
                />
              );
            }

            // Loose card positioning
            const looseCard = item as LooseCardType;
            const safeRank = looseCard.rank || 'Unknown';
            const safeSuit = looseCard.suit || 'Unknown';
            return (
              <LooseCard
                key={`loose-card-${index}-${safeRank}-${safeSuit}`}
                card={looseCard}
                onDropOnCard={memoizedOnDropOnCard}
                currentPlayer={currentPlayer}
                onCardPress={onCardPress}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragMove={onDragMove}
              />
            );
          })
        )}
      </View>
    </View>
  );
};
```

#### Table Card Layout Styles:
```tsx
const styles = StyleSheet.create({
  tableCards: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    padding: 10,
    flex: 1,
  },
  cardsContainer: {
    flex: 1,
    minHeight: 180,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    flexWrap: 'wrap',  // Allows cards to wrap to next line
  },
  emptyTable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    minWidth: 200,
  },
  build: {
    position: 'relative',
    margin: 8,  // Spacing between builds/stacks
  },
  looseCardContainer: {
    margin: 4,  // Spacing between loose cards
  },
});
```

## Drag Flow: Hand Card to Table Card

### Step-by-Step Process

#### 1. Drag Initiation
```tsx
// Player touches and starts dragging a card from their hand
onPanResponderMove: (event, gestureState) => {
  const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);

  if (distance > 8 && !hasStartedDrag) {
    setHasStartedDrag(true);
    pan.setOffset({
      x: pan.x._value,
      y: pan.y._value,
    });

    // Notify parent component
    if (onDragStart) {
      onDragStart(card);
    }
  }

  if (hasStartedDrag) {
    Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    })(event, gestureState);
  }
}
```

#### 2. Drag State Management
- Card becomes visually detached from hand
- Animated position follows finger movement
- Game state tracks dragging status
- Turn validation prevents invalid drags

#### 3. Drop Zone Detection
```tsx
onPanResponderRelease: (event, gestureState) => {
  const dropPosition = {
    x: event.nativeEvent.pageX,
    y: event.nativeEvent.pageY,
    handled: false,
    attempted: false
  };

  // Check all registered drop zones
  if (global.dropZones && global.dropZones.length > 0) {
    let bestZone = null;
    let closestDistance = Infinity;

    for (const zone of global.dropZones) {
      const { x, y, width, height } = zone.bounds;
      const tolerance = 30;
      const expandedBounds = {
        x: x - tolerance,
        y: y - tolerance,
        width: width + (tolerance * 2),
        height: height + (tolerance * 2)
      };

      if (isInsideBounds(dropPosition, expandedBounds)) {
        const distance = calculateDistance(dropPosition, zone.center);
        const priorityScore = distance + (zone.area > 10000 ? 1000 : 0);

        if (priorityScore < closestDistance) {
          closestDistance = priorityScore;
          bestZone = zone;
        }
      }
    }

    if (bestZone) {
      dropPosition.attempted = true;
      const draggedItem = {
        card,
        source: 'hand',
        player: currentPlayer,
        stackId: undefined
      };

      const dropResult = bestZone.onDrop(draggedItem);
      if (dropResult) {
        dropPosition.handled = true;
      }
    }
  }
}
```

#### 4. Action Processing
```tsx
// In GameBoard component
const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any): boolean => {
  if (!isMyTurn) {
    setErrorModal({
      visible: true,
      title: 'Not Your Turn',
      message: 'Please wait for your turn.'
    });
    return false;
  }

  // Determine possible actions
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
    // Execute single action
    sendAction(result.actions[0].type, result.actions[0].payload);
    return true;
  } else {
    // Show modal for multiple choices
    setModalInfo({
      title: 'Choose Your Action',
      message: 'What would you like to do?',
      actions: result.actions
    });
    return true;
  }
}, [sendAction, isMyTurn, gameState]);
```

#### 5. Visual Feedback and Reset
```tsx
// Animate card back if drop wasn't handled
if (!dropPosition.handled && (source !== 'hand' || dropPosition.attempted)) {
  Animated.spring(pan, {
    toValue: { x: 0, y: 0 },
    useNativeDriver: false,
  }).start();
}

// Notify parent of drag end
if (onDragEnd) {
  const draggedItem = {
    card,
    source,
    player: currentPlayer,
    stackId: stackId || undefined
  };
  onDragEnd(draggedItem, dropPosition);
}
```

## Trailing Logic and Card Positioning

### Trailing Action Processing
When a card is trailed (dropped on empty table space), it gets added to the table cards array:

```tsx
// In game-actions.js - handleTrail function
const handleTrail = (gameState, card) => {
  // Remove card from player's hand
  const { updatedHands, cardRemoved } = removeCardFromHand(
    gameState.playerHands,
    gameState.currentPlayer,
    card
  );

  if (!cardRemoved) {
    throw new Error('Card not found in hand');
  }

  // Add card to table as loose card
  const newTableCards = [...gameState.tableCards, cardRemoved];

  // Advance to next player
  const nextPlayer = (gameState.currentPlayer + 1) % 2;

  return {
    ...gameState,
    playerHands: updatedHands,
    tableCards: newTableCards,
    currentPlayer: nextPlayer,
    lastCapturer: null
  };
};
```

### Table Card Sorting and Positioning
```tsx
// Table cards are rendered in the order they appear in the array
// No automatic sorting - cards maintain their trailed order
// Layout uses flexWrap for responsive positioning

const styles = StyleSheet.create({
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',  // Cards wrap to next line when needed
    paddingHorizontal: 5,
  },
  looseCardContainer: {
    margin: 4,  // Consistent spacing between cards
  },
  build: {
    margin: 8,  // Builds have slightly more spacing
  },
});
```

### Card Positioning Rules
1. **Loose Cards**: Individual cards spaced 4px apart, centered alignment
2. **Builds**: Complex structures with 8px margins, owner tags positioned absolutely
3. **Temporary Stacks**: Staging areas with cancel/confirm buttons, positioned with indicators
4. **Wrapping**: Cards automatically wrap to next row when screen width exceeded
5. **Z-Index Management**: Overlapping elements (buttons, indicators) use proper z-index stacking

## Action Types and Examples

### 1. Trail Action
- **Trigger**: Drag hand card to empty table area
- **Result**: Card placed on table, turn advances
```javascript
// Action payload
{
  type: 'trail',
  payload: { card: { rank: '5', suit: '♥' } }
}
```

### 2. Capture Action
- **Trigger**: Drag hand card onto table card(s) of matching rank
- **Result**: Cards captured and moved to player's pile
```javascript
// Action payload
{
  type: 'capture',
  payload: {
    draggedItem: { card: { rank: '7', suit: '♠' } },
    selectedTableCards: [{ rank: '7', suit: '♦' }],
    targetCard: { rank: '7', suit: '♦' }
  }
}
```

### 3. Build Action
- **Trigger**: Drag hand card to create or extend a build
- **Result**: New build created with specified value
```javascript
// Action payload
{
  type: 'build',
  payload: {
    draggedItem: { card: { rank: '3', suit: '♣' } },
    targetCard: { rank: '4', suit: '♣' },
    buildValue: 7,
    biggerCard: { rank: '4', suit: '♣' },
    smallerCard: { rank: '3', suit: '♣' }
  }
}
```

## Performance Optimizations

### 1. Memoization
- All components wrapped with `React.memo`
- Callback functions use `useCallback`
- Prevents unnecessary re-renders

### 2. Global Registry Management
- Drop zones registered globally for efficient lookup
- Cleanup on component unmount
- Position updates on layout changes

### 3. Threshold-Based Dragging
- 8-pixel threshold prevents accidental drags
- Reduces unnecessary drag start events

### 4. Expanded Drop Zones
- 30% larger hit areas for mobile usability
- Priority scoring for overlapping zones

## Error Handling

### Turn Validation
```tsx
const handleDragStart = useCallback((card) => {
  if (!isMyTurn) {
    return; // Prevent drag start
  }
  setDraggedCard(card);
}, [isMyTurn]);
```

### Invalid Move Feedback
- Visual animation returns card to original position
- Error modals explain invalid actions
- Sound feedback (if implemented)

### Network Synchronization (Multiplayer)
- Drag state tracked locally
- Actions sent to server for validation
- UI updates on server confirmation

## Testing Scenarios

### Basic Drag Flow
1. Player touches hand card
2. Moves finger > 8 pixels
3. Card detaches and follows finger
4. Releases over valid drop zone
5. Action executes successfully

### Edge Cases
1. **Drag outside drop zones**: Card animates back
2. **Invalid turn**: Drag blocked at start
3. **Network disconnect**: Local state preserved
4. **Multiple overlapping zones**: Best zone selected by priority

### Performance Tests
1. **Multiple cards**: 10+ cards dragging simultaneously
2. **Complex layouts**: Many overlapping drop zones
3. **Rapid interactions**: Quick drag sequences
4. **Memory usage**: Drop zone registry cleanup

## Future Enhancements

### Potential Improvements
- **Haptic feedback**: Vibration on successful drops
- **Visual trails**: Drag path visualization
- **Magnetism**: Auto-snap to nearby drop zones
- **Undo functionality**: Drag reversal capability
- **Accessibility**: Voice feedback for actions

### Mobile Optimizations
- **Touch target sizes**: Minimum 44px for accessibility
- **Gesture conflicts**: Prevent scroll interference
- **One-handed play**: Optimized for thumb interaction
- **Landscape support**: Enhanced for landscape orientation

This dragging system provides a smooth, intuitive mobile gaming experience while maintaining the complex rule set of the casino card game.
