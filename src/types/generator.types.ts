/**
 * Generator Output Type Definitions
 *
 * Types for audio and visual generation parameters.
 */

import type { Position2D } from './control.types';

/**
 * Audio generation parameters.
 */
export interface AudioParams {
  /** Base frequency in Hz */
  frequency: number;

  /** Amplitude [0, 1] */
  amplitude: number;

  /** Attack time (seconds) */
  attack: number;

  /** Release time (seconds) */
  release: number;

  /** Waveform type */
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';

  /** Harmonics amplitudes (for additive synthesis) */
  harmonics: number[];

  /** Filter cutoff frequency (Hz) */
  filterCutoff: number;

  /** Reverb wet/dry mix [0, 1] */
  reverb: number;
}

/**
 * Visual particle data.
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Life remaining [0, 1] where 1 = just born */
  life: number;
  /** HSL hue [0, 360] */
  hue: number;
  size: number;
}

/**
 * Visual generation parameters.
 */
export interface VisualParams {
  /** Particle attractor position */
  attractorPosition: Position2D;

  /** Base color hue [0, 360] */
  hue: number;

  /** Color saturation [0, 1] */
  saturation: number;

  /** Brightness [0, 1] */
  brightness: number;

  /** Particle emission rate */
  emissionRate: number;

  /** Trail opacity [0, 1] */
  trailOpacity: number;

  /** Effect intensity [0, 1] */
  intensity: number;
}
