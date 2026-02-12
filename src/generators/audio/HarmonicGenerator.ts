/**
 * HarmonicGenerator
 *
 * Additive synthesis controlled by finger positions.
 * Palm X position controls fundamental frequency.
 * Individual finger extensions control harmonic amplitudes.
 */

import * as Tone from 'tone';
import type { Observable, Subscription } from 'rxjs';
import type { ControlState, SingleHandControlState } from '../../types/control.types';
import type { IGenerator, HarmonicGeneratorConfig } from '../IGenerator';
import { DEFAULT_HARMONIC_CONFIG } from '../IGenerator';
import { mapToFrequency } from '../../utils/MusicalScale';

/**
 * HarmonicGenerator creates rich timbres by controlling
 * individual harmonic oscillators with finger positions.
 */
export class HarmonicGenerator implements IGenerator {
  readonly name = 'HarmonicGenerator';

  private config: HarmonicGeneratorConfig;
  private oscillators: Tone.Oscillator[] = [];
  private gains: Tone.Gain[] = [];
  private masterGain: Tone.Gain | null = null;
  private subscription: Subscription | null = null;
  private _isRunning = false;
  private wasHandActive = false;

  constructor(config?: Partial<HarmonicGeneratorConfig>) {
    this.config = { ...DEFAULT_HARMONIC_CONFIG, ...config };
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Connect to a ControlState stream.
   */
  connect(state$: Observable<ControlState>): void {
    this.disconnect();

    this.subscription = state$.subscribe({
      next: (state) => {
        if (this._isRunning) {
          this.processState(state);
        }
      },
      error: (err) => {
        console.error(`[${this.name}] Stream error:`, err);
      },
    });
  }

  /**
   * Disconnect from the current stream.
   */
  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /**
   * Start the harmonic generator.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    await Tone.start();

    // Create master gain node
    this.masterGain = new Tone.Gain(0).toDestination();

    // Create oscillators for each harmonic
    for (let i = 0; i < this.config.harmonicCount; i++) {
      const gain = new Tone.Gain(0).connect(this.masterGain);
      const osc = new Tone.Oscillator({
        type: 'sine',
        frequency: 220 * (i + 1), // Default harmonics of A3
      }).connect(gain);

      osc.start();

      this.oscillators.push(osc);
      this.gains.push(gain);
    }

    this._isRunning = true;
  }

  /**
   * Stop generating sound.
   */
  stop(): void {
    if (!this._isRunning) return;

    this.silenceAll();
    this._isRunning = false;
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this.stop();
    this.disconnect();

    for (const osc of this.oscillators) {
      osc.stop();
      osc.dispose();
    }
    this.oscillators = [];

    for (const gain of this.gains) {
      gain.dispose();
    }
    this.gains = [];

    if (this.masterGain) {
      this.masterGain.dispose();
      this.masterGain = null;
    }
  }

  /**
   * Process a ControlState update.
   */
  private processState(state: ControlState): void {
    const hand = state.primaryHand;

    if (!hand || !hand.isTracked) {
      if (this.wasHandActive) {
        this.silenceAll();
        this.wasHandActive = false;
      }
      return;
    }

    this.wasHandActive = true;

    // Fade in master gain
    if (this.masterGain) {
      this.masterGain.gain.rampTo(0.3, 0.1);
    }

    // Calculate fundamental frequency from hand X position
    const fundamental = mapToFrequency(
      hand.position.x,
      this.config.frequencyRange.min,
      this.config.frequencyRange.max
    );

    // Get harmonic amplitudes from finger states
    const amplitudes = this.getHarmonicAmplitudes(hand);

    // Update oscillators
    this.updateOscillators(fundamental, amplitudes);
  }

  /**
   * Calculate harmonic amplitudes based on finger extension states.
   */
  private getHarmonicAmplitudes(hand: SingleHandControlState): number[] {
    const { fingerMapping, extendedAmplitude, curledAmplitude } = this.config;
    const fingers = hand.fingers;

    const amplitudes: number[] = new Array(this.config.harmonicCount).fill(curledAmplitude);

    // Map each finger to its corresponding harmonic
    const fingerStates: [boolean, number][] = [
      [fingers.thumb, fingerMapping.thumb - 1],
      [fingers.index, fingerMapping.index - 1],
      [fingers.middle, fingerMapping.middle - 1],
      [fingers.ring, fingerMapping.ring - 1],
      [fingers.pinky, fingerMapping.pinky - 1],
    ];

    for (const [isExtended, harmonicIndex] of fingerStates) {
      if (harmonicIndex >= 0 && harmonicIndex < this.config.harmonicCount) {
        amplitudes[harmonicIndex] = isExtended ? extendedAmplitude : curledAmplitude;
      }
    }

    // Scale amplitudes by harmonic number (higher harmonics are naturally quieter)
    return amplitudes.map((amp, i) => amp / (i + 1));
  }

  /**
   * Update oscillator frequencies and amplitudes.
   */
  private updateOscillators(fundamental: number, amplitudes: number[]): void {
    const now = Tone.now();

    for (let i = 0; i < this.oscillators.length; i++) {
      const harmonicNumber = i + 1;
      const targetFreq = fundamental * harmonicNumber;

      // Clamp to audible range
      if (targetFreq > 20000) {
        this.gains[i].gain.rampTo(0, 0.05);
        continue;
      }

      this.oscillators[i].frequency.rampTo(targetFreq, 0.05, now);
      this.gains[i].gain.rampTo(amplitudes[i] ?? 0, 0.05, now);
    }
  }

  /**
   * Silence all oscillators by ramping gains to zero.
   */
  private silenceAll(): void {
    if (this.masterGain) {
      this.masterGain.gain.rampTo(0, 0.15);
    }
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<HarmonicGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
