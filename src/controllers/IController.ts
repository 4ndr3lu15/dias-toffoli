/**
 * Controller Interface Definitions
 *
 * Controllers process raw HandFrame data from HandTracker
 * and produce structured ControlState for Generators.
 */

import { Observable } from 'rxjs';
import type { HandFrame } from '../types/hand.types';
import type { ControlState, SingleHandControlState } from '../types/control.types';

/**
 * Base configuration shared by all controllers.
 */
export interface BaseControllerConfig {
  /** Enable/disable smoothing */
  smoothingEnabled: boolean;

  /** Smoothing factor [0, 1] where 0 = no smoothing, 1 = max smoothing */
  smoothingFactor: number;
}

/**
 * Configuration for position tracking.
 */
export interface PositionControllerConfig extends BaseControllerConfig {
  /** Which landmark to track for position (default: palm center) */
  trackingMode: 'palm' | 'index_tip' | 'wrist';

  /** Enable velocity calculation */
  calculateVelocity: boolean;

  /** Minimum movement threshold to register (prevents jitter) */
  movementThreshold: number;
}

/**
 * Configuration for gesture detection.
 */
export interface GestureControllerConfig extends BaseControllerConfig {
  /** Minimum confidence to report a gesture */
  minConfidence: number;

  /** Minimum duration (ms) to confirm a gesture */
  minDuration: number;

  /** Distance threshold for pinch detection [0, 1] */
  pinchThreshold: number;

  /** Angle threshold for finger extension (radians) */
  extensionAngleThreshold: number;
}

/**
 * Configuration for distance measurements.
 */
export interface DistanceControllerConfig extends BaseControllerConfig {
  /** Normalize distances to [0, 1] based on hand size */
  normalizeToHandSize: boolean;
}

/**
 * Combined controller configuration.
 */
export interface ControllerConfig {
  position: PositionControllerConfig;
  gesture: GestureControllerConfig;
  distance: DistanceControllerConfig;
}

/**
 * Partial controller configuration for updates.
 */
export interface PartialControllerConfig {
  position?: Partial<PositionControllerConfig>;
  gesture?: Partial<GestureControllerConfig>;
  distance?: Partial<DistanceControllerConfig>;
}

/**
 * Default controller configuration.
 */
export const DEFAULT_CONTROLLER_CONFIG: ControllerConfig = {
  position: {
    smoothingEnabled: true,
    smoothingFactor: 0.3,
    trackingMode: 'palm',
    calculateVelocity: true,
    movementThreshold: 0.005,
  },
  gesture: {
    smoothingEnabled: true,
    smoothingFactor: 0.2,
    minConfidence: 0.7,
    minDuration: 100,
    pinchThreshold: 0.08,
    extensionAngleThreshold: 2.5, // ~143 degrees
  },
  distance: {
    smoothingEnabled: true,
    smoothingFactor: 0.3,
    normalizeToHandSize: true,
  },
};

/**
 * Interface for a single-purpose controller module.
 * Each controller processes one aspect of hand data.
 */
export interface IController<TConfig extends BaseControllerConfig = BaseControllerConfig> {
  /** Controller name for debugging */
  readonly name: string;

  /** Current configuration */
  readonly config: TConfig;

  /**
   * Process a hand frame and update the control state.
   * @param frame - Raw hand frame from HandTracker
   * @param state - Current control state to update
   * @returns Updated control state
   */
  process(frame: HandFrame, state: ControlState): ControlState;

  /**
   * Update controller configuration.
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<TConfig>): void;

  /**
   * Reset internal state (e.g., smoothing buffers).
   */
  reset(): void;
}

/**
 * Interface for the main controller manager.
 * Combines multiple controllers and produces the final ControlState.
 */
export interface IControllerManager {
  /** Observable stream of control states */
  readonly state$: Observable<ControlState>;

  /** Current configuration */
  readonly config: ControllerConfig;

  /**
   * Start processing hand frames.
   * @param handFrames$ - Observable stream from HandTracker
   */
  start(handFrames$: Observable<HandFrame>): void;

  /**
   * Stop processing.
   */
  stop(): void;

  /**
   * Update configuration.
   * @param config - Partial configuration to merge
   */
  updateConfig(config: PartialControllerConfig): void;

  /**
   * Get the current control state.
   */
  getCurrentState(): ControlState;

  /**
   * Reset all controllers.
   */
  reset(): void;
}

/**
 * Result of processing a single hand through controllers.
 */
export interface HandProcessingResult {
  /** Updated hand control state */
  handState: SingleHandControlState;

  /** Any additional computed data */
  metadata?: Record<string, unknown>;
}
