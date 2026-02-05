/**
 * Distance Controller
 *
 * Measures distances between hands and fingers.
 * Useful for two-hand gestures and zoom/scale controls.
 */

import type { HandFrame, HandLandmarks, Point3D } from '../types/hand.types';
import { HandLandmark } from '../types/hand.types';
import type { ControlState } from '../types/control.types';
import type { IController, DistanceControllerConfig } from './IController';
import { DEFAULT_CONTROLLER_CONFIG } from './IController';

/**
 * Distance measurements between hands.
 */
export interface DistanceMeasurements {
  /** Distance between palm centers (if two hands) */
  palmToPalm: number | null;

  /** Distance between index fingertips (if two hands) */
  indexToIndex: number | null;

  /** Distance between thumb tips (if two hands) */
  thumbToThumb: number | null;

  /** Pinch distance for primary hand (thumb to index) */
  primaryPinch: number | null;

  /** Pinch distance for secondary hand (thumb to index) */
  secondaryPinch: number | null;

  /** Average hand size (for normalization) */
  avgHandSize: number;
}

/**
 * Internal state for distance tracking.
 */
interface DistanceHistory {
  lastMeasurements: DistanceMeasurements | null;
  smoothedMeasurements: DistanceMeasurements | null;
}

/**
 * DistanceController measures distances between landmarks.
 */
export class DistanceController implements IController<DistanceControllerConfig> {
  readonly name = 'DistanceController';

  private _config: DistanceControllerConfig;
  private history: DistanceHistory = {
    lastMeasurements: null,
    smoothedMeasurements: null,
  };

  constructor(config?: Partial<DistanceControllerConfig>) {
    this._config = { ...DEFAULT_CONTROLLER_CONFIG.distance, ...config };
  }

