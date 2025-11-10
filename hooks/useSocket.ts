import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [buildOptions, setBuildOptions] = useState<any>(null);

  useEffect(() => {
    console.log('[CLIENT] Connecting to server...');
    const newSocket = io('http://192.168.18.2:3001'); // Your computer's local IP address
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[CLIENT] Connected to server');
    });

    newSocket.on('game-start', (data: { gameState: GameState; playerNumber: number }) => {
      console.log('[CLIENT] Game started:', data);
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
    });

    newSocket.on('game-update', (updatedGameState: GameState) => {
      console.log('[CLIENT] Game state updated:', {
        currentPlayer: updatedGameState.currentPlayer,
        tableCardsCount: updatedGameState.tableCards?.length || 0,
        tableCards: updatedGameState.tableCards?.map(c => c.type ? `${c.type}(${c.owner || 'none'})` : `${c.rank}${c.suit}`) || [],
        playerHands: updatedGameState.playerHands?.map(h => h.length) || []
      });
      console.log('[CLIENT] Raw received gameState:', JSON.stringify(updatedGameState, null, 2));
      setGameState(updatedGameState);
    });

    newSocket.on('error', (error: { message: string }) => {
      console.log('[CLIENT] Server error:', error.message);
      // Could show error modal here
    });

    newSocket.on('disconnect', () => {
      console.log('[CLIENT] Disconnected from server');
    });

    newSocket.on('build-options', (options: any) => {
      console.log('[CLIENT] Build options received:', options);
      setBuildOptions(options);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const sendAction = (action: any) => {
    if (socket) {
      socket.emit('game-action', action);
    }
  };

  const clearBuildOptions = () => {
    setBuildOptions(null);
  };

  return { gameState, playerNumber, sendAction, buildOptions, clearBuildOptions };
};
