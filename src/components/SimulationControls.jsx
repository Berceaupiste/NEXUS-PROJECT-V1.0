import Icon from './Icons.jsx';
import { useSimulation, SPEEDS } from '../state/SimulationContext.jsx';
import { formatTick } from '../simulation/format.js';

export default function SimulationControls({ showMode = true }) {
  const {
    running,
    start,
    pause,
    step,
    resetSimulation,
    speed,
    setSpeed,
    mode,
    setMode,
    sim,
    horizon,
    isComplete,
    isBaselineView,
  } = useSimulation();

  const progress = Math.min(100, (sim.tick / horizon) * 100);

  return (
    <div className="sim-controls" role="toolbar" aria-label="Simulation controls">
      <div className="control-group">
        <button
          type="button"
          className={`btn btn-run ${running ? 'is-running' : ''}`}
          onClick={running ? pause : start}
          title={running ? 'Pause simulation' : isComplete ? 'Restart from T+00:00' : 'Run simulation'}
          aria-label={running ? 'Pause simulation' : 'Run simulation'}
        >
          <Icon name={running ? 'pause' : 'play'} size={14} />
          <span>{running ? 'Pause' : isComplete ? 'Restart' : 'Run'}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={step}
          disabled={isComplete || running}
          title="Advance one discrete tick (1 simulated hour)"
          aria-label="Step simulation forward one tick"
        >
          <Icon name="step" size={15} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={resetSimulation}
          title="Reset scenario to T+00:00 and restore initial capacities"
          aria-label="Reset simulation"
        >
          <Icon name="reset" size={15} />
        </button>
      </div>

      <div className="control-divider" aria-hidden="true" />

      <label className="control-field">
        <span className="control-label">Rate</span>
        <select
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          aria-label="Simulation speed"
          className="select select-compact"
        >
          {SPEEDS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {showMode && (
        <>
          <div className="control-divider" aria-hidden="true" />
          <div className="segmented" role="group" aria-label="Simulation comparison mode">
            <button
              type="button"
              className={mode === 'disrupted' ? 'is-active' : ''}
              onClick={() => setMode('disrupted')}
              aria-pressed={mode === 'disrupted'}
              title="Show the live disrupted run"
            >
              Disrupted
            </button>
            <button
              type="button"
              className={mode === 'baseline' ? 'is-active' : ''}
              onClick={() => setMode('baseline')}
              aria-pressed={mode === 'baseline'}
              title="Show the no-disruption baseline at the same tick"
            >
              Baseline
            </button>
          </div>
        </>
      )}

      <div className="sim-clock">
        <div className="sim-clock-row">
          <span className="mono sim-clock-time">{formatTick(sim.tick)}</span>
          <span className="mono sim-clock-total">/ T+{String(horizon).padStart(2, '0')}:00</span>
        </div>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        {isBaselineView && <span className="sim-clock-note">Baseline view · read-only telemetry</span>}
      </div>
    </div>
  );
}
