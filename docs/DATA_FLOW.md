# Dias-Toffoli: Data Flow & Type Definitions

## Overview

This document defines all data types used in the system. These types form the **contracts** between modules. Every module must respect these interfaces exactly.

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                        │
└───────────────────────────────────────────────────────────────────────────────┘

          INPUT                    PROCESSING                    OUTPUT
    ┌─────────────────┐      ┌─────────────────┐       ┌─────────────────────┐
    │                 │      │                 │       │                     │
    │  ImageFrame     │      │   HandFrame     │       │  MusicOutput        │
    │  ───────────    │─────▶│   ─────────     │──────▶│  ────────────       │
    │  • width        │      │   • hands[]     │       │  • frequency        │
    │  • height       │      │   • timestamp   │       │  • amplitude        │
    │  • data[]       │      │   • confidence  │       │  • waveform         │
    │  • timestamp    │      │                 │       │                     │
    │                 │      │                 │       └─────────────────────┘
    └─────────────────┘      │        │        │
                             │        ▼        │       ┌─────────────────────┐
                             │ ┌─────────────┐ │       │                     │
                             │ │ControlState │ │       │  VisualOutput       │
                             │ │ ─────────── │─│──────▶│  ─────────────      │
                             │ │ • position  │ │       │  • particles[]      │
                             │ │ • gestures  │ │       │  • color            │
                             │ │ • velocity  │ │       │  • intensity        │
                             │ │ • custom    │ │       │                     │
                             │ └─────────────┘ │       └─────────────────────┘
                             │                 │
                             └─────────────────┘
```

## Type Definitions

### 1. Image Input Types

```typescript
// types/image.types.ts

/**
 * Raw image frame from camera
 * This is what the HandTracker receives
 */
interface ImageFrame {
  /** Frame width in pixels */
  width: number;
  
  /** Frame height in pixels */
  height: number;
  
  /** Raw pixel data as ImageData or HTMLVideoElement reference */
  source: HTMLVideoElement | ImageData;
  
  /** Unix timestamp when frame was captured (ms) */
  timestamp: number;
}
```

### 2. Hand Tracking Types

```typescript
// types/hand.types.ts

/**
 * A single 3D point in normalized coordinates
 * All values are in range [0, 1]
 */
interface Point3D {
  /** X coordinate (0 = left edge, 1 = right edge) */
  x: number;
  
  /** Y coordinate (0 = top edge, 1 = bottom edge) */
  y: number;
  
  /** Z coordinate (depth, 0 = camera plane, negative = towards camera) */
  z: number;
}

/**
 * MediaPipe landmark indices
 */
enum HandLandmark {
  WRIST = 0,
  THUMB_CMC = 1,
  THUMB_MCP = 2,
  THUMB_IP = 3,
  THUMB_TIP = 4,
  INDEX_FINGER_MCP = 5,
  INDEX_FINGER_PIP = 6,
  INDEX_FINGER_DIP = 7,
  INDEX_FINGER_TIP = 8,
  MIDDLE_FINGER_MCP = 9,
  MIDDLE_FINGER_PIP = 10,
  MIDDLE_FINGER_DIP = 11,
  MIDDLE_FINGER_TIP = 12,
  RING_FINGER_MCP = 13,
  RING_FINGER_PIP = 14,
  RING_FINGER_DIP = 15,
  RING_FINGER_TIP = 16,
  PINKY_MCP = 17,
  PINKY_PIP = 18,
  PINKY_DIP = 19,
  PINKY_TIP = 20,
}

/**
 * Complete set of landmarks for one hand
 * Always exactly 21 points
 */
type HandLandmarks = [
  Point3D, Point3D, Point3D, Point3D, Point3D,  // Wrist + Thumb (0-4)
  Point3D, Point3D, Point3D, Point3D,            // Index (5-8)
  Point3D, Point3D, Point3D, Point3D,            // Middle (9-12)
  Point3D, Point3D, Point3D, Point3D,            // Ring (13-16)
  Point3D, Point3D, Point3D, Point3D,            // Pinky (17-20)
];

/**
 * Handedness classification
 */
type Handedness = 'Left' | 'Right';

/**
 * Data for a single detected hand
 */
interface HandData {
  /** Unique identifier for this hand (0 or 1) */
  id: number;
  
  /** Which hand (Left or Right) */
  handedness: Handedness;
  
  /** All 21 landmark points */
  landmarks: HandLandmarks;
  
  /** Detection confidence score [0, 1] */
  confidence: number;
}

/**
 * Complete hand tracking frame output
 * This is what HandTracker emits
 */
