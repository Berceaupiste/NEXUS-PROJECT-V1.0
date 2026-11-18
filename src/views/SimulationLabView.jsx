import { useEffect, useState } from 'react';
import Icon from '../components/Icons.jsx';
import SimulationControls from '../components/SimulationControls.jsx';
import PerformanceChart from '../components/PerformanceChart.jsx';
import RecoveryChart from '../components/RecoveryChart.jsx';
import EventTimeline from '../components/EventTimeline.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { SYSTEMS, SYSTEM_BY_ID } from '../data/systems.js';
import { EXAMPLE_SCENARIOS } from '../data/scenarios.js';
import { formatPercent } from '../simulation/format.js';

export default function SimulationLabView({ onNavigate }) {
  const {
    scenario,
    sim,
    selectedSystemId,
    canConfigure,
    configureDisruption,
    setHorizon,
    resetSimulation,
    loadExample,
    baselineRun,
    running,
    isComplete,
    network,
    notify,
    isBaselineView,
  } = useSimulation();

  const [plotIds, setPlotIds] = useState(() => [scenario.seedSystem, 'healthcare']);
  const [capacityDraft, setCapacityDraft] = useState(Math.round(scenario.seedCapacity * 100));

  useEffect(() => {
    setCapacityDraft(Math.round(scenario.seedCapacity * 100));
  }, [scenario.seedCapacity, scenario.seedSystem]);

  useEffect(() => {
    setPlotIds((previous) => (previous.includes(scenario.seedSystem) ? previous : [scenario.seedSystem, ...previous]));
  }, [scenario.seedSystem]);

  const source = SYSTEM_BY_ID[scenario.seedSystem];
  const capacityPct = Math.round(scenario.seedCapacity * 100);
  const operatorLimitPct = Math.round((sim.operatorLimits[scenario.seedSystem] ?? 1) * 100);
  const sourceSystem = sim.snapshots[sim.tick]?.systems[scenario.seedSystem];

  const togglePlot = (id) => {
    setPlotIds((previous) => {
      if (!previous.includes(id)) return [...previous, id];
      if (previous.length === 1) return previous;
      return previous.filter((item) => item !== id);
    });
  };

  return (
    <div className="view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / SIMULATION LAB</div>
          <h1>Experiment configuration</h1>
          <p>
            Define a single-source capacity disruption, choose a horizon and advance the deterministic tick engine. Every rule
            and parameter shown here is used directly by the simulation.
          </p>
        </div>
        <div className="view-head-actions">
          <span className={`lab-state mono ${running ? 'is-running' : ''}`}>
            <i /> {running ? 'RUNNING' : isComplete ? 'HORIZON REACHED' : sim.tick === 0 ? 'READY' : 'PAUSED'}
          </span>
        </div>
      </header>

      <SimulationControls />

      <div className="lab-grid">
        <section className="panel lab-config">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">EXPERIMENT DEFINITION</div>
              <h2 className="panel-title">Disruption parameters</h2>
            </div>
            <span className="mono muted">T+0 config</span>
          </div>

          <div className="form-grid">
            <label className="field" htmlFor="seed-system">
              <span className="field-label">Disruption source</span>
              <select
                id="seed-system"
                className="select"
                value={scenario.seedSystem}
                disabled={!canConfigure || isBaselineView}
                onChange={(event) => configureDisruption(event.target.value, scenario.seedCapacity)}
              >
                {SYSTEMS.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.code} — {system.name}
                  </option>
                ))}
              </select>
              <span className="hint">Single-source model. All other systems begin at design capacity.</span>
            </label>

            <label className="field" htmlFor="seed-capacity">
              <span className="field-label-row">
                <span>Operator capacity</span>
                <span className="mono">{capacityDraft}%</span>
              </span>
              <input
                id="seed-capacity"
                className="range"
                type="range"
                min="0"
                max="100"
                step="5"
                value={capacityDraft}
                disabled={!canConfigure || isBaselineView}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setCapacityDraft(value);
                  configureDisruption(scenario.seedSystem, value / 100);
                }}
                style={{ '--range-value': `${capacityDraft}%` }}
              />
              <span className="hint">
                {canConfigure
                  ? `${source.code} output relative to its ${source.designCapacity} ${source.unit} design capacity.`
                  : `Locked mid-run at ${operatorLimitPct}%. Reset the run to change the initial disruption.`}
              </span>
            </label>

            <label className="field" htmlFor="horizon">
              <span className="field-label">Simulation horizon</span>
              <select
                id="horizon"
                className="select"
                value={scenario.horizon}
                onChange={(event) => setHorizon(Number(event.target.value))}
              >
                {[12, 24, 36, 48, 72].map((value) => (
                  <option key={value} value={value}>
                    {value} ticks · {value} h
                  </option>
                ))}
              </select>
              <span className="hint">Changing the horizon resets the run to a clean T+00:00 state.</span>
            </label>

            <div className="field">
              <span className="field-label">Run actions</span>
              <div className="lab-actions">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    resetSimulation();
                    notify('Scenario returned to its configured T+00:00 conditions.', 'success');
                  }}
                >
                  <Icon name="reset" size={13} />
                  Restore conditions
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => onNavigate('docs')}>
                  <Icon name="docs" size={13} />
                  Model docs
                </button>
              </div>
            </div>
          </div>

          <div className="lab-summary mono">
            <div><span>Source</span><span>{source.code} · {source.name}</span></div>
            <div><span>Initial output</span><span>{capacityPct}% · {Math.round(sourceSystem?.capacity ?? source.designCapacity)} {source.unit}</span></div>
            <div><span>Current limit</span><span>{operatorLimitPct}%</span></div>
            <div><span>Focus system</span><span>{selectedSystemId.toUpperCase()}</span></div>
            <div><span>Network LOS</span><span>{formatPercent(1 - network.worstNetworkStress, 1)} worst</span></div>
            <div><span>Randomness</span><span>none · deterministic</span></div>
          </div>
        </section>

        <section className="panel chart-panel lab-chart">
          <PerformanceChart
            simulation={sim}
            systemIds={plotIds}
            baseline={baselineRun}
            horizon={scenario.horizon}
            height={300}
            showPicker
            onToggleSystem={togglePlot}
          />
          <div className="panel-foot">
            <span className="panel-foot-note">
              Select system tags to plot multiple trajectories. Dashed cyan is the no-disruption baseline network average.
            </span>
          </div>
        </section>
      </div>

      <section className="panel recovery-panel">
        <RecoveryChart height={224} />
        <div className="panel-foot">
          <span className="panel-foot-note">
            Canonical recovery experiment, independent of live operator actions. The restore point is fixed at one third of the
            horizon so results stay comparable between runs.
          </span>
        </div>
      </section>

      <section className="panel examples-panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow mono">REPRODUCIBLE SETUPS</div>
            <h2 className="panel-title">Example scenarios</h2>
          </div>
          <span className="panel-foot-note mono">loading a scenario resets the run</span>
        </div>
        <div className="example-grid">
          {EXAMPLE_SCENARIOS.map((example) => {
            const definition = SYSTEM_BY_ID[example.seedSystem];
            const isActive =
              scenario.seedSystem === example.seedSystem &&
              Math.abs(scenario.seedCapacity - example.seedCapacity) < 0.001 &&
              scenario.horizon === example.horizon;
            return (
              <article key={example.id} className={`example-card ${isActive ? 'is-active' : ''}`}>
                <div className="example-top">
                  <span className="mono example-code">{definition.code}</span>
                  <span className="mono example-cap">{Math.round(example.seedCapacity * 100)}% · {example.horizon}h</span>
                </div>
                <h3>{example.name}</h3>
                <p>{example.description}</p>
                <button
                  type="button"
                  className="btn btn-quiet btn-full"
                  onClick={() => loadExample(example)}
                >
                  Load scenario
                  <Icon name="arrow" size={12} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <EventTimeline compact />
    </div>
  );
}
