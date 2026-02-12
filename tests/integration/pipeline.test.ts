/**
 * Integration Test: HandFrame → Controllers → ControlState Pipeline
 *
 * Tests the full pipeline from raw hand landmark data
 * through the controller chain to the final ControlState output.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Subject, firstValueFrom } from 'rxjs';
import { skip } from 'rxjs/operators';
import type { HandFrame } from '../../src/types/hand.types';
import { ControllerManager } from '../../src/controllers/ControllerManager';
import { hasDistances } from '../../src/controllers/DistanceController';
import {
  createMockHandFrame,
  createMockHand,
  createEmptyHandFrame,
  createMovingHandFrames,
  createMockPoint,
} from '../mocks/handFrames.mock';

describe('Pipeline Integration: HandFrame → Controllers → ControlState', () => {
  let manager: ControllerManager;
  let handFrames$: Subject<HandFrame>;

  beforeEach(() => {
    manager = new ControllerManager();
    handFrames$ = new Subject<HandFrame>();
    manager.start(handFrames$);
  });

  afterEach(() => {
    manager.stop();
    handFrames$.complete();
  });

  describe('single hand tracking', () => {
    it('should produce a ControlState with one hand from a single-hand frame', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.5, centerY: 0.5 })],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      expect(state.hasActiveHand).toBe(true);
      expect(state.hands).toHaveLength(1);
      expect(state.primaryHand).not.toBeNull();
      expect(state.secondaryHand).toBeNull();
      expect(state.timestamp).toBe(1000);
    });

    it('should track hand position from landmarks', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.3, centerY: 0.7 })],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      // Position should be derived from palm landmarks, roughly around the center
      expect(state.primaryHand!.position.x).toBeGreaterThan(0);
      expect(state.primaryHand!.position.x).toBeLessThan(1);
      expect(state.primaryHand!.position.y).toBeGreaterThan(0);
      expect(state.primaryHand!.position.y).toBeLessThan(1);
      expect(state.primaryHand!.isTracked).toBe(true);
    });

    it('should detect gestures from hand landmarks', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      // The default mock landmarks create an open hand (fingers extended)
      const frame = createMockHandFrame({
        hands: [createMockHand({ scale: 0.1 })],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      // Gesture should be detected (exact type depends on landmark geometry)
      expect(state.primaryHand!.gesture.type).toBeDefined();
      expect(state.primaryHand!.gesture.confidence).toBeGreaterThan(0);
    });

    it('should calculate finger states', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [createMockHand()],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      const fingers = state.primaryHand!.fingers;
      expect(fingers).toBeDefined();
      expect(typeof fingers.thumb).toBe('boolean');
      expect(typeof fingers.index).toBe('boolean');
      expect(typeof fingers.middle).toBe('boolean');
      expect(typeof fingers.ring).toBe('boolean');
      expect(typeof fingers.pinky).toBe('boolean');
      expect(fingers.extendedCount).toBeGreaterThanOrEqual(0);
      expect(fingers.extendedCount).toBeLessThanOrEqual(5);
    });

    it('should calculate hand depth and rotation', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [createMockHand()],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      expect(typeof state.primaryHand!.depth).toBe('number');
      expect(state.primaryHand!.depth).toBeGreaterThanOrEqual(0);
      expect(state.primaryHand!.depth).toBeLessThanOrEqual(1);
      expect(typeof state.primaryHand!.rotation).toBe('number');
    });

    it('should calculate pinch distance for single hand', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [createMockHand()],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      expect(hasDistances(state)).toBe(true);
      if (hasDistances(state)) {
        expect(state.custom.distances.primaryPinch).not.toBeNull();
        expect(typeof state.custom.distances.primaryPinch).toBe('number');
        // No second hand, so inter-hand distances should be null
        expect(state.custom.distances.palmToPalm).toBeNull();
        expect(state.custom.distances.secondaryPinch).toBeNull();
      }
    });
  });

  describe('two hand tracking', () => {
    it('should produce ControlState with two hands', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, handedness: 'Right', centerX: 0.3 }),
          createMockHand({ id: 1, handedness: 'Left', centerX: 0.7 }),
        ],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      expect(state.hasActiveHand).toBe(true);
      expect(state.hands).toHaveLength(2);
      expect(state.primaryHand).not.toBeNull();
      expect(state.secondaryHand).not.toBeNull();
    });

    it('should calculate inter-hand distances with two hands', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [createMockHand({ id: 0, centerX: 0.3 }), createMockHand({ id: 1, centerX: 0.7 })],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      expect(hasDistances(state)).toBe(true);
      if (hasDistances(state)) {
        expect(state.custom.distances.palmToPalm).not.toBeNull();
        expect(state.custom.distances.indexToIndex).not.toBeNull();
        expect(state.custom.distances.thumbToThumb).not.toBeNull();
        expect(state.custom.distances.primaryPinch).not.toBeNull();
        expect(state.custom.distances.secondaryPinch).not.toBeNull();
      }
    });

    it('should produce different positions for different hands', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.2, centerY: 0.3 }),
          createMockHand({ id: 1, centerX: 0.8, centerY: 0.7 }),
        ],
        timestamp: 1000,
      });
      handFrames$.next(frame);

      const state = await statePromise;

      const primary = state.primaryHand!;
      const secondary = state.secondaryHand!;

      // Positions should differ since hands are at different locations
      expect(Math.abs(primary.position.x - secondary.position.x)).toBeGreaterThan(0.1);
    });
  });

  describe('empty frames', () => {
    it('should handle empty frames (no hands)', async () => {
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));

      const frame = createEmptyHandFrame();
      handFrames$.next(frame);

      const state = await statePromise;

      expect(state.hasActiveHand).toBe(false);
      expect(state.hands).toHaveLength(0);
      expect(state.primaryHand).toBeNull();
      expect(state.secondaryHand).toBeNull();
    });

    it('should transition from tracking to no hands', async () => {
      // First frame: hand present
      const firstState = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand()],
          timestamp: 1000,
        })
      );
      const state1 = await firstState;
      expect(state1.hasActiveHand).toBe(true);

      // Second frame: no hands
      const secondState = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [],
          timestamp: 1033,
        })
      );
      const state2 = await secondState;
      expect(state2.hasActiveHand).toBe(false);
      expect(state2.hands).toHaveLength(0);
    });
  });

  describe('movement tracking', () => {
    it('should track position changes over sequential frames', async () => {
      const frames = createMovingHandFrames(5, 0.2, 0.8, 0.5);
      const positions: number[] = [];

      // Collect positions from all frames
      for (const frame of frames) {
        const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
        handFrames$.next(frame);
        const state = await statePromise;
        if (state.primaryHand) {
          positions.push(state.primaryHand.position.x);
        }
      }

      expect(positions).toHaveLength(5);
      // Positions should generally increase from left to right
      // (smoothing may slightly alter exact values)
      expect(positions[positions.length - 1]).toBeGreaterThan(positions[0]);
    });

    it('should calculate velocity from sequential frames', async () => {
      // Send first frame (velocity = 0 since no previous)
      const firstState = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand({ centerX: 0.3 })],
          timestamp: 1000,
        })
      );
      await firstState;

      // Send second frame with position change
      const secondState = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand({ centerX: 0.6 })],
          timestamp: 1033,
        })
      );
      const state = await secondState;

      // Velocity should be non-zero after movement
      expect(state.primaryHand!.velocity.magnitude).toBeGreaterThan(0);
    });

    it('should calculate delta time between frames', async () => {
      // First frame
      const firstState = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand()],
          timestamp: 1000,
        })
      );
      await firstState;

      // Second frame, 33ms later
      const secondState = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand()],
          timestamp: 1033,
        })
      );
      const state = await secondState;

      expect(state.deltaTime).toBe(33);
    });
  });

  describe('gesture detection through pipeline', () => {
    it('should detect closed fist from curled landmarks', async () => {
      // Create landmarks with fingers curled (tips close to MCP joints)
      const landmarks = createFistLandmarks(0.5, 0.5);

      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [
            {
              id: 0,
              handedness: 'Right',
              landmarks,
              confidence: 0.95,
            },
          ],
          timestamp: 1000,
        })
      );

      const state = await statePromise;

      // Should detect closed fist or low openness
      expect(state.primaryHand!.openness.value).toBeLessThan(0.5);
      expect(state.primaryHand!.fingers.extendedCount).toBeLessThanOrEqual(1);
    });

    it('should detect pointing gesture from index-only landmarks', async () => {
      const landmarks = createPointingLandmarks(0.5, 0.5);

      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [
            {
              id: 0,
              handedness: 'Right',
              landmarks,
              confidence: 0.95,
            },
          ],
          timestamp: 1000,
        })
      );

      const state = await statePromise;

      // Index should be extended, others curled
      expect(state.primaryHand!.fingers.index).toBe(true);
      // At least index is extended
      expect(state.primaryHand!.fingers.extendedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('configuration propagation', () => {
    it('should apply config changes to all controllers', () => {
      manager.updateConfig({
        position: { smoothingFactor: 0.8 },
        gesture: { minConfidence: 0.5 },
        distance: { normalizeToHandSize: false },
      });

      const config = manager.config;
      expect(config.position.smoothingFactor).toBe(0.8);
      expect(config.gesture.minConfidence).toBe(0.5);
      expect(config.distance.normalizeToHandSize).toBe(false);
    });

    it('should reset all controllers and clear state', async () => {
      // Send a frame to populate state
      const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand()],
          timestamp: 1000,
        })
      );
      await statePromise;

      // Reset
      manager.reset();

      const currentState = manager.getCurrentState();
      expect(currentState.hasActiveHand).toBe(false);
      expect(currentState.hands).toHaveLength(0);
    });
  });

  describe('pipeline robustness', () => {
    it('should handle rapid frame succession', async () => {
      const frameCount = 20;
      let lastState = manager.getCurrentState();

      for (let i = 0; i < frameCount; i++) {
        const statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
        handFrames$.next(
          createMockHandFrame({
            hands: [createMockHand({ centerX: 0.1 + (i / frameCount) * 0.8 })],
            timestamp: 1000 + i * 16, // 60 FPS
          })
        );
        lastState = await statePromise;
      }

      expect(lastState.hasActiveHand).toBe(true);
      expect(lastState.primaryHand).not.toBeNull();
    });

    it('should handle hand appearing and disappearing', async () => {
      // Frame 1: No hand
      let statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(createEmptyHandFrame());
      let state = await statePromise;
      expect(state.hasActiveHand).toBe(false);

      // Frame 2: Hand appears
      statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand()],
          timestamp: 1033,
        })
      );
      state = await statePromise;
      expect(state.hasActiveHand).toBe(true);

      // Frame 3: Hand disappears
      statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [],
          timestamp: 1066,
        })
      );
      state = await statePromise;
      expect(state.hasActiveHand).toBe(false);

      // Frame 4: Hand reappears
      statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand()],
          timestamp: 1100,
        })
      );
      state = await statePromise;
      expect(state.hasActiveHand).toBe(true);
    });

    it('should handle number of hands changing', async () => {
      // Frame 1: One hand
      let statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand({ id: 0 })],
          timestamp: 1000,
        })
      );
      let state = await statePromise;
      expect(state.hands).toHaveLength(1);

      // Frame 2: Two hands
      statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand({ id: 0, centerX: 0.3 }), createMockHand({ id: 1, centerX: 0.7 })],
          timestamp: 1033,
        })
      );
      state = await statePromise;
      expect(state.hands).toHaveLength(2);

      // Frame 3: Back to one hand
      statePromise = firstValueFrom(manager.state$.pipe(skip(1)));
      handFrames$.next(
        createMockHandFrame({
          hands: [createMockHand({ id: 0 })],
          timestamp: 1066,
        })
      );
      state = await statePromise;
      expect(state.hands).toHaveLength(1);
    });
  });
});

// ─── Helper Functions for Specific Gesture Landmarks ─────────────────

/**
 * Create landmarks simulating a closed fist.
 * Fingertips are curled back toward the palm.
 */
