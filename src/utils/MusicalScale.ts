/**
 * Musical Scale Utility
 *
 * Provides musical scale definitions, frequency quantization,
 * and MIDI/frequency conversion utilities.
 */

import { ScaleType } from '../types/music.types';
import type { Scale, MusicalNote } from '../types/music.types';

/**
 * Semitone intervals for each scale type (relative to root).
 */
const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  [ScaleType.CHROMATIC]: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [ScaleType.MAJOR]: [0, 2, 4, 5, 7, 9, 11],
  [ScaleType.MINOR]: [0, 2, 3, 5, 7, 8, 10],
  [ScaleType.PENTATONIC_MAJOR]: [0, 2, 4, 7, 9],
  [ScaleType.PENTATONIC_MINOR]: [0, 3, 5, 7, 10],
  [ScaleType.BLUES]: [0, 3, 5, 6, 7, 10],
  [ScaleType.HARMONIC_MINOR]: [0, 2, 3, 5, 7, 8, 11],
  [ScaleType.DORIAN]: [0, 2, 3, 5, 7, 9, 10],
  [ScaleType.MIXOLYDIAN]: [0, 2, 4, 5, 7, 9, 10],
};

/**
 * Note names in chromatic order.
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Map root note name to semitone offset from C.
 */
const ROOT_OFFSETS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/**
 * Convert a MIDI note number to frequency in Hz.
 * Uses standard tuning: A4 = 440 Hz (MIDI 69).
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert a frequency in Hz to the nearest MIDI note number.
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

/**
 * Get the note name and octave for a MIDI note number.
 */
export function noteNameFromMidi(midi: number): MusicalNote {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[noteIndex];
  return {
    name,
    octave,
    frequency: midiToFrequency(midi),
    midi,
  };
}

/**
 * Get the semitone intervals for a given scale type.
 */
export function getScaleIntervals(scaleType: ScaleType): number[] {
  return [...SCALE_INTERVALS[scaleType]];
}

/**
 * Generate all MIDI note numbers within a scale and octave range.
 *
 * @param root - Root note name (e.g., 'C', 'F#', 'Bb')
 * @param scaleType - Type of scale
 * @param octaveRange - Min and max octaves (inclusive)
 * @returns Array of MIDI note numbers in the scale
 */
export function getNotesInScale(
  root: string,
  scaleType: ScaleType,
  octaveRange: { min: number; max: number } = { min: 2, max: 6 }
): number[] {
  const rootOffset = ROOT_OFFSETS[root];
  if (rootOffset === undefined) {
    throw new Error(`Unknown root note: ${root}`);
  }

  const intervals = SCALE_INTERVALS[scaleType];
  const notes: number[] = [];

  for (let octave = octaveRange.min; octave <= octaveRange.max; octave++) {
    for (const interval of intervals) {
      const midi = (octave + 1) * 12 + rootOffset + interval;
      if (midi >= 0 && midi <= 127) {
        notes.push(midi);
      }
    }
  }

  return notes;
}

/**
 * Create a Scale object from parameters.
 */
export function createScale(
  root: string,
  scaleType: ScaleType,
  octaveRange: { min: number; max: number } = { min: 2, max: 6 }
): Scale {
  return {
    type: scaleType,
    root,
    octaveRange,
    intervals: getScaleIntervals(scaleType),
    notes: getNotesInScale(root, scaleType, octaveRange),
  };
}

/**
 * Quantize a frequency to the nearest note in the given scale.
 * Returns the nearest frequency that belongs to the scale.
 *
 * @param frequency - Raw frequency in Hz
 * @param scale - Scale to quantize to
 * @returns Quantized frequency in Hz
 */
export function quantizeFrequency(frequency: number, scale: Scale): number {
  if (scale.notes.length === 0) {
    return frequency;
  }

  const midi = 12 * Math.log2(frequency / 440) + 69;

  // Find the closest MIDI note in the scale
  let closestNote = scale.notes[0];
  let closestDistance = Math.abs(midi - closestNote);

  for (let i = 1; i < scale.notes.length; i++) {
    const distance = Math.abs(midi - scale.notes[i]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestNote = scale.notes[i];
    }
  }

  return midiToFrequency(closestNote);
}

/**
 * Map a normalized value [0, 1] to a frequency within a range,
 * using logarithmic scaling for perceptually even distribution.
 *
 * @param value - Normalized value [0, 1]
 * @param minFreq - Minimum frequency in Hz
 * @param maxFreq - Maximum frequency in Hz
 * @returns Frequency in Hz
 */
export function mapToFrequency(value: number, minFreq: number, maxFreq: number): number {
  const clampedValue = Math.max(0, Math.min(1, value));
  return minFreq * Math.pow(maxFreq / minFreq, clampedValue);
}

/**
 * Map a normalized value [0, 1] to a volume in decibels.
 * 0 maps to -Infinity (silence), 1 maps to 0 dB.
 *
 * @param value - Normalized value [0, 1]
 * @param minDb - Minimum dB value (default -60)
 * @returns Volume in decibels
 */
export function mapToVolume(value: number, minDb: number = -60): number {
  const clampedValue = Math.max(0, Math.min(1, value));
  if (clampedValue === 0) {
    return -Infinity;
  }
  return minDb + (0 - minDb) * clampedValue;
}
