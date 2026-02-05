/**
 * Hand Frame Mock Data Generators
 *
 * Utilities for creating mock hand tracking data for testing.
 */

import type { HandFrame, HandData, HandLandmarks, Point3D, Handedness } from '../../src/types';

/**
 * Create a mock Point3D.
 */
export function createMockPoint(x: number = 0.5, y: number = 0.5, z: number = 0): Point3D {
  return { x, y, z };
}

/**
 * Create mock hand landmarks at a given center position.
 * Generates a simplified hand shape for testing.
 */
export function createMockLandmarks(
  centerX: number = 0.5,
  centerY: number = 0.5,
  scale: number = 0.1
): HandLandmarks {
  // Create a simplified hand shape
  // Wrist at bottom, fingers extending upward
  const landmarks: Point3D[] = [];

  // Wrist (0)
  landmarks.push(createMockPoint(centerX, centerY + scale * 2, 0));

  // Thumb (1-4) - to the side
  landmarks.push(createMockPoint(centerX - scale * 1.5, centerY + scale * 1.5, 0));
  landmarks.push(createMockPoint(centerX - scale * 2, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX - scale * 2.2, centerY + scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX - scale * 2.5, centerY, 0));

  // Index finger (5-8)
  landmarks.push(createMockPoint(centerX - scale * 0.75, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.75, centerY, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.75, centerY - scale, 0));
  landmarks.push(createMockPoint(centerX - scale * 0.75, centerY - scale * 2, 0));

  // Middle finger (9-12)
  landmarks.push(createMockPoint(centerX, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX, centerY - scale * 0.2, 0));
  landmarks.push(createMockPoint(centerX, centerY - scale * 1.2, 0));
  landmarks.push(createMockPoint(centerX, centerY - scale * 2.2, 0));

  // Ring finger (13-16)
  landmarks.push(createMockPoint(centerX + scale * 0.75, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.75, centerY, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.75, centerY - scale, 0));
  landmarks.push(createMockPoint(centerX + scale * 0.75, centerY - scale * 1.8, 0));

  // Pinky finger (17-20)
  landmarks.push(createMockPoint(centerX + scale * 1.5, centerY + scale, 0));
  landmarks.push(createMockPoint(centerX + scale * 1.5, centerY + scale * 0.2, 0));
  landmarks.push(createMockPoint(centerX + scale * 1.5, centerY - scale * 0.5, 0));
  landmarks.push(createMockPoint(centerX + scale * 1.5, centerY - scale * 1.2, 0));

  return landmarks as HandLandmarks;
}

/**
 * Options for creating mock hand data.
 */
export interface MockHandOptions {
  id?: number;
  handedness?: Handedness;
  centerX?: number;
  centerY?: number;
  confidence?: number;
  scale?: number;
}

/**
 * Create mock hand data.
 */
export function createMockHand(options: MockHandOptions = {}): HandData {
  const {
    id = 0,
    handedness = 'Right',
    centerX = 0.5,
    centerY = 0.5,
    confidence = 0.95,
    scale = 0.1,
  } = options;

  return {
    id,
    handedness,
    landmarks: createMockLandmarks(centerX, centerY, scale),
    confidence,
  };
}

/**
 * Options for creating mock hand frames.
 */
export interface MockHandFrameOptions {
  hands?: HandData[];
  timestamp?: number;
  processingTime?: number;
}

/**
 * Create a mock hand frame.
 */
export function createMockHandFrame(options: MockHandFrameOptions = {}): HandFrame {
  const { hands = [createMockHand()], timestamp = Date.now(), processingTime = 10 } = options;

  return {
    hands,
    handCount: hands.length,
    timestamp,
    processingTime,
  };
}

/**
 * Create an empty hand frame (no hands detected).
 */
export function createEmptyHandFrame(): HandFrame {
  return {
    hands: [],
    handCount: 0,
    timestamp: Date.now(),
    processingTime: 5,
  };
}

/**
 * Create a sequence of hand frames simulating movement.
 */
export function createMovingHandFrames(
  frameCount: number,
  startX: number = 0.2,
  endX: number = 0.8,
  y: number = 0.5
): HandFrame[] {
  const frames: HandFrame[] = [];

  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const x = startX + (endX - startX) * t;

    frames.push(
      createMockHandFrame({
        hands: [createMockHand({ centerX: x, centerY: y })],
        timestamp: Date.now() + i * 33, // ~30 FPS
        processingTime: 8 + Math.random() * 4,
      })
    );
  }

  return frames;
}
