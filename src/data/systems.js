/**
 * System definitions for the NEXUS cascade model.
 *
 * IMPORTANT: capacities, demands and kinetic parameters are illustrative
 * aggregates chosen for a readable educational model. They are not measured
 * values from any real utility, and the model does not forecast real outages.
 * Units are indicative so that the interface can display meaningful dimensions.
 */
export const SYSTEMS = [
  {
    id: 'electricity',
    code: 'ELEC',
    name: 'Electricity',
    icon: 'bolt',
    layer: 'Energy',
    unit: 'MW',
    designCapacity: 1200,
    baseDemand: 1010,
    criticality: 5,
    // Health kinetics: see docs/MODEL.md §4.3.
    degradationRate: 0.03,
    repairRate: 0.045,
    recoveryDelay: 2,
    demandSurge: 0.05,
    position: { x: 0, y: 120 },
    description:
      'Bulk generation, transmission and distribution. Treated as the root supply layer: it has no upstream dependencies inside this model.',
    role: 'Root supply',
  },
  {
    id: 'water',
    code: 'WTR',
    name: 'Water supply',
    icon: 'droplet',
    layer: 'Utilities',
    unit: 'ML/h',
    designCapacity: 450,
    baseDemand: 372,
    criticality: 5,
    degradationRate: 0.04,
    repairRate: 0.05,
    recoveryDelay: 1,
    demandSurge: 0.12,
    position: { x: 250, y: 0 },
    description:
      'Abstraction, treatment, pumping and pressurisation of potable water across the supply zone.',
    role: 'Utility',
  },
  {
    id: 'telecom',
    code: 'TEL',
    name: 'Telecommunications',
    icon: 'signal',
    layer: 'Networks',
    unit: 'Gbit/s',
    designCapacity: 640,
    baseDemand: 512,
    criticality: 4,
    degradationRate: 0.035,
    repairRate: 0.06,
    recoveryDelay: 1,
    demandSurge: 0.08,
    position: { x: 250, y: 130 },
    description:
      'Core transport, fixed broadband and radio access supporting coordination traffic across all sectors.',
    role: 'Network',
  },
  {
    id: 'transport',
    code: 'TRN',
    name: 'Transportation',
    icon: 'truck',
    layer: 'Mobility',
    unit: 'veh/h',
    designCapacity: 900,
    baseDemand: 700,
    criticality: 3,
    degradationRate: 0.03,
    repairRate: 0.04,
    recoveryDelay: 3,
    demandSurge: 0.05,
    position: { x: 250, y: 260 },
    description:
      'Arterial road capacity, signal control and transit movement used for staff, patients and freight.',
    role: 'Mobility',
  },
  {
    id: 'healthcare',
    code: 'HCR',
    name: 'Healthcare',
    icon: 'hospital',
    layer: 'Human services',
    unit: 'beds',
    designCapacity: 520,
    baseDemand: 430,
    criticality: 5,
    degradationRate: 0.045,
    repairRate: 0.035,
    recoveryDelay: 2,
    demandSurge: 0.18,
    position: { x: 520, y: 50 },
    description:
      'Acute beds, emergency departments and clinical support. Dependent on power, water, connectivity and access.',
    role: 'Critical service',
  },
  {
    id: 'emergency',
    code: 'EMG',
    name: 'Emergency services',
    icon: 'shield',
    layer: 'Human services',
    unit: 'calls/h',
    designCapacity: 300,
    baseDemand: 235,
    criticality: 5,
    degradationRate: 0.04,
    repairRate: 0.05,
    recoveryDelay: 1,
    demandSurge: 0.22,
    position: { x: 520, y: 250 },
    description:
      'Dispatch, field response and public alerting. Dependent on power, connectivity, transport and receiving healthcare capacity.',
    role: 'Critical service',
  },
];

export const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map((system) => [system.id, system]));

export const SYSTEM_IDS = SYSTEMS.map((system) => system.id);
