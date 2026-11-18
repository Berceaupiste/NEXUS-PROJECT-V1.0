import { describe, it, expect } from 'vitest';
import {
  createSimulation,
  stepSimulation,
  runScenario,
  runRecoveryScenario,
  snapshotAt,
} from '../simulation/engine.js';
import {
  compareRuns,
  buildCapacitySeries,
  buildComparisonSeries,
  networkMetrics,
  systemMetrics,
} from '../simulation/metrics.js';
import { SYSTEMS } from '../data/systems.js';
import { DEPENDENCIES } from '../data/dependencies.js';
import { EXAMPLE_SCENARIOS } from '../data/scenarios.js';

const scenario = {
  seedSystem: 'electricity',
  seedCapacity: 0.4,
  horizon: 36,
};

describe('dependency graph integrity', () => {
  it('contains only valid, unique, non-reflexive edges', () => {
    const ids = new Set();
    DEPENDENCIES.forEach((edge) => {
      expect(ids.has(edge.id)).toBe(false);
      ids.add(edge.id);
      expect(SYSTEMS.some((system) => system.id === edge.source)).toBe(true);
      expect(SYSTEMS.some((system) => system.id === edge.target)).toBe(true);
      expect(edge.source).not.toBe(edge.target);
      expect(edge.weight).toBeGreaterThan(0);
      expect(edge.weight).toBeLessThanOrEqual(1);
      expect(edge.threshold).toBeGreaterThan(0);
      expect(edge.threshold).toBeLessThanOrEqual(1);
      expect(Number.isInteger(edge.lag)).toBe(true);
      expect(edge.lag).toBeGreaterThanOrEqual(1);
    });
  });

  it('gives every system an incoming effect set except the root supply', () => {
    SYSTEMS.forEach((system) => {
      const incoming = DEPENDENCIES.filter((edge) => edge.target === system.id);
      if (system.id === 'electricity') expect(incoming).toHaveLength(0);
      else expect(incoming.length).toBeGreaterThan(0);
    });
  });
});

describe('analytics', () => {
  it('identifies every system as affected under a major grid disturbance', () => {
    const disrupted = runScenario(scenario);
    const compared = compareRuns(disrupted, runScenario(scenario, { baseline: true }));
    expect(compared.rows).toHaveLength(SYSTEMS.length);
    compared.rows.forEach((row) => {
      expect(row.disruptedAvgLos).toBeLessThan(row.baselineAvgLos);
      expect(row.peakImpact).toBeGreaterThan(0);
    });
    expect(compared.worstRow.deltaLos).toBeLessThan(0);
    expect(compared.disruptedNetwork.resilience).toBeLessThan(1);
  });

  it('leaves the baseline fully operational and resilient', () => {
    const baseline = runScenario(scenario, { baseline: true });
    const metrics = networkMetrics(baseline);
    expect(metrics.resilience).toBeCloseTo(1, 5);
    expect(metrics.impactedSystems).toBe(0);
    SYSTEMS.forEach((system) => {
      expect(systemMetrics(baseline, system.id).finalStatus).toBe('operational');
      expect(systemMetrics(baseline, system.id).minEffective).toBeCloseTo(1, 6);
    });
  });

  it('builds chart series with network and per-system capacity percentages', () => {
    const simulation = runScenario(scenario, { horizon: 4 });
    const series = buildCapacitySeries(simulation, ['water', 'healthcare']);
    expect(series).toHaveLength(5);
    expect(series[0]).toEqual({ tick: 0, network: 90, water: 100, healthcare: 100 });
    expect(series[4].water).toBeLessThan(100);
    expect(series[4].water).toBeGreaterThan(0);
  });

  it('builds a comparison series covering all systems', () => {
    const disrupted = runScenario(scenario);
    const baseline = runScenario(scenario, { baseline: true });
    const series = buildComparisonSeries(disrupted, baseline);
    expect(series.map((row) => row.name)).toEqual(SYSTEMS.map((system) => system.code));
    series.forEach((row) => {
      expect(row.baseline).toBeGreaterThan(80);
      expect(row.disrupted).toBeLessThan(row.baseline);
    });
  });

  it('records transitions and recovery events in chronological order', () => {
    const simulation = runScenario({ seedSystem: 'electricity', seedCapacity: 0.3, horizon: 20 });
    const ticks = simulation.events.map((event) => event.tick);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
    expect(simulation.events.some((event) => event.severity === 'critical')).toBe(true);
    expect(snapshotAt(simulation, 999)).toBe(simulation.snapshots[simulation.snapshots.length - 1]);
  });

  it('builds a deterministic canonical recovery experiment', () => {
    const recovery = runRecoveryScenario(
      { seedSystem: 'water', seedCapacity: 0.2, horizon: 30 },
      { restoreAtTick: 10 },
    );
    expect(recovery.restoreAtTick).toBe(10);
    expect(recovery.snapshots).toHaveLength(31);
    expect(recovery.events.some((event) => event.kind === 'action' && event.tick === 10)).toBe(true);

    const sourceAtRestore = recovery.snapshots[10].systems.water.effective;
    const sourceLater = recovery.snapshots[30].systems.water.effective;
    const dependentAtRestore = recovery.snapshots[10].systems.healthcare.effective;
    const dependentLater = recovery.snapshots[30].systems.healthcare.effective;
    expect(sourceAtRestore).toBeCloseTo(0.2, 5);
    expect(sourceLater).toBeCloseTo(1, 4);
    expect(dependentLater).toBeGreaterThan(dependentAtRestore);

    const again = runRecoveryScenario(
      { seedSystem: 'water', seedCapacity: 0.2, horizon: 30 },
      { restoreAtTick: 10 },
    );
    expect(JSON.stringify(again.snapshots)).toBe(JSON.stringify(recovery.snapshots));
  });

  it('ships reproducible example scenario definitions', () => {
    EXAMPLE_SCENARIOS.forEach((item) => {
      expect(SYSTEMS.some((system) => system.id === item.seedSystem)).toBe(true);
      expect(item.seedCapacity).toBeGreaterThan(0);
      expect(item.seedCapacity).toBeLessThan(1);
      expect(item.horizon).toBeGreaterThan(0);
      const first = runScenario(item);
      const second = runScenario(item);
      expect(first.snapshots[item.horizon].networkStress).toBe(
        second.snapshots[item.horizon].networkStress,
      );
    });
  });
});
