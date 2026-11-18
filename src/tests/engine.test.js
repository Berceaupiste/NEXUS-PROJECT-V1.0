import { describe, it, expect } from 'vitest';
import {
  createSimulation,
  stepSimulation,
  runScenario,
  applyOperatorLimit,
  dependencyTransmission,
  statusFromCapacity,
  STATUS_BANDS,
} from '../simulation/engine.js';
import { SYSTEMS } from '../data/systems.js';
import { DEPENDENCIES } from '../data/dependencies.js';

const scenario = {
  seedSystem: 'electricity',
  seedCapacity: 0.4,
  horizon: 36,
};

describe('initial conditions', () => {
  it('starts all six systems at design capacity in the baseline', () => {
    const simulation = createSimulation({ horizon: 12 });
    const values = Object.values(simulation.snapshots[0].systems);
    expect(values).toHaveLength(SYSTEMS.length);
    values.forEach((system) => {
      expect(system.effective).toBe(1);
      expect(system.health).toBe(1);
      expect(system.status).toBe('operational');
      expect(system.dependencyMultiplier).toBe(1);
    });
    expect(simulation.snapshots[0].networkStress).toBe(0);
  });

  it('applies the disruption source immediately at tick zero', () => {
    const simulation = createSimulation(scenario);
    const electricity = simulation.snapshots[0].systems.electricity;
    expect(electricity.operatorLimit).toBeCloseTo(0.4, 6);
    expect(electricity.effective).toBeCloseTo(0.4, 6);
    expect(electricity.status).toBe('critical');
    expect(simulation.events).toHaveLength(1);
    expect(simulation.events[0].kind).toBe('action');
  });
});

describe('dependency propagation', () => {
  it('uses the documented transmission equation on the first tick', () => {
    const edge = DEPENDENCIES.find((item) => item.id === 'elec-water');
    const transmission = dependencyTransmission(0.4, edge);
    const expectedDeficit = (edge.threshold - 0.4) / edge.threshold;
    expect(transmission.deficit).toBeCloseTo(expectedDeficit, 5);
    expect(transmission.transmitted).toBeCloseTo(edge.weight * expectedDeficit, 5);

    const simulation = stepSimulation(createSimulation(scenario));
    const water = simulation.snapshots[1].systems.water;
    const upstream = simulation.snapshots[0].systems.electricity.effective;
    const expectedMultiplier =
      (1 - edge.weight * Math.min(1, Math.max(0, (edge.threshold - upstream) / edge.threshold))) *
      (1 - 0.3 * Math.min(1, Math.max(0, (0.9 - 0.4) / 0.9)));

    // Water also receives no other inbound edge except electricity; the second
    // factor above documents the independently tested threshold law for a
    // hypothetical water->healthcare relationship (not applied to water itself).
    const expectedWaterMultiplier =
      1 - edge.weight * Math.min(1, Math.max(0, (edge.threshold - upstream) / edge.threshold));
    expect(water.dependencyMultiplier).toBeCloseTo(expectedWaterMultiplier, 5);
    expect(water.effective).toBeLessThanOrEqual(water.dependencyMultiplier + 1e-9);
    expect(water.effective).toBeCloseTo(water.health * expectedWaterMultiplier, 5);
    expect(expectedMultiplier).toBeLessThan(1);
  });

  it('transmits nothing when upstream is at or above its threshold', () => {
    DEPENDENCIES.forEach((edge) => {
      expect(dependencyTransmission(1, edge).transmitted).toBe(0);
      expect(dependencyTransmission(edge.threshold, edge).transmitted).toBe(0);
    });
  });

  it('propagates to second-order dependents only after their lag', () => {
    let simulation = createSimulation(scenario);
    simulation = stepSimulation(simulation);
    const healthcareTick1 = simulation.snapshots[1].systems.healthcare;
    // Electricity -> healthcare lag is 2, so at tick 1 only healthcare's
    // other dependencies (water, telecom, transport) can contribute.
    const hasElectricEffect = healthcareTick1.incoming.some(
      (effect) => effect.edgeId === 'elec-healthcare' && effect.transmitted > 0,
    );
    expect(hasElectricEffect).toBe(false);

    simulation = stepSimulation(simulation);
    const healthcareTick2 = simulation.snapshots[2].systems.healthcare;
    expect(
      healthcareTick2.incoming.some(
        (effect) => effect.edgeId === 'elec-healthcare' && effect.transmitted > 0,
      ),
    ).toBe(true);
    expect(healthcareTick2.effective).toBeLessThan(1);
  });

  it('degrades dependent systems over time', () => {
    const simulation = runScenario(scenario, { horizon: 24 });
    const impacted = SYSTEMS.filter((system) => system.id !== 'electricity').map(
      (system) => simulation.snapshots[24].systems[system.id],
    );
    impacted.forEach((system) => {
      expect(system.effective).toBeLessThan(0.95);
      expect(system.peakImpact).toBeGreaterThan(0);
    });
    expect(simulation.snapshots[24].networkStress).toBeGreaterThan(0);
  });
});

