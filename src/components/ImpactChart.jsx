import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SYSTEM_BY_ID, SYSTEMS } from '../data/systems.js';
import { useSimulation } from '../state/SimulationContext.jsx';

function impactColor(value) {
  if (value >= 30) return '#E16D6D';
  if (value >= 10) return '#E5AA54';
  if (value > 0.5) return '#55C4D6';
  return '#3B4753';
}

function ImpactTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-head">{SYSTEM_BY_ID[row.id]?.name ?? row.name}</div>
      <div className="chart-tooltip-row">
        <span>Peak impact</span>
        <span className="mono">{row.impact.toFixed(1)}%</span>
      </div>
      <div className="chart-tooltip-row">
        <span>Current capacity</span>
        <span className="mono">{row.currentCapacity.toFixed(0)}%</span>
      </div>
      <div className="chart-tooltip-note">Loss of service (1 − LOS), peak over recorded ticks</div>
    </div>
  );
}

export default function ImpactChart({ height = 240 }) {
  const { viewedSnapshot } = useSimulation();

  const data = SYSTEMS.map((definition) => {
    const system = viewedSnapshot.systems[definition.id];
    return {
      id: definition.id,
      name: definition.code,
      fullName: definition.name,
      impact: Number((system.peakImpact * 100).toFixed(1)),
      currentCapacity: system.effective * 100,
    };
  }).sort((a, b) => b.impact - a.impact);

  const hasImpact = data.some((row) => row.impact > 0.05);

  return (
    <div className="chart-block impact-block">
      <div className="chart-head">
        <div>
          <h3 className="chart-title">Impact analysis</h3>
          <p className="chart-sub">Peak loss of service by system, recorded to current tick</p>
        </div>
        <div className="chart-units mono">% loss</div>
      </div>
      <div className="chart-canvas" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, left: 4, bottom: 4 }} barCategoryGap={10}>
            <CartesianGrid stroke="#202830" strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#657381', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={{ stroke: '#27313A' }}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={46}
              tick={{ fill: '#9BA8B5', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ImpactTooltip />} cursor={{ fill: 'rgba(85,196,214,0.04)' }} />
            <Bar dataKey="impact" radius={[0, 2, 2, 0]} isAnimationActive={false} background={{ fill: '#192129' }}>
              {data.map((row) => (
                <Cell key={row.id} fill={impactColor(row.impact)} fillOpacity={row.impact > 0 ? 0.85 : 0.5} />
              ))}
              <LabelList
                dataKey="impact"
                position="right"
                formatter={(value) => `${Number(value).toFixed(0)}%`}
                style={{ fill: '#9BA8B5', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasImpact && (
        <div className="chart-empty">
          No impact recorded yet. Lower a system's capacity and advance the simulation.
        </div>
      )}
    </div>
  );
}
