// Action determination logic for Casino card game
// Determines what actions are possible when a card is played

export interface Card {
  suit: string;
  rank: string;
  value: number;
}

export interface DraggedItem {
  card: Card;
  source: string;
  player: number;
  stackId?: string;
}

export interface TableCard {
  type: 'loose' | 'build' | 'temporary_stack';
  suit?: string;
  rank?: string;
  value?: number;
  cards?: Card[];
  owner?: number;
  buildId?: string;
  stackId?: string;
  isExtendable?: boolean;
}

export interface GameState {
  tableCards: TableCard[];
  playerHands: Card[][];
  currentPlayer: number;
  round: number;
}

export interface Action {
  type: string;
  label: string;
  payload: any;
  priority?: number;
}

export interface ActionResult {
  actions: Action[];
  requiresModal: boolean;
  errorMessage: string | null;
}

// Helper function to get card value
const rankValue = (rank: string): number => {
  if (rank === 'A') return 1;
  return parseInt(rank, 10);
};

// Find possible capture actions for a dragged card
const findPossibleCaptures = (card: Card, tableCards: TableCard[]): Action[] => {
  const actions: Action[] = [];
  const cardValue = rankValue(card.rank);

  tableCards.forEach((tableItem, index) => {
    if (tableItem.type === 'loose') {
      // Single card capture - check rank match
      const looseCard = tableItem as any; // Type assertion for loose card
      if (looseCard.rank && rankValue(looseCard.rank) === cardValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${looseCard.rank}${looseCard.suit || ''}`,
          payload: {
            draggedItem: { card, source: 'hand' },
            selectedTableCards: [looseCard],
            targetCard: looseCard,
            tableIndex: index
          }
        });
      }
    } else if (tableItem.type === 'build') {
      // Build capture - check build value match
      const build = tableItem as any; // Type assertion for build
      if (build.value && build.value === cardValue) {
        actions.push({
          type: 'capture',
          label: `Capture Build (${build.value})`,
          payload: {
            draggedItem: { card, source: 'hand' },
            targetCard: build,
            tableIndex: index
          }
        });
      }
    }
    // Add more capture type checks as needed...
  });

  return actions;
};

// Check if player has an active build (for round 1 restrictions)
const hasActiveBuild = (tableCards: TableCard[], playerIndex: number): boolean => {
  return tableCards.some(card =>
    card.type === 'build' && card.owner === playerIndex
  );
};

// Check if trailing this card would create a duplicate loose card
const wouldCreateDuplicateLooseCard = (card: Card, tableCards: TableCard[]): boolean => {
  const cardValue = rankValue(card.rank);
  return tableCards.some(tableItem =>
    tableItem.type === 'loose' &&
    tableItem.rank &&
    rankValue(tableItem.rank) === cardValue
  );
};

// Enhanced action analyzer with temp stack support
export const determineActions = (
  draggedItem: DraggedItem,
  targetInfo: any,
  gameState: GameState
): ActionResult => {
  const actions: Action[] = [];
  const { card: draggedCard } = draggedItem;
  const { tableCards, playerHands, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Only handle hand cards for now (simplify)
  if (draggedItem.source !== 'hand') {
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'Only hand cards supported'
    };
  }

  const draggedValue = rankValue(draggedCard.rank);

  // 1. Check for captures on all table cards
  tableCards.forEach(tableCard => {
    if (tableCard.type === 'loose') {
      const cardValue = tableCard.rank ? rankValue(tableCard.rank) : 0;
      if (cardValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${tableCard.rank}`,
          payload: {
            draggedItem,
            selectedTableCards: [tableCard],
            targetCard: tableCard
          }
        });
      }
    } else if (tableCard.type === 'build') {
      if (tableCard.value === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture Build (${tableCard.value})`,
          payload: {
            draggedItem,
            targetCard: tableCard
          }
        });
      }
    }
  });

  // 2. Check for temp stack creation (if dropping on loose card)
  if (targetInfo.type === 'loose') {
    const targetCard = tableCards.find(c =>
      c.type === 'loose' && c.rank === targetInfo.card?.rank && c.suit === targetInfo.card?.suit
    );

    if (targetCard) {
      const targetValue = targetCard.rank ? rankValue(targetCard.rank) : 0;

      // Check if immediate build is possible
      let canBuildImmediately = false;
      const possibleBuilds = [
        draggedValue,                    // Same value build (e.g., 4+4=4)
        draggedValue + targetValue       // Sum build (e.g., 4+4=8)
      ];

      possibleBuilds.forEach(buildValue => {
        const hasCaptureCard = playerHand.some(card =>
          rankValue(card.rank) === buildValue &&
          !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
        );

        const hasExistingBuild = tableCards.some(card =>
          card.type === 'build' && card.owner === currentPlayer
        );

        if (hasCaptureCard && !hasExistingBuild && buildValue <= 10) {
          canBuildImmediately = true;
          const label = buildValue === draggedValue
            ? `Build ${buildValue}`
            : `Build ${buildValue} (${draggedValue}+${targetValue})`;

          actions.push({
            type: 'build',
            label,
            payload: {
              draggedItem,
              tableCardsInBuild: [targetCard],
              buildValue,
              biggerCard: draggedValue > targetValue ? draggedCard : targetCard,
              smallerCard: draggedValue < targetValue ? draggedCard : targetCard
            }
          });
        }
      });

      // TEMP STACKS ARE NOW AUTOMATIC - no modal option needed
      // The system will auto-create temp stacks when cards are dropped together
      // Accept/decline buttons will appear on the created temp stack
    }
  }

  // 3. Check for adding to existing temp stack
  if (targetInfo.type === 'temporary_stack') {
    const targetStack = tableCards.find(c =>
      c.type === 'temporary_stack' && c.stackId === targetInfo.stackId
    );

    if (targetStack && targetStack.owner === currentPlayer) {
      actions.push({
        type: 'addToStagingStack',
        label: 'Add to Temp Stack',
        payload: {
          handCard: draggedCard,
          targetStack
        }
      });
    }
  }

  // 4. Check for adding to builds (extendable builds)
  if (targetInfo.type === 'build') {
    const targetBuild = tableCards.find(c =>
      c.type === 'build' && c.buildId === targetInfo.buildId
    );

    if (targetBuild) {
      if (targetBuild.owner === currentPlayer) {
        // Add to own build
        actions.push({
          type: 'addToOwnBuild',
          label: `Add to Build (${targetBuild.value || 0})`,
          payload: {
            draggedItem,
            buildToAddTo: targetBuild
          }
        });
      } else if (targetBuild.isExtendable) {
        // Extend opponent's build
        const newValue = (targetBuild.value || 0) + draggedValue;
        if (newValue <= 10) {
          actions.push({
            type: 'addToOpponentBuild',
            label: `Extend to ${newValue}`,
            payload: {
              draggedItem,
              buildToAddTo: targetBuild
            }
          });
        }
      }
    }
  }

  // 5. If no actions found, check for trail
  if (actions.length === 0 && (!targetInfo.type || targetInfo.type === 'table')) {
    // Simple trail validation
    const hasActiveBuild = tableCards.some(card =>
      card.type === 'build' && card.owner === currentPlayer
    );

    if (!(gameState.round === 1 && hasActiveBuild)) {
      actions.push({
        type: 'trail',
        label: 'Trail Card',
        payload: { draggedItem, card: draggedCard }
      });
    }
  }

  // Return results
  if (actions.length === 0) {
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'No valid actions available'
    };
  }

  // Automatic actions: trail and single capture
  if (actions.length === 1) {
    const action = actions[0];
    if (action.type === 'trail' || action.type === 'capture') {
      return {
        actions,
        requiresModal: false,  // Execute automatically
        errorMessage: null
      };
    }
  }

  // Show modal for multiple actions or complex choices
  return {
    actions,
    requiresModal: true,
    errorMessage: null
  };
};

// Comprehensive action analysis engine per PRD
const analyzePossibleActions = (
  draggedItem: DraggedItem,
  targetInfo: any,
  gameState: GameState
): Action[] => {
  const actions: Action[] = [];
  const { card: draggedCard } = draggedItem;
  const { tableCards, playerHands, currentPlayer } = gameState;

  console.log('[ActionAnalysis] Analyzing all possible actions for:', draggedCard, targetInfo);

  // 1. Analyze Capture Possibilities
  const captureActions = analyzeCaptures(draggedCard, targetInfo, tableCards);
  actions.push(...captureActions);

  // 2. Analyze Build Possibilities
  const buildActions = analyzeBuilds(draggedCard, targetInfo, gameState);
  actions.push(...buildActions);

  // 3. Analyze Complex Combinations (only if no simple actions)
  if (actions.length === 0) {
    const complexActions = analyzeComplexMoves(draggedCard, targetInfo, gameState);
    actions.push(...complexActions);
  }

  // 4. Filter by Game Rules and Player State
  const validActions = filterValidActions(actions, gameState);

  // 5. Order actions by strategic priority
  return orderActionsByPriority(validActions);
};



// Handle trail attempts (drops on empty table area)
const handleTrailAttempt = (
  draggedItem: DraggedItem,
  gameState: GameState
): ActionResult => {
  console.log('[ActionDeterminer] Handling trail attempt');

  // First check: Cannot trail if it would create duplicate loose card
  if (wouldCreateDuplicateLooseCard(draggedItem.card, gameState.tableCards)) {
    console.log('[ActionDeterminer] Cannot trail - duplicate loose card exists');
    return {
      actions: [],
      requiresModal: false,
      errorMessage: `You cannot drop loose card ${draggedItem.card.rank}. A card of the same rank already exists on the table.`
    };
  }

  // Check for possible captures with this card
  const captureActions = findPossibleCaptures(draggedItem.card, gameState.tableCards);

  if (captureActions.length > 0) {
    console.log('[ActionDeterminer] Found capture actions:', captureActions.length);
    // Cannot trail - must capture instead
    return {
      actions: captureActions,
      requiresModal: captureActions.length > 1,
      errorMessage: null
    };
  } else {
    // No captures possible - trail is allowed
    console.log('[ActionDeterminer] No captures found, trail allowed');
    return {
      actions: [{
        type: 'trail',
        label: 'Trail Card',
        payload: {
          draggedItem,
          card: draggedItem.card
        }
      }],
      requiresModal: false,
      errorMessage: null
    };
  }
};

// Handle drops on loose cards
const handleLooseCardDrop = (
  draggedItem: DraggedItem,
  targetInfo: any,
  gameState: GameState
): ActionResult => {
  const { card: draggedCard } = draggedItem;
  const targetCard = targetInfo.card;

  // Validate target exists
  if (!targetCard || targetCard.type !== 'loose') {
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'Target card not found'
    };
  }

  // Check for direct capture
  if (rankValue(draggedCard.rank) === rankValue(targetCard.rank)) {
    // Validate capture is allowed
    const validation = validateCapture(draggedItem, [targetCard], gameState);
    if (!validation.valid) {
      return {
        actions: [],
        requiresModal: false,
        errorMessage: validation.message
      };
    }

    return {
      actions: [{
        type: 'capture',
        label: `Capture ${targetCard.rank}${targetCard.suit}`,
        payload: {
          draggedItem,
          selectedTableCards: [targetCard],
          targetCard,
          tableIndex: targetInfo.index
        }
      }],
      requiresModal: false,
      errorMessage: null
    };
  }

  // Check for build creation
  const buildValue = rankValue(draggedCard.rank) + rankValue(targetCard.rank);
  if (canCreateBuild(buildValue, gameState)) {
    return {
      actions: [{
        type: 'build',
        label: `Build ${buildValue}`,
        payload: {
          draggedItem,
          tableCardsInBuild: [targetCard],
          buildValue,
          biggerCard: rankValue(draggedCard.rank) > rankValue(targetCard.rank) ? draggedCard : targetCard,
          smallerCard: rankValue(draggedCard.rank) < rankValue(targetCard.rank) ? draggedCard : targetCard
        }
      }],
      requiresModal: false,
      errorMessage: null
    };
  }

  // Default: Create staging stack for complex combinations
  return handleCreateStagingStack(gameState, draggedCard, targetCard);
};

// Handle drops on builds
const handleBuildDrop = (
  draggedItem: DraggedItem,
  targetInfo: any,
  gameState: GameState
): ActionResult => {
  const { card: draggedCard } = draggedItem;
  const build = targetInfo.build;

  const actions: Action[] = [];

  // Possibility 1: Capture the build
  if (rankValue(draggedCard.rank) === build.value) {
    actions.push({
      type: 'capture',
      label: `Capture Build (${build.value})`,
      payload: {
        draggedItem,
        targetCard: build,
        tableIndex: targetInfo.index
      }
    });
  }

  // Possibility 2: Extend opponent's build (if allowed)
  if (build.owner !== gameState.currentPlayer) {
    const validation = validateAddToOpponentBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push({
        type: 'addToOpponentBuild',
        label: `Extend to ${validation.newValue}`,
        payload: {
          draggedItem,
          buildToAddTo: build
        }
      });
    }
  }

  // Possibility 3: Add to own build
  if (build.owner === gameState.currentPlayer) {
    const validation = validateAddToOwnBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push({
        type: 'addToOwnBuild',
        label: `Add to Build (${validation.newValue})`,
        payload: {
          draggedItem,
          buildToAddTo: build
        }
      });
    }
  }

  return {
    actions,
    requiresModal: actions.length > 1,
    errorMessage: null
  };
};

// Handle drops on temporary stacks
const handleTempStackDrop = (
  draggedItem: DraggedItem,
  targetInfo: any,
  gameState: GameState
): ActionResult => {
  const stack = targetInfo.stack;

  // Handle complex staging stack interactions
  return processStagingStackDrop(draggedItem, stack, gameState);
};

// Helper functions for build validation
const canCreateBuild = (buildValue: number, gameState: GameState): boolean => {
  const { currentPlayer, playerHands } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Check if player has a card to capture this build value later
  return playerHand.some(card =>
    rankValue(card.rank) === buildValue
  );
};

const validateAddToOpponentBuild = (build: any, draggedCard: Card, gameState: GameState): { valid: boolean; newValue?: number } => {
  // For now, don't allow extending opponent builds
  return { valid: false };
};

const validateAddToOwnBuild = (build: any, draggedCard: Card, gameState: GameState): { valid: boolean; newValue?: number } => {
  // For now, don't allow extending own builds
  return { valid: false };
};

const handleCreateStagingStack = (gameState: GameState, draggedCard: Card, targetCard: any): ActionResult => {
  // For now, return error - staging stacks not implemented
  return {
    actions: [],
    requiresModal: false,
    errorMessage: 'Complex card combinations not yet implemented'
  };
};

const processStagingStackDrop = (draggedItem: DraggedItem, stack: any, gameState: GameState): ActionResult => {
  // For now, return error - staging stacks not implemented
  return {
    actions: [],
    requiresModal: false,
    errorMessage: 'Staging stack interactions not yet implemented'
  };
};

// Action analysis algorithms per Analysis Functions Implementation PRD

// Analyze all possible capture actions
const analyzeCaptures = (draggedCard: Card, targetInfo: any, tableCards: TableCard[]): Action[] => {
  const actions: Action[] = [];
  const draggedValue = rankValue(draggedCard.rank);

  // Direct target capture (if dropped on specific card)
  if (targetInfo.type === 'loose') {
    const targetCard = targetInfo.card;
    if (rankValue(targetCard.rank) === draggedValue) {
      actions.push({
        type: 'capture',
        label: `Capture ${targetCard.rank}`,
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          selectedTableCards: [targetCard],
          targetCard
        },
        priority: 1  // High priority
      });
    }
  } else if (targetInfo.type === 'build') {
    const build = targetInfo.build;
    if (build.value === draggedValue) {
      actions.push({
        type: 'capture',
        label: `Capture Build (${build.value})`,
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          targetCard: build
        },
        priority: 1
      });
    }
  }

  // Global capture analysis (check all possible captures)
  const globalCaptures = analyzeGlobalCaptures(draggedCard, tableCards);
  actions.push(...globalCaptures);

  return actions;
};

// Analyze all possible build actions
const analyzeBuilds = (draggedCard: Card, targetInfo: any, gameState: GameState): Action[] => {
  const actions: Action[] = [];
  const { tableCards, playerHands, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  if (targetInfo.type === 'loose') {
    const targetCard = targetInfo.card;
    const draggedValue = rankValue(draggedCard.rank);
    const targetValue = rankValue(targetCard.rank);

    // Calculate possible build values
    const possibleValues = [
      draggedValue,                    // Single value build (e.g., 4+4=4)
      draggedValue + targetValue,      // Sum build (e.g., 4+4=8)
      // Could add more complex calculations here
    ];

    possibleValues.forEach(buildValue => {
      if (canCreateBuild(buildValue, gameState)) {
        actions.push(createBuildAction(draggedCard, [targetCard], buildValue));
      }
    });
  }

  return actions;
};

// Analyze complex move combinations
const analyzeComplexMoves = (draggedCard: Card, targetInfo: any, gameState: GameState): Action[] => {
  const actions: Action[] = [];

  // Analyze opponent's build interactions
  const opponentBuildActions = analyzeOpponentBuildMoves(draggedCard, targetInfo, gameState);
  actions.push(...opponentBuildActions);

  // Analyze temporary stack possibilities
  const tempStackActions = analyzeTempStackMoves(draggedCard, targetInfo, gameState);
  actions.push(...tempStackActions);

  // Analyze multi-card combinations
  const comboActions = analyzeCardCombinations(draggedCard, targetInfo, gameState);
  actions.push(...comboActions);

  return actions;
};

// Filter actions by game rules and player state
const filterValidActions = (actions: Action[], gameState: GameState): Action[] => {
  return actions.filter(action => {
    // Basic validation - could be expanded
    if (action.type === 'build') {
      return validateBuildCreation(action.payload.buildValue, gameState).valid;
    }
    return true;
  });
};

// Order actions by strategic priority
const orderActionsByPriority = (actions: Action[]): Action[] => {
  const priorityOrder: Record<string, number> = {
    'capture': 1,           // Highest priority - immediate points
    'extendToMerge': 2,     // Strategic value - combine builds
    'build': 3,             // Medium priority - set up future captures
    'addToOwnBuild': 4,     // Lower priority - extend existing
    'addToOpponentBuild': 5 // Lowest priority - help opponent
  };

  return actions.sort((a, b) => (priorityOrder[a.type] || 99) - (priorityOrder[b.type] || 99));
};

// Helper functions for action creation
const createCaptureAction = (draggedCard: Card, selectedTableCards: any[], targetCard: any): Action => {
  return {
    type: 'capture',
    label: targetCard.type === 'build' ? `Capture Build (${targetCard.value})` : `Capture ${targetCard.rank || ''}${targetCard.suit || ''}`,
    payload: {
      draggedItem: { card: draggedCard, source: 'hand' },
      selectedTableCards,
      targetCard
    }
  };
};

const createBuildAction = (draggedCard: Card, tableCardsInBuild: any[], buildValue: number): Action => {
  const firstCardInBuild = tableCardsInBuild[0];
  const firstCardRank = firstCardInBuild?.rank || '0'; // Provide default if rank is undefined

  return {
    type: 'build',
    label: `Build ${buildValue}`,
    payload: {
      draggedItem: { card: draggedCard, source: 'hand' },
      tableCardsInBuild,
      buildValue,
      biggerCard: rankValue(draggedCard.rank) > rankValue(firstCardRank) ? draggedCard : firstCardInBuild,
      smallerCard: rankValue(draggedCard.rank) < rankValue(firstCardRank) ? draggedCard : firstCardInBuild
    }
  };
};

// Global capture analysis (check all possible captures)
const analyzeGlobalCaptures = (draggedCard: Card, tableCards: TableCard[]): Action[] => {
  const actions: Action[] = [];
  const draggedValue = rankValue(draggedCard.rank);

  tableCards.forEach((tableItem, index) => {
    if (tableItem.type === 'loose') {
      const card = tableItem as Card;
      if (card.rank && rankValue(card.rank) === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${card.rank}${card.suit}`,
          payload: {
            draggedItem: { card: draggedCard, source: 'hand' },
            selectedTableCards: [card],
            targetCard: card
          },
          priority: 2  // Slightly lower than direct target
        });
      }
    } else if (tableItem.type === 'build') {
      const build = tableItem as any;
      if (build.value === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture Build (${build.value})`,
          payload: {
            draggedItem: { card: draggedCard, source: 'hand' },
            targetCard: build
          },
          priority: 2
        });
      }
    }
  });

  return actions;
};

// Analyze multi-card captures
const analyzeMultiCardCaptures = (draggedCard: Card, tableCards: TableCard[]): Action[] => {
  const actions: Action[] = [];
  const draggedValue = rankValue(draggedCard.rank);

  // Find all capturable cards
  const capturableCards = tableCards.filter(card => {
    if (card.type === 'loose') {
      return card.rank && rankValue(card.rank) === draggedValue;
    } else if (card.type === 'build') {
      return card.value === draggedValue;
    }
    return false;
  });

  // For now, only handle single captures
  // Could be extended to handle combinations that sum to the dragged value
  return actions;
};

// Analyze opponent build interactions
const analyzeOpponentBuildMoves = (draggedCard: Card, targetInfo: any, gameState: GameState): Action[] => {
  if (targetInfo.type !== 'build') return [];

  const build = targetInfo.build;
  const actions: Action[] = [];

  // Check if player owns this build
  if (build.owner === gameState.currentPlayer) {
    // Add to own build
    const validation = validateAddToOwnBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push({
        type: 'addToOwnBuild',
        label: `Add to Build (${validation.newValue})`,
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          buildToAddTo: build
        }
      });
    }
  } else {
    // Extend opponent's build
    const validation = validateAddToOpponentBuild(build, draggedCard, gameState);
    if (validation.valid) {
      actions.push({
        type: 'addToOpponentBuild',
        label: `Extend to ${validation.newValue}`,
        payload: {
          draggedItem: { card: draggedCard, source: 'hand' },
          buildToAddTo: build
        }
      });
    }
  }

  return actions;
};

// Analyze temporary stack moves
const analyzeTempStackMoves = (draggedCard: Card, targetInfo: any, gameState: GameState): Action[] => {
  if (targetInfo.type !== 'temporary_stack') return [];

  // For now, not implemented
  return [];
};

// Analyze card combinations
const analyzeCardCombinations = (draggedCard: Card, targetInfo: any, gameState: GameState): Action[] => {
  // For now, not implemented - could analyze complex multi-card scenarios
  return [];
};

// Build creation validation per PRD
const validateBuildCreation = (buildValue: number, gameState: GameState): { valid: boolean; message?: string } => {
  const { tableCards, currentPlayer } = gameState;

  // Rule 1: Cannot have multiple active builds
  const hasActiveBuild = tableCards.some(card =>
    card.type === 'build' && card.owner === currentPlayer
  );

  if (hasActiveBuild) {
    return {
      valid: false,
      message: "You can only have one active build at a time."
    };
  }

  // Rule 2: Opponent cannot have same value build
  const opponentHasSameValue = tableCards.some(card =>
    card.type === 'build' &&
    card.owner !== currentPlayer &&
    card.value === buildValue
  );

  if (opponentHasSameValue) {
    return {
      valid: false,
      message: `Opponent already has a build of ${buildValue}.`
    };
  }

  return { valid: true };
};

// Comprehensive capture validation
const validateCapture = (draggedItem: DraggedItem, selectedTableCards: any[], gameState: GameState): { valid: boolean; message: string | null } => {
  const { card: draggedCard } = draggedItem;
  const draggedValue = rankValue(draggedCard.rank);

  // Check if all selected cards can be captured with this card
  const canCaptureAll = selectedTableCards.every(card => {
    if (card.type === 'build') {
      return card.value === draggedValue;
    } else {
      return rankValue(card.rank) === draggedValue;
    }
  });

  if (!canCaptureAll) {
    return {
      valid: false,
      message: "Selected cards cannot be captured with this card"
    };
  }

  // Check if selected cards still exist on table
  const allCardsExist = selectedTableCards.every(selectedCard => {
    return gameState.tableCards.some(tableCard => {
      if (selectedCard.type === 'build') {
        return tableCard.buildId === selectedCard.buildId;
      } else {
        return tableCard.type === 'loose' &&
               tableCard.rank === selectedCard.rank &&
               tableCard.suit === selectedCard.suit;
      }
    });
  });

  if (!allCardsExist) {
    return {
      valid: false,
      message: "Some selected cards are no longer available"
    };
  }

  // Check turn validity
  if (gameState.currentPlayer !== draggedItem.player) {
    return {
      valid: false,
      message: "Not your turn"
    };
  }

  return { valid: true, message: null };
};

// Handle potential build creation (legacy function, now used by handleLooseCardDrop)
const handlePotentialBuild = (
  draggedItem: DraggedItem,
  targetCard: any,
  gameState: GameState
): ActionResult => {
  const { currentPlayer, playerHands } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Calculate potential build value
  const targetCardRank = targetCard?.rank || '0'; // Provide default if rank is undefined
  const buildValue = rankValue(draggedItem.card.rank) + rankValue(targetCardRank);

  // Check if player can capture this build value later
  const canCaptureLater = playerHand.some(card =>
    rankValue(card.rank) === buildValue &&
    card.rank !== draggedItem.card.rank // Don't count the card being played
  );

  if (canCaptureLater) {
    // Create build
    return {
      actions: [{
        type: 'build',
        label: `Build ${buildValue}`,
        payload: {
          draggedItem,
          tableCardsInBuild: [targetCard],
          buildValue,
          biggerCard: rankValue(draggedItem.card.rank) > rankValue(targetCardRank) ? draggedItem.card : targetCard,
          smallerCard: rankValue(draggedItem.card.rank) < rankValue(targetCardRank) ? draggedItem.card : targetCard
        }
      }],
      requiresModal: false,
      errorMessage: null
    };
  } else {
    // Cannot create build - show error
    return {
      actions: [],
      requiresModal: false,
      errorMessage: `Cannot build ${buildValue}. You need a ${buildValue} in your hand to capture it later.`
    };
  }
};
