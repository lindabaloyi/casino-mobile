# Table Card Positioning and Alignment PRD

## Overview
This PRD details the positioning and alignment system for cards when dropped from player hand to table cards in the casino card game. The system handles three types of table elements: loose cards, builds, and temporary stacks, each with specific positioning rules and visual indicators.

## Core Positioning Architecture

### Layout Container Structure
```tsx
const styles = StyleSheet.create({
  tableCards: {
    backgroundColor: '#2E7D32',  // Dark green casino table color
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
    flexWrap: 'wrap',  // Critical: allows cards to wrap to next line
  },
});
```

### Key Layout Principles
1. **Responsive Flex Layout**: Cards arranged in rows that wrap when screen width exceeded
2. **Centered Alignment**: All cards centered both horizontally and vertically
3. **Flexible Spacing**: Different margin values for different card types
4. **Z-Index Management**: Overlapping UI elements properly stacked

## Card Type Positioning Rules

### 1. Loose Cards (Trailed Cards)
When a card is trailed (dropped on empty table space), it becomes a loose card:

#### Positioning Code:
```tsx
const LooseCard = ({
  card,
  onDropOnCard,
  currentPlayer,
  onCardPress = () => {},
  onDragStart,
  onDragEnd,
  onDragMove
}: LooseCardProps) => {
  return (
    <View style={styles.looseCardContainer}>
      <CardStack
        stackId={`loose-stack-${card.rank}-${card.suit}`}
        cards={[card]}
        onDropStack={useCallback(
          (draggedItem: any) =>
            onDropOnCard(draggedItem, {
              type: 'loose',
              cardId: `${card.rank}-${card.suit}`,
              rank: card.rank,
              suit: card.suit
            }),
          [onDropOnCard, card.rank, card.suit]
        )}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
        dragSource="table"
      />
    </View>
  );
};
```

#### Styling:
```tsx
const styles = StyleSheet.create({
  looseCardContainer: {
    margin: 4,  // 4px margin on all sides
  },
});
```

#### Positioning Rules:
- **Margin**: 4px spacing from adjacent cards
- **Stack ID**: `loose-stack-{rank}-{suit}` for unique identification
- **Draggable**: Yes, can be dragged for further actions
- **Drop Zone**: Registered as individual card drop target

### 2. Build Cards
Builds are complex structures created by combining multiple cards:

#### Positioning Code:
```tsx
const BuildStack = memo(({ build, onDropStack, onCardPress = () => {} }: BuildStackProps) => {
  const memoizedOnDropStack = useCallback(
    (draggedItem: any) => onDropStack(draggedItem, { type: 'build', buildId: build.buildId }),
    [onDropStack, build.buildId]
  );

  const getPlayerColor = (player: number) => {
    return player === 0 ? '#FF5722' : '#2196F3';
  };

  return (
    <View style={styles.build}>
      <CardStack
        stackId={build.buildId}
        cards={build.cards}
        onDropStack={memoizedOnDropStack}
        buildValue={build.value}
        isBuild={true}
      />
      <View style={[styles.buildOwnerTag, { backgroundColor: getPlayerColor(build.owner) }]}>
        <Text style={styles.buildOwnerText}>P{build.owner + 1}</Text>
      </View>
    </View>
  );
});
```

#### Styling:
```tsx
const styles = StyleSheet.create({
  build: {
    position: 'relative',
    margin: 8,  // 8px margin (larger than loose cards)
  },
  buildOwnerTag: {
    position: 'absolute',
    top: -5,    // Positioned above the card
    left: -5,   // Positioned to the left
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buildOwnerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
```

#### Positioning Rules:
- **Margin**: 8px spacing (double loose card spacing)
- **Owner Tag**: Absolutely positioned at top-left (-5px offset)
- **Stack ID**: Unique `buildId` for identification
- **Visual Indicators**: Build value shown, owner indicated by colored tag

### 3. Temporary Stacks
Temporary stacks are staging areas during complex actions:

