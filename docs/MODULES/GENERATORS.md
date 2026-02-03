# Module: Generators

## Purpose

Generators consume `ControlState` streams and produce outputs (audio, visuals, etc.). They are the "effectors" that create the user experience.

## Generator Interface

```typescript
interface IGenerator {
  /**
   * Connect to a control state stream
   * The generator will react to state changes
   */
  connect(state$: Observable<ControlState>): void;
  
  /**
   * Disconnect from current stream
   */
  disconnect(): void;
  
  /**
   * Start generating output
   */
  start(): Promise<void>;
  
  /**
   * Stop generating (can be resumed)
   */
  stop(): void;
  
  /**
   * Is the generator currently running?
   */
  readonly isRunning: boolean;
  
  /**
   * Release all resources
   */
  dispose(): void;
}
```

## Audio Generators

### 1. SynthGenerator

Basic synthesizer using Tone.js.

```typescript
interface SynthGeneratorConfig {
  /** Waveform type */
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  
  /** ADSR envelope */
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  
  /** Frequency range in Hz */
  frequencyRange: { min: number; max: number };
  
  /** Use musical scale quantization */
  useScale: boolean;
  
  /** Musical scale (if useScale is true) */
  scale: Scale;
  
  /** Polyphony (number of simultaneous voices) */
  polyphony: number;
}

class SynthGenerator implements IGenerator {
  private synth: Tone.PolySynth;
  private subscription?: Subscription;
  
  constructor(private config: SynthGeneratorConfig) {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: config.waveform },
      envelope: config.envelope
    }).toDestination();
  }
  
  connect(state$: Observable<ControlState>): void {
    this.subscription = state$.subscribe(state => {
      this.processState(state);
    });
  }
  
  private processState(state: ControlState): void {
    if (!state.hasActiveHand) {
      this.synth.releaseAll();
      return;
    }
    
    state.hands.forEach((hand, index) => {
      if (hand.isTracked) {
        // Map X position to frequency
        const freq = this.positionToFrequency(hand.position.x);
        
        // Map Y position to volume
        const volume = this.positionToVolume(hand.position.y);
        
        // Trigger note
        this.synth.triggerAttack(freq, undefined, volume);
      }
    });
  }
  
  private positionToFrequency(x: number): number {
    const { min, max } = this.config.frequencyRange;
    const rawFreq = min * Math.pow(max / min, x);
    
    if (this.config.useScale) {
      return this.quantizeToScale(rawFreq);
    }
    return rawFreq;
  }
}
```

### 2. HarmonicGenerator

Rich harmonic synthesis controlled by finger positions.

```typescript
interface HarmonicGeneratorConfig {
  /** Number of harmonics to generate */
  harmonicCount: number;
  
  /** Base frequency range */
  frequencyRange: { min: number; max: number };
  
  /** Map fingers to harmonic amplitudes */
  fingerMapping: {
    thumb: number;    // Which harmonic (1-based)
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };
}

class HarmonicGenerator implements IGenerator {
  private harmonicOscillators: Tone.Oscillator[] = [];
  
  connect(state$: Observable<ControlState>): void {
    state$.subscribe(state => {
      const hand = state.primaryHand;
      if (!hand) return;
      
      // Palm position controls fundamental
      const fundamental = this.getFundamental(hand.position.x);
      
      // Finger heights control harmonic amplitudes
      const harmonics = this.getHarmonicAmplitudes(hand.fingers);
      
      // Update oscillators
      this.updateOscillators(fundamental, harmonics);
    });
  }
  
  private getHarmonicAmplitudes(fingers: FingerStates): number[] {
    return [
      fingers.thumb ? 1.0 : 0.2,     // 1st harmonic
      fingers.index ? 0.8 : 0.1,     // 2nd harmonic (octave)
      fingers.middle ? 0.6 : 0.05,   // 3rd harmonic (fifth)
      fingers.ring ? 0.4 : 0.02,     // 4th harmonic
      fingers.pinky ? 0.3 : 0.01,    // 5th harmonic
    ];
  }
}
```

