/**
 * Hand Tracking Type Definitions
 *
 * These types define the data structures for hand landmark detection
 * from MediaPipe Hands.
 */

/**
 * A single 3D point in normalized coordinates.
 * All values are in range [0, 1].
 */
export interface Point3D {
  /** X coordinate (0 = left edge, 1 = right edge) */
  x: number;

  /** Y coordinate (0 = top edge, 1 = bottom edge) */
  y: number;

  /** Z coordinate (depth, 0 = camera plane, negative = towards camera) */
  z: number;
}

/**
 * MediaPipe hand landmark indices.
 * Each hand has 21 landmarks in a specific arrangement.
 *
 * ```
 *    4   8  12  16  20    ← Fingertips
 *    |   |   |   |   |
 *    3   7  11  15  19
 *    |   |   |   |   |
 *    2   6  10  14  18
 *    |   |   |   |   |
 *    1   5   9  13  17
 *     \ /   |   |   /
 *      0 ───┴───┴──┘       ← Wrist
 * ```
 */
export enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}

/**
 * Complete set of landmarks for one hand.
 * Always exactly 21 points in fixed order.
 */
export type HandLandmarks = [
  Point3D,
  Point3D,
  Point3D,
  Point3D,
  Point3D, // Wrist + Thumb (0-4)
  Point3D,
  Point3D,
  Point3D,
  Point3D, // Index (5-8)
  Point3D,
  Point3D,
  Point3D,
  Point3D, // Middle (9-12)
  Point3D,
  Point3D,
  Point3D,
  Point3D, // Ring (13-16)
  Point3D,
  Point3D,
  Point3D,
  Point3D, // Pinky (17-20)
];

/**
 * Handedness classification.
 */
export type Handedness = 'Left' | 'Right';

/**
 * Data for a single detected hand.
 */
export interface HandData {
  /** Unique identifier for this hand (0 or 1) */
  id: number;

  /** Which hand (Left or Right) */
  handedness: Handedness;

  /** All 21 landmark points */
  landmarks: HandLandmarks;

  /** Detection confidence score [0, 1] */
  confidence: number;
}

/**
 * Complete hand tracking frame output.
 * This is what HandTracker emits.
 */
export interface HandFrame {
  /** Array of detected hands (0-2 hands) */
  hands: HandData[];

  /** Number of hands detected */
  handCount: number;

  /** Frame timestamp (ms since epoch) */
  timestamp: number;

  /** Processing time for this frame (ms) */
  processingTime: number;
}

/**
 * Skeleton connections for drawing hand skeleton.
 * Each tuple represents a connection between two landmarks.
 */
export const HAND_CONNECTIONS: ReadonlyArray<[HandLandmark, HandLandmark]> = [
  // Thumb
  [HandLandmark.WRIST, HandLandmark.THUMB_CMC],
  [HandLandmark.THUMB_CMC, HandLandmark.THUMB_MCP],
  [HandLandmark.THUMB_MCP, HandLandmark.THUMB_IP],
  [HandLandmark.THUMB_IP, HandLandmark.THUMB_TIP],
  // Index finger
  [HandLandmark.WRIST, HandLandmark.INDEX_FINGER_MCP],
  [HandLandmark.INDEX_FINGER_MCP, HandLandmark.INDEX_FINGER_PIP],
  [HandLandmark.INDEX_FINGER_PIP, HandLandmark.INDEX_FINGER_DIP],
  [HandLandmark.INDEX_FINGER_DIP, HandLandmark.INDEX_FINGER_TIP],
  // Middle finger
  [HandLandmark.WRIST, HandLandmark.MIDDLE_FINGER_MCP],
  [HandLandmark.MIDDLE_FINGER_MCP, HandLandmark.MIDDLE_FINGER_PIP],
  [HandLandmark.MIDDLE_FINGER_PIP, HandLandmark.MIDDLE_FINGER_DIP],
  [HandLandmark.MIDDLE_FINGER_DIP, HandLandmark.MIDDLE_FINGER_TIP],
  // Ring finger
  [HandLandmark.WRIST, HandLandmark.RING_FINGER_MCP],
  [HandLandmark.RING_FINGER_MCP, HandLandmark.RING_FINGER_PIP],
  [HandLandmark.RING_FINGER_PIP, HandLandmark.RING_FINGER_DIP],
  [HandLandmark.RING_FINGER_DIP, HandLandmark.RING_FINGER_TIP],
  // Pinky finger
  [HandLandmark.WRIST, HandLandmark.PINKY_MCP],
  [HandLandmark.PINKY_MCP, HandLandmark.PINKY_PIP],
  [HandLandmark.PINKY_PIP, HandLandmark.PINKY_DIP],
  [HandLandmark.PINKY_DIP, HandLandmark.PINKY_TIP],
  // Palm connections
  [HandLandmark.INDEX_FINGER_MCP, HandLandmark.MIDDLE_FINGER_MCP],
  [HandLandmark.MIDDLE_FINGER_MCP, HandLandmark.RING_FINGER_MCP],
  [HandLandmark.RING_FINGER_MCP, HandLandmark.PINKY_MCP],
];
