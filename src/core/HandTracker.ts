/**
 * HandTracker Implementation
 *
 * MediaPipe-based hand tracking with observable stream output.
 * Loads MediaPipe from CDN for reliable browser compatibility.
 */

import { Subject, Observable } from 'rxjs';
import type { HandFrame, HandData, HandLandmarks, Point3D, Handedness } from '../types';
import { LANDMARKS_PER_HAND } from '../types';
import type {
  MediaPipeHands,
  MediaPipeResults,
  MediaPipeHandsConstructor,
} from '../types/mediapipe.types';
import type { IHandTracker, HandTrackerConfig } from './IHandTracker';
import { DEFAULT_HAND_TRACKER_CONFIG } from './IHandTracker';
import { LandmarkSmoother } from '../utils/smoothing';
import {
  loadMediaPipeHands,
  getMediaPipeFileLocator,
  type LoadingProgressCallback,
} from '../utils/mediapipe-loader';

/**
 * MediaPipe-based hand tracker implementation.
 */
export class HandTracker implements IHandTracker {
  private readonly config: HandTrackerConfig;
  private hands: MediaPipeHands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private subject = new Subject<HandFrame>();
  private smoother: LandmarkSmoother;
  private animationFrameId: number | null = null;
  private _isTracking = false;
  private initialized = false;
  private lastTimestamp = 0;

  /**
   * Create a new HandTracker instance.
   *
   * @param config - Configuration options
   */
  constructor(config: Partial<HandTrackerConfig> = {}) {
    this.config = { ...DEFAULT_HAND_TRACKER_CONFIG, ...config };
    this.smoother = new LandmarkSmoother(
      this.config.smoothingFactor,
      5 // buffer size
    );
  }

  /**
   * Observable stream of hand tracking data.
   */
  get hands$(): Observable<HandFrame> {
    return this.subject.asObservable();
  }

  /**
   * Current tracking status.
   */
  get isTracking(): boolean {
    return this._isTracking;
  }

  /**
   * Initialize the tracker with a video element.
   *
   * @param videoElement - HTML video element to use as source
   * @param onProgress - Optional callback for loading progress updates
   */
  async initialize(
    videoElement: HTMLVideoElement,
    onProgress?: LoadingProgressCallback
  ): Promise<void> {
    if (this.initialized) {
      throw new Error('HandTracker is already initialized. Call dispose() first.');
    }

    this.videoElement = videoElement;

    // Load MediaPipe from CDN
    onProgress?.('Loading hand tracking model...', 0);
    const HandsConstructor: MediaPipeHandsConstructor = await loadMediaPipeHands(onProgress);

    // Initialize MediaPipe Hands
    this.hands = new HandsConstructor({
      locateFile: getMediaPipeFileLocator(),
    });

    this.hands.setOptions({
      maxNumHands: this.config.maxHands,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence,
      modelComplexity: 1, // 0 = lite, 1 = full
    });

    // Set up results handler
    this.hands.onResults((results: MediaPipeResults) => {
      this.processResults(results);
    });

    onProgress?.('Hand tracking ready', 100);
    this.initialized = true;
  }

  /**
   * Start tracking.
   */
  start(): void {
    if (!this.initialized) {
      console.warn('HandTracker not initialized. Call initialize() first.');
      return;
    }

    if (this._isTracking) {
      return;
    }

    this._isTracking = true;
    this.lastTimestamp = performance.now();
    this.requestFrame();
  }

  /**
   * Stop tracking.
   */
  stop(): void {
    this._isTracking = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this.stop();

    if (this.hands) {
      void this.hands.close();
      this.hands = null;
    }

    this.smoother.clear();
    this.subject.complete();
    this.videoElement = null;
    this.initialized = false;
  }

  /**
   * Request next frame processing.
   */
  private requestFrame(): void {
    if (!this._isTracking) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => {
      void this.processFrame();
    });
  }

  /**
   * Process a single video frame.
   */
  private async processFrame(): Promise<void> {
    if (!this._isTracking || !this.hands || !this.videoElement) {
      return;
    }

    const now = performance.now();
    const frameInterval = 1000 / this.config.targetFps;

    // Throttle to target FPS
    if (now - this.lastTimestamp < frameInterval) {
      this.requestFrame();
      return;
    }

    this.lastTimestamp = now;

    try {
      // Send frame to MediaPipe
      await this.hands.send({ image: this.videoElement });
    } catch (error) {
      console.error('Error processing frame:', error);
    }

    this.requestFrame();
  }

  /**
   * Process MediaPipe results and emit HandFrame.
   */
  private processResults(results: MediaPipeResults): void {
    const startTime = performance.now();

    const hands: HandData[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        if (landmarks && handedness) {
          // Convert landmarks to our format
          let handLandmarks = this.convertLandmarks(landmarks);

          // Apply smoothing if enabled
          if (this.config.smoothing) {
            handLandmarks = this.smoother.smoothLandmarks(i, handLandmarks);
          }

          hands.push({
            id: i,
            handedness: handedness.label as Handedness,
            landmarks: handLandmarks,
            confidence: handedness.score ?? 0.9,
          });
        }
      }
    }

    const processingTime = performance.now() - startTime;

    const frame: HandFrame = {
      hands,
      handCount: hands.length,
      timestamp: Date.now(),
      processingTime,
    };

    this.subject.next(frame);
  }

  /**
   * Convert MediaPipe landmarks to our format.
   */
  private convertLandmarks(
    landmarks: Array<{ x: number; y: number; z: number }>
  ): HandLandmarks {
    const points: Point3D[] = [];

    for (let i = 0; i < LANDMARKS_PER_HAND; i++) {
      const lm = landmarks[i];
      if (lm) {
        points.push({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        });
      } else {
        // Fallback for missing landmarks
        points.push({ x: 0, y: 0, z: 0 });
      }
    }

    return points as HandLandmarks;
  }
}
