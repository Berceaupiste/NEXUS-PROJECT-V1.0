import { DEPENDENCIES } from '../data/dependencies.js';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { dependencyTransmission } from '../simulation/engine.js';
import { formatPercent } from '../simulation/format.js';
import { useSimulation } from '../state/SimulationContext.jsx';

export default function DependencyTable({ compact = false }) {
  const { viewedSnapshot, selectSystem } = useSimulation();

  return (
    <div className="table-wrap">
      <table className="data-table dependency-table">
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Target</th>
            <th scope="col" className="num">Weight</th>
            <th scope="col" className="num">Threshold</th>
            <th scope="col" className="num">Lag</th>
            <th scope="col" className="num">Current effect</th>
            {!compact && <th scope="col">Rationale</th>}
          </tr>
        </thead>
        <tbody>
          {DEPENDENCIES.map((edge) => {
            const targetSystem = viewedSnapshot.systems[edge.target];
            const recorded = targetSystem.incoming?.find((effect) => effect.edgeId === edge.id);
            const transmitted =
              recorded?.transmitted ??
              dependencyTransmission(viewedSnapshot.systems[edge.source].effective, edge).transmitted;
            return (
              <tr key={edge.id}>
                <td>
                  <button type="button" className="table-link mono" onClick={() => selectSystem(edge.source)}>
                    {SYSTEM_BY_ID[edge.source].code}
                  </button>
                  <span className="table-sub">{SYSTEM_BY_ID[edge.source].name}</span>
                </td>
                <td>
                  <button type="button" className="table-link mono" onClick={() => selectSystem(edge.target)}>
                    {SYSTEM_BY_ID[edge.target].code}
                  </button>
                  <span className="table-sub">{SYSTEM_BY_ID[edge.target].name}</span>
                </td>
                <td className="num mono">{edge.weight.toFixed(2)}</td>
                <td className="num mono">{edge.threshold.toFixed(2)}</td>
                <td className="num mono">{edge.lag}</td>
                <td className={`num mono ${transmitted > 0.02 ? 'is-active' : ''}`}>{formatPercent(transmitted)}</td>
                {!compact && <td className="rationale">{edge.rationale}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
