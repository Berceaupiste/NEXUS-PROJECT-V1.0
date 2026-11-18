import DependencyGraph, { GraphKey } from '../components/DependencyGraph.jsx';
import DependencyTable from '../components/DependencyTable.jsx';
import SimulationControls from '../components/SimulationControls.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { DEPENDENCIES } from '../data/dependencies.js';
import { SYSTEMS } from '../data/systems.js';
import { incomingDependencies } from '../simulation/engine.js';

export default function NetworkView() {
  const { viewedSnapshot, scenario, isBaselineView } = useSimulation();
  const feedbackPairs =
    DEPENDENCIES.filter((edge) =>
      DEPENDENCIES.some((reverse) => reverse.source === edge.target && reverse.target === edge.source),
    ).length / 2;
  const maxLag = Math.max(...DEPENDENCIES.map((edge) => edge.lag));
  const activeEdges = DEPENDENCIES.filter((edge) => {
    const target = viewedSnapshot.systems[edge.target];
    return target.incoming?.some((effect) => effect.edgeId === edge.id && effect.transmitted > 0.02);
  }).length;

  return (
    <div className="view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / SYSTEM NETWORK</div>
          <h1>Dependency topology</h1>
          <p>
            Directed relationships between the six modelled systems. Edge weights, upstream thresholds and propagation lags are
            explicit model parameters; select any node or edge row to inspect the affected system.
          </p>
        </div>
        <div className="view-head-actions">
          <div className="scenario-chip">
            <span className="scenario-chip-label mono">ACTIVE EXPERIMENT</span>
            <span className="scenario-chip-name">{scenario.name}</span>
            <span className="scenario-chip-meta mono">{isBaselineView ? 'baseline' : 'disrupted'} · {viewedSnapshot.tick} ticks</span>
          </div>
        </div>
      </header>

      <SimulationControls showMode={false} />

      <div className="network-grid">
        <section className="panel graph-panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">TOPOLOGY / 6 NODES / 12 EDGES</div>
              <h2 className="panel-title">Cascade graph</h2>
            </div>
            <span className="network-stat mono">{activeEdges} active propagation paths</span>
          </div>
          <DependencyGraph height={500} />
          <div className="panel-foot graph-foot">
            <GraphKey />
            <span className="panel-foot-note mono">dashed animation = live propagation</span>
          </div>
        </section>

        <aside className="panel graph-params">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">GRAPH PARAMETERS</div>
              <h2 className="panel-title">Model shape</h2>
            </div>
          </div>
          <div className="param-list">
            <div>
              <span>Nodes</span>
              <span className="mono">{SYSTEMS.length}</span>
            </div>
            <div>
              <span>Directed edges</span>
              <span className="mono">{DEPENDENCIES.length}</span>
            </div>
            <div>
              <span>Feedback edges</span>
              <span className="mono">{feedbackPairs}</span>
            </div>
            <div>
              <span>Maximum lag</span>
              <span className="mono">{maxLag} ticks</span>
            </div>
            <div>
              <span>Root nodes</span>
              <span className="mono">ELEC</span>
            </div>
            <div>
              <span>Coupling law</span>
              <span className="mono">product</span>
            </div>
          </div>
          <div className="param-note">
            <h3>Loop containment</h3>
            <p>
              Edges read upstream capacity from a lagged snapshot, never from the same tick. A cycle can therefore transmit at
              most one hop per tick, and multiplicative coupling keeps every multiplier bounded in <span className="mono">[0, 1]</span>.
            </p>
            <h3>Inbound coverage</h3>
            <p>
              {SYSTEMS.map((system) => `${system.code}:${incomingDependencies(system.id).length}`).join('  ·  ')}
            </p>
          </div>
        </aside>
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow mono">DOCUMENTED RELATIONSHIPS</div>
            <h2 className="panel-title">Dependency matrix</h2>
          </div>
          <span className="panel-foot-note mono">effects evaluated at T+{String(viewedSnapshot.tick).padStart(2, '0')}:00</span>
        </div>
        <DependencyTable />
        <div className="panel-foot">
          <span className="panel-foot-note">
            Current effect is the multiplicative capacity loss transmitted along the edge. Weights and lags are assumptions for
            this educational model, not measurements.
          </span>
        </div>
      </section>
    </div>
  );
}
