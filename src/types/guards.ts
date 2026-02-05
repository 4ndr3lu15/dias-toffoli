/**
 * Type Guards and Utility Functions
 *
 * Runtime type checking and validation utilities.
 */

import type { HandFrame, HandData, Point3D, SingleHandControlState, ControlState } from './index';
import { GestureType, LANDMARKS_PER_HAND } from './index';

/**
 * Check if a point is valid (all coordinates are numbers and within expected range).
 */
export function isValidPoint(point: unknown): point is Point3D {
  if (!point || typeof point !== 'object') return false;
  const p = point as Point3D;
  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    typeof p.z === 'number' &&
    !isNaN(p.x) &&
    !isNaN(p.y) &&
    !isNaN(p.z)
  );
}

/**
 * Check if hand data is valid.
 */
export function isValidHandData(hand: unknown): hand is HandData {
  if (!hand || typeof hand !== 'object') return false;
  const h = hand as HandData;
  return (
    typeof h.id === 'number' &&
    (h.handedness === 'Left' || h.handedness === 'Right') &&
    Array.isArray(h.landmarks) &&
    h.landmarks.length === LANDMARKS_PER_HAND &&
    h.landmarks.every(isValidPoint) &&
    typeof h.confidence === 'number' &&
    h.confidence >= 0 &&
    h.confidence <= 1
  );
}

/**
 * Check if a hand frame is valid.
 */
export function isValidHandFrame(frame: unknown): frame is HandFrame {
  if (!frame || typeof frame !== 'object') return false;
  const f = frame as HandFrame;
  return (
    Array.isArray(f.hands) &&
    f.hands.every(isValidHandData) &&
    typeof f.handCount === 'number' &&
    f.handCount === f.hands.length &&
    typeof f.timestamp === 'number' &&
    typeof f.processingTime === 'number'
  );
}

/**
 * Check if hand is actively tracked.
 */
export function isHandTracked(hand: SingleHandControlState): boolean {
  return hand.isTracked && hand.position.x >= 0 && hand.position.y >= 0;
}

/**
 * Check if gesture is detected with sufficient confidence.
 */
export function hasGesture(
  state: SingleHandControlState,
  minConfidence: number = 0.7
): boolean {
  return (
    state.gesture.type !== GestureType.NONE && state.gesture.confidence >= minConfidence
  );
}

/**
 * Check if control state has any active hands.
 */
export function hasActiveHands(state: ControlState): boolean {
  return state.hasActiveHand && state.hands.length > 0;
}

/**
 * Clamp a value to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculate distance between two 3D points.
 */
export function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate distance between two 2D points (ignoring z).
 */
export function distance2D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
