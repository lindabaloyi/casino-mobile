PRD: Initial Game & Card Setup for Multiplayer
1. Overview
This document outlines the requirements for the initial setup of a multiplayer match in the Casino Card Game. It covers the visual design of the cards, the server-side logic for creating and dealing the deck, and the client-side UI logic for positioning the cards on the game board from each player's perspective.

2. Card Design and Rendering
The visual representation of a card is handled by a reusable Card component. This component is responsible for displaying the rank and suit with appropriate styling.

2.1. UI Component
The Card component is a TouchableOpacity that displays the card's rank and suit. Its appearance can be modified via props for different sizes, states (selected, disabled), and interactions.

Code: components/card.tsx
This component defines the fundamental look and feel of every card in the game.

typescriptreact
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

type CardType = {
  rank: string;
  suit: string;
};

type CardProps = {
  card: CardType;
  onPress?: (card: CardType) => void;
  onDragStart?: (event: GestureResponderEvent) => void;
  onDragEnd?: (event: GestureResponderEvent) => void;
  draggable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: "normal" | "small" | "large";
};

const Card: React.FC<CardProps> = ({
  card,
  onPress,
  onDragStart,
  onDragEnd,
  draggable = false,
  selected = false,
  disabled = false,
  size = 'normal'
}) => {

  const getSuitColor = (suit: string): string => {
    return (suit === '♥' || suit === '♦') ? '#FF0000' : '#000000';
  };

  const getCardSize = (): { width: number; height: number } => {
    switch (size) {
      case 'small':
        return { width: 40, height: 56 };
      case 'large':
        return { width: 80, height: 112 };
      default:
        return { width: 60, height: 84 };
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(card)}
      disabled={disabled}
      style={[
        styles.card,
        getCardSize(),
        selected && styles.selectedCard,
        disabled && styles.disabledCard,
      ]}
    >
      <Text style={[
        styles.rank,
        { color: getSuitColor(card.suit) },
        size === 'small' && styles.smallText
      ]}>
        {card.rank}
      </Text>
      <Text style={[
        styles.suit,
        { color: getSuitColor(card.suit) },
        size === 'small' && styles.smallText
      ]}>
        {card.suit}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    margin: 2,
  },
  selectedCard: {
    borderColor: '#007AFF',
    borderWidth: 3,
    backgroundColor: '#E3F2FD',
  },
  disabledCard: {
    opacity: 0.5,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  suit: {
    fontSize: 14,
    textAlign: 'center',
  },
  smallText: {
    fontSize: 12,
  },
});

export default Card;
export type { CardType, CardProps };
3. Game Initialization and Card Dealing
The entire game setup process is managed by the server to ensure a single source of truth and prevent cheating. When two players connect, the server creates, shuffles, and deals the cards.

3.1. Server-Side Logic
The initializeGame function is called on the server once two players are in the lobby. It performs the following steps:

Creates a 40-card deck.
Shuffles the deck using the Fisher-Yates algorithm.
Deals 10 cards alternately to each of the two players.
Initializes the game state object with the player hands, the remaining deck, and sets currentPlayer to 0.
Code: server/server.js (Game Initialization)
This logic is triggered within the connection event handler in your main server file.

javascript
// From: c:\Users\LB\Desktop\Linda Baloyi\MadGames\casino-game-multiplayer-official-main\server\server.js

// ... (inside io.on('connection', ...))
  if (players.length === 2) {
    // Start the game
    gameState = initializeGame(); // initializeGame is called here
    console.log('Two players connected. Starting game...');

    // Emit game state to both players
    players.forEach((playerSocket, index) => {
      console.log(`Emitting game-start to playerSocket ${playerSocket.id} as playerNumber ${index}`);
      playerSocket.emit('game-start', { gameState, playerNumber: index });
    });
  }
// ...
Code: Game State Initialization Logic
This function, defined in your game logic files and documented in CARDS_GAME_SETUP_PRD.md, contains the core setup process.

