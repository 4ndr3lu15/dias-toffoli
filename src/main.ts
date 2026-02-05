/**
 * Dias-Toffoli - Main Application Entry Point
 *
 * Initializes and orchestrates the hand tracking application.
 */

import { HandTracker } from './core';
import { CameraPreview, DebugOverlay } from './ui';
import { ControllerManager } from './controllers';
import type { ControlState } from './types/control.types';

/**
 * Application state.
 */
interface AppState {
  isInitialized: boolean;
  isTracking: boolean;
  error: string | null;
}

/**
 * Main application class.
 */
class App {
  private state: AppState = {
    isInitialized: false,
    isTracking: false,
    error: null,
  };

  private cameraPreview: CameraPreview;
  private handTracker: HandTracker;
  private debugOverlay: DebugOverlay;
  private controllerManager: ControllerManager;

  // DOM elements
  private statusEl: HTMLElement | null = null;
  private startBtn: HTMLButtonElement | null = null;
  private stopBtn: HTMLButtonElement | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private fpsEl: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private loadingText: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;
  private gestureEl: HTMLElement | null = null;

  constructor() {
    this.cameraPreview = new CameraPreview();
    this.handTracker = new HandTracker();
    this.debugOverlay = new DebugOverlay();
    this.controllerManager = new ControllerManager();
  }

  /**
   * Initialize the application.
   */
  initialize(): void {
    // Get DOM elements
    this.statusEl = document.getElementById('status');
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.videoEl = document.getElementById('webcam') as HTMLVideoElement;
    this.canvasEl = document.getElementById('overlay') as HTMLCanvasElement;
    this.fpsEl = document.getElementById('fps');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.progressFill = document.getElementById('progressFill');
    this.gestureEl = document.getElementById('gesture');

    // Validate required elements
    if (!this.videoEl || !this.canvasEl) {
      this.setError('Required DOM elements not found');
      return;
    }

    // Set up button handlers
    this.setupEventListeners();

    // Update status
    this.updateStatus('Ready - Click Start to begin');
    this.state.isInitialized = true;
  }

  /**
   * Set up event listeners.
   */
  private setupEventListeners(): void {
    this.startBtn?.addEventListener('click', () => {
      void this.start();
    });

    this.stopBtn?.addEventListener('click', () => {
      this.stop();
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.isTracking) {
        this.stop();
      }
    });
  }

  /**
   * Show loading overlay with message and progress.
   */
  private showLoading(message: string, progress: number = 0): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('visible');
    }
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }
    if (this.progressFill) {
      this.progressFill.style.width = `${progress}%`;
    }
  }

  /**
   * Hide loading overlay.
   */
  private hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('visible');
    }
  }

  /**
   * Start tracking.
   */
  async start(): Promise<void> {
    if (this.state.isTracking || !this.videoEl || !this.canvasEl) return;

    try {
      this.setButtonsEnabled(false, false);
      this.showLoading('Initializing camera...', 10);
      this.updateStatus('Initializing camera...');

      // Initialize camera
      await this.cameraPreview.initialize(this.videoEl);
      this.showLoading('Camera ready', 30);

      // Set canvas dimensions to match video
      const { width, height } = this.cameraPreview.getDimensions();
      this.debugOverlay.setDimensions(width, height);

      // Initialize debug overlay
      this.debugOverlay.initialize(this.canvasEl, this.fpsEl ?? undefined);

      this.showLoading('Loading hand tracking model...', 40);
      this.updateStatus('Loading hand tracking model...');

      // Initialize hand tracker with progress callback
      await this.handTracker.initialize(this.videoEl, (status, progress) => {
        this.showLoading(status, 40 + (progress ?? 0) * 0.5);
      });

      this.showLoading('Starting tracking...', 95);

      // Start the controller manager with hand tracking data
      this.controllerManager.start(this.handTracker.hands$);

      // Subscribe to control state updates
      this.controllerManager.state$.subscribe({
        next: (controlState) => {
          this.updateControlStateDisplay(controlState);
        },
        error: (err) => {
          console.error('Controller error:', err);
        },
      });

      // Subscribe to hand tracking data for visual overlay
      this.handTracker.hands$.subscribe({
        next: (frame) => {
          this.debugOverlay.draw(frame);
        },
        error: (err) => {
          console.error('Hand tracking error:', err);
          this.setError('Hand tracking error occurred');
        },
      });

      // Start tracking
      this.handTracker.start();

      this.state.isTracking = true;
      this.hideLoading();
      this.updateStatus('Tracking', true);
      this.setButtonsEnabled(false, true);
    } catch (error) {
      console.error('Failed to start:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.hideLoading();
      this.setError(message);
      this.setButtonsEnabled(true, false);
    }
  }

  /**
   * Stop tracking.
   */
  stop(): void {
    if (!this.state.isTracking) return;

    this.controllerManager.stop();
    this.handTracker.stop();
    this.cameraPreview.stop();
    this.debugOverlay.clear();

    this.state.isTracking = false;
    this.updateStatus('Stopped');
    this.setButtonsEnabled(true, false);
  }

  /**
   * Update control state display.
   */
  private updateControlStateDisplay(state: ControlState): void {
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
   * Update status display.
   */
  private updateStatus(message: string, isTracking: boolean = false): void {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.classList.toggle('tracking', isTracking);
      this.statusEl.classList.toggle('error', false);
    }
  }

  /**
   * Set error state.
   */
  private setError(message: string): void {
    this.state.error = message;
    if (this.statusEl) {
      this.statusEl.textContent = `Error: ${message}`;
      this.statusEl.classList.add('error');
      this.statusEl.classList.remove('tracking');
    }
  }

  /**
   * Enable/disable buttons.
   */
  private setButtonsEnabled(startEnabled: boolean, stopEnabled: boolean): void {
    if (this.startBtn) {
      this.startBtn.disabled = !startEnabled;
    }
    if (this.stopBtn) {
      this.stopBtn.disabled = !stopEnabled;
    }
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stop();
    this.controllerManager.reset();
    this.handTracker.dispose();
    this.cameraPreview.dispose();
    this.debugOverlay.dispose();
  }
}

// Initialize app when DOM is ready
// Since we use type="module", the script is deferred and DOM is already parsed
const app = new App();
app.initialize();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  app.dispose();
});
