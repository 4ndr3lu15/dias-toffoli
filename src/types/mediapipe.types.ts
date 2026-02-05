/**
 * MediaPipe Type Definitions
 *
 * Type definitions for MediaPipe Hands API loaded from CDN.
 * These types cover the subset of the API we use in this project.
 */

/**
 * MediaPipe landmark point (normalized coordinates).
 */
export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Handedness classification result.
 */
export interface MediaPipeHandedness {
  /** Classification index */
  index: number;
  /** Confidence score [0, 1] */
  score: number;
  /** Category name ('Left' or 'Right') */
  categoryName: string;
  /** Display name */
  displayName: string;
  /** Label ('Left' or 'Right') */
  label: string;
}

/**
 * MediaPipe Hands results from processing a frame.
 */
export interface MediaPipeResults {
  /** Image data that was processed */
  image: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement;
  /** Array of hand landmarks (one array per hand) */
  multiHandLandmarks?: MediaPipeLandmark[][];
  /** Array of world landmarks (one array per hand) */
  multiHandWorldLandmarks?: MediaPipeLandmark[][];
  /** Handedness classification for each hand */
  multiHandedness?: MediaPipeHandedness[];
}

/**
 * Configuration options for MediaPipe Hands.
 */
export interface MediaPipeHandsConfig {
  /** Function to locate MediaPipe files (WASM, etc.) */
  locateFile?: (file: string) => string;
}

/**
 * Options for MediaPipe Hands detection.
 */
export interface MediaPipeHandsOptions {
  /** Enable self-segmentation model */
  selfieMode?: boolean;
  /** Maximum number of hands to detect (1 or 2) */
  maxNumHands?: number;
  /** Model complexity (0 = lite, 1 = full) */
  modelComplexity?: 0 | 1;
  /** Minimum confidence for detection [0, 1] */
  minDetectionConfidence?: number;
  /** Minimum confidence for tracking [0, 1] */
  minTrackingConfidence?: number;
}

/**
 * Input for MediaPipe Hands processing.
 */
export interface MediaPipeHandsInput {
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

/**
 * MediaPipe Hands class interface.
 */
export interface MediaPipeHands {
  /**
   * Set detection options.
   */
  setOptions(options: MediaPipeHandsOptions): void;

  /**
   * Register callback for results.
   */
  onResults(callback: (results: MediaPipeResults) => void): void;

  /**
   * Send an image frame for processing.
   */
  send(input: MediaPipeHandsInput): Promise<void>;

  /**
   * Initialize the model (optional, auto-initializes on first send).
   */
  initialize(): Promise<void>;

  /**
   * Close and release resources.
   */
  close(): Promise<void>;
}

/**
 * MediaPipe Hands constructor type.
 */
export interface MediaPipeHandsConstructor {
  new (config?: MediaPipeHandsConfig): MediaPipeHands;
}

/**
 * Global window augmentation for MediaPipe.
 */
declare global {
  interface Window {
    Hands?: MediaPipeHandsConstructor;
  }
}
