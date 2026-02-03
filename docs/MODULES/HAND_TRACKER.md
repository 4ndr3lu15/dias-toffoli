# Module: HandTracker

## Purpose

The HandTracker module is responsible for:
1. Accessing the user's webcam
2. Running MediaPipe hand detection on video frames
3. Emitting a stream of `HandFrame` objects containing landmark data

## Interface

```typescript
interface IHandTracker {
  /**
   * Initialize the tracker with a video element
   * @param videoElement - HTML video element to use as source
   * @returns Promise that resolves when initialization is complete
   */
  initialize(videoElement: HTMLVideoElement): Promise<void>;
  
  /**
   * Observable stream of hand tracking data
   * Emits a new HandFrame for each processed video frame
   */
  readonly hands$: Observable<HandFrame>;
  
  /**
   * Current tracking status
   */
  readonly isTracking: boolean;
  
  /**
   * Start tracking
   */
  start(): void;
  
  /**
   * Stop tracking (pauses without destroying)
   */
  stop(): void;
  
  /**
   * Release all resources
   */
  dispose(): void;
}
```

## Configuration

```typescript
interface HandTrackerConfig {
  /** Maximum number of hands to detect (1 or 2) */
  maxHands: 1 | 2;
  
  /** Minimum confidence for initial detection [0, 1] */
  minDetectionConfidence: number;
  
  /** Minimum confidence for tracking [0, 1] */
  minTrackingConfidence: number;
  
  /** Target frames per second */
  targetFps: number;
  
  /** Enable temporal smoothing */
  smoothing: boolean;
  
  /** Smoothing factor (lower = smoother, higher latency) */
  smoothingFactor: number;
}

const DEFAULT_CONFIG: HandTrackerConfig = {
  maxHands: 2,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5,
  targetFps: 30,
  smoothing: true,
  smoothingFactor: 0.3
};
```

## Implementation Details

### MediaPipe Integration

```typescript
import { Hands, Results } from '@mediapipe/hands';

class HandTracker implements IHandTracker {
  private hands: Hands;
  private subject = new Subject<HandFrame>();
  private smoothingBuffers: Map<number, Point3D[]> = new Map();
  
  constructor(private config: HandTrackerConfig = DEFAULT_CONFIG) {
    this.hands = new Hands({
      locateFile: (file) => 
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    
    this.hands.setOptions({
      maxNumHands: config.maxHands,
      minDetectionConfidence: config.minDetectionConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
      modelComplexity: 1  // 0 = lite, 1 = full
    });
  }
}
```

### Frame Processing Flow

```
┌─────────────┐    ┌────────────┐    ┌─────────────┐    ┌───────────┐
│   Video     │───▶│  MediaPipe │───▶│  Transform  │───▶│   Emit    │
│   Frame     │    │   Hands    │    │  + Smooth   │    │ HandFrame │
└─────────────┘    └────────────┘    └─────────────┘    └───────────┘
```

### Smoothing Algorithm

Temporal smoothing using exponential moving average:

```typescript
function smoothPosition(
  current: Point3D,
  buffer: Point3D[],
  factor: number
): Point3D {
  if (buffer.length === 0) {
    buffer.push(current);
    return current;
  }
  
  const previous = buffer[buffer.length - 1];
  const smoothed: Point3D = {
    x: previous.x + (current.x - previous.x) * factor,
    y: previous.y + (current.y - previous.y) * factor,
    z: previous.z + (current.z - previous.z) * factor
  };
  
  buffer.push(smoothed);
  if (buffer.length > 5) buffer.shift();
  
  return smoothed;
}
```

## Usage Example

```typescript
import { HandTracker } from './core/HandTracker';

const tracker = new HandTracker({
  maxHands: 2,
  minDetectionConfidence: 0.7,
  smoothing: true
});

// Get video element
const video = document.getElementById('webcam') as HTMLVideoElement;

// Initialize
await tracker.initialize(video);

// Subscribe to hand data
tracker.hands$.subscribe(frame => {
  console.log(`Detected ${frame.handCount} hands`);
  
  frame.hands.forEach(hand => {
    console.log(`Hand ${hand.id}: ${hand.handedness}`);
    console.log(`  Index tip: (${hand.landmarks[8].x}, ${hand.landmarks[8].y})`);
  });
});

// Start tracking
tracker.start();

// Later: cleanup
tracker.dispose();
```

## Error Handling

```typescript
tracker.hands$.pipe(
  catchError(error => {
    console.error('Hand tracking error:', error);
    return EMPTY; // Or emit a default frame
  })
).subscribe(/* ... */);
```

## Performance Notes

1. **GPU Acceleration**: MediaPipe uses WebGL for inference
2. **Frame Skipping**: If processing takes longer than frame interval, skip frames
3. **Memory**: Landmark data is reused between frames to minimize allocations
4. **Workers**: MediaPipe internally uses workers for non-blocking inference

## Testing

```typescript
// Mock for testing
const mockHandFrame: HandFrame = {
  hands: [createMockHand(0, 'Right', 0.5, 0.5)],
  handCount: 1,
  timestamp: Date.now(),
  processingTime: 10
};

const mockTracker: IHandTracker = {
  hands$: of(mockHandFrame),
  isTracking: true,
  initialize: async () => {},
  start: () => {},
  stop: () => {},
  dispose: () => {}
};
```

## Dependencies

- `@mediapipe/hands`: Core hand tracking model
- `@mediapipe/camera_utils`: Camera access utilities
- `rxjs`: Observable streams
