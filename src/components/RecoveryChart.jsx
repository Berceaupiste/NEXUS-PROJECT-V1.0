import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { useSimulation } from '../state/SimulationContext.jsx';
import { formatTick } from '../simulation/format.js';

function RecoveryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-head mono">{formatTick(Number(label))}</div>
      {payload.map((entry) => (
        <div className="chart-tooltip-row" key={entry.dataKey}>
          <span>
            <i className="chart-swatch" style={{ background: entry.color, borderStyle: entry.strokeDasharray ? 'dashed' : 'solid' }} />
            {entry.name}
          </span>
          <span className="mono">{Number(entry.value).toFixed(1)}%</span>
        </div>
      ))}
      <div className="chart-tooltip-note">Canonical recovery experiment · simulated capacity</div>
    </div>
  );
}

export default function RecoveryChart({ height = 220 }) {
  const { recoveryRun, scenario, selectedSystemId } = useSimulation();
  const sourceId = scenario.seedSystem;
  const source = SYSTEM_BY_ID[sourceId];
  const focusId = selectedSystemId === sourceId ? (sourceId === 'healthcare' ? 'emergency' : 'healthcare') : selectedSystemId;
  const focus = SYSTEM_BY_ID[focusId];

  const data = useMemo(
    () =>
      recoveryRun.snapshots.map((snapshot) => ({
        tick: snapshot.tick,
        network: Number(((1 - snapshot.networkStress) * 100).toFixed(2)),
        [sourceId]: Number((snapshot.systems[sourceId].effective * 100).toFixed(2)),
        ...(focusId
          ? { [focusId]: Number((snapshot.systems[focusId].effective * 100).toFixed(2)) }
          : {}),
      })),
    [recoveryRun, sourceId, focusId],
  );

  const restoreAt = recoveryRun.restoreAtTick;

  return (
    <div className="chart-block recovery-block">
      <div className="chart-head">
        <div>
          <h3 className="chart-title">Recovery profile</h3>
          <p className="chart-sub">
            Separate canonical experiment: {source.code} held at {Math.round(scenario.seedCapacity * 100)}% for {restoreAt} ticks, then
            operator output restored to 100%
          </p>
        </div>
        <div className="chart-units mono">recovery run</div>
      </div>

      <div className="chart-canvas" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 16, left: 4, bottom: 18 }}>
            <CartesianGrid stroke="#202830" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="tick"
              type="number"
              domain={[0, scenario.horizon]}
              allowDecimals={false}
              tick={{ fill: '#657381', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#27313A' }}
              tickLine={{ stroke: '#27313A' }}
              tickFormatter={(value) => `+${value}`}
              label={{ value: 'Simulated hours', position: 'insideBottom', offset: -10, fill: '#657381', fontSize: 10 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#657381', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#27313A' }}
              tickLine={{ stroke: '#27313A' }}
              tickFormatter={(value) => `${value}%`}
              width={44}
            />
            <ReferenceLine
              x={restoreAt}
              stroke="#48B58A"
              strokeDasharray="3 3"
              label={{ value: 'restore', position: 'insideTopRight', fill: '#48B58A', fontSize: 9 }}
            />
            <Tooltip content={<RecoveryTooltip />} cursor={{ stroke: '#3a4650', strokeWidth: 1 }} />
            <Legend
              verticalAlign="top"
              align="right"
              height={22}
              iconType="plainline"
              wrapperStyle={{ fontSize: 10, color: '#9BA8B5', fontFamily: 'IBM Plex Mono, monospace' }}
              formatter={(value) => (value === 'network' ? 'Network avg' : SYSTEM_BY_ID[value]?.code ?? value)}
            />
            <Line
              type="monotone"
              dataKey={sourceId}
              name={`${source.code} source`}
              stroke="#E5AA54"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            {focusId && (
              <Line
                type="monotone"
                dataKey={focusId}
                name={focus.code}
                stroke="#55C4D6"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="network"
              name="Network average"
              stroke="#8B99A6"
              strokeWidth={1.3}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="recovery-note">
        <span className="mono">T+{String(restoreAt).padStart(2, '0')}:00</span> restore point. Downstream systems begin recovering after
        their own <span className="mono">recoveryDelay</span> and at their own <span className="mono">repairRate</span>; the source's
        capacity returns on the next tick because its health was not degraded by the operator throttle.
      </div>
    </div>
  );
}
