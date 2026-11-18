import Icon from './Icons.jsx';
import StatusPill from './StatusPill.jsx';
import { SYSTEMS } from '../data/systems.js';
import { useSimulation } from '../state/SimulationContext.jsx';
import { formatNumber } from '../simulation/format.js';

export default function StatusCards() {
  const { viewedSnapshot, selectedSystemId, selectSystem, scenario } = useSimulation();
  return (
    <div className="status-cards" aria-label="System status summary">
      {SYSTEMS.map((definition) => {
        const system = viewedSnapshot.systems[definition.id];
        const capacityPct = Math.round(system.effective * 100);
        const isSelected = selectedSystemId === definition.id;
        const isSeed = scenario.seedSystem === definition.id;
        return (
          <button
            type="button"
            key={definition.id}
            className={`status-card ${isSelected ? 'is-selected' : ''}`}
            onClick={() => selectSystem(definition.id)}
            aria-pressed={isSelected}
            title={`Select ${definition.name}`}
          >
            <div className="status-card-top">
              <span className="status-card-code mono">
                <Icon name={definition.icon} size={13} />
                {definition.code}
              </span>
              {isSeed && <span className="source-tag">SRC</span>}
              <StatusPill status={system.status} />
            </div>
            <div className="status-card-name">{definition.name}</div>
            <div className="status-card-cap">
              <span className="mono status-card-pct">{capacityPct}%</span>
              <span className="status-card-cap-label">capacity</span>
            </div>
            <div className={`mini-meter meter-${system.status}`} aria-hidden="true">
              <span style={{ width: `${capacityPct}%` }} />
            </div>
            <div className="status-card-foot mono">
              <span>{formatNumber(system.capacity, 0)}</span>
              <span className="muted">/ {formatNumber(system.demand, 0)}</span>
              <span className="unit">{definition.unit}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