interface HandFrame {
  /** Array of detected hands (0-2 hands) */
  hands: HandData[];
  
  /** Number of hands detected */
  handCount: number;
  
  /** Frame timestamp (ms since epoch) */
  timestamp: number;
  
  /** Processing time for this frame (ms) */
  processingTime: number;
}
```

### 3. Control State Types

```typescript
// types/control.types.ts

/**
 * Normalized 2D position [0, 1]
 */
interface Position2D {
  x: number;  // 0 = left, 1 = right
  y: number;  // 0 = top, 1 = bottom
}

/**
 * Velocity vector (units per second)
 */
interface Velocity2D {
  vx: number;  // Horizontal velocity
  vy: number;  // Vertical velocity
  magnitude: number;  // Total speed
}

/**
 * Recognized gesture types
 */
enum GestureType {
  NONE = 'none',
  OPEN_HAND = 'open_hand',
  CLOSED_FIST = 'closed_fist',
  POINTING = 'pointing',
  THUMBS_UP = 'thumbs_up',
  PEACE = 'peace',
  PINCH = 'pinch',
}

/**
 * Gesture detection result
 */
interface GestureState {
  /** Primary detected gesture */
  type: GestureType;
  
  /** Confidence of gesture detection [0, 1] */
  confidence: number;
  
  /** How long gesture has been held (ms) */
  duration: number;
}

/**
 * Finger extension states
 */
interface FingerStates {
  thumb: boolean;   // true = extended
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  
  /** Number of extended fingers (0-5) */
  extendedCount: number;
}

/**
 * Hand openness measurement
 */
interface HandOpenness {
  /** Overall openness [0, 1] where 0 = closed fist, 1 = fully open */
  value: number;
  
  /** Rate of change (positive = opening, negative = closing) */
  derivative: number;
}

/**
 * Control state for a single hand
 */
interface SingleHandControlState {
  /** Hand identifier */
  handId: number;
  
  /** Is this hand currently tracked? */
  isTracked: boolean;
  
  /** Palm center position */
  position: Position2D;
  
  /** Index fingertip position */
  fingertipPosition: Position2D;
  
  /** Movement velocity */
  velocity: Velocity2D;
  
  /** Detected gesture */
  gesture: GestureState;
  
  /** Individual finger states */
  fingers: FingerStates;
  
  /** Hand openness metric */
  openness: HandOpenness;
  
  /** Distance from camera (depth) [0, 1] */
  depth: number;
  
  /** Hand rotation/orientation (radians) */
  rotation: number;
}

/**
 * Complete control state for all hands
 * This is the output of Controllers
 */
interface ControlState {
  /** Timestamp of this state */
  timestamp: number;
  
  /** Delta time since last state (ms) */
  deltaTime: number;
  
  /** Control states for each hand */
  hands: SingleHandControlState[];
  
  /** Is any hand currently tracked? */
  hasActiveHand: boolean;
  
  /** Primary hand (first detected) */
  primaryHand: SingleHandControlState | null;
  
  /** Secondary hand (if two hands detected) */
  secondaryHand: SingleHandControlState | null;
  
  /** Custom extension data (for custom controllers) */
  custom: Record<string, unknown>;
}
```

### 4. Generator Output Types

```typescript
// types/generator.types.ts

/**
 * Musical note representation
 */
interface MusicalNote {
  /** Note name (C, D, E, etc.) */
  name: string;
  
  /** Octave number (0-8) */
  octave: number;
  
  /** Frequency in Hz */
  frequency: number;
  
  /** MIDI note number (0-127) */
  midi: number;
}

/**
 * Audio generation parameters
 */
interface AudioParams {
  /** Base frequency in Hz */
  frequency: number;
  
  /** Amplitude [0, 1] */
  amplitude: number;
  
  /** Attack time (seconds) */
  attack: number;
  
  /** Release time (seconds) */
  release: number;
  
  /** Waveform type */
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  
  /** Harmonics amplitudes (for additive synthesis) */
  harmonics: number[];
  
  /** Filter cutoff frequency (Hz) */
  filterCutoff: number;
  
  /** Reverb wet/dry mix [0, 1] */
  reverb: number;
}

/**
 * Visual particle data
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // [0, 1] where 1 = just born
  hue: number;     // [0, 360] HSL hue
  size: number;
}

/**
 * Visual generation parameters
 */
interface VisualParams {
  /** Particle attractor position */
  attractorPosition: Position2D;
  
  /** Base color hue [0, 360] */
  hue: number;
  
