import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import StatusPill from './StatusPill.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { SYSTEM_BY_ID, SYSTEMS } from '../data/systems.js';
import { incomingDependencies, outgoingDependencies } from '../simulation/engine.js';
import { formatCapacity, formatNumber, formatPercent, statusLabel } from '../simulation/format.js';

function CapacityControl({ system, definition }) {
  const { scenario, configureDisruption, canConfigure, isBaselineView, restoreCapacity } = useSimulation();
  const isSeed = scenario.seedSystem === definition.id;
  const [draft, setDraft] = useState(Math.round((system.operatorLimit ?? 1) * 100));

  useEffect(() => {
    setDraft(Math.round((system.operatorLimit ?? 1) * 100));
  }, [system.operatorLimit, definition.id]);

  const disabled = isBaselineView || !canConfigure;

  const commit = (value) => {
    const bounded = Math.min(100, Math.max(0, Number(value)));
    setDraft(bounded);
    configureDisruption(definition.id, bounded / 100);
  };

  return (
    <div className="inspector-control">
      <div className="inspector-label-row">
        <label htmlFor="capacity-range" className="field-label">
          Operator-set capacity
        </label>
        <div className="number-field">
          <input
            id="capacity-number"
            type="number"
            min="0"
            max="100"
            step="5"
            value={draft}
            disabled={disabled}
            onChange={(event) => commit(event.target.value)}
            aria-label="Operator-set capacity percentage"
          />
          <span>%</span>
        </div>
      </div>
      <input
        id="capacity-range"
        className="range"
        type="range"
        min="0"
        max="100"
        step="5"
        value={draft}
        disabled={disabled}
        onChange={(event) => commit(event.target.value)}
        aria-valuetext={`${draft} percent of design capacity`}
        style={{ '--range-value': `${draft}%` }}
      />
      <div className="range-scale mono">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
      <p className="hint">
        {isBaselineView
          ? 'Baseline telemetry is read-only. Switch to Disrupted to edit the experiment.'
          : canConfigure
            ? 'Adjusting capacity makes this system the disruption source. All other systems start at 100%.'
            : 'Capacity is locked after T+00:00. Reset the run to reconfigure initial conditions.'}
      </p>
      {isSeed && (
        <button
          type="button"
          className="btn btn-quiet btn-full"
          onClick={restoreCapacity}
          disabled={isBaselineView || (system.operatorLimit ?? 1) >= 1}
          title="Return this system's operator output to 100% and continue the run"
        >
          <Icon name="reset" size={13} />
          Restore output to 100%
        </button>
      )}
    </div>
  );
}

export default function InspectorPanel() {
  const { selectedSystemId, viewedSnapshot, scenario, selectSystem, isBaselineView } = useSimulation();
  const definition = SYSTEM_BY_ID[selectedSystemId] ?? SYSTEMS[0];
  const system = viewedSnapshot.systems[definition.id];
  const incoming = incomingDependencies(definition.id);
  const outgoing = outgoingDependencies(definition.id);
  const incomingEffects = system.incoming ?? [];

  return (
    <aside className="panel inspector" aria-label={`${definition.name} inspector`}>
      <div className="panel-head">
        <div>
          <div className="panel-eyebrow mono">SYSTEM INSPECTOR</div>
          <h2 className="panel-title row-title">
            <span className="inspector-icon">
              <Icon name={definition.icon} size={15} />
            </span>
            {definition.name}
            <span className="mono muted">{definition.code}</span>
          </h2>
        </div>
        <StatusPill status={system.status} />
      </div>

      <div className="inspector-scroll">
        <div className="inspector-id">
          <div>
            <span className="field-label">System identifier</span>
            <div className="mono inspector-id-value">nexus.{definition.id}.01</div>
          </div>
          <div className="inspector-id-side">
            <span className="field-label">Layer</span>
            <div>{definition.layer}</div>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric-cell">
            <span className="metric-label">Effective capacity</span>
            <span className="metric-value mono">{formatPercent(system.effective)}</span>
            <span className="metric-sub">{formatCapacity(system.capacity, definition.unit)}</span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">Demand</span>
            <span className="metric-value mono">{formatCapacity(system.demand, definition.unit)}</span>
            <span className="metric-sub">incl. surge {Math.round(definition.demandSurge * 100)}%</span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">Level of service</span>
            <span className="metric-value mono">{formatPercent(system.los, 1)}</span>
            <span className="metric-sub">min(capacity / demand, 1)</span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">Impact received</span>
            <span className="metric-value mono">{formatPercent(1 - system.dependencyMultiplier)}</span>
            <span className="metric-sub">dependency coupling</span>
          </div>
        </div>

        <div className="capacity-readout">
          <div className="capacity-readout-head">
            <span className="field-label">Capacity envelope</span>
            <span className="mono">
              {Math.round(system.effective * 100)}% / demand {Math.round((system.capacity / Math.max(system.demand, 1)) * 100)}%
            </span>
          </div>
          <div className="envelope-bar">
            <span className="envelope-fill" style={{ width: `${Math.round(system.effective * 100)}%` }} />
            <span className="envelope-demand" style={{ left: `${Math.min(100, Math.round((system.demand / definition.designCapacity) * 100))}%` }} />
          </div>
          <div className="envelope-key mono">
            <span><i className="key-swatch fill" /> capacity</span>
            <span><i className="key-swatch demand" /> demand line</span>
            <span>design {formatNumber(definition.designCapacity)} {definition.unit}</span>
          </div>
        </div>

        <CapacityControl system={system} definition={definition} />

        <section className="inspector-section">
          <div className="section-head">
            <h3>Inbound dependencies</h3>
            <span className="mono muted">{incoming.length}</span>
          </div>
          {incoming.length === 0 && (
            <p className="empty-note">Root supply layer — no inbound dependencies in this model.</p>
          )}
          <ul className="dep-list">
            {incoming.map((edge) => {
              const effect = incomingEffects.find((item) => item.edgeId === edge.id);
              const source = viewedSnapshot.systems[edge.source];
              return (
                <li key={edge.id}>
                  <button type="button" className="dep-row" onClick={() => selectSystem(edge.source)}>
                    <span className="dep-source">
                      <span className={`dep-dot dot-${source.status}`} />
                      {SYSTEM_BY_ID[edge.source].code}
                      <span className="dep-name">{SYSTEM_BY_ID[edge.source].name}</span>
                    </span>
                    <span className="dep-params mono">
                      w {edge.weight.toFixed(2)} · t {edge.threshold.toFixed(2)} · lag {edge.lag}
                    </span>
                    <span className={`dep-effect mono ${effect?.transmitted > 0.05 ? 'is-active' : ''}`}>
                      {effect ? `−${formatPercent(effect.transmitted)}` : 'pending'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h3>Outbound relationships</h3>
            <span className="mono muted">{outgoing.length}</span>
          </div>
          <ul className="dep-list">
            {outgoing.map((edge) => (
              <li key={edge.id}>
                <button type="button" className="dep-row" onClick={() => selectSystem(edge.target)}>
                  <span className="dep-source">
                    <span className="dep-arrow">→</span>
                    {SYSTEM_BY_ID[edge.target].code}
                    <span className="dep-name">{SYSTEM_BY_ID[edge.target].name}</span>
                  </span>
                  <span className="dep-params mono">w {edge.weight.toFixed(2)} · lag {edge.lag}</span>
                  <span className="mono muted">{statusLabel(viewedSnapshot.systems[edge.target].status)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h3>Recovery parameters</h3>
            <span className="mono muted">read-only</span>
          </div>
          <div className="recovery-grid">
            <div>
              <span className="metric-label">Repair rate</span>
              <span className="mono">{definition.repairRate.toFixed(3)} / tick</span>
            </div>
            <div>
              <span className="metric-label">Recovery delay</span>
              <span className="mono">{definition.recoveryDelay} ticks</span>
            </div>
            <div>
              <span className="metric-label">Demand surge</span>
              <span className="mono">+{Math.round(definition.demandSurge * 100)}% max</span>
            </div>
            <div>
              <span className="metric-label">Degradation rate</span>
              <span className="mono">{definition.degradationRate.toFixed(3)} / tick</span>
            </div>
            <div>
              <span className="metric-label">Internal health</span>
              <span className="mono">{formatPercent(system.health, 1)}</span>
            </div>
            <div>
              <span className="metric-label">Criticality</span>
              <span className="mono">{definition.criticality} / 5</span>
            </div>
          </div>
        </section>

        <div className="sim-disclaimer">
          <Icon name="info" size={13} />
          <span>
            Simulated values. This inspector shows model output at <span className="mono">T+{String(viewedSnapshot.tick).padStart(2, '0')}:00</span>, not real
            infrastructure measurements.
          </span>
        </div>

        <div className="scenario-mini mono">
          <span>SCENARIO</span>
          <span className="scenario-mini-name">{scenario.name}</span>
          <span>{isBaselineView ? 'baseline' : 'disrupted'}</span>
        </div>
      </div>
    </aside>
  );
}
