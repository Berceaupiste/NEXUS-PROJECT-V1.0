const SCENARIO_KEY = 'nexus.scenarios.v1';
const PREFS_KEY = 'nexus.prefs.v1';

const DEFAULT_PREFS = { speed: 900, reduceMotion: false };

function canUseStorage() {
  try {
    const probe = '__nexus_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function isScenario(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.seedSystem === 'string' &&
    typeof value.seedCapacity === 'number' &&
    typeof value.horizon === 'number'
  );
}

export function loadSavedScenarios() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(SCENARIO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isScenario).slice(0, 50) : [];
  } catch {
    return [];
  }
}

export function saveScenario(scenario) {
  const existing = loadSavedScenarios();
  const next = [scenario, ...existing.filter((item) => item.id !== scenario.id)].slice(0, 50);
  window.localStorage.setItem(SCENARIO_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedScenario(id) {
  const next = loadSavedScenarios().filter((item) => item.id !== id);
  window.localStorage.setItem(SCENARIO_KEY, JSON.stringify(next));
  return next;
}

export function clearSavedScenarios() {
  if (canUseStorage()) window.localStorage.removeItem(SCENARIO_KEY);
}

export function loadPrefs() {
  if (!canUseStorage()) return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      speed: typeof parsed.speed === 'number' && parsed.speed >= 100 ? parsed.speed : DEFAULT_PREFS.speed,
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function persistPrefs(prefs) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage can be disabled; preferences simply remain session-only. */
  }
}
