# Table Card Dragging Implementation

## Overview
This document contains the complete implementation for making loose cards on the table draggable, allowing players to create temporary stacks by dragging table cards together.

## Issue Description
The dragging of loose cards in table cards was not working properly. Players could visually stack cards but the underlying functions were not handling the logic correctly for table-to-table drops.

## Solution
Implemented a comprehensive system that allows loose cards to be dragged and dropped onto each other to create temporary stacks, reusing existing temp stack logic where possible.

## Modified Files and Code

### 1. CardStack.tsx - Enhanced to support draggable loose cards

```typescript
import React, { useRef, useEffect, useState, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Card, { CardType } from './card';
import DraggableCard from './DraggableCard';

interface CardStackProps {
  stackId: string;
  cards: CardType[];
  onDropStack?: (draggedItem: any) => boolean | any;
  buildValue?: number;
  isBuild?: boolean;
  draggable?: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer?: number;
  dragSource?: string;
  isTemporaryStack?: boolean;
  stackOwner?: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
}

const CardStack = memo<CardStackProps>(({
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
  dragSource = 'table',
  isTemporaryStack = false,
  stackOwner,
  onFinalizeStack,
  onCancelStack
}) => {
  const stackRef = useRef<View>(null);
  const [isLayoutMeasured, setIsLayoutMeasured] = useState(false);
  const [dropZoneBounds, setDropZoneBounds] = useState<any>(null);

  // Register drop zone only after layout is measured with valid bounds
  useEffect(() => {
    if (!isLayoutMeasured || !dropZoneBounds || !onDropStack) return;

    // Initialize global registry if needed
    if (!(global as any).dropZones) {
      (global as any).dropZones = [];
    }

    const dropZone = {
      stackId,
      bounds: dropZoneBounds,
      onDrop: (draggedItem: any) => {
        console.log(`[CardStack] ${stackId} received drop:`, draggedItem);
        if (onDropStack) {
          return onDropStack(draggedItem);
        }
        return false;
      }
    };

    // Remove existing zone and add new one
    (global as any).dropZones = (global as any).dropZones.filter(
      (zone: any) => zone.stackId !== stackId
    );
    (global as any).dropZones.push(dropZone);

    console.log(`[CardStack] Registered drop zone for ${stackId} with bounds:`, dropZoneBounds);

    return () => {
      // Cleanup drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== stackId
        );
      }
    };
  }, [stackId, onDropStack, isLayoutMeasured, dropZoneBounds]);

  const handleLayout = (event: any) => {
    if (!onDropStack || !stackRef.current) return;

    const { width, height } = event.nativeEvent.layout;

    // Measure position on screen with retry logic for invalid measurements
    stackRef.current.measureInWindow((pageX, pageY, measuredWidth, measuredHeight) => {
      // Skip invalid measurements (often happen on first render)
      if (pageX === 0 && pageY === 0) {
        console.log(`[CardStack] Skipping invalid measurement for ${stackId}, will retry`);
        // Retry measurement after a short delay
        setTimeout(() => {
          if (stackRef.current) {
            stackRef.current.measureInWindow((retryX, retryY, retryWidth, retryHeight) => {
              if (retryX !== 0 || retryY !== 0) {
                console.log(`[CardStack] Retry measurement successful for ${stackId}`);
                updateDropZoneBounds(retryX, retryY, measuredWidth, measuredHeight);
              } else {
                console.log(`[CardStack] Retry measurement also invalid for ${stackId}`);
              }
            });
          }
        }, 100);
        return;
      }

      updateDropZoneBounds(pageX, pageY, measuredWidth, measuredHeight);
    });
  };

  const updateDropZoneBounds = (pageX: number, pageY: number, width: number, height: number) => {
    // Expand bounds by 15% on each side for easier dropping
    const newBounds = {
      x: pageX - (width * 0.15),
      y: pageY - (height * 0.15),
      width: width * 1.3,  // 30% total expansion
      height: height * 1.3
    };

    setDropZoneBounds(newBounds);
    setIsLayoutMeasured(true);
    console.log(`[CardStack] Measured bounds for ${stackId}:`, newBounds);
  };

  // Show only the top card for visual simplicity on mobile
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  console.log(`[CardStack] Rendering ${stackId}:`, {
    isTemporaryStack,
    stackOwner,
    currentPlayer,
    cardCount,
    cards: cards.map(c => `${c.rank}${c.suit}`)
  });

  return (
    <View ref={stackRef} style={styles.stackContainer} onLayout={handleLayout}>
      {topCard && (
        draggable && cardCount === 1 ? (
          <DraggableCard
            card={topCard}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            currentPlayer={currentPlayer}
            source={dragSource}
            stackId={stackId}
          />
        ) : (
          <TouchableOpacity
            style={styles.stackTouchable}
            activeOpacity={draggable ? 1.0 : 0.7}
            disabled={draggable}
          >
            <Card
              card={topCard}
              size="normal"
              disabled={false}
              draggable={draggable}
            />
          </TouchableOpacity>
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

      {/* Approve/Decline buttons for temporary stacks owned by current player */}
      {isTemporaryStack && stackOwner === currentPlayer && (
        <View style={styles.tempStackControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.approveButton]}
            onPress={() => {
              console.log(`[CardStack] Accept button pressed for ${stackId}`);
              onFinalizeStack?.(stackId);
            }}
          >
            <Text style={styles.controlButtonText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={() => {
              console.log(`[CardStack] Decline button pressed for ${stackId}`);
              onCancelStack?.(stackId);
            }}
          >
            <Text style={styles.controlButtonText}>✗</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// ... styles remain the same
```

