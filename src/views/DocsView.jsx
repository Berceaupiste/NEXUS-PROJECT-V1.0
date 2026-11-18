import DependencyTable from '../components/DependencyTable.jsx';
import { SYSTEM_BY_ID, SYSTEMS } from '../data/systems.js';
import { STATUS_BANDS } from '../simulation/engine.js';
import { useSimulation } from '../state/SimulationContext.jsx';
import Icon from '../components/Icons.jsx';

function Equation({ children }) {
  return <pre className="equation mono">{children}</pre>;
}

export default function DocsView() {
  const { scenario } = useSimulation();

  return (
    <div className="view docs-view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / MODEL DOCUMENTATION</div>
          <h1>Model rules and equations</h1>
          <p>
            This page is the in-app reference for the simulation engine. The same content is maintained in{' '}
            <span className="mono">docs/MODEL.md</span> and <span className="mono">docs/ARCHITECTURE.md</span>.
          </p>
        </div>
        <div className="view-head-actions">
          <span className="scope-badge">Educational model · not predictive</span>
        </div>
      </header>

      <div className="doc-banner">
        <Icon name="alert" size={16} />
        <div>
          <strong>Scope statement.</strong> NEXUS is a deterministic teaching model of dependency propagation. System values,
          weights and lags are illustrative assumptions. Nothing here is measured from real infrastructure or validated against
          historical outages, and no output predicts actual failure.
        </div>
      </div>

      <div className="docs-grid">
        <section className="panel doc-card doc-wide">
          <h2>1 · Discrete time and state</h2>
          <p>
            One tick equals one simulated hour. At each tick <span className="mono">t</span>, every system{' '}
            <span className="mono">s</span> stores a physical health value <span className="mono">h_s(t) ∈ [0,1]</span>, an
            operator limit <span className="mono">o_s(t) ∈ [0,1]</span>, an effective capacity ratio{' '}
            <span className="mono">e_s(t)</span>, demand and level of service. The simulation is initialized once and advanced
            with a pure step function; no random process is used.
          </p>
          <Equation>
{`e_s(t) = h_s(t) · o_s(t) · D_s(t)          effective capacity ratio
C_s(t) = e_s(t) · designCapacity_s          capacity in system units
ρ_s(t) = demand_s(t) / C_s(t)               load ratio (informational)
LOS_s(t) = min(C_s(t) / demand_s(t), 1)     level of service`}
          </Equation>

          <h2>2 · Dependency transmission</h2>
          <p>
            For each directed edge <span className="mono">i → s</span> with weight <span className="mono">w</span>, upstream
            threshold <span className="mono">θ</span> and lag <span className="mono">L</span>, the engine reads the upstream
            effective capacity from snapshot <span className="mono">t − L</span>:
          </p>
          <Equation>
{`upstream_i(t) = e_i(t − L)
deficit_i(t)  = clamp((θ_i − upstream_i(t)) / θ_i, 0, 1)
transmitted_i(t) = w_i · deficit_i(t)

D_s(t) = Π_i (1 − transmitted_i(t))`}
          </Equation>
          <p>
            Multiplication enforces a hard bound: each dependency can only remove capacity, and the combined multiplier is
            always in <span className="mono">(0,1]</span>. An upstream system at or above its threshold transmits zero. The
            product is recomputed from lagged snapshots each tick, so a cycle cannot transmit more than one hop per tick and no
            iterative fixpoint or unbounded loop exists.
          </p>

          <h2>3 · Health degradation and recovery</h2>
          <p>
            Physical health responds only to dependency-induced shortfall, not to the operator limit. This guarantees that a
            restored upstream always permits downstream recovery.
          </p>
          <Equation>
{`shortfall_s(t) = 1 − D_s(t)
severity_s(t)  = clamp((shortfall_s(t) − 0.05) / 0.95, 0, 1)
h_s(t+1) = clamp(h_s(t) − degradationRate_s · severity_s(t))     if shortfall > 0.05
h_s(t+1) = clamp(h_s(t) + repairRate_s)                         if shortfall ≤ 0.05
                                                               and ticksSinceStress ≥ recoveryDelay`}
          </Equation>
          <p>
            A system that is losing capacity from dependencies accumulates wear at its degradation rate. Once inbound coupling
            is restored, it waits out its recovery delay and then repairs toward full health at its repair rate. Health never
            changes instantly, so recovery curves are gradual and system-specific.
          </p>

          <h2>4 · Demand surge and status bands</h2>
          <Equation>
{`networkStress(t) = mean_s (1 − e_s(t))
demand_s(t+1) = baseDemand_s · (1 + demandSurge_s · networkStress(t))
status = operational if e ≥ 0.90
         warning     if 0.65 ≤ e < 0.90
         critical    if e < 0.65`}
          </Equation>
          <p>
            Demand surge models the extra load placed on critical services when the wider network is degraded. Event logs record
            only band transitions, operator actions and recoveries. The engine exposes the dominant inbound edge in each event
            detail.
          </p>

          <h2>5 · Determinism and reproducibility</h2>
          <p>
            The engine has no random source, no wall-clock input and no dependence on iteration order outside the fixed system
            array. Given the same scenario configuration and operator action sequence, the snapshots and event log are identical.
            The scenario comparison view re-runs both experiments from tick zero to keep comparisons symmetric.
          </p>

          <h2>6 · Recovery profile experiment</h2>
          <p>
            The Simulation Lab also runs a separate recovery experiment. The configured source is held at its disrupted
            capacity for a fixed restore point, then its operator limit is returned to 100%:
          </p>
          <Equation>
{`restoreTick = clamp(floor(horizon / 3), 3, 12)
o_source(t) = seedCapacity   for t ≤ restoreTick
o_source(t) = 1              for t > restoreTick`}
          </Equation>
          <p>
            The source returns on the next tick because operator throttling does not damage health. Dependent systems recover
            only after their individual recovery delays and at their individual repair rates. The experiment is canonical and
            does not depend on live operator actions; it is an analytical illustration, not a repair forecast.
          </p>
        </section>

        <aside className="panel doc-card">
          <h2>Current parameters</h2>
          <div className="param-list">
            <div><span>Disruption source</span><span className="mono">{SYSTEM_BY_ID[scenario.seedSystem].code}</span></div>
            <div><span>Initial output</span><span className="mono">{Math.round(scenario.seedCapacity * 100)}%</span></div>
            <div><span>Horizon</span><span className="mono">{scenario.horizon} ticks</span></div>
            <div><span>Operational band</span><span className="mono">≥ {STATUS_BANDS.operational * 100}%</span></div>
            <div><span>Warning band</span><span className="mono">≥ {STATUS_BANDS.warning * 100}%</span></div>
            <div><span>Stress deadband</span><span className="mono">5% shortfall</span></div>
            <div><span>Randomness</span><span className="mono">none</span></div>
          </div>

          <h2>System kinetics</h2>
          <div className="table-wrap compact-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col" className="num">Repair</th>
                  <th scope="col" className="num">Delay</th>
                  <th scope="col" className="num">Degrade</th>
                </tr>
              </thead>
              <tbody>
                {SYSTEMS.map((system) => (
                  <tr key={system.id}>
                    <td className="mono">{system.code}</td>
                    <td className="num mono">{system.repairRate.toFixed(3)}</td>
                    <td className="num mono">{system.recoveryDelay}</td>
                    <td className="num mono">{system.degradationRate.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Reference documents</h2>
          <ul className="file-list mono">
            <li>docs/MODEL.md</li>
            <li>docs/ARCHITECTURE.md</li>
            <li>README.md</li>
            <li>CONTRIBUTING.md</li>
          </ul>
        </aside>
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow mono">GRAPH PARAMETERS</div>
            <h2 className="panel-title">Dependency weights, thresholds and lags</h2>
          </div>
        </div>
        <DependencyTable />
      </section>

      <div className="docs-grid two-col">
        <section className="panel doc-card">
          <h2>Limitations</h2>
          <ul className="doc-list">
            <li>Single-source disruption; simultaneous events are out of scope.</li>
            <li>Six aggregated systems with no geography, topology or time-of-day demand profile.</li>
            <li>Parameters are assumptions, not calibrated measurements or forecasts.</li>
            <li>No economics, human behaviour, repair crews, spare capacity or operator strategy.</li>
            <li>Dependency effects are linear in the normalized deficit and multiplicative across edges; real systems include redundancy and non-linear thresholds.</li>
            <li>Social and institutional consequences are outside the model.</li>
          </ul>
        </section>
        <section className="panel doc-card">
          <h2>Future roadmap</h2>
          <ul className="doc-list">
            <li>Multi-source and staged disruptions with scenario timelines.</li>
            <li>Sensitivity sweeps over weights, thresholds and repair rates.</li>
            <li>Monte Carlo ensembles while preserving reproducible seeds.</li>
            <li>Import/export of scenario files and comparison reports.</li>
            <li>Calibration against published resilience case studies.</li>
            <li>Redundancy states and partial islanding for power and water networks.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
