import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { GameBoard } from '../components/GameBoard';

interface GameState {
  deck: any[];
  playerHands: any[][];
  tableCards: any[];
  playerCaptures: any[][];
  currentPlayer: number;
  round: number;
  scores: number[];
  gameOver: boolean;
  winner: number | null;
  lastCapturer: number | null;
  scoreDetails: any;
}

export const options = {
  headerShown: false,
};

export default function MultiplayerScreen() {
  console.log('[SCREEN] MultiplayerScreen rendered');
  const { gameState, playerNumber, sendAction, buildOptions, clearBuildOptions } = useSocket();

  console.log('[SCREEN] gameState:', gameState, 'playerNumber:', playerNumber);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>
          Waiting for another player to join...
        </Text>
      </View>
    );
  }

  // Render the game board when game starts
  return (
    <GameBoard
      initialState={gameState}
      playerNumber={playerNumber || 0}
      sendAction={sendAction}
      onRestart={() => console.log('Restart game')}
      onBackToMenu={() => console.log('Back to menu')}
      buildOptions={buildOptions}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
  },
  gameText: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
  },
});
