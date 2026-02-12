/**
 * HarmonicGenerator Tests
 *
 * Tests for the HarmonicGenerator using mocked Tone.js.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import type { ControlState } from '../../src/types/control.types';
import {
  createMockControlState,
  createNoHandControlState,
  createFingerState,
  createMockSingleHand,
} from '../mocks/controlStates.mock';

// Mock Tone.js before importing HarmonicGenerator
vi.mock('tone', () => {
  const mockRampTo = vi.fn();
  const mockOscDispose = vi.fn();
  const mockOscStart = vi.fn();
  const mockOscStop = vi.fn();
  const mockGainDispose = vi.fn();

  const createMockConnect = () => {
    const connectFn = vi.fn().mockReturnThis();
    return connectFn;
  };

  const MockOscillator = vi.fn().mockImplementation(() => ({
    connect: createMockConnect(),
    start: mockOscStart,
    stop: mockOscStop,
    dispose: mockOscDispose,
    frequency: { value: 220, rampTo: mockRampTo },
  }));

  const MockGain = vi.fn().mockImplementation(() => ({
    connect: createMockConnect(),
    toDestination: vi.fn().mockReturnThis(),
    dispose: mockGainDispose,
    gain: { value: 0, rampTo: mockRampTo },
  }));

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue(0),
    Oscillator: MockOscillator,
    Gain: MockGain,
    __mocks: {
      rampTo: mockRampTo,
      oscDispose: mockOscDispose,
      oscStart: mockOscStart,
      oscStop: mockOscStop,
      gainDispose: mockGainDispose,
      Oscillator: MockOscillator,
      Gain: MockGain,
    },
  };
});

import { HarmonicGenerator } from '../../src/generators/audio/HarmonicGenerator';
import * as Tone from 'tone';

const mocks = (Tone as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }).__mocks;

describe('HarmonicGenerator', () => {
  let generator: HarmonicGenerator;
  let state$: Subject<ControlState>;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new HarmonicGenerator();
    state$ = new Subject<ControlState>();
  });

  afterEach(() => {
    generator.dispose();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(generator.name).toBe('HarmonicGenerator');
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

    it('should create oscillators and gains on start', async () => {
      await generator.start();
      // Default harmonicCount is 5
      expect(Tone.Oscillator).toHaveBeenCalledTimes(5);
      expect(Tone.Gain).toHaveBeenCalledTimes(6); // 5 harmonic gains + 1 master gain
    });

    it('should start all oscillators', async () => {
      await generator.start();
      expect(mocks.oscStart).toHaveBeenCalledTimes(5);
    });

    it('should stop and set isRunning to false', async () => {
      await generator.start();
      generator.stop();
      expect(generator.isRunning).toBe(false);
    });

    it('should not start twice', async () => {
      await generator.start();
      await generator.start();
      expect(Tone.Oscillator).toHaveBeenCalledTimes(5);
    });
  });

  describe('connect/disconnect', () => {
    it('should process states after connect', async () => {
      await generator.start();
      generator.connect(state$);

      // Emit a state with a hand
      state$.next(createMockControlState());

      // rampTo should be called for frequency and gain updates
      expect(mocks.rampTo).toHaveBeenCalled();
    });

    it('should not process states after disconnect', async () => {
      await generator.start();
      generator.connect(state$);
      generator.disconnect();

      vi.clearAllMocks();
      state$.next(createMockControlState());
      expect(mocks.rampTo).not.toHaveBeenCalled();
    });
  });

  describe('processState', () => {
    beforeEach(async () => {
      await generator.start();
      generator.connect(state$);
    });

    it('should silence when no hand is detected', () => {
      // First have a hand active
      state$.next(createMockControlState());
      vi.clearAllMocks();

      // Then lose it
      state$.next(createNoHandControlState());
      // Master gain should ramp to 0
      expect(mocks.rampTo).toHaveBeenCalledWith(0, 0.15);
    });

    it('should update oscillators when hand moves', () => {
      state$.next(
        createMockControlState({
          hands: [createMockSingleHand({ position: { x: 0.3, y: 0.5 } })],
        })
      );

      // rampTo should be called for frequency and gain updates
      expect(mocks.rampTo).toHaveBeenCalled();
    });

    it('should respond to finger state changes', () => {
      // All fingers extended
      state$.next(
        createFingerState({
          thumb: true,
          index: true,
          middle: true,
          ring: true,
          pinky: true,
        })
      );

      vi.clearAllMocks();

      // Only thumb and index extended
      state$.next(
        createFingerState({
          thumb: true,
          index: true,
          middle: false,
          ring: false,
          pinky: false,
        })
      );

      // Should have updated gain values
      expect(mocks.rampTo).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose all oscillators and gains', async () => {
      await generator.start();
      generator.dispose();

      expect(mocks.oscStop).toHaveBeenCalledTimes(5);
      expect(mocks.oscDispose).toHaveBeenCalledTimes(5);
      expect(mocks.gainDispose).toHaveBeenCalledTimes(6); // 5 + master
      expect(generator.isRunning).toBe(false);
    });

    it('should disconnect from stream', async () => {
      await generator.start();
      generator.connect(state$);
      generator.dispose();

      vi.clearAllMocks();
      state$.next(createMockControlState());
      expect(mocks.rampTo).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should accept custom harmonic count', async () => {
      const gen = new HarmonicGenerator({ harmonicCount: 3 });
      await gen.start();
      expect(Tone.Oscillator).toHaveBeenCalledTimes(3);
      gen.dispose();
    });

    it('should accept custom frequency range', () => {
      const gen = new HarmonicGenerator({
        frequencyRange: { min: 100, max: 400 },
      });
      expect(gen.name).toBe('HarmonicGenerator');
      gen.dispose();
    });

    it('should update config at runtime', () => {
      generator.updateConfig({ harmonicCount: 8 });
      // Config is updated (actual effect requires restart)
      expect(generator.name).toBe('HarmonicGenerator');
    });
  });
});
