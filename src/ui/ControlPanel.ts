/**
 * Control Panel UI Component
 *
 * Manages audio and visual generator controls, including
 * toggle buttons, generator checkboxes, and status displays.
 */

import type { IGenerator } from '../generators';
import type { ControlState } from '../types/control.types';
import type { Observable } from 'rxjs';

/**
 * Configuration for which generators are enabled by default.
 */
export interface ControlPanelConfig {
  /** Initial audio generator states */
  audio: {
    synthEnabled: boolean;
    harmonicEnabled: boolean;
    drumEnabled: boolean;
  };
  /** Initial visual generator states */
  visual: {
    particlesEnabled: boolean;
    trailsEnabled: boolean;
    waveformEnabled: boolean;
  };
}

export const DEFAULT_CONTROL_PANEL_CONFIG: ControlPanelConfig = {
  audio: {
    synthEnabled: true,
    harmonicEnabled: false,
    drumEnabled: true,
  },
  visual: {
    particlesEnabled: true,
    trailsEnabled: true,
    waveformEnabled: false,
  },
};

/**
 * Generator set with named references for toggling.
 */
interface GeneratorSet<T extends IGenerator> {
  generators: Map<string, { instance: T; enabled: boolean }>;
  activeList: IGenerator[];
  isEnabled: boolean;
}

/**
 * ControlPanel manages audio and visual generator UI controls.
 */
export class ControlPanel {
  private config: ControlPanelConfig;

  // Audio state
  private audioSet: GeneratorSet<IGenerator> = {
    generators: new Map(),
    activeList: [],
    isEnabled: false,
  };

  // Visual state
  private visualSet: GeneratorSet<IGenerator> = {
    generators: new Map(),
    activeList: [],
    isEnabled: false,
  };

  // DOM elements
  private audioToggleBtn: HTMLButtonElement | null = null;
  private audioStatusEl: HTMLElement | null = null;
  private visualToggleBtn: HTMLButtonElement | null = null;
  private visualStatusEl: HTMLElement | null = null;
  private gestureEl: HTMLElement | null = null;

  // Checkbox → generator key bindings
  private audioCheckboxes: Map<HTMLInputElement, string> = new Map();
  private visualCheckboxes: Map<HTMLInputElement, string> = new Map();

  // Reference to controller state stream for connecting generators
  private controllerState$: Observable<ControlState> | null = null;

  constructor(config?: Partial<ControlPanelConfig>) {
    this.config = {
      audio: { ...DEFAULT_CONTROL_PANEL_CONFIG.audio, ...config?.audio },
      visual: { ...DEFAULT_CONTROL_PANEL_CONFIG.visual, ...config?.visual },
    };
  }

  /**
   * Register audio generators.
   */
  registerAudioGenerators(generators: {
    synth: IGenerator;
    harmonic: IGenerator;
    drum: IGenerator;
  }): void {
    this.audioSet.generators.set('synth', {
      instance: generators.synth,
      enabled: this.config.audio.synthEnabled,
    });
    this.audioSet.generators.set('harmonic', {
      instance: generators.harmonic,
      enabled: this.config.audio.harmonicEnabled,
    });
    this.audioSet.generators.set('drum', {
      instance: generators.drum,
      enabled: this.config.audio.drumEnabled,
    });
    this.rebuildActiveList(this.audioSet);
  }

  /**
   * Register visual generators.
   */
  registerVisualGenerators(generators: {
    particles: IGenerator;
    trails: IGenerator;
    waveform: IGenerator;
  }): void {
    this.visualSet.generators.set('particles', {
      instance: generators.particles,
      enabled: this.config.visual.particlesEnabled,
    });
    this.visualSet.generators.set('trails', {
      instance: generators.trails,
      enabled: this.config.visual.trailsEnabled,
    });
    this.visualSet.generators.set('waveform', {
      instance: generators.waveform,
      enabled: this.config.visual.waveformEnabled,
    });
    this.rebuildActiveList(this.visualSet);
  }

