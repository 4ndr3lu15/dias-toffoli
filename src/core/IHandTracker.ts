/**
 * HandTracker Interface
 *
 * Defines the contract for hand tracking implementations.
 */

import type { Observable } from 'rxjs';
import type { HandFrame } from '../types';

/**
 * Configuration options for HandTracker.
 */
export interface HandTrackerConfig {
  /** Maximum number of hands to detect (1 or 2) */
  maxHands: 1 | 2;

  /** Minimum confidence for initial detection [0, 1] */
  minDetectionConfidence: number;

  /** Minimum confidence for tracking [0, 1] */
  minTrackingConfidence: number;

  /** Target frames per second */
  targetFps: number;

  /** Enable temporal smoothing */
  smoothing: boolean;

  /** Smoothing factor (lower = smoother, higher latency) [0, 1] */
  smoothingFactor: number;
}

/**
 * Default configuration values.
 */
export const DEFAULT_HAND_TRACKER_CONFIG: HandTrackerConfig = {
  maxHands: 2,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5,
  targetFps: 30,
  smoothing: true,
  smoothingFactor: 0.3,
};

/**
 * HandTracker interface.
 * Implementations must handle camera access, MediaPipe initialization,
 * and emit HandFrame objects through an observable stream.
 */
export interface IHandTracker {
  /**
   * Initialize the tracker with a video element.
   * @param videoElement - HTML video element to use as source
   * @returns Promise that resolves when initialization is complete
   */
  initialize(videoElement: HTMLVideoElement): Promise<void>;

  /**
   * Observable stream of hand tracking data.
   * Emits a new HandFrame for each processed video frame.
   */
  readonly hands$: Observable<HandFrame>;

  /**
   * Current tracking status.
   */
  readonly isTracking: boolean;

  /**
   * Start tracking.
   */
  start(): void;

  /**
   * Stop tracking (pauses without destroying).
   */
  stop(): void;

  /**
   * Release all resources.
   */
  dispose(): void;
}
