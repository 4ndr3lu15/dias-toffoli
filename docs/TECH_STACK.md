# Dias-Toffoli: Technology Stack

## Overview

This document outlines the technology choices for Dias-Toffoli and the rationale behind each decision.

## Primary Language: TypeScript

### Why TypeScript over Python?

| Aspect | TypeScript | Python |
|--------|------------|--------|
| **Runtime Environment** | Browser-native | Requires backend server |
| **Type Safety** | Compile-time types | Runtime only (with mypy) |
| **Real-time Audio** | Web Audio API (low latency) | Complex setup (PyAudio, etc.) |
| **Deployment** | Static files, CDN-ready | Server infrastructure needed |
| **MediaPipe Support** | First-class browser support | Works but needs OpenCV |
| **Market Demand** | #1 for web development | Strong for ML/backend |
| **AI Tooling** | Excellent Copilot support | Excellent Copilot support |

### TypeScript Benefits for This Project

1. **Single Language**: Frontend + logic in one language
2. **Type Safety**: Interfaces ensure module contracts
3. **Tooling**: Excellent IDE support, refactoring, autocomplete
4. **Performance**: V8 engine is highly optimized
5. **Ecosystem**: npm has everything we need

## Core Dependencies

### Runtime Dependencies

```json
{
  "dependencies": {
    "@mediapipe/hands": "^0.4.x",       // Hand tracking ML model
    "@mediapipe/camera_utils": "^0.3.x", // Camera access utilities
    "@mediapipe/drawing_utils": "^0.3.x", // Landmark visualization
    "rxjs": "^7.8.x",                    // Reactive streams
    "tone": "^14.x"                       // Web Audio synthesis library
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.x",          // Language compiler
    "vite": "^5.x",                // Build tool and dev server
    "vitest": "^1.x",              // Testing framework
    "@types/node": "^20.x",        // Node.js types
    "eslint": "^8.x",              // Code linting
    "prettier": "^3.x"             // Code formatting
  }
}
```

## Technology Deep Dive

### 1. MediaPipe Hands

**Purpose**: Real-time hand landmark detection from webcam

**Why MediaPipe?**
- Google-maintained, production-ready
- Runs entirely in browser (WASM + WebGL)
- 21 landmarks per hand at 30+ FPS
- No server required

**Output**: 21 3D landmarks (x, y, z) normalized to [0, 1]

```
MediaPipe Hand Landmarks:
   4   8  12  16  20    ← Fingertips
   |   |   |   |   |
   3   7  11  15  19
   |   |   |   |   |
   2   6  10  14  18
   |   |   |   |   |
   1   5   9  13  17
    \ /   |   |   /
     0 ───┴───┴──┘       ← Wrist
```

### 2. RxJS (Reactive Extensions)

**Purpose**: Stream-based data flow between modules

**Why RxJS?**
- Industry standard for reactive programming
- Built-in operators for throttling, mapping, combining
- Automatic subscription cleanup
- TypeScript-first design

**Key Patterns Used**:
```typescript
// Throttle hand tracking to 30 FPS
handTracker.hands$.pipe(
  throttleTime(33),
  map(frame => controller.process(frame)),
  share()
)

// Combine multiple controllers
combineLatest([position$, gesture$, velocity$]).pipe(
  map(([pos, gest, vel]) => mergeControlStates(pos, gest, vel))
)
```

### 3. Tone.js

**Purpose**: Audio synthesis and music generation

**Why Tone.js?**
- High-level wrapper around Web Audio API
- Built-in synthesizers, effects, scheduling
- Handles browser audio context quirks
- Musical abstractions (notes, scales, BPM)

**Features Used**:
- `Synth` / `PolySynth` for sound generation
- `Transport` for timing/scheduling
- `Scale` for note quantization
- `Filter` / `Reverb` for effects

### 4. Vite

**Purpose**: Development server and build tool

**Why Vite?**
- Lightning-fast hot module replacement (HMR)
- Native ES modules in development
- Optimized production builds
- Built-in TypeScript support
- Simple configuration

### 5. Canvas / WebGL

**Purpose**: Visual output rendering

**Options**:
- **2D Canvas**: Simple particles, shapes, basic effects
- **WebGL**: High-performance particle systems (10k+ particles)
- **Three.js**: 3D visualizations (optional future feature)

## Browser APIs Used

### Media Devices API
```typescript
// Access webcam
navigator.mediaDevices.getUserMedia({ video: true })
```

### Web Audio API
```typescript
// Create audio context (via Tone.js)
const synth = new Tone.Synth().toDestination();
synth.triggerAttackRelease("C4", "8n");
```

### Canvas API
```typescript
// 2D rendering
const ctx = canvas.getContext('2d');
ctx.fillRect(x, y, width, height);
```

### Performance API
```typescript
// Frame timing
performance.now()
requestAnimationFrame(callback)
```

## Containerization

### Docker
- **Base Image**: `node:20-alpine` (small footprint)
- **Build**: Multi-stage build (build → nginx serve)
- **Serve**: `nginx:alpine` for static files
- **Port**: 80 (configurable)

### Why Container?
- Consistent environment across machines
- One-command deployment: `docker run -p 8080:80 dias-toffoli`
- Easy CI/CD integration
- No Node.js required on host machine

## Browser Compatibility

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| MediaPipe WASM | ✅ 88+ | ✅ 89+ | ✅ 88+ | ⚠️ 15+ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |
| ES Modules | ✅ | ✅ | ✅ | ✅ |
| getUserMedia | ✅ | ✅ | ✅ | ✅ |

**Note**: Safari has limited MediaPipe support. Chrome/Edge recommended.

## Development Environment

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "GitHub.copilot"
  ]
}
```

### Node.js Version
- **Minimum**: Node.js 18.x LTS
- **Recommended**: Node.js 20.x LTS

## Security Considerations

1. **Camera Access**: Requires HTTPS in production (except localhost)
2. **No Server-Side**: All processing client-side, no data transmitted
3. **CSP Headers**: Configure for MediaPipe WASM loading
4. **Permissions API**: Graceful handling of camera denial

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Hand Tracking FPS | 30+ | Throttled to save CPU |
| Audio Latency | < 20ms | Web Audio lookahead |
| Visual FPS | 60 | RequestAnimationFrame |
| Memory Usage | < 200MB | With ML model loaded |
| Time to Interactive | < 3s | On decent connection |

## Future Considerations

### Potential Additions
- **WebGPU**: For more complex visualizations
- **WebMIDI**: Connect to hardware synthesizers
- **WebRTC**: Multi-user jamming sessions
- **PWA**: Offline capability

### Scalability Path
1. Current: Single-page application
2. Future: Component library for embedding
3. Advanced: Full DAW-like environment
