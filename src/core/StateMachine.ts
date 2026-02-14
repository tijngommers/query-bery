import { NodeId, RaftConfig } from "./Config";
import { RequestVoteRequest, RequestVoteResponse, AppendEntriesRequest, AppendEntriesResponse } from "../rpc/RPCTypes";
import { LeaderState } from "../state/LeaderState";
import { PersistentState } from "../state/PersistentState";
import { VolatileState } from "../state/VolatileState";
import { LogManager } from "../log/LogManager";
import { RPCHandler } from "../rpc/RPCHandler";
import { TimerManager } from "../timing/TimerManager";
import { Logger } from "../util/Logger";


export enum RaftState {
    Follower = "Follower",
    Candidate = "Candidate",
    Leader = "Leader"
}

export interface StateMachineInterface {
    start(): Promise<void>;
    stop(): Promise<void>;
    getCurrentState(): RaftState;
    getCurrentLeader(): NodeId | null;
    isLeader(): boolean;
    becomeFollower(term: number, leaderId: NodeId | null): Promise<void>;
    becomeCandidate(): Promise<void>;
    becomeLeader(): Promise<void>;
    handleRequestVote(from: NodeId, request: RequestVoteRequest): Promise<RequestVoteResponse>;
    handleAppendEntries(from: NodeId, request: AppendEntriesRequest): Promise<AppendEntriesResponse>;
}

export class StateMachine implements StateMachineInterface {
    private currentState: RaftState = RaftState.Follower;
    private currentLeader: NodeId | null = null;

    private votesReceived: Set<NodeId> = new Set();
    private votesNeeded: number = 0;

    constructor(
        private nodeId: NodeId,
        private peers: NodeId[],
        private config: RaftConfig,
        private persistentState: PersistentState,
        private volatileState: VolatileState,
        private logManager: LogManager,
        private rpcHandler: RPCHandler,
        private timerManager: TimerManager,
        private logger: Logger,
        private leaderState?: LeaderState,
    ) {}

    async start(): Promise<void> {
        this.logger.info(`Node ${this.nodeId} starting as ${this.currentState}`);
        await this.becomeFollower( this.persistentState.getCurrentTerm(), null);
    }

    async stop(): Promise<void> {
        this.logger.info(`Node ${this.nodeId} stopping`);
        this.timerManager.stopAllTimers();
    }

    getCurrentState(): RaftState {
        return this.currentState;
    }

    getCurrentLeader(): NodeId | null {
        return this.currentLeader;
    }

    isLeader(): boolean {
        return this.currentState === RaftState.Leader;
    }

    async becomeFollower(term: number, leaderId: NodeId | null): Promise<void> {
        this.logger.info(`Node ${this.nodeId} becoming Follower for term ${term}, leader: ${leaderId}`);

        const currentTerm = this.persistentState.getCurrentTerm();
        if (term > currentTerm) {
            await this.persistentState.updateTermAndVote(term, null);
            this.logger.info(`Node ${this.nodeId} updated term to ${term} and cleared votes`);
        }

        const wasLeader = this.currentState === RaftState.Leader;

        this.currentState = RaftState.Follower;
        this.votesReceived.clear();
        this.currentLeader = leaderId;

        if (wasLeader) {
            this.timerManager.stopHeartbeatTimer();
            this.logger.info(`Node ${this.nodeId} was previously a Leader, now a Follower`);
        }

        this.timerManager.startElectionTimer(() => this.handleElectionTimeout());

        this.logger.info(`Node ${this.nodeId} is now a Follower with term ${this.persistentState.getCurrentTerm()}`);
    }

    async becomeCandidate(): Promise<void> {
        this.currentState = RaftState.Candidate;
        this.currentLeader = null;

        const newTerm = (this.persistentState.getCurrentTerm() + 1);

        await this.persistentState.updateTermAndVote(newTerm, this.nodeId);

        this.votesReceived.clear();
        this.votesReceived.add(this.nodeId);

        const clusterSize = this.peers.length + 1;
        this.votesNeeded = Math.floor(clusterSize / 2) + 1;

        this.logger.info(`Node ${this.nodeId} became Candidate for term ${newTerm}, votes needed: ${this.votesNeeded}`);

        this.timerManager.startElectionTimer(() => this.handleElectionTimeout());

        await this.requestVotes();
    }

    async becomeLeader(): Promise<void> {
        // TODO
    }

    async handleRequestVote(from: NodeId, request: RequestVoteRequest): Promise<RequestVoteResponse> {
        // TODO
        throw new Error("Not implemented");
    }

    async handleAppendEntries(from: NodeId, request: AppendEntriesRequest): Promise<AppendEntriesResponse> {
        // TODO
        throw new Error("Not implemented");
    }

    private async handleElectionTimeout(): Promise<void> {
        if (this.currentState === RaftState.Leader) {
            return;
        }

        this.logger.info(`Node ${this.nodeId} election timeout, starting new election`);
        await this.becomeCandidate();
    }

    private async requestVotes(): Promise<void> {
        const currentTerm = this.persistentState.getCurrentTerm();
        const lastLogIndex = this.logManager.getLastIndex();
        const lastLogTerm = await this.logManager.getTermAtIndex(lastLogIndex) ?? 0;

        const request: RequestVoteRequest = {
            term: currentTerm,
            candidateId: this.nodeId,
            lastLogIndex,
            lastLogTerm
        };

        this.logger.info(`Node ${this.nodeId} sending RequestVote to peers: ${this.peers.join(", ")}`);

        for (const peer of this.peers) {
            this.sendRequestVote(peer, request)
        }
    }

    private async sendRequestVote(peer: NodeId, request: RequestVoteRequest): Promise<void> {
        try {
            const response = await this.rpcHandler.sendRequestVote(peer, request);
            await this.handleRequestVoteResponse(peer, response);
        } catch (err) {

            if (err instanceof Error) {
                this.logger.error(`Node ${this.nodeId} error sending RequestVote to ${peer}: ${err.message}`);

            } else { 
                this.logger.error(`Node ${this.nodeId} error sending RequestVote to ${peer}: ${String(err)}`);
            }
        }
    }

    private async handleRequestVoteResponse(from: NodeId, response: RequestVoteResponse): Promise<void> {
        const currentTerm = this.persistentState.getCurrentTerm();

        if (response.term > currentTerm) {
            this.logger.info(`Node ${this.nodeId} received higher term ${response.term} from ${from}, becoming Follower`);
            await this.becomeFollower(response.term, null);
            return;
        }

        if (this.currentState !== RaftState.Candidate) {
            this.logger.info(`Node ${this.nodeId} received RequestVoteResponse from ${from} but is no longer a Candidate`);
            return;
        }

        if (response.term !== currentTerm) {
            this.logger.info(`Node ${this.nodeId} received RequestVoteResponse from ${from} with term ${response.term} but current term is ${currentTerm}`);
            return;
        }

        if (response.voteGranted) {
            this.votesReceived.add(from);
            this.logger.info(`Node ${this.nodeId} received vote from ${from}, total votes: ${this.votesReceived.size}/${this.votesNeeded}`);

            if (this.votesReceived.size >= this.votesNeeded) {
                this.logger.info(`Node ${this.nodeId} received majority votes, becoming Leader`);
                await this.becomeLeader();
            }

        } else {
            this.logger.info(`Node ${this.nodeId} received vote denial from ${from}`);
        }
    }
}