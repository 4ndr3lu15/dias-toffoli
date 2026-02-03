# Module: Controllers

## Purpose

Controllers transform raw `HandFrame` data into actionable `ControlState` objects. They are the "interpreters" that give meaning to hand positions and gestures.

## Controller Interface

```typescript
interface IController {
  /**
   * Process a hand frame and return control state
   * This is a pure function - same input always produces same output
   */
  process(frame: HandFrame): ControlState;
  
  /**
   * Observable stream of control states
   * Controllers can maintain internal state for things like velocity calculation
   */
  readonly state$: Observable<ControlState>;
  
  /**
   * Connect to a hand frame stream
   */
  connect(hands$: Observable<HandFrame>): void;
  
  /**
   * Reset internal state
   */
  reset(): void;
  
  /**
   * Cleanup resources
   */
  dispose(): void;
}
```

## Built-in Controllers

### 1. PositionController

Maps hand positions to normalized coordinates.

```typescript
interface PositionControllerConfig {
  /** Which hand to track ('primary' | 'secondary' | 'both') */
  handSelection: 'primary' | 'secondary' | 'both';
  
  /** Which landmark to use for position */
  landmark: HandLandmark;
  
  /** Smoothing factor [0, 1] */
  smoothing: number;
  
  /** Dead zone radius (ignore small movements) */
  deadZone: number;
}

class PositionController implements IController {
  constructor(config: PositionControllerConfig);
  
  // Transforms landmark position to normalized control position
  process(frame: HandFrame): ControlState;
}
```

**Use Cases:**
- Map hand X to pitch, Y to volume
- Control particle attractor position
- Navigate UI elements

### 2. GestureController

Recognizes discrete gestures from hand shapes.

```typescript
interface GestureControllerConfig {
  /** Gestures to detect */
  enabledGestures: GestureType[];
  
  /** Minimum confidence to report gesture */
  minConfidence: number;
  
  /** Minimum time gesture must be held (ms) */
  holdTime: number;
  
  /** Cooldown between gesture triggers (ms) */
  cooldown: number;
}

class GestureController implements IController {
  constructor(config: GestureControllerConfig);
  
  // Analyzes finger positions to detect gestures
  process(frame: HandFrame): ControlState;
}
```

**Gesture Detection Logic:**

```typescript
function detectGesture(landmarks: HandLandmarks): GestureState {
  const fingers = analyzeFingers(landmarks);
  
  // Open hand: all fingers extended
  if (fingers.extendedCount === 5) {
    return { type: GestureType.OPEN_HAND, confidence: 0.9 };
  }
  
  // Closed fist: no fingers extended
  if (fingers.extendedCount === 0) {
    return { type: GestureType.CLOSED_FIST, confidence: 0.9 };
  }
  
  // Pointing: only index extended
  if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    return { type: GestureType.POINTING, confidence: 0.85 };
  }
  
  // Peace: index and middle extended
  if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    return { type: GestureType.PEACE, confidence: 0.85 };
  }
  
  // Pinch: thumb and index close together
  const pinchDistance = distance(landmarks[4], landmarks[8]);
  if (pinchDistance < 0.05) {
    return { type: GestureType.PINCH, confidence: 1 - pinchDistance * 10 };
  }
  
  return { type: GestureType.NONE, confidence: 0 };
}
```

**Use Cases:**
- Mute/unmute with closed fist
- Trigger effects with specific gestures
- Mode switching (pointing = lead, open = chord)

### 3. VelocityController

Calculates movement speed and direction.

```typescript
interface VelocityControllerConfig {
  /** Time window for velocity calculation (ms) */
  windowSize: number;
  
  /** Minimum velocity to register (units/sec) */
  threshold: number;
  
  /** Smoothing for velocity values */
  smoothing: number;
}

class VelocityController implements IController {
  private positionHistory: { position: Position2D; time: number }[] = [];
  
  process(frame: HandFrame): ControlState {
    // Calculate velocity from position history
    const velocity = this.calculateVelocity(frame);
    
    // Detect sudden movements (flicks)
    const isFlick = velocity.magnitude > this.config.flickThreshold;
    
    return this.buildControlState(frame, velocity, isFlick);
  }
}
```

**Use Cases:**
- Map velocity to vibrato intensity
- Detect "throw" gestures for visual effects
- Control attack/release based on movement speed

### 4. OpennessController

Measures how open or closed the hand is.

