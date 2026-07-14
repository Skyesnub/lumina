export function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayKey(date = new Date()) {
  // Local-timezone Y-M-D key, used for streak day comparisons.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(dateKeyA, dateKeyB) {
  const a = new Date(dateKeyA + 'T00:00:00');
  const b = new Date(dateKeyB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

export function isOverdue(dueDateIso, status) {
  if (!dueDateIso || status === 'completed') return false;
  return new Date(dueDateIso) < new Date(new Date().toDateString());
}

export function relativeDay(dateKey) {
  const diff = daysBetween(dateKey, todayKey());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return formatDate(dateKey);
}
