/**
 * HandTracker Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HandTracker } from '../../src/core/HandTracker';
import { DEFAULT_HAND_TRACKER_CONFIG } from '../../src/core/IHandTracker';
import { createMockHandFrame, createEmptyHandFrame } from '../mocks/handFrames.mock';
import { isValidHandFrame } from '../../src/types';

// Mock the mediapipe-loader module
vi.mock('../../src/utils/mediapipe-loader', () => ({
  loadMediaPipeHands: vi.fn().mockResolvedValue(
    vi.fn().mockImplementation(() => ({
      setOptions: vi.fn(),
      onResults: vi.fn(),
      send: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue(undefined),
    }))
  ),
  getMediaPipeFileLocator: vi.fn().mockReturnValue((file: string) => `/mock/${file}`),
}));

// Mock video element
function createMockVideoElement(): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 640, writable: true });
  Object.defineProperty(video, 'videoHeight', { value: 480, writable: true });
  Object.defineProperty(video, 'readyState', { value: 4, writable: true }); // HAVE_ENOUGH_DATA
  return video;
}

describe('HandTracker', () => {
  let tracker: HandTracker;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    tracker = new HandTracker();
    mockVideo = createMockVideoElement();
    vi.useFakeTimers();
  });

  afterEach(() => {
    tracker.dispose();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(tracker).toBeDefined();
      expect(tracker.isTracking).toBe(false);
    });

    it('should create with custom config', () => {
      const customTracker = new HandTracker({
        ...DEFAULT_HAND_TRACKER_CONFIG,
        maxHands: 1,
        smoothing: false,
      });
      expect(customTracker).toBeDefined();
      customTracker.dispose();
    });

    it('should initialize successfully with video element', async () => {
      await expect(tracker.initialize(mockVideo)).resolves.not.toThrow();
    });

    it('should throw if initialized twice', async () => {
      await tracker.initialize(mockVideo);
      await expect(tracker.initialize(mockVideo)).rejects.toThrow();
    });
  });

  describe('tracking lifecycle', () => {
    beforeEach(async () => {
      await tracker.initialize(mockVideo);
    });

    it('should start tracking', () => {
      tracker.start();
      expect(tracker.isTracking).toBe(true);
    });

    it('should stop tracking', () => {
      tracker.start();
      tracker.stop();
      expect(tracker.isTracking).toBe(false);
    });

    it('should not throw when starting already started tracker', () => {
      tracker.start();
      expect(() => tracker.start()).not.toThrow();
    });

    it('should not throw when stopping already stopped tracker', () => {
      expect(() => tracker.stop()).not.toThrow();
    });
  });

  describe('hands$ observable', () => {
    it('should have hands$ observable', () => {
      expect(tracker.hands$).toBeDefined();
      expect(typeof tracker.hands$.subscribe).toBe('function');
    });
  });

  describe('dispose', () => {
    it('should stop tracking on dispose', async () => {
      await tracker.initialize(mockVideo);
      tracker.start();
      tracker.dispose();
      expect(tracker.isTracking).toBe(false);
    });

    it('should complete hands$ on dispose', async () => {
      await tracker.initialize(mockVideo);
      let completed = false;
      tracker.hands$.subscribe({
        complete: () => {
          completed = true;
        },
      });
      tracker.dispose();
      expect(completed).toBe(true);
    });
  });
});

describe('HandFrame validation', () => {
  it('should validate correct hand frame', () => {
    const frame = createMockHandFrame();
    expect(isValidHandFrame(frame)).toBe(true);
  });

  it('should validate empty hand frame', () => {
    const frame = createEmptyHandFrame();
    expect(isValidHandFrame(frame)).toBe(true);
    expect(frame.handCount).toBe(0);
  });

  it('should reject invalid hand frame', () => {
    expect(isValidHandFrame(null)).toBe(false);
    expect(isValidHandFrame(undefined)).toBe(false);
    expect(isValidHandFrame({})).toBe(false);
    expect(isValidHandFrame({ hands: 'invalid' })).toBe(false);
  });
});
