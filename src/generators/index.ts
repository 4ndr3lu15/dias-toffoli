/**
 * Generators Module - Barrel Export
 */

// Interface and configs
export type {
  IGenerator,
  SynthGeneratorConfig,
  HarmonicGeneratorConfig,
  DrumGeneratorConfig,
  ParticleGeneratorConfig,
  TrailGeneratorConfig,
  WaveformVisualizerConfig,
} from './IGenerator';

export {
  DEFAULT_SYNTH_CONFIG,
  DEFAULT_HARMONIC_CONFIG,
  DEFAULT_DRUM_CONFIG,
  DEFAULT_PARTICLE_CONFIG,
  DEFAULT_TRAIL_CONFIG,
  DEFAULT_WAVEFORM_CONFIG,
} from './IGenerator';

// Audio generators
export { SynthGenerator } from './audio/SynthGenerator';
export { HarmonicGenerator } from './audio/HarmonicGenerator';
export { DrumGenerator } from './audio/DrumGenerator';

// Visual generators
export { ParticleGenerator } from './visual/ParticleGenerator';
export { TrailGenerator } from './visual/TrailGenerator';
export { WaveformVisualizer } from './visual/WaveformVisualizer';
