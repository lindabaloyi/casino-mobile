import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface GameState {
  players: string[];
  currentTurn: number;
  deck: string[];
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);

  useEffect(() => {
    console.log('[CLIENT] Connecting to server...');
    const newSocket = io('http://localhost:3001'); // Adjust URL as needed
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[CLIENT] Connected to server');
    });

    newSocket.on('game-start', (data: { gameState: GameState; playerNumber: number }) => {
      console.log('[CLIENT] Game started:', data);
      setGameState(data.gameState);
      setPlayerNumber(data.playerNumber);
    });

    newSocket.on('disconnect', () => {
      console.log('[CLIENT] Disconnected from server');
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

  return { gameState, playerNumber, sendAction };
};
