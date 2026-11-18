import EventTimeline from '../components/EventTimeline.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { formatTick } from '../simulation/format.js';

export default function EventsView() {
  const { sim, baselineRun, isBaselineView } = useSimulation();
  const events = isBaselineView ? baselineRun.events : sim.events;
  const counts = {
    total: events.length,
    critical: events.filter((event) => event.severity === 'critical').length,
    warning: events.filter((event) => event.severity === 'warning').length,
    recovery: events.filter((event) => event.severity === 'recovery').length,
    actions: events.filter((event) => event.kind === 'action').length,
  };

  return (
    <div className="view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / EVENT HISTORY</div>
          <h1>Recorded state transitions</h1>
          <p>
            Every status change and operator action is appended to an ordered, deterministic log. Events are generated only
            when a system crosses a documented band boundary, not on every tick.
          </p>
        </div>
        <div className="view-head-actions">
          <span className="mono muted">latest tick {formatTick(sim.tick)}</span>
        </div>
      </header>

      <div className="kpi-strip event-kpis">
        <div className="kpi"><span className="kpi-label">Total events</span><span className="kpi-value mono">{counts.total}</span><span className="kpi-sub">recorded this run</span></div>
        <div className="kpi"><span className="kpi-label">Critical</span><span className="kpi-value mono kpi-negative">{counts.critical}</span><span className="kpi-sub">band &lt; 65% capacity</span></div>
        <div className="kpi"><span className="kpi-label">Warning</span><span className="kpi-value mono kpi-warning">{counts.warning}</span><span className="kpi-sub">band 65–90%</span></div>
        <div className="kpi"><span className="kpi-label">Recovery</span><span className="kpi-value mono kpi-positive">{counts.recovery}</span><span className="kpi-sub">returned operational</span></div>
        <div className="kpi"><span className="kpi-label">Operator actions</span><span className="kpi-value mono">{counts.actions}</span><span className="kpi-sub">capacity interventions</span></div>
      </div>

      <EventTimeline />

      <div className="docs-grid two-col">
        <section className="panel doc-card">
          <h2>Event generation rules</h2>
          <ul className="doc-list">
            <li>A status event is emitted when a system's effective capacity ratio crosses the 90% or 65% band boundary.</li>
            <li>A recovery event is emitted when a non-operational system returns to the operational band.</li>
            <li>Operator actions are appended immediately at the current tick; their downstream effects appear after each edge lag.</li>
            <li>Events are ordered by tick, then by the fixed system order used throughout the model.</li>
          </ul>
        </section>
        <section className="panel doc-card">
          <h2>Event fields</h2>
          <div className="param-list">
            <div><span>Tick</span><span className="mono">integer, 1 tick = 1 hour</span></div>
            <div><span>Severity</span><span className="mono">critical · warning · recovery · info</span></div>
            <div><span>Kind</span><span className="mono">status · recovery · action</span></div>
            <div><span>System</span><span className="mono">ELEC · WTR · TEL · TRN · HCR · EMG</span></div>
            <div><span>Detail</span><span className="mono">capacity, multiplier, dominant edge</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
