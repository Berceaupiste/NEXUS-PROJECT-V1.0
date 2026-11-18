# NEXUS Architecture

## Overview

NEXUS: CHAOS ENGINE is a client-only React application. It has no server, database, authentication, external API or AI dependency. The only persistence is browser `localStorage` for saved scenario configurations and display preferences.

```text
React views / components
        │
        ▼
SimulationProvider (state, playback, persistence)
        │
        ├── engine.js      pure discrete-time step function
        ├── metrics.js     derived analytics from snapshots
        └── format.js      tick and number formatting
        │
        ▼
Immutable simulation snapshots ──► React Flow graph
                                ├── Inspector
                                ├── Recharts charts
                                └── Event timeline
```

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| UI | React 18 | Component model and hooks; no framework overhead |
| Build | Vite 5 | Fast local development and static production output |
| Graph | React Flow 11 (`reactflow`) | Mature custom-node graph, pan/zoom, edge rendering |
| Charts | Recharts 2 | Declarative SVG charts with accessible tooltips |
| Styling | Plain CSS | No runtime CSS-in-JS; one design system, predictable output |
| Tests | Vitest | Fast Node-side tests of pure simulation logic |
| Persistence | `localStorage` | Zero backend, explicit local-only storage |

No icon library is used; the interface uses a small in-repo SVG icon set.

## Directory map

```text
src/
├── data/
│   ├── systems.js        six system definitions, capacities, kinetics, positions
│   ├── dependencies.js   directed edge list with weights/thresholds/lags
│   ├── scenarios.js      documented example setups and the default scenario
│   └── navigation.js     sidebar/workspace metadata
├── simulation/
│   ├── engine.js         createSimulation, stepSimulation, applyOperatorLimit, runScenario
│   ├── metrics.js        system/network metrics, comparison rows, chart series
│   ├── format.js         T+HH:MM, percentages, capacity formatting
│   └── index.js          public re-exports
├── state/
│   ├── SimulationContext.jsx  state container, playback loop, scenario actions
│   └── storage.js             guarded localStorage reads/writes
├── components/
│   ├── DependencyGraph.jsx    React Flow canvas and custom nodes/edges
│   ├── InspectorPanel.jsx     selected-system telemetry and controls
│   ├── PerformanceChart.jsx   capacity time series
│   ├── ImpactChart.jsx        peak loss-of-service bars
│   ├── ComparisonChart.jsx    baseline vs disrupted bars
│   ├── EventTimeline.jsx      filterable event log
│   ├── SimulationControls.jsx run/pause/step/reset, rate, mode, tick indicator
│   ├── StatusCards.jsx        six compact status cards
│   ├── DependencyTable.jsx    documented edge matrix
│   ├── SaveScenarioDialog.jsx modal save flow
│   └── shell components      Sidebar, TopBar, Brand, StatusPill, Icons
├── views/
│   ├── OverviewView.jsx       main 65/35 workspace + analytics
│   ├── NetworkView.jsx        full graph + graph parameters + matrix
│   ├── SimulationLabView.jsx  experiment configuration + examples
│   ├── ComparisonView.jsx     canonical baseline comparison
│   ├── EventsView.jsx         full event history
│   ├── DocsView.jsx           in-app model reference
│   └── SettingsView.jsx       preferences and saved scenarios
├── tests/
│   ├── engine.test.js         model rules, determinism, recovery
│   └── model.test.js          graph integrity, analytics, scenarios
├── App.jsx                    workspace shell and view switch
├── main.jsx                   provider + mount
├── styles.css                 design tokens and interface styles
└── flow.css                   React Flow-specific overrides
```

## Simulation engine

### Purity

`stepSimulation(simulation)` returns a new simulation object. It does not mutate its input, read the wall clock, call random functions or depend on network state. The complete run is therefore a deterministic fold:

```text
sim₀ = createSimulation(config)
simₙ₊₁ = stepSimulation(simₙ)
```

Operator changes are explicit state transitions via `applyOperatorLimit`, which updates the limit map and appends an event. The next step observes the new limit. This keeps interventions inside the audited state history.

### Snapshot shape

```js
{
  tick: 4,
  systems: {
    water: {
      health, operatorLimit, dependencyMultiplier,
      effective, capacity, demand, los, impact, peakImpact,
      incoming: [{ edgeId, source, upstreamEffective, deficit, transmitted }],
      lastStressTick, status
    },
    // ...
  },
  networkStress
}
```

Snapshots include per-edge transmission values, allowing the inspector and tables to explain *why* a system changed rather than only displaying the result.

### Loop containment

