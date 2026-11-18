import { TICK_HOURS } from './engine.js';

export function formatTick(tick) {
  const hours = Math.floor(tick * TICK_HOURS);
  return `T+${String(hours).padStart(2, '0')}:00`;
}

export function formatTickShort(tick) {
  return `+${tick}`;
}

export function formatClock(tick, startedAtHour = 0) {
  const total = startedAtHour + tick * TICK_HOURS;
  const hours = Math.floor(total) % 24;
  const minutes = Math.round((total % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 0) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCapacity(value, unit) {
  if (value >= 1000) return `${formatNumber(value)} ${unit}`;
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} ${unit}`;
}

export function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function severityLabel(severity) {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  if (severity === 'recovery') return 'Recovery';
  return 'Info';
}
