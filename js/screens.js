/**
 * Screen flow controller.
 * Manages transitions: intro → exposure → [transition → condition]×4 → end
 */

import CONFIG from './config.js';
import { get, setState } from './state.js';
import { stopAllTimers } from './timer.js';
import {
  cacheDom, buildEnergyBar, updateHUD, setConditionAnimal,
  setChoicesEnabled, updateExposureStatus, setTransitionContent,
  resetConditionVisuals, showGameOver, getDom,
} from './ui.js';
import {
  startDrain, stopDrain, startConditionTimer, stopConditionTimer,
  handleFishChoice, handleLLChoice, resetForNewPhase,
} from './engine.js';
import { recordConditionSummary, downloadAllData, getEndSummaryText } from './data.js';

// ===== Screen Management =====

const screens = {};

function initScreens() {
  screens.intro = document.getElementById('screen-intro');
  screens.exposure = document.getElementById('screen-exposure');
  screens.transition = document.getElementById('screen-transition');
  screens.condition = document.getElementById('screen-condition');
  screens.end = document.getElementById('screen-end');
}

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('active', key === name);
  }
}

// ===== Random Group Assignment =====

function assignGroup() {
  const groups = Object.keys(CONFIG.GROUPS);
  const group = groups[Math.floor(Math.random() * groups.length)];
  const groupConfig = CONFIG.GROUPS[group];
  setState({
    group,
    rewardAmount: groupConfig.rewardAmount,
    sequence: groupConfig.sequence,
  });
}

// ===== Intro Screen =====

function setupIntro() {
  const input = document.getElementById('participant-id');
  const btn = document.getElementById('btn-start');

  input.addEventListener('input', () => {
    btn.disabled = input.value.trim().length === 0;
  });

  btn.addEventListener('click', () => {
    setState({ participantId: input.value.trim() });
    assignGroup();
    startExposure();
  });
}

// ===== Exposure Phase =====

function startExposure() {
  setState({
    phase: 'exposure',
    conditionId: null,
    exposureFishCount: 0,
    exposureLLCount: 0,
    exposureReady: false,
  });
  resetForNewPhase();

  showScreen('exposure');

  // Build energy bar
  const bar = document.getElementById('exposure-energy-bar');
  buildEnergyBar(bar);
  updateHUD('exposure');
  updateExposureStatus();
  setChoicesEnabled('exposure', true);

  // Wire choice buttons
  const fishBtn = document.getElementById('exposure-fish');
  const llBtn = document.getElementById('exposure-ll');
  fishBtn.onclick = handleFishChoice;
  llBtn.onclick = handleLLChoice;

  // Wire ready button
  const readyBtn = document.getElementById('btn-ready');
  readyBtn.onclick = () => {
    // Record exposure summary
    recordConditionSummary();
    stopAllTimers();
    startConditionSequence();
  };

  // Start drain at exposure rate (greatest-positive)
  startDrain(CONFIG.EXPOSURE_DRAIN_INTERVAL_MS);

  // Start exposure timer (5 min max)
  startConditionTimer(() => {
    // Time's up — force end of exposure
    recordConditionSummary();
    stopAllTimers();
    startConditionSequence();
  });
}

// ===== Condition Sequence =====

function startConditionSequence() {
  setState({ conditionIndex: -1 });
  nextCondition();
}

function nextCondition() {
  const idx = get('conditionIndex') + 1;
  const group = get('group');
  const groupConfig = CONFIG.GROUPS[group];
  const conditionOrder = groupConfig.conditionOrder;

  if (idx >= conditionOrder.length) {
    // All conditions complete
    endGame();
    return;
  }

  setState({ conditionIndex: idx });
  const conditionId = conditionOrder[idx];

  // Show transition screen
  setTransitionContent(conditionId, idx + 1);
  showScreen('transition');
  setState({ phase: 'transition' });

  const continueBtn = document.getElementById('btn-continue');
  continueBtn.onclick = () => {
    startCondition(conditionId);
  };
}

function startCondition(conditionId) {
  const cond = CONFIG.CONDITIONS[conditionId];

  setState({
    phase: 'condition',
    conditionId,
  });
  resetForNewPhase();
  resetConditionVisuals();

  showScreen('condition');

  // Build energy bar
  const bar = document.getElementById('condition-energy-bar');
  buildEnergyBar(bar);

  // Set condition animal
  setConditionAnimal(conditionId);
  updateHUD('condition');
  setChoicesEnabled('condition', true);

  // Wire choice buttons
  const fishBtn = document.getElementById('condition-fish');
  const llBtn = document.getElementById('condition-ll');
  fishBtn.onclick = handleFishChoice;
  llBtn.onclick = handleLLChoice;

  // Start drain at condition-specific rate
  startDrain(cond.drainIntervalMs);

  // Start condition timer
  startConditionTimer(() => {
    // Condition time expired
    recordConditionSummary();
    stopAllTimers();
    nextCondition();
  });
}

// ===== End Screen =====

function endGame() {
  setState({ phase: 'end' });
  stopAllTimers();
  showScreen('end');

  // Show summary
  const summaryEl = document.getElementById('end-summary');
  summaryEl.textContent = getEndSummaryText();
  summaryEl.style.whiteSpace = 'pre-line';

  // Wire download button
  const downloadBtn = document.getElementById('btn-download');
  downloadBtn.onclick = downloadAllData;
}

// ===== Beforeunload Warning =====

function setupBeforeunload() {
  window.addEventListener('beforeunload', (e) => {
    const phase = get('phase');
    if (phase !== 'intro' && phase !== 'end') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ===== Public Init =====

export function initScreenFlow() {
  initScreens();
  cacheDom();
  setupIntro();
  setupBeforeunload();
}
