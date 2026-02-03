# GitHub Copilot Custom Instructions

This file configures GitHub Copilot behavior for the Dias-Toffoli project.

## Project Summary

Dias-Toffoli is a TypeScript web application that uses MediaPipe hand tracking to control real-time audio-visual generation. The architecture follows a pipeline pattern: HandTracker → Controllers → Generators.

## Code Style

- Use TypeScript with strict mode
- All functions and methods must have explicit type annotations
- Use interfaces prefixed with `I` for module contracts (e.g., `IController`)
- Use RxJS Observables for streaming data between modules
- Follow existing patterns in the codebase

## Documentation References

When working on this project, reference these files:
- `docs/DATA_FLOW.md` for type definitions
- `docs/ARCHITECTURE.md` for module design
- `docs/COPILOT_INSTRUCTIONS.md` for coding standards

## Type Safety Rules

1. Never use `any` - always use proper types or `unknown`
2. All interface methods must be implemented
3. Use discriminated unions for state types
4. Export types from `src/types/` barrel files

## Module Contracts

### IHandTracker
- Input: `HTMLVideoElement`
- Output: `Observable<HandFrame>`
- Must implement: `initialize()`, `start()`, `stop()`, `dispose()`

### IController  
- Input: `HandFrame`
- Output: `ControlState`
- Must implement: `process()`, `connect()`, `reset()`, `dispose()`

### IGenerator
- Input: `Observable<ControlState>`
- Must implement: `connect()`, `start()`, `stop()`, `dispose()`

## Common Patterns

### Creating a Controller
```typescript
export class MyController implements IController {
  private subject = new Subject<ControlState>();
  readonly state$ = this.subject.asObservable();
  
  process(frame: HandFrame): ControlState {
    // Process and emit
  }
  // ... implement all interface methods
}
```

### Creating a Generator
```typescript
export class MyGenerator implements IGenerator {
  private subscription?: Subscription;
  
  connect(state$: Observable<ControlState>): void {
    this.subscription = state$.subscribe(this.handleState.bind(this));
  }
  
  dispose(): void {
    this.subscription?.unsubscribe();
  }
}
```

## Testing Requirements

- Use Vitest for testing
- Mock external dependencies (MediaPipe, Tone.js)
- Test edge cases (no hands, invalid data)
- Aim for >80% coverage on controllers