### 3. DrumGenerator

Trigger drum sounds with gestures.

```typescript
class DrumGenerator implements IGenerator {
  private kick: Tone.MembraneSynth;
  private snare: Tone.NoiseSynth;
  private hihat: Tone.MetalSynth;
  
  connect(state$: Observable<ControlState>): void {
    state$.pipe(
      // Only emit when gesture changes
      distinctUntilChanged((a, b) => 
        a.primaryHand?.gesture.type === b.primaryHand?.gesture.type
      )
    ).subscribe(state => {
      const gesture = state.primaryHand?.gesture;
      if (!gesture) return;
      
      switch (gesture.type) {
        case GestureType.CLOSED_FIST:
          this.kick.triggerAttackRelease('C1', '8n');
          break;
        case GestureType.OPEN_HAND:
          this.snare.triggerAttackRelease('8n');
          break;
        case GestureType.POINTING:
          this.hihat.triggerAttackRelease('C6', '16n');
          break;
      }
    });
  }
}
```

## Visual Generators

### 1. ParticleGenerator

GPU-accelerated particle system.

```typescript
interface ParticleGeneratorConfig {
  /** Number of particles */
  particleCount: number;
  
  /** Canvas element to render to */
  canvas: HTMLCanvasElement;
  
  /** Use WebGL (true) or Canvas 2D (false) */
  useWebGL: boolean;
  
  /** Trail effect opacity [0, 1] */
  trailOpacity: number;
  
  /** Particle attraction strength */
  attractionStrength: number;
}

class ParticleGenerator implements IGenerator {
  private particles: Particle[] = [];
  private animationId?: number;
  private ctx: CanvasRenderingContext2D | WebGLRenderingContext;
  
  connect(state$: Observable<ControlState>): void {
    state$.subscribe(state => {
      // Update attractor positions from hand positions
      this.attractors = state.hands
        .filter(h => h.isTracked)
        .map(h => ({
          x: h.position.x * this.canvas.width,
          y: h.position.y * this.canvas.height,
          hue: h.position.x * 360
        }));
    });
  }
  
  start(): void {
    this.isRunning = true;
    this.animate();
  }
  
  private animate(): void {
    if (!this.isRunning) return;
    
    // Update particle physics
    this.updateParticles();
    
    // Render particles
    this.render();
    
    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  private updateParticles(): void {
    for (const particle of this.particles) {
      // Calculate attraction to each attractor
      for (const attractor of this.attractors) {
        const dx = attractor.x - particle.x;
        const dy = attractor.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        
        // Apply force
        particle.vx += (dx / dist) * this.config.attractionStrength;
        particle.vy += (dy / dist) * this.config.attractionStrength;
      }
      
      // Apply damping
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Wrap around edges
      particle.x = (particle.x + this.canvas.width) % this.canvas.width;
      particle.y = (particle.y + this.canvas.height) % this.canvas.height;
      
      // Update color towards attractor hue
      if (this.attractors.length > 0) {
        particle.hue += (this.attractors[0].hue - particle.hue) * 0.05;
      }
    }
  }
}
```

### 2. WaveformVisualizer

Real-time audio waveform display.

```typescript
class WaveformVisualizer implements IGenerator {
  private analyser: Tone.Analyser;
  private canvas: HTMLCanvasElement;
  
  connect(state$: Observable<ControlState>): void {
    // Waveform doesn't need control state
    // It visualizes the audio output
  }
  
  connectAudio(source: Tone.ToneAudioNode): void {
    this.analyser = new Tone.Analyser('waveform', 2048);
    source.connect(this.analyser);
  }
  
  private render(): void {
    const values = this.analyser.getValue() as Float32Array;
    const ctx = this.canvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#00ff00';
    
    const sliceWidth = this.canvas.width / values.length;
    let x = 0;
    
    for (let i = 0; i < values.length; i++) {
      const y = (values[i] + 1) / 2 * this.canvas.height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    
    ctx.stroke();
  }
}
```