```typescript
class OpennessController implements IController {
  process(frame: HandFrame): ControlState {
    const openness = this.calculateOpenness(frame.hands[0]?.landmarks);
    
    // openness.value: 0 = closed fist, 1 = fully open
    // openness.derivative: rate of change (opening/closing)
    
    return this.buildControlState(frame, openness);
  }
  
  private calculateOpenness(landmarks: HandLandmarks): HandOpenness {
    // Calculate average distance from fingertips to palm center
    const palmCenter = this.getPalmCenter(landmarks);
    const fingertips = [4, 8, 12, 16, 20].map(i => landmarks[i]);
    
    const avgDistance = fingertips.reduce((sum, tip) => 
      sum + distance(tip, palmCenter), 0) / 5;
    
    // Normalize to [0, 1] based on typical hand dimensions
    const normalized = Math.min(1, avgDistance / 0.3);
    
    return { value: normalized, derivative: this.getDerivative(normalized) };
  }
}
```

**Use Cases:**
- Control filter cutoff (closed = muted, open = bright)
- Modulate effect intensity
- Control particle spread

### 5. CompositeController

Combines multiple controllers into one control state.

```typescript
class CompositeController implements IController {
  constructor(private controllers: IController[]) {}
  
  process(frame: HandFrame): ControlState {
    const states = this.controllers.map(c => c.process(frame));
    return this.mergeStates(states);
  }
  
  private mergeStates(states: ControlState[]): ControlState {
    // Combine position from PositionController
    // Gesture from GestureController
    // Velocity from VelocityController
    // etc.
  }
}
```

## Creating Custom Controllers

```typescript
// Example: A controller that detects "conducting" motions

interface ConductorState {
  tempo: number;      // Detected BPM
  beat: number;       // Current beat in pattern
  downbeat: boolean;  // Is this a downbeat?
  intensity: number;  // Movement energy
}

class ConductorController implements IController {
  private beatHistory: number[] = [];
  
  process(frame: HandFrame): ControlState {
    const hand = frame.hands[0];
    if (!hand) return this.emptyState();
    
    // Detect vertical motion peaks (downbeats)
    const isDownbeat = this.detectDownbeat(hand.landmarks);
    
    // Calculate tempo from beat intervals
    const tempo = this.calculateTempo();
    
    // Build custom state
    const custom: ConductorState = {
      tempo,
      beat: this.currentBeat,
      downbeat: isDownbeat,
      intensity: this.calculateIntensity(hand)
    };
    
    return {
      ...this.baseState(frame),
      custom: { conductor: custom }
    };
  }
}
```

## Controller Pipeline

```
┌──────────────┐
│  HandFrame   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│              CompositeController                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │  Position   │ │   Gesture   │ │  Velocity   │ │
│  │ Controller  │ │ Controller  │ │ Controller  │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ │
│         └───────────────┼───────────────┘        │
│                         ▼                        │
│                  ┌─────────────┐                 │
│                  │   Merge     │                 │
│                  └─────────────┘                 │
└─────────────────────────┬────────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ ControlState │
                   └──────────────┘
```

## Testing Controllers

```typescript
import { describe, it, expect } from 'vitest';
import { GestureController } from './GestureController';
import { createMockHandFrame } from '../mocks/handFrames.mock';

describe('GestureController', () => {
  it('should detect open hand', () => {
    const controller = new GestureController({
      enabledGestures: [GestureType.OPEN_HAND],
      minConfidence: 0.7
    });
    
    const frame = createMockHandFrame({
      fingers: { all: 'extended' }
    });
    
    const state = controller.process(frame);
    
    expect(state.hands[0].gesture.type).toBe(GestureType.OPEN_HAND);
    expect(state.hands[0].gesture.confidence).toBeGreaterThan(0.7);
  });
  
  it('should detect closed fist', () => {
    const frame = createMockHandFrame({
      fingers: { all: 'closed' }
    });
    
    const state = controller.process(frame);
    
    expect(state.hands[0].gesture.type).toBe(GestureType.CLOSED_FIST);
  });
});
```

## Best Practices

1. **Keep controllers pure**: Same input → same output
2. **Minimize state**: Only store what's needed for calculations
3. **Use composition**: Combine simple controllers instead of building complex ones
4. **Test thoroughly**: Controllers are easy to unit test
5. **Document thresholds**: Explain why specific values were chosen
