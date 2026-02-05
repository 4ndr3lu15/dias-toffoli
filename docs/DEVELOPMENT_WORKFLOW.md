# Development Workflow

## Prerequisites

- **Node.js**: 20.x LTS (recommend using `nvm` or `fnm`)
- **bun**: Package manager & runtime (https://bun.sh)
- **VS Code**: With recommended extensions
- **Webcam**: For testing hand tracking
- **Modern Browser**: Chrome or Edge recommended

## Initial Setup

```powershell
# Clone repository
git clone https://github.com/yourorg/dias-toffoli.git
cd dias-toffoli

# Install dependencies
bun install

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`

## Development Commands

```powershell
# Development server with hot reload
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint
bun run lint:fix

# Formatting
bun run format

# Run tests
bun test
bun test --watch
bun test --coverage

# Build for production
bun run build

# Preview production build
bun run preview

# Run all checks (before commit)
bun run check-all
```

## Project Scripts (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src/**/*.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "check-all": "bun run type-check && bun run lint && bun test"
  }
}
```

## Development Phases

### Phase 1: Core Infrastructure (Week 1)

**Tasks:**
1. [ ] Project setup (Vite, TypeScript, ESLint, Prettier)
2. [ ] Type definitions (`src/types/`)
3. [ ] HandTracker module with MediaPipe
4. [ ] Basic UI (video preview, debug overlay)
5. [ ] Unit tests for HandTracker

**Deliverable:** Hand landmarks visible in debug overlay

### Phase 2: Controllers (Week 2)

**Tasks:**
1. [ ] IController interface
2. [ ] PositionController
3. [ ] GestureController (basic gestures)
4. [ ] VelocityController
5. [ ] CompositeController
6. [ ] Unit tests for all controllers

**Deliverable:** ControlState logged to console with all fields

### Phase 3: Audio Generation (Week 3)

**Tasks:**
1. [ ] IGenerator interface
2. [ ] SynthGenerator with Tone.js
3. [ ] MusicalScale utility
4. [ ] HarmonicGenerator
5. [ ] Audio enable/disable controls
6. [ ] Tests with mocked audio context

**Deliverable:** Sound responds to hand position

### Phase 4: Visual Generation (Week 4)

**Tasks:**
1. [ ] ParticleGenerator (Canvas 2D first)
2. [ ] TrailGenerator
3. [ ] WaveformVisualizer
4. [ ] Performance optimization
5. [ ] WebGL particle system (optional)

**Deliverable:** Full audio-visual experience

### Phase 5: Polish & Docker (Week 5)

**Tasks:**
1. [ ] UI polish (control panel, settings)
2. [ ] Error handling & edge cases
3. [ ] Dockerfile and docker-compose
4. [ ] Documentation review
5. [ ] Cross-browser testing
6. [ ] Performance profiling

**Deliverable:** Production-ready containerized app

## Git Workflow

### Branch Naming

```
feature/hand-tracker
feature/gesture-controller
fix/audio-latency
chore/update-deps
docs/api-reference
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tracker): add multi-hand support
fix(audio): reduce latency in SynthGenerator
docs: update ARCHITECTURE.md with new diagrams
test(controllers): add GestureController tests
chore: upgrade to Tone.js 15
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run `bun run check-all`
4. Push and create PR
5. Wait for CI checks
6. Request review
7. Squash merge to `main`

## Working with AI Assistants

### Starting a Session

Begin by asking the AI to read the documentation:

```
Please read the docs folder to understand the project:
- docs/PROJECT_OVERVIEW.md
- docs/ARCHITECTURE.md  
- docs/DATA_FLOW.md
- docs/COPILOT_INSTRUCTIONS.md
```

### Requesting Features

Be specific about which module and interface:

```
I need a new Controller that detects "conducting" gestures.
It should implement IController from src/controllers/IController.ts
and output tempo/beat information in the custom field of ControlState.
```

### Requesting Bug Fixes

Provide context:

```
The GestureController is detecting OPEN_HAND when the hand is closed.
The issue is in src/controllers/GestureController.ts in the detectGesture function.
I think the finger extension check threshold is too low.
```

### Requesting Refactoring

Reference the architecture:

```
Please refactor SynthGenerator to use dependency injection
for the AudioContext, following the pattern in COPILOT_INSTRUCTIONS.md.
```

## Testing Strategy

### Unit Tests

Test individual functions and classes in isolation:

```typescript
// tests/controllers/PositionController.test.ts
describe('PositionController', () => {
  it('should normalize position to [0, 1]', () => {
    // ...
  });
});
```

### Integration Tests

Test module interactions:

```typescript
// tests/integration/pipeline.test.ts
describe('HandTracker → Controller → Generator pipeline', () => {
  it('should process frame through entire pipeline', () => {
    // ...
  });
});
```

### Manual Testing Checklist

Before merging to main:

- [ ] Hand tracking works with 1 hand
- [ ] Hand tracking works with 2 hands
- [ ] Audio starts/stops cleanly
- [ ] No audio glitches during movement
- [ ] Particles respond to hand position
- [ ] Gestures trigger expected actions
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] No console errors
- [ ] No memory leaks (check DevTools)

## Debugging Tips

### Hand Tracking Issues

```typescript
// Add debug overlay
tracker.hands$.subscribe(frame => {
  console.log('Hands:', frame.handCount);
  frame.hands.forEach(hand => {
    console.log(`  ${hand.handedness}: confidence=${hand.confidence}`);
  });
});
```

### Audio Issues

```typescript
// Check audio context state
console.log('Audio state:', Tone.context.state);

// Resume if suspended
if (Tone.context.state === 'suspended') {
  await Tone.context.resume();
}
```

### Performance Profiling

```typescript
// Frame timing
const start = performance.now();
const result = processFrame(frame);
const elapsed = performance.now() - start;
console.log(`Frame processed in ${elapsed.toFixed(2)}ms`);
```

## IDE Setup

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "GitHub.copilot",
    "GitHub.copilot-chat",
    "vitest.explorer"
  ]
}
```

## Troubleshooting

### "Camera access denied"

- Check browser permissions
- Ensure HTTPS or localhost
- Try different browser

### "Audio context not started"

- User interaction required to start audio
- Add a "Start" button that calls `Tone.start()`

### "MediaPipe not loading"

- Check network (CDN access)
- Verify CORS headers in dev server
- Check browser console for specific errors

### "Types not found"

- Run `bun run type-check` for details
- Check import paths
- Ensure `tsconfig.json` paths are correct

## Resources

- [MediaPipe Hands Documentation](https://google.github.io/mediapipe/solutions/hands)
- [Tone.js Documentation](https://tonejs.github.io/)
- [RxJS Documentation](https://rxjs.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