### 3. TrailGenerator

Motion trails following hand movement.

```typescript
class TrailGenerator implements IGenerator {
  private trailPoints: { x: number; y: number; age: number }[] = [];
  private maxTrailLength = 50;
  
  connect(state$: Observable<ControlState>): void {
    state$.subscribe(state => {
      state.hands.forEach(hand => {
        if (hand.isTracked) {
          this.trailPoints.push({
            x: hand.position.x * this.canvas.width,
            y: hand.position.y * this.canvas.height,
            age: 0
          });
        }
      });
      
      // Age and remove old points
      this.trailPoints = this.trailPoints
        .map(p => ({ ...p, age: p.age + 1 }))
        .filter(p => p.age < this.maxTrailLength);
    });
  }
  
  private render(): void {
    const ctx = this.canvas.getContext('2d')!;
    
    for (let i = 1; i < this.trailPoints.length; i++) {
      const prev = this.trailPoints[i - 1];
      const curr = this.trailPoints[i];
      
      const alpha = 1 - curr.age / this.maxTrailLength;
      
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${curr.age * 3}, 80%, 60%, ${alpha})`;
      ctx.lineWidth = (1 - curr.age / this.maxTrailLength) * 5;
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  }
}
```

## Combining Generators

```typescript
class App {
  private generators: IGenerator[] = [];
  
  setup(): void {
    // Create generators
    const synth = new SynthGenerator(synthConfig);
    const particles = new ParticleGenerator(particleConfig);
    const waveform = new WaveformVisualizer(waveformConfig);
    
    this.generators = [synth, particles, waveform];
    
    // Connect all to the same control stream
    const controller = new CompositeController([/*...*/]);
    
    this.generators.forEach(gen => {
      gen.connect(controller.state$);
      gen.start();
    });
    
    // Connect waveform to audio output
    waveform.connectAudio(synth.getOutput());
  }
  
  cleanup(): void {
    this.generators.forEach(gen => gen.dispose());
  }
}
```

## Creating Custom Generators

```typescript
// Example: MIDI output generator
class MidiGenerator implements IGenerator {
  private midiOutput?: MIDIOutput;
  
  async start(): Promise<void> {
    const access = await navigator.requestMIDIAccess();
    this.midiOutput = access.outputs.values().next().value;
  }
  
  connect(state$: Observable<ControlState>): void {
    state$.subscribe(state => {
      const hand = state.primaryHand;
      if (!hand || !this.midiOutput) return;
      
      // Convert position to MIDI note
      const note = Math.floor(hand.position.x * 127);
      const velocity = Math.floor((1 - hand.position.y) * 127);
      
      // Send MIDI note
      this.midiOutput.send([0x90, note, velocity]);
    });
  }
}
```

## Testing Generators

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SynthGenerator } from './SynthGenerator';
import { of } from 'rxjs';

describe('SynthGenerator', () => {
  it('should trigger note on hand detection', async () => {
    const generator = new SynthGenerator(defaultConfig);
    
    // Mock Tone.js
    const triggerSpy = vi.spyOn(generator['synth'], 'triggerAttack');
    
    // Create mock state stream
    const state$ = of(createMockControlState({
      hasActiveHand: true,
      position: { x: 0.5, y: 0.5 }
    }));
    
    generator.connect(state$);
    await generator.start();
    
    expect(triggerSpy).toHaveBeenCalled();
  });
  
  it('should release on hand loss', () => {
    // ...
  });
});
```

## Best Practices

1. **Clean separation**: Generators only know about ControlState, not HandFrame
2. **Resource management**: Always implement dispose() properly
3. **Graceful degradation**: Handle missing permissions (camera, audio)
4. **Performance**: Use requestAnimationFrame for visuals, AudioWorklet for audio
5. **Testability**: Accept dependencies via constructor for easy mocking
