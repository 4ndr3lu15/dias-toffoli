/**
 * TrailGenerator Tests
 *
 * Tests for the TrailGenerator using mocked Canvas 2D context.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import type { ControlState } from '../../src/types/control.types';
import {
  createNoHandControlState,
  createHandAtPosition,
  createMockControlState,
  createMockSingleHand,
} from '../mocks/controlStates.mock';
import { TrailGenerator } from '../../src/generators/visual/TrailGenerator';

/**
 * Create a mock HTMLCanvasElement with a mock 2D context.
 */
function createMockCanvas(
  width = 800,
  height = 450
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

describe('TrailGenerator', () => {
  let generator: TrailGenerator;
  let stateSubject: Subject<ControlState>;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  // Mock requestAnimationFrame/cancelAnimationFrame
  let rafCallback: (() => void) | null = null;
  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    stateSubject = new Subject<ControlState>();

    const mock = createMockCanvas();
    mockCanvas = mock.canvas;
    mockCtx = mock.ctx;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb as unknown as () => void;
      return 1;
    });
    globalThis.cancelAnimationFrame = vi.fn();

    generator = new TrailGenerator();
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
      expect(generator.name).toBe('TrailGenerator');
      expect(generator.isRunning).toBe(false);
    });

    it('should accept custom config', () => {
      const custom = new TrailGenerator({ maxTrailLength: 100, maxLineWidth: 8 });
      custom.setCanvas(mockCanvas);
      expect(custom.name).toBe('TrailGenerator');
      custom.dispose();
    });

    it('should throw if start() called without canvas', async () => {
      const noCanvas = new TrailGenerator();
      await expect(noCanvas.start()).rejects.toThrow('Canvas not set');
      noCanvas.dispose();
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
      expect(generator.getTrailPointCount()).toBe(0);
    });
  });

  // ─── Trail Points ─────────────────────────────────────────

  describe('trail points', () => {
    it('should add trail points when hand is tracked', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createHandAtPosition(0.5, 0.5));

      expect(generator.getTrailPointCount()).toBe(1);
    });

    it('should not add points when no hand detected', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createNoHandControlState());

      expect(generator.getTrailPointCount()).toBe(0);
    });

    it('should accumulate trail points over multiple frames', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createHandAtPosition(0.2, 0.3));
      stateSubject.next(createHandAtPosition(0.4, 0.5));
      stateSubject.next(createHandAtPosition(0.6, 0.7));

      expect(generator.getTrailPointCount()).toBe(3);
    });

    it('should remove trail points beyond maxTrailLength', async () => {
      const shortTrail = new TrailGenerator({ maxTrailLength: 3 });
      shortTrail.setCanvas(mockCanvas);
      shortTrail.connect(stateSubject.asObservable());
      await shortTrail.start();

      // Emit more frames than maxTrailLength
      for (let i = 0; i < 5; i++) {
        stateSubject.next(createHandAtPosition(i * 0.1, 0.5));
      }

      // With maxTrailLength=3, points age: first point has age 5, second age 4, etc.
      // Points with age >= 3 are filtered out
      // After 5 emissions, the points have ages: oldest removed, newest remain
      expect(shortTrail.getTrailPointCount()).toBeLessThanOrEqual(3);

      shortTrail.dispose();
    });

    it('should track points from multiple hands separately', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      const twoHands = createMockControlState({
        hands: [
          createMockSingleHand({ handId: 0, position: { x: 0.2, y: 0.3 } }),
          createMockSingleHand({ handId: 1, position: { x: 0.8, y: 0.7 } }),
        ],
      });

      stateSubject.next(twoHands);

      // Should have 2 trail points (one per hand)
      expect(generator.getTrailPointCount()).toBe(2);
    });

    it('should clear trails', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createHandAtPosition(0.5, 0.5));
      expect(generator.getTrailPointCount()).toBe(1);

      generator.clearTrails();
      expect(generator.getTrailPointCount()).toBe(0);
    });

    it('should not add points when generator is not running', () => {
      generator.connect(stateSubject.asObservable());
      // Do not start

      stateSubject.next(createHandAtPosition(0.5, 0.5));

      expect(generator.getTrailPointCount()).toBe(0);
    });
  });

  // ─── Rendering ─────────────────────────────────────────────

  describe('rendering', () => {
    it('should request animation frame on start', async () => {
      await generator.start();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should clear canvas on each render', async () => {
      await generator.start();
      if (rafCallback) rafCallback();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
    });

    it('should draw line segments for trail points', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      // Add multiple trail points to form segments
      stateSubject.next(createHandAtPosition(0.2, 0.3));
      stateSubject.next(createHandAtPosition(0.4, 0.5));

      // Trigger render
      if (rafCallback) rafCallback();

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  // ─── Connection ────────────────────────────────────────────

  describe('connection', () => {
    it('should connect and disconnect from stream', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createHandAtPosition(0.5, 0.5));
      expect(generator.getTrailPointCount()).toBe(1);

      generator.disconnect();

      // After disconnect, new emissions should not add points
      stateSubject.next(createHandAtPosition(0.6, 0.6));
      expect(generator.getTrailPointCount()).toBe(1);
    });

    it('should replace previous subscription on reconnect', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      const second = new Subject<ControlState>();
      generator.connect(second.asObservable());

      // Old subject should not add points
      stateSubject.next(createHandAtPosition(0.5, 0.5));
      expect(generator.getTrailPointCount()).toBe(0);

      // New subject should add points
      second.next(createHandAtPosition(0.3, 0.3));
      expect(generator.getTrailPointCount()).toBe(1);

      second.complete();
    });
  });

  // ─── Config Updates ────────────────────────────────────────

  describe('config updates', () => {
    it('should update config at runtime', () => {
      generator.updateConfig({ maxTrailLength: 100 });
      // No error
      expect(generator.name).toBe('TrailGenerator');
    });
  });
});
