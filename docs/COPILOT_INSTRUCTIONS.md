# Copilot Instructions for Dias-Toffoli

> These instructions guide AI coding assistants (GitHub Copilot, Claude, etc.) when working on this project.

## Project Context

**Dias-Toffoli** is a web-based hand gesture controller for real-time audio-visual generation. Read the documentation files in order:

1. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - What we're building
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
3. [TECH_STACK.md](./TECH_STACK.md) - Technologies used
4. [DATA_FLOW.md](./DATA_FLOW.md) - Type definitions (CRITICAL)
5. [MODULES/](./MODULES/) - Module specifications

## Core Principles

### 1. Type Safety First

```typescript
// ✅ CORRECT: Always use explicit types
function processHand(frame: HandFrame): ControlState {
  // ...
}

// ❌ WRONG: Never use `any`
function processHand(frame: any): any {
  // ...
}
```

### 2. Interface-Driven Development

Every module MUST implement its corresponding interface:

```typescript
// ✅ CORRECT: Implement the interface
class MyController implements IController {
  process(frame: HandFrame): ControlState { /* ... */ }
  state$: Observable<ControlState>;
  // ... all interface methods
}

// ❌ WRONG: Partial implementation
class MyController {
  process(frame) { /* ... */ }  // Missing types and interface
}
```

### 3. RxJS Streams for Data Flow

```typescript
// ✅ CORRECT: Use observables for async data
class HandTracker {
  readonly hands$: Observable<HandFrame>;
}

// ❌ WRONG: Callbacks or polling
class HandTracker {
  onFrame(callback: (frame) => void) { /* ... */ }
}
```

### 4. Dependency Injection

```typescript
// ✅ CORRECT: Inject dependencies
class SynthGenerator {
  constructor(
    private config: SynthConfig,
    private audioContext: AudioContext
  ) {}
}

// ❌ WRONG: Hardcoded dependencies
class SynthGenerator {
  private audioContext = new AudioContext();  // Not injectable
}
```

## File Organization Rules

### Creating New Files

1. **Types** → `src/types/[domain].types.ts`
2. **Interfaces** → `src/[module]/I[Name].ts`
3. **Implementations** → `src/[module]/[Name].ts`
4. **Tests** → `tests/[module]/[Name].test.ts`

### Module Structure

```
src/controllers/
├── IController.ts         # Interface (always first)
├── PositionController.ts  # Implementation
├── GestureController.ts   # Implementation
├── index.ts               # Barrel export
└── utils/                 # Internal utilities
    └── fingerAnalysis.ts
```

## Coding Standards

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Interfaces | `I` prefix | `IController`, `IGenerator` |
| Types | PascalCase | `HandFrame`, `ControlState` |
| Enums | PascalCase | `GestureType`, `HandLandmark` |
| Classes | PascalCase | `HandTracker`, `SynthGenerator` |
| Functions | camelCase | `processFrame`, `calculateVelocity` |
| Constants | SCREAMING_SNAKE | `MAX_HANDS`, `TARGET_FPS` |
| Files | PascalCase for classes | `HandTracker.ts` |
| Files | kebab-case for utils | `finger-analysis.ts` |

### Import Order

```typescript
// 1. External libraries
import { Observable, Subject } from 'rxjs';
import { Hands } from '@mediapipe/hands';

// 2. Internal types
import type { HandFrame, ControlState } from '../types';

// 3. Internal modules
import { smoothPosition } from '../utils/smoothing';

// 4. Relative imports
import { DEFAULT_CONFIG } from './config';
```

### Documentation Requirements

```typescript
/**
 * Brief description of what this does.
 * 
 * @example
 * ```typescript
 * const tracker = new HandTracker(config);
 * await tracker.initialize(videoElement);
 * tracker.hands$.subscribe(console.log);
 * ```
 */
class HandTracker implements IHandTracker {
  /**
   * Process a video frame and emit hand landmarks
   * @param frame - The video frame to process
   * @returns Observable of hand tracking results
   */
  processFrame(frame: ImageFrame): Observable<HandFrame> {
    // ...
  }
}
```

## Common Tasks

### Adding a New Controller

1. Create interface extension if needed in `IController.ts`
2. Create implementation in `src/controllers/[Name]Controller.ts`
3. Add configuration interface
4. Implement all `IController` methods
5. Add tests in `tests/controllers/[Name]Controller.test.ts`
6. Export from `src/controllers/index.ts`

