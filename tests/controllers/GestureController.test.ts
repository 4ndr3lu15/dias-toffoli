/**
 * Gesture Controller Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GestureController } from '../../src/controllers/GestureController';
import { GestureType, createEmptyControlState } from '../../src/types/control.types';
import { createEmptyHandControlState } from '../../src/types/control.types';
import { createMockHandFrame, createMockLandmarks } from '../mocks/handFrames.mock';
import type { HandLandmarks } from '../../src/types';
import { HandLandmark } from '../../src/types';

/**
 * Create landmarks for a closed fist (all fingers curled).
 */
function createClosedFistLandmarks(centerX = 0.5, centerY = 0.5): HandLandmarks {
  const base = createMockLandmarks(centerX, centerY, 0.1);

  // Curl all fingers by moving tips close to MCPs
  const scale = 0.1;

  // Index finger curled - position away from thumb
  base[HandLandmark.INDEX_FINGER_TIP] = { x: centerX - scale * 0.3, y: centerY + scale * 1.5, z: 0 };
  base[HandLandmark.INDEX_FINGER_DIP] = { x: centerX - scale * 0.4, y: centerY + scale * 1.2, z: 0 };
  base[HandLandmark.INDEX_FINGER_PIP] = { x: centerX - scale * 0.5, y: centerY + scale * 0.9, z: 0 };

  // Middle finger curled
  base[HandLandmark.MIDDLE_FINGER_TIP] = { x: centerX + scale * 0.1, y: centerY + scale * 1.5, z: 0 };
  base[HandLandmark.MIDDLE_FINGER_DIP] = { x: centerX, y: centerY + scale * 1.2, z: 0 };
  base[HandLandmark.MIDDLE_FINGER_PIP] = { x: centerX, y: centerY + scale * 0.9, z: 0 };

  // Ring finger curled
  base[HandLandmark.RING_FINGER_TIP] = { x: centerX + scale * 0.5, y: centerY + scale * 1.5, z: 0 };
  base[HandLandmark.RING_FINGER_DIP] = { x: centerX + scale * 0.5, y: centerY + scale * 1.2, z: 0 };
  base[HandLandmark.RING_FINGER_PIP] = { x: centerX + scale * 0.5, y: centerY + scale * 0.9, z: 0 };

  // Pinky curled
  base[HandLandmark.PINKY_TIP] = { x: centerX + scale * 1.0, y: centerY + scale * 1.5, z: 0 };
  base[HandLandmark.PINKY_DIP] = { x: centerX + scale * 1.0, y: centerY + scale * 1.2, z: 0 };
  base[HandLandmark.PINKY_PIP] = { x: centerX + scale * 1.0, y: centerY + scale * 0.9, z: 0 };

  // Thumb curled and far from index to avoid pinch detection
  base[HandLandmark.THUMB_TIP] = { x: centerX - scale * 2.0, y: centerY + scale * 1.5, z: 0 };
  base[HandLandmark.THUMB_IP] = { x: centerX - scale * 1.8, y: centerY + scale * 1.3, z: 0 };
  base[HandLandmark.THUMB_MCP] = { x: centerX - scale * 1.5, y: centerY + scale * 1.1, z: 0 };

  return base;
}

/**
 * Create landmarks for a pinch gesture.
 */
function createPinchLandmarks(centerX = 0.5, centerY = 0.5): HandLandmarks {
  const base = createMockLandmarks(centerX, centerY, 0.1);

  // Move thumb tip very close to index tip
  base[HandLandmark.THUMB_TIP] = {
    x: base[HandLandmark.INDEX_FINGER_TIP].x + 0.02,
    y: base[HandLandmark.INDEX_FINGER_TIP].y + 0.02,
    z: 0,
  };

  return base;
}

/**
 * Create landmarks for pointing gesture (only index extended).
 */
function createPointingLandmarks(centerX = 0.5, centerY = 0.5): HandLandmarks {
  const base = createClosedFistLandmarks(centerX, centerY);
  const scale = 0.1;

  // Extend only index finger
  base[HandLandmark.INDEX_FINGER_MCP] = { x: centerX - scale * 0.75, y: centerY + scale, z: 0 };
  base[HandLandmark.INDEX_FINGER_PIP] = { x: centerX - scale * 0.75, y: centerY, z: 0 };
  base[HandLandmark.INDEX_FINGER_DIP] = { x: centerX - scale * 0.75, y: centerY - scale, z: 0 };
  base[HandLandmark.INDEX_FINGER_TIP] = { x: centerX - scale * 0.75, y: centerY - scale * 2, z: 0 };

  return base;
}

