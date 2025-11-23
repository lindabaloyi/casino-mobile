/**
 * Shared Game Logic Module (JavaScript version)
 * Provides type-safe functions for both frontend and backend
 */

// Simple functions that work
function initializeGame() {
  console.log('🎮 [SHARED_LOGIC] Initializing game state...');

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];

  // Create deck
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: rank === 'A' ? 1 : parseInt(rank, 10)
      });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal cards - 10 cards to each of 2 players
  const playerHands = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop());
    playerHands[1].push(deck.pop());
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
}

function validateGameState(gameState) {
  console.log('🎮 [SHARED_LOGIC] Validating game state');

  const errors = [];

  if (!gameState) {
    errors.push('Game state is null or undefined');
    return { valid: false, errors };
  }

  if (!Array.isArray(gameState.playerHands) || gameState.playerHands.length !== 2) {
    errors.push('playerHands must be an array of 2 elements');
  }

  if (!Array.isArray(gameState.tableCards)) {
    errors.push('tableCards must be an array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Determine what actions are possible when dropping a card
 * Centralized action determination (moved from actionDeterminer.ts)
 */
function determineActions(draggedItem, targetInfo, gameState) {
  const timestamp = new Date().toISOString();
  console.log(`🎲 [SHARED_LOGIC-${timestamp}] START: determineActions for ${draggedItem.card.rank}${draggedItem.card.suit} → ${targetInfo.type || 'empty'}`);
  console.log(`🎲 [SHARED_LOGIC-${timestamp}] Context: Player${gameState.currentPlayer}, Turn${gameState.round}, Hand[${gameState.playerHands[gameState.currentPlayer].length}], Table[${gameState.tableCards.length}]`);

  // Simplified logic for testing - will add full logic back with logging
  const actions = [{ type: 'test', label: 'Test Action from shared logic' }];

  console.log(`🎲 [SHARED_LOGIC-${timestamp}] COMPLETE: ${actions.length} actions found - auto execute`);
  return {
    actions: actions,
    requiresModal: false,
    errorMessage: null
  };
}

module.exports = {
  initializeGame,
  validateGameState,
  determineActions
};
