# Dias-Toffoli 🎵✋

> A web-based hand gesture controller for real-time audio-visual generation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

## ✨ Features

- 👋 **Real-time Hand Tracking** - MediaPipe-powered gesture recognition
- 🎹 **Music Generation** - Create sounds with hand movements
- 🎨 **Visual Effects** - Particle systems that respond to your gestures
- 🔌 **Modular Architecture** - Swap components easily
- 🐳 **Docker Ready** - One command deployment
- 📱 **Web-Based** - Runs in any modern browser

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker compose up -d
# Open http://localhost:8080
```

### Local Development

```bash
# Prerequisites: Node.js 20+, pnpm
pnpm install
pnpm dev
# Open http://localhost:5173
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Project Overview](./docs/PROJECT_OVERVIEW.md) | What we're building |
| [Architecture](./docs/ARCHITECTURE.md) | System design |
| [Tech Stack](./docs/TECH_STACK.md) | Technology choices |
| [Data Flow](./docs/DATA_FLOW.md) | Type definitions |
| [Development](./docs/DEVELOPMENT_WORKFLOW.md) | How to contribute |
| [Deployment](./docs/DEPLOYMENT.md) | Docker & CI/CD |

### Module Specifications

| Module | Description |
|--------|-------------|
| [Hand Tracker](./docs/MODULES/HAND_TRACKER.md) | MediaPipe integration |
| [Controllers](./docs/MODULES/CONTROLLERS.md) | Gesture interpretation |
| [Generators](./docs/MODULES/GENERATORS.md) | Audio/visual output |

## 🎮 How It Works

```
Camera → HandTracker → Controllers → Generators → Audio/Visual Output
         (MediaPipe)   (Interpret)   (Create)
```

1. **HandTracker** captures video and extracts hand landmarks
2. **Controllers** interpret landmarks into control states (gestures, position, velocity)
3. **Generators** consume control states to produce audio or visuals

Each component is **replaceable** without affecting others.

## 🤖 AI-Assisted Development

This project is designed for AI-assisted development. See [COPILOT_INSTRUCTIONS.md](./docs/COPILOT_INSTRUCTIONS.md) for guidelines.

### Start a Session

```
Read the docs folder to understand the project:
- docs/PROJECT_OVERVIEW.md
- docs/ARCHITECTURE.md
- docs/DATA_FLOW.md
- docs/COPILOT_INSTRUCTIONS.md
```

## 🛠️ Project Structure

```
dias-toffoli/
├── docs/                  # Documentation (AI-readable)
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DATA_FLOW.md
│   ├── COPILOT_INSTRUCTIONS.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── DEPLOYMENT.md
│   └── MODULES/
├── src/                   # Source code
│   ├── types/             # TypeScript types
│   ├── core/              # HandTracker, EventBus
│   ├── controllers/       # Control state generators
│   ├── generators/        # Audio/visual output
│   ├── ui/                # User interface
│   └── utils/             # Utilities
├── tests/                 # Test files
├── docker/                # Docker configuration
└── package.json
```

## 📋 Requirements

- Modern browser (Chrome, Firefox, Edge)
- Webcam
- Audio output device

## 🤝 Contributing

1. Read [DEVELOPMENT_WORKFLOW.md](./docs/DEVELOPMENT_WORKFLOW.md)
2. Follow [COPILOT_INSTRUCTIONS.md](./docs/COPILOT_INSTRUCTIONS.md)
3. Create a feature branch
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Dias-Toffoli** - Transform hand gestures into music and art.
