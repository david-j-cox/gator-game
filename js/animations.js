/**
 * Promise-based eating animation controller.
 * CSS class toggling drives the actual animation; this module
 * manages timing and returns Promises so trial flow can await completion.
 */

import CONFIG from './config.js';

/**
 * Play the eating animation on the alligator.
 * @param {HTMLElement} alligatorEl - the alligator element
 * @param {HTMLElement} foodEl - the food animal element inside the choice button
 * @param {number} durationMs - how long the animation lasts
 * @returns {Promise<void>} resolves when animation completes (or is interrupted)
 */
export function playEatingAnimation(alligatorEl, foodEl, durationMs = CONFIG.EATING_ANIMATION_MS) {
  return new Promise((resolve) => {
    // Start alligator chomp
    alligatorEl.classList.add('eating');

    // Start food consumed animation
    if (foodEl) {
      foodEl.classList.add('consumed');
    }

    const cleanup = () => {
      alligatorEl.classList.remove('eating');
      if (foodEl) {
        foodEl.classList.remove('consumed');
      }
      resolve();
    };

    // Store cleanup function on element so it can be interrupted
    alligatorEl._animCleanup = cleanup;

    setTimeout(() => {
      // Only clean up if not already interrupted
      if (alligatorEl._animCleanup === cleanup) {
        alligatorEl._animCleanup = null;
        cleanup();
      }
    }, durationMs);
  });
}

/**
 * Immediately interrupt any running eating animation on the alligator.
 * Used when energy hits 0 mid-animation for game-over.
 */
export function interruptAnimation(alligatorEl) {
  if (alligatorEl._animCleanup) {
    const cleanup = alligatorEl._animCleanup;
    alligatorEl._animCleanup = null;
    cleanup();
  }
}
