# NEXUS Model Specification

**Version 1.0 · educational cascade model**

This document defines every rule executed by the simulation engine. The implementation lives in [`src/simulation/engine.js`](../src/simulation/engine.js); parameters live in [`src/data/systems.js`](../src/data/systems.js) and [`src/data/dependencies.js`](../src/data/dependencies.js).

## 1. Scope and integrity statement

NEXUS demonstrates how a capacity deficit can propagate through a directed graph of interdependent infrastructure systems. It is a teaching and interface-demonstration model.

- Capacities, demands, units and kinetics are **illustrative assumptions**.
- The model has **not** been calibrated, validated or fitted to real outages.
- It does not predict failures, outage duration, casualties, economic loss or operational risk.
- No random damage is applied. All results are deterministic functions of the configuration and operator actions.

## 2. Timebase

- One tick represents **one simulated hour**.
- Time starts at `T+00:00`; a horizon of 36 ticks ends at `T+36:00`.
- The simulation advances only through an explicit step call. Playback speed changes wall-clock pacing, never model behaviour.
- Each tick observes the previous tick's snapshot. Upstream values are read from `t − lag`, never recomputed in the same tick.

## 3. State variables

For each system `s` at tick `t`:

| Symbol | Meaning | Range |
| --- | --- | --- |
| `h_s(t)` | Physical health / repair state | `[0, 1]` |
| `o_s(t)` | Operator capacity limit | `[0, 1]` |
| `e_s(t)` | Effective capacity ratio | `[0, 1]` |
| `D_s(t)` | Dependency multiplier | `(0, 1]` |
| `demand_s(t)` | Demand in system units | `≥ 0` |
| `capacity_s(t)` | Capacity in system units | `≥ 0` |
| `LOS_s(t)` | Level of service | `[0, 1]` |
| `status_s(t)` | Banded status | operational / warning / critical |

Snapshots are immutable records appended once per tick. The event log is append-only.

## 4. Update equations

### 4.1 Effective capacity

```text
e_s(t) = clamp( h_s(t) · o_s(t) · D_s(t), 0, 1 )
capacity_s(t) = e_s(t) · designCapacity_s
demand_s(t) = baseDemand_s · (1 + demandSurge_s · networkStress(t − 1))
LOS_s(t) = clamp( capacity_s(t) / demand_s(t), 0, 1 )
```

`clamp(x, a, b) = min(b, max(a, x))`. Demand surge uses lagged network-wide stress, so demand responds after a disruption is observed, not in the same tick.

### 4.2 Dependency transmission

For each directed edge `i → s`:

```text
deficit_i(t) = clamp( (θ_i − e_i(t − L_i)) / θ_i, 0, 1 )
transmitted_i(t) = w_i · deficit_i(t)
D_s(t) = Π over incoming edges i of (1 − transmitted_i(t))
```

- If `e_i ≥ θ_i`, no deficit is transmitted.
- At full deficit (`e_i = 0`), the edge transmits exactly `w_i`.
- Multiplication means each additional dependency can only remove capacity. `D_s` cannot exceed 1, become negative, or be amplified by a cycle.
- A lagged read uses the snapshot at `t − L`. If `t − L < 0`, the lag has not elapsed and nothing is transmitted. A lag of 2 therefore first responds two ticks after the upstream change.

### 4.3 Health degradation and recovery

```text
shortfall_s(t) = 1 − D_s(t)
severity_s(t) = clamp( (shortfall_s(t) − 0.05) / 0.95, 0, 1 )

if shortfall_s(t) > 0.05:
    h_s(t+1) = clamp( h_s(t) − degradationRate_s · severity_s(t) )
    lastStressTick_s = t
else if t − lastStressTick_s ≥ recoveryDelay_s:
    h_s(t+1) = clamp( h_s(t) + repairRate_s )
else:
    h_s(t+1) = h_s(t)
```

Key consequences:

1. Health responds **only** to dependency-induced shortfall, never to the operator throttle. A restored upstream therefore always enables downstream recovery.
2. Degradation depends on the depth of dependency loss, not on the operator's own capacity setting.
3. Recovery waits for the system-specific `recoveryDelay`, then proceeds at `repairRate` per tick.
4. Health cannot leave `[0, 1]`.

### 4.4 Network stress

```text
networkStress(t) = (1 / N) · Σ_s (1 − e_s(t))
```