### 2. TableCards.tsx - Added drag handlers and enabled draggability

```typescript
import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Card, { CardType } from './card';
import { TableCard } from '../utils/actionDeterminer';
import CardStack from './CardStack';
import DraggableCard from './DraggableCard';

const { width: screenWidth } = Dimensions.get('window');

interface TableCardsProps {
  tableCards?: TableCard[];
  onDropOnCard?: (draggedItem: any, targetInfo: any) => boolean;
  currentPlayer: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onTableCardDragStart?: (card: any) => void;
  onTableCardDragEnd?: (draggedItem: any, dropPosition: any) => void;
}

const TableCards: React.FC<TableCardsProps> = ({
  tableCards = [],
  onDropOnCard,
  currentPlayer,
  onFinalizeStack,
  onCancelStack,
  onTableCardDragStart,
  onTableCardDragEnd
}) => {
  const tableRef = useRef<View>(null);

  const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
    console.log(`[TableCards] Card dropped on stack ${stackId}:`, draggedItem);

    // Parse stack ID to get target information
    const parts = stackId.split('-');
    const targetType = parts[0]; // 'loose', 'build', or 'temp'
    const targetIndex = parseInt(parts[1]);

    if (targetType === 'loose') {
      // Dropped on a loose card
      const targetCard = tableCards[targetIndex];
      if (targetCard && targetCard.type === 'loose') {
        // Check if this is a table-to-table drop
        if (draggedItem.source === 'table') {
          console.log(`[TableCards] Table-to-table drop detected`);
          // For table-to-table drops, we don't call onDropOnCard
          // Instead, we return a special result that will be handled by the drag end
          return {
            handled: true,
            targetType: 'loose',
            targetCard: targetCard
          };
        } else {
          // Normal hand-to-table drop
          return onDropOnCard?.(draggedItem, {
            type: 'loose',
            card: targetCard,
            index: targetIndex
          }) || false;
        }
      }
    } else if (targetType === 'build') {
      // Dropped on a build
      const targetBuild = tableCards[targetIndex];
      if (targetBuild && targetBuild.type === 'build') {
        return onDropOnCard?.(draggedItem, {
          type: 'build',
          build: targetBuild,
          index: targetIndex
        }) || false;
      }
    } else if (targetType === 'temp') {
      // Dropped on a temporary stack
      const targetStack = tableCards[targetIndex];
      if (targetStack && targetStack.type === 'temporary_stack') {
        return onDropOnCard?.(draggedItem, {
          type: 'temporary_stack',
          stack: targetStack,
          stackId: targetStack.stackId,
          index: targetIndex
        }) || false;
      }
    }

    return false;
  }, [tableCards, onDropOnCard]);

  return (
    <View ref={tableRef} style={styles.tableContainer}>
      <View style={styles.tableArea}>
        {tableCards.length === 0 ? (
          <View style={styles.emptyTable}>
            {/* Empty table area - drop zone active */}
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {tableCards.map((tableItem, index) => {
              // Handle different table item types
              if (tableItem.type === 'loose') {
                // Loose card - use CardStack for drop zone
                const stackId = `loose-${index}`;
                return (
                  <CardStack
                    key={`table-card-${index}-${tableItem.rank}-${tableItem.suit}`}
                    stackId={stackId}
                    cards={[tableItem as CardType]}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    isBuild={false}
                    currentPlayer={currentPlayer}
                    draggable={true}
                    onDragStart={onTableCardDragStart}
                    onDragEnd={onTableCardDragEnd}
                    dragSource="table"
                  />
                );
              } else if (tableItem.type === 'build') {
                // Build - use CardStack with build indicators
                const stackId = `build-${index}`;
                const buildCards = (tableItem as any).cards || [tableItem as CardType];
                return (
                  <CardStack
                    key={`table-build-${index}`}
                    stackId={stackId}
                    cards={buildCards}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    buildValue={tableItem.value}
                    isBuild={true}
                    currentPlayer={currentPlayer}
                  />
                );
              } else if (tableItem.type === 'temporary_stack') {
                // Temporary stack - use CardStack with temp stack controls
                const stackId = `temp-${index}`;
                const tempStackCards = (tableItem as any).cards || [];
                console.log(`[TableCards] Rendering temp stack:`, {
                  stackId: tableItem.stackId || stackId,
                  owner: (tableItem as any).owner,
                  currentPlayer,
                  cardCount: tempStackCards.length,
                  cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}`)
                });
                return (
                  <CardStack
                    key={`table-temp-${index}`}
                    stackId={tableItem.stackId || stackId}
                    cards={tempStackCards}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    isBuild={false}
                    currentPlayer={currentPlayer}
                    isTemporaryStack={true}
                    stackOwner={(tableItem as any).owner}
                    onFinalizeStack={onFinalizeStack}
                    onCancelStack={onCancelStack}
                  />
                );
              }
              return null;
            })}
          </View>
        )}
      </View>
    </View>
  );
};

