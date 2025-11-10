# PRD: Automatic Temp Stack Creation (KISS Version)

## Problem
Currently, temp stacks require player confirmation and are shown as options. This creates unnecessary complexity and breaks the flow.

## Solution
Make temp stacks automatic when cards are dropped together. No confirmation needed.

## Requirements

### 1. Automatic Stack Creation
- **Trigger**: When a card from hand is dropped on a table card
- **Action**: Immediately create temp stack (no player choice)
- **Result**: Cards combine automatically into stack

### 2. Automatic Stack Building
- **Trigger**: When any card is dropped on existing temp stack
- **Action**: Add card to stack immediately
- **Result**: Stack grows automatically

### 3. Automatic Build Creation
- **Trigger**: When hand card is dropped on temp stack
- **Action**: Check if valid build can be made
- **Result**: If valid, create build automatically. If invalid, disband stack.

### 4. Simple Rules
- One temp stack per player max
- Stack must have at least 1 hand card
- Build value determined automatically
- Invalid stacks disband immediately

## User Flow
1. Drag card from hand to table card → Stack created
2. Drag more cards to stack → Stack grows
3. Drag hand card to stack → Either build created or stack disbanded
4. No buttons, no options, no confirmations

## Benefits
- Simpler gameplay
- Faster turns
- Less UI complexity
- More intuitive card dropping

## Implementation Notes
- Remove all confirmation dialogs
- Remove build value selection
- Make everything automatic
- Keep error handling for invalid moves
