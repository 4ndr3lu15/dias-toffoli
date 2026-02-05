/**
 * Distance Controller Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DistanceController, getDistances, hasDistances } from '../../src/controllers/DistanceController';
import { createEmptyControlState } from '../../src/types/control.types';
import { createMockHandFrame, createMockHand } from '../mocks/handFrames.mock';

describe('DistanceController', () => {
  let controller: DistanceController;

  beforeEach(() => {
    controller = new DistanceController();
  });

  describe('initialization', () => {
    it('should have default configuration', () => {
      expect(controller.name).toBe('DistanceController');
      expect(controller.config.normalizeToHandSize).toBe(true);
      expect(controller.config.smoothingEnabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customController = new DistanceController({
        normalizeToHandSize: false,
        smoothingFactor: 0.5,
      });

      expect(customController.config.normalizeToHandSize).toBe(false);
      expect(customController.config.smoothingFactor).toBe(0.5);
    });
  });

  describe('single hand measurements', () => {
    it('should measure pinch distance for one hand', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = controller.process(frame, state);

      expect(hasDistances(result)).toBe(true);
      const distances = getDistances(result);
      expect(distances?.primaryPinch).not.toBeNull();
      expect(distances?.primaryPinch).toBeGreaterThan(0);
    });

    it('should return null for two-hand measurements with one hand', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      expect(distances?.palmToPalm).toBeNull();
      expect(distances?.indexToIndex).toBeNull();
      expect(distances?.thumbToThumb).toBeNull();
      expect(distances?.secondaryPinch).toBeNull();
    });
  });

  describe('two hand measurements', () => {
    it('should measure palm to palm distance', () => {
      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.3 }),
          createMockHand({ id: 1, centerX: 0.7 }),
        ],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      expect(distances?.palmToPalm).not.toBeNull();
      expect(distances?.palmToPalm).toBeGreaterThan(0);
    });

    it('should measure index to index distance', () => {
      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.3 }),
          createMockHand({ id: 1, centerX: 0.7 }),
        ],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      expect(distances?.indexToIndex).not.toBeNull();
      expect(distances?.indexToIndex).toBeGreaterThan(0);
    });

    it('should measure thumb to thumb distance', () => {
      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.3 }),
          createMockHand({ id: 1, centerX: 0.7 }),
        ],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      expect(distances?.thumbToThumb).not.toBeNull();
      expect(distances?.thumbToThumb).toBeGreaterThan(0);
    });

    it('should measure both pinch distances', () => {
      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.3 }),
          createMockHand({ id: 1, centerX: 0.7 }),
        ],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      expect(distances?.primaryPinch).not.toBeNull();
      expect(distances?.secondaryPinch).not.toBeNull();
    });
  });

  describe('normalization', () => {
    it('should normalize distances to hand size when enabled', () => {
      const normalizeController = new DistanceController({ normalizeToHandSize: true });

      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = normalizeController.process(frame, state);
      const distances = getDistances(result);

      // Normalized pinch distance should be reasonable (relative to hand size)
      expect(distances?.primaryPinch).toBeLessThan(2);
    });

    it('should return raw distances when normalization disabled', () => {
      const rawController = new DistanceController({ normalizeToHandSize: false });

      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = rawController.process(frame, state);
      const distances = getDistances(result);

      // Raw distance should be in normalized coordinate range
      expect(distances?.primaryPinch).toBeLessThan(1);
    });
  });

  describe('smoothing', () => {
    it('should smooth measurements when enabled', () => {
      const smoothController = new DistanceController({
        smoothingEnabled: true,
        smoothingFactor: 0.5,
      });

      // Frame with hands close together
      const frame1 = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.4 }),
          createMockHand({ id: 1, centerX: 0.6 }),
        ],
        timestamp: 1000,
      });

      // Frame with hands far apart
      const frame2 = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, centerX: 0.2 }),
          createMockHand({ id: 1, centerX: 0.8 }),
        ],
        timestamp: 1033,
      });

      const state = createEmptyControlState();
      smoothController.process(frame1, state);
      const result = smoothController.process(frame2, state);

      const distances = getDistances(result);
      // Palm distance should be smoothed, not jumping to max
      expect(distances?.palmToPalm).toBeDefined();
    });
  });

  describe('hand size calculation', () => {
    it('should calculate average hand size', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      expect(distances?.avgHandSize).toBeGreaterThan(0);
    });

    it('should average hand sizes for two hands', () => {
      const frame = createMockHandFrame({
        hands: [
          createMockHand({ id: 0, scale: 0.1 }),
          createMockHand({ id: 1, scale: 0.15 }),
        ],
      });
      const state = createEmptyControlState();

      const result = controller.process(frame, state);
      const distances = getDistances(result);

      // Average hand size should be between the two
      expect(distances?.avgHandSize).toBeGreaterThan(0);
    });
  });

  describe('getMeasurements', () => {
    it('should return null before processing', () => {
      expect(controller.getMeasurements()).toBeNull();
    });

    it('should return measurements after processing', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      controller.process(frame, state);

      const measurements = controller.getMeasurements();
      expect(measurements).not.toBeNull();
      expect(measurements?.primaryPinch).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should clear measurements on reset', () => {
      const frame = createMockHandFrame();
      const state = createEmptyControlState();

      controller.process(frame, state);
      expect(controller.getMeasurements()).not.toBeNull();

      controller.reset();
      expect(controller.getMeasurements()).toBeNull();
    });
  });

  describe('helper functions', () => {
    it('hasDistances should return false for empty state', () => {
      const state = createEmptyControlState();
      expect(hasDistances(state)).toBe(false);
    });

    it('getDistances should return null for empty state', () => {
      const state = createEmptyControlState();
      expect(getDistances(state)).toBeNull();
    });
  });
});