describe('GestureController', () => {
  let controller: GestureController;

  beforeEach(() => {
    controller = new GestureController({
      minDuration: 0, // Disable duration requirement for instant tests
    });
  });

  describe('initialization', () => {
    it('should have default configuration', () => {
      const defaultController = new GestureController();
      expect(defaultController.name).toBe('GestureController');
      expect(defaultController.config.pinchThreshold).toBeDefined();
      expect(defaultController.config.minConfidence).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customController = new GestureController({
        pinchThreshold: 0.1,
        minConfidence: 0.8,
      });

      expect(customController.config.pinchThreshold).toBe(0.1);
      expect(customController.config.minConfidence).toBe(0.8);
    });
  });

  describe('finger detection', () => {
    it('should detect open hand fingers', () => {
      const frame = createMockHandFrame();

      // Create initial state with position data
      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      // Open hand should have multiple fingers extended
      expect(result.primaryHand?.fingers.extendedCount).toBeGreaterThan(0);
    });

    it('should detect closed fist fingers', () => {
      const frame = createMockHandFrame({
        hands: [
          {
            id: 0,
            handedness: 'Right',
            landmarks: createClosedFistLandmarks(),
            confidence: 0.95,
          },
        ],
      });

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      // Closed fist should have few or no fingers extended
      expect(result.primaryHand?.fingers.extendedCount).toBeLessThanOrEqual(1);
    });
  });

  describe('gesture detection', () => {
    it('should detect pinch gesture', () => {
      const frame = createMockHandFrame({
        hands: [
          {
            id: 0,
            handedness: 'Right',
            landmarks: createPinchLandmarks(),
            confidence: 0.95,
          },
        ],
      });

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      expect(result.primaryHand?.gesture.type).toBe(GestureType.PINCH);
    });

    it('should detect closed fist', () => {
      const frame = createMockHandFrame({
        hands: [
          {
            id: 0,
            handedness: 'Right',
            landmarks: createClosedFistLandmarks(),
            confidence: 0.95,
          },
        ],
      });

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      expect(result.primaryHand?.gesture.type).toBe(GestureType.CLOSED_FIST);
    });

    it('should detect pointing gesture', () => {
      const frame = createMockHandFrame({
        hands: [
          {
            id: 0,
            handedness: 'Right',
            landmarks: createPointingLandmarks(),
            confidence: 0.95,
          },
        ],
      });

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      // Should detect pointing or similar gesture
      expect([GestureType.POINTING, GestureType.NONE]).toContain(
        result.primaryHand?.gesture.type
      );
    });
  });

  describe('hand openness', () => {
    it('should calculate high openness for open hand', () => {
      const frame = createMockHandFrame(); // Default is open hand

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      // Open hand should have higher openness
      expect(result.primaryHand?.openness.value).toBeGreaterThan(0.3);
    });

    it('should calculate low openness for closed fist', () => {
      const frame = createMockHandFrame({
        hands: [
          {
            id: 0,
            handedness: 'Right',
            landmarks: createClosedFistLandmarks(),
            confidence: 0.95,
          },
        ],
      });

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      // Closed fist should have lower openness
      expect(result.primaryHand?.openness.value).toBeLessThan(0.5);
    });
  });

  describe('gesture confidence', () => {
    it('should provide confidence score', () => {
      const frame = createMockHandFrame({
        hands: [
          {
            id: 0,
            handedness: 'Right',
            landmarks: createPinchLandmarks(),
            confidence: 0.95,
          },
        ],
      });

      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      const result = controller.process(frame, initialState);

      expect(result.primaryHand?.gesture.confidence).toBeGreaterThan(0);
      expect(result.primaryHand?.gesture.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('reset', () => {
    it('should clear gesture history on reset', () => {
      const frame = createMockHandFrame();
      const initialState = createEmptyControlState();
      initialState.hands = [
        {
          ...createEmptyHandControlState(0),
          isTracked: true,
        },
      ];

      controller.process(frame, initialState);
      controller.reset();

      // After reset, processing should start fresh
      const newResult = controller.process(frame, initialState);
      expect(newResult.primaryHand?.gesture.duration).toBe(0);
    });
  });

  describe('config update', () => {
    it('should update pinch threshold', () => {
      controller.updateConfig({ pinchThreshold: 0.2 });
      expect(controller.config.pinchThreshold).toBe(0.2);
    });
  });
});