function createFistLandmarks(
  centerX: number,
  centerY: number
): import('../../src/types/hand.types').HandLandmarks {
  const scale = 0.1;
  const landmarks: import('../../src/types/hand.types').Point3D[] = [];

  // Wrist (0)
  landmarks.push(createMockPoint(centerX, centerY + scale * 2, 0));

  // Thumb (1-4) - curled
  landmarks.push(createMockPoint(centerX - scale, centerY + scale * 1.5, 0));
  landmarks.push(createMockPoint(centerX - scale * 1.2, centerY + scale * 1.2, 0));
  landmarks.push(createMockPoint(centerX - scale * 1.0, centerY + scale * 1.3, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.8, centerY + scale * 1.4, 0));

  // Index finger (5-8) - curled into palm
  landmarks.push(createMockPoint(centerX - scale * 0.5, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.5, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.3, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.2, centerY + scale * 1.1, 0));

  // Middle finger (9-12) - curled into palm
  landmarks.push(createMockPoint(centerX, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.1, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.1, centerY + scale * 1.1, 0));

  // Ring finger (13-16) - curled into palm
  landmarks.push(createMockPoint(centerX + scale * 0.5, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.5, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.3, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.2, centerY + scale * 1.1, 0));

  // Pinky (17-20) - curled into palm
  landmarks.push(createMockPoint(centerX + scale, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX + scale, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.8, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.7, centerY + scale * 1.1, 0));

  return landmarks as import('../../src/types/hand.types').HandLandmarks;
}

