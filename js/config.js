/**
 * Experimental configuration — all constants for the Gator Game.
 * Frozen to prevent accidental mutation during a session.
 */

const CONFIG = Object.freeze({
  // ===== Timing =====
  CONDITION_DURATION_MS: 5 * 60 * 1000,   // 5 minutes per condition
  EXPOSURE_DURATION_MS: 5 * 60 * 1000,    // 5 minutes max for exposure
  DAYS_PER_CONDITION: 5,                   // "Days Left" counts 5→1

  // ===== Energy =====
  STARTING_ENERGY: 50,
  MAX_ENERGY: 100,
  MIN_ENERGY: 0,

  // ===== Choice Rewards =====
  SMALLER_SOONER_REWARD: 1,               // Fish: +1 point
  SMALLER_SOONER_DELAY_MS: 1000,          // Fish: 1s animation

  // ===== Adjusting Delay (Larger-Later) =====
  INITIAL_DELAY_MS: 6000,                 // Starting delay: 6s
  DELAY_STEP_MS: 2000,                    // Adjusts by ±2s
  MIN_DELAY_MS: 2000,                     // Floor: 2s

  // ===== Exposure Phase =====
  EXPOSURE_REWARD: 10,                    // Chicken gives +10 during exposure
  EXPOSURE_MIN_FISH: 3,                   // Must click fish ≥3 times
  EXPOSURE_MIN_LL: 3,                     // Must click chicken ≥3 times
  EXPOSURE_ANIMAL: 'chicken',
  EXPOSURE_ANIMAL_EMOJI: '🐔',
  EXPOSURE_DRAIN_INTERVAL_MS: 3000,       // Greatest-positive drain rate

  // ===== Earning Budget Conditions =====
  CONDITIONS: Object.freeze({
    'greatest-positive': Object.freeze({
      id: 'greatest-positive',
      animal: 'chicken',
      emoji: '🐔',
      drainIntervalMs: 3000,              // 1 pt per 3s
      label: 'Greatest Positive',
    }),
    'moderate-positive': Object.freeze({
      id: 'moderate-positive',
      animal: 'crab',
      emoji: '🦀',
      drainIntervalMs: 2000,              // 1 pt per 2s
      label: 'Moderate Positive',
    }),
    'small-negative': Object.freeze({
      id: 'small-negative',
      animal: 'turtle',
      emoji: '🐢',
      drainIntervalMs: 950,               // 1 pt per 0.95s
      label: 'Small Negative',
    }),
    'greatest-negative': Object.freeze({
      id: 'greatest-negative',
      animal: 'piranha',
      emoji: '🐡',
      drainIntervalMs: 500,               // 1 pt per 0.5s
      label: 'Greatest Negative',
    }),
  }),

  // ===== 2×2 Group Design =====
  // Sequence: order of conditions
  // Reward: larger-later reward amount
  GROUPS: Object.freeze({
    'A': Object.freeze({
      rewardAmount: 5,
      sequence: 'positive-first',
      conditionOrder: [
        'greatest-positive',
        'moderate-positive',
        'small-negative',
        'greatest-negative',
      ],
    }),
    'B': Object.freeze({
      rewardAmount: 5,
      sequence: 'negative-first',
      conditionOrder: [
        'greatest-negative',
        'small-negative',
        'moderate-positive',
        'greatest-positive',
      ],
    }),
    'C': Object.freeze({
      rewardAmount: 10,
      sequence: 'positive-first',
      conditionOrder: [
        'greatest-positive',
        'moderate-positive',
        'small-negative',
        'greatest-negative',
      ],
    }),
    'D': Object.freeze({
      rewardAmount: 10,
      sequence: 'negative-first',
      conditionOrder: [
        'greatest-negative',
        'small-negative',
        'moderate-positive',
        'greatest-positive',
      ],
    }),
  }),

  // ===== Animation =====
  EATING_ANIMATION_MS: 1000,              // Duration of eating animation
});

export default CONFIG;
