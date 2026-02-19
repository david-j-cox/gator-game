/**
 * Gator Game — Entry Point
 * Wires all modules together and starts the application.
 */

import { initVisibilityHandler } from './timer.js';
import { initScreenFlow } from './screens.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initVisibilityHandler();
  initScreenFlow();
});
