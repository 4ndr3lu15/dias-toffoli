/**
 * Position Controller
 *
 * Tracks hand position and calculates velocity.
 * Outputs normalized [0, 1] coordinates for palm center or fingertip.
 */

import type { HandFrame, HandData, Point3D, HandLandmarks } from '../types/hand.types';
import { HandLandmark } from '../types/hand.types';
import type { ControlState, Position2D, Velocity2D } from '../types/control.types';
import { createEmptyHandControlState } from '../types/control.types';
import type { IController, PositionControllerConfig } from './IController';
import { DEFAULT_CONTROLLER_CONFIG } from './IController';

/**
 * Internal state for tracking a single hand's position history.
 */
interface HandPositionHistory {
  lastPosition: Position2D | null;
  lastTimestamp: number;
  smoothedPosition: Position2D;
}

/**
 * PositionController tracks hand positions and calculates velocity.
 */
export class PositionController implements IController<PositionControllerConfig> {
  readonly name = 'PositionController';

  private _config: PositionControllerConfig;
  private handHistory: Map<number, HandPositionHistory> = new Map();

  constructor(config?: Partial<PositionControllerConfig>) {
    this._config = { ...DEFAULT_CONTROLLER_CONFIG.position, ...config };
  }

  get config(): PositionControllerConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<PositionControllerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    this.handHistory.clear();
  }

  /**
   * Process a hand frame and update position data in control state.
   */
  process(frame: HandFrame, state: ControlState): ControlState {
    const updatedHands = frame.hands.map((hand) => this.processHand(hand, frame.timestamp, state));

    // Clean up history for hands no longer tracked
    const activeHandIds = new Set(frame.hands.map((h) => h.id));
    for (const [id] of this.handHistory) {
      if (!activeHandIds.has(id)) {
        this.handHistory.delete(id);
      }
    }

    return {
      ...state,
      hands: updatedHands,
      hasActiveHand: updatedHands.length > 0,
      primaryHand: updatedHands[0] || null,
      secondaryHand: updatedHands[1] || null,
    };
  }

  /**
   * Process a single hand's position data.
   */
  private processHand(
    hand: HandData,
    timestamp: number,
    state: ControlState
  ): ControlState['hands'][0] {
    // Get or create hand state
    const existingHandState = state.hands.find((h) => h.handId === hand.id);
    const handState = existingHandState ?? createEmptyHandControlState(hand.id);

    // Calculate raw position based on tracking mode
    const rawPosition = this.calculatePosition(hand.landmarks);
    const fingertipPosition = this.getLandmarkPosition(
      hand.landmarks,
      HandLandmark.INDEX_FINGER_TIP
    );

    // Get or create position history
    let history = this.handHistory.get(hand.id);
    if (!history) {
      history = {
        lastPosition: null,
        lastTimestamp: timestamp,
        smoothedPosition: rawPosition,
      };
      this.handHistory.set(hand.id, history);
    }

    // Apply smoothing if enabled
    const smoothedPosition = this._config.smoothingEnabled
      ? this.smoothPosition(rawPosition, history.smoothedPosition)
      : rawPosition;

    // Apply movement threshold to prevent jitter
    const position = this.applyThreshold(smoothedPosition, history.smoothedPosition);

    // Calculate velocity
    const velocity = this._config.calculateVelocity
      ? this.calculateVelocity(position, history.lastPosition, timestamp, history.lastTimestamp)
      : handState.velocity;

    // Update history
    history.lastPosition = position;
    history.lastTimestamp = timestamp;
    history.smoothedPosition = position;

    // Calculate depth from average z coordinate
    const depth = this.calculateDepth(hand.landmarks);

    // Calculate hand rotation (wrist to middle finger MCP angle)
    const rotation = this.calculateRotation(hand.landmarks);

    return {
      ...handState,
      isTracked: true,
      position,
      fingertipPosition,
      velocity,
      depth,
      rotation,
    };
  }

  /**
   * Calculate position based on tracking mode.
   */
  private calculatePosition(landmarks: HandLandmarks): Position2D {
    switch (this._config.trackingMode) {
      case 'index_tip':
        return this.getLandmarkPosition(landmarks, HandLandmark.INDEX_FINGER_TIP);

      case 'wrist':
        return this.getLandmarkPosition(landmarks, HandLandmark.WRIST);

      case 'palm':
      default:
        return this.calculatePalmCenter(landmarks);
    }
  }

  /**
   * Calculate palm center from key landmarks.
   */
  private calculatePalmCenter(landmarks: HandLandmarks): Position2D {
    // Palm center is average of wrist and finger MCPs
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
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / palmLandmarks.length,
      y: sum.y / palmLandmarks.length,
    };
  }

  /**
   * Get position of a specific landmark.
   */
  private getLandmarkPosition(landmarks: HandLandmarks, landmark: HandLandmark): Position2D {
    const point = landmarks[landmark];
    return { x: point.x, y: point.y };
  }

  /**
   * Apply exponential smoothing to position.
   */
  private smoothPosition(current: Position2D, previous: Position2D): Position2D {
    const alpha = 1 - this._config.smoothingFactor;
    return {
      x: alpha * current.x + this._config.smoothingFactor * previous.x,
      y: alpha * current.y + this._config.smoothingFactor * previous.y,
    };
  }

  /**
   * Apply movement threshold to filter jitter.
   */
  private applyThreshold(current: Position2D, previous: Position2D): Position2D {
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this._config.movementThreshold) {
      return previous;
    }

    return current;
  }

  /**
   * Calculate velocity from position change.
   */
  private calculateVelocity(
    current: Position2D,
    previous: Position2D | null,
    currentTime: number,
    previousTime: number
  ): Velocity2D {
    if (!previous || currentTime === previousTime) {
      return { vx: 0, vy: 0, magnitude: 0 };
    }

    const dt = (currentTime - previousTime) / 1000; // Convert to seconds
    if (dt <= 0) {
      return { vx: 0, vy: 0, magnitude: 0 };
    }

    const vx = (current.x - previous.x) / dt;
    const vy = (current.y - previous.y) / dt;
    const magnitude = Math.sqrt(vx * vx + vy * vy);

    return { vx, vy, magnitude };
  }

  /**
   * Calculate depth from average Z coordinate.
   * Normalized to [0, 1] where 0 = far, 1 = close.
   */
  private calculateDepth(landmarks: HandLandmarks): number {
    const avgZ =
      landmarks.reduce((sum: number, point: Point3D) => sum + point.z, 0) / landmarks.length;

    // MediaPipe z is typically in range [-0.5, 0.5] relative to wrist
    // Normalize to [0, 1] where closer = higher value
    return Math.max(0, Math.min(1, 0.5 - avgZ));
  }

  /**
   * Calculate hand rotation angle.
   * Returns angle in radians from horizontal.
   */
  private calculateRotation(landmarks: HandLandmarks): number {
    const wrist = landmarks[HandLandmark.WRIST];
    const middleMcp = landmarks[HandLandmark.MIDDLE_FINGER_MCP];

    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;

    return Math.atan2(dy, dx);
  }
}
