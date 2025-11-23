import * as NavigationBar from 'expo-navigation-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameState } from '../multiplayer/server/game-logic/game-state';
import { determineActions } from '../multiplayer/server/game-logic/shared-game-logic';
import ActionModal from './ActionModal';
import BurgerMenu from './BurgerMenu';
import CapturedCards from './CapturedCards';
import ErrorModal from './ErrorModal';
import PlayerHand from './playerHand';
import TableCards from './TableCards';

interface GameBoardProps {
  initialState: GameState;
  playerNumber: number;
  sendAction: (action: any) => void;
  onRestart?: () => void;
  onBackToMenu?: () => void;
  buildOptions?: any;
  onBuildOptionSelected?: (option: any) => void;
}

export function GameBoard({ initialState, playerNumber, sendAction, onRestart, onBackToMenu, buildOptions }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [draggedCard, setDraggedCard] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTurnState, setDragTurnState] = useState<any>(null);
  const [modalInfo, setModalInfo] = useState<any>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string } | null>(null);
  const tableSectionRef = useRef<View>(null);

  // Update game state when initialState changes
  useEffect(() => {
    setGameState(initialState);
  }, [initialState]);

  // Handle build options when they arrive
  useEffect(() => {
    if (buildOptions && buildOptions.options) {
      console.log('[GameBoard] Build options received:', buildOptions);

      // Handle different types of options (builds, captures, etc.)
      const actions = buildOptions.options.map((option: any) => {
        if (option.type === 'build') {
          return {
            type: 'createBuildWithValue',
            label: option.label,
            payload: {
              stack: buildOptions.stack,
              buildValue: option.payload.value
            }
          };
        } else if (option.type === 'capture') {
          return {
            type: 'executeCaptureFromStack',
            label: option.label,
            payload: {
              stack: buildOptions.stack,
              targetCard: option.payload.targetCard,
              captureValue: option.payload.value
            }
          };
        }
        // Fallback for unknown types
        return {
          type: 'createBuildWithValue',
          label: option.label,
          payload: {
            stack: buildOptions.stack,
            buildValue: option.payload?.value || option
          }
        };
      });

      setModalInfo({
        title: 'Choose Action',
        message: 'What would you like to do with this stack?',
        actions
      });
    }
  }, [buildOptions]);

  // Hide navigation bar when entering game
  useEffect(() => {
    const hideNavBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          console.log('[GAMEBOARD] Navigation bar hidden for gameplay');
        } catch (error) {
          console.warn('[GAMEBOARD] Failed to hide navigation bar:', error);
        }
      }
    };

    hideNavBar();
  }, []);

  const isMyTurn = gameState.currentPlayer === playerNumber;

  const handleDragStart = useCallback((card: any) => {
    console.log(`[GameBoard] handleDragStart: isMyTurn=${isMyTurn}, card=${card?.rank}${card?.suit}`);
    if (!isMyTurn) {
      console.log(`[GameBoard] Not my turn, ignoring drag start`);
      return;
    }
    // Store turn state at drag start to prevent race conditions
    setDragTurnState({ isMyTurn: true, currentPlayer: gameState.currentPlayer });
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn, gameState.currentPlayer]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
    console.log(`[GameBoard] handleDropOnCard called:`, {
      draggedItem,
      targetInfo,
      isMyTurn,
      currentPlayer: gameState.currentPlayer,
      playerNumber
    });

    if (!isMyTurn) {
      console.log(`[GameBoard] Not player's turn - rejecting drop`);
      setErrorModal({
        visible: true,
        title: 'Not Your Turn',
        message: 'Please wait for your turn.'
      });
      return false;
    }

    // NEW AUTOMATIC TEMP STACK LOGIC per PRD
    if (targetInfo.type === 'loose') {
      // Automatically create temp stack when dropping hand card on loose card
      console.log(`[GameBoard] Auto-creating temp stack: hand card ${draggedItem.card.rank}${draggedItem.card.suit} on loose card ${targetInfo.card?.rank}${targetInfo.card?.suit}`);

      // Find target card among loose cards using type guard
      const targetCard = gameState.tableCards.find(c => {
        if ('rank' in c && 'suit' in c) {
          return c.rank === targetInfo.card?.rank && c.suit === targetInfo.card?.suit;
        }
        return false;
      });

      if (targetCard) {
        // Check if player already has a temp stack using type checks
        const hasTempStack = gameState.tableCards.some(c => {
          if ('type' in c && 'owner' in c) {
            return c.type === 'temporary_stack' && c.owner === playerNumber;
          }
          return false;
        });

        console.log(`[GameBoard] Player ${playerNumber} has temp stack already: ${hasTempStack}`);

        if (!hasTempStack) {
          console.log(`[GameBoard] Sending createStagingStack action`);
          sendAction({
            type: 'createStagingStack',
            payload: {
              handCard: draggedItem.card,
              tableCard: targetCard
            }
          });
          console.log(`[GameBoard] Temp stack creation action sent successfully`);
          return true;
        } else {
          console.log(`[GameBoard] Blocking temp stack creation - already has one`);
          setErrorModal({
            visible: true,
            title: 'Temp Stack Limit',
            message: 'You can only have one temporary stack at a time.'
          });
          return false;
        }
      } else {
        console.log(`[GameBoard] Target card not found in tableCards`);
      }
    }

    // For other drop types, use the existing modal logic
    console.log(`[GameBoard] Determining actions for drop`);

    // Create compatibility GameState for determineActions function
    // TODO: Remove this conversion once determineActions is updated to new types
    const compatGameState = {
      tableCards: gameState.tableCards.map(card => {
        if ('type' in card) {
          // Already properly typed
          return card;
        } else {
          // Convert loose Card to TableCard format
          return { ...card, type: 'loose' } as any;
        }
      }),
      playerHands: gameState.playerHands,
      currentPlayer: gameState.currentPlayer,
      round: gameState.round
    };

    const result = determineActions(draggedItem, targetInfo, compatGameState);

    if (result.errorMessage) {
      console.log(`[GameBoard] Action determination error:`, result.errorMessage);
      setErrorModal({
        visible: true,
        title: 'Invalid Move',
        message: result.errorMessage
      });
      return false;
    }

    if (result.actions.length > 0) {
      if (result.requiresModal) {
        // Show modal for multiple choices or strategic decisions
        console.log(`[GameBoard] Showing modal with ${result.actions.length} actions`);
        setModalInfo({
          title: 'Choose Your Action',
          message: 'What would you like to do?',
          actions: result.actions
        });
        return true;
      } else {
        // Execute single automatic action directly
        console.log(`[GameBoard] Executing automatic action:`, result.actions[0]);
        sendAction(result.actions[0]);
        return true;
      }
    } else {
      // No actions possible
      console.log(`[GameBoard] No actions possible`);
      setErrorModal({
        visible: true,
        title: 'Invalid Move',
        message: 'No valid actions possible with this card.'
      });
      return false;
    }
  }, [sendAction, isMyTurn, playerNumber, gameState]);

  const handleModalAction = useCallback((action: any) => {
    console.log(`[GameBoard] Modal action selected:`, action);
    sendAction(action);
    setModalInfo(null);
  }, [sendAction]);

  const handleModalCancel = useCallback(() => {
    console.log(`[GameBoard] Modal cancelled`);
    setModalInfo(null);
  }, []);

  const handleErrorModalClose = useCallback(() => {
    console.log(`[GameBoard] Error modal closed`);
    setErrorModal(null);
  }, []);

  const handleFinalizeStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Finalizing stack:`, stackId);
    const stack = gameState.tableCards.find(c => 'stackId' in c && c.stackId === stackId);
    if (stack && 'stackId' in stack) {
      sendAction({
        type: 'finalizeStagingStack',
        payload: { stack }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [sendAction, gameState.tableCards]);

  const handleCancelStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Canceling stack:`, stackId);
    const stackToCancel = gameState.tableCards.find(c => 'stackId' in c && c.stackId === stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      sendAction({
        type: 'cancelStagingStack',
        payload: { stackToCancel }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [sendAction, gameState.tableCards]);

  const handleTableCardDragStart = useCallback((card: any) => {
    console.log(`🎴 Table drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`❌ Not your turn - ignoring table drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleTableCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[GameBoard] Table card drag end:`, draggedItem, dropPosition);
    console.log(`[GameBoard] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit}`);
    console.log(`[GameBoard] Drop position handled: ${dropPosition.handled}`);
    console.log(`[GameBoard] Drop position targetType: ${dropPosition.targetType}`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle table-to-table drops
    if (dropPosition.handled) {
      console.log(`[GameBoard] Table card drop was handled by a zone`);
      // Check if it was dropped on another table card
      if (dropPosition.targetType === 'loose') {
        console.log(`[GameBoard] Table card dropped on another table card - sending tableCardDrop action`);
        console.log(`[GameBoard] Target card: ${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}`);

        const actionPayload = {
          type: 'tableCardDrop',
          payload: {
            draggedCard: draggedItem.card,
            targetCard: dropPosition.targetCard
          }
        };

        console.log(`[GameBoard] Sending action:`, actionPayload);
        sendAction(actionPayload);
        console.log(`[GameBoard] tableCardDrop action sent successfully`);
      } else {
        console.log(`[GameBoard] Drop target type is not 'loose': ${dropPosition.targetType}`);
      }
      return;
    }

    // If not handled by any zone, it's an invalid drop - snap back
    console.log(`[GameBoard] Table card drop not handled, snapping back`);
  }, [sendAction]);

  // Register table section as drop zone
  useEffect(() => {
    const registerDropZone = () => {
      if (tableSectionRef.current) {
        tableSectionRef.current.measureInWindow((pageX, pageY, width, height) => {
          const dropZone = {
            stackId: 'table-section',
            bounds: {
              x: pageX,
              y: pageY,
              width: width,
              height: height
            },
            onDrop: (draggedItem: any) => {
              console.log('[GameBoard] Card dropped on table section:', draggedItem);
              // Handle trail action
              return handleDropOnCard(draggedItem, {
                type: 'table',
                area: 'empty'
              });
            }
          };

          // Initialize global registry if needed
          if (!(global as any).dropZones) {
            (global as any).dropZones = [];
          }

          // Remove existing table zone and add new one
          (global as any).dropZones = (global as any).dropZones.filter(
            (zone: any) => zone.stackId !== 'table-section'
          );
          (global as any).dropZones.push(dropZone);

          console.log('[GameBoard] Registered table section drop zone:', dropZone);
        });
      }
    };

    // Register after a short delay to ensure layout is complete
    const timer = setTimeout(registerDropZone, 100);

    return () => {
      clearTimeout(timer);
      // Clean up drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== 'table-section'
        );
      }
    };
  }, [handleDropOnCard]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BurgerMenu onRestart={onRestart || (() => {})} onEndGame={onBackToMenu || (() => {})} />

      {/* Status Section */}
      <View style={styles.statusSection}>
        <Text style={styles.statusText}>Round: {gameState.round}</Text>
        <View style={[styles.playerTurnTag, {
          backgroundColor: gameState.currentPlayer === 0 ? '#FF5722' : '#2196F3'
        }]}>
          <Text style={styles.playerTurnText}>P{gameState.currentPlayer + 1}</Text>
        </View>
      </View>

      {/* Main Game Area */}
      <View style={styles.mainGameArea}>
        {/* Table Cards Section */}
        <View ref={tableSectionRef} style={styles.tableCardsSection}>
          <TableCards
            tableCards={gameState.tableCards}
            onDropOnCard={handleDropOnCard}
            currentPlayer={playerNumber}
            onFinalizeStack={handleFinalizeStack}
            onCancelStack={handleCancelStack}
            onTableCardDragStart={handleTableCardDragStart}
            onTableCardDragEnd={handleTableCardDragEnd}
          />
        </View>

        {/* Opponent Captured Section */}
        <View style={styles.opponentCapturedSection}>
          <CapturedCards
            captures={gameState.playerCaptures?.[(playerNumber + 1) % 2] || []}
            playerIndex={(playerNumber + 1) % 2}
            isOpponent={true}
            isMinimal={true}
          />
        </View>
      </View>

      {/* Player Hands Section */}
      <View style={styles.playerHandsSection}>
        <View style={styles.playerHandArea}>
          <PlayerHand
            player={playerNumber}
            cards={gameState.playerHands?.[playerNumber] || []}
            isCurrent={isMyTurn}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            currentPlayer={playerNumber}
            tableCards={gameState.tableCards || []}
          />
        </View>
        <View style={styles.playerCapturedArea}>
          <CapturedCards
            captures={gameState.playerCaptures?.[playerNumber] || []}
            playerIndex={playerNumber}
            isOpponent={false}
            isMinimal={true}
          />
        </View>
      </View>

      {/* Modals */}
      <ActionModal
        modalInfo={modalInfo}
        onAction={handleModalAction}
        onCancel={handleModalCancel}
      />
      <ErrorModal
        visible={errorModal !== null}
        title={errorModal?.title || ''}
        message={errorModal?.message || ''}
        onClose={handleErrorModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20', // Dark green casino table
  },
  statusSection: {
    height: 60,
    backgroundColor: '#2E7D32', // Medium green
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerTurnTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  playerTurnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainGameArea: {
    flex: 1,
    flexDirection: 'row',
  },
  tableCardsSection: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#4CAF50',
  },
  opponentCapturedSection: {
    flex: 1,
    maxWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerHandsSection: {
    height: 140,
    flexDirection: 'row',
  },
  playerHandArea: {
    flex: 4, // 80% of the width
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
    paddingHorizontal: 5,
  },
  playerCapturedArea: {
    flex: 1, // 20% of the width
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
    borderLeftWidth: 1,
    borderLeftColor: '#4CAF50',
    paddingHorizontal: 5,
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
  },
});

export default GameBoard;
