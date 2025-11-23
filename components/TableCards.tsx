import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Card, TableCard } from '../multiplayer/server/game-logic/game-state';
import { CardType } from './card';
import CardStack from './CardStack';

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

// Helper function to get card type from union types
function getCardType(card: TableCard): 'loose' | 'temporary_stack' | 'build' {
  if ('type' in card) return card.type;
  return 'loose';  // Card objects are implicitly loose cards without type property
}

const TableCards: React.FC<TableCardsProps> = ({ tableCards = [], onDropOnCard, currentPlayer, onFinalizeStack, onCancelStack, onTableCardDragStart, onTableCardDragEnd }) => {
  const tableRef = useRef<View>(null);

  const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
    // Parse stack ID to get target information
    const parts = stackId.split('-');
    const targetType = parts[0]; // 'loose', 'build', or 'temp'
    const targetIndex = parseInt(parts[1]);

    if (targetType === 'loose') {
      // Dropped on a loose card
      const targetCard = tableCards[targetIndex];

      if (targetCard && getCardType(targetCard) === 'loose') {
        const looseCard = targetCard as Card; // Type assertion for loose card
        // Check if this is a table-to-table drop
        if (draggedItem.source === 'table') {
          console.log(`🎯 Table-to-table drop: ${draggedItem.card.rank}${draggedItem.card.suit} → ${looseCard.rank}${looseCard.suit}`);
          // For table-to-table drops, we don't call onDropOnCard
          // Instead, we return a special result that will be handled by the drag end
          return {
            handled: true,
            targetType: 'loose',
            targetCard: looseCard
          };
        } else {
          // Normal hand-to-table drop
          return onDropOnCard?.(draggedItem, {
            type: 'loose',
            card: looseCard,
            index: targetIndex
          }) || false;
        }
      }
    } else if (targetType === 'build') {
      // Dropped on a build
      const targetBuild = tableCards[targetIndex];
      if (targetBuild && getCardType(targetBuild) === 'build') {
        return onDropOnCard?.(draggedItem, {
          type: 'build',
          build: targetBuild,
          index: targetIndex
        }) || false;
      }
    } else if (targetType === 'temp') {
      // Dropped on a temporary stack
      const targetStack = tableCards[targetIndex];
      if (targetStack && getCardType(targetStack) === 'temporary_stack') {
        const tempStack = targetStack as any; // Type assertion for temp stack
        return onDropOnCard?.(draggedItem, {
          type: 'temporary_stack',
          stack: tempStack,
          stackId: tempStack.stackId,
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
              // Handle different table item types using union type helper
              const itemType = getCardType(tableItem);
              if (itemType === 'loose') {
                // Loose card - use CardStack for drop zone
                const looseCard = tableItem as Card; // Type assertion for loose card
                const stackId = `loose-${index}`;
                return (
                  <CardStack
                    key={`table-card-${index}-${looseCard.rank}-${looseCard.suit}`}
                    stackId={stackId}
                    cards={[looseCard as CardType]}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    isBuild={false}
                    currentPlayer={currentPlayer}
                    draggable={true}
                    onDragStart={onTableCardDragStart}
                    onDragEnd={onTableCardDragEnd}
                    dragSource="table"
                  />
                );
              } else if (itemType === 'build') {
                // Build - use CardStack with build indicators
                const buildItem = tableItem as any; // Type assertion for build
                const stackId = `build-${index}`;
                const buildCards = buildItem.cards || [tableItem as CardType];
                return (
                  <CardStack
                    key={`table-build-${index}`}
                    stackId={stackId}
                    cards={buildCards}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    buildValue={buildItem.value}
                    isBuild={true}
                    currentPlayer={currentPlayer}
                  />
                );
              } else if (itemType === 'temporary_stack') {
                // Temporary stack - use CardStack with temp stack controls
                const tempStackItem = tableItem as any; // Type assertion for temp stack
                const stackId = `temp-${index}`;
                const tempStackCards = tempStackItem.cards || [];
                console.log(`[TableCards] Rendering temp stack:`, {
                  stackId: tempStackItem.stackId || stackId,
                  owner: tempStackItem.owner,
                  currentPlayer,
                  cardCount: tempStackCards.length,
                  cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}`)
                });
                return (
                  <CardStack
                    key={`table-temp-${index}`}
                    stackId={tempStackItem.stackId || stackId}
                    cards={tempStackCards}
                    onDropStack={(draggedItem) => handleDropOnStack(draggedItem, stackId)}
                    isBuild={false}
                    currentPlayer={currentPlayer}
                    isTemporaryStack={true}
                    stackOwner={tempStackItem.owner}
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

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B5E20', // Main board color
    padding: 10,
  },
  tableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    minWidth: 200,
  },
  cardsContainer: {
    flex: 1,
    minHeight: 180,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    flexWrap: 'wrap', // Critical: allows cards to wrap to next line
  },
  looseCardContainer: {
    margin: 4, // 4px margin on all sides for loose cards
  },
});

export default TableCards;
