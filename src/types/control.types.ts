/**
 * Control State Type Definitions
 *
 * These types define the processed control data that Controllers
 * emit for consumption by Generators.
 */

/**
 * Normalized 2D position [0, 1].
 */
export interface Position2D {
  /** X coordinate (0 = left, 1 = right) */
  x: number;

  /** Y coordinate (0 = top, 1 = bottom) */
  y: number;
}

/**
 * Velocity vector (units per second).
 */
export interface Velocity2D {
  /** Horizontal velocity */
  vx: number;

  /** Vertical velocity */
  vy: number;

  /** Total speed (magnitude of velocity vector) */
  magnitude: number;
}

/**
 * Recognized gesture types.
 */
export enum GestureType {
  NONE = 'none',
  OPEN_HAND = 'open_hand',
  CLOSED_FIST = 'closed_fist',
  POINTING = 'pointing',
  THUMBS_UP = 'thumbs_up',
  PEACE = 'peace',
  PINCH = 'pinch',
}

/**
 * Gesture detection result.
 */
export interface GestureState {
  /** Primary detected gesture */
  type: GestureType;

  /** Confidence of gesture detection [0, 1] */
  confidence: number;

  /** How long gesture has been held (ms) */
  duration: number;
}

/**
 * Finger extension states.
 */
export interface FingerStates {
  /** Thumb extended */
  thumb: boolean;

  /** Index finger extended */
  index: boolean;

  /** Middle finger extended */
  middle: boolean;

  /** Ring finger extended */
  ring: boolean;

  /** Pinky finger extended */
  pinky: boolean;

  /** Number of extended fingers (0-5) */
  extendedCount: number;
}

/**
 * Hand openness measurement.
 */
export interface HandOpenness {
  /** Overall openness [0, 1] where 0 = closed fist, 1 = fully open */
  value: number;

  /** Rate of change (positive = opening, negative = closing) */
  derivative: number;
}

/**
 * Control state for a single hand.
 */
export interface SingleHandControlState {
  /** Hand identifier */
  handId: number;

  /** Is this hand currently tracked? */
  isTracked: boolean;

  /** Palm center position */
  position: Position2D;

  /** Index fingertip position */
  fingertipPosition: Position2D;

  /** Movement velocity */
  velocity: Velocity2D;

  /** Detected gesture */
  gesture: GestureState;

  /** Individual finger states */
  fingers: FingerStates;

  /** Hand openness metric */
  openness: HandOpenness;

  /** Distance from camera (depth) [0, 1] */
  depth: number;

  /** Hand rotation/orientation (radians) */
  rotation: number;
}

/**
 * Complete control state for all hands.
 * This is the output of Controllers.
 */
export interface ControlState {
  /** Timestamp of this state */
  timestamp: number;

  /** Delta time since last state (ms) */
  deltaTime: number;

  /** Control states for each hand */
  hands: SingleHandControlState[];

  /** Is any hand currently tracked? */
  hasActiveHand: boolean;

  /** Primary hand (first detected) */
  primaryHand: SingleHandControlState | null;

  /** Secondary hand (if two hands detected) */
  secondaryHand: SingleHandControlState | null;

  /** Custom extension data (for custom controllers) */
  custom: Record<string, unknown>;
}

/**
 * Create an empty single hand control state.
 */
export function createEmptyHandControlState(handId: number): SingleHandControlState {
  return {
    handId,
    isTracked: false,
    position: { x: 0, y: 0 },
    fingertipPosition: { x: 0, y: 0 },
    velocity: { vx: 0, vy: 0, magnitude: 0 },
    gesture: { type: GestureType.NONE, confidence: 0, duration: 0 },
    fingers: {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      extendedCount: 0,
    },
    openness: { value: 0, derivative: 0 },
    depth: 0,
    rotation: 0,
  };
}

/**
 * Create an empty control state.
 */
export function createEmptyControlState(): ControlState {
  return {
    timestamp: Date.now(),
    deltaTime: 0,
    hands: [],
    hasActiveHand: false,
    primaryHand: null,
    secondaryHand: null,
    custom: {},
  };
}
