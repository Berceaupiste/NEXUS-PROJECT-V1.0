import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SCENARIO } from '../data/scenarios.js';
import {
  applyOperatorLimit,
  createSimulation,
  runRecoveryScenario,
  runScenario,
  stepSimulation,
} from '../simulation/engine.js';
import { compareRuns, networkMetrics } from '../simulation/metrics.js';
import {
  clearSavedScenarios,
  deleteSavedScenario,
  loadPrefs,
  loadSavedScenarios,
  persistPrefs,
  saveScenario,
} from './storage.js';
import { SYSTEM_BY_ID } from '../data/systems.js';

const SimulationContext = createContext(null);

const SPEEDS = [
  { value: 1500, label: '0.5×' },
  { value: 900, label: '1×' },
  { value: 450, label: '2×' },
  { value: 200, label: '4×' },
];

export { SPEEDS };

function makeLiveScenario(source) {
  return {
    id: source.id ?? 'scenario-live',
    name: source.name ?? 'Grid capacity disturbance',
    seedSystem: source.seedSystem ?? 'electricity',
    seedCapacity: source.seedCapacity ?? 0.4,
    horizon: source.horizon ?? 36,
    description: source.description ?? '',
  };
}

export function SimulationProvider({ children }) {
  const [prefs, setPrefsState] = useState(() => loadPrefs());
  const [scenario, setScenarioState] = useState(() => makeLiveScenario(DEFAULT_SCENARIO));
  const [sim, setSim] = useState(() =>
    createSimulation({ seedSystem: 'electricity', seedCapacity: 0.4, horizon: 36 }),
  );
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(prefs.speed ?? 900);
  const [mode, setMode] = useState('disrupted');
  const [selectedSystemId, setSelectedSystemId] = useState('electricity');
  const [savedScenarios, setSavedScenarios] = useState(() => loadSavedScenarios());
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = 'info') => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    persistPrefs({ speed, reduceMotion: prefs.reduceMotion });
  }, [speed, prefs.reduceMotion]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', Boolean(prefs.reduceMotion));
  }, [prefs.reduceMotion]);

  useEffect(() => {
    if (!running) return undefined;
    if (sim.tick >= scenario.horizon) {
      setRunning(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setSim((previous) => {
        if (previous.tick >= scenario.horizon) return previous;
        return stepSimulation(previous);
      });
    }, speed);
    return () => clearTimeout(timer);
  }, [running, sim.tick, speed, scenario.horizon]);

  useEffect(() => {
    if (running && sim.tick >= scenario.horizon) setRunning(false);
  }, [running, sim.tick, scenario.horizon]);

  const rebuild = useCallback(
    (nextScenario) => {
      setRunning(false);
      setMode('disrupted');
      setSim(
        createSimulation({
          seedSystem: nextScenario.seedSystem,
          seedCapacity: nextScenario.seedCapacity,
          horizon: nextScenario.horizon,
        }),
      );
    },
    [],
  );

  const resetSimulation = useCallback(() => {
    rebuild(scenario);
  }, [rebuild, scenario]);

  /** Configuring a disruption is only meaningful from a clean tick-0 state. */
  const configureDisruption = useCallback(
    (systemId, capacity) => {
      if (sim.tick === 0) {
        const nextScenario = { ...scenario, seedSystem: systemId, seedCapacity: capacity };
        setScenarioState(nextScenario);
        setSim(
          createSimulation({
            seedSystem: systemId,
            seedCapacity: capacity,
            horizon: scenario.horizon,
          }),
        );
        setMode('disrupted');
      } else if (systemId === scenario.seedSystem) {
        setScenarioState({ ...scenario, seedCapacity: capacity });
        setSim((previous) => applyOperatorLimit(previous, systemId, capacity));
      }
    },
    [sim.tick, scenario],
  );

  const selectSystem = useCallback((systemId) => {
    if (SYSTEM_BY_ID[systemId]) setSelectedSystemId(systemId);
  }, []);

  const start = useCallback(() => {
    if (sim.tick >= scenario.horizon) {
      setSim(
        createSimulation({
          seedSystem: scenario.seedSystem,
          seedCapacity: scenario.seedCapacity,
          horizon: scenario.horizon,
        }),
      );
      setRunning(true);
      return;
    }
    setRunning(true);
  }, [sim.tick, scenario]);

  const pause = useCallback(() => setRunning(false), []);

  const step = useCallback(() => {
    setRunning(false);
    setSim((previous) => {
      if (previous.tick >= scenario.horizon) return previous;
      return stepSimulation(previous);
    });
  }, [scenario.horizon]);

  const restoreCapacity = useCallback(() => {
    if (!scenario.seedSystem) return;
    if (sim.tick === 0) {
      const nextScenario = { ...scenario, seedCapacity: 1 };
      setScenarioState(nextScenario);
      setSim(
        createSimulation({
          seedSystem: scenario.seedSystem,
          seedCapacity: 1,
          horizon: scenario.horizon,
        }),
      );
    } else {
      setSim((previous) => applyOperatorLimit(previous, scenario.seedSystem, 1));
    }
    notify('Operator output restored to 100%. Recovery follows repair parameters.', 'success');
  }, [scenario, sim.tick, notify]);

  const setHorizon = useCallback(
    (value) => {
      const horizon = Math.min(72, Math.max(6, Math.round(value / 6) * 6));
      const nextScenario = { ...scenario, horizon };
      setScenarioState(nextScenario);
      rebuild(nextScenario);
    },
    [scenario, rebuild],
  );

  const loadExample = useCallback(
    (example) => {
      const nextScenario = makeLiveScenario(example);
      setScenarioState(nextScenario);
      setSelectedSystemId(nextScenario.seedSystem);
      rebuild(nextScenario);
      notify(`Loaded “${nextScenario.name}” at 100% reset state.`, 'success');
    },
    [rebuild, notify],
  );

  const saveCurrentScenario = useCallback(
    (name) => {
      const saved = {
        id: `${scenario.id === 'scenario-live' ? 'saved' : scenario.id}-${Date.now()}`,
        name: name || scenario.name,
        seedSystem: scenario.seedSystem,
        seedCapacity: mode === 'baseline' ? scenario.seedCapacity : scenario.seedCapacity,
        horizon: scenario.horizon,
        description: scenario.description,
        savedAt: new Date().toISOString(),
      };
      try {
        const next = saveScenario(saved);
        setSavedScenarios(next);
        setScenarioState((previous) => ({ ...previous, ...saved }));
        notify(`Saved “${saved.name}” to local storage.`, 'success');
        return true;
      } catch (error) {
        notify('Could not save scenario: local storage is unavailable.', 'error');
        return false;
      }
    },
    [scenario, mode, notify],
  );

  const removeSavedScenario = useCallback(
    (id) => {
      setSavedScenarios(deleteSavedScenario(id));
      notify('Saved scenario deleted.', 'info');
    },
    [notify],
  );

  const removeAllSaved = useCallback(() => {
    clearSavedScenarios();
    setSavedScenarios([]);
    notify('All saved scenarios removed.', 'info');
  }, [notify]);

  const setPrefs = useCallback((patch) => {
    setPrefsState((previous) => ({ ...previous, ...patch }));
  }, []);

  const baselineRun = useMemo(
    () =>
      runScenario(
        { seedSystem: null, seedCapacity: 1, horizon: scenario.horizon },
        { horizon: scenario.horizon, baseline: true },
      ),
    [scenario.horizon],
  );

  const canonicalDisruptedRun = useMemo(
    () => runScenario(scenario, { horizon: scenario.horizon }),
    [scenario],
  );

  const recoveryRun = useMemo(
    () =>
      runRecoveryScenario(scenario, {
        horizon: scenario.horizon,
        restoreAtTick: Math.max(3, Math.min(12, Math.floor(scenario.horizon / 3))),
      }),
    [scenario],
  );

  const comparison = useMemo(
    () => compareRuns(canonicalDisruptedRun, baselineRun),
    [canonicalDisruptedRun, baselineRun],
  );

  const viewedSnapshot = useMemo(() => {
    if (mode === 'baseline') {
      const index = Math.min(sim.tick, baselineRun.snapshots.length - 1);
      return baselineRun.snapshots[index];
    }
    return sim.snapshots[sim.tick] ?? sim.snapshots[sim.snapshots.length - 1];
  }, [mode, sim.tick, sim.snapshots, baselineRun]);

  const totalTicks = scenario.horizon;
  const isComplete = sim.tick >= totalTicks;
  const stateLabel = running
    ? 'Simulation running'
    : isComplete
      ? 'Horizon reached'
      : sim.tick === 0
        ? 'Ready'
        : 'Paused';

  const selectedSystem = viewedSnapshot.systems[selectedSystemId];

  const viewedRunForMetrics = useMemo(() => {
    if (mode !== 'baseline') return sim;
    return {
      ...baselineRun,
      tick: sim.tick,
      snapshots: baselineRun.snapshots.slice(0, sim.tick + 1),
      events: baselineRun.events.filter((event) => event.tick <= sim.tick),
    };
  }, [mode, sim, baselineRun]);

  const network = useMemo(() => networkMetrics(viewedRunForMetrics), [viewedRunForMetrics]);

  const value = {
    prefs,
    setPrefs,
    scenario,
    sim,
    viewedSnapshot,
    mode,
    setMode,
    speed,
    setSpeed,
    running,
    isComplete,
    stateLabel,
    horizon: totalTicks,
    selectedSystemId,
    selectedSystem,
    selectSystem,
    start,
    pause,
    step,
    resetSimulation,
    configureDisruption,
    restoreCapacity,
    setHorizon,
    baselineRun,
    canonicalDisruptedRun,
    recoveryRun,
    comparison,
    savedScenarios,
    saveCurrentScenario,
    loadExample,
    removeSavedScenario,
    removeAllSaved,
    notify,
    toast,
    network,
    canConfigure: sim.tick === 0,
    isBaselineView: mode === 'baseline',
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used inside SimulationProvider');
  return context;
}
