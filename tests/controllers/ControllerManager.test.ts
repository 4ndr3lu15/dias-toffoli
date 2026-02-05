/**
 * Controller Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';
import { ControllerManager, createControllerManager } from '../../src/controllers/ControllerManager';
import { createMockHandFrame, createMockHand } from '../mocks/handFrames.mock';
import type { HandFrame } from '../../src/types';

describe('ControllerManager', () => {
  let manager: ControllerManager;
  let handFrames$: Subject<HandFrame>;

  beforeEach(() => {
    manager = new ControllerManager();
    handFrames$ = new Subject<HandFrame>();
  });

  afterEach(() => {
    manager.stop();
    handFrames$.complete();
  });

  describe('initialization', () => {
    it('should create with default configuration', () => {
      expect(manager.config.position).toBeDefined();
      expect(manager.config.gesture).toBeDefined();
      expect(manager.config.distance).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customManager = new ControllerManager({
        position: { trackingMode: 'index_tip' },
      });

      expect(customManager.config.position.trackingMode).toBe('index_tip');
    });

    it('should provide initial empty state', () => {
      const state = manager.getCurrentState();

      expect(state.hasActiveHand).toBe(false);
      expect(state.hands).toHaveLength(0);
      expect(state.primaryHand).toBeNull();
    });
  });

  describe('processing', () => {
    it('should process hand frames and emit states', async () => {
      const frame = createMockHandFrame();

      await new Promise<void>((resolve) => {
        let emitCount = 0;

        manager.state$.subscribe((state) => {
          emitCount++;
          if (emitCount === 2) {
            // First emit is initial state, second is processed frame
            expect(state.hasActiveHand).toBe(true);
            expect(state.primaryHand).not.toBeNull();
            resolve();
          }
        });

        manager.start(handFrames$.asObservable());
        handFrames$.next(frame);
      });
    });

    it('should update position data', () => {
      manager.start(handFrames$.asObservable());

      const frame = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.3, centerY: 0.6 })],
      });
      handFrames$.next(frame);

      const state = manager.getCurrentState();
      expect(state.primaryHand?.position).toBeDefined();
      expect(state.primaryHand?.position.x).toBeCloseTo(0.3, 1);
    });

    it('should update gesture data', () => {
      manager.start(handFrames$.asObservable());

      const frame = createMockHandFrame();
      handFrames$.next(frame);

      const state = manager.getCurrentState();
      expect(state.primaryHand?.gesture).toBeDefined();
      expect(state.primaryHand?.gesture.type).toBeDefined();
    });

    it('should update distance data', () => {
      manager.start(handFrames$.asObservable());

      const frame = createMockHandFrame();
      handFrames$.next(frame);

      const state = manager.getCurrentState();
      expect(state.custom.distances).toBeDefined();
    });

    it('should calculate delta time between frames', () => {
      manager.start(handFrames$.asObservable());

      const frame1 = createMockHandFrame({ timestamp: 1000 });
      const frame2 = createMockHandFrame({ timestamp: 1033 });

      handFrames$.next(frame1);
      handFrames$.next(frame2);

      const state = manager.getCurrentState();
      expect(state.deltaTime).toBe(33);
    });
  });

  describe('two hand tracking', () => {
    it('should track both hands', () => {
      manager.start(handFrames$.asObservable());

      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.3, handedness: 'Left' }),
          createMockHand({ id: 1, centerX: 0.7, handedness: 'Right' }),
        ],
      });
      handFrames$.next(frame);

      const state = manager.getCurrentState();
      expect(state.hands).toHaveLength(2);
      expect(state.primaryHand).not.toBeNull();
      expect(state.secondaryHand).not.toBeNull();
    });
  });

  describe('start/stop', () => {
    it('should stop processing when stop is called', () => {
      manager.start(handFrames$.asObservable());

      const frame1 = createMockHandFrame({ timestamp: 1000 });
      handFrames$.next(frame1);

      manager.stop();

      const frame2 = createMockHandFrame({ timestamp: 2000 });
      handFrames$.next(frame2);

      // State should still have first frame's timestamp
      const state = manager.getCurrentState();
      expect(state.timestamp).toBe(1000);
    });

    it('should allow restart after stop', () => {
      manager.start(handFrames$.asObservable());
      manager.stop();

      const newSubject = new Subject<HandFrame>();
      manager.start(newSubject.asObservable());

      const frame = createMockHandFrame({ timestamp: 3000 });
      newSubject.next(frame);

      const state = manager.getCurrentState();
      expect(state.timestamp).toBe(3000);

      newSubject.complete();
    });
  });

  describe('configuration', () => {
    it('should update position controller config', () => {
      manager.updateConfig({
        position: { trackingMode: 'wrist' },
      });

      expect(manager.config.position.trackingMode).toBe('wrist');
    });

    it('should update gesture controller config', () => {
      manager.updateConfig({
        gesture: { pinchThreshold: 0.15 },
      });

      expect(manager.config.gesture.pinchThreshold).toBe(0.15);
    });

    it('should update distance controller config', () => {
      manager.updateConfig({
        distance: { normalizeToHandSize: false },
      });

      expect(manager.config.distance.normalizeToHandSize).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      manager.start(handFrames$.asObservable());

      const frame = createMockHandFrame();
      handFrames$.next(frame);

      expect(manager.getCurrentState().hasActiveHand).toBe(true);

      manager.reset();

      expect(manager.getCurrentState().hasActiveHand).toBe(false);
      expect(manager.getCurrentState().hands).toHaveLength(0);
    });
  });

  describe('controller access', () => {
    it('should provide access to position controller', () => {
      const positionController = manager.getPositionController();
      expect(positionController.name).toBe('PositionController');
    });

    it('should provide access to gesture controller', () => {
      const gestureController = manager.getGestureController();
      expect(gestureController.name).toBe('GestureController');
    });

    it('should provide access to distance controller', () => {
      const distanceController = manager.getDistanceController();
      expect(distanceController.name).toBe('DistanceController');
    });
  });

  describe('factory function', () => {
    it('should create manager with createControllerManager', () => {
      const factoryManager = createControllerManager({
        position: { smoothingFactor: 0.5 },
      });

      expect(factoryManager.config.position.smoothingFactor).toBe(0.5);
    });
  });
});
