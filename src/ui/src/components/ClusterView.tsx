import { useRaftStore } from "../store/raftStore";

function computePositionsCircle(nodeIds: string[], radius: number, centerX: number, centerY: number) {
    const positions: Record<string, { x: number; y: number }> = {};
    nodeIds.forEach((id, index) => {
        const angle = (2 * Math.PI * index) / nodeIds.length - Math.PI / 2;
        positions[id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        };
    });
    return positions;
}

const width = 800;
const height = 600;
const nodeRadius = 30;

export function ClusterView() {
    const nodeIds = useRaftStore((state) => state.nodeIds);
    const positions = computePositionsCircle(nodeIds, 200, width / 2, height / 2);
    return (
        <svg width={width} height={height} style={{ background: '#0d1117', display: 'block' }}>
            {nodeIds.map(id => {
                const { x, y } = positions[id];
                return (
                    <g key={id}>
                        <circle cx={x} cy={y} r={nodeRadius} fill="#161b22" stroke="#30363d" strokeWidth={2} />
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#e6edf3" fontSize={13} fontFamily="monospace">
                            {id}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}