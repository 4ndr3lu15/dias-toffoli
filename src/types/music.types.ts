/**
 * Musical Scale Type Definitions
 *
 * Types for musical scales, notes, and configuration
 * used by audio generators.
 */

/**
 * Available musical scales.
 */
export enum ScaleType {
  CHROMATIC = 'chromatic',
  MAJOR = 'major',
  MINOR = 'minor',
  PENTATONIC_MAJOR = 'pentatonic_major',
  PENTATONIC_MINOR = 'pentatonic_minor',
  BLUES = 'blues',
  HARMONIC_MINOR = 'harmonic_minor',
  DORIAN = 'dorian',
  MIXOLYDIAN = 'mixolydian',
}

/**
 * Scale definition.
 */
export interface Scale {
  /** Scale type identifier */
  type: ScaleType;

  /** Root note (C, D, E, etc.) */
  root: string;

  /** Octave range */
  octaveRange: { min: number; max: number };

  /** Semitone intervals from root */
  intervals: number[];

  /** Available MIDI notes in this scale */
  notes: number[];
}

/**
 * Musical note representation.
 */
export interface MusicalNote {
  /** Note name (C, D, E, etc.) */
  name: string;

  /** Octave number (0-8) */
  octave: number;

  /** Frequency in Hz */
  frequency: number;

  /** MIDI note number (0-127) */
  midi: number;
}

/**
 * Musical configuration.
 */
export interface MusicConfig {
  /** Current scale */
  scale: Scale;

  /** Tempo in BPM */
  bpm: number;

  /** Master volume [0, 1] */
  masterVolume: number;

  /** Quantize to beat */
  quantize: boolean;
}
