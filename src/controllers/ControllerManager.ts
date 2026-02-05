/**
 * Controller Manager
 *
 * Combines multiple controllers and produces the final ControlState.
 * Manages the pipeline: HandFrame → Controllers → ControlState
 */

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import type { HandFrame } from '../types/hand.types';
import type { ControlState } from '../types/control.types';
import { createEmptyControlState } from '../types/control.types';
import type { IControllerManager, ControllerConfig, PartialControllerConfig, IController } from './IController';
import { DEFAULT_CONTROLLER_CONFIG } from './IController';
import { PositionController } from './PositionController';
import { GestureController } from './GestureController';
import { DistanceController } from './DistanceController';

/**
 * ControllerManager orchestrates multiple controllers to process hand data.
 */
export class ControllerManager implements IControllerManager {
  private _config: ControllerConfig;
  private controllers: IController[];
  private positionController: PositionController;
  private gestureController: GestureController;
  private distanceController: DistanceController;

  private subscription: Subscription | null = null;
  private stateSubject = new BehaviorSubject<ControlState>(createEmptyControlState());
  private lastTimestamp = 0;

  constructor(config?: PartialControllerConfig) {
    this._config = this.mergeConfig(DEFAULT_CONTROLLER_CONFIG, config);

    // Initialize controllers
    this.positionController = new PositionController(this._config.position);
    this.gestureController = new GestureController(this._config.gesture);
    this.distanceController = new DistanceController(this._config.distance);

    this.controllers = [
      this.positionController,
      this.gestureController,
      this.distanceController,
    ];
  }

  /**
   * Observable stream of control states.
   */
  get state$(): Observable<ControlState> {
    return this.stateSubject.asObservable();
  }

  /**
   * Current configuration.
   */
  get config(): ControllerConfig {
    return { ...this._config };
  }

  /**
   * Start processing hand frames.
   */
  start(handFrames$: Observable<HandFrame>): void {
    this.stop();

    this.subscription = handFrames$
      .pipe(map((frame) => this.processFrame(frame)))
      .subscribe((state) => {
        this.stateSubject.next(state);
      });
  }

  /**
   * Stop processing.
   */
  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /**
   * Update configuration.
   */
  updateConfig(config: PartialControllerConfig): void {
    this._config = this.mergeConfig(this._config, config);

    // Update individual controllers
    if (config.position) {
      this.positionController.updateConfig(config.position);
    }
    if (config.gesture) {
      this.gestureController.updateConfig(config.gesture);
    }
    if (config.distance) {
      this.distanceController.updateConfig(config.distance);
    }
  }

  /**
   * Get the current control state.
   */
  getCurrentState(): ControlState {
    return this.stateSubject.getValue();
  }

  /**
   * Reset all controllers.
   */
  reset(): void {
    this.controllers.forEach((controller) => controller.reset());
    this.stateSubject.next(createEmptyControlState());
    this.lastTimestamp = 0;
  }

  /**
   * Process a single hand frame through all controllers.
   */
  private processFrame(frame: HandFrame): ControlState {
    const deltaTime = this.lastTimestamp > 0 ? frame.timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = frame.timestamp;

    // Start with empty state
    let state = createEmptyControlState();
    state.timestamp = frame.timestamp;
    state.deltaTime = deltaTime;

    // Process through each controller in sequence
    // Position must come first as it creates the hand states
    state = this.positionController.process(frame, state);
    state = this.gestureController.process(frame, state);
    state = this.distanceController.process(frame, state);

    return state;
  }

  /**
   * Deep merge configuration objects.
   */
  private mergeConfig(
    base: ControllerConfig,
    override?: PartialControllerConfig
  ): ControllerConfig {
    if (!override) {
      return { ...base };
    }

    return {
      position: { ...base.position, ...override.position },
      gesture: { ...base.gesture, ...override.gesture },
      distance: { ...base.distance, ...override.distance },
    };
  }

  /**
   * Get reference to position controller for direct access.
   */
  getPositionController(): PositionController {
    return this.positionController;
  }

  /**
   * Get reference to gesture controller for direct access.
   */
  getGestureController(): GestureController {
    return this.gestureController;
  }

  /**
   * Get reference to distance controller for direct access.
   */
  getDistanceController(): DistanceController {
    return this.distanceController;
  }
}

/**
 * Create a pre-configured ControllerManager.
 */
export function createControllerManager(config?: PartialControllerConfig): ControllerManager {
  return new ControllerManager(config);
}
