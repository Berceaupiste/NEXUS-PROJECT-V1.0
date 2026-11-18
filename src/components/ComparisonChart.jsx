import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SYSTEM_BY_ID } from '../data/systems.js';
import { useSimulation } from '../state/SimulationContext.jsx';
import { buildComparisonSeries } from '../simulation/metrics.js';

function ComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const fullName = SYSTEM_BY_ID[payload[0]?.payload?.id]?.name ?? label;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-head">{fullName}</div>
      {payload.map((entry) => (
        <div className="chart-tooltip-row" key={entry.dataKey}>
          <span>
            <i className="chart-swatch" style={{ background: entry.color }} />
            {entry.dataKey === 'baseline' ? 'Baseline' : 'Disrupted'}
          </span>
          <span className="mono">{Number(entry.value).toFixed(1)}%</span>
        </div>
      ))}
      <div className="chart-tooltip-note">Mean level of service over the horizon</div>
    </div>
  );
}

export default function ComparisonChart({ height = 280 }) {
  const { canonicalDisruptedRun, baselineRun } = useSimulation();
  const data = buildComparisonSeries(canonicalDisruptedRun, baselineRun).map((row) => ({
    ...row,
    id: row.name.toLowerCase(),
  }));

  return (
    <div className="chart-block">
      <div className="chart-head">
        <div>
          <h3 className="chart-title">Baseline vs disrupted</h3>
          <p className="chart-sub">Mean level of service across the full horizon, sustained disruption</p>
        </div>
        <div className="chart-units mono">LOS %</div>
      </div>
      <div className="chart-canvas" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 20 }} barGap={2} barCategoryGap={22}>
            <CartesianGrid stroke="#202830" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9BA8B5', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#27313A' }}
              tickLine={false}
              label={{
                value: 'System',
                position: 'insideBottom',
                offset: -12,
                fill: '#657381',
                fontSize: 10,
              }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#657381', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#27313A' }}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              width={44}
            />
            <Tooltip content={<ComparisonTooltip />} cursor={{ fill: 'rgba(85,196,214,0.04)' }} />
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="square"
              wrapperStyle={{ fontSize: 10, color: '#9BA8B5', fontFamily: 'IBM Plex Mono, monospace' }}
              formatter={(value) => (value === 'baseline' ? 'Baseline' : 'Disrupted')}
            />
            <Bar dataKey="baseline" fill="#4789B8" fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="disrupted" fill="#E5AA54" fillOpacity={0.85} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