Equal weighting over the six systems. Used for demand surge and displayed as the network-level indicator.

### 4.5 Status bands

| Band | Rule | Interface colour |
| --- | --- | --- |
| Operational | `e ≥ 0.90` | Green |
| Warning / degraded | `0.65 ≤ e < 0.90` | Amber |
| Critical | `e < 0.65` | Red |

Status is derived from effective capacity, not level of service. This keeps the band definition independent of demand surge.

## 5. Loop prevention and determinism

Two properties prevent runaway propagation:

1. **Temporal decoupling.** Every edge reads upstream state from a lagged snapshot. Whatever the cycle structure, a change moves at most one hop per tick, and the simulation horizon bounds the propagation depth.
2. **Multiplicative damping.** `D_s = Π(1 − w_i · deficit_i)` is bounded in `(0, 1]`. No feedback edge can create a value above 1 or below 0, and no iterative fixed point is solved. A cycle may oscillate, but it cannot numerically diverge.

Determinism follows from:

- no `Math.random`, clocks, network calls or unordered iteration;
- fixed system order from `SYSTEMS`;
- pure `stepSimulation(simulation)` with explicit state;
- operator actions applied as ordered state changes.

The test suite asserts byte-identical trajectories across repeated runs.

## 6. Events

Events are appended when:

- a system crosses from one status band into another;
- a non-operational system returns to operational (recovery event);
- an operator action changes a capacity limit.

Each event contains `tick`, `systemId`, `severity`, `kind`, `title` and a detail string that includes the dominant inbound edge and dependency multiplier where relevant. No event is emitted for an unchanged status, so the log does not grow every tick.

## 7. Baseline and comparison semantics

The **Baseline / Disrupted** switch in the toolbar compares the same tick:

- *Disrupted* shows the live run, including any operator restores.
- *Baseline* shows the undisturbed run at the same tick (`e_s = 1` for all systems).

The **Scenario Comparison** view is canonical and independent of live-session actions:

- Both runs restart at tick 0.
- The baseline applies no disruption.
- The disrupted run holds the configured source at its configured capacity for the full horizon.
- Mean level of service is averaged across all recorded ticks, per system.

This symmetry keeps comparisons reproducible. A live restore is visible in the live charts and event log but is intentionally not part of the canonical comparison.

### 7.1 Recovery profile

Simulation Lab also runs a **canonical recovery experiment**. The configured source is held at its disrupted capacity for one third of the horizon (clamped to 3–12 ticks), then restored to 100% via the same operator action used in live play. The remaining ticks are simulated normally, producing the recovery profile chart.

- It is deterministic and independent of live-session restores.
- The source's effective capacity returns on the next tick once the operator limit is restored, because operator throttling does not degrade health.
- Downstream systems recover only after their own `recoveryDelay` and at their own `repairRate`.
- The chart plots the source, one dependent (the selected system, or healthcare when the source itself is selected) and the network average.

This experiment is illustrative only. It does not represent a repair schedule, crew availability or real restoration process.

## 8. Parameters

### 8.1 Systems

| ID | Unit | Design capacity | Base demand | Demand surge | Degradation | Repair | Recovery delay | Criticality |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ELEC | MW | 1,200 | 1,010 | 5% | 0.030 | 0.045 | 2 | 5 |
| WTR | ML/h | 450 | 372 | 12% | 0.040 | 0.050 | 1 | 5 |
| TEL | Gbit/s | 640 | 512 | 8% | 0.035 | 0.060 | 1 | 4 |
| TRN | veh/h | 900 | 700 | 5% | 0.030 | 0.040 | 3 | 3 |
| HCR | beds | 520 | 430 | 18% | 0.045 | 0.035 | 2 | 5 |
| EMG | calls/h | 300 | 235 | 22% | 0.040 | 0.050 | 1 | 5 |

Health kinetics use the global 5% shortfall deadband and each system's `degradationRate`, `repairRate` and `recoveryDelay`. Operator throttles do not create wear; only dependency shortfall does. Per-edge thresholds in §8.2 govern propagation.

### 8.2 Dependency edges

