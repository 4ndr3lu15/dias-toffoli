/**
 * MusicalScale Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  midiToFrequency,
  frequencyToMidi,
  noteNameFromMidi,
  getScaleIntervals,
  getNotesInScale,
  createScale,
  quantizeFrequency,
  mapToFrequency,
  mapToVolume,
} from '../../src/utils/MusicalScale';
import { ScaleType } from '../../src/types/music.types';

describe('MusicalScale', () => {
  describe('midiToFrequency', () => {
    it('should return 440 Hz for MIDI note 69 (A4)', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440, 2);
    });

    it('should return 261.63 Hz for MIDI note 60 (C4)', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
    });

    it('should double frequency for each octave', () => {
      const f1 = midiToFrequency(60);
      const f2 = midiToFrequency(72); // One octave up
      expect(f2).toBeCloseTo(f1 * 2, 2);
    });

    it('should handle MIDI note 0', () => {
      const freq = midiToFrequency(0);
      expect(freq).toBeGreaterThan(0);
      expect(freq).toBeCloseTo(8.18, 1); // C-1
    });
  });

  describe('frequencyToMidi', () => {
    it('should return 69 for 440 Hz', () => {
      expect(frequencyToMidi(440)).toBe(69);
    });

    it('should return 60 for ~261.63 Hz', () => {
      expect(frequencyToMidi(261.63)).toBe(60);
    });

    it('should round to nearest MIDI note', () => {
      // 450 Hz is slightly above A4 (440 Hz) but below A#4 (466.16 Hz)
      expect(frequencyToMidi(450)).toBe(69);
    });
  });

  describe('noteNameFromMidi', () => {
    it('should return correct note for A4 (MIDI 69)', () => {
      const note = noteNameFromMidi(69);
      expect(note.name).toBe('A');
      expect(note.octave).toBe(4);
      expect(note.midi).toBe(69);
      expect(note.frequency).toBeCloseTo(440, 2);
    });

    it('should return correct note for C4 (MIDI 60)', () => {
      const note = noteNameFromMidi(60);
      expect(note.name).toBe('C');
      expect(note.octave).toBe(4);
    });

    it('should return correct note for C#3 (MIDI 49)', () => {
      const note = noteNameFromMidi(49);
      expect(note.name).toBe('C#');
      expect(note.octave).toBe(3);
    });
  });

  describe('getScaleIntervals', () => {
    it('should return 12 intervals for chromatic scale', () => {
      const intervals = getScaleIntervals(ScaleType.CHROMATIC);
      expect(intervals).toHaveLength(12);
      expect(intervals).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('should return 7 intervals for major scale', () => {
      const intervals = getScaleIntervals(ScaleType.MAJOR);
      expect(intervals).toHaveLength(7);
      expect(intervals).toEqual([0, 2, 4, 5, 7, 9, 11]);
    });

    it('should return 5 intervals for pentatonic minor', () => {
      const intervals = getScaleIntervals(ScaleType.PENTATONIC_MINOR);
      expect(intervals).toHaveLength(5);
      expect(intervals).toEqual([0, 3, 5, 7, 10]);
    });

    it('should return 6 intervals for blues scale', () => {
      const intervals = getScaleIntervals(ScaleType.BLUES);
      expect(intervals).toHaveLength(6);
      expect(intervals).toEqual([0, 3, 5, 6, 7, 10]);
    });

    it('should return a new array (not a reference)', () => {
      const a = getScaleIntervals(ScaleType.MAJOR);
      const b = getScaleIntervals(ScaleType.MAJOR);
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('getNotesInScale', () => {
    it('should generate C major notes in octave range 4-4', () => {
      const notes = getNotesInScale('C', ScaleType.MAJOR, { min: 4, max: 4 });
      // C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71
      expect(notes).toEqual([60, 62, 64, 65, 67, 69, 71]);
    });

    it('should generate A minor pentatonic notes', () => {
      const notes = getNotesInScale('A', ScaleType.PENTATONIC_MINOR, { min: 4, max: 4 });
      // A4=69, C5=72, D5=74, E5=76, G5=79
      expect(notes).toEqual([69, 72, 74, 76, 79]);
    });

    it('should span multiple octaves', () => {
      const notes = getNotesInScale('C', ScaleType.MAJOR, { min: 3, max: 5 });
      expect(notes.length).toBeGreaterThan(7); // More than one octave
      // First note should be C3 (48)
      expect(notes[0]).toBe(48);
    });

    it('should clamp to valid MIDI range (0-127)', () => {
      const notes = getNotesInScale('C', ScaleType.CHROMATIC, { min: 0, max: 9 });
      for (const note of notes) {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(127);
      }
    });

    it('should throw for unknown root note', () => {
      expect(() => getNotesInScale('X', ScaleType.MAJOR)).toThrow('Unknown root note: X');
    });
  });

  describe('createScale', () => {
    it('should create a scale with all properties', () => {
      const scale = createScale('C', ScaleType.MAJOR, { min: 4, max: 4 });
      expect(scale.type).toBe(ScaleType.MAJOR);
      expect(scale.root).toBe('C');
      expect(scale.octaveRange).toEqual({ min: 4, max: 4 });
      expect(scale.intervals).toEqual([0, 2, 4, 5, 7, 9, 11]);
      expect(scale.notes).toEqual([60, 62, 64, 65, 67, 69, 71]);
    });

    it('should use default octave range if not specified', () => {
      const scale = createScale('C', ScaleType.MAJOR);
      expect(scale.octaveRange).toEqual({ min: 2, max: 6 });
      expect(scale.notes.length).toBeGreaterThan(0);
    });
  });

  describe('quantizeFrequency', () => {
    it('should snap to nearest note in scale', () => {
      const scale = createScale('C', ScaleType.MAJOR, { min: 4, max: 4 });

      // 270 Hz is between C4 (261.63) and D4 (293.66), closer to C4
      const quantized = quantizeFrequency(270, scale);
      expect(quantized).toBeCloseTo(midiToFrequency(60), 1); // C4
    });

    it('should return exact frequency when it matches a scale note', () => {
      const scale = createScale('C', ScaleType.MAJOR, { min: 4, max: 4 });
      const cFreq = midiToFrequency(60); // C4

      const quantized = quantizeFrequency(cFreq, scale);
      expect(quantized).toBeCloseTo(cFreq, 5);
    });

    it('should return original frequency for empty scale', () => {
      const emptyScale: import('../../src/types/music.types').Scale = {
        type: ScaleType.MAJOR,
        root: 'C',
        octaveRange: { min: 4, max: 4 },
        intervals: [],
        notes: [],
      };
      expect(quantizeFrequency(300, emptyScale)).toBe(300);
    });

    it('should snap D# frequency to D in C major (no D# in C major)', () => {
      const scale = createScale('C', ScaleType.MAJOR, { min: 4, max: 4 });
      const dSharpFreq = midiToFrequency(63); // D#4

      const quantized = quantizeFrequency(dSharpFreq, scale);
      // Should snap to either D4 (62) or E4 (64), both are 1 semitone away
      const quantizedMidi = frequencyToMidi(quantized);
      expect([62, 64]).toContain(quantizedMidi);
    });
  });

  describe('mapToFrequency', () => {
    it('should return min frequency at 0', () => {
      expect(mapToFrequency(0, 200, 2000)).toBeCloseTo(200, 2);
    });

    it('should return max frequency at 1', () => {
      expect(mapToFrequency(1, 200, 2000)).toBeCloseTo(2000, 2);
    });

    it('should use logarithmic scaling (0.5 should be geometric mean)', () => {
      const result = mapToFrequency(0.5, 200, 2000);
      const geometricMean = Math.sqrt(200 * 2000);
      expect(result).toBeCloseTo(geometricMean, 1);
    });

    it('should clamp values below 0', () => {
      expect(mapToFrequency(-0.5, 200, 2000)).toBeCloseTo(200, 2);
    });

    it('should clamp values above 1', () => {
      expect(mapToFrequency(1.5, 200, 2000)).toBeCloseTo(2000, 2);
    });
  });

  describe('mapToVolume', () => {
    it('should return -Infinity at 0', () => {
      expect(mapToVolume(0)).toBe(-Infinity);
    });

    it('should return 0 dB at 1', () => {
      expect(mapToVolume(1)).toBe(0);
    });

    it('should return value between min and 0 dB for middle values', () => {
      const vol = mapToVolume(0.5);
      expect(vol).toBeGreaterThan(-60);
      expect(vol).toBeLessThan(0);
    });

    it('should use custom minDb', () => {
      const vol = mapToVolume(0.5, -40);
      expect(vol).toBe(-20);
    });

    it('should clamp values above 1', () => {
      expect(mapToVolume(1.5)).toBe(0);
    });
  });
});
