/**
 * UI rendering: energy bar, HUD updates, animal rendering.
 * Subscribes to state changes for reactive updates.
 */

import CONFIG from './config.js';
import { get, subscribe } from './state.js';

// ===== DOM References =====
const dom = {};

export function cacheDom() {
  // Exposure screen
  dom.exposureDaysLeft = document.getElementById('exposure-days-left');
  dom.exposureCurrentEnergy = document.getElementById('exposure-current-energy');
  dom.exposureTotalEnergy = document.getElementById('exposure-total-energy');
  dom.exposureEnergyBar = document.getElementById('exposure-energy-bar');
  dom.exposureAlligator = document.getElementById('exposure-alligator');
  dom.exposureFish = document.getElementById('exposure-fish');
  dom.exposureLL = document.getElementById('exposure-ll');
  dom.exposureRequirement = document.getElementById('exposure-requirement');
  dom.btnReady = document.getElementById('btn-ready');

  // Condition screen
  dom.conditionDaysLeft = document.getElementById('condition-days-left');
  dom.conditionCurrentEnergy = document.getElementById('condition-current-energy');
  dom.conditionTotalEnergy = document.getElementById('condition-total-energy');
  dom.conditionEnergyBar = document.getElementById('condition-energy-bar');
  dom.conditionAlligator = document.getElementById('condition-alligator');
  dom.conditionFish = document.getElementById('condition-fish');
  dom.conditionLL = document.getElementById('condition-ll');
  dom.conditionLLEmoji = document.getElementById('condition-ll-emoji');
  dom.conditionZoneRight = document.getElementById('condition-zone-right');
  dom.gameOverOverlay = document.getElementById('game-over-overlay');
  dom.gameOverTimer = document.getElementById('game-over-timer');
  dom.delayIndicator = document.getElementById('delay-indicator');
  dom.delayCountdown = document.getElementById('delay-countdown');

  // Transition screen
  dom.transitionTitle = document.getElementById('transition-title');
  dom.transitionMessage = document.getElementById('transition-message');
  dom.transitionAnimalPreview = document.getElementById('transition-animal-preview');

  // End screen
  dom.endSummary = document.getElementById('end-summary');
}

/**
 * Build 100 energy squares inside a container element.
 * 25 red (indices 0–24), 25 orange (25–49), 25 yellow (50–74), 25 green (75–99).
 */
export function buildEnergyBar(container) {
  container.innerHTML = '';
  const colors = ['red', 'orange', 'yellow', 'green'];
  for (let i = 0; i < 100; i++) {
    const sq = document.createElement('div');
    sq.className = `energy-square ${colors[Math.floor(i / 25)]}`;
    sq.dataset.index = i;
    container.appendChild(sq);
  }
}

/**
 * Update energy bar to reflect current energy level.
 * Squares disappear right-to-left (highest index first) as energy drains.
 * @param {HTMLElement} container - the energy bar container
 * @param {number} energy - current energy (0–100)
 */
export function updateEnergyBar(container, energy) {
  const squares = container.children;
  const filledCount = Math.max(0, Math.min(100, Math.round(energy)));
  for (let i = 0; i < 100; i++) {
    if (i < filledCount) {
      squares[i].classList.remove('depleted');
    } else {
      squares[i].classList.add('depleted');
    }
  }
}

/**
 * Update HUD displays for a given screen prefix.
 */
export function updateHUD(prefix) {
  const daysEl = dom[`${prefix}DaysLeft`];
  const energyEl = dom[`${prefix}CurrentEnergy`];
  const totalEl = dom[`${prefix}TotalEnergy`];
  const barEl = dom[`${prefix}EnergyBar`];

  if (daysEl) daysEl.textContent = get('daysLeft');
  if (energyEl) energyEl.textContent = Math.max(0, Math.round(get('currentEnergy')));
  if (totalEl) totalEl.textContent = Math.round(get('totalEnergyGained'));
  if (barEl) updateEnergyBar(barEl, get('currentEnergy'));
}

/**
 * Configure the condition screen's larger-later button with the right animal.
 */
export function setConditionAnimal(conditionId) {
  const cond = CONFIG.CONDITIONS[conditionId];
  if (!cond) return;
  dom.conditionLLEmoji.textContent = cond.emoji;
  dom.conditionLLEmoji.className = `animal ${cond.animal}`;

  // Update right-zone habitat background
  dom.conditionZoneRight.className = `zone-right habitat-${cond.habitat}`;

  // Update LL button zone-color class
  dom.conditionLL.className = 'animal-btn choice-btn ' +
    (cond.habitat === 'water' ? 'water-choice' :
     cond.habitat === 'shore' ? 'shore-choice' : 'land-choice');
}

/**
 * Show/hide game-over overlay.
 */
export function showGameOver(visible) {
  dom.gameOverOverlay.classList.toggle('hidden', !visible);
  if (visible) {
    const prefix = get('phase') === 'exposure' ? 'exposure' : 'condition';
    dom[`${prefix}Alligator`].classList.add('dead');
  }
}

/**
 * Update game-over timer display.
 */
export function updateGameOverTimer(secondsLeft) {
  dom.gameOverTimer.textContent = `${secondsLeft}s remaining`;
}

/**
 * Show/hide delay indicator and update countdown.
 */
export function showDelayIndicator(visible, seconds = 0) {
  dom.delayIndicator.classList.toggle('hidden', !visible);
  if (visible) {
    dom.delayCountdown.textContent = `${Math.ceil(seconds)}s`;
  }
}

/**
 * Enable/disable choice buttons.
 */
export function setChoicesEnabled(prefix, enabled) {
  const fishBtn = dom[`${prefix}Fish`];
  const llBtn = dom[`${prefix}LL`];
  if (fishBtn) fishBtn.disabled = !enabled;
  if (llBtn) llBtn.disabled = !enabled;
}

/**
 * Update exposure requirement text.
 */
export function updateExposureStatus() {
  const fishCount = get('exposureFishCount');
  const llCount = get('exposureLLCount');
  const fishDone = fishCount >= CONFIG.EXPOSURE_MIN_FISH;
  const llDone = llCount >= CONFIG.EXPOSURE_MIN_LL;

  dom.exposureRequirement.textContent =
    `Fish: ${fishCount}/${CONFIG.EXPOSURE_MIN_FISH} ${fishDone ? '✓' : ''} | ` +
    `Chicken: ${llCount}/${CONFIG.EXPOSURE_MIN_LL} ${llDone ? '✓' : ''}`;

  dom.btnReady.disabled = !(fishDone && llDone);
}

/**
 * Set transition screen content.
 */
export function setTransitionContent(conditionId, conditionNumber) {
  const cond = CONFIG.CONDITIONS[conditionId];
  dom.transitionTitle.textContent = `Round ${conditionNumber} of 4`;
  dom.transitionMessage.textContent = `A new food source has appeared: ${cond.animal}!`;
  dom.transitionAnimalPreview.textContent = cond.emoji;
}

/**
 * Reset condition screen visuals for a new condition.
 */
export function resetConditionVisuals() {
  dom.conditionAlligator.classList.remove('dead', 'eating');
  dom.conditionAlligator.classList.add('swimming');
  showGameOver(false);
  showDelayIndicator(false);
  dom.conditionLL.classList.remove('waiting');
}

/**
 * Get DOM reference by key.
 */
export function getDom(key) {
  return dom[key];
}
