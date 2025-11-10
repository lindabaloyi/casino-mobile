import React, { memo, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import CardStack from './CardStack';

interface CapturedCardsProps {
  captures: any[][]; // Array of capture groups
  playerIndex: number;
  isOpponent?: boolean;
  onCardPress?: (card: any, source: string) => void;
  isMinimal?: boolean; // Compact display mode
}

const CapturedCards = memo<CapturedCardsProps>(({
  captures,
  playerIndex,
  isOpponent = false,
  onCardPress,
  isMinimal = false
}) => {
  // Flatten all capture groups for display
  const allCapturedCards = useMemo(() => captures.flat(), [captures]);

  // Check if there are any captures
  const hasCards = allCapturedCards.length > 0;

  // Get top card for display
  const topCard = allCapturedCards[allCapturedCards.length - 1];

  const handlePress = () => {
    if (isOpponent && onCardPress && topCard) {
      onCardPress(topCard, 'opponentCapture');
    }
  };

  return (
    <View style={isMinimal ? styles.minimalCaptures : styles.captures}>
      {hasCards ? (
        <TouchableOpacity
          style={styles.stackTouchable}
          onPress={handlePress}
          activeOpacity={isOpponent ? 0.7 : 1.0}
          disabled={!isOpponent}
        >
          <CardStack
            stackId={`captures-${playerIndex}`}
            cards={allCapturedCards}
            isBuild={true}
            buildValue={allCapturedCards.length} // Show total card count
            draggable={false}
            currentPlayer={playerIndex}
            dragSource="captured"
          />
        </TouchableOpacity>
      ) : (
        <View style={isMinimal ? styles.emptyMinimalCaptures : styles.emptyCaptures}>
          {/* Empty capture pile indicator */}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  captures: {
    alignItems: 'center',
    padding: 4,
  },
  minimalCaptures: {
    alignItems: 'center',
    padding: 2,
  },
  stackTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCaptures: {
    width: 50,
    height: 70,
    borderWidth: 2,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 8,
    margin: 2,
  },
  emptyMinimalCaptures: {
    width: 40,
    height: 60,
    borderWidth: 1,
    borderColor: '#999',
    borderStyle: 'dotted',
    borderRadius: 6,
    margin: 2,
  },
});

export default CapturedCards;