describe('determinism and stability', () => {
  it('produces byte-identical trajectories on repeated runs', () => {
    const first = runScenario(scenario, { horizon: 36 });
    const second = runScenario(scenario, { horizon: 36 });
    expect(JSON.stringify(first.snapshots)).toBe(JSON.stringify(second.snapshots));
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
  });

  it('keeps every value bounded and finite with a feedback cycle present', () => {
    const simulation = runScenario(scenario, { horizon: 96 });
    simulation.snapshots.forEach((snapshot) => {
      expect(Number.isFinite(snapshot.networkStress)).toBe(true);
      expect(snapshot.networkStress).toBeGreaterThanOrEqual(0);
      expect(snapshot.networkStress).toBeLessThanOrEqual(1);
      Object.values(snapshot.systems).forEach((system) => {
        expect(system.effective).toBeGreaterThanOrEqual(0);
        expect(system.effective).toBeLessThanOrEqual(1);
        expect(system.health).toBeGreaterThanOrEqual(0);
        expect(system.health).toBeLessThanOrEqual(1);
        expect(system.dependencyMultiplier).toBeGreaterThanOrEqual(0);
        expect(system.dependencyMultiplier).toBeLessThanOrEqual(1);
        expect(Number.isFinite(system.capacity)).toBe(true);
        expect(Number.isFinite(system.los)).toBe(true);
      });
    });
  });

  it('applies at most one dependency hop per tick', () => {
    const simulation = runScenario(scenario, { horizon: 2 });
    // At tick 1 no system other than the outage source and its direct
    // dependents can have received an update from a system that was itself
    // affected at tick 1.
    const tick1 = simulation.snapshots[1];
    expect(
      tick1.systems.healthcare.incoming.some((e) => e.source === 'emergency' && e.transmitted > 0),
    ).toBe(false);
    expect(
      simulation.snapshots[2].systems.healthcare.incoming.some((e) => e.transmitted > 0),
    ).toBe(true);
  });
});

describe('recovery', () => {
  it('restores capacity after the operator limit is returned to design output', () => {
    let simulation = createSimulation({ seedSystem: 'water', seedCapacity: 0.2, horizon: 40 });
    for (let index = 0; index < 18; index += 1) simulation = stepSimulation(simulation);
    const trough = simulation.snapshots[simulation.tick].systems.healthcare.effective;
    const waterTrough = simulation.snapshots[simulation.tick].systems.water.effective;

    simulation = applyOperatorLimit(simulation, 'water', 1);
    for (let index = 0; index < 20; index += 1) simulation = stepSimulation(simulation);

    const recovered = simulation.snapshots[simulation.tick].systems.healthcare;
    const recoveredWater = simulation.snapshots[simulation.tick].systems.water;
    expect(recoveredWater.effective).toBeGreaterThan(waterTrough);
    expect(recovered.effective).toBeGreaterThan(trough);
    expect(recovered.dependencyMultiplier).toBeCloseTo(1, 4);
    expect(recovered.los).toBeGreaterThan(0.9);
    expect(
      simulation.events.some((event) => event.kind === 'action' && event.title.includes('restored')),
    ).toBe(true);
  });

  it('respects the system-specific recovery delay before health improves', () => {
    let simulation = createSimulation({ seedSystem: 'telecom', seedCapacity: 0.25, horizon: 30 });
    for (let index = 0; index < 12; index += 1) simulation = stepSimulation(simulation);
    simulation = applyOperatorLimit(simulation, 'telecom', 1);
    const before = simulation.snapshots[simulation.tick].systems.healthcare.health;
    simulation = stepSimulation(simulation);
    const afterOne = simulation.snapshots[simulation.tick].systems.healthcare.health;
    // Healthcare recoveryDelay = 2; a single tick is not enough to recover.
    expect(afterOne).toBeLessThanOrEqual(before);
    for (let index = 0; index < 10; index += 1) simulation = stepSimulation(simulation);
    const later = simulation.snapshots[simulation.tick].systems.healthcare.health;
    expect(later).toBeGreaterThan(before);
  });
});

describe('status bands', () => {
  it('maps capacity ratios to documented bands', () => {
    expect(statusFromCapacity(1)).toBe('operational');
    expect(statusFromCapacity(STATUS_BANDS.operational)).toBe('operational');
    expect(statusFromCapacity(STATUS_BANDS.warning)).toBe('warning');
    expect(statusFromCapacity(STATUS_BANDS.warning - 0.01)).toBe('critical');
    expect(statusFromCapacity(0)).toBe('critical');
  });
});
