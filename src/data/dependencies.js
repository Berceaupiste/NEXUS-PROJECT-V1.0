/**
 * Directed dependency graph.
 *
 * weight    coupling strength in [0,1]: the fraction of the upstream relative
 *           capacity deficit that is transmitted along the edge when the
 *           upstream system is fully below its threshold.
 * threshold relative upstream capacity below which the edge transmits damage.
 * lag       discrete ticks (1 tick = 1 simulated hour) before an upstream
 *           capacity change is visible downstream.
 *
 * Weights and lags are documented modelling assumptions, not measurements.
 * The graph contains one deliberate feedback pair (HCR <-> EMG) so the engine's
 * temporal decoupling can be exercised.
 */
export const DEPENDENCIES = [
  {
    id: 'elec-water',
    source: 'electricity',
    target: 'water',
    weight: 0.6,
    threshold: 0.95,
    lag: 1,
    rationale: 'Pumping, treatment and pressurisation require grid power.',
  },
  {
    id: 'elec-telecom',
    source: 'electricity',
    target: 'telecom',
    weight: 0.55,
    threshold: 0.92,
    lag: 1,
    rationale: 'Core sites and radio access units rely on grid supply and finite battery reserve.',
  },
  {
    id: 'elec-transport',
    source: 'electricity',
    target: 'transport',
    weight: 0.4,
    threshold: 0.88,
    lag: 1,
    rationale: 'Signalling, traction and traffic control systems depend on grid power.',
  },
  {
    id: 'elec-healthcare',
    source: 'electricity',
    target: 'healthcare',
    weight: 0.5,
    threshold: 0.95,
    lag: 2,
    rationale: 'Clinical operations rely on grid power and generators with limited autonomy.',
  },
  {
    id: 'elec-emergency',
    source: 'electricity',
    target: 'emergency',
    weight: 0.35,
    threshold: 0.92,
    lag: 2,
    rationale: 'Dispatch centres and communications depend on grid power.',
  },
  {
    id: 'water-healthcare',
    source: 'water',
    target: 'healthcare',
    weight: 0.3,
    threshold: 0.9,
    lag: 2,
    rationale: 'Sanitation, sterilisation and dialysis require a continuous water supply.',
  },
  {
    id: 'telecom-healthcare',
    source: 'telecom',
    target: 'healthcare',
    weight: 0.18,
    threshold: 0.85,
    lag: 1,
    rationale: 'Clinical coordination, records access and telemedicine depend on network availability.',
  },
  {
    id: 'telecom-emergency',
    source: 'telecom',
    target: 'emergency',
    weight: 0.3,
    threshold: 0.9,
    lag: 1,
    rationale: 'Dispatch, public alerting and field coordination depend on network availability.',
  },
  {
    id: 'transport-emergency',
    source: 'transport',
    target: 'emergency',
    weight: 0.22,
    threshold: 0.85,
    lag: 2,
    rationale: 'Ambulance and responder routing depends on road and signal availability.',
  },
  {
    id: 'transport-healthcare',
    source: 'transport',
    target: 'healthcare',
    weight: 0.12,
    threshold: 0.8,
    lag: 3,
    rationale: 'Staff and patient movement depends on transport availability.',
  },
  {
    id: 'healthcare-emergency',
    source: 'healthcare',
    target: 'emergency',
    weight: 0.15,
    threshold: 0.85,
    lag: 2,
    rationale: 'Responder surge capacity depends on receiving healthcare capacity.',
  },
  {
    id: 'emergency-healthcare',
    source: 'emergency',
    target: 'healthcare',
    weight: 0.08,
    threshold: 0.8,
    lag: 3,
    rationale: 'Emergency coordination supports clinical surge operations (feedback edge).',
  },
];

export function incomingDependencies(systemId) {
  return DEPENDENCIES.filter((edge) => edge.target === systemId);
}

export function outgoingDependencies(systemId) {
  return DEPENDENCIES.filter((edge) => edge.source === systemId);
}