Edges are evaluated against a lagged snapshot. This removes the need for iterative convergence, avoids circular `useEffect` chains and guarantees that one tick moves a signal by at most one dependency hop. Multiplicative coupling bounds the dependency multiplier independently of graph shape.

## State management

`SimulationProvider` owns:

- current scenario configuration;
- live simulation object (snapshots and events);
- run/pause state and wall-clock playback timer;
- baseline/disrupted view mode;
- selected system;
- playback speed and preferences;
- saved scenarios;
- toast notifications.

Derived values (`baselineRun`, `canonicalDisruptedRun`, `recoveryRun`, `comparison`, viewed snapshot) are computed with `useMemo`. The baseline is recomputed only when the horizon changes; the canonical disrupted and recovery runs only when the scenario changes. The recovery experiment applies a deterministic restore at one third of the horizon, independent of live operator actions.

Playback uses `setTimeout` per tick, cleared on pause/unmount. It never advances past the horizon. Since `stepSimulation` is pure and cheap (six systems, small arrays), there is no worker or incremental cache complexity.

### Scenario lifecycle

- At tick 0, editing capacity/source rebuilds the simulation immediately.
- After tick 0, the initial experiment configuration is locked; the only permitted live intervention is restoring the source's output to 100%.
- Reset rebuilds from the configured scenario.
- Switching horizon rebuilds from tick 0 (the UI states this).
- Loading a saved scenario or example rebuilds from tick 0 and selects its source.

## Rendering

### Graph

React Flow receives memoized nodes/edges derived from the viewed snapshot. Each edge's severity is derived from the target's recorded inbound effect (or computed from the current state at tick 0). Only propagating edges animate, and animation is disabled by CSS under reduced-motion preferences.

Node positions are declared in `systems.js` for a stable, readable three-layer layout (root supply → utilities/network/mobility → human services). Nodes are intentionally non-draggable so the published layout remains comparable between screenshots and sessions.

### Charts

Recharts consumes chart-ready series produced by `metrics.js`. Axes are explicitly labelled and units shown. Animation is disabled to keep ticks deterministic visually and to respect reduced motion. Tooltips expose the underlying percentages, and impact bars carry text labels in addition to colour.

### Charts and large data

Default horizons are 12–72 ticks, so chart data remains small. If long horizons or Monte Carlo ensembles are added, aggregate or downsample before rendering; the engine and metrics layer do not require DOM access.

## Persistence

`src/state/storage.js` guards every access in `try/catch` so that disabled or full storage cannot break the application. Stored data is validated on read:

- `nexus.scenarios.v1` — up to 50 scenario configurations (`id`, `name`, `seedSystem`, `seedCapacity`, `horizon`, optional metadata).
- `nexus.prefs.v1` — speed and reduced-motion preference.

Runtime simulation progress is deliberately **not** persisted. Saved scenarios represent reproducible experiment definitions, not session state.

## Accessibility and responsiveness

- Semantic buttons for all actions, `aria-pressed` on toggles, `aria-current` on navigation, labelled form controls, `role="switch"` for preferences.
- Visible `:focus-visible` outline in cyan.
- Status is conveyed by text labels as well as colour; charts have axis labels and legend text.
- Colour contrast targets the dark palette tokens defined in `styles.css`.
- React Flow canvas scrolls horizontally below 900px rather than shrinking nodes to unreadable sizes.
- Sidebar becomes an off-canvas drawer at 900px; the inspector and analytics stack. Status cards reflow to three, then two columns.
- `prefers-reduced-motion` and the in-app motion preference both suppress transitions and edge animation.

## Testing

Vitest runs a Node-only suite against the pure engine and metrics modules. There are no DOM tests; interaction correctness is covered indirectly by pure state transitions and by manual verification of the running application. The suite includes formula-level assertions, determinism, lag timing, recovery timing, boundedness and graph/data integrity.

Run:

```bash
npm test
```

## Extension points

- **New system:** add a definition to `systems.js`, a position, any edges in `dependencies.js`, and tests. UI picks it up through the shared arrays. Graph layout will need review.
- **New dependency rule:** implement in `dependencyTransmission` or the step function, document it in `docs/MODEL.md` and `DocsView`, then add boundary tests.
- **Additional metrics:** extend `metrics.js`; keep derivation from snapshots, not from duplicate state.
- **New scenario fields:** extend `scenario` shape, validation in `storage.js`, the save dialog and comparison card.
- **Import/export:** serialize the scenario shape; the engine already accepts plain configuration objects.

## Deliberate non-goals

- No backend or real-time data; the model must run entirely locally.
- No authentication or multi-user state.
- No AI services or generated “insights” that could obscure the documented rules.
- No hidden stochasticity. Any future stochastic feature must be explicitly seeded and separated from the deterministic core.
