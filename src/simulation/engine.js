import { SYSTEMS, SYSTEM_BY_ID } from '../data/systems.js';
import { incomingDependencies, outgoingDependencies } from '../data/dependencies.js';

export { incomingDependencies, outgoingDependencies };

/**
 * NEXUS deterministic discrete-time cascade engine.
 *
 * All functions are pure: the same initial conditions plus the same operator
 * actions always produce the same trajectory. There is no randomness anywhere
 * in this module. See docs/MODEL.md for the full derivation.
 */

export const TICK_HOURS = 1;
export const DEFAULT_HORIZON = 36;
export const STRESS_DEADBAND = 0.05;
export const STATUS_BANDS = {
  operational: 0.9,
  warning: 0.65,
};

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const round = (value, precision = 6) => Number(value.toFixed(precision));

export function statusFromCapacity(ratio) {
  if (ratio >= STATUS_BANDS.operational) return 'operational';
  if (ratio >= STATUS_BANDS.warning) return 'warning';
  return 'critical';
}

/**
 * Edge transmission law:
 *   deficit     = clamp((threshold - upstreamCapacity) / threshold, 0, 1)
 *   transmitted = weight * deficit
 *
 * An upstream system at or above its threshold transmits nothing.
 */
export function dependencyTransmission(upstreamCapacity, edge) {
  const threshold = Math.max(edge.threshold, 1e-6);
  const deficit = clamp((threshold - clamp(upstreamCapacity)) / threshold);
  return {
    deficit: round(deficit),
    transmitted: round(clamp(edge.weight * deficit)),
  };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function actionEvent({ tick, systemId, severity, title, detail, kind = 'action' }) {
  return {
    id: `evt-${tick}-${systemId}-${kind}-${title.replace(/\s+/g, '-').toLowerCase()}`,
    tick,
    systemId,
    severity,
    kind,
    title,
    detail,
  };
}

function seedEvent(tick, scenario) {
  const definition = SYSTEM_BY_ID[scenario.seedSystem];
  if (!definition) return null;
  const capacity = clamp(scenario.seedCapacity);
  if (capacity >= 1) return null;
  return actionEvent({
    tick,
    systemId: definition.id,
    severity: statusFromCapacity(capacity) === 'critical' ? 'critical' : 'warning',
    kind: 'action',
    title: `${definition.name} capacity reduced to ${Math.round(capacity * 100)}%`,
    detail:
      'Operator-set capacity applies from simulation start. Dependent systems inherit the effect at their documented lag.',
  });
}

/** Build the tick-0 snapshot and an empty (or seeded) event log. */
export function createSimulation({ seedSystem = null, seedCapacity = 1, horizon = DEFAULT_HORIZON } = {}) {
  const operatorLimits = Object.fromEntries(SYSTEMS.map((system) => [system.id, 1]));
  if (seedSystem && SYSTEM_BY_ID[seedSystem]) {
    operatorLimits[seedSystem] = clamp(seedCapacity);
  }

  const systems = {};
  for (const definition of SYSTEMS) {
    const operatorLimit = operatorLimits[definition.id];
    const effective = operatorLimit;
    const capacity = effective * definition.designCapacity;
    const demand = definition.baseDemand;
    const los = clamp(capacity / demand);
    const impact = round(1 - los);
    systems[definition.id] = {
      id: definition.id,
      health: 1,
      operatorLimit,
      dependencyMultiplier: 1,
      effective: round(effective),
      capacity,
      demand,
      los: round(los),
      impact,
      peakImpact: impact,
      incoming: [],
      lastStressTick: 0,
      status: statusFromCapacity(effective),
    };
  }

  const networkStress = mean(Object.values(systems).map((system) => 1 - system.effective));
  const snapshot = { tick: 0, systems, networkStress: round(networkStress) };
  const firstEvent = seedSystem
    ? seedEvent(0, { seedSystem, seedCapacity })
    : null;

  return {
    tick: 0,
    horizon,
    operatorLimits,
    seedSystem,
    seedCapacity,
    snapshots: [snapshot],
    events: firstEvent ? [firstEvent] : [],
  };
}

function transitionEvent({ tick, definition, system, previousStatus, snapshot }) {
  const worst = [...system.incoming].sort((a, b) => b.transmitted - a.transmitted)[0];
  const upstreamName = worst ? SYSTEM_BY_ID[worst.source].name : null;
  const capacityPct = Math.round(system.effective * 100);

  if (system.status === 'operational' && previousStatus !== 'operational') {
    return actionEvent({
      tick,
      systemId: definition.id,
      severity: 'recovery',
      kind: 'recovery',
      title: `${definition.name} returned to operational`,
      detail: `Capacity recovered to ${capacityPct}% of design (threshold ${Math.round(
        STATUS_BANDS.operational * 100,
      )}%).`,
    });
  }

  if (system.status === previousStatus) return null;

  const base = `${definition.name} entered ${system.status}`;
  const cause = worst
    ? `Largest inbound effect: ${upstreamName} → ${definition.name}, transmitting ${Math.round(
        worst.transmitted * 100,
      )}% coupling loss.`
    : 'No inbound dependency effect recorded.';

  return actionEvent({
    tick,
    systemId: definition.id,
    severity: system.status === 'critical' ? 'critical' : 'warning',
    kind: 'status',
    title: base,
    detail: `Capacity ${capacityPct}% of design; dependency multiplier ${system.dependencyMultiplier.toFixed(
      2,
    )}. ${cause} Network stress ${Math.round(snapshot.networkStress * 100)}%.`,
  });
}

/**
 * Advance the simulation by one tick. Reads upstream capacity from the
 * snapshot at (nextTick - edge.lag), so a change can never propagate more than
 * one hop per tick and cycles are temporally decoupled.
 */
export function stepSimulation(simulation) {
  const tick = simulation.tick + 1;
  const previousSnapshot = simulation.snapshots[simulation.snapshots.length - 1];
  const previousNetworkStress = previousSnapshot.networkStress;
  const nextSystems = {};

  for (const definition of SYSTEMS) {
    const previous = previousSnapshot.systems[definition.id];

    const incoming = incomingDependencies(definition.id).map((edge) => {
      // The effect of an upstream change needs `lag` full ticks to arrive. A
      // negative source tick means the lag has not elapsed yet, so nothing is
      // transmitted (rather than clamping to the tick-0 snapshot).
      const sourceTick = tick - edge.lag;
      if (sourceTick < 0) {
        return {
          edgeId: edge.id,
          source: edge.source,
          upstreamEffective: 1,
          deficit: 0,
          transmitted: 0,
        };
      }
      const sourceSnapshot = simulation.snapshots[Math.min(sourceTick, simulation.snapshots.length - 1)];
      const upstream = sourceSnapshot.systems[edge.source].effective;
      const { deficit, transmitted } = dependencyTransmission(upstream, edge);
      return {
        edgeId: edge.id,
        source: edge.source,
        upstreamEffective: round(upstream),
        deficit,
        transmitted,
      };
    });

    // Multiplicative coupling: each dependency can only remove capacity,
    // the product stays in [0,1], and no loop can amplify a signal.
    const dependencyMultiplier = round(
      incoming.reduce((multiplier, effect) => multiplier * (1 - effect.transmitted), 1),
    );
    const shortfall = clamp(1 - dependencyMultiplier);

    // Health kinetics use only dependency-induced shortfall, never the
    // operator throttle. A restored upstream therefore always permits recovery.
    let health = previous.health;
    let lastStressTick = previous.lastStressTick;
    if (shortfall > STRESS_DEADBAND) {
      const severity = (shortfall - STRESS_DEADBAND) / (1 - STRESS_DEADBAND);
      health -= definition.degradationRate * severity;
      lastStressTick = tick;
    } else if (tick - previous.lastStressTick >= definition.recoveryDelay) {
      health += definition.repairRate;
    }
    health = clamp(health);

    const operatorLimit = clamp(simulation.operatorLimits[definition.id] ?? 1);
    const effective = round(clamp(health * operatorLimit * dependencyMultiplier));

    // Demand rises with lagged network-wide stress (surge on critical services).
    const demand = definition.baseDemand * (1 + definition.demandSurge * previousNetworkStress);
    const capacity = effective * definition.designCapacity;
    const los = round(clamp(capacity / demand));
    const impact = round(1 - los);
    const status = statusFromCapacity(effective);

    nextSystems[definition.id] = {
      id: definition.id,
      health: round(health),
      operatorLimit,
      dependencyMultiplier,
      effective,
      capacity,
      demand,
      los,
      impact,
      peakImpact: round(Math.max(previous.peakImpact, impact)),
      incoming,
      lastStressTick,
      status,
    };
  }

  const networkStress = round(mean(Object.values(nextSystems).map((system) => 1 - system.effective)));
  const snapshot = { tick, systems: nextSystems, networkStress };
  const pendingTransitions = SYSTEMS.map((definition) =>
    transitionEvent({
      tick,
      definition,
      system: nextSystems[definition.id],
      previousStatus: previousSnapshot.systems[definition.id].status,
      snapshot,
    }),
  ).filter(Boolean);

  return {
    ...simulation,
    tick,
    snapshots: [...simulation.snapshots, snapshot],
    events: [...simulation.events, ...pendingTransitions],
  };
}

/**
 * Change an operator limit. The new limit is used by the next step; the current
 * snapshot is preserved. A note is appended to the event log immediately.
 */
export function applyOperatorLimit(simulation, systemId, capacity) {
  const definition = SYSTEM_BY_ID[systemId];
  if (!definition) return simulation;
  const value = clamp(capacity);
  const next = {
    ...simulation,
    operatorLimits: { ...simulation.operatorLimits, [systemId]: value },
  };
  const isRestore = value >= 1;
  const event = actionEvent({
    tick: simulation.tick,
    systemId,
    severity: isRestore ? 'info' : statusFromCapacity(value) === 'critical' ? 'critical' : 'warning',
    kind: 'action',
    title: isRestore
      ? `${definition.name} output restored to 100%`
      : `${definition.name} output set to ${Math.round(value * 100)}%`,
    detail: isRestore
      ? 'Operator limit returned to design output. Physical health recovers only after the system-specific recovery delay.'
      : 'Operator limit applied. Downstream effects appear after each dependency lag.',
  });
  return { ...next, events: [...next.events, event] };
}

/**
 * Canonical recovery experiment: hold the configured disruption for
 * `restoreAtTick`, restore the source to 100%, then continue to the horizon.
 * Used only for the recovery profile chart; it is deterministic and separate
 * from the live operator history.
 */
export function runRecoveryScenario(scenario, { horizon, restoreAtTick = 12 } = {}) {
  const ticks = horizon ?? scenario.horizon ?? DEFAULT_HORIZON;
  const restoreTick = Math.max(1, Math.min(ticks - 1, restoreAtTick));
  let simulation = createSimulation({
    seedSystem: scenario.seedSystem,
    seedCapacity: scenario.seedCapacity,
    horizon: ticks,
  });
  for (let index = 0; index < restoreTick; index += 1) simulation = stepSimulation(simulation);
  simulation = applyOperatorLimit(simulation, scenario.seedSystem, 1);
  while (simulation.tick < ticks) simulation = stepSimulation(simulation);
  return { ...simulation, restoreAtTick: restoreTick };
}

/** Execute a complete run from scratch. Used for baseline, comparison and tests. */
export function runScenario(scenario, { horizon, baseline = false } = {}) {
  const ticks = horizon ?? scenario.horizon ?? DEFAULT_HORIZON;
  let simulation = createSimulation({
    seedSystem: baseline ? null : scenario.seedSystem,
    seedCapacity: baseline ? 1 : scenario.seedCapacity,
    horizon: ticks,
  });
  for (let index = 0; index < ticks; index += 1) {
    simulation = stepSimulation(simulation);
  }
  return simulation;
}

export function snapshotAt(simulation, tick) {
  const index = clamp(tick, 0, simulation.snapshots.length - 1);
  return simulation.snapshots[index] ?? simulation.snapshots[simulation.snapshots.length - 1];
}
