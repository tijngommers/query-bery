export type NodeId = string;

export interface RaftConfig {
    nodeId: NodeId;
    peerIds: NodeId[];
    electionTimeoutMinMs: number;
    electionTimeoutMaxMs: number;
    heartbeatIntervalMs: number;
}