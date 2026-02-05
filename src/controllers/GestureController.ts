/**
 * Gesture Controller
 *
 * Detects hand gestures from landmark positions.
 * Supports: open hand, closed fist, pointing, pinch, peace, thumbs up.
 */

import type { HandFrame, HandData, HandLandmarks, Point3D } from '../types/hand.types';
import { HandLandmark } from '../types/hand.types';
import type {
  ControlState,
  GestureState,
  FingerStates,
  HandOpenness,
} from '../types/control.types';
import { GestureType } from '../types/control.types';
import type { IController, GestureControllerConfig } from './IController';
import { DEFAULT_CONTROLLER_CONFIG } from './IController';

/**
 * Internal state for tracking gesture history per hand.
 */
interface GestureHistory {
  lastGesture: GestureType;
  gestureStartTime: number;
  smoothedOpenness: number;
}

/**
 * GestureController detects gestures from hand landmarks.
 */
export class GestureController implements IController<GestureControllerConfig> {
  readonly name = 'GestureController';

  private _config: GestureControllerConfig;
  private gestureHistory: Map<number, GestureHistory> = new Map();

  constructor(config?: Partial<GestureControllerConfig>) {
    this._config = { ...DEFAULT_CONTROLLER_CONFIG.gesture, ...config };
  }

