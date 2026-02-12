/**
 * DrumGenerator Tests
 *
 * Tests for the DrumGenerator using mocked Tone.js.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import type { ControlState } from '../../src/types/control.types';
import { GestureType } from '../../src/types/control.types';
import { createGestureState, createNoHandControlState } from '../mocks/controlStates.mock';

// Mock Tone.js before importing DrumGenerator
vi.mock('tone', () => {
  const mockKickTrigger = vi.fn();
  const mockSnareTrigger = vi.fn();
  const mockHihatTrigger = vi.fn();
  const mockKickDispose = vi.fn();
  const mockSnareDispose = vi.fn();
  const mockHihatDispose = vi.fn();
  const mockGainDispose = vi.fn();

  const createMockConnect = () => vi.fn().mockReturnThis();

  const MockMembraneSynth = vi.fn().mockImplementation(() => ({
    connect: createMockConnect(),
    triggerAttackRelease: mockKickTrigger,
    dispose: mockKickDispose,
  }));

  const MockNoiseSynth = vi.fn().mockImplementation(() => ({
    connect: createMockConnect(),
    triggerAttackRelease: mockSnareTrigger,
    dispose: mockSnareDispose,
  }));

  const MockMetalSynth = vi.fn().mockImplementation(() => ({
    connect: createMockConnect(),
    triggerAttackRelease: mockHihatTrigger,
    dispose: mockHihatDispose,
    frequency: { value: 0 },
  }));

  const MockGain = vi.fn().mockImplementation(() => ({
    connect: createMockConnect(),
    toDestination: vi.fn().mockReturnThis(),
    dispose: mockGainDispose,
    gain: { value: 0.8, rampTo: vi.fn() },
  }));

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue(0),
    MembraneSynth: MockMembraneSynth,
    NoiseSynth: MockNoiseSynth,
    MetalSynth: MockMetalSynth,
    Gain: MockGain,
    __mocks: {
      kickTrigger: mockKickTrigger,
      snareTrigger: mockSnareTrigger,
      hihatTrigger: mockHihatTrigger,
      kickDispose: mockKickDispose,
      snareDispose: mockSnareDispose,
      hihatDispose: mockHihatDispose,
      gainDispose: mockGainDispose,
    },
  };
});

import { DrumGenerator } from '../../src/generators/audio/DrumGenerator';
import * as Tone from 'tone';

const mocks = (Tone as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }).__mocks;

describe('DrumGenerator', () => {
  let generator: DrumGenerator;
  let state$: Subject<ControlState>;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new DrumGenerator();
    state$ = new Subject<ControlState>();
  });

  afterEach(() => {
    generator.dispose();
  });

  describe('initialization', () => {
    it('should have correct name', () => {
      expect(generator.name).toBe('DrumGenerator');
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

    it('should create drum synths on start', async () => {
      await generator.start();
      expect(Tone.MembraneSynth).toHaveBeenCalledTimes(1);
      expect(Tone.NoiseSynth).toHaveBeenCalledTimes(1);
      expect(Tone.MetalSynth).toHaveBeenCalledTimes(1);
    });

    it('should stop and set isRunning to false', async () => {
      await generator.start();
      generator.stop();
      expect(generator.isRunning).toBe(false);
    });

    it('should not start twice', async () => {
      await generator.start();
      await generator.start();
      expect(Tone.MembraneSynth).toHaveBeenCalledTimes(1);
    });
  });

  describe('gesture-to-drum mapping', () => {
    beforeEach(async () => {
      await generator.start();
      generator.connect(state$);
    });

    it('should trigger kick on closed fist', () => {
      state$.next(createGestureState(GestureType.CLOSED_FIST));
      expect(mocks.kickTrigger).toHaveBeenCalledWith('C1', '8n', 0);
    });

    it('should trigger snare on open hand', () => {
      state$.next(createGestureState(GestureType.OPEN_HAND));
      expect(mocks.snareTrigger).toHaveBeenCalledWith('8n', 0);
    });

    it('should trigger hihat on pointing', () => {
      state$.next(createGestureState(GestureType.POINTING));
      expect(mocks.hihatTrigger).toHaveBeenCalledWith('C6', '16n', 0);
    });

    it('should not trigger on NONE gesture', () => {
      state$.next(createGestureState(GestureType.NONE));
      expect(mocks.kickTrigger).not.toHaveBeenCalled();
      expect(mocks.snareTrigger).not.toHaveBeenCalled();
      expect(mocks.hihatTrigger).not.toHaveBeenCalled();
    });

    it('should not trigger on other gestures', () => {
      state$.next(createGestureState(GestureType.PEACE));
      expect(mocks.kickTrigger).not.toHaveBeenCalled();
      expect(mocks.snareTrigger).not.toHaveBeenCalled();
      expect(mocks.hihatTrigger).not.toHaveBeenCalled();
    });
  });

  describe('distinctUntilChanged behavior', () => {
    beforeEach(async () => {
      await generator.start();
      generator.connect(state$);
    });

    it('should only trigger once for repeated same gesture', () => {
      state$.next(createGestureState(GestureType.CLOSED_FIST));
      state$.next(createGestureState(GestureType.CLOSED_FIST));
      state$.next(createGestureState(GestureType.CLOSED_FIST));

      expect(mocks.kickTrigger).toHaveBeenCalledTimes(1);
    });

    it('should trigger on gesture change', () => {
      state$.next(createGestureState(GestureType.CLOSED_FIST));
      expect(mocks.kickTrigger).toHaveBeenCalledTimes(1);

      state$.next(createGestureState(GestureType.OPEN_HAND));
      expect(mocks.snareTrigger).toHaveBeenCalledTimes(1);

      state$.next(createGestureState(GestureType.POINTING));
      expect(mocks.hihatTrigger).toHaveBeenCalledTimes(1);
    });

    it('should trigger again after gesture cycle', () => {
      state$.next(createGestureState(GestureType.CLOSED_FIST));
      state$.next(createGestureState(GestureType.OPEN_HAND));
      state$.next(createGestureState(GestureType.CLOSED_FIST));

      expect(mocks.kickTrigger).toHaveBeenCalledTimes(2);
    });
  });

  describe('enable/disable individual drums', () => {
    it('should not trigger kick when disabled', async () => {
      const gen = new DrumGenerator({ enableKick: false });
      await gen.start();
      gen.connect(state$);

      state$.next(createGestureState(GestureType.CLOSED_FIST));
      expect(mocks.kickTrigger).not.toHaveBeenCalled();

      gen.dispose();
    });

    it('should not trigger snare when disabled', async () => {
      const gen = new DrumGenerator({ enableSnare: false });
      await gen.start();
      gen.connect(state$);

      state$.next(createGestureState(GestureType.OPEN_HAND));
      expect(mocks.snareTrigger).not.toHaveBeenCalled();

      gen.dispose();
    });

    it('should not trigger hihat when disabled', async () => {
      const gen = new DrumGenerator({ enableHihat: false });
      await gen.start();
      gen.connect(state$);

      state$.next(createGestureState(GestureType.POINTING));
      expect(mocks.hihatTrigger).not.toHaveBeenCalled();

      gen.dispose();
    });
  });

  describe('dispose', () => {
    it('should dispose all drum synths', async () => {
      await generator.start();
      generator.dispose();

      expect(mocks.kickDispose).toHaveBeenCalledTimes(1);
      expect(mocks.snareDispose).toHaveBeenCalledTimes(1);
      expect(mocks.hihatDispose).toHaveBeenCalledTimes(1);
      expect(mocks.gainDispose).toHaveBeenCalledTimes(1);
      expect(generator.isRunning).toBe(false);
    });

    it('should disconnect from stream', async () => {
      await generator.start();
      generator.connect(state$);
      generator.dispose();

      vi.clearAllMocks();
      state$.next(createGestureState(GestureType.CLOSED_FIST));
      expect(mocks.kickTrigger).not.toHaveBeenCalled();
    });
  });

  describe('no hand detected', () => {
    beforeEach(async () => {
      await generator.start();
      generator.connect(state$);
    });

    it('should emit NONE gesture when no hand is detected', () => {
      // The distinctUntilChanged starts with no previous value,
      // so the first NONE shouldn't trigger any drums
      state$.next(createNoHandControlState());
      expect(mocks.kickTrigger).not.toHaveBeenCalled();
      expect(mocks.snareTrigger).not.toHaveBeenCalled();
      expect(mocks.hihatTrigger).not.toHaveBeenCalled();
    });
  });
});