#### Positioning Code:
```tsx
const TempStack = memo(({
  stack,
  onDropOnCard,
  currentPlayer,
  onCancelStack,
  onConfirmStack,
  onCardPress = () => {},
  onDragStart,
  onDragEnd,
  onDragMove
}: TempStackProps) => {
  const memoizedOnDropStack = useCallback(
    (draggedItem: any) => onDropOnCard(draggedItem, { type: 'temporary_stack', stackId: stack.stackId }),
    [onDropOnCard, stack.stackId]
  );
  const stackValue = calculateCardSum(stack.cards);

  return (
    <View style={styles.build}>
      {/* Cancel Button */}
      <TouchableOpacity
        style={styles.cancelStackButton}
        onPress={() => onCancelStack(stack)}
      >
        <Text style={styles.cancelStackText}>×</Text>
      </TouchableOpacity>

      {/* Confirm Button */}
      <TouchableOpacity
        style={styles.confirmStackButton}
        onPress={() => onConfirmStack(stack)}
      >
        <Text style={styles.confirmStackText}>✓</Text>
      </TouchableOpacity>

      <CardStack
        stackId={stack.stackId}
        cards={stack.cards}
        onDropStack={memoizedOnDropStack}
        isBuild={true}
        buildValue={stackValue}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
        dragSource="temporary_stack"
      />

      {/* Staging Indicator */}
      <View style={styles.tempStackIndicator}>
        <Text style={styles.tempStackText}>Staging</Text>
      </View>
    </View>
  );
});
```

#### Styling:
```tsx
const styles = StyleSheet.create({
  cancelStackButton: {
    position: 'absolute',
    top: -10,     // Above the card
    right: -10,   // To the right
    backgroundColor: '#F44336', // Red
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  confirmStackButton: {
    position: 'absolute',
    top: -10,     // Above the card
    left: -10,    // To the left
    backgroundColor: '#4CAF50', // Green
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tempStackIndicator: {
    position: 'absolute',
    bottom: -15,  // Below the card
    left: 0,
    right: 0,
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
});
```

#### Positioning Rules:
- **Action Buttons**: Absolutely positioned at corners (cancel top-right, confirm top-left)
- **Staging Indicator**: Below the card spanning full width
- **Z-Index**: Buttons have higher z-index to appear above card
- **Dynamic Value**: Build value calculated from card sum

## CardStack Internal Positioning

### Single Card Display
```tsx
const CardStack: React.FC<CardStackProps> = memo(({
  stackId,
  cards,
  onDropStack,
  buildValue,
  isBuild = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer = 0,
  dragSource = 'table' as const
}) => {
  // Show only the top card for visual simplicity on mobile
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  return (
    <TouchableOpacity
      ref={stackRef}
      style={styles.stackContainer}
      onPress={draggable ? undefined : handlePress}
      onLayout={handleLayout}
      activeOpacity={draggable ? 1.0 : 0.7}
      disabled={draggable}
    >
      {topCard && (
        draggable ? (
          <DraggableCard
            card={topCard}
            size="normal"
            draggable={draggable}
            disabled={false}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            currentPlayer={currentPlayer}
            source={dragSource}
            stackId={stackId}
          />
        ) : (
          <Card
            card={topCard}
            size="normal"
            disabled={false}
          />
        )
      )}

      {/* Build value indicator */}
      {isBuild && buildValue !== undefined && (
        <View style={styles.buildValueContainer}>
          <Text style={styles.buildValueText}>{buildValue}</Text>
        </View>
      )}

      {/* Card count indicator for stacks with multiple cards */}
      {cardCount > 1 && (
        <View style={styles.cardCountContainer}>
          <Text style={styles.cardCountText}>{cardCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});
```

### Internal Indicators Positioning:
```tsx
const styles = StyleSheet.create({
  stackContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  buildValueContainer: {
    position: 'absolute',
    top: -8,      // Above the card
    right: -8,    // To the right
    backgroundColor: '#FFD700', // Gold
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  cardCountContainer: {
    position: 'absolute',
    bottom: -8,   // Below the card
    left: -8,     // To the left
    backgroundColor: '#2196F3', // Blue
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
```

## Drop Zone Registration and Positioning