  /**
   * Bind DOM elements for the control panel.
   */
  initialize(): void {
    // Audio DOM elements
    this.audioToggleBtn = document.getElementById('audioToggleBtn') as HTMLButtonElement;
    this.audioStatusEl = document.getElementById('audioStatus');

    // Visual DOM elements
    this.visualToggleBtn = document.getElementById('visualToggleBtn') as HTMLButtonElement;
    this.visualStatusEl = document.getElementById('visualStatus');

    // Gesture display
    this.gestureEl = document.getElementById('gesture');

    // Bind audio checkboxes
    this.bindCheckbox('synthEnabled', 'synth', this.audioSet, this.audioCheckboxes);
    this.bindCheckbox('harmonicEnabled', 'harmonic', this.audioSet, this.audioCheckboxes);
    this.bindCheckbox('drumEnabled', 'drum', this.audioSet, this.audioCheckboxes);

    // Bind visual checkboxes
    this.bindCheckbox('particlesEnabled', 'particles', this.visualSet, this.visualCheckboxes);
    this.bindCheckbox('trailsEnabled', 'trails', this.visualSet, this.visualCheckboxes);
    this.bindCheckbox('waveformEnabled', 'waveform', this.visualSet, this.visualCheckboxes);

    // Toggle button handlers
    this.audioToggleBtn?.addEventListener('click', () => {
      void this.toggleAudio();
    });

    this.visualToggleBtn?.addEventListener('click', () => {
      void this.toggleVisuals();
    });
  }

  /**
   * Set the controller state stream used to connect generators.
   */
  setControllerState(state$: Observable<ControlState>): void {
    this.controllerState$ = state$;
  }

  /**
   * Enable the toggle buttons (called when tracking starts).
   */
  enableToggles(): void {
    if (this.audioToggleBtn) this.audioToggleBtn.disabled = false;
    if (this.visualToggleBtn) this.visualToggleBtn.disabled = false;
  }

  /**
   * Disable the toggle buttons and stop generators (called when tracking stops).
   */
  disableToggles(): void {
    if (this.audioSet.isEnabled) this.stopAudio();
    if (this.visualSet.isEnabled) this.stopVisuals();

    if (this.audioToggleBtn) {
      this.audioToggleBtn.disabled = true;
      this.audioToggleBtn.textContent = 'Enable Audio';
      this.audioToggleBtn.classList.remove('active');
    }
    if (this.visualToggleBtn) {
      this.visualToggleBtn.disabled = true;
      this.visualToggleBtn.textContent = 'Enable Visuals';
      this.visualToggleBtn.classList.remove('active');
    }
  }

  /**
   * Update gesture display from control state.
   */
  updateControlStateDisplay(state: ControlState): void {
    if (!this.gestureEl) return;

    if (state.primaryHand) {
      const gesture = state.primaryHand.gesture.type;
      const confidence = Math.round(state.primaryHand.gesture.confidence * 100);
      const openness = Math.round(state.primaryHand.openness.value * 100);
      const fingers = state.primaryHand.fingers.extendedCount;

      this.gestureEl.textContent = `Gesture: ${gesture} (${confidence}%) | Openness: ${openness}% | Fingers: ${fingers}`;
      this.gestureEl.style.display = 'block';
    } else {
      this.gestureEl.textContent = 'No hand detected';
      this.gestureEl.style.display = 'block';
    }
  }

  /**
   * Whether audio is currently enabled.
   */
  get isAudioEnabled(): boolean {
    return this.audioSet.isEnabled;
  }

  /**
   * Whether visuals are currently enabled.
   */
  get isVisualsEnabled(): boolean {
    return this.visualSet.isEnabled;
  }

  /**
   * Get the list of currently active audio generators.
   */
  get activeAudioGenerators(): IGenerator[] {
    return this.audioSet.activeList;
  }

  /**
   * Get the list of currently active visual generators.
   */
  get activeVisualGenerators(): IGenerator[] {
    return this.visualSet.activeList;
  }

  // ─── Audio Methods ───────────────────────────────────────────

  private async toggleAudio(): Promise<void> {
    if (this.audioSet.isEnabled) {
      this.stopAudio();
    } else {
      await this.startAudio();
    }
  }

  private async startAudio(): Promise<void> {
    if (!this.controllerState$) return;

    try {
      this.rebuildActiveList(this.audioSet);

      for (const gen of this.audioSet.activeList) {
        await gen.start();
        gen.connect(this.controllerState$);
      }

      this.audioSet.isEnabled = true;

      if (this.audioToggleBtn) {
        this.audioToggleBtn.textContent = 'Disable Audio';
        this.audioToggleBtn.classList.add('active');
      }
      this.updateAudioStatus();
    } catch (error) {
      console.error('Failed to start audio:', error);
    }
  }