| Source → target | Weight | Threshold | Lag (ticks) | Rationale |
| --- | ---: | ---: | ---: | --- |
| ELEC → WTR | 0.60 | 0.95 | 1 | Pumping, treatment and pressurisation require grid power. |
| ELEC → TEL | 0.55 | 0.92 | 1 | Core sites and radio access units rely on grid supply and battery reserve. |
| ELEC → TRN | 0.40 | 0.88 | 1 | Signalling, traction and traffic control depend on grid power. |
| ELEC → HCR | 0.50 | 0.95 | 2 | Clinical operations rely on grid power and generator autonomy. |
| ELEC → EMG | 0.35 | 0.92 | 2 | Dispatch centres and communications depend on grid power. |
| WTR → HCR | 0.30 | 0.90 | 2 | Sanitation, sterilisation and dialysis require water. |
| TEL → HCR | 0.18 | 0.85 | 1 | Clinical coordination, records and telemedicine need connectivity. |
| TEL → EMG | 0.30 | 0.90 | 1 | Dispatch, alerting and field coordination need connectivity. |
| TRN → EMG | 0.22 | 0.85 | 2 | Responder routing depends on road and signal availability. |
| TRN → HCR | 0.12 | 0.80 | 3 | Staff and patient movement depends on transport. |
| HCR → EMG | 0.15 | 0.85 | 2 | Responder surge capacity depends on receiving healthcare capacity. |
| EMG → HCR | 0.08 | 0.80 | 3 | Emergency coordination supports clinical surge operations. |

The final two edges form the model's only feedback pair. It is included so the lag-based loop containment is exercised by tests.

### 8.3 Capacity and unit caveat

System units (`MW`, `ML/h`, `Gbit/s`, `veh/h`, `beds`, `calls/h`) provide dimensional readability. They are not derived from any jurisdiction or operator and should not be compared to real capacity registers.

## 9. Example calculation

Take scenario ELEC at 40%, no prior degradation, tick 1.

For WTR (`w=0.60`, `θ=0.95`, `L=1`):

```text
deficit = (0.95 − 0.40) / 0.95 = 0.5789…
transmitted = 0.60 × 0.5789 = 0.3474…
D_WTR = 1 − 0.3474 = 0.6526
```

At tick 1, WTR health was still 1 at the start of the tick and is reduced by `0.040 × ((0.3474 − 0.05)/0.95) = 0.0125`, giving `h ≈ 0.9875`. Its reported effective capacity is therefore about `0.9875 × 0.6526 ≈ 0.644` — a critical-band value produced solely by documented rules.

## 10. Assumptions

- Dependencies are static for the duration of a run.
- A single operator-set capacity limit is supported per scenario; all other systems begin at 100% design capacity.
- Demand grows linearly with lagged network stress, with a system-specific surge coefficient.
- Repairs are continuous, linear and unconstrained by resources or crews; there is no queueing of repair tasks.
- Health degradation is a normalized wear abstraction, not a physical damage variable.
- The six systems are homogeneous aggregates with no internal topology.
- Agency, economics, policy, human behaviour and information quality are outside scope.
- Time is uniform; there are no diurnal or seasonal profiles.

## 11. Limitations

- Not calibrated; parameter values are pedagogical choices.
- Single-source disruption only; no simultaneous, cascading external shocks or adversarial scenarios.
- No redundancy, islanding, storage, backup duration or restoration prioritisation.
- No geographic or asset-level topology, so local and network-wide impacts are conflated.
- No uncertainty quantification; deterministic output should not be read as a probability.
- Health and demand dynamics are intentionally simple and linear within their bands.
- No real-time data ingestion.
- Not validated for emergency management, insurance, regulation or investment decisions.

## 12. How to extend the model responsibly

1. State the new rule and its variables in this document.
2. Add or update parameters in `src/data/`.
3. Implement the rule as a pure function or explicit step in `src/simulation/engine.js`.
4. Add tests for boundary conditions, determinism and loop safety.
5. Update the in-app documentation in `src/views/DocsView.jsx`.
6. Keep the model honest: never present modelled output as measured data.

## 13. Tested invariants

The Vitest suite asserts:

- effective capacity, health and dependency multiplier remain in `[0, 1]` over 96 ticks with a feedback cycle;
- thresholds block transmission exactly;
- lag timing is respected (including negative lag windows);
- repeated full runs are byte-identical;
- operator restoration produces delayed, gradual recovery;
- all status band boundaries behave as documented;
- analytics and comparison series are consistent with snapshots;
- example scenarios are reproducible.