  get config(): GestureControllerConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<GestureControllerConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    this.gestureHistory.clear();
  }

  /**
   * Process a hand frame and update gesture data in control state.
   */
  process(frame: HandFrame, state: ControlState): ControlState {
    const updatedHands = state.hands.map((handState) => {
      const handData = frame.hands.find((h) => h.id === handState.handId);
      if (!handData) {
        return handState;
      }
      return this.processHand(handData, frame.timestamp, handState);
    });

    // Clean up history for hands no longer tracked
    const activeHandIds = new Set(frame.hands.map((h) => h.id));
    for (const [id] of this.gestureHistory) {
      if (!activeHandIds.has(id)) {
        this.gestureHistory.delete(id);
      }
    }

    return {
      ...state,
      hands: updatedHands,
      primaryHand: updatedHands[0] || null,
      secondaryHand: updatedHands[1] || null,
    };
  }

  /**
   * Process gesture detection for a single hand.
   */
  private processHand(
    hand: HandData,
    timestamp: number,
    handState: ControlState['hands'][0]
  ): ControlState['hands'][0] {
    // Detect finger states
    const fingers = this.detectFingerStates(hand.landmarks);

    // Calculate hand openness
    const rawOpenness = this.calculateOpenness(hand.landmarks);

    // Get or create gesture history
    let history = this.gestureHistory.get(hand.id);
    if (!history) {
      history = {
        lastGesture: GestureType.NONE,
        gestureStartTime: timestamp,
        smoothedOpenness: rawOpenness,
      };
      this.gestureHistory.set(hand.id, history);
    }

    // Smooth openness
    const smoothedOpenness = this._config.smoothingEnabled
      ? this.smoothValue(rawOpenness, history.smoothedOpenness)
      : rawOpenness;

    // Calculate openness derivative
    const opennessDerivative =
      (smoothedOpenness - history.smoothedOpenness) / Math.max(1, timestamp - history.gestureStartTime);

    history.smoothedOpenness = smoothedOpenness;

    // Detect gesture
    const detectedGesture = this.detectGesture(hand.landmarks, fingers, smoothedOpenness);

    // Update gesture timing
    if (detectedGesture !== history.lastGesture) {
      history.lastGesture = detectedGesture;
      history.gestureStartTime = timestamp;
    }

    const duration = timestamp - history.gestureStartTime;

    // Build gesture state
    const gesture: GestureState = {
      type: duration >= this._config.minDuration ? detectedGesture : handState.gesture.type,
      confidence: this.calculateGestureConfidence(detectedGesture, fingers, smoothedOpenness),
      duration: detectedGesture === handState.gesture.type ? handState.gesture.duration + (timestamp - handState.gesture.duration) : 0,
    };

    // Correct duration calculation
    gesture.duration = duration;

    const openness: HandOpenness = {
      value: smoothedOpenness,
      derivative: opennessDerivative,
    };

    return {
      ...handState,
      gesture,
      fingers,
      openness,
    };
  }

  /**
   * Detect which fingers are extended.
   */
  private detectFingerStates(landmarks: HandLandmarks): FingerStates {
    const thumb = this.isThumbExtended(landmarks);
    const index = this.isFingerExtended(landmarks, 'index');
    const middle = this.isFingerExtended(landmarks, 'middle');
    const ring = this.isFingerExtended(landmarks, 'ring');
    const pinky = this.isFingerExtended(landmarks, 'pinky');

    const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

    return { thumb, index, middle, ring, pinky, extendedCount };
  }

  /**
   * Check if thumb is extended.
   * Thumb uses different logic - checks if tip is further from palm than IP joint.
   */
  private isThumbExtended(landmarks: HandLandmarks): boolean {
    const thumbTip = landmarks[HandLandmark.THUMB_TIP];
    const thumbIp = landmarks[HandLandmark.THUMB_IP];
    const thumbMcp = landmarks[HandLandmark.THUMB_MCP];
    const wrist = landmarks[HandLandmark.WRIST];

    // Distance from tip to wrist should be greater than IP to wrist
    const tipToWrist = this.distance3D(thumbTip, wrist);
    const ipToWrist = this.distance3D(thumbIp, wrist);
    const mcpToWrist = this.distance3D(thumbMcp, wrist);

    return tipToWrist > ipToWrist && tipToWrist > mcpToWrist * 1.2;
  }

  /**
   * Check if a finger is extended using angle between joints.
   */
  private isFingerExtended(
    landmarks: HandLandmarks,
    finger: 'index' | 'middle' | 'ring' | 'pinky'
  ): boolean {
    const fingerIndices = {
      index: {
        mcp: HandLandmark.INDEX_FINGER_MCP,
        pip: HandLandmark.INDEX_FINGER_PIP,
        dip: HandLandmark.INDEX_FINGER_DIP,
        tip: HandLandmark.INDEX_FINGER_TIP,
      },
      middle: {
        mcp: HandLandmark.MIDDLE_FINGER_MCP,
        pip: HandLandmark.MIDDLE_FINGER_PIP,
        dip: HandLandmark.MIDDLE_FINGER_DIP,
        tip: HandLandmark.MIDDLE_FINGER_TIP,
      },
      ring: {
        mcp: HandLandmark.RING_FINGER_MCP,
        pip: HandLandmark.RING_FINGER_PIP,
        dip: HandLandmark.RING_FINGER_DIP,
        tip: HandLandmark.RING_FINGER_TIP,
      },
      pinky: {
        mcp: HandLandmark.PINKY_MCP,
        pip: HandLandmark.PINKY_PIP,
        dip: HandLandmark.PINKY_DIP,
        tip: HandLandmark.PINKY_TIP,
      },
    };

    const indices = fingerIndices[finger];
    const mcp = landmarks[indices.mcp];
    const pip = landmarks[indices.pip];
    const dip = landmarks[indices.dip];
    const tip = landmarks[indices.tip];

    // Calculate angles at PIP and DIP joints
    const pipAngle = this.calculateAngle(mcp, pip, dip);
    const dipAngle = this.calculateAngle(pip, dip, tip);

    // Finger is extended if both angles are greater than threshold
    return pipAngle > this._config.extensionAngleThreshold && dipAngle > this._config.extensionAngleThreshold;
  }

  /**
   * Calculate angle between three points (in radians).
   */
  private calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
    const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

    const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
    const magnitudeBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
    const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

    if (magnitudeBA === 0 || magnitudeBC === 0) {
      return 0;
    }

    const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magnitudeBA * magnitudeBC)));
    return Math.acos(cosAngle);
  }

  /**
   * Calculate 3D distance between two points.
   */
  private distance3D(a: Point3D, b: Point3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
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
   * Calculate overall hand openness [0, 1].
   */
  private calculateOpenness(landmarks: HandLandmarks): number {
    const wrist = landmarks[HandLandmark.WRIST];

    // Calculate average distance from fingertips to wrist
    const fingertips = [
      landmarks[HandLandmark.THUMB_TIP],
      landmarks[HandLandmark.INDEX_FINGER_TIP],
      landmarks[HandLandmark.MIDDLE_FINGER_TIP],
      landmarks[HandLandmark.RING_FINGER_TIP],
      landmarks[HandLandmark.PINKY_TIP],
    ];

    const avgDistance = fingertips.reduce((sum, tip) => sum + this.distance3D(tip, wrist), 0) / 5;

    // Normalize based on typical hand proportions
    // Fully open hand has fingertips at ~0.4-0.5 distance from wrist
    // Closed fist has fingertips at ~0.1-0.2 distance from wrist
    const normalized = (avgDistance - 0.1) / 0.35;

    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Detect the primary gesture from landmarks and finger states.
   */
  private detectGesture(
    landmarks: HandLandmarks,
    fingers: FingerStates,
    openness: number
  ): GestureType {
    // Check for pinch (thumb and index close together)
    if (this.isPinching(landmarks)) {
      return GestureType.PINCH;
    }

    // Closed fist (no fingers extended, low openness)
    if (fingers.extendedCount === 0 && openness < 0.3) {
      return GestureType.CLOSED_FIST;
    }

    // Thumbs up (only thumb extended)
    if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return GestureType.THUMBS_UP;
    }

    // Pointing (only index extended)
    if (!fingers.thumb && fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return GestureType.POINTING;
    }

    // Peace sign (index and middle extended)
    if (
      !fingers.thumb &&
      fingers.index &&
      fingers.middle &&
      !fingers.ring &&
      !fingers.pinky
    ) {
      return GestureType.PEACE;
    }

    // Open hand (most fingers extended, high openness)
    if (fingers.extendedCount >= 4 && openness > 0.5) {
      return GestureType.OPEN_HAND;
    }

    return GestureType.NONE;
  }

  /**
   * Check if thumb and index finger are pinching.
   */
  private isPinching(landmarks: HandLandmarks): boolean {
    const thumbTip = landmarks[HandLandmark.THUMB_TIP];
    const indexTip = landmarks[HandLandmark.INDEX_FINGER_TIP];

    const distance = this.distance2D(thumbTip, indexTip);

    return distance < this._config.pinchThreshold;
  }

  /**
   * Calculate confidence for detected gesture.
   */
  private calculateGestureConfidence(
    gesture: GestureType,
    fingers: FingerStates,
    openness: number
  ): number {
    switch (gesture) {
      case GestureType.CLOSED_FIST:
        return Math.min(1, (0.3 - openness) / 0.3 + (5 - fingers.extendedCount) / 5);

      case GestureType.OPEN_HAND:
        return Math.min(1, openness / 0.7 + fingers.extendedCount / 5);

      case GestureType.POINTING:
      case GestureType.THUMBS_UP:
      case GestureType.PEACE:
        return fingers.extendedCount <= 2 ? 0.9 : 0.7;

      case GestureType.PINCH:
        return 0.95;

      default:
        return 0.5;
    }
  }

  /**
   * Smooth a value with exponential moving average.
   */
  private smoothValue(current: number, previous: number): number {
    const alpha = 1 - this._config.smoothingFactor;
    return alpha * current + this._config.smoothingFactor * previous;
  }
}
