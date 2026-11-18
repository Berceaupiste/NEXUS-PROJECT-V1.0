import Icon from '../components/Icons.jsx';
import SimulationControls from '../components/SimulationControls.jsx';
import StatusCards from '../components/StatusCards.jsx';
import DependencyGraph, { GraphKey } from '../components/DependencyGraph.jsx';
import InspectorPanel from '../components/InspectorPanel.jsx';
import PerformanceChart from '../components/PerformanceChart.jsx';
import ImpactChart from '../components/ImpactChart.jsx';
import EventTimeline from '../components/EventTimeline.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { formatPercent } from '../simulation/format.js';

export default function OverviewView({ onNavigate }) {
  const {
    scenario,
    sim,
    baselineRun,
    mode,
    resetSimulation,
    selectedSystemId,
    selectedSystem,
    viewedSnapshot,
    isBaselineView,
  } = useSimulation();

  const displayedSimulation =
    isBaselineView
      ? { ...baselineRun, snapshots: baselineRun.snapshots.slice(0, sim.tick + 1) }
      : sim;

  const seed = SYSTEM_BY_ID[scenario.seedSystem];
  const capacityPct = Math.round(scenario.seedCapacity * 100);
  const networkLOS = Math.round((1 - viewedSnapshot.networkStress) * 100);

  return (
    <div className="view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / OPERATIONS OVERVIEW</div>
          <h1>Infrastructure cascade overview</h1>
          <p>
            Deterministic cascade model across six interdependent systems. Advance discrete hourly ticks and observe how a
            capacity loss in one sector moves through the documented dependency graph.
          </p>
        </div>
        <div className="view-head-actions">
          <div className="scenario-chip">
            <span className="scenario-chip-label mono">SCENARIO</span>
            <span className="scenario-chip-name">{scenario.name}</span>
            <span className="scenario-chip-meta mono">
              {seed.code} @ {capacityPct}% · {scenario.horizon} h
            </span>
          </div>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={resetSimulation}
            title="Reset to T+00:00 and restore the configured initial conditions"
          >
            <Icon name="reset" size={14} />
            Reset scenario
          </button>
        </div>
      </header>

      <SimulationControls />
      <StatusCards />

      <div className="workspace-grid">
        <section className="panel graph-panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">DEPENDENCY GRAPH</div>
              <h2 className="panel-title">System network</h2>
            </div>
            <div className="panel-head-side">
              <span className="network-stat mono">
                {Math.round((1 - viewedSnapshot.networkStress) * 100)}% network LOS
              </span>
              <button type="button" className="link-btn" onClick={() => onNavigate('network')}>
                Full network <Icon name="arrow" size={12} />
              </button>
            </div>
          </div>
          <DependencyGraph height={438} />
          <div className="panel-foot graph-foot">
            <GraphKey />
            <button type="button" className="link-btn" onClick={() => onNavigate('docs')}>
              Model rules <Icon name="docs" size={12} />
            </button>
          </div>
        </section>

        <InspectorPanel />
      </div>

      <div className="analytics-grid">
        <section className="panel chart-panel" aria-label="System performance chart">
          <PerformanceChart
            simulation={displayedSimulation}
            systemIds={[selectedSystemId]}
            baseline={baselineRun}
            height={238}
          />
        </section>

        <section className="panel chart-panel" aria-label="Impact analysis chart">
          <ImpactChart height={244} />
        </section>

        <EventTimeline compact />
      </div>

      <div className="overview-kpis">
        <div className="kpi-strip">
          <div className="kpi">
            <span className="kpi-label">Focus system</span>
            <span className="kpi-value mono">{selectedSystemId.toUpperCase()}</span>
            <span className="kpi-sub">{SYSTEM_BY_ID[selectedSystemId]?.name}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Focus service</span>
            <span className="kpi-value mono">{formatPercent(selectedSystem.los, 1)}</span>
            <span className="kpi-sub">level of service</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Network capacity</span>
            <span className="kpi-value mono">{networkLOS}%</span>
            <span className="kpi-sub">mean effective capacity</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Dependency effects</span>
            <span className="kpi-value mono">{selectedSystem.incoming?.length ?? 0}</span>
            <span className="kpi-sub">evaluated inbound edges</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Run state</span>
            <span className="kpi-value mono">{isBaselineView ? 'BASELINE' : mode.toUpperCase()}</span>
            <span className="kpi-sub">{sim.tick} of {scenario.horizon} ticks recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