// ... styles remain the same
```

### 3. GameBoard.tsx - Added table card drag handlers

```typescript
// ... existing imports and interfaces

export function GameBoard({ initialState, playerNumber, sendAction, onRestart, onBackToMenu, buildOptions }: GameBoardProps) {
  // ... existing state and effects

  const handleTableCardDragStart = useCallback((card: any) => {
    console.log(`[GameBoard] Table card drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`[GameBoard] Not my turn, ignoring table card drag start`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleTableCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[GameBoard] Table card drag end:`, draggedItem, dropPosition);
    setDraggedCard(null);
    setIsDragging(false);

    // Handle table-to-table drops
    if (dropPosition.handled) {
      console.log(`[GameBoard] Table card drop was handled by a zone`);
      // Check if it was dropped on another table card
      if (dropPosition.targetType === 'loose') {
        console.log(`[GameBoard] Table card dropped on another table card`);
        sendAction({
          type: 'tableCardDrop',
          payload: {
            draggedCard: draggedItem.card,
            targetCard: dropPosition.targetCard
          }
        });
      }
      return;
    }

    // If not handled by any zone, it's an invalid drop - snap back
    console.log(`[GameBoard] Table card drop not handled, snapping back`);
  }, [sendAction]);

  // ... existing code

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* ... existing JSX */}
      <TableCards
        tableCards={gameState.tableCards}
        onDropOnCard={handleDropOnCard}
        currentPlayer={playerNumber}
        onFinalizeStack={handleFinalizeStack}
        onCancelStack={handleCancelStack}
        onTableCardDragStart={handleTableCardDragStart}
        onTableCardDragEnd={handleTableCardDragEnd}
      />
      {/* ... rest of JSX */}
    </SafeAreaView>
  );
}
```

### 4. DraggableCard.tsx - Enhanced drop handling

```typescript
// ... existing code

const DraggableCard: React.FC<DraggableCardProps> = ({
  // ... existing props
}) => {
  // ... existing pan responder setup

  const panResponder = PanResponder.create({
    // ... existing config

    onPanResponderRelease: (event, gestureState) => {
      const dropPosition: any = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
        handled: false,
        attempted: false
      };

      // ... existing drop zone checking logic

      if (bestZone) {
        dropPosition.attempted = true;
        const draggedItem = {
          card,
          source,
          player: currentPlayer,
          stackId: stackId || undefined
        };

        console.log(`[DraggableCard] Dropping on zone:`, bestZone.stackId);
        const dropResult = bestZone.onDrop(draggedItem);
        if (dropResult) {
          dropPosition.handled = true;
          console.log(`[DraggableCard] Drop handled successfully`);

          // Check if dropResult is an object with additional info (for table-to-table drops)
          if (typeof dropResult === 'object' && dropResult.targetType) {
            dropPosition.targetType = dropResult.targetType;
            dropPosition.targetCard = dropResult.targetCard;
            console.log(`[DraggableCard] Special drop result:`, dropResult);
          }
        } else {
          console.log(`[DraggableCard] Drop was not handled by zone`);
        }
      }

      // ... existing animation and cleanup logic
    },

    // ... existing terminate handler
  });

  // ... existing return statement
};
```

### 5. game-actions.js - Added table card drop handlers

```javascript
/**
 * Handles dragging a loose card from the table to create a temporary stack.
 * This allows players to combine loose cards on the table for strategic captures.
 * @param {object} gameState - The current game state.
 * @param {object} draggedCard - The card being dragged from the table.
 * @param {object} targetCard - The target card on the table to stack with.
 * @returns {object} The updated game state with the new temporary stack.
 */
