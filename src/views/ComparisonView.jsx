import Icon from '../components/Icons.jsx';
import ComparisonChart from '../components/ComparisonChart.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useSimulation } from '../state/SimulationContext.jsx';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { formatPercent } from '../simulation/format.js';

export default function ComparisonView({ onNavigate }) {
  const { scenario, comparison, baselineRun, canonicalDisruptedRun, resetSimulation } = useSimulation();
  const source = SYSTEM_BY_ID[scenario.seedSystem];
  const worst = comparison.worstRow;

  return (
    <div className="view">
      <header className="view-head">
        <div className="view-head-copy">
          <div className="view-eyebrow mono">NEXUS / SCENARIO COMPARISON</div>
          <h1>Baseline versus disrupted</h1>
          <p>
            Two canonical experiments are run from the same initial conditions over the full horizon: an undisturbed baseline
            and the configured sustained disruption. Neither run includes in-session operator restores.
          </p>
        </div>
        <div className="view-head-actions">
          <button type="button" className="btn btn-quiet" onClick={() => onNavigate('lab')}>
            <Icon name="lab" size={14} />
            Open in simulation lab
          </button>
          <button type="button" className="btn btn-quiet" onClick={resetSimulation}>
            <Icon name="reset" size={14} />
            Reset scenario
          </button>
        </div>
      </header>

      <div className="kpi-strip comparison-kpis">
        <div className="kpi">
          <span className="kpi-label">Baseline mean LOS</span>
          <span className="kpi-value mono">{formatPercent(comparison.meanBaselineLos, 1)}</span>
          <span className="kpi-sub">undisturbed run</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Disrupted mean LOS</span>
          <span className="kpi-value mono">{formatPercent(comparison.meanDisruptedLos, 1)}</span>
          <span className="kpi-sub">sustained {source.code} at {Math.round(scenario.seedCapacity * 100)}%</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Mean delta</span>
          <span className="kpi-value mono kpi-negative">{formatPercent(comparison.meanLosDelta, 1)}</span>
          <span className="kpi-sub">average loss across systems</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Most affected</span>
          <span className="kpi-value mono">{worst.code}</span>
          <span className="kpi-sub">{worst.name} · {formatPercent(worst.deltaLos, 1)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Peak network stress</span>
          <span className="kpi-value mono">{formatPercent(comparison.disruptedNetwork.worstNetworkStress, 1)}</span>
          <span className="kpi-sub">at T+{String(comparison.disruptedNetwork.worstTick).padStart(2, '0')}:00</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Critical events</span>
          <span className="kpi-value mono">{comparison.disruptedNetwork.criticalEvents}</span>
          <span className="kpi-sub">in disrupted run</span>
        </div>
      </div>

      <div className="comparison-grid">
        <section className="panel chart-panel">
          <ComparisonChart height={296} />
        </section>

        <aside className="panel comparison-params">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow mono">EXPERIMENT CONTROL</div>
              <h2 className="panel-title">Canonical setup</h2>
            </div>
          </div>
          <div className="param-list">
            <div><span>Scenario</span><span>{scenario.name}</span></div>
            <div><span>Source</span><span className="mono">{source.code}</span></div>
            <div><span>Disrupted capacity</span><span className="mono">{Math.round(scenario.seedCapacity * 100)}%</span></div>
            <div><span>Horizon</span><span className="mono">{scenario.horizon} ticks</span></div>
            <div><span>Baseline samples</span><span className="mono">{baselineRun.snapshots.length}</span></div>
            <div><span>Disrupted samples</span><span className="mono">{canonicalDisruptedRun.snapshots.length}</span></div>
          </div>
          <div className="param-note">
            <h3>Why canonical runs?</h3>
            <p>
              Comparison re-runs both experiments from <span className="mono">t = 0</span> using the configured disruption,
              independent of any restore actions performed in the live session. This keeps the comparison reproducible and
              symmetric.
            </p>
            <h3>Reading the delta</h3>
            <p>
              Delta is disrupted minus baseline mean level of service. A negative value means the system delivered less of its
              demand on average. Because the baseline is undisturbed, its mean LOS is governed only by reserve margin.
            </p>
          </div>
        </aside>
      </div>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <div className="panel-eyebrow mono">PER-SYSTEM RESULTS</div>
            <h2 className="panel-title">Comparison matrix</h2>
          </div>
          <span className="panel-foot-note mono">mean LOS over full horizon</span>
        </div>
        <div className="table-wrap">
          <table className="data-table comparison-table">
            <thead>
              <tr>
                <th scope="col">System</th>
                <th scope="col" className="num">Baseline LOS</th>
                <th scope="col" className="num">Disrupted LOS</th>
                <th scope="col" className="num">Delta</th>
                <th scope="col" className="num">Peak impact</th>
                <th scope="col" className="num">Min capacity</th>
                <th scope="col" className="num">Critical ticks</th>
                <th scope="col">Final status</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="mono table-link">{row.code}</span>
                    <span className="table-sub">{row.name}</span>
                  </td>
                  <td className="num mono">{formatPercent(row.baselineAvgLos, 1)}</td>
                  <td className="num mono">{formatPercent(row.disruptedAvgLos, 1)}</td>
                  <td className="num mono is-negative">−{Math.abs(row.deltaLos * 100).toFixed(1)} pp</td>
                  <td className="num mono">{formatPercent(row.peakImpact, 0)}</td>
                  <td className="num mono">{Math.round(row.minEffective * 100)}%</td>
                  <td className="num mono">{row.ticksCritical}</td>
                  <td><StatusPill status={row.finalStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span className="panel-foot-note">
            Percentages are model output. They are not measurements and must not be used as forecasts of real infrastructure
            performance.
          </span>
        </div>
      </section>
    </div>
  );
}
