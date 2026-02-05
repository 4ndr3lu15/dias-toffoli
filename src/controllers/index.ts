/**
 * Controllers Module
 *
 * Exports all controller classes and interfaces.
 */

// Interfaces and types
export type {
  IController,
  IControllerManager,
  BaseControllerConfig,
  PositionControllerConfig,
  GestureControllerConfig,
  DistanceControllerConfig,
  ControllerConfig,
  PartialControllerConfig,
  HandProcessingResult,
} from './IController';
export { DEFAULT_CONTROLLER_CONFIG } from './IController';

// Controller implementations
export { PositionController } from './PositionController';
export { GestureController } from './GestureController';
export { DistanceController, hasDistances, getDistances } from './DistanceController';
export type { DistanceMeasurements } from './DistanceController';

// Controller Manager
export { ControllerManager, createControllerManager } from './ControllerManager';
