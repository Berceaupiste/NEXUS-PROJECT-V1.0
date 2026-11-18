import { useEffect, useRef, useState } from 'react';
import { useSimulation } from '../state/SimulationContext.jsx';
import { SYSTEM_BY_ID } from '../data/systems.js';
import Icon from './Icons.jsx';

export default function SaveScenarioDialog({ open, onClose }) {
  const { scenario, saveCurrentScenario } = useSimulation();
  const [name, setName] = useState(scenario.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(scenario.name);
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, scenario.name]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (saveCurrentScenario(name.trim())) onClose();
  };

  const source = SYSTEM_BY_ID[scenario.seedSystem];

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
        <div className="modal-head">
          <div>
            <div className="panel-eyebrow mono">LOCAL STORAGE</div>
            <h2 id="save-dialog-title">Save scenario</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close save dialog">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="field" htmlFor="scenario-name">
            <span className="field-label">Scenario name</span>
            <input
              id="scenario-name"
              ref={inputRef}
              type="text"
              value={name}
              maxLength={72}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Grid disturbance — evening peak"
            />
          </label>

          <div className="save-summary mono">
            <div><span>Source</span><span>{source?.code} · {source?.name}</span></div>
            <div><span>Capacity</span><span>{Math.round(scenario.seedCapacity * 100)}%</span></div>
            <div><span>Horizon</span><span>{scenario.horizon} ticks</span></div>
          </div>

          <p className="modal-note">
            Saves the experiment configuration only. A loaded scenario always starts at <span className="mono">T+00:00</span> with all systems at
            their configured initial capacity.
          </p>

          <div className="modal-actions">
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={!name.trim()}>
              <Icon name="save" size={13} />
              Save scenario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