const handleTableCardDrop = (gameState, draggedCard, targetCard) => {
  const { tableCards, currentPlayer } = gameState;

  console.log(`[handleTableCardDrop] Creating temp stack: ${draggedCard.rank}${draggedCard.suit} on ${targetCard.rank}${targetCard.suit}`);

  // Validate that both cards are loose cards
  if (draggedCard.type !== 'loose' || targetCard.type !== 'loose') {
    console.error('[handleTableCardDrop] Both cards must be loose cards');
    return gameState;
  }

  // Check if player already has a temporary stack
  const existingStack = tableCards.find(
    card => card.type === 'temporary_stack' && card.owner === currentPlayer
  );

  if (existingStack) {
    console.log('[handleTableCardDrop] Player already has a temp stack, adding to existing');
    return handleAddToTemporaryCaptureStack(gameState, draggedCard, existingStack);
  }

  // Create new temporary stack with proper ordering (smaller cards on top)
  const draggedValue = rankValue(draggedCard.rank);
  const targetValue = rankValue(targetCard.rank);
  const orderedCards = draggedValue < targetValue
    ? [{ ...targetCard, source: 'table' }, { ...draggedCard, source: 'table' }]
    : [{ ...draggedCard, source: 'table' }, { ...targetCard, source: 'table' }];

  const newStack = {
    stackId: `temp_table_${Date.now()}`,
    type: 'temporary_stack',
    cards: orderedCards,
    owner: currentPlayer,
    totalValue: draggedValue + targetValue
  };

  // Remove both cards from table and add the stack
  const newTableCards = tableCards
    .filter(c => c !== draggedCard && c !== targetCard)
    .concat(newStack);

  console.log(`[handleTableCardDrop] Created temp stack with ${orderedCards.length} cards, total value: ${newStack.totalValue}`);

  return updateGameState(gameState, { tableCards: newTableCards });
};

/**
 * Adds a loose card from the table to an existing temporary stack.
 * @param {object} gameState - The current game state.
 * @param {object} draggedCard - The card being added to the stack.
 * @param {object} targetStack - The existing temporary stack.
 * @returns {object} The updated game state.
 */
const handleAddToTemporaryCaptureStack = (gameState, draggedCard, targetStack) => {
  console.log(`[handleAddToTemporaryCaptureStack] Adding ${draggedCard.rank}${draggedCard.suit} to stack ${targetStack.stackId}`);

  // Validate card is loose
  if (draggedCard.type !== 'loose') {
    console.error('[handleAddToTemporaryCaptureStack] Only loose cards can be added to temporary stacks');
    return gameState;
  }

  // Check stack size limit (optional, default 5)
  if (targetStack.cards.length >= 5) {
    console.error('[handleAddToTemporaryCaptureStack] Stack is full');
    return gameState;
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

  console.log(`[handleAddToTemporaryCaptureStack] Stack now has ${updatedStack.cards.length} cards, total value: ${updatedStack.totalValue}`);

  return updateGameState(gameState, { tableCards: newTableCards });
};
```

### 6. server/index.js - Added tableCardDrop case

```javascript
// ... existing cases

case 'tableCardDrop':
  console.log(`[SERVER] Player ${playerIndex} dropping table card:`, data.payload);
  const { draggedCard: tableDraggedCard, targetCard: tableTargetCard } = data.payload;
  newGameState = handleTableCardDrop(gameState, tableDraggedCard, tableTargetCard);
  break;

// ... rest of cases
```

## How It Should Work

1. **Player drags a loose card** from the table
2. **Drops it on another loose card** on the table
3. **TableCards detects table-to-table drop** and returns special result
4. **DraggableCard captures target info** and passes to GameBoard
5. **GameBoard sends tableCardDrop action** to server
6. **Server calls handleTableCardDrop** to create temp stack
7. **Stack appears with accept/cancel buttons**
8. **Player clicks accept** → existing finalizeStagingStack logic handles capture/build options

## Current Issues

- Cards can be stacked visually but the server logic may not be creating proper temporary stacks
- The table-to-table drop detection might not be working correctly
- Stack finalization may not be offering the correct capture/build options

## Debugging Steps

1. Check console logs for drag/drop events
2. Verify tableCardDrop action is being sent to server
3. Confirm handleTableCardDrop is creating stacks properly
4. Test stack finalization with existing temp stack logic

## Next Steps

- Test the drag/drop functionality thoroughly
- Debug server-side stack creation
- Ensure stack finalization works with table-created stacks
- Add proper error handling for invalid table drops