```typescript
// src/controllers/MyController.ts
import type { IController } from './IController';
import type { HandFrame, ControlState } from '../types';
import { Observable, Subject } from 'rxjs';

interface MyControllerConfig {
  threshold: number;
  smoothing: number;
}

export class MyController implements IController {
  private subject = new Subject<ControlState>();
  
  constructor(private config: MyControllerConfig) {}
  
  readonly state$ = this.subject.asObservable();
  
  process(frame: HandFrame): ControlState {
    const state = this.calculateState(frame);
    this.subject.next(state);
    return state;
  }
  
  // ... rest of IController implementation
}
```

### Adding a New Generator

1. Create in `src/generators/[type]/[Name]Generator.ts`
2. Implement `IGenerator` interface
3. Handle audio context or canvas setup in `start()`
4. Clean up in `dispose()`
5. Add tests

### Modifying Types

1. **NEVER** modify existing type shapes that are already in use
2. **ADD** new optional properties if extending
3. **CREATE** new types for new concepts
4. **UPDATE** the `DATA_FLOW.md` documentation

```typescript
// ✅ CORRECT: Extend with optional property
interface ControlState {
  // existing properties...
  
  /** New feature (optional for backward compatibility) */
  newFeature?: NewFeatureData;
}

// ❌ WRONG: Change existing property type
interface ControlState {
  timestamp: string;  // Was number, breaking change!
}
```

## Error Handling Patterns

```typescript
// In streams - use catchError
hands$.pipe(
  map(frame => processFrame(frame)),
  catchError(error => {
    console.error('Processing error:', error);
    return of(createEmptyFrame());  // Recover with empty frame
  })
)

// In async functions - use try/catch with proper types
async function initialize(): Promise<Result<void, InitError>> {
  try {
    await setup();
    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, error: classifyError(error) };
  }
}
```

## Testing Guidelines

```typescript
// Use Vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('PositionController', () => {
  let controller: PositionController;
  
  beforeEach(() => {
    controller = new PositionController(defaultConfig);
  });
  
  it('should extract position from hand frame', () => {
    const frame = createMockHandFrame({ x: 0.5, y: 0.5 });
    const state = controller.process(frame);
    
    expect(state.primaryHand?.position).toEqual({ x: 0.5, y: 0.5 });
  });
  
  it('should handle missing hands gracefully', () => {
    const frame = createMockHandFrame({ hands: [] });
    const state = controller.process(frame);
    
    expect(state.hasActiveHand).toBe(false);
    expect(state.primaryHand).toBeNull();
  });
});
```

## Performance Considerations

1. **Throttle hand tracking** to 30 FPS max
2. **Use `share()` operator** for multicast streams
3. **Avoid creating objects in loops** - reuse buffers
4. **Use `requestAnimationFrame`** for visual updates
5. **Profile before optimizing** - don't guess

## DO NOT

1. ❌ Use `any` type
2. ❌ Skip interface implementations
3. ❌ Create circular dependencies
4. ❌ Modify shared state directly (use streams)
5. ❌ Hardcode configuration values
6. ❌ Skip error handling
7. ❌ Write tests without assertions
8. ❌ Commit without running `npm run lint`

## AI Assistant Checklist

Before providing code, verify:

- [ ] Types are explicit (no `any`)
- [ ] Interfaces are implemented completely
- [ ] Imports are from correct paths
- [ ] Error handling is present
- [ ] Code follows naming conventions
- [ ] Documentation comments are included
- [ ] Tests are suggested if creating new functionality

## Quick Reference

```typescript
// Get hand position
const pos = state.primaryHand?.position;

// Check for gesture
if (state.primaryHand?.gesture.type === GestureType.CLOSED_FIST) {
  // Handle fist
}

// Map position to frequency (C3 to C6)
const freq = 130.81 * Math.pow(1046.50 / 130.81, position.x);

// Emit to stream
this.subject.next(newState);

// Subscribe to stream
this.subscription = stream$.subscribe({
  next: (value) => this.process(value),
  error: (err) => console.error(err),
  complete: () => this.cleanup()
});

// Cleanup on dispose
dispose(): void {
  this.subscription?.unsubscribe();
  this.subject.complete();
}
```
