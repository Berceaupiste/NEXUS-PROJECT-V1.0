import { SYSTEMS } from '../data/systems.js';

/** Derived analytics. All metrics are computed from recorded snapshots only. */

export function systemMetrics(simulation, systemId) {
  const snapshots = simulation.snapshots;
  const values = snapshots.map((snapshot) => snapshot.systems[systemId]);
  if (!values.length) return null;

  const effectiveValues = values.map((value) => value.effective);
  const losValues = values.map((value) => value.los);
  const peakImpact = Math.max(...values.map((value) => value.impact));
  const lastNonOperational = values.reduce(
    (last, value, index) => (value.status !== 'operational' ? index : last),
    -1,
  );
  const recoveryIndex =
    lastNonOperational >= 0
      ? values.findIndex((value, index) => index > lastNonOperational && value.status === 'operational')
      : 0;
  const firstImpact = values.findIndex((value) => value.los < 0.95);

  return {
    systemId,
    minEffective: Math.min(...effectiveValues),
    finalEffective: effectiveValues[effectiveValues.length - 1],
    avgEffective: average(effectiveValues),
    avgLos: average(losValues),
    minLos: Math.min(...losValues),
    peakImpact,
    ticksCritical: values.filter((value) => value.status === 'critical').length,
    ticksWarning: values.filter((value) => value.status === 'warning').length,
    firstImpactTick: firstImpact === -1 ? null : firstImpact,
    recoveredAtTick: recoveryIndex === -1 ? null : recoveryIndex,
    finalStatus: values[values.length - 1].status,
  };
}

export function networkMetrics(simulation) {
  const snapshots = simulation.snapshots;
  const resilience = average(snapshots.map((snapshot) => 1 - snapshot.networkStress));
  const worstSnapshot = snapshots.reduce(
    (worst, snapshot) => (snapshot.networkStress > worst.networkStress ? snapshot : worst),
    snapshots[0],
  );
  const impactedSystems = SYSTEMS.filter(
    (definition) => systemMetrics(simulation, definition.id).peakImpact > 0.05,
  ).length;
  return {
    resilience,
    worstTick: worstSnapshot?.tick ?? 0,
    worstNetworkStress: worstSnapshot?.networkStress ?? 0,
    impactedSystems,
    totalTicks: simulation.tick,
    eventCount: simulation.events.length,
    criticalEvents: simulation.events.filter((event) => event.severity === 'critical').length,
  };
}

/** Per-system baseline vs sustained-disruption comparison. */
export function compareRuns(disrupted, baseline) {
  const rows = SYSTEMS.map((definition) => {
    const disruptedMetrics = systemMetrics(disrupted, definition.id);
    const baselineMetrics = systemMetrics(baseline, definition.id);
    return {
      id: definition.id,
      code: definition.code,
      name: definition.name,
      unit: definition.unit,
      baselineAvgLos: baselineMetrics.avgLos,
      disruptedAvgLos: disruptedMetrics.avgLos,
      deltaLos: disruptedMetrics.avgLos - baselineMetrics.avgLos,
      peakImpact: disruptedMetrics.peakImpact,
      minEffective: disruptedMetrics.minEffective,
      ticksCritical: disruptedMetrics.ticksCritical,
      finalStatus: disruptedMetrics.finalStatus,
    };
  });

  const meanDelta = average(rows.map((row) => row.deltaLos));
  return {
    rows,
    meanBaselineLos: average(rows.map((row) => row.baselineAvgLos)),
    meanDisruptedLos: average(rows.map((row) => row.disruptedAvgLos)),
    meanLosDelta: meanDelta,
    worstRow: rows.reduce((worst, row) => (row.deltaLos < worst.deltaLos ? row : worst), rows[0]),
    disruptedNetwork: networkMetrics(disrupted),
    baselineNetwork: networkMetrics(baseline),
  };
}

/** Chart-ready capacity series for the recorded portion of a run. */
export function buildCapacitySeries(simulation, systemIds, { includeNetwork = true } = {}) {
  return simulation.snapshots.map((snapshot) => {
    const point = {
      tick: snapshot.tick,
      network: Number(((1 - snapshot.networkStress) * 100).toFixed(2)),
    };
    for (const systemId of systemIds) {
      const system = snapshot.systems[systemId];
      if (system) point[systemId] = Number((system.effective * 100).toFixed(2));
    }
    return point;
  });
}

export function buildComparisonSeries(disrupted, baseline) {
  return SYSTEMS.map((definition) => {
    const disruptedMetrics = systemMetrics(disrupted, definition.id);
    const baselineMetrics = systemMetrics(baseline, definition.id);
    return {
      name: definition.code,
      fullName: definition.name,
      baseline: Number((baselineMetrics.avgLos * 100).toFixed(1)),
      disrupted: Number((disruptedMetrics.avgLos * 100).toFixed(1)),
      peakImpact: Number((disruptedMetrics.peakImpact * 100).toFixed(1)),
    };
  });
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatImpact(ratio) {
  return `${Math.round(ratio * 100)}%`;
}

