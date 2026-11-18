/**
 * Example scenarios shipped with the app. Each is a complete, reproducible
 * experimental setup: a single operator-throttled system, a severity value and
 * a simulation horizon. All other systems begin at design capacity.
 */
export const EXAMPLE_SCENARIOS = [
  {
    id: 'example-grid-disturbance',
    name: 'Grid capacity disturbance',
    seedSystem: 'electricity',
    seedCapacity: 0.4,
    horizon: 36,
    description:
      'Electricity output held at 40% of design capacity for the full horizon. Exercises the broadest cascade because every sector has an inbound power dependency.',
  },
  {
    id: 'example-water-outage',
    name: 'Water treatment outage',
    seedSystem: 'water',
    seedCapacity: 0.25,
    horizon: 30,
    description:
      'Water supply held at 25% of design capacity. Primary propagation path is into healthcare through sanitation and clinical water use.',
  },
  {
    id: 'example-telecom-degradation',
    name: 'Telecom core degradation',
    seedSystem: 'telecom',
    seedCapacity: 0.35,
    horizon: 30,
    description:
      'Network capacity held at 35%. Coordination and dispatch degrade, with a secondary effect on clinical throughput.',
  },
  {
    id: 'example-transport-disruption',
    name: 'Transport corridor disruption',
    seedSystem: 'transport',
    seedCapacity: 0.2,
    horizon: 36,
    description:
      'Transport capacity held at 20%. Tests the slower mobility dependencies into emergency response and healthcare access.',
  },
];

export const DEFAULT_SCENARIO = {
  id: 'scenario-live',
  name: 'Grid capacity disturbance',
  seedSystem: 'electricity',
  seedCapacity: 0.4,
  horizon: 36,
  description:
    'Electricity output held below design capacity. Dependents inherit a capacity ceiling through the documented coupling weights.',
};
