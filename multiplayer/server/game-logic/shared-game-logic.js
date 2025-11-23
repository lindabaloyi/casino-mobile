/**
 * Shared Game Logic Module (JavaScript version)
 * Provides type-safe functions for both frontend and backend
 * This is the JavaScript-compatible version of shared-game-logic.ts
 */

/**
 * Initialize a new game state with shuffled deck and dealt cards
 */
function initializeGame() {
  console.log('Initializing game state...');

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

  // Shuffle deck (Fisher-Yates algorithm)
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

/**
 * Validate that a game state has correct structure
 */
function validateGameState(gameState) {
  const errors = [];

  if (!gameState) {
    errors.push('Game state is null or undefined');
    return { valid: false, errors };
  }

  // Check required fields
  if (!Array.isArray(gameState.playerHands) || gameState.playerHands.length !== 2) {
    errors.push('playerHands must be an array of 2 elements');
  }

  if (!Array.isArray(gameState.tableCards)) {
    errors.push('tableCards must be an array');
  }

  if (!Array.isArray(gameState.playerCaptures) || gameState.playerCaptures.length !== 2) {
    errors.push('playerCaptures must be an array of 2 elements');
  }

  if (typeof gameState.currentPlayer !== 'number' || gameState.currentPlayer < 0 || gameState.currentPlayer > 1) {
    errors.push('currentPlayer must be 0 or 1');
  }

  // Validate card structure
  const validateCards = (cards, location) => {
    if (!Array.isArray(cards)) {
      errors.push(`${location} must be an array`);
      return;
    }
    cards.forEach((card, index) => {
      if (!card || typeof card !== 'object') {
        errors.push(`${location}[${index}] is not a valid card object`);
      } else if (!card.suit || !card.rank || typeof card.value !== 'number') {
        errors.push(`${location}[${index}] missing required card properties: suit, rank, value`);
      }
    });
  };

  validateCards(gameState.playerHands[0], 'playerHands[0]');
  validateCards(gameState.playerHands[1], 'playerHands[1]');
  validateCards(gameState.deck, 'deck');

  return { valid: errors.length === 0, errors };
}

/**
 * Get cards that can be captured from table
 */
function getCapturableCards(tableCards, handCard) {
  return tableCards.filter(tableCard => {
    if (tableCard.rank && !tableCard.type) {
      // Loose cards: can capture if rank matches
      return tableCard.rank === handCard.rank;
    } else if (tableCard.type === 'build') {
      // Builds: can capture if value matches hand card value
      return tableCard.value === handCard.value;
    }
    // Temporary stacks cannot be captured directly
    return false;
  });
}

/**
 * Check if a staging stack can be finalized
 */
function canFinalizeStagingStack(stack) {
  // Must have at least 1 hand card + 1 table card
  const handCards = stack.cards.filter(card => card.source === 'hand');
  const tableCards = stack.cards.filter(card => card.source === 'table');

  return handCards.length >= 1 && tableCards.length >= 1;
}

/**
 * Type guards for runtime safety
 */
function isCard(obj) {
  return obj && typeof obj === 'object' &&
         typeof obj.suit === 'string' &&
         typeof obj.rank === 'string' &&
         typeof obj.value === 'number';
}

function isTemporaryStack(obj) {
  return obj && typeof obj === 'object' &&
         obj.type === 'temporary_stack' &&
         Array.isArray(obj.cards) &&
         typeof obj.owner === 'number';
}

function isBuild(obj) {
  return obj && typeof obj === 'object' &&
         obj.type === 'build' &&
         Array.isArray(obj.cards) &&
         typeof obj.value === 'number' &&
         typeof obj.owner === 'number';
}

module.exports = {
  initializeGame,
  validateGameState,
  getCapturableCards,
  canFinalizeStagingStack,
  isCard,
  isTemporaryStack,
  isBuild
};
