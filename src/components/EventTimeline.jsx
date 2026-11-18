import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimulation } from '../state/SimulationContext.jsx';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { formatTick, severityLabel } from '../simulation/format.js';
import Icon from './Icons.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'recovery', label: 'Recovery' },
];

export default function EventTimeline({ compact = false }) {
  const { sim, baselineRun, mode, isBaselineView } = useSimulation();
  const [filter, setFilter] = useState('all');
  const listRef = useRef(null);
  const events = isBaselineView ? baselineRun.events : sim.events;

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.severity === filter)),
    [events, filter],
  );

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [events.length, filter]);

  return (
    <section className={`panel timeline-panel ${compact ? 'is-compact' : ''}`} aria-label="Simulation event timeline">
      <div className="panel-head">
        <div>
          <div className="panel-eyebrow mono">EVENT TIMELINE</div>
          <h2 className="panel-title">State transitions</h2>
        </div>
        <div className="timeline-filters" role="group" aria-label="Filter events by severity">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-btn ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-list" ref={listRef}>
        {filtered.length === 0 && (
          <div className="timeline-empty">
            <Icon name="history" size={18} />
            <p>
              {isBaselineView
                ? 'No baseline events. The baseline has no operator disruption.'
                : events.length
                  ? 'No events match this filter.'
                  : 'No events yet. Start the simulation to record state transitions.'}
            </p>
          </div>
        )}
        {filtered.map((event) => {
          const system = SYSTEM_BY_ID[event.systemId];
          return (
            <article key={event.id} className={`event-row severity-${event.severity}`}>
              <div className="event-time mono">
                <span>{formatTick(event.tick)}</span>
                <span className="event-clock">+{event.tick}h</span>
              </div>
              <div className="event-rail">
                <span className={`event-dot dot-${event.severity === 'recovery' ? 'operational' : event.severity}`} />
              </div>
              <div className="event-body">
                <div className="event-title-row">
                  <span className="event-system mono">{system?.code ?? event.systemId.toUpperCase()}</span>
                  <span className={`event-severity severity-text-${event.severity}`}>
                    {severityLabel(event.severity)}
                  </span>
                  <span className="event-kind mono">{event.kind}</span>
                </div>
                <p className="event-title">{event.title}</p>
                <p className="event-detail">{event.detail}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="timeline-foot mono">
        <span>{filtered.length} events shown</span>
        <span>{mode === 'baseline' ? 'baseline mode' : 'disrupted run'} · deterministic log</span>
      </div>
    </section>
  );
}