/**
 * Create landmarks simulating a pointing gesture.
 * Index finger extended, others curled.
 */
function createPointingLandmarks(
  centerX: number,
  centerY: number
): import('../../src/types/hand.types').HandLandmarks {
  const scale = 0.1;
  const landmarks: import('../../src/types/hand.types').Point3D[] = [];

  // Wrist (0)
  landmarks.push(createMockPoint(centerX, centerY + scale * 2, 0));

  // Thumb (1-4) - curled
  landmarks.push(createMockPoint(centerX - scale, centerY + scale * 1.5, 0));
  landmarks.push(createMockPoint(centerX - scale * 1.2, centerY + scale * 1.2, 0));
  landmarks.push(createMockPoint(centerX - scale * 1.0, centerY + scale * 1.3, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.8, centerY + scale * 1.4, 0));

  // Index finger (5-8) - EXTENDED (straight up)
  landmarks.push(createMockPoint(centerX - scale * 0.5, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.5, centerY, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.5, centerY - scale, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.5, centerY - scale * 2, 0));

  // Middle finger (9-12) - curled
  landmarks.push(createMockPoint(centerX, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.1, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.1, centerY + scale * 1.1, 0));

  // Ring finger (13-16) - curled
  landmarks.push(createMockPoint(centerX + scale * 0.5, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.5, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.3, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.2, centerY + scale * 1.1, 0));

  // Pinky (17-20) - curled
  landmarks.push(createMockPoint(centerX + scale, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX + scale, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.8, centerY + scale * 0.8, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.7, centerY + scale * 1.1, 0));

  return landmarks as import('../../src/types/hand.types').HandLandmarks;
}