  private stopAudio(): void {
    for (const gen of this.audioSet.activeList) {
      gen.stop();
      gen.disconnect();
    }

    this.audioSet.isEnabled = false;

    if (this.audioToggleBtn) {
      this.audioToggleBtn.textContent = 'Enable Audio';
      this.audioToggleBtn.classList.remove('active');
    }
    this.updateAudioStatus();
  }

  private updateAudioStatus(): void {
    if (!this.audioStatusEl) return;

    if (!this.audioSet.isEnabled) {
      this.audioStatusEl.textContent = 'Audio: Off';
      return;
    }

    const activeNames = this.audioSet.activeList
      .map((g) => g.name.replace('Generator', ''))
      .join(', ');
    this.audioStatusEl.textContent = `Audio: On | Active: ${activeNames || 'None'}`;
  }

  // ─── Visual Methods ──────────────────────────────────────────

  private async toggleVisuals(): Promise<void> {
    if (this.visualSet.isEnabled) {
      this.stopVisuals();
    } else {
      await this.startVisuals();
    }
  }

  private async startVisuals(): Promise<void> {
    if (!this.controllerState$) return;

    try {
      this.rebuildActiveList(this.visualSet);

      for (const gen of this.visualSet.activeList) {
        await gen.start();
        gen.connect(this.controllerState$);
      }

      this.visualSet.isEnabled = true;

      if (this.visualToggleBtn) {
        this.visualToggleBtn.textContent = 'Disable Visuals';
        this.visualToggleBtn.classList.add('active');
      }
      this.updateVisualStatus();
    } catch (error) {
      console.error('Failed to start visuals:', error);
    }
  }

  private stopVisuals(): void {
    for (const gen of this.visualSet.activeList) {
      gen.stop();
      gen.disconnect();
    }

    this.visualSet.isEnabled = false;

    if (this.visualToggleBtn) {
      this.visualToggleBtn.textContent = 'Enable Visuals';
      this.visualToggleBtn.classList.remove('active');
    }
    this.updateVisualStatus();
  }

  private updateVisualStatus(): void {
    if (!this.visualStatusEl) return;

    if (!this.visualSet.isEnabled) {
      this.visualStatusEl.textContent = 'Visuals: Off';
      return;
    }

    const activeNames = this.visualSet.activeList
      .map((g) => g.name.replace('Generator', '').replace('Visualizer', ''))
      .join(', ');
    this.visualStatusEl.textContent = `Visuals: On | Active: ${activeNames || 'None'}`;
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private bindCheckbox(
    elementId: string,
    generatorKey: string,
    genSet: GeneratorSet<IGenerator>,
    checkboxMap: Map<HTMLInputElement, string>
  ): void {
    const checkbox = document.getElementById(elementId) as HTMLInputElement | null;
    if (!checkbox) return;

    checkboxMap.set(checkbox, generatorKey);

    checkbox.addEventListener('change', () => {
      const entry = genSet.generators.get(generatorKey);
      if (entry) {
        entry.enabled = checkbox.checked;
        this.handleCheckboxChange(genSet);
      }
    });
  }

  private handleCheckboxChange(genSet: GeneratorSet<IGenerator>): void {
    const wasEnabled = genSet.isEnabled;

    if (wasEnabled && this.controllerState$) {
      // Stop current generators
      for (const gen of genSet.activeList) {
        gen.stop();
        gen.disconnect();
      }
    }

    this.rebuildActiveList(genSet);

    if (wasEnabled && this.controllerState$) {
      // Restart with new set
      for (const gen of genSet.activeList) {
        void gen.start().then(() => {
          if (this.controllerState$) {
            gen.connect(this.controllerState$);
          }
        });
      }
    }

    // Update the appropriate status
    if (genSet === this.audioSet) {
      this.updateAudioStatus();
    } else {
      this.updateVisualStatus();
    }
  }

  private rebuildActiveList(genSet: GeneratorSet<IGenerator>): void {
    genSet.activeList = [];
    for (const [, entry] of genSet.generators) {
      if (entry.enabled) {
        genSet.activeList.push(entry.instance);
      }
    }
  }

  /**
   * Dispose of all generators managed by this panel.
   */
  dispose(): void {
    this.stopAudio();
    this.stopVisuals();
  }
}
