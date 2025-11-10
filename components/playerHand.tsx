import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableCard from './DraggableCard';
import { CardType } from './card';

interface PlayerHandProps {
  player: number;
  cards: CardType[];
  isCurrent: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer: number;
  tableCards?: any[];
}

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
  // Basic logic - can be enhanced later
  const canDragHandCards = isCurrent;

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
            draggable={canDragHandCards}
            disabled={!canDragHandCards}
            size="normal"
            currentPlayer={currentPlayer}
            source="hand"
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  playerHand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    flexWrap: 'wrap', // Allow cards to wrap if needed
    paddingHorizontal: 2,
  },
});

export default PlayerHand;
