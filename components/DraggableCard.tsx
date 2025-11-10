import React, { useRef, useState } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import Card, { CardType } from './card';

interface DraggableCardProps {
  card: CardType;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  disabled?: boolean;
  draggable?: boolean;
  size?: "normal" | "small" | "large";
  currentPlayer: number;
  source?: string;
  stackId?: string | null;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  onDragStart,
  onDragEnd,
  onDragMove,
  disabled = false,
  draggable = true,
  size = 'normal',
  currentPlayer,
  source = 'hand',
  stackId = null
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [hasStartedDrag, setHasStartedDrag] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => draggable && !disabled,
    onMoveShouldSetPanResponder: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      return distance > 8; // 8 pixel threshold
    },

    onPanResponderGrant: () => {
      // Set initial offset - get current values
      const currentX = (pan.x as any)._value || 0;
      const currentY = (pan.y as any)._value || 0;
      pan.setOffset({
        x: currentX,
        y: currentY,
      });
      pan.setValue({ x: 0, y: 0 });
    },

    onPanResponderMove: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);

      if (distance > 8 && !hasStartedDrag) {
        setHasStartedDrag(true);
        console.log(`[DraggableCard] Started dragging ${card.rank}${card.suit}`);

        // Notify parent component
        if (onDragStart) {
          onDragStart(card);
        }
      }

      if (hasStartedDrag) {
        // Update animated position
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(event, gestureState);

        // Notify parent of drag move
        if (onDragMove) {
          onDragMove(card, { x: gestureState.moveX, y: gestureState.moveY });
        }
      }
    },

    onPanResponderRelease: (event, gestureState) => {
      const dropPosition = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
        handled: false,
        attempted: false
      };

      // Check global drop zones
      console.log(`[DraggableCard] Checking drop zones. Available zones:`, (global as any).dropZones?.length || 0);
      console.log(`[DraggableCard] Drop position:`, dropPosition);

      // Log all available zones for debugging
      if ((global as any).dropZones) {
        (global as any).dropZones.forEach((zone: any, index: number) => {
          console.log(`[DraggableCard] Zone ${index}: ${zone.stackId} at (${zone.bounds.x}, ${zone.bounds.y}) ${zone.bounds.width}x${zone.bounds.height}`);
        });
      }

      if ((global as any).dropZones && (global as any).dropZones.length > 0) {
        let bestZone = null;
        let closestDistance = Infinity;

        for (const zone of (global as any).dropZones) {
          const { x, y, width, height } = zone.bounds;
          const tolerance = 50; // Increased tolerance for easier dropping
          const expandedBounds = {
            x: x - tolerance,
            y: y - tolerance,
            width: width + (tolerance * 2),
            height: height + (tolerance * 2)
          };

          console.log(`[DraggableCard] Checking zone ${zone.stackId}:`, {
            bounds: zone.bounds,
            expandedBounds
          });

          // Check if drop position is inside expanded bounds
          if (dropPosition.x >= expandedBounds.x &&
              dropPosition.x <= expandedBounds.x + expandedBounds.width &&
              dropPosition.y >= expandedBounds.y &&
              dropPosition.y <= expandedBounds.y + expandedBounds.height) {

            const zoneCenter = {
              x: zone.bounds.x + zone.bounds.width / 2,
              y: zone.bounds.y + zone.bounds.height / 2
            };
            const distance = Math.sqrt(
              Math.pow(dropPosition.x - zoneCenter.x, 2) +
              Math.pow(dropPosition.y - zoneCenter.y, 2)
            );

            console.log(`[DraggableCard] ✅ Drop position is within zone ${zone.stackId}, distance: ${distance}`);

            if (distance < closestDistance) {
              closestDistance = distance;
              bestZone = zone;
            }
          } else {
            console.log(`[DraggableCard] ❌ Drop position is NOT within zone ${zone.stackId}`);
          }
        }

        if (bestZone) {
          dropPosition.attempted = true;
          const draggedItem = {
            card,
            source,
            player: currentPlayer,
            stackId: stackId || undefined
          };

          console.log(`[DraggableCard] Dropping on zone:`, bestZone.stackId);
          const dropResult = bestZone.onDrop(draggedItem);
          if (dropResult) {
            dropPosition.handled = true;
            console.log(`[DraggableCard] Drop handled successfully`);
          } else {
            console.log(`[DraggableCard] Drop was not handled by zone`);
          }
        } else {
          console.log(`[DraggableCard] No suitable drop zone found`);
        }
      } else {
        console.log(`[DraggableCard] No drop zones available`);
      }

      // Animate back if not handled
      if (!dropPosition.handled && (source !== 'hand' || dropPosition.attempted)) {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }

      // Reset pan offset
      pan.flattenOffset();

      // Notify parent of drag end
      if (onDragEnd) {
        const draggedItem = {
          card,
          source,
          player: currentPlayer,
          stackId: stackId || undefined
        };
        onDragEnd(draggedItem, dropPosition);
      }

      setHasStartedDrag(false);
    },

    onPanResponderTerminate: () => {
      // Reset on termination
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      pan.flattenOffset();
      setHasStartedDrag(false);
    }
  });

  return (
    <Animated.View
      style={[
        styles.draggableContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y }
          ],
          zIndex: hasStartedDrag ? 1000 : 1,
        },
        hasStartedDrag && styles.dragging
      ]}
      {...panResponder.panHandlers}
    >
      <Card
        card={card}
        size={size}
        disabled={disabled}
        draggable={draggable}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  draggableContainer: {
    // zIndex is set dynamically in the component
  },
  dragging: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
});

export default DraggableCard;
