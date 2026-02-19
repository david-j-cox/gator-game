/**
 * Core game engine: point drain, trial flow, delay adjustment,
 * game-over detection, condition timing.
 */

import CONFIG from './config.js';
import { get, setState } from './state.js';
import { createTimer, createDelay, stopAllTimers } from './timer.js';
import {
  updateHUD, showGameOver, updateGameOverTimer,
  showDelayIndicator, setChoicesEnabled, getDom,
  updateExposureStatus,
} from './ui.js';
import { playEatingAnimation, interruptAnimation } from './animations.js';
import { recordTrial } from './data.js';

let drainTimer = null;
let conditionCountdown = null;
let activeDelay = null;
let delayCountdownTimer = null;

// ===== Point Drain =====

/**
 * Start continuous point drain at the given interval.
 * Drains 1 point per tick. Checks for game-over after each drain.
 */
export function startDrain(intervalMs) {
  drainTimer = createTimer(() => {
    const energy = get('currentEnergy');
    if (energy <= 0) return; // already dead
    const newEnergy = Math.max(0, energy - 1);
    setState({ currentEnergy: newEnergy });

    // Update UI
    const prefix = get('phase') === 'exposure' ? 'exposure' : 'condition';
    updateHUD(prefix);

    // Check game-over
    if (newEnergy <= 0) {
      triggerGameOver();
    }
  }, intervalMs, 'drain');
}

export function stopDrain() {
  if (drainTimer) {
    drainTimer.stop();
    drainTimer = null;
  }
}

// ===== Game Over =====

function triggerGameOver() {
  setState({ isDead: true, choicesDisabled: true });

  const prefix = get('phase') === 'exposure' ? 'exposure' : 'condition';
  setChoicesEnabled(prefix, false);

  // Interrupt any running animation
  const alligatorEl = getDom(`${prefix}Alligator`);
  if (alligatorEl) interruptAnimation(alligatorEl);

  // Cancel any active delay
  if (activeDelay) {
    activeDelay.cancel();
    activeDelay = null;
  }
  if (delayCountdownTimer) {
    delayCountdownTimer.stop();
    delayCountdownTimer = null;
  }

  // Show game-over overlay and hide delay indicator
  showGameOver(true);
  showDelayIndicator(false);

  // Stop the drain (no more points to lose)
  stopDrain();
}

// ===== Condition Timer =====

/**
 * Start the 5-minute condition timer.
 * Updates "Days Left" display. Calls onComplete when time expires.
 */
export function startConditionTimer(onComplete) {
  const duration = CONFIG.CONDITION_DURATION_MS;
  const dayLength = duration / CONFIG.DAYS_PER_CONDITION; // 1 minute per "day"
  let lastDay = CONFIG.DAYS_PER_CONDITION;

  conditionCountdown = createTimer(() => {
    const elapsed = get('conditionElapsedMs') + 1000;
    setState({ conditionElapsedMs: elapsed });

    // Update "Days Left"
    const remaining = Math.max(0, duration - elapsed);
    const daysLeft = Math.min(CONFIG.DAYS_PER_CONDITION, Math.ceil(remaining / dayLength));
    if (daysLeft !== lastDay) {
      lastDay = daysLeft;
      setState({ daysLeft });
      const prefix = get('phase') === 'exposure' ? 'exposure' : 'condition';
      updateHUD(prefix);
    }

    // Update game-over timer if dead
    if (get('isDead')) {
      const secsLeft = Math.ceil(remaining / 1000);
      updateGameOverTimer(secsLeft);
    }

    // Check if condition is over
    if (remaining <= 0) {
      conditionCountdown.stop();
      conditionCountdown = null;
      onComplete();
    }
  }, 1000, 'condition-countdown');
}

export function stopConditionTimer() {
  if (conditionCountdown) {
    conditionCountdown.stop();
    conditionCountdown = null;
  }
}

// ===== Trial Flow =====

/**
 * Handle a smaller-sooner (fish) choice.
 */
export async function handleFishChoice() {
  if (get('choicesDisabled') || get('isDead') || get('isAnimating') || get('isWaitingDelay')) return;

  const phase = get('phase');
  const prefix = phase === 'exposure' ? 'exposure' : 'condition';
  const trialNum = get('trialNumber') + 1;

  setState({
    trialNumber: trialNum,
    isAnimating: true,
    choicesDisabled: true,
  });
  setChoicesEnabled(prefix, false);

  const energyBefore = get('currentEnergy');
  const alligatorEl = getDom(`${prefix}Alligator`);
  const foodEl = getDom(`${prefix}Fish`)?.querySelector('.animal');

  // Play eating animation
  await playEatingAnimation(alligatorEl, foodEl, CONFIG.SMALLER_SOONER_DELAY_MS);

  // Check if died during animation
  if (get('isDead')) {
    setState({ isAnimating: false });
    return;
  }

  // Award points
  const reward = CONFIG.SMALLER_SOONER_REWARD;
  const newEnergy = Math.min(CONFIG.MAX_ENERGY, get('currentEnergy') + reward);
  const totalGained = get('totalEnergyGained') + reward;
  setState({
    currentEnergy: newEnergy,
    totalEnergyGained: totalGained,
    isAnimating: false,
    choicesDisabled: false,
  });

  updateHUD(prefix);
  setChoicesEnabled(prefix, true);

  // Record delay before adjustment
  const delayAtChoice = get('currentDelayMs');

  // Adjust delay: fish chosen → increase delay (LL wasn't chosen)
  adjustDelay('increase');

  // Record trial
  recordTrial({
    choice: 'smaller-sooner',
    delayAtChoice,
    pointsEarned: reward,
    energyBefore,
    energyAfter: newEnergy,
  });

  // Exposure tracking
  if (phase === 'exposure') {
    setState({ exposureFishCount: get('exposureFishCount') + 1 });
    updateExposureStatus();
  }
}

