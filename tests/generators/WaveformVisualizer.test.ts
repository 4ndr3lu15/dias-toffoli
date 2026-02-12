/**
 * WaveformVisualizer Tests
 *
 * Tests for the WaveformVisualizer using mocked Tone.js and Canvas 2D context.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import type { ControlState } from '../../src/types/control.types';
import { createNoHandControlState } from '../mocks/controlStates.mock';

// Mock Tone.js before importing WaveformVisualizer
vi.mock('tone', () => {
  const mockGetValue = vi.fn().mockReturnValue(new Float32Array(2048).fill(0));
  const mockAnalyserDispose = vi.fn();

  const MockAnalyser = vi.fn().mockImplementation(() => ({
    getValue: mockGetValue,
    dispose: mockAnalyserDispose,
  }));

  const mockConnect = vi.fn();

  return {
    Analyser: MockAnalyser,
    __mocks: {
      getValue: mockGetValue,
      analyserDispose: mockAnalyserDispose,
      connect: mockConnect,
    },
  };
});

import { WaveformVisualizer } from '../../src/generators/visual/WaveformVisualizer';
import * as Tone from 'tone';

const mocks = (Tone as unknown as { __mocks: Record<string, ReturnType<typeof vi.fn>> }).__mocks;

/**
 * Create a mock HTMLCanvasElement with a mock 2D context.
 */
function createMockCanvas(
  width = 800,
  height = 200
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
    parentElement: null,
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

/**
 * Create a mock ToneAudioNode for connectAudio().
 */
function createMockAudioSource(): Tone.ToneAudioNode {
  return {
    connect: vi.fn(),
  } as unknown as Tone.ToneAudioNode;
}

describe('WaveformVisualizer', () => {
  let generator: WaveformVisualizer;
  let stateSubject: Subject<ControlState>;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  // Mock requestAnimationFrame/cancelAnimationFrame
  let rafCallback: (() => void) | null = null;
  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();

    stateSubject = new Subject<ControlState>();

    const mock = createMockCanvas();
    mockCanvas = mock.canvas;
    mockCtx = mock.ctx;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb as unknown as () => void;
      return 1;
    });
    globalThis.cancelAnimationFrame = vi.fn();

    generator = new WaveformVisualizer();
    generator.setCanvas(mockCanvas);
  });

  afterEach(() => {
    generator.dispose();
    stateSubject.complete();
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    rafCallback = null;
  });

  // ─── Initialization ────────────────────────────────────────

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(generator.name).toBe('WaveformVisualizer');
      expect(generator.isRunning).toBe(false);
    });

    it('should accept custom config', () => {
      const custom = new WaveformVisualizer({ lineColor: '#ff0000', lineWidth: 3 });
      custom.setCanvas(mockCanvas);
      expect(custom.name).toBe('WaveformVisualizer');
      custom.dispose();
    });

    it('should throw if start() called without canvas', async () => {
      const noCanvas = new WaveformVisualizer();
      await expect(noCanvas.start()).rejects.toThrow('Canvas not set');
      noCanvas.dispose();
    });

    it('should report no audio source initially', () => {
      expect(generator.hasAudioSource()).toBe(false);
    });
  });

  // ─── Lifecycle ─────────────────────────────────────────────

  describe('lifecycle', () => {
    it('should start and set isRunning to true', async () => {
      await generator.start();
      expect(generator.isRunning).toBe(true);
    });

    it('should not start twice', async () => {
      await generator.start();
      await generator.start();
      expect(generator.isRunning).toBe(true);
    });

    it('should stop and set isRunning to false', async () => {
      await generator.start();
      generator.stop();
      expect(generator.isRunning).toBe(false);
    });

    it('should cancel animation frame on stop', async () => {
      await generator.start();
      generator.stop();
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should not throw when stopping without starting', () => {
      expect(() => generator.stop()).not.toThrow();
    });

    it('should dispose cleanly', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();
      generator.dispose();
      expect(generator.isRunning).toBe(false);
      expect(generator.hasAudioSource()).toBe(false);
    });
  });

  // ─── Audio Connection ─────────────────────────────────────

  describe('audio connection', () => {
    it('should connect to audio source via connectAudio', () => {
      const source = createMockAudioSource();
      generator.connectAudio(source);

      expect(generator.hasAudioSource()).toBe(true);
      expect(Tone.Analyser).toHaveBeenCalledWith('waveform', 2048);
      expect(source.connect).toHaveBeenCalled();
    });

    it('should dispose previous analyser when reconnecting audio', () => {
      const source1 = createMockAudioSource();
      const source2 = createMockAudioSource();

      generator.connectAudio(source1);
      generator.connectAudio(source2);

      // First analyser should be disposed
      expect(mocks.analyserDispose).toHaveBeenCalledTimes(1);
      expect(generator.hasAudioSource()).toBe(true);
    });

    it('should dispose analyser on generator dispose', () => {
      const source = createMockAudioSource();
      generator.connectAudio(source);
      generator.dispose();

      expect(mocks.analyserDispose).toHaveBeenCalled();
      expect(generator.hasAudioSource()).toBe(false);
    });
  });

  // ─── Rendering ─────────────────────────────────────────────

  describe('rendering', () => {
    it('should request animation frame on start', async () => {
      await generator.start();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should clear canvas with transparent background by default', async () => {
      await generator.start();
      if (rafCallback) rafCallback();

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
    });

    it('should fill background when backgroundColor is not transparent', async () => {
      const gen = new WaveformVisualizer({ backgroundColor: '#000000' });
      gen.setCanvas(mockCanvas);
      await gen.start();

      if (rafCallback) rafCallback();

      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);

      gen.dispose();
    });

    it('should draw flat center line when no audio source connected', async () => {
      await generator.start();
      if (rafCallback) rafCallback();

      // Should draw a horizontal line at center
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, mockCanvas.height / 2);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(mockCanvas.width, mockCanvas.height / 2);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should render waveform data when audio source is connected', async () => {
      const source = createMockAudioSource();
      generator.connectAudio(source);

      // Set up waveform data with a simple sine-like pattern
      const waveformData = new Float32Array(2048);
      for (let i = 0; i < 2048; i++) {
        waveformData[i] = Math.sin((i / 2048) * Math.PI * 2);
      }
      mocks.getValue.mockReturnValue(waveformData);

      await generator.start();
      if (rafCallback) rafCallback();

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  // ─── ControlState Connection ───────────────────────────────

  describe('control state connection', () => {
    it('should connect without error (no-op for data)', () => {
      generator.connect(stateSubject.asObservable());
      stateSubject.next(createNoHandControlState());
      // Should not throw
    });

    it('should disconnect cleanly', () => {
      generator.connect(stateSubject.asObservable());
      generator.disconnect();
      // Should not throw
    });

    it('should replace previous subscription on reconnect', () => {
      generator.connect(stateSubject.asObservable());
      const second = new Subject<ControlState>();
      generator.connect(second.asObservable());
      // Should not throw
      second.complete();
    });
  });

  // ─── Config Updates ────────────────────────────────────────

  describe('config updates', () => {
    it('should update config at runtime', () => {
      generator.updateConfig({ lineColor: '#ff0000', lineWidth: 4 });
      expect(generator.name).toBe('WaveformVisualizer');
    });
  });
});
