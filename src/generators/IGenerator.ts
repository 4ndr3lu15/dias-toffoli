/**
 * Generator Interface
 *
 * Generators consume ControlState streams and produce outputs
 * (audio, visuals, etc.). They are the "effectors" that create
 * the user experience.
 */

import type { Observable } from 'rxjs';
import type { ControlState } from '../types/control.types';

/**
 * Base interface for all generators.
 * Generators subscribe to a ControlState stream and produce output.
 */
export interface IGenerator {
  /** Generator name for debugging */
  readonly name: string;

  /**
   * Connect to a control state stream.
   * The generator will react to state changes.
   */
  connect(state$: Observable<ControlState>): void;

  /**
   * Disconnect from the current stream.
   */
  disconnect(): void;

  /**
   * Start generating output.
   * May need to initialize audio context or canvas.
   */
  start(): Promise<void>;

  /**
   * Stop generating output (can be resumed with start()).
   */
  stop(): void;

  /**
   * Is the generator currently running?
   */
  readonly isRunning: boolean;

  /**
   * Release all resources.
   * After dispose(), the generator cannot be restarted.
   */
  dispose(): void;
}

/**
 * Configuration for the SynthGenerator.
 */
export interface SynthGeneratorConfig {
  /** Waveform type */
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';

  /** ADSR envelope */
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };

  /** Frequency range in Hz */
  frequencyRange: { min: number; max: number };

  /** Use musical scale quantization */
  useScale: boolean;

  /** Musical scale (if useScale is true) */
  scale?: import('../types/music.types').Scale;

  /** Polyphony (number of simultaneous voices) */
  polyphony: number;
}

/**
 * Configuration for the HarmonicGenerator.
 */
export interface HarmonicGeneratorConfig {
  /** Number of harmonics to generate */
  harmonicCount: number;

  /** Base frequency range */
  frequencyRange: { min: number; max: number };

  /** Map fingers to harmonic numbers (1-based) */
  fingerMapping: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };

  /** Amplitude when finger is extended vs curled */
  extendedAmplitude: number;
  curledAmplitude: number;
}

/**
 * Configuration for the DrumGenerator.
 */
export interface DrumGeneratorConfig {
  /** Volume of drum sounds [0, 1] */
  volume: number;

  /** Enable/disable individual drum voices */
  enableKick: boolean;
  enableSnare: boolean;
  enableHihat: boolean;
}

/**
 * Default SynthGenerator configuration.
 */
export const DEFAULT_SYNTH_CONFIG: SynthGeneratorConfig = {
  waveform: 'sine',
  envelope: {
    attack: 0.05,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
  frequencyRange: { min: 130.81, max: 1046.5 }, // C3 to C6
  useScale: true,
  polyphony: 4,
};

/**
 * Default HarmonicGenerator configuration.
 */
export const DEFAULT_HARMONIC_CONFIG: HarmonicGeneratorConfig = {
  harmonicCount: 5,
  frequencyRange: { min: 65.41, max: 523.25 }, // C2 to C5
  fingerMapping: {
    thumb: 1,
    index: 2,
    middle: 3,
    ring: 4,
    pinky: 5,
  },
  extendedAmplitude: 1.0,
  curledAmplitude: 0.05,
};

/**
 * Default DrumGenerator configuration.
 */
export const DEFAULT_DRUM_CONFIG: DrumGeneratorConfig = {
  volume: 0.8,
  enableKick: true,
  enableSnare: true,
  enableHihat: true,
};

// ─── Visual Generator Configs ────────────────────────────────

/**
 * Configuration for the ParticleGenerator.
 */
export interface ParticleGeneratorConfig {
  /** Number of particles in the system */
  particleCount: number;

  /** Trail effect opacity [0, 1] — lower values = longer trails */
  trailOpacity: number;

  /** Particle attraction strength toward hand positions */
  attractionStrength: number;

  /** Damping factor applied to particle velocity each frame [0, 1] */
  damping: number;

  /** Base particle size in pixels */
  particleSize: number;

  /** Particle hue interpolation speed toward attractor hue [0, 1] */
  hueSpeed: number;
}

/**
 * Configuration for the TrailGenerator.
 */
export interface TrailGeneratorConfig {
  /** Maximum number of trail points before oldest are removed */
  maxTrailLength: number;

  /** Maximum line width for the newest trail points (px) */
  maxLineWidth: number;

  /** Hue rotation speed (degrees per age unit) */
  hueRotationSpeed: number;

  /** Saturation percentage for trail color */
  saturation: number;

  /** Lightness percentage for trail color */
  lightness: number;
}

/**
 * Configuration for the WaveformVisualizer.
 */
export interface WaveformVisualizerConfig {
  /** FFT / waveform sample size (power of 2) */
  fftSize: number;

  /** Waveform line color (CSS color string) */
  lineColor: string;

  /** Waveform line width (px) */
  lineWidth: number;

  /** Background color (CSS color string, or 'transparent') */
  backgroundColor: string;
}

/**
 * Default ParticleGenerator configuration.
 */
export const DEFAULT_PARTICLE_CONFIG: ParticleGeneratorConfig = {
  particleCount: 200,
  trailOpacity: 0.08,
  attractionStrength: 0.3,
  damping: 0.98,
  particleSize: 3,
  hueSpeed: 0.05,
};

/**
 * Default TrailGenerator configuration.
 */
export const DEFAULT_TRAIL_CONFIG: TrailGeneratorConfig = {
  maxTrailLength: 50,
  maxLineWidth: 5,
  hueRotationSpeed: 3,
  saturation: 80,
  lightness: 60,
};

/**
 * Default WaveformVisualizer configuration.
 */
export const DEFAULT_WAVEFORM_CONFIG: WaveformVisualizerConfig = {
  fftSize: 2048,
  lineColor: '#4ade80',
  lineWidth: 2,
  backgroundColor: 'transparent',
};
