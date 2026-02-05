/**
 * Position Controller Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PositionController } from '../../src/controllers/PositionController';
import { createEmptyControlState } from '../../src/types/control.types';
import {
  createMockHandFrame,
  createMockHand,
  createMovingHandFrames,
} from '../mocks/handFrames.mock';

describe('PositionController', () => {
  let controller: PositionController;

  beforeEach(() => {
    controller = new PositionController();
  });

  describe('initialization', () => {
    it('should have default configuration', () => {
      expect(controller.name).toBe('PositionController');
      expect(controller.config.smoothingEnabled).toBe(true);
      expect(controller.config.trackingMode).toBe('palm');
      expect(controller.config.calculateVelocity).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customController = new PositionController({
        trackingMode: 'index_tip',
        smoothingFactor: 0.5,
      });

      expect(customController.config.trackingMode).toBe('index_tip');
      expect(customController.config.smoothingFactor).toBe(0.5);
    });
  });

  describe('process', () => {
    it('should create hand state from frame', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = controller.process(frame, state);

      expect(result.hasActiveHand).toBe(true);
      expect(result.hands).toHaveLength(1);
      expect(result.primaryHand).not.toBeNull();
      expect(result.primaryHand?.isTracked).toBe(true);
    });

    it('should calculate palm position', () => {
      const frame = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.5, centerY: 0.5 })],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);

      // Palm position should be near center
      expect(result.primaryHand?.position.x).toBeCloseTo(0.5, 1);
      expect(result.primaryHand?.position.y).toBeGreaterThan(0.4);
      expect(result.primaryHand?.position.y).toBeLessThan(0.7);
    });

    it('should track index fingertip when mode is set', () => {
      const tipController = new PositionController({ trackingMode: 'index_tip' });
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = tipController.process(frame, state);

      // Index tip should be tracked
      expect(result.primaryHand?.position).toBeDefined();
    });

    it('should calculate depth from z coordinates', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = controller.process(frame, state);

      // Depth should be normalized [0, 1]
      expect(result.primaryHand?.depth).toBeGreaterThanOrEqual(0);
      expect(result.primaryHand?.depth).toBeLessThanOrEqual(1);
    });

    it('should calculate rotation angle', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = controller.process(frame, state);

      // Rotation should be a valid angle
      expect(typeof result.primaryHand?.rotation).toBe('number');
      expect(result.primaryHand?.rotation).not.toBeNaN();
    });
  });

  describe('velocity calculation', () => {
    it('should calculate velocity from position change', () => {
      const frames = createMovingHandFrames(5);
      let state = createEmptyControlState();

      // Process multiple frames
      for (const frame of frames) {
        state = controller.process(frame, state);
      }

      // Should have non-zero velocity after movement
      expect(state.primaryHand?.velocity.vx).not.toBe(0);
      expect(state.primaryHand?.velocity.magnitude).toBeGreaterThan(0);
    });

    it('should return zero velocity for stationary hand', () => {
      const frame1 = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.5, centerY: 0.5 })],
        timestamp: 1000,
      });
      const frame2 = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.5, centerY: 0.5 })],
        timestamp: 1033,
      });

      let state = createEmptyControlState();
      state = controller.process(frame1, state);
      state = controller.process(frame2, state);

      // Velocity should be near zero for stationary hand
      expect(Math.abs(state.primaryHand?.velocity.vx ?? 0)).toBeLessThan(0.1);
      expect(Math.abs(state.primaryHand?.velocity.vy ?? 0)).toBeLessThan(0.1);
    });
  });

  describe('smoothing', () => {
    it('should smooth positions when enabled', () => {
      const smoothController = new PositionController({
        smoothingEnabled: true,
        smoothingFactor: 0.5,
        movementThreshold: 0, // Disable threshold for this test
      });

      const frame1 = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.2, centerY: 0.5 })],
        timestamp: 1000,
      });
      const frame2 = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.8, centerY: 0.5 })],
        timestamp: 1033,
      });

      let state = createEmptyControlState();
      state = smoothController.process(frame1, state);
      const pos1 = state.primaryHand?.position.x ?? 0;

      state = smoothController.process(frame2, state);
      const pos2 = state.primaryHand?.position.x ?? 0;

      // Position should not jump immediately to 0.8
      expect(pos2).toBeLessThan(0.8);
      expect(pos2).toBeGreaterThan(pos1);
    });

    it('should not smooth when disabled', () => {
      const noSmoothController = new PositionController({
        smoothingEnabled: false,
        movementThreshold: 0,
      });

      const frame1 = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.2, centerY: 0.5 })],
        timestamp: 1000,
      });
      const frame2 = createMockHandFrame({
        hands: [createMockHand({ centerX: 0.8, centerY: 0.5 })],
        timestamp: 1033,
      });

      let state = createEmptyControlState();
      state = noSmoothController.process(frame1, state);
      state = noSmoothController.process(frame2, state);

      // Position should jump directly
      expect(state.primaryHand?.position.x).toBeCloseTo(0.8, 1);
    });
  });

  describe('multiple hands', () => {
    it('should track two hands', () => {
      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.3, handedness: 'Left' }),
          createMockHand({ id: 1, centerX: 0.7, handedness: 'Right' }),
        ],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);

      expect(result.hands).toHaveLength(2);
      expect(result.primaryHand).not.toBeNull();
      expect(result.secondaryHand).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear internal state on reset', () => {
      const frames = createMovingHandFrames(5);
      let state = createEmptyControlState();

      for (const frame of frames) {
        state = controller.process(frame, state);
      }

      controller.reset();

      // Process a new frame after reset
      const newFrame = createMockHandFrame({
        timestamp: Date.now() + 10000,
      });
      const newState = createEmptyControlState();
      const result = controller.process(newFrame, newState);

      // Should not have velocity from old data
      expect(result.primaryHand?.velocity.magnitude).toBe(0);
    });
  });

  describe('config update', () => {
    it('should update configuration', () => {
      controller.updateConfig({ trackingMode: 'wrist' });

      expect(controller.config.trackingMode).toBe('wrist');
    });
  });
});