javascript
// Based on: c:\Users\LB\Desktop\Linda Baloyi\MadGames\casino-game-multiplayer-official-main\CARDS_GAME_SETUP_PRD.md
const initializeGame = () => {
  // Helper to get card value
  const rankValue = (rank) => {
    if (rank === 'A') return 1;
    return parseInt(rank, 10);
  };

  // Helper to shuffle the deck
  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 1. Create Deck
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }

  // 2. Shuffle Deck
  deck = shuffleDeck(deck);

  // 3. Deal Cards
  const playerHands = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop()); // Player 0
    playerHands[1].push(deck.pop()); // Player 1
  }

  // 4. Return Initial Game State
  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0, // Player 0 starts
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
};
4. Card Positioning on the Multiplayer Game Board
The GameBoard component renders the UI based on the gameState received from the server. It uses the playerNumber prop to display the correct perspective for each player (i.e., showing their own hand at the bottom and the opponent's captured cards at the side).

4.1. UI Layout and Perspective
The MultiplayerGameBoard component is structured into several sections. The PlayerHandsSection is responsible for rendering the current player's hand, while the OpponentCapturedSection renders the opponent's captured cards.

Code: components/GameBoard.tsx (Layout Sections)
These memoized components ensure that the UI is rendered efficiently, updating only when their specific data changes.

typescriptreact
// From: c:\Users\LB\Desktop\Linda Baloyi\MadGames\casino-game-multiplayer-official-main\components\GameBoard.tsx

// Opponent's captured cards are displayed in a minimal, non-interactive list.
const OpponentCapturedSection = React.memo(({ playerCaptures, currentPlayer, onCardPress = () => {}, onDragStart, onDragEnd, onDragMove }: { playerCaptures: any[], currentPlayer: number, onCardPress?: (card: any, source: string) => void, onDragStart: (card: any) => void, onDragEnd: (card: any, position: any) => void, onDragMove: (card: any, position: any) => void }) => {
  const opponentIndex = 1 - currentPlayer;
  const capturedGroups = playerCaptures[opponentIndex] || [];
  // ... rendering logic for opponent's cards
  return (
    <View style={styles.opponentCapturedList}>
      <CapturedCards
        captures={capturedGroups}
        playerIndex={opponentIndex}
        // ... other props
      />
    </View>
  );
});


// The current player's hand and their own captured cards are displayed at the bottom.
const PlayerHandsSection = React.memo(({ playerHands, currentPlayer, onDragStart, onDragEnd, onDragMove, playerCaptures, tableCards, onCardPress = () => {}, isMyTurn }: { playerHands: any[], currentPlayer: number, onDragStart: (card: any) => void, onDragEnd: (card: any, position: any) => void, onDragMove: (card: any, position: any) => void, playerCaptures: any[], tableCards: any[], onCardPress?: (card: any, source: string) => void, isMyTurn: boolean }) => {
  // Convert 1-based currentPlayer to 0-based for array access
  const playerIndex = currentPlayer >= 1 ? currentPlayer - 1 : currentPlayer;

  return (
    <View style={styles.playerHandsSection}>
      <View style={styles.playerHandArea}>
        {/* ... Header ... */}
        <PlayerHand
          player={playerIndex}
          cards={playerHands[playerIndex]} // Shows cards for the correct player
          isCurrent={isMyTurn}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragMove={onDragMove}
          currentPlayer={currentPlayer}
          tableCards={tableCards}
        />
      </View>
      <PlayerCapturedSection
        playerCaptures={playerCaptures}
        currentPlayer={playerIndex}
        onCardPress={onCardPress}
      />
    </View>
  );
});
Code: components/playerHand.tsx (Rendering Draggable Cards)
The PlayerHand component receives the cards for the specific player and renders them as DraggableCard components, which are only enabled if it is the current player's turn.

typescriptreact
// From: c:\Users\LB\Desktop\Linda Baloyi\MadGames\casino-game-multiplayer-official-main\components\playerHand.tsx
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
  // ... logic to disable dragging if a card is already in a staging stack ...
  const hasUsedHandCardInTurn = tableCards.some(/* ... */);
  const canDragHandCards = isCurrent && !hasUsedHandCardInTurn;

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

const styles = StyleSheet.create({
  playerHand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
});

export default PlayerHand;