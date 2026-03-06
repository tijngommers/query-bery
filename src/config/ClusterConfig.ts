import { NodeId } from "../core/Config";

export interface ClusterConfig {
    voters: NodeId[];
    learners: NodeId[];
}

export function clusterConfigsEqual(a: ClusterConfig, b: ClusterConfig): boolean {
    if (a.voters.length !== b.voters.length) return false;
    if (a.learners.length !== b.learners.length) return false;

    const aVoters = [...a.voters].sort();
    const bVoters = [...b.voters].sort();

    for (let i = 0; i < aVoters.length; i++) {
        if (aVoters[i] !== bVoters[i]) return false;
    }

    const aLearners = [...a.learners].sort();
    const bLearners = [...b.learners].sort();

    for (let i = 0; i < aLearners.length; i++) {
        if (aLearners[i] !== bLearners[i]) return false;
    }
    return true;
}

export function isVoter(config: ClusterConfig, nodeId: NodeId): boolean {
    return config.voters.includes(nodeId);
}

export function isLearner(config: ClusterConfig, nodeId: NodeId): boolean {
    return config.learners.includes(nodeId);
}

export function isNodeInCluster(config: ClusterConfig, nodeId: NodeId): boolean {
    return isVoter(config, nodeId) || isLearner(config, nodeId);
}

export function getQuorumSize(config: ClusterConfig): number {
    return Math.floor(config.voters.length / 2) + 1;
}