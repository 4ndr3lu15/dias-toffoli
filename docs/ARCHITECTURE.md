# Dias-Toffoli: System Architecture

## Overview

The system follows a **Pipeline Architecture** where data flows through discrete processing stages. Each stage is independent and communicates only through well-defined interfaces.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │   Camera    │────▶│ HandTracker  │────▶│  Controller  │                 │
│  │   Input     │     │   Module     │     │   Layer      │                 │
│  └─────────────┘     └──────────────┘     └──────┬───────┘                 │
│                                                   │                         │
│                                                   ▼                         │
│                            ┌─────────────────────────────────────┐         │
│                            │        Control State Stream          │         │
│                            └───────────────┬─────────────────────┘         │
│                                            │                                │
│                       ┌────────────────────┼────────────────────┐          │
│                       ▼                    ▼                    ▼          │
│               ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│               │    Music     │    │   Visual     │    │    Other     │    │
│               │  Generator   │    │  Generator   │    │  Generator   │    │
│               └──────────────┘    └──────────────┘    └──────────────┘    │
│                       │                    │                    │          │
│                       ▼                    ▼                    ▼          │
│               ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│               │  Web Audio   │    │    Canvas    │    │    Custom    │    │
│               │     API      │    │    /WebGL    │    │    Output    │    │
│               └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. **Strict Interface Contracts**
Every module defines explicit TypeScript interfaces for its inputs and outputs. This ensures:
- Type safety at compile time
- Clear documentation of data shapes
- Easy testing with mock data

### 2. **Observable Streams (RxJS)**
All inter-module communication uses RxJS Observables for:
- Real-time data streaming
- Automatic resource cleanup
- Composable data transformations
- Backpressure handling

### 3. **Dependency Injection**
Modules receive their dependencies through constructor injection:
- Easy to swap implementations
- Testable in isolation
- Clear dependency graphs

### 4. **Single Responsibility**
Each module does exactly one thing:
- `HandTracker`: Image → Hand Points
- `Controller`: Hand Points → Control State
- `Generator`: Control State → Output

## Module Contracts

### HandTracker Interface
```typescript
interface IHandTracker {
  // Initialize the tracker with camera stream
  initialize(videoElement: HTMLVideoElement): Promise<void>;
  
  // Observable stream of hand data
  hands$: Observable<HandFrame>;
  
  // Cleanup resources
  dispose(): void;
}
```

### Controller Interface
```typescript
interface IController {
  // Process hand data and emit control state
  process(handFrame: HandFrame): ControlState;
  
  // Observable stream of control states
  state$: Observable<ControlState>;
  
  // Cleanup resources
  dispose(): void;
}
```

### Generator Interface
```typescript
interface IGenerator {
  // Subscribe to control state stream
  connect(state$: Observable<ControlState>): void;
  
  // Start/stop generation
  start(): void;
  stop(): void;
  
  // Cleanup resources
  dispose(): void;
}
```

## Module Communication Flow

```
Time ─────────────────────────────────────────────────────────────▶

Camera Frame    [F1]─────[F2]─────[F3]─────[F4]─────[F5]────▶
                  │        │        │        │        │
                  ▼        ▼        ▼        ▼        ▼
HandTracker     [H1]─────[H2]─────[H3]─────[H4]─────[H5]────▶
(HandFrame)       │        │        │        │        │
                  ▼        ▼        ▼        ▼        ▼
Controller      [C1]─────[C2]─────[C3]─────[C4]─────[C5]────▶
(ControlState)    │        │        │        │        │
              ┌───┴───┐┌───┴───┐┌───┴───┐┌───┴───┐┌───┴───┐
              ▼       ▼▼       ▼▼       ▼▼       ▼▼       ▼
MusicGen    [M1]    [M2]    [M3]    [M4]    [M5]
VisualGen   [V1]    [V2]    [V3]    [V4]    [V5]
```

## Folder Structure

```
dias-toffoli/
├── docs/                          # Documentation (you are here)
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DATA_FLOW.md
│   ├── COPILOT_INSTRUCTIONS.md
│   ├── DEPLOYMENT.md
│   └── MODULES/
│       ├── HAND_TRACKER.md
│       ├── CONTROLLERS.md
│       └── GENERATORS.md
│
├── src/
│   ├── index.html                 # Entry point
│   ├── main.ts                    # Application bootstrap
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── hand.types.ts          # Hand landmark types
│   │   ├── control.types.ts       # Control state types
│   │   └── generator.types.ts     # Generator output types
│   │
│   ├── core/                      # Core modules
│   │   ├── HandTracker.ts         # MediaPipe hand tracking
│   │   └── EventBus.ts            # Central event system
│   │
│   ├── controllers/               # Control state generators
│   │   ├── IController.ts         # Controller interface
│   │   ├── PositionController.ts  # Simple position mapping
│   │   ├── GestureController.ts   # Gesture recognition
│   │   └── VelocityController.ts  # Movement velocity
│   │
│   ├── generators/                # Output generators
│   │   ├── IGenerator.ts          # Generator interface
│   │   ├── audio/
│   │   │   ├── SynthGenerator.ts  # Web Audio synthesis
│   │   │   ├── MusicalScale.ts    # Note quantization
│   │   │   └── HarmonicSynth.ts   # Harmonic series
│   │   └── visual/
│   │       ├── ParticleGenerator.ts
│   │       └── WaveformVisualizer.ts
│   │
│   ├── ui/                        # User interface components
│   │   ├── ControlPanel.ts
│   │   ├── CameraPreview.ts
│   │   └── DebugOverlay.ts
│   │
│   └── utils/                     # Utilities
│       ├── math.ts
│       └── smoothing.ts
│
├── public/                        # Static assets
│   └── styles.css
│
├── tests/                         # Test files
│   ├── mocks/                     # Mock data
│   │   ├── handFrames.mock.ts
│   │   └── controlStates.mock.ts
│   ├── HandTracker.test.ts
│   ├── controllers/
│   └── generators/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── package.json
├── tsconfig.json
├── vite.config.ts                 # Build configuration
└── README.md
```

## State Management

The application uses a simple reactive state pattern:

```typescript
// Central state observable
interface AppState {
  isTracking: boolean;
  hands: HandFrame | null;
  controlState: ControlState | null;
  audioEnabled: boolean;
  visualEnabled: boolean;
  currentScale: MusicalScale;
}

// State is managed via RxJS BehaviorSubject
const state$ = new BehaviorSubject<AppState>(initialState);
```

## Error Handling Strategy

1. **Module-Level**: Each module handles its own errors and emits error states
2. **Stream-Level**: RxJS catchError operators prevent stream termination
3. **UI-Level**: Error boundary shows user-friendly messages
4. **Logging**: All errors logged to console with context

## Performance Considerations

1. **Frame Throttling**: Hand tracking runs at 30 FPS max to save CPU
2. **Worker Threads**: Heavy computation offloaded to Web Workers when possible
3. **Canvas Optimization**: Use `willReadFrequently` hint for 2D canvas
4. **Audio Scheduling**: Web Audio uses lookahead scheduling for glitch-free output
5. **Memory Management**: Proper cleanup of streams and subscriptions

## Extension Points

The architecture supports easy extension:

1. **New Controllers**: Implement `IController` interface
2. **New Generators**: Implement `IGenerator` interface
3. **New Hand Models**: Swap MediaPipe for other tracking solutions
4. **New Output Targets**: MIDI, OSC, WebSocket, etc.