### Global Drop Zone Management:
```tsx
// Drop zones are registered with expanded bounds for easier mobile interaction
const dropZone = {
  stackId,
  bounds: {
    x: pageX - (width * 0.15),    // 15% expansion left
    y: pageY - (height * 0.15),   // 15% expansion top
    width: width * 1.3,           // 30% total expansion
    height: height * 1.3          // 30% total expansion
  },
  onDrop: (draggedItem: any) => {
    // Handle drop logic
  }
};
```

### Layout Measurement:
```tsx
const handleLayout = (event: any) => {
  if (onDropStack) {
    const { x, y, width, height } = event.nativeEvent.layout;

    stackRef.current?.measureInWindow((pageX, pageY) => {
      // Register drop zone with absolute screen coordinates
      registerDropZone(pageX, pageY, width, height);
    });
  }
};
```

## Responsive Layout Behavior

### Flex Wrap Logic:
```tsx
cardsContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  flexWrap: 'wrap',  // Cards wrap to next line when overflowing
  paddingHorizontal: 5,
},
```

### Card Ordering:
- Cards are rendered in the order they appear in the `tableCards` array
- No automatic sorting - maintains chronological order of placement
- New cards added to the end of the array appear at the end of the layout

### Empty State:
```tsx
emptyTable: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 100,
  minWidth: 200,
},
```

## Visual Hierarchy and Z-Index Management

### Element Stacking Order:
1. **Cancel/Confirm Buttons**: `zIndex: 1` (highest)
2. **Build Owner Tags**: Default stacking
3. **Build Value Indicators**: Default stacking
4. **Card Count Indicators**: Default stacking
5. **Staging Indicators**: Default stacking
6. **Card Content**: Base layer

### Color Coding:
- **Player 0**: Orange (#FF5722) for tags and indicators
- **Player 1**: Blue (#2196F3) for tags and indicators
- **Build Values**: Gold (#FFD700) with brown border
- **Card Counts**: Blue (#2196F3) with white border
- **Action Buttons**: Red (#F44336) cancel, Green (#4CAF50) confirm
- **Staging**: Purple (#9C27B0)

## Performance Optimizations

### Memoization:
```tsx
const BuildStack = memo(({ build, onDropStack, onCardPress = () => {} }: BuildStackProps) => {
  // Component only re-renders when props change
});

const TempStack = memo(({
  stack,
  onDropOnCard,
  currentPlayer,
  onCancelStack,
  onConfirmStack,
  // ... props
}: TempStackProps) => {
  // Component only re-renders when props change
});
```

### Callback Memoization:
```tsx
const memoizedOnDropStack = useCallback(
  (draggedItem: any) => onDropStack(draggedItem, { type: 'build', buildId: build.buildId }),
  [onDropStack, build.buildId]
);
```

## Testing Scenarios

### Layout Testing:
1. **Single Card**: Verify centered positioning with proper margins
2. **Multiple Cards**: Check wrapping behavior and spacing
3. **Mixed Types**: Test builds, loose cards, and temp stacks together
4. **Overflow**: Verify cards wrap to new lines appropriately

### Interaction Testing:
1. **Drop Zones**: Ensure expanded bounds work on mobile
2. **Button Accessibility**: Verify action buttons are properly positioned
3. **Indicator Visibility**: Check that all indicators are visible and readable

### Responsive Testing:
1. **Portrait**: Test layout adaptation
2. **Landscape**: Verify optimal card arrangement
3. **Different Screen Sizes**: Ensure layout scales appropriately

## Success Criteria

### Positioning Accuracy:
- All cards properly spaced with consistent margins
- Indicators positioned correctly relative to cards
- Drop zones accurately registered with expanded bounds
- No overlapping elements blocking interactions

### Visual Consistency:
- Color coding maintained across all elements
- Typography readable at all sizes
- Casino theme preserved in all visual elements

### Performance:
- Smooth animations and transitions
- No layout thrashing during drag operations
- Efficient re-rendering with memoization

### Usability:
- Touch targets meet minimum size requirements
- Visual feedback clear for all interactions
- Layout adapts to different screen configurations
