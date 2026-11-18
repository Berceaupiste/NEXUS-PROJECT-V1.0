import Icon from '../components/Icons.jsx';
import { useSimulation, SPEEDS } from '../state/SimulationContext.jsx';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { formatPercent } from '../simulation/format.js';

function Toggle({ id, checked, onChange, label, description }) {
  return (
    <div className="setting-row">
      <div className="setting-copy">
        <label htmlFor={id}>{label}</label>
        <p>{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export default function SettingsView() {
  const {
    prefs,
    setPrefs,
    speed,
    setSpeed,
    savedScenarios,
    loadExample,
    removeSavedScenario,
    removeAllSaved,
    notify,
    scenario,
  } = useSimulation();

  const handleLoad = (saved) => {
    loadExample(saved);
  };

  const clearAll = () => {
    if (window.confirm('Delete every locally saved scenario? This cannot be undone.')) {
      removeAllSaved();
    }
  };

  return (
    <div className="view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / SETTINGS</div>
          <h1>Workspace settings</h1>
          <p>Local preferences and saved experiment configurations. Everything is stored in this browser only.</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">PREFERENCES</div>
              <h2 className="panel-title">Display and playback</h2>
            </div>
          </div>
          <Toggle
            id="reduced-motion"
            label="Reduced motion"
            description="Disable edge animation, chart transitions and interface fades."
            checked={prefs.reduceMotion}
            onChange={(value) => {
              setPrefs({ reduceMotion: value });
              notify(`Reduced motion ${value ? 'enabled' : 'disabled'}.`, 'info');
            }}
          />

          <div className="setting-row">
            <div className="setting-copy">
              <label htmlFor="default-speed">Playback rate</label>
              <p>Interval between discrete simulation ticks. Each tick always represents one simulated hour.</p>
            </div>
            <select
              id="default-speed"
              className="select"
              value={speed}
              onChange={(event) => {
                setSpeed(Number(event.target.value));
                notify('Default playback rate updated.', 'success');
              }}
            >
              {SPEEDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.value} ms
                </option>
              ))}
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <label htmlFor="active-scenario">Active scenario</label>
              <p>Current experiment configuration. Reset it from the overview or simulation lab.</p>
            </div>
            <div className="mono setting-value">
              {SYSTEM_BY_ID[scenario.seedSystem].code} @ {Math.round(scenario.seedCapacity * 100)}%
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <label htmlFor="reset-prefs">Reset preferences</label>
              <p>Return reduced motion and playback rate to application defaults.</p>
            </div>
            <button
              id="reset-prefs"
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setPrefs({ reduceMotion: false });
                setSpeed(900);
                notify('Preferences restored to defaults.', 'success');
              }}
            >
              <Icon name="reset" size={13} />
              Restore defaults
            </button>
          </div>
        </section>

        <aside className="panel settings-side">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">STORAGE</div>
              <h2 className="panel-title">Local data</h2>
            </div>
          </div>
          <div className="param-list">
            <div><span>Saved scenarios</span><span className="mono">{savedScenarios.length} / 50</span></div>
            <div><span>Storage</span><span className="mono">browser local</span></div>
            <div><span>Backend</span><span className="mono">none</span></div>
            <div><span>Model output</span><span className="mono">deterministic</span></div>
          </div>
          <p className="param-note-plain">
            Saved scenarios contain only the experiment configuration. No telemetry, account or device data is transmitted.
            Clearing browser data also removes saved scenarios.
          </p>
          <button type="button" className="btn btn-danger btn-full" onClick={clearAll} disabled={!savedScenarios.length}>
            <Icon name="trash" size={13} />
            Delete all saved scenarios
          </button>
        </aside>
      </div>

      <section className="panel saved-panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow mono">SAVED EXPERIMENTS</div>
            <h2 className="panel-title">Local scenarios</h2>
          </div>
          <span className="panel-foot-note mono">loaded scenarios restart at T+00:00</span>
        </div>

        {savedScenarios.length === 0 ? (
          <div className="saved-empty">
            <Icon name="save" size={18} />
            <p>No saved scenarios yet. Use “Save scenario” in the top bar to store the current configuration.</p>
          </div>
        ) : (
          <ul className="saved-list">
            {savedScenarios.map((saved) => (
              <li key={saved.id} className="saved-row">
                <div className="saved-info">
                  <span className="saved-name">{saved.name}</span>
                  <span className="mono saved-meta">
                    {SYSTEM_BY_ID[saved.seedSystem]?.code ?? saved.seedSystem} @{' '}
                    {formatPercent(saved.seedCapacity, 0)} · {saved.horizon} h
                    {saved.savedAt ? ` · saved ${new Date(saved.savedAt).toLocaleDateString()}` : ''}
                  </span>
                </div>
                <div className="saved-actions">
                  <button type="button" className="btn btn-quiet" onClick={() => handleLoad(saved)}>
                    Load
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeSavedScenario(saved.id)}
                    aria-label={`Delete saved scenario ${saved.name}`}
                    title="Delete saved scenario"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel about-panel">
        <div className="about-mark">
          <Icon name="network" size={20} />
        </div>
        <div>
          <h2>NEXUS: CHAOS ENGINE <span className="mono muted">v1.0.0</span></h2>
          <p>
            A deterministic, discrete-time infrastructure cascade simulator built with React, React Flow and Recharts. Values are
            modelled for education and interface demonstration; the application makes no claim to predict real infrastructure
            failure or to provide operational guidance.
          </p>
          <p className="mono about-files">README.md · docs/MODEL.md · docs/ARCHITECTURE.md · LICENSE (MIT)</p>
        </div>
      </section>
    </div>
  );
}
