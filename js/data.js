/**
 * Data collection: trial recording, condition summaries, CSV export.
 */

import CONFIG from './config.js';
import { get } from './state.js';

// ===== Trial-Level Data =====
const trials = [];
const conditionSummaries = [];

/**
 * Record a single trial.
 * @param {Object} trialData - partial trial data from engine
 */
export function recordTrial(trialData) {
  const group = get('group');
  const groupConfig = CONFIG.GROUPS[group];

  trials.push({
    participantId: get('participantId'),
    group,
    rewardAmount: get('rewardAmount'),
    sequence: get('sequence'),
    phase: get('phase'),
    conditionId: get('conditionId') || 'exposure',
    conditionAnimal: get('phase') === 'exposure'
      ? CONFIG.EXPOSURE_ANIMAL
      : CONFIG.CONDITIONS[get('conditionId')]?.animal || '',
    trialNumber: get('trialNumber'),
    choice: trialData.choice,
    delayAtChoice: trialData.delayAtChoice,
    pointsEarned: trialData.pointsEarned,
    energyBefore: Math.round(trialData.energyBefore),
    energyAfter: Math.round(trialData.energyAfter),
    totalEnergyGained: Math.round(get('totalEnergyGained')),
    conditionElapsedMs: get('conditionElapsedMs'),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Record a condition summary when a condition ends.
 */
export function recordConditionSummary() {
  const conditionId = get('conditionId') || 'exposure';
  const phase = get('phase');

  // Count trials for this condition
  const condTrials = trials.filter(t => t.conditionId === conditionId && t.phase === phase);
  const ssCount = condTrials.filter(t => t.choice === 'smaller-sooner').length;
  const llCount = condTrials.filter(t => t.choice === 'larger-later').length;
  const totalPoints = condTrials.reduce((sum, t) => sum + t.pointsEarned, 0);

  conditionSummaries.push({
    participantId: get('participantId'),
    group: get('group'),
    conditionId,
    phase,
    finalDelay: get('currentDelayMs'),
    totalTrials: condTrials.length,
    smallerSoonerCount: ssCount,
    largerLaterCount: llCount,
    totalPointsEarned: totalPoints,
    diedDuringCondition: get('isDead'),
  });
}

/**
 * Get all recorded trials.
 */
export function getTrials() {
  return [...trials];
}

/**
 * Get all condition summaries.
 */
export function getSummaries() {
  return [...conditionSummaries];
}

/**
 * Generate CSV string from an array of objects.
 */
function toCSV(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

/**
 * Download trial-level data as CSV.
 */
export function downloadTrialCSV() {
  const csv = toCSV(trials);
  const pid = get('participantId') || 'unknown';
  downloadFile(`gator-game-trials-${pid}.csv`, csv);
}

/**
 * Download condition summary data as CSV.
 */
export function downloadSummaryCSV() {
  const csv = toCSV(conditionSummaries);
  const pid = get('participantId') || 'unknown';
  downloadFile(`gator-game-summary-${pid}.csv`, csv);
}

/**
 * Download both CSVs bundled together.
 */
export function downloadAllData() {
  downloadTrialCSV();
  // Small delay so browser doesn't block second download
  setTimeout(() => downloadSummaryCSV(), 500);
}

/**
 * Trigger a file download.
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get a text summary for the end screen.
 */
export function getEndSummaryText() {
  const lines = [];
  lines.push(`Participant: ${get('participantId')}`);
  lines.push(`Group: ${get('group')} (${get('rewardAmount')}-point reward, ${get('sequence')})`);
  lines.push('');
  for (const s of conditionSummaries) {
    const label = s.phase === 'exposure' ? 'Exposure' : CONFIG.CONDITIONS[s.conditionId]?.label || s.conditionId;
    lines.push(`${label}: ${s.totalTrials} trials (${s.smallerSoonerCount} SS, ${s.largerLaterCount} LL), ` +
      `final delay ${s.finalDelay}ms, ${s.totalPointsEarned} pts earned` +
      (s.diedDuringCondition ? ' [DIED]' : ''));
  }
  lines.push('');
  lines.push(`Total trials recorded: ${trials.length}`);
  return lines.join('\n');
}
