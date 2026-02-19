/**
 * Centralized game state with subscriber pattern.
 * All state mutations go through setState(), which notifies subscribers.
 */

const initialState = () => ({
  // ===== Participant =====
  participantId: '',
  group: null,          // 'A', 'B', 'C', or 'D'
  rewardAmount: 0,      // 5 or 10
  sequence: '',         // 'positive-first' or 'negative-first'

  // ===== Phase =====
  phase: 'intro',       // 'intro' | 'exposure' | 'transition' | 'condition' | 'end'
  conditionIndex: -1,   // 0–3 index into the group's conditionOrder
  conditionId: null,    // e.g. 'greatest-positive'

  // ===== Energy =====
  currentEnergy: 50,
  totalEnergyGained: 0,

  // ===== Condition Timer =====
  conditionStartTime: 0,
  conditionElapsedMs: 0,
  daysLeft: 5,

  // ===== Delay Adjustment =====
  currentDelayMs: 6000,

  // ===== Trial State =====
  trialNumber: 0,
  isAnimating: false,
  isWaitingDelay: false,
  isDead: false,
  choicesDisabled: false,

  // ===== Exposure Tracking =====
  exposureFishCount: 0,
  exposureLLCount: 0,
  exposureReady: false,

  // ===== Visibility =====
  tabHidden: false,
  pausedAt: null,
  totalPausedMs: 0,
});

let state = initialState();
const subscribers = new Set();

/**
 * Get a shallow copy of the current state.
 */
export function getState() {
  return { ...state };
}

/**
 * Get a single state value.
 */
export function get(key) {
  return state[key];
}

/**
 * Update state with partial object. Notifies all subscribers.
 */
export function setState(partial) {
  const prev = { ...state };
  Object.assign(state, partial);
  for (const fn of subscribers) {
    fn(state, prev);
  }
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Reset state to initial values (for a new session).
 */
export function resetState() {
  state = initialState();
}

export default { getState, get, setState, subscribe, resetState };
