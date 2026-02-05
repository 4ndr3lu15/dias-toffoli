/**
 * MediaPipe CDN Loader
 *
 * Dynamically loads MediaPipe Hands from CDN at runtime.
 * This is the recommended approach for MediaPipe in browser environments.
 */

import type { MediaPipeHandsConstructor } from '../types/mediapipe.types';

/** CDN base URL for MediaPipe Hands */
const MEDIAPIPE_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

/** MediaPipe Hands script URL */
const HANDS_SCRIPT_URL = `${MEDIAPIPE_CDN_BASE}/hands.js`;

/** Loading state */
let loadingPromise: Promise<MediaPipeHandsConstructor> | null = null;
let isLoaded = false;

/**
 * Progress callback for loading status.
 */
export type LoadingProgressCallback = (status: string, progress?: number) => void;

/**
 * Load MediaPipe Hands from CDN.
 *
 * @param onProgress - Optional callback for loading progress updates
 * @returns Promise that resolves with the Hands constructor
 */
export async function loadMediaPipeHands(
  onProgress?: LoadingProgressCallback
): Promise<MediaPipeHandsConstructor> {
  // Return cached constructor if already loaded
  if (isLoaded && window.Hands) {
    return window.Hands;
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = new Promise<MediaPipeHandsConstructor>((resolve, reject) => {
    onProgress?.('Loading MediaPipe Hands...', 0);

    // Check if already available (e.g., from a script tag)
    if (window.Hands) {
      isLoaded = true;
      onProgress?.('MediaPipe Hands ready', 100);
      resolve(window.Hands);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = HANDS_SCRIPT_URL;
    script.crossOrigin = 'anonymous';

    script.onload = (): void => {
      onProgress?.('Initializing MediaPipe...', 50);

      // Wait a tick for the script to initialize
      setTimeout(() => {
        if (window.Hands) {
          isLoaded = true;
          onProgress?.('MediaPipe Hands ready', 100);
          resolve(window.Hands);
        } else {
          reject(new Error('MediaPipe Hands failed to initialize'));
        }
      }, 100);
    };

    script.onerror = (): void => {
      loadingPromise = null;
      reject(new Error('Failed to load MediaPipe Hands from CDN'));
    };

    // Add script to document
    onProgress?.('Downloading MediaPipe...', 10);
    document.head.appendChild(script);
  });

  return loadingPromise;
}

/**
 * Get the CDN base URL for MediaPipe file location.
 * Used by MediaPipe to locate WASM and other files.
 */
export function getMediaPipeFileLocator(): (file: string) => string {
  return (file: string) => `${MEDIAPIPE_CDN_BASE}/${file}`;
}

/**
 * Check if MediaPipe Hands is loaded.
 */
export function isMediaPipeLoaded(): boolean {
  return isLoaded && !!window.Hands;
}

/**
 * Preload MediaPipe Hands (call early to reduce latency on first use).
 */
export function preloadMediaPipeHands(): void {
  void loadMediaPipeHands();
}
