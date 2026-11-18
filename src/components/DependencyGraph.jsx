import { useMemo } from 'react';
import ReactFlow, { Background, BackgroundVariant, Controls, Handle, MarkerType, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import '../flow.css';
import { SYSTEMS } from '../data/systems.js';
import { DEPENDENCIES } from '../data/dependencies.js';
import { incomingDependencies, outgoingDependencies } from '../simulation/engine.js';
import { useSimulation } from '../state/SimulationContext.jsx';
import Icon from './Icons.jsx';

function SystemNode({ data, selected }) {
  const { definition, system, isSeed } = data;
  const capacityPct = Math.round(system.effective * 100);
  return (
    <div
      className={`system-node status-${system.status} ${selected ? 'is-selected' : ''} ${isSeed ? 'is-source' : ''}`}
      data-node-id={definition.id}
    >
      <Handle type="target" position={Position.Left} className="node-handle" isConnectable={false} />
      <Handle id="top-target" type="target" position={Position.Top} className="node-handle" style={{ left: '40%' }} isConnectable={false} />
      <Handle id="top-source" type="source" position={Position.Top} className="node-handle" style={{ left: '60%' }} isConnectable={false} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="node-handle" style={{ left: '40%' }} isConnectable={false} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="node-handle" style={{ left: '60%' }} isConnectable={false} />
      <div className="node-top">
        <span className="node-icon">
          <Icon name={definition.icon} size={14} />
        </span>
        <span className="node-code mono">{definition.code}</span>
        {isSeed && <span className="node-src">SRC</span>}
        <span className={`node-dot dot-${system.status}`} aria-hidden="true" />
      </div>
      <div className="node-name">{definition.name}</div>
      <div className="node-bar" aria-hidden="true">
        <span style={{ width: `${capacityPct}%` }} />
      </div>
      <div className="node-foot">
        <span className="mono node-pct">{capacityPct}%</span>
        <span className="node-links mono">
          IN {incomingDependencies(definition.id).length} · OUT {outgoingDependencies(definition.id).length}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" isConnectable={false} />
    </div>
  );
}

const nodeTypes = { system: SystemNode };

function edgeEffect(edge, snapshot) {
  // At T+00:00 no dependency lag has elapsed, so no edge carries an effect.
  const target = snapshot.systems[edge.target];
  return target.incoming?.find((effect) => effect.edgeId === edge.id)?.transmitted ?? 0;
}

export default function DependencyGraph({ height = 460, showLegend = true }) {
  const { viewedSnapshot, selectedSystemId, selectSystem, scenario, running } = useSimulation();

  const nodes = useMemo(
    () =>
      SYSTEMS.map((definition) => ({
        id: definition.id,
        type: 'system',
        position: definition.position,
        data: {
          definition,
          system: viewedSnapshot.systems[definition.id],
          isSeed: scenario.seedSystem === definition.id,
        },
        selected: selectedSystemId === definition.id,
        draggable: false,
      })),
    [viewedSnapshot, selectedSystemId, scenario.seedSystem],
  );

  const edges = useMemo(
    () =>
      DEPENDENCIES.map((edge) => {
        const transmitted = edgeEffect(edge, viewedSnapshot);
        const target = viewedSnapshot.systems[edge.target];
        const touchesSelection = selectedSystemId === edge.source || selectedSystemId === edge.target;
        const critical = transmitted >= 0.18 && target.status !== 'operational';
        const warning = transmitted > 0.015;
        const stroke = critical ? '#E16D6D' : warning ? '#E5AA54' : touchesSelection ? '#55C4D6' : '#2A3540';
        const feedbackRouting =
          edge.id === 'healthcare-emergency'
            ? { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
            : edge.id === 'emergency-healthcare'
              ? { sourceHandle: 'top-source', targetHandle: 'bottom-target' }
              : {};
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ...feedbackRouting,
          type: 'default',
          animated: Boolean(running && warning),
          style: { stroke, strokeWidth: critical ? 2 : warning ? 1.6 : 1.2 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 13, height: 13, color: stroke },
          interactionWidth: 12,
          data: { weight: edge.weight, lag: edge.lag, transmitted },
        };
      }),
    [viewedSnapshot, selectedSystemId, running],
  );

  return (
    <div className="graph-wrap" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => selectSystem(node.id)}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.4}
        maxZoom={1.4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        aria-label="Infrastructure dependency graph"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1E272F" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      {showLegend && (
        <div className="graph-legend" aria-hidden="true">
          <span>
            <i className="legend-line neutral" /> No active effect
          </span>
          <span>
            <i className="legend-line cyan" /> Selected relationship
          </span>
          <span>
            <i className="legend-line orange" /> Propagation
          </span>
          <span>
            <i className="legend-line red" /> Critical propagation
          </span>
        </div>
      )}
    </div>
  );
}

export function GraphKey() {
  return (
    <div className="graph-key">
      <span className="mono">LAG = dependency delay (ticks)</span>
      <span className="mono">W = coupling weight</span>
      <span className="mono">T = upstream threshold</span>
    </div>
  );
}
