/**
 * Smoothing Utilities
 *
 * Temporal smoothing for hand landmark positions using
 * exponential moving average (EMA).
 */

import type { Point3D, HandLandmarks } from '../types';
import { LANDMARKS_PER_HAND } from '../types';

/**
 * Smooth a single 3D point using exponential moving average.
 *
 * @param current - Current point value
 * @param previous - Previous smoothed value
 * @param factor - Smoothing factor (0 = fully smoothed/previous, 1 = no smoothing/current)
 * @returns Smoothed point
 */
export function smoothPoint(current: Point3D, previous: Point3D, factor: number): Point3D {
  return {
    x: previous.x + (current.x - previous.x) * factor,
    y: previous.y + (current.y - previous.y) * factor,
    z: previous.z + (current.z - previous.z) * factor,
  };
}

/**
 * Buffer for storing previous landmark positions for smoothing.
 */
export class LandmarkSmoother {
  private buffer: Map<number, Point3D[]> = new Map();
  private readonly factor: number;
  private readonly bufferSize: number;

  /**
   * Create a new landmark smoother.
   *
   * @param factor - Smoothing factor (0 = fully smoothed, 1 = no smoothing)
   * @param bufferSize - Number of previous frames to keep (default: 5)
   */
  constructor(factor: number = 0.3, bufferSize: number = 5) {
    this.factor = Math.max(0, Math.min(1, factor));
    this.bufferSize = bufferSize;
  }

  /**
   * Smooth a single landmark point.
   *
   * @param handId - Hand identifier
   * @param landmarkIndex - Landmark index (0-20)
   * @param current - Current point value
   * @returns Smoothed point
   */
  smoothLandmark(handId: number, landmarkIndex: number, current: Point3D): Point3D {
    const key = handId * LANDMARKS_PER_HAND + landmarkIndex;
    let history = this.buffer.get(key);

    if (!history || history.length === 0) {
      history = [current];
      this.buffer.set(key, history);
      return current;
    }

    const previous = history[history.length - 1];
    const smoothed = smoothPoint(current, previous, this.factor);

    history.push(smoothed);
    if (history.length > this.bufferSize) {
      history.shift();
    }

    return smoothed;
  }

  /**
   * Smooth all landmarks for a hand.
   *
   * @param handId - Hand identifier
   * @param landmarks - Current landmark positions
   * @returns Smoothed landmark positions
   */
  smoothLandmarks(handId: number, landmarks: HandLandmarks): HandLandmarks {
    const smoothed: Point3D[] = [];

    for (let i = 0; i < LANDMARKS_PER_HAND; i++) {
      smoothed.push(this.smoothLandmark(handId, i, landmarks[i]));
    }

    return smoothed as HandLandmarks;
  }

  /**
   * Clear the buffer for a specific hand.
   *
   * @param handId - Hand identifier
   */
  clearHand(handId: number): void {
    for (let i = 0; i < LANDMARKS_PER_HAND; i++) {
      const key = handId * LANDMARKS_PER_HAND + i;
      this.buffer.delete(key);
    }
  }

  /**
   * Clear all buffers.
   */
  clear(): void {
    this.buffer.clear();
  }

  /**
   * Get the current smoothing factor.
   */
  get smoothingFactor(): number {
    return this.factor;
  }
}