  get config(): DistanceControllerConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<DistanceControllerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    this.history = {
      lastMeasurements: null,
      smoothedMeasurements: null,
    };
  }

  /**
   * Process a hand frame and update distance data in control state.
   */
  process(frame: HandFrame, state: ControlState): ControlState {
    const measurements = this.calculateMeasurements(frame);

    // Apply smoothing if enabled
    const smoothedMeasurements =
      this._config.smoothingEnabled && this.history.smoothedMeasurements
        ? this.smoothMeasurements(measurements, this.history.smoothedMeasurements)
        : measurements;

    // Update history
    this.history.lastMeasurements = measurements;
    this.history.smoothedMeasurements = smoothedMeasurements;

    // Store measurements in custom data
    return {
      ...state,
      custom: {
        ...state.custom,
        distances: smoothedMeasurements,
      },
    };
  }

  /**
   * Calculate all distance measurements from current frame.
   */
  private calculateMeasurements(frame: HandFrame): DistanceMeasurements {
    const hands = frame.hands;

    // Calculate average hand size for normalization
    const avgHandSize = this.calculateAverageHandSize(hands.map((h) => h.landmarks));

    // Base measurements
    const measurements: DistanceMeasurements = {
      palmToPalm: null,
      indexToIndex: null,
      thumbToThumb: null,
      primaryPinch: null,
      secondaryPinch: null,
      avgHandSize,
    };

    // Single hand measurements
    if (hands.length >= 1) {
      const primaryLandmarks = hands[0].landmarks;
      measurements.primaryPinch = this.calculatePinchDistance(primaryLandmarks, avgHandSize);
    }

    if (hands.length >= 2) {
      const secondaryLandmarks = hands[1].landmarks;
      measurements.secondaryPinch = this.calculatePinchDistance(secondaryLandmarks, avgHandSize);

      // Two-hand measurements
      const primaryLandmarks = hands[0].landmarks;

      measurements.palmToPalm = this.calculatePalmToPalmDistance(
        primaryLandmarks,
        secondaryLandmarks,
        avgHandSize
      );

      measurements.indexToIndex = this.calculateLandmarkDistance(
        primaryLandmarks[HandLandmark.INDEX_FINGER_TIP],
        secondaryLandmarks[HandLandmark.INDEX_FINGER_TIP],
        avgHandSize
      );

      measurements.thumbToThumb = this.calculateLandmarkDistance(
        primaryLandmarks[HandLandmark.THUMB_TIP],
        secondaryLandmarks[HandLandmark.THUMB_TIP],
        avgHandSize
      );
    }

    return measurements;
  }

  /**
   * Calculate pinch distance (thumb tip to index tip).
   */
  private calculatePinchDistance(landmarks: HandLandmarks, handSize: number): number {
    const thumbTip = landmarks[HandLandmark.THUMB_TIP];
    const indexTip = landmarks[HandLandmark.INDEX_FINGER_TIP];

    const distance = this.distance2D(thumbTip, indexTip);

    return this._config.normalizeToHandSize && handSize > 0 ? distance / handSize : distance;
  }

  /**
   * Calculate distance between palm centers.
   */
  private calculatePalmToPalmDistance(
    landmarks1: HandLandmarks,
    landmarks2: HandLandmarks,
    handSize: number
  ): number {
    const palm1 = this.calculatePalmCenter(landmarks1);
    const palm2 = this.calculatePalmCenter(landmarks2);

    const distance = this.distance2D(palm1, palm2);

    return this._config.normalizeToHandSize && handSize > 0 ? distance / handSize : distance;
  }

  /**
   * Calculate distance between two landmarks.
   */
  private calculateLandmarkDistance(a: Point3D, b: Point3D, handSize: number): number {
    const distance = this.distance2D(a, b);
    return this._config.normalizeToHandSize && handSize > 0 ? distance / handSize : distance;
  }

  /**
   * Calculate palm center position.
   */
  private calculatePalmCenter(landmarks: HandLandmarks): Point3D {
    const palmLandmarks = [
      landmarks[HandLandmark.WRIST],
      landmarks[HandLandmark.INDEX_FINGER_MCP],
      landmarks[HandLandmark.MIDDLE_FINGER_MCP],
      landmarks[HandLandmark.RING_FINGER_MCP],
      landmarks[HandLandmark.PINKY_MCP],
    ];

    const sum = palmLandmarks.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
        z: acc.z + point.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: sum.x / palmLandmarks.length,
      y: sum.y / palmLandmarks.length,
      z: sum.z / palmLandmarks.length,
    };
  }

  /**
   * Calculate average hand size from landmarks.
   * Uses wrist to middle fingertip distance as reference.
   */
  private calculateAverageHandSize(allLandmarks: HandLandmarks[]): number {
    if (allLandmarks.length === 0) {
      return 0.3; // Default fallback
    }

    const sizes = allLandmarks.map((landmarks) => {
      const wrist = landmarks[HandLandmark.WRIST];
      const middleTip = landmarks[HandLandmark.MIDDLE_FINGER_TIP];
      return this.distance2D(wrist, middleTip);
    });

    return sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
  }

  /**
   * Calculate 2D distance between two points.
   */
  private distance2D(a: Point3D, b: Point3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Smooth measurements using exponential moving average.
   */
  private smoothMeasurements(
    current: DistanceMeasurements,
    previous: DistanceMeasurements
  ): DistanceMeasurements {
    const alpha = 1 - this._config.smoothingFactor;

    const smooth = (curr: number | null, prev: number | null): number | null => {
      if (curr === null) return null;
      if (prev === null) return curr;
      return alpha * curr + this._config.smoothingFactor * prev;
    };

    return {
      palmToPalm: smooth(current.palmToPalm, previous.palmToPalm),
      indexToIndex: smooth(current.indexToIndex, previous.indexToIndex),
      thumbToThumb: smooth(current.thumbToThumb, previous.thumbToThumb),
      primaryPinch: smooth(current.primaryPinch, previous.primaryPinch),
      secondaryPinch: smooth(current.secondaryPinch, previous.secondaryPinch),
      avgHandSize: alpha * current.avgHandSize + this._config.smoothingFactor * previous.avgHandSize,
    };
  }

  /**
   * Get current distance measurements.
   */
  getMeasurements(): DistanceMeasurements | null {
    return this.history.smoothedMeasurements;
  }
}

/**
 * Type guard to check if distances are available in control state.
 */
export function hasDistances(
  state: ControlState
): state is ControlState & { custom: { distances: DistanceMeasurements } } {
  return 'distances' in state.custom && state.custom.distances !== undefined;
}

/**
 * Get distance measurements from control state.
 */
export function getDistances(state: ControlState): DistanceMeasurements | null {
  if (hasDistances(state)) {
    return state.custom.distances;
  }
  return null;
}
