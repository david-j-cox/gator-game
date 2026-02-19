/**
 * Drift-corrected timing utilities for experimental accuracy.
 *
 * Uses setTimeout chains with drift correction rather than setInterval,
 * ensuring accurate long-term timing even when individual ticks drift.
 * Pauses automatically when the browser tab is hidden.
 */

import { get, setState, subscribe } from './state.js';

// ===== Active Timers Registry =====
const activeTimers = new Map();
let timerId = 0;

/**
 * Create a drift-corrected repeating timer.
 * @param {Function} callback - called each tick
 * @param {number} intervalMs - target interval in ms
 * @param {string} [label] - optional label for debugging
 * @returns {{ id: number, stop: Function }}
 */
export function createTimer(callback, intervalMs, label = '') {
  const id = ++timerId;
  let expected = performance.now() + intervalMs;
  let timeoutHandle = null;
  let paused = false;
  let remainingMs = 0;

  function tick() {
    if (paused) return;
    const now = performance.now();
    const drift = now - expected;
    callback();
    expected = now + intervalMs - Math.min(drift, intervalMs - 1);
    timeoutHandle = setTimeout(tick, Math.max(0, expected - performance.now()));
  }

  function stop() {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
    activeTimers.delete(id);
  }

  function pause() {
    if (paused) return;
    paused = true;
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
    remainingMs = Math.max(0, expected - performance.now());
  }

  function resume() {
    if (!paused) return;
    paused = false;
    expected = performance.now() + remainingMs;
    timeoutHandle = setTimeout(tick, remainingMs);
  }

  // Start
  timeoutHandle = setTimeout(tick, intervalMs);

  const timer = { id, stop, pause, resume, label };
  activeTimers.set(id, timer);
  return timer;
}

/**
 * Create a delay that resolves after the specified duration.
 * Returns a Promise + cancel function. Pauses when tab hidden.
 * @param {number} durationMs
 * @returns {{ promise: Promise<boolean>, cancel: Function }}
 */
export function createDelay(durationMs) {
  let timeoutHandle = null;
  let resolve;
  let paused = false;
  let remainingMs = durationMs;
  let startTime = performance.now();
  const id = ++timerId;

  const promise = new Promise((res) => {
    resolve = res;
    timeoutHandle = setTimeout(() => {
      activeTimers.delete(id);
      res(true); // completed naturally
    }, durationMs);
  });

  function cancel() {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
    activeTimers.delete(id);
    resolve(false); // cancelled
  }

  function pause() {
    if (paused) return;
    paused = true;
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
    remainingMs = Math.max(0, remainingMs - (performance.now() - startTime));
  }

  function resume() {
    if (!paused) return;
    paused = false;
    startTime = performance.now();
    timeoutHandle = setTimeout(() => {
      activeTimers.delete(id);
      resolve(true);
    }, remainingMs);
  }

  const timer = { id, stop: cancel, pause, resume, label: 'delay' };
  activeTimers.set(id, timer);

  return { promise, cancel };
}

/**
 * Create a countdown that calls back with remaining seconds.
 * Useful for the "Days Left" display and game-over timer.
 * @param {number} durationMs - total countdown duration
 * @param {Function} onTick - called each second with { remainingMs, remainingSec }
 * @param {Function} onComplete - called when countdown reaches 0
 * @returns {{ stop: Function }}
 */
export function createCountdown(durationMs, onTick, onComplete) {
  const startTime = performance.now();
  let elapsed = 0;

  const timer = createTimer(() => {
    elapsed += 1000;
    const remainingMs = Math.max(0, durationMs - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);
    onTick({ remainingMs, remainingSec, elapsed });
    if (remainingMs <= 0) {
      timer.stop();
      onComplete();
    }
  }, 1000, 'countdown');

  return timer;
}

/**
 * Stop all active timers. Used when changing phases or ending the game.
 */
export function stopAllTimers() {
  for (const [id, timer] of activeTimers) {
    timer.stop();
  }
  activeTimers.clear();
}

/**
 * Pause all active timers (e.g. when tab is hidden).
 */
export function pauseAllTimers() {
  for (const [id, timer] of activeTimers) {
    timer.pause();
  }
}

/**
 * Resume all active timers (e.g. when tab becomes visible).
 */
export function resumeAllTimers() {
  for (const [id, timer] of activeTimers) {
    timer.resume();
  }
}

/**
 * Initialize tab visibility handling.
 * Pauses all timers when tab is hidden, resumes when visible.
 */
export function initVisibilityHandler() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setState({ tabHidden: true, pausedAt: Date.now() });
      pauseAllTimers();
    } else {
      const pausedAt = get('pausedAt');
      const pauseDuration = pausedAt ? Date.now() - pausedAt : 0;
      setState({
        tabHidden: false,
        pausedAt: null,
        totalPausedMs: get('totalPausedMs') + pauseDuration,
      });
      resumeAllTimers();
    }
  });
}
