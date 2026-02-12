/**
 * SynthGenerator
 *
 * Polyphonic synthesizer controlled by hand position.
 * Uses continuous note model: triggers on hand appear,
 * updates frequency/volume as hand moves, releases on hand disappear.
 */

import * as Tone from 'tone';
import type { Observable, Subscription } from 'rxjs';
import type { ControlState } from '../../types/control.types';
import type { IGenerator, SynthGeneratorConfig } from '../IGenerator';
import { DEFAULT_SYNTH_CONFIG } from '../IGenerator';
import {
  mapToFrequency,
  mapToVolume,
  quantizeFrequency,
  createScale,
} from '../../utils/MusicalScale';
import { ScaleType } from '../../types/music.types';

/**
 * SynthGenerator uses Tone.js PolySynth to generate sound
 * based on hand position. X controls pitch, Y controls volume.
 */
export class SynthGenerator implements IGenerator {
  readonly name = 'SynthGenerator';

  private config: SynthGeneratorConfig;
  private synth: Tone.PolySynth | null = null;
  private subscription: Subscription | null = null;
  private _isRunning = false;

  /** Track which hands are currently producing sound */
  private activeNotes: Map<number, string> = new Map();

  constructor(config?: Partial<SynthGeneratorConfig>) {
    this.config = { ...DEFAULT_SYNTH_CONFIG, ...config };

    // Create default scale if useScale is enabled but no scale provided
    if (this.config.useScale && !this.config.scale) {
      this.config.scale = createScale('C', ScaleType.PENTATONIC_MINOR, { min: 3, max: 5 });
    }
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
   * Start the synthesizer. Initializes Tone.js and resumes audio context.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    await Tone.start();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: this.config.waveform },
      envelope: this.config.envelope,
    }).toDestination();

    this.synth.maxPolyphony = this.config.polyphony;

    this._isRunning = true;
  }

  /**
   * Stop generating sound. Can be resumed with start().
   */
  stop(): void {
    if (!this._isRunning) return;

    this.releaseAll();
    this._isRunning = false;
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this.stop();
    this.disconnect();

    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
  }

  /**
   * Process a ControlState and update synth output.
   */
  private processState(state: ControlState): void {
    if (!this.synth) return;

    if (!state.hasActiveHand) {
      this.releaseAll();
      return;
    }

    // Track which hands are still present
    const currentHandIds = new Set<number>();

    for (const hand of state.hands) {
      if (!hand.isTracked) continue;

      currentHandIds.add(hand.handId);

      // Calculate frequency from X position
      let frequency = mapToFrequency(
        hand.position.x,
        this.config.frequencyRange.min,
        this.config.frequencyRange.max
      );

      // Quantize to scale if enabled
      if (this.config.useScale && this.config.scale) {
        frequency = quantizeFrequency(frequency, this.config.scale);
      }

      // Convert frequency to note name for Tone.js
      const noteName = Tone.Frequency(frequency).toNote();

      // Calculate volume from Y position (inverted: top = loud, bottom = quiet)
      const volume = mapToVolume(1 - hand.position.y);

      const previousNote = this.activeNotes.get(hand.handId);

      if (previousNote === undefined) {
        // Hand just appeared: trigger new note
        this.synth.volume.value = volume;
        this.synth.triggerAttack(noteName, Tone.now());
        this.activeNotes.set(hand.handId, noteName);
      } else if (previousNote !== noteName) {
        // Hand moved to a different note: release old, trigger new
        this.synth.triggerRelease(previousNote, Tone.now());
        this.synth.volume.value = volume;
        this.synth.triggerAttack(noteName, Tone.now());
        this.activeNotes.set(hand.handId, noteName);
      } else {
        // Same note, just update volume
        this.synth.volume.value = volume;
      }
    }

    // Release notes for hands that disappeared
    for (const [handId, noteName] of this.activeNotes) {
      if (!currentHandIds.has(handId)) {
        this.synth.triggerRelease(noteName, Tone.now());
        this.activeNotes.delete(handId);
      }
    }
  }

  /**
   * Release all active notes.
   */
  private releaseAll(): void {
    if (this.synth && this.activeNotes.size > 0) {
      this.synth.releaseAll(Tone.now());
      this.activeNotes.clear();
    }
  }

  /**
   * Update synth configuration at runtime.
   */
  updateConfig(config: Partial<SynthGeneratorConfig>): void {
    this.config = { ...this.config, ...config };

    // Recreate synth if waveform or envelope changed
    if (this.synth && (config.waveform || config.envelope)) {
      const wasRunning = this._isRunning;
      this.releaseAll();

      this.synth.set({
        oscillator: { type: this.config.waveform },
        envelope: this.config.envelope,
      });

      if (config.polyphony) {
        this.synth.maxPolyphony = this.config.polyphony;
      }

      if (!wasRunning) {
        this._isRunning = false;
      }
    }
  }
}
