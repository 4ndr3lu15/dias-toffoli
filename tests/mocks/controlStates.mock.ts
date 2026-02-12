/**
 * Control State Mock Data Generators
 *
 * Utilities for creating mock control state data for testing generators.
 */

import type {
  ControlState,
  SingleHandControlState,
  Position2D,
  GestureState,
  FingerStates,
  HandOpenness,
  Velocity2D,
} from '../../src/types/control.types';
import { GestureType, createEmptyControlState } from '../../src/types/control.types';

/**
 * Options for creating a mock single hand control state.
 */
export interface MockSingleHandOptions {
  handId?: number;
  isTracked?: boolean;
  position?: Partial<Position2D>;
  fingertipPosition?: Partial<Position2D>;
  velocity?: Partial<Velocity2D>;
  gesture?: Partial<GestureState>;
  fingers?: Partial<FingerStates>;
  openness?: Partial<HandOpenness>;
  depth?: number;
  rotation?: number;
}

/**
 * Create a mock SingleHandControlState.
 */
export function createMockSingleHand(options: MockSingleHandOptions = {}): SingleHandControlState {
  return {
    handId: options.handId ?? 0,
    isTracked: options.isTracked ?? true,
    position: { x: 0.5, y: 0.5, ...options.position },
    fingertipPosition: { x: 0.55, y: 0.45, ...options.fingertipPosition },
    velocity: { vx: 0, vy: 0, magnitude: 0, ...options.velocity },
    gesture: {
      type: GestureType.OPEN_HAND,
      confidence: 0.9,
      duration: 100,
      ...options.gesture,
    },
    fingers: {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
      extendedCount: 5,
      ...options.fingers,
    },
    openness: { value: 0.85, derivative: 0, ...options.openness },
    depth: options.depth ?? 0.5,
    rotation: options.rotation ?? 0,
  };
}

/**
 * Options for creating a mock ControlState.
 */
export interface MockControlStateOptions {
  timestamp?: number;
  deltaTime?: number;
  hands?: SingleHandControlState[];
  hasActiveHand?: boolean;
  custom?: Record<string, unknown>;
}

/**
 * Create a mock ControlState with one active hand by default.
 */
export function createMockControlState(options: MockControlStateOptions = {}): ControlState {
  const hands = options.hands ?? [createMockSingleHand()];
  const hasActiveHand = options.hasActiveHand ?? hands.length > 0;

  return {
    timestamp: options.timestamp ?? Date.now(),
    deltaTime: options.deltaTime ?? 33.33,
    hands,
    hasActiveHand,
    primaryHand: hands.length > 0 ? hands[0] : null,
    secondaryHand: hands.length > 1 ? hands[1] : null,
    custom: options.custom ?? {},
  };
}

/**
 * Create a ControlState with no hands detected.
 */
export function createNoHandControlState(): ControlState {
  return createEmptyControlState();
}

/**
 * Create a ControlState with hand at a specific position.
 */
export function createHandAtPosition(x: number, y: number): ControlState {
  return createMockControlState({
    hands: [createMockSingleHand({ position: { x, y } })],
  });
}

/**
 * Create a ControlState with a specific gesture.
 */
export function createGestureState(
  gestureType: GestureType,
  confidence: number = 0.9
): ControlState {
  return createMockControlState({
    hands: [
      createMockSingleHand({
        gesture: { type: gestureType, confidence, duration: 100 },
      }),
    ],
  });
}

/**
 * Create a ControlState with specific finger extensions.
 */
export function createFingerState(fingers: Partial<FingerStates>): ControlState {
  const extendedCount = [
    fingers.thumb ?? true,
    fingers.index ?? true,
    fingers.middle ?? true,
    fingers.ring ?? true,
    fingers.pinky ?? true,
  ].filter(Boolean).length;

  return createMockControlState({
    hands: [
      createMockSingleHand({
        fingers: { ...fingers, extendedCount },
      }),
    ],
  });
}

/**
 * Create a sequence of ControlStates simulating hand movement.
 */
export function createMovingControlStates(
  frameCount: number,
  startX: number = 0.2,
  endX: number = 0.8,
  y: number = 0.5
): ControlState[] {
  const states: ControlState[] = [];
  const baseTimestamp = Date.now();

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const x = startX + (endX - startX) * t;

    states.push(
      createMockControlState({
        timestamp: baseTimestamp + i * 33,
        deltaTime: 33,
        hands: [createMockSingleHand({ position: { x, y } })],
      })
    );
  }

  return states;
}
