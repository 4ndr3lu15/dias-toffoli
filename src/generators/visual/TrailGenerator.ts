/**
 * TrailGenerator
 *
 * Renders motion trails following hand movement.
 * Trail points are collected from hand positions, aged each frame,
 * and drawn as color-cycling line segments that fade with age.
 */

import type { Observable, Subscription } from 'rxjs';
import type { ControlState } from '../../types/control.types';
import type { IGenerator, TrailGeneratorConfig } from '../IGenerator';
import { DEFAULT_TRAIL_CONFIG } from '../IGenerator';

/**
 * A single trail point with position and age.
 */
interface TrailPoint {
  x: number;
  y: number;
  /** Frames since creation (incremented each render cycle) */
  age: number;
  /** Which hand produced this point (for separate trail colors) */
  handId: number;
}

/**
 * TrailGenerator draws smooth motion trails that follow
 * tracked hand positions with age-based fading and HSL color cycling.
 */
export class TrailGenerator implements IGenerator {
  readonly name = 'TrailGenerator';

  private config: TrailGeneratorConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private trailPoints: TrailPoint[] = [];
  private animationId: number | null = null;
  private subscription: Subscription | null = null;
  private _isRunning = false;

  constructor(config?: Partial<TrailGeneratorConfig>) {
    this.config = { ...DEFAULT_TRAIL_CONFIG, ...config };
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Set the canvas element for rendering.
   * Must be called before start().
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
  }

  /**
   * Connect to a ControlState stream.
   * Collects trail points from tracked hand positions.
   */
  connect(state$: Observable<ControlState>): void {
    this.disconnect();

    this.subscription = state$.subscribe({
      next: (state) => {
        if (!this._isRunning || !this.canvas) return;

        // Add new trail points from tracked hands
        for (const hand of state.hands) {
          if (hand.isTracked) {
            this.trailPoints.push({
              x: hand.position.x * this.canvas.width,
              y: hand.position.y * this.canvas.height,
              age: 0,
              handId: hand.handId,
            });
          }
        }

        // Age all existing points and remove expired ones
        this.trailPoints = this.trailPoints
          .map((p) => ({ ...p, age: p.age + 1 }))
          .filter((p) => p.age < this.config.maxTrailLength);
      },
      error: (err) => {
        console.error(`[${this.name}] Stream error:`, err);
      },
    });
  }

  /**
   * Disconnect from the current stream.
   */
  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /**
   * Start rendering trails.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    if (!this.canvas || !this.ctx) {
      throw new Error(`[${this.name}] Canvas not set. Call setCanvas() before start().`);
    }

    this._isRunning = true;
    this.animate();
  }

  /**
   * Stop the animation loop.
   */
  stop(): void {
    if (!this._isRunning) return;

    this._isRunning = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this.stop();
    this.disconnect();
    this.trailPoints = [];
    this.ctx = null;
    this.canvas = null;
  }

  /**
   * Main animation loop.
   */
  private animate(): void {
    if (!this._isRunning) return;

    this.render();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Render trail segments to canvas.
   * Each segment fades in alpha and width based on age.
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear with transparent background so trails layer over other visuals
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { maxTrailLength, maxLineWidth, hueRotationSpeed, saturation, lightness } = this.config;

    // Group points by handId for separate trail lines
    const handGroups = new Map<number, TrailPoint[]>();
    for (const point of this.trailPoints) {
      const group = handGroups.get(point.handId);
      if (group) {
        group.push(point);
      } else {
        handGroups.set(point.handId, [point]);
      }
    }

    // Draw trail for each hand
    for (const [, points] of handGroups) {
      // Sort by age descending so we draw oldest first (newest on top)
      const sorted = [...points].sort((a, b) => b.age - a.age);

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        const ageRatio = curr.age / maxTrailLength;
        const alpha = 1 - ageRatio;
        const lineWidth = (1 - ageRatio) * maxLineWidth;
        const hue = curr.age * hueRotationSpeed;

        this.ctx.beginPath();
        this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(prev.x, prev.y);
        this.ctx.lineTo(curr.x, curr.y);
        this.ctx.stroke();
      }
    }
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<TrailGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current trail point count (for testing/debugging).
   */
  getTrailPointCount(): number {
    return this.trailPoints.length;
  }

  /**
   * Clear all trail points.
   */
  clearTrails(): void {
    this.trailPoints = [];
  }
}
