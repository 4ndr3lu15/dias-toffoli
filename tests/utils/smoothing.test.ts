/**
 * Smoothing Utility Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { smoothPoint, LandmarkSmoother } from '../../src/utils/smoothing';
import type { Point3D } from '../../src/types';

describe('smoothPoint', () => {
  it('should return current point when factor is 1', () => {
    const current: Point3D = { x: 1, y: 1, z: 1 };
    const previous: Point3D = { x: 0, y: 0, z: 0 };
    const result = smoothPoint(current, previous, 1);

    expect(result).toEqual(current);
  });

  it('should return previous point when factor is 0', () => {
    const current: Point3D = { x: 1, y: 1, z: 1 };
    const previous: Point3D = { x: 0, y: 0, z: 0 };
    const result = smoothPoint(current, previous, 0);

    expect(result).toEqual(previous);
  });

  it('should interpolate with factor 0.5', () => {
    const current: Point3D = { x: 1, y: 1, z: 1 };
    const previous: Point3D = { x: 0, y: 0, z: 0 };
    const result = smoothPoint(current, previous, 0.5);

    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBeCloseTo(0.5);
    expect(result.z).toBeCloseTo(0.5);
  });
});

describe('LandmarkSmoother', () => {
  let smoother: LandmarkSmoother;

  beforeEach(() => {
    smoother = new LandmarkSmoother(0.3);
  });

  it('should return original point for first value', () => {
    const point: Point3D = { x: 0.5, y: 0.5, z: 0 };
    const result = smoother.smoothLandmark(0, 0, point);

    expect(result).toEqual(point);
  });

  it('should smooth subsequent points', () => {
    const point1: Point3D = { x: 0, y: 0, z: 0 };
    const point2: Point3D = { x: 1, y: 1, z: 0 };

    smoother.smoothLandmark(0, 0, point1);
    const result = smoother.smoothLandmark(0, 0, point2);

    // With factor 0.3, result should be closer to previous (point1)
    expect(result.x).toBeCloseTo(0.3);
    expect(result.y).toBeCloseTo(0.3);
  });

  it('should handle different hands separately', () => {
    const point1: Point3D = { x: 0, y: 0, z: 0 };
    const point2: Point3D = { x: 1, y: 1, z: 0 };

    // First hand
    smoother.smoothLandmark(0, 0, point1);

    // Second hand - should not be affected by first hand's history
    const result = smoother.smoothLandmark(1, 0, point2);

    expect(result).toEqual(point2);
  });

  it('should clear hand buffer', () => {
    const point1: Point3D = { x: 0.5, y: 0.5, z: 0 };
    const point2: Point3D = { x: 1, y: 1, z: 0 };

    smoother.smoothLandmark(0, 0, point1);
    smoother.clearHand(0);

    // After clear, next point should be returned as-is
    const result = smoother.smoothLandmark(0, 0, point2);
    expect(result).toEqual(point2);
  });

  it('should clear all buffers', () => {
    const point: Point3D = { x: 0.5, y: 0.5, z: 0 };

    smoother.smoothLandmark(0, 0, point);
    smoother.smoothLandmark(1, 0, point);
    smoother.clear();

    // After clear, any new point should be returned as-is
    const newPoint: Point3D = { x: 1, y: 1, z: 0 };
    expect(smoother.smoothLandmark(0, 0, newPoint)).toEqual(newPoint);
    expect(smoother.smoothLandmark(1, 0, newPoint)).toEqual(newPoint);
  });

  it('should expose smoothing factor', () => {
    expect(smoother.smoothingFactor).toBe(0.3);
  });
});