/**
 * Handle a larger-later choice.
 */
export async function handleLLChoice() {
  if (get('choicesDisabled') || get('isDead') || get('isAnimating') || get('isWaitingDelay')) return;

  const phase = get('phase');
  const prefix = phase === 'exposure' ? 'exposure' : 'condition';
  const trialNum = get('trialNumber') + 1;
  const delayMs = get('currentDelayMs');

  setState({
    trialNumber: trialNum,
    isWaitingDelay: true,
    choicesDisabled: true,
  });
  setChoicesEnabled(prefix, false);

  const energyBefore = get('currentEnergy');

  // Show delay indicator and mark the LL button as waiting
  showDelayIndicator(true, delayMs / 1000);
  const llBtn = getDom(`${prefix}LL`);
  if (llBtn) llBtn.classList.add('waiting');

  // Start a visual countdown for the delay
  let delayRemaining = delayMs;
  delayCountdownTimer = createTimer(() => {
    delayRemaining -= 100;
    if (delayRemaining > 0) {
      showDelayIndicator(true, delayRemaining / 1000);
    }
  }, 100, 'delay-visual');

  // Wait for the delay
  activeDelay = createDelay(delayMs);
  const completed = await activeDelay.promise;
  activeDelay = null;

  // Stop visual countdown
  if (delayCountdownTimer) {
    delayCountdownTimer.stop();
    delayCountdownTimer = null;
  }
  showDelayIndicator(false);
  if (llBtn) llBtn.classList.remove('waiting');

  // If cancelled (game-over during delay), bail out
  if (!completed || get('isDead')) {
    setState({ isWaitingDelay: false, isAnimating: false });
    return;
  }

  // Play eating animation
  setState({ isWaitingDelay: false, isAnimating: true });
  const alligatorEl = getDom(`${prefix}Alligator`);
  const foodEl = getDom(`${prefix}LL`)?.querySelector('.animal');
  await playEatingAnimation(alligatorEl, foodEl, CONFIG.EATING_ANIMATION_MS);

  // Check if died during animation
  if (get('isDead')) {
    setState({ isAnimating: false });
    return;
  }

  // Award points
  const reward = phase === 'exposure' ? CONFIG.EXPOSURE_REWARD : get('rewardAmount');
  const newEnergy = Math.min(CONFIG.MAX_ENERGY, get('currentEnergy') + reward);
  const totalGained = get('totalEnergyGained') + reward;
  setState({
    currentEnergy: newEnergy,
    totalEnergyGained: totalGained,
    isAnimating: false,
    choicesDisabled: false,
  });

  updateHUD(prefix);
  setChoicesEnabled(prefix, true);

  // Adjust delay: LL chosen → decrease delay (make LL less attractive by shortening wait)
  adjustDelay('decrease');

  // Record trial
  recordTrial({
    choice: 'larger-later',
    delayAtChoice: delayMs,
    pointsEarned: reward,
    energyBefore,
    energyAfter: newEnergy,
  });

  // Exposure tracking
  if (phase === 'exposure') {
    setState({ exposureLLCount: get('exposureLLCount') + 1 });
    updateExposureStatus();
  }
}

// ===== Delay Adjustment =====

/**
 * Adjust the delay for the larger-later option.
 * - If fish was chosen (SS): increase delay by step (LL becomes less attractive)
 * - If LL was chosen: decrease delay by step (LL becomes less attractive — shorter wait needed)
 */
function adjustDelay(direction) {
  const current = get('currentDelayMs');
  let newDelay;
  if (direction === 'increase') {
    newDelay = current + CONFIG.DELAY_STEP_MS;
  } else {
    newDelay = Math.max(CONFIG.MIN_DELAY_MS, current - CONFIG.DELAY_STEP_MS);
  }
  setState({ currentDelayMs: newDelay });
}

// ===== Reset for New Condition =====

/**
 * Reset engine state for a new condition or exposure phase.
 */
export function resetForNewPhase() {
  stopAllTimers();
  drainTimer = null;
  conditionCountdown = null;
  activeDelay = null;
  delayCountdownTimer = null;

  setState({
    currentEnergy: CONFIG.STARTING_ENERGY,
    currentDelayMs: CONFIG.INITIAL_DELAY_MS,
    trialNumber: 0,
    isAnimating: false,
    isWaitingDelay: false,
    isDead: false,
    choicesDisabled: false,
    conditionElapsedMs: 0,
    daysLeft: CONFIG.DAYS_PER_CONDITION,
  });
}
