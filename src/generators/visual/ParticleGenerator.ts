/**
 * ParticleGenerator
 *
 * Canvas 2D particle system controlled by hand positions.
 * Particles are attracted toward tracked hand positions,
 * creating an organic, fluid visual effect.
 */

import type { Observable, Subscription } from 'rxjs';
import type { ControlState } from '../../types/control.types';
import type { Particle } from '../../types/generator.types';
import type { IGenerator, ParticleGeneratorConfig } from '../IGenerator';
import { DEFAULT_PARTICLE_CONFIG } from '../IGenerator';

/**
 * Attractor point derived from hand position.
 */
interface Attractor {
  x: number;
  y: number;
  hue: number;
}

/**
 * ParticleGenerator renders a Canvas 2D particle system
 * where particles are attracted to tracked hand positions.
 */
export class ParticleGenerator implements IGenerator {
  readonly name = 'ParticleGenerator';

  private config: ParticleGeneratorConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private attractors: Attractor[] = [];
  private animationId: number | null = null;
  private subscription: Subscription | null = null;
  private _isRunning = false;

  constructor(config?: Partial<ParticleGeneratorConfig>) {
    this.config = { ...DEFAULT_PARTICLE_CONFIG, ...config };
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
   * Updates attractor positions from hand data.
   */
  connect(state$: Observable<ControlState>): void {
    this.disconnect();

    this.subscription = state$.subscribe({
      next: (state) => {
        if (!this.canvas) return;

        this.attractors = state.hands
          .filter((h) => h.isTracked)
          .map((h) => ({
            x: h.position.x * this.canvas!.width,
            y: h.position.y * this.canvas!.height,
            hue: h.position.x * 360,
          }));
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
   * Start the particle system.
   * Initializes particles and begins the animation loop.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    if (!this.canvas || !this.ctx) {
      throw new Error(`[${this.name}] Canvas not set. Call setCanvas() before start().`);
    }

    this.initializeParticles();
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
    this.particles = [];
    this.attractors = [];
    this.ctx = null;
    this.canvas = null;
  }

  /**
   * Initialize particles with random positions and velocities.
   */
  private initializeParticles(): void {
    if (!this.canvas) return;

    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        hue: Math.random() * 360,
        size: this.config.particleSize * (0.5 + Math.random()),
      });
    }
  }

  /**
   * Main animation loop.
   */
  private animate(): void {
    if (!this._isRunning) return;

    this.updateParticles();
    this.render();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Update particle physics: attraction, damping, position, edge wrapping.
   */
  private updateParticles(): void {
    if (!this.canvas) return;

    const { attractionStrength, damping, hueSpeed } = this.config;

    for (const particle of this.particles) {
      // Apply attraction forces from each attractor
      for (const attractor of this.attractors) {
        const dx = attractor.x - particle.x;
        const dy = attractor.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;

        particle.vx += (dx / dist) * attractionStrength;
        particle.vy += (dy / dist) * attractionStrength;
      }

      // Apply damping
      particle.vx *= damping;
      particle.vy *= damping;

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      particle.x = ((particle.x % this.canvas.width) + this.canvas.width) % this.canvas.width;
      particle.y = ((particle.y % this.canvas.height) + this.canvas.height) % this.canvas.height;

      // Interpolate hue toward nearest attractor
      if (this.attractors.length > 0) {
        particle.hue += (this.attractors[0].hue - particle.hue) * hueSpeed;
      }
    }
  }

  /**
   * Render particles to canvas.
   * Uses semi-transparent background fill to create trailing effect.
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Trail effect: semi-transparent background fill instead of clearRect
    this.ctx.fillStyle = `rgba(26, 26, 46, ${this.config.trailOpacity})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw each particle
    for (const particle of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${particle.hue}, 80%, 60%, ${particle.life})`;
      this.ctx.fill();
    }
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<ParticleGeneratorConfig>): void {
    const oldCount = this.config.particleCount;
    this.config = { ...this.config, ...config };

    // Reinitialize particles if count changed
    if (
      config.particleCount !== undefined &&
      config.particleCount !== oldCount &&
      this._isRunning
    ) {
      this.initializeParticles();
    }
  }

  /**
   * Get current particle count (for testing/debugging).
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Get current attractor positions (for testing/debugging).
   */
  getAttractors(): ReadonlyArray<Attractor> {
    return this.attractors;
  }
}