  /** Color saturation [0, 1] */
  saturation: number;
  
  /** Brightness [0, 1] */
  brightness: number;
  
  /** Particle emission rate */
  emissionRate: number;
  
  /** Trail opacity [0, 1] */
  trailOpacity: number;
  
  /** Effect intensity [0, 1] */
  intensity: number;
}
```

### 5. Musical Scale Types

```typescript
// types/music.types.ts

/**
 * Available musical scales
 */
enum ScaleType {
  CHROMATIC = 'chromatic',
  MAJOR = 'major',
  MINOR = 'minor',
  PENTATONIC_MAJOR = 'pentatonic_major',
  PENTATONIC_MINOR = 'pentatonic_minor',
  BLUES = 'blues',
  HARMONIC_MINOR = 'harmonic_minor',
  DORIAN = 'dorian',
  MIXOLYDIAN = 'mixolydian',
}

/**
 * Scale definition
 */
interface Scale {
  /** Scale type identifier */
  type: ScaleType;
  
  /** Root note (C, D, E, etc.) */
  root: string;
  
  /** Octave range */
  octaveRange: { min: number; max: number };
  
  /** Semitone intervals from root */
  intervals: number[];
  
  /** Available MIDI notes in this scale */
  notes: number[];
}

/**
 * Musical configuration
 */
interface MusicConfig {
  /** Current scale */
  scale: Scale;
  
  /** Tempo in BPM */
  bpm: number;
  
  /** Master volume [0, 1] */
  masterVolume: number;
  
  /** Quantize to beat */
  quantize: boolean;
}
```

## Stream Type Aliases

```typescript
// types/streams.types.ts
import { Observable } from 'rxjs';

/** Stream of raw hand tracking frames */
type HandStream = Observable<HandFrame>;

/** Stream of processed control states */
type ControlStream = Observable<ControlState>;

/** Stream of audio parameters */
type AudioStream = Observable<AudioParams>;

/** Stream of visual parameters */
type VisualStream = Observable<VisualParams>;
```

## Type Guards

```typescript
// types/guards.ts

/** Check if hand is actively tracked */
function isHandTracked(hand: SingleHandControlState): boolean {
  return hand.isTracked && hand.position.x >= 0 && hand.position.y >= 0;
}

/** Check if gesture is detected with confidence */
function hasGesture(gesture: GestureState, minConfidence = 0.7): boolean {
  return gesture.type !== GestureType.NONE && gesture.confidence >= minConfidence;
}

/** Check if control state has any active hands */
function hasActiveHands(state: ControlState): boolean {
  return state.hasActiveHand && state.hands.length > 0;
}
```

## Constants

```typescript
// types/constants.ts

/** Number of landmarks per hand */
const LANDMARKS_PER_HAND = 21;

/** Maximum number of hands to track */
const MAX_HANDS = 2;

/** Target frame rate for hand tracking */
const TARGET_FPS = 30;

/** Frame interval in milliseconds */
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/** Default smoothing factor for position */
const DEFAULT_SMOOTHING = 0.3;

/** Minimum confidence for gesture detection */
const MIN_GESTURE_CONFIDENCE = 0.7;
```

## Example Data

### Sample HandFrame
```typescript
const sampleHandFrame: HandFrame = {
  hands: [{
    id: 0,
    handedness: 'Right',
    landmarks: [
      { x: 0.5, y: 0.8, z: 0.0 },   // Wrist
      { x: 0.45, y: 0.75, z: -0.01 }, // Thumb CMC
      // ... 19 more landmarks
    ] as HandLandmarks,
    confidence: 0.95
  }],
  handCount: 1,
  timestamp: 1706976000000,
  processingTime: 12.5
};
```

### Sample ControlState
```typescript
const sampleControlState: ControlState = {
  timestamp: 1706976000000,
  deltaTime: 33.33,
  hasActiveHand: true,
  hands: [{
    handId: 0,
    isTracked: true,
    position: { x: 0.5, y: 0.4 },
    fingertipPosition: { x: 0.55, y: 0.35 },
    velocity: { vx: 0.1, vy: -0.05, magnitude: 0.112 },
    gesture: { 
      type: GestureType.OPEN_HAND, 
      confidence: 0.92,
      duration: 500 
    },
    fingers: {
      thumb: true, index: true, middle: true, ring: true, pinky: true,
      extendedCount: 5
    },
    openness: { value: 0.85, derivative: 0.1 },
    depth: 0.5,
    rotation: 0.0
  }],
  primaryHand: /* reference to hands[0] */,
  secondaryHand: null,
  custom: {}
};
```
