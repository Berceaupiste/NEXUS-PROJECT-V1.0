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
import { SYSTEM_BY_ID, SYSTEMS } from '../data/systems.js';
import { buildCapacitySeries } from '../simulation/metrics.js';
import { formatTick } from '../simulation/format.js';
import { useSimulation } from '../state/SimulationContext.jsx';

const SYSTEM_COLORS = {
  electricity: '#55C4D6',
  water: '#48B58A',
  telecom: '#4789B8',
  transport: '#9BA8B5',
  healthcare: '#E5AA54',
  emergency: '#E16D6D',
};

export { SYSTEM_COLORS };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-head mono">{formatTick(Number(label))}</div>
      {payload
        .filter((entry) => entry.value !== undefined)
        .map((entry) => {
          const name =
            entry.dataKey === 'network'
              ? 'Network average'
              : entry.dataKey === 'baselineNetwork'
                ? 'Baseline network'
                : SYSTEM_BY_ID[entry.dataKey]?.name ?? entry.dataKey;
          return (
            <div className="chart-tooltip-row" key={entry.dataKey}>
              <span>
                <i className="chart-swatch" style={{ background: entry.color, borderStyle: entry.strokeDasharray ? 'dashed' : 'solid' }} />
                {name}
              </span>
              <span className="mono">{entry.value.toFixed(1)}%</span>
            </div>
          );
        })}
      <div className="chart-tooltip-note">Simulated capacity · % of design</div>
    </div>
  );
}

export default function PerformanceChart({
  simulation,
  systemIds,
  horizon,
  baseline,
  height = 250,
  showPicker = false,
  onToggleSystem,
}) {
  const { scenario, selectedSystemId, isBaselineView } = useSimulation();
  const activeIds = useMemo(
    () => (systemIds?.length ? systemIds : [selectedSystemId]).filter((id) => SYSTEM_BY_ID[id]),
    [systemIds, selectedSystemId],
  );

  const data = useMemo(() => {
    const series = buildCapacitySeries(simulation, activeIds);
    if (!baseline || isBaselineView) return series;
    const baselineSeries = buildCapacitySeries(baseline, [], { includeNetwork: true });
    return series.map((point, index) => {
      const base = baselineSeries[Math.min(index, baselineSeries.length - 1)];
      return { ...point, baselineNetwork: base?.network ?? 100 };
    });
  }, [simulation, activeIds, baseline, isBaselineView]);

  const maxTick = Math.max(horizon ?? scenario.horizon, data.length - 1);

  return (
    <div className="chart-block">
      <div className="chart-head">
        <div>
          <h3 className="chart-title">System performance</h3>
          <p className="chart-sub">Capacity as a percentage of design over simulated hours</p>
        </div>
        <div className="chart-units mono">1 tick = 1 h</div>
      </div>

      {showPicker && (
        <div className="chart-picker"                role="group"
              >
                {SYSTEMS.map((system) => {
            const active = activeIds.includes(system.id);
            return (
              <button
                key={system.id}
                type="button"
                className={`chart-chip ${active ? 'is-active' : ''}`}
                style={{ '--chip-color': SYSTEM_COLORS[system.id] }}
                aria-pressed={active}
                onClick={() => onToggleSystem?.(system.id)}
                disabled={active && activeIds.length === 1}
                title={active && activeIds.length === 1 ? 'At least one system must remain plotted' : `Toggle ${system.name}`}
              >
                <i />
                {system.code}
              </button>
            );
          })}
        </div>
      )}

      <div className="chart-canvas" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 18 }}>
            <CartesianGrid stroke="#202830" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="tick"
              type="number"
              domain={[0, maxTick]}
              allowDecimals={false}
              tick={{ fill: '#657381', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#27313A' }}
              tickLine={{ stroke: '#27313A' }}
              tickFormatter={(value) => `+${value}`}
              label={{
                value: 'Simulated hours',
                position: 'insideBottom',
                offset: -10,
                fill: '#657381',
                fontSize: 10,
              }}
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
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3a4650', strokeWidth: 1 }} />
            <ReferenceLine y={90} stroke="#3a4650" strokeDasharray="3 4" />
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="plainline"
              wrapperStyle={{ fontSize: 10, color: '#9BA8B5', fontFamily: 'IBM Plex Mono, monospace' }}
              formatter={(value) =>
                value === 'network'
                  ? 'Network avg'
                  : value === 'baselineNetwork'
                    ? 'Baseline network'
                    : SYSTEM_BY_ID[value]?.code ?? value
              }
            />
            {activeIds.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={SYSTEM_BY_ID[id]?.name ?? id}
                stroke={SYSTEM_COLORS[id] ?? '#55C4D6'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 1 }}
                isAnimationActive={false}
              />
            ))}
            <Line
              type="monotone"
              dataKey="network"
              name="Network average"
              stroke="#8B99A6"
              strokeWidth={1.4}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            {baseline && !isBaselineView && (
              <Line
                type="monotone"
                dataKey="baselineNetwork"
                name="Baseline network"
                stroke="#55C4D6"
                strokeWidth={1.1}
                strokeDasharray="2 4"
                strokeOpacity={0.45}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
