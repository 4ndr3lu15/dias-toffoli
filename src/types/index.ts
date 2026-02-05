/**
 * Type Definitions - Barrel Export
 *
 * Re-exports all type definitions for convenient imports.
 */

// Hand tracking types
export type {
  Point3D,
  HandLandmarks,
  Handedness,
  HandData,
  HandFrame,
} from './hand.types';

export { HandLandmark, HAND_CONNECTIONS } from './hand.types';

// Control state types
export type {
  Position2D,
  Velocity2D,
  GestureState,
  FingerStates,
  HandOpenness,
  SingleHandControlState,
  ControlState,
} from './control.types';

export {
  GestureType,
  createEmptyHandControlState,
  createEmptyControlState,
} from './control.types';

// Constants
export * from './constants';

// Type guards and utilities
export {
  isValidPoint,
  isValidHandData,
  isValidHandFrame,
  isHandTracked,
  hasGesture,
  hasActiveHands,
  clamp,
  lerp,
  distance3D,
  distance2D,
} from './guards';

// MediaPipe types
export type {
  MediaPipeLandmark,
  MediaPipeHandedness,
  MediaPipeResults,
  MediaPipeHandsConfig,
  MediaPipeHandsOptions,
  MediaPipeHandsInput,
  MediaPipeHands,
  MediaPipeHandsConstructor,
} from './mediapipe.types';
