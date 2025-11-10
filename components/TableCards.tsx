import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Card, { CardType } from './card';
import { TableCard } from '../utils/actionDeterminer';
import CardStack from './CardStack';

const { width: screenWidth } = Dimensions.get('window');

interface TableCardsProps {
  tableCards?: TableCard[];
  onDropOnCard?: (draggedItem: any, targetInfo: any) => boolean;
  currentPlayer: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
}

const TableCards: React.FC<TableCardsProps> = ({ tableCards = [], onDropOnCard, currentPlayer, onFinalizeStack, onCancelStack }) => {
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
        return onDropOnCard?.(draggedItem, {
          type: 'loose',
          card: targetCard,
          index: targetIndex
        }) || false;
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
