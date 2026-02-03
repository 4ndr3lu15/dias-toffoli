# Dias-Toffoli: Project Overview

> A modular, web-based hand gesture controller for real-time audio-visual generation.

## 🎯 Vision

**Dias-Toffoli** is a creative coding platform that transforms hand movements captured via webcam into expressive audio-visual experiences. The system runs entirely in the browser, making it accessible, portable, and easy to deploy via Docker containers.

## 🌟 Core Concept

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Camera    │───▶│   Hand Tracker   │───▶│  Controllers     │───▶│   Generators    │
│   (Image)   │    │   (MediaPipe)    │    │  (State Machine) │    │ (Audio/Visual)  │
└─────────────┘    └──────────────────┘    └──────────────────┘    └─────────────────┘
       │                    │                       │                       │
       ▼                    ▼                       ▼                       ▼
  [ImageFrame]        [HandPoints]           [ControlState]          [Output]
```

The system is designed with **strict separation of concerns**:

1. **HandTracker**: Captures video frames and extracts hand landmark data
2. **Controllers**: Transform hand data into control states (gestures, positions, etc.)
3. **Generators**: Consume control states to produce audio or visual output

Each module communicates through **well-defined typed interfaces**, enabling:
- Easy replacement of any component
- Independent testing and development
- Creative experimentation with new controllers/generators

## 🎨 Use Cases

### Music Generation
- Move hand left/right → control pitch
- Move hand up/down → control volume
- Close/open hand → control timbre
- Multiple hands → polyphonic synthesis

### Visual Art Generation
- Hand position → particle attractor
- Hand velocity → color hue
- Gesture recognition → trigger visual effects

### Interactive Installations
- Combine multiple controllers and generators
- Create custom gesture vocabularies
- Design immersive audio-visual experiences

## 🎯 Design Goals

1. **Modularity**: Replace any component without breaking others
2. **Type Safety**: All interfaces have strict TypeScript types
3. **Real-time Streaming**: All data flows as observable streams
4. **Web-First**: Runs in any modern browser
5. **Containerized**: One command to deploy anywhere
6. **AI-Friendly**: Code is organized for easy AI-assisted development

## 📊 Key Metrics

- **Latency Target**: < 50ms from camera to output
- **Frame Rate**: 30+ FPS hand tracking
- **Audio Latency**: < 20ms using Web Audio API
- **Browser Support**: Chrome, Firefox, Edge (modern versions)

## 🔗 Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and module design
- [TECH_STACK.md](./TECH_STACK.md) - Technology choices and rationale
- [DATA_FLOW.md](./DATA_FLOW.md) - Data types and streaming interfaces
- [MODULES/](./MODULES/) - Detailed module specifications
- [COPILOT_INSTRUCTIONS.md](./COPILOT_INSTRUCTIONS.md) - AI coding assistant guidelines
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Docker and deployment instructions
