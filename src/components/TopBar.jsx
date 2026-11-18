import Icon from './Icons.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { VIEW_BY_ID } from '../data/navigation.js';
import { formatTick } from '../simulation/format.js';

export default function TopBar({ view, onMenu, onSave, onNavigate }) {
  const { stateLabel, sim, horizon, mode, running } = useSimulation();

  const viewMeta = VIEW_BY_ID[view] ?? VIEW_BY_ID.overview;
  const stateTone = running ? 'active' : sim.tick >= horizon ? 'complete' : 'idle';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation" type="button">
          <Icon name="menu" />
        </button>
        <div className="breadcrumb">
          <span className="breadcrumb-root">NEXUS</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{viewMeta.title}</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className={`sim-state sim-state-${stateTone}`} title="Current simulation state">
          <span className="sim-state-dot" aria-hidden="true" />
          <span>{stateLabel}</span>
          <span className="sim-state-sep">·</span>
          <span className="mono">{formatTick(sim.tick)}</span>
          <span className="sim-state-muted mono">/ T+{String(horizon).padStart(2, '0')}:00</span>
          <span className={`mode-tag mode-tag-${mode}`}>{mode}</span>
        </div>
        <button className="btn btn-quiet" type="button" onClick={onSave} title="Save scenario to local storage">
          <Icon name="save" size={14} />
          <span>Save scenario</span>
        </button>
        <button
          className="icon-btn"
          type="button"
          onClick={() => onNavigate('settings')}
          aria-label="Open preferences"
          title="Preferences"
        >
          <Icon name="settings" size={15} />
        </button>
      </div>
    </header>
  );
}
