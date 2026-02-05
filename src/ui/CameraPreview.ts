/**
 * Camera Preview Component
 *
 * Handles webcam access and video element management.
 */

/**
 * Camera permission status.
 */
export type CameraPermissionStatus = 'prompt' | 'granted' | 'denied' | 'error';

/**
 * Camera configuration options.
 */
export interface CameraConfig {
  /** Preferred width (actual may differ based on device) */
  width: number;

  /** Preferred height */
  height: number;

  /** Preferred facing mode */
  facingMode: 'user' | 'environment';
}

/**
 * Default camera configuration.
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  width: 640,
  height: 480,
  facingMode: 'user',
};

/**
 * Camera Preview manager.
 */
export class CameraPreview {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private config: CameraConfig;

  /**
   * Create a new CameraPreview instance.
   */
  constructor(config: Partial<CameraConfig> = {}) {
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
  }

  /**
   * Initialize the camera with a video element.
   *
   * @param videoElement - The video element to display the camera feed
   * @returns Promise that resolves when camera is ready
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          facingMode: this.config.facingMode,
        },
        audio: false,
      });

      // Set video source
      this.videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('Video element not available'));
          return;
        }

        this.videoElement.onloadedmetadata = (): void => {
          resolve();
        };

        this.videoElement.onerror = (): void => {
          reject(new Error('Failed to load video'));
        };
      });

      // Start playing
      await this.videoElement.play();
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      throw new Error(`Camera initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Check camera permission status.
   */
  async checkPermission(): Promise<CameraPermissionStatus> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state as CameraPermissionStatus;
    } catch {
      // Permissions API not supported, return prompt as default
      return 'prompt';
    }
  }

  /**
   * Get the video element.
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  /**
   * Get video dimensions.
   */
  getDimensions(): { width: number; height: number } {
    if (!this.videoElement) {
      return { width: this.config.width, height: this.config.height };
    }

    return {
      width: this.videoElement.videoWidth || this.config.width,
      height: this.videoElement.videoHeight || this.config.height,
    };
  }

  /**
   * Stop the camera stream.
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.stop();
    this.videoElement = null;
  }

  /**
   * Get user-friendly error message.
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Camera access was denied. Please grant permission to use the camera.';
        case 'NotFoundError':
          return 'No camera found. Please connect a camera and try again.';
        case 'NotReadableError':
          return 'Camera is in use by another application.';
        case 'OverconstrainedError':
          return 'Camera does not meet the required constraints.';
        default:
          return error.message;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error occurred';
  }
}
