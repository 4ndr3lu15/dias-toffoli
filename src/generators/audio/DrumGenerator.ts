/**
 * DrumGenerator
 *
 * Triggers drum sounds based on gesture changes.
 * - Closed fist → Kick drum
 * - Open hand → Snare
 * - Pointing → Hi-hat
 */

import * as Tone from 'tone';
import type { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { ControlState } from '../../types/control.types';
import { GestureType } from '../../types/control.types';
import type { IGenerator, DrumGeneratorConfig } from '../IGenerator';
import { DEFAULT_DRUM_CONFIG } from '../IGenerator';

/**
 * DrumGenerator maps hand gestures to percussive drum sounds.
 * Only triggers when the gesture *changes*, not on every frame.
 */
export class DrumGenerator implements IGenerator {
  readonly name = 'DrumGenerator';

  private config: DrumGeneratorConfig;
  private kick: Tone.MembraneSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private hihat: Tone.MetalSynth | null = null;
  private masterGain: Tone.Gain | null = null;
  private subscription: Subscription | null = null;
  private _isRunning = false;

  constructor(config?: Partial<DrumGeneratorConfig>) {
    this.config = { ...DEFAULT_DRUM_CONFIG, ...config };
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Connect to a ControlState stream.
   * Uses distinctUntilChanged to only trigger on gesture transitions.
   */
  connect(state$: Observable<ControlState>): void {
    this.disconnect();

    this.subscription = state$
      .pipe(
        // Extract primary hand gesture type
        map((state) => state.primaryHand?.gesture.type ?? GestureType.NONE),
        // Only emit when gesture actually changes
        distinctUntilChanged()
      )
      .subscribe({
        next: (gestureType) => {
          if (this._isRunning) {
            this.triggerDrum(gestureType);
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
   * Start the drum generator.
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    await Tone.start();

    // Create master gain
    this.masterGain = new Tone.Gain(this.config.volume).toDestination();

    // Create drum voices
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
    }).connect(this.masterGain);

    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
      },
    }).connect(this.masterGain);

    this.hihat = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.1,
        release: 0.01,
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).connect(this.masterGain);
    this.hihat.frequency.value = 200;

    this._isRunning = true;
  }

  /**
   * Stop generating drum sounds.
   */
  stop(): void {
    if (!this._isRunning) return;
    this._isRunning = false;
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this.stop();
    this.disconnect();

    if (this.kick) {
      this.kick.dispose();
      this.kick = null;
    }
    if (this.snare) {
      this.snare.dispose();
      this.snare = null;
    }
    if (this.hihat) {
      this.hihat.dispose();
      this.hihat = null;
    }
    if (this.masterGain) {
      this.masterGain.dispose();
      this.masterGain = null;
    }
  }

  /**
   * Trigger the appropriate drum sound for a gesture.
   */
  private triggerDrum(gestureType: GestureType): void {
    const now = Tone.now();

    switch (gestureType) {
      case GestureType.CLOSED_FIST:
        if (this.config.enableKick && this.kick) {
          this.kick.triggerAttackRelease('C1', '8n', now);
        }
        break;

      case GestureType.OPEN_HAND:
        if (this.config.enableSnare && this.snare) {
          this.snare.triggerAttackRelease('8n', now);
        }
        break;

      case GestureType.POINTING:
        if (this.config.enableHihat && this.hihat) {
          this.hihat.triggerAttackRelease('C6', '16n', now);
        }
        break;

      // Other gestures don't trigger drums
      default:
        break;
    }
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(config: Partial<DrumGeneratorConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.masterGain && config.volume !== undefined) {
      this.masterGain.gain.rampTo(config.volume, 0.1);
    }
  }
}
