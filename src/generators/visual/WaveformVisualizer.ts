/**
 * WaveformVisualizer
 *
 * Real-time audio waveform display using Tone.Analyser.
 * Unlike other generators, this connects to an audio source
 * rather than reacting to ControlState.
 */

import * as Tone from 'tone';
import type { Observable, Subscription } from 'rxjs';
import type { ControlState } from '../../types/control.types';
import type { IGenerator, WaveformVisualizerConfig } from '../IGenerator';
import { DEFAULT_WAVEFORM_CONFIG } from '../IGenerator';

/**
 * WaveformVisualizer renders the audio output waveform
 * on a canvas element in real time.
 */
export class WaveformVisualizer implements IGenerator {
  readonly name = 'WaveformVisualizer';

  private config: WaveformVisualizerConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private analyser: Tone.Analyser | null = null;
  private animationId: number | null = null;
  private subscription: Subscription | null = null;
  private _isRunning = false;

  constructor(config?: Partial<WaveformVisualizerConfig>) {
    this.config = { ...DEFAULT_WAVEFORM_CONFIG, ...config };
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
   * The waveform visualizer does not use ControlState directly —
   * it visualizes the audio output. This is a no-op for the data stream,
   * but stores the subscription for interface compliance.
   */
  connect(state$: Observable<ControlState>): void {
    this.disconnect();

    // Subscribe but don't act on state — waveform comes from audio, not hands
    this.subscription = state$.subscribe({
      error: (err) => {
        console.error(`[${this.name}] Stream error:`, err);
      },
    });
  }

  /**
   * Connect to an audio source for waveform analysis.
   * This is the primary data source for the visualizer.
   */
  connectAudio(source: Tone.ToneAudioNode): void {
    // Dispose previous analyser if any
    if (this.analyser) {
      this.analyser.dispose();
    }

    this.analyser = new Tone.Analyser('waveform', this.config.fftSize);
    source.connect(this.analyser);
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
   * Start rendering the waveform.
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

    if (this.analyser) {
      this.analyser.dispose();
      this.analyser = null;
    }

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
   * Render the waveform to canvas.
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const { lineColor, lineWidth, backgroundColor } = this.config;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear background
    if (backgroundColor === 'transparent') {
      this.ctx.clearRect(0, 0, width, height);
    } else {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, width, height);
    }

    // If no analyser connected, draw a flat center line
    if (!this.analyser) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = lineColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.moveTo(0, height / 2);
      this.ctx.lineTo(width, height / 2);
      this.ctx.stroke();
      return;
    }

    // Get waveform data
    const values = this.analyser.getValue();

    // Tone.Analyser.getValue() returns Float32Array for waveform type
    if (!(values instanceof Float32Array)) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = lineColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineJoin = 'round';

    const sliceWidth = width / values.length;
    let x = 0;

    for (let i = 0; i < values.length; i++) {
      // values range from -1 to 1; map to canvas height
      const y = ((values[i] + 1) / 2) * height;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.stroke();
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<WaveformVisualizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if an audio source is connected.
   */
  hasAudioSource(): boolean {
    return this.analyser !== null;
  }
}
