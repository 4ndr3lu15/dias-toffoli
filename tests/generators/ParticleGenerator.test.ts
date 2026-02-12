/**
 * ParticleGenerator Tests
 *
 * Tests for the ParticleGenerator using mocked Canvas 2D context.
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
import { ParticleGenerator } from '../../src/generators/visual/ParticleGenerator';
import { DEFAULT_PARTICLE_CONFIG } from '../../src/generators/IGenerator';

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

describe('ParticleGenerator', () => {
  let generator: ParticleGenerator;
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

    // Mock rAF to capture callback without running loop
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb as unknown as () => void;
      return 1;
    });
    globalThis.cancelAnimationFrame = vi.fn();

    generator = new ParticleGenerator();
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
      expect(generator.name).toBe('ParticleGenerator');
      expect(generator.isRunning).toBe(false);
    });

    it('should accept custom config', () => {
      const custom = new ParticleGenerator({ particleCount: 50, attractionStrength: 0.5 });
      custom.setCanvas(mockCanvas);
      expect(custom.name).toBe('ParticleGenerator');
      custom.dispose();
    });

    it('should throw if start() called without canvas', async () => {
      const noCanvas = new ParticleGenerator();
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
      await generator.start(); // no-op
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
      expect(generator.getParticleCount()).toBe(0);
    });
  });

  // ─── Particles ─────────────────────────────────────────────

  describe('particles', () => {
    it('should initialize particles on start', async () => {
      await generator.start();
      expect(generator.getParticleCount()).toBe(DEFAULT_PARTICLE_CONFIG.particleCount);
    });

    it('should initialize correct number of particles with custom count', async () => {
      const custom = new ParticleGenerator({ particleCount: 10 });
      custom.setCanvas(mockCanvas);
      await custom.start();
      expect(custom.getParticleCount()).toBe(10);
      custom.dispose();
    });

    it('should reinitialize particles when particleCount config changes', async () => {
      await generator.start();
      expect(generator.getParticleCount()).toBe(DEFAULT_PARTICLE_CONFIG.particleCount);
      generator.updateConfig({ particleCount: 50 });
      expect(generator.getParticleCount()).toBe(50);
    });
  });

  // ─── Attractors from ControlState ──────────────────────────

  describe('attractors', () => {
    it('should update attractors when hand is tracked', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createHandAtPosition(0.5, 0.5));

      const attractors = generator.getAttractors();
      expect(attractors.length).toBe(1);
      expect(attractors[0].x).toBeCloseTo(0.5 * mockCanvas.width);
      expect(attractors[0].y).toBeCloseTo(0.5 * mockCanvas.height);
    });

    it('should have no attractors when no hand detected', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createNoHandControlState());

      expect(generator.getAttractors().length).toBe(0);
    });

    it('should track multiple hand attractors', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      const twoHands = createMockControlState({
        hands: [
          createMockSingleHand({ handId: 0, position: { x: 0.2, y: 0.3 } }),
          createMockSingleHand({ handId: 1, position: { x: 0.8, y: 0.7 } }),
        ],
      });

      stateSubject.next(twoHands);

      const attractors = generator.getAttractors();
      expect(attractors.length).toBe(2);
    });

    it('should compute attractor hue from x position', async () => {
      generator.connect(stateSubject.asObservable());
      await generator.start();

      stateSubject.next(createHandAtPosition(0.75, 0.5));

      const attractors = generator.getAttractors();
      expect(attractors[0].hue).toBeCloseTo(0.75 * 360);
    });
  });

  // ─── Rendering ─────────────────────────────────────────────

  describe('rendering', () => {
    it('should request animation frame on start', async () => {
      await generator.start();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should draw trail background and particles on render', async () => {
      await generator.start();

      // Trigger one animation frame manually
      if (rafCallback) rafCallback();

      // Trail background
      expect(mockCtx.fillRect).toHaveBeenCalled();
      // Particle arcs
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  // ─── Connection ────────────────────────────────────────────

  describe('connection', () => {
    it('should connect and disconnect from stream', () => {
      generator.connect(stateSubject.asObservable());
      // Should not throw
      stateSubject.next(createNoHandControlState());
      generator.disconnect();
      // After disconnect, further emissions should not affect attractors
      stateSubject.next(createHandAtPosition(0.5, 0.5));
      expect(generator.getAttractors().length).toBe(0);
    });

    it('should replace previous subscription on reconnect', () => {
      generator.connect(stateSubject.asObservable());
      const second = new Subject<ControlState>();
      generator.connect(second.asObservable());

      // Old subject should no longer update attractors
      stateSubject.next(createHandAtPosition(0.5, 0.5));
      expect(generator.getAttractors().length).toBe(0);

      second.complete();
    });
  });
});
