/**
 * Application Constants
 *
 * Centralized configuration values used throughout the application.
 */

/** Number of landmarks per hand (MediaPipe standard) */
export const LANDMARKS_PER_HAND = 21;

/** Maximum number of hands to track */
export const MAX_HANDS = 2;

/** Target frame rate for hand tracking */
export const TARGET_FPS = 30;

/** Frame interval in milliseconds */
export const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/** Default smoothing factor for position (0 = no smoothing, 1 = infinite smoothing) */
export const DEFAULT_SMOOTHING = 0.3;

/** Minimum confidence for gesture detection */
export const MIN_GESTURE_CONFIDENCE = 0.7;

/** Minimum confidence for hand detection */
export const MIN_DETECTION_CONFIDENCE = 0.7;

/** Minimum confidence for hand tracking */
export const MIN_TRACKING_CONFIDENCE = 0.5;

/** Finger landmark indices for each finger */
export const FINGER_LANDMARKS = {
  thumb: [1, 2, 3, 4] as const,
  index: [5, 6, 7, 8] as const,
  middle: [9, 10, 11, 12] as const,
  ring: [13, 14, 15, 16] as const,
  pinky: [17, 18, 19, 20] as const,
} as const;

/** Fingertip landmark indices */
export const FINGERTIP_LANDMARKS = [4, 8, 12, 16, 20] as const;

/** Landmark colors for visualization */
export const LANDMARK_COLORS = {
  wrist: '#ffd93d',
  thumb: '#ff6b6b',
  index: '#4ecdc4',
  middle: '#45b7d1',
  ring: '#96ceb4',
  pinky: '#dda0dd',
} as const;

/** Connection line color */
export const CONNECTION_COLOR = 'rgba(255, 255, 255, 0.6)';

/** Landmark radius for visualization */
export const LANDMARK_RADIUS = 5;

/** Connection line width */
export const CONNECTION_WIDTH = 2;
