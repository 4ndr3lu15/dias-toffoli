/**
 * Debug Overlay Component
 *
 * Draws hand landmarks and skeleton on a canvas overlay.
 */

import type { HandFrame, HandData, Point3D } from '../types';
import {
  HAND_CONNECTIONS,
  HandLandmark,
  LANDMARK_COLORS,
  LANDMARK_RADIUS,
  CONNECTION_COLOR,
  CONNECTION_WIDTH,
} from '../types';

/**
 * Debug overlay configuration.
 */
export interface DebugOverlayConfig {
  /** Show landmark points */
  showLandmarks: boolean;

  /** Show skeleton connections */
  showConnections: boolean;

  /** Show FPS counter */
  showFps: boolean;

  /** Landmark point radius */
  landmarkRadius: number;

  /** Connection line width */
  connectionWidth: number;
}

/**
 * Default debug overlay configuration.
 */
export const DEFAULT_DEBUG_OVERLAY_CONFIG: DebugOverlayConfig = {
  showLandmarks: true,
  showConnections: true,
  showFps: true,
  landmarkRadius: LANDMARK_RADIUS,
  connectionWidth: CONNECTION_WIDTH,
};

/**
 * FPS calculator for performance monitoring.
 */
class FpsCalculator {
  private frames: number[] = [];
  private readonly windowSize = 30;

  /**
   * Record a frame timestamp.
   */
  tick(): void {
    const now = performance.now();
    this.frames.push(now);

    // Keep only recent frames
    while (this.frames.length > this.windowSize) {
      this.frames.shift();
    }
  }

  /**
   * Calculate current FPS.
   */
  getFps(): number {
    if (this.frames.length < 2) return 0;

    const first = this.frames[0];
    const last = this.frames[this.frames.length - 1];
    const elapsed = last - first;

    if (elapsed === 0) return 0;

    return Math.round(((this.frames.length - 1) / elapsed) * 1000);
  }

  /**
   * Reset the calculator.
   */
  reset(): void {
    this.frames = [];
  }
}

/**
 * Debug overlay for visualizing hand tracking data.
 */
export class DebugOverlay {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: DebugOverlayConfig;
  private fpsCalculator = new FpsCalculator();
  private fpsElement: HTMLElement | null = null;

  /**
   * Create a new DebugOverlay instance.
   */
  constructor(config: Partial<DebugOverlayConfig> = {}) {
    this.config = { ...DEFAULT_DEBUG_OVERLAY_CONFIG, ...config };
  }

  /**
   * Initialize the overlay with a canvas element.
   */
  initialize(canvas: HTMLCanvasElement, fpsElement?: HTMLElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.fpsElement = fpsElement ?? null;
  }

  /**
   * Set canvas dimensions to match video.
   */
  setDimensions(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Draw a hand frame on the overlay.
   */
  draw(frame: HandFrame): void {
    if (!this.ctx || !this.canvas) return;

    // Clear previous frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update FPS
    this.fpsCalculator.tick();
    this.updateFpsDisplay();

    // Draw each hand
    for (const hand of frame.hands) {
      this.drawHand(hand);
    }
  }

  /**
   * Clear the overlay.
   */
  clear(): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.clear();
    this.fpsCalculator.reset();
    this.canvas = null;
    this.ctx = null;
    this.fpsElement = null;
  }

  /**
   * Draw a single hand.
   */
  private drawHand(hand: HandData): void {
    if (!this.ctx || !this.canvas) return;

    const { landmarks } = hand;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Draw connections first (under landmarks)
    if (this.config.showConnections) {
      this.drawConnections(landmarks, width, height);
    }

    // Draw landmarks on top
    if (this.config.showLandmarks) {
      this.drawLandmarks(landmarks, width, height);
    }
  }

  /**
   * Draw skeleton connections.
   */
  private drawConnections(landmarks: Point3D[], width: number, height: number): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = CONNECTION_COLOR;
    this.ctx.lineWidth = this.config.connectionWidth;
    this.ctx.lineCap = 'round';

    for (const [start, end] of HAND_CONNECTIONS) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];

      if (!p1 || !p2) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * width, p1.y * height);
      this.ctx.lineTo(p2.x * width, p2.y * height);
      this.ctx.stroke();
    }
  }

  /**
   * Draw landmark points.
   */
  private drawLandmarks(landmarks: Point3D[], width: number, height: number): void {
    if (!this.ctx) return;

    for (let i = 0; i < landmarks.length; i++) {
      const point = landmarks[i];
      if (!point) continue;

      const x = point.x * width;
      const y = point.y * height;
      const color = this.getLandmarkColor(i);

      this.ctx.beginPath();
      this.ctx.arc(x, y, this.config.landmarkRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      // Add subtle outline for visibility
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  /**
   * Get color for a landmark based on its index.
   */
  private getLandmarkColor(index: number): string {
    const wristIndex = HandLandmark.WRIST as number;
    const thumbTipIndex = HandLandmark.THUMB_TIP as number;
    const indexTipIndex = HandLandmark.INDEX_FINGER_TIP as number;
    const middleTipIndex = HandLandmark.MIDDLE_FINGER_TIP as number;
    const ringTipIndex = HandLandmark.RING_FINGER_TIP as number;

    if (index === wristIndex) {
      return LANDMARK_COLORS.wrist;
    } else if (index <= thumbTipIndex) {
      return LANDMARK_COLORS.thumb;
    } else if (index <= indexTipIndex) {
      return LANDMARK_COLORS.index;
    } else if (index <= middleTipIndex) {
      return LANDMARK_COLORS.middle;
    } else if (index <= ringTipIndex) {
      return LANDMARK_COLORS.ring;
    } else {
      return LANDMARK_COLORS.pinky;
    }
  }

  /**
   * Update FPS display.
   */
  private updateFpsDisplay(): void {
    if (!this.config.showFps || !this.fpsElement) return;

    const fps = this.fpsCalculator.getFps();
    this.fpsElement.textContent = `FPS: ${fps}`;
  }
}
