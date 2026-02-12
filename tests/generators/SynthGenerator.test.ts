/**
 * SynthGenerator Tests
 *
 * Tests for the SynthGenerator using mocked Tone.js.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import type { ControlState } from '../../src/types/control.types';
import { createNoHandControlState, createHandAtPosition } from '../mocks/controlStates.mock';

// Mock Tone.js before importing SynthGenerator
vi.mock('tone', () => {
  const mockTriggerAttack = vi.fn();
  const mockTriggerRelease = vi.fn();
  const mockReleaseAll = vi.fn();
  const mockDispose = vi.fn();
  const mockToDestination = vi.fn().mockReturnThis();
  const mockSet = vi.fn();

  const MockPolySynth = vi.fn().mockImplementation(() => ({
    triggerAttack: mockTriggerAttack,
    triggerRelease: mockTriggerRelease,
    releaseAll: mockReleaseAll,
    toDestination: mockToDestination,
    dispose: mockDispose,
    set: mockSet,
    volume: { value: 0 },
    maxPolyphony: 4,
  }));

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue(0),
    Frequency: vi.fn().mockImplementation((freq: number) => ({
      toNote: () => {
        // Simple frequency to note conversion for testing
        const midi = Math.round(12 * Math.log2(freq / 440) + 69);
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const name = noteNames[((midi % 12) + 12) % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${name}${octave}`;
      },
    })),
    PolySynth: MockPolySynth,
    Synth: vi.fn(),
    // Expose mocks for assertions
    __mocks: {
      triggerAttack: mockTriggerAttack,
      triggerRelease: mockTriggerRelease,
      releaseAll: mockReleaseAll,
      dispose: mockDispose,
    },
  };
});

import { SynthGenerator } from '../../src/generators/audio/SynthGenerator';
import * as Tone from 'tone';

// Get the mock functions
const mocks = (Tone as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }).__mocks;

describe('SynthGenerator', () => {
  let generator: SynthGenerator;
  let state$: Subject<ControlState>;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new SynthGenerator();
    state$ = new Subject<ControlState>();
  });

  afterEach(() => {
    generator.dispose();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(generator.name).toBe('SynthGenerator');
    });

    it('should not be running initially', () => {
      expect(generator.isRunning).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start and set isRunning to true', async () => {
      await generator.start();
      expect(generator.isRunning).toBe(true);
      expect(Tone.start).toHaveBeenCalled();
    });

    it('should create PolySynth on start', async () => {
      await generator.start();
      expect(Tone.PolySynth).toHaveBeenCalled();
    });

    it('should stop and set isRunning to false', async () => {
      await generator.start();
      generator.stop();
      expect(generator.isRunning).toBe(false);
    });

    it('should not start twice', async () => {
      await generator.start();
      await generator.start();
      // PolySynth should only be constructed once
      expect(Tone.PolySynth).toHaveBeenCalledTimes(1);
    });

    it('should release all notes on stop', async () => {
      await generator.start();
      generator.connect(state$);

      // Emit a hand to trigger a note
      state$.next(createHandAtPosition(0.5, 0.5));

      generator.stop();
      expect(mocks.releaseAll).toHaveBeenCalled();
    });
  });

  describe('connect/disconnect', () => {
    it('should subscribe to state stream on connect', async () => {
      await generator.start();
      generator.connect(state$);

      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).toHaveBeenCalled();
    });

    it('should not process states after disconnect', async () => {
      await generator.start();
      generator.connect(state$);
      generator.disconnect();

      vi.clearAllMocks();
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).not.toHaveBeenCalled();
    });
  });

  describe('processState', () => {
    beforeEach(async () => {
      await generator.start();
      generator.connect(state$);
    });

    it('should trigger a note when hand is detected', () => {
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);
    });

    it('should release all notes when no hand is detected', () => {
      // First detect a hand
      state$.next(createHandAtPosition(0.5, 0.5));
      vi.clearAllMocks();

      // Then lose it
      state$.next(createNoHandControlState());
      expect(mocks.releaseAll).toHaveBeenCalled();
    });

    it('should trigger new note when hand moves to different pitch', () => {
      // Hand at x=0.2
      state$.next(createHandAtPosition(0.2, 0.5));
      expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Hand moves to x=0.8 (different frequency = different note)
      state$.next(createHandAtPosition(0.8, 0.5));
      // Should release old and trigger new
      expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
      expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);
    });

    it('should not retrigger when hand stays at same position', () => {
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Same position
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).not.toHaveBeenCalled();
    });

    it('should handle hand disappearing and reappearing', () => {
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Hand disappears
      state$.next(createNoHandControlState());
      expect(mocks.releaseAll).toHaveBeenCalled();

      vi.clearAllMocks();

      // Hand reappears
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('should dispose the synth', async () => {
      await generator.start();
      generator.dispose();
      expect(mocks.dispose).toHaveBeenCalled();
      expect(generator.isRunning).toBe(false);
    });

    it('should disconnect from stream on dispose', async () => {
      await generator.start();
      generator.connect(state$);
      generator.dispose();

      vi.clearAllMocks();
      state$.next(createHandAtPosition(0.5, 0.5));
      expect(mocks.triggerAttack).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should accept custom waveform', () => {
      const gen = new SynthGenerator({ waveform: 'sawtooth' });
      expect(gen.name).toBe('SynthGenerator');
      gen.dispose();
    });

    it('should accept custom frequency range', () => {
      const gen = new SynthGenerator({
        frequencyRange: { min: 200, max: 800 },
      });
      expect(gen.name).toBe('SynthGenerator');
      gen.dispose();
    });
  });
});
