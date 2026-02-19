import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine, RaftState } from './StateMachine';
import { RaftError } from '../util/Error';
import { stat } from 'node:fs';
import { a } from 'vitest/dist/chunks/suite.d.BJWk38HB';

describe('StateMachine.ts, StateMachine', () => {

    const nodeId = 'node1';
    const peers = ['node2', 'node3'];

    let persistentState: { 
        getCurrentTerm: ReturnType<typeof vi.fn>,
        getVotedFor: ReturnType<typeof vi.fn>,
        updateTermAndVote: ReturnType<typeof vi.fn>,
    };

    let volatileState: {
        getCommitIndex: ReturnType<typeof vi.fn>,
        setCommitIndex: ReturnType<typeof vi.fn>,
    };

    let logManager: {
        getLastIndex: ReturnType<typeof vi.fn>,
        getLastTerm: ReturnType<typeof vi.fn>,
        getTermAtIndex: ReturnType<typeof vi.fn>,
        getEntriesFromIndex: ReturnType<typeof vi.fn>,
        appendEntriesFrom: ReturnType<typeof vi.fn>,
        matchesPrevLog: ReturnType<typeof vi.fn>,
        getConflictInfo: ReturnType<typeof vi.fn>,
        calculateCommitIndex: ReturnType<typeof vi.fn>
    };

    let rpcHandler: {
        sendRequestVote: ReturnType<typeof vi.fn>,
        sendAppendEntries: ReturnType<typeof vi.fn>,
    };

    let timerManager: {
        startElectionTimer: ReturnType<typeof vi.fn>,
        stopAllTimers: ReturnType<typeof vi.fn>,
        startHeartbeatTimer: ReturnType<typeof vi.fn>,
        stopHeartbeatTimer: ReturnType<typeof vi.fn>,
        resetElectionTimer: ReturnType<typeof vi.fn>,
    };

    let logger: {
        info: ReturnType<typeof vi.fn>,
        debug: ReturnType<typeof vi.fn>,
        error: ReturnType<typeof vi.fn>,
        warn: ReturnType<typeof vi.fn>,
    };

    let config: { electionTimeoutMs: number, heartbeatIntervalMs: number };

    let onCommitIndexAdvanced: ReturnType<typeof vi.fn>;

    let stateMachine: StateMachine;

    beforeEach(() => {
        persistentState = {
            getCurrentTerm: vi.fn().mockReturnValue(1),
            getVotedFor: vi.fn().mockReturnValue(null),
            updateTermAndVote: vi.fn().mockResolvedValue(undefined),
        };

        volatileState = {
            getCommitIndex: vi.fn().mockReturnValue(0),
            setCommitIndex: vi.fn(),
        };

        logManager = {
            getLastIndex: vi.fn().mockReturnValue(0),
            getLastTerm: vi.fn().mockReturnValue(0),
            getTermAtIndex: vi.fn().mockReturnValue(null),
            getEntriesFromIndex: vi.fn().mockReturnValue([]),
            appendEntriesFrom: vi.fn().mockResolvedValue(0),
            matchesPrevLog: vi.fn().mockReturnValue(true),
            getConflictInfo: vi.fn().mockReturnValue({ conflictIndex: 1, conflictTerm: 0 }),
            calculateCommitIndex: vi.fn().mockReturnValue(0),
        };

        rpcHandler = {
            sendRequestVote: vi.fn().mockResolvedValue({ term: 1, voteGranted: true }),
            sendAppendEntries: vi.fn().mockResolvedValue({ term: 1, success: true, matchIndex: 0 }),
        };

        timerManager = {
            startElectionTimer: vi.fn(),
            stopAllTimers: vi.fn(),
            startHeartbeatTimer: vi.fn(),
            stopHeartbeatTimer: vi.fn(),
            resetElectionTimer: vi.fn(),
        };

        logger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        };

        config = { electionTimeoutMs: 150, heartbeatIntervalMs: 50 };

        onCommitIndexAdvanced = vi.fn();

        stateMachine = new StateMachine(
            nodeId,
            peers,
            config as any,
            persistentState as any,
            volatileState as any,
            logManager as any,
            rpcHandler as any,
            timerManager as any,
            logger as any,
            onCommitIndexAdvanced as any
        );
    });

    it('should start as a follower', () => {
        expect(stateMachine.getCurrentState()).toBe(RaftState.Follower);
    });

    it('should have no leader initially', () => {
        expect(stateMachine.getCurrentLeader()).toBeNull();
    });

    it('should not be a leader initially', () => {
        expect(stateMachine.isLeader()).toBe(false);
    });

    it('should start as Follower and start election timer', async () => {
        await stateMachine.start();
        expect(stateMachine.getCurrentState()).toBe(RaftState.Follower);
        expect(timerManager.startElectionTimer).toHaveBeenCalled();
    });

    it('should stop all timers on stop', async () => {
        await stateMachine.start();
        await stateMachine.stop();
        expect(timerManager.stopAllTimers).toHaveBeenCalled();
    });

    it('should transistion to follower state', async () => {
        await stateMachine.becomeFollower(1, null);
        expect(stateMachine.getCurrentState()).toBe(RaftState.Follower);
    });

    it('should update current leader', async () => {
        await stateMachine.becomeFollower(1, 'node2');
        expect(stateMachine.getCurrentLeader()).toBe('node2');
    });

    it('should update term and clear vote when new term is higher', async () => {
        await stateMachine.becomeFollower(2, null);
        expect(persistentState.updateTermAndVote).toHaveBeenCalledWith(2, null);
    });

    it('should not update term when same term is received', async () => {
        await stateMachine.becomeFollower(1, null);
        expect(persistentState.updateTermAndVote).not.toHaveBeenCalledWith(1, null);
    });

    it('should start election timer when becoming follower', async () => {
        await stateMachine.becomeFollower(1, null);
        expect(timerManager.startElectionTimer).toHaveBeenCalled();
    });

    it('should stop heartbeat timer and clear leader when transitioning from leader to follower', async () => {
        await stateMachine.becomeLeader();
        expect(stateMachine.isLeader()).toBe(true);

        await stateMachine.becomeFollower(2, null);
        expect(timerManager.stopHeartbeatTimer).toHaveBeenCalled();
        expect(stateMachine.getCurrentState()).toBe(RaftState.Follower);
    });

    it('should transition to candidate state', async () => {
        rpcHandler.sendRequestVote.mockResolvedValue({ term: 2, voteGranted: false });
        await stateMachine.becomeCandidate();
        expect(stateMachine.getCurrentState()).toBe(RaftState.Candidate);
    });

    it('should increment term', async () => {
        await stateMachine.becomeCandidate();
        expect(persistentState.updateTermAndVote).toHaveBeenCalledWith(2, nodeId);
    });

    it('should vote for self when becoming candidate', async () => {
        await stateMachine.becomeCandidate();
        expect(persistentState.updateTermAndVote).toHaveBeenCalledWith(2, nodeId);
    });

    it('should clear current leader when becoming candidate', async () => {
        rpcHandler.sendRequestVote.mockResolvedValue({ term: 2, voteGranted: false });
        await stateMachine.becomeFollower(1, 'node2');
        await stateMachine.becomeCandidate();
        expect(stateMachine.getCurrentLeader()).toBeNull();
    });

    it('should send requestvote RPCs to peers when becoming candidate', async () => {
        await stateMachine.becomeCandidate();
        await vi.waitFor(() => {
            expect(rpcHandler.sendRequestVote).toHaveBeenCalledTimes(peers.length);
        });
    });

    it('should become leader when majority votes received if there are no peers', async () => {
        const emptyPeersStateMachine = new StateMachine(
            nodeId,
            [],
            config as any,
            persistentState as any,
            volatileState as any,
            logManager as any,
            rpcHandler as any,
            timerManager as any,
            logger as any,
            onCommitIndexAdvanced as any
        );
        await emptyPeersStateMachine.becomeCandidate();
        expect(emptyPeersStateMachine.getCurrentState()).toBe(RaftState.Candidate);
    });

    it('should transition to leader state', async () => {
        await stateMachine.becomeLeader();
        expect(stateMachine.getCurrentState()).toBe(RaftState.Leader);
    });

    it('should set itself as leader', async () => {
        await stateMachine.becomeLeader();
        expect(stateMachine.getCurrentLeader()).toBe(nodeId);
    });

    it('should be recognized as leader', async () => {
        await stateMachine.becomeLeader();
        expect(stateMachine.isLeader()).toBe(true);
    });

    it('should start heartbeat timer when becoming leader', async () => {
        await stateMachine.becomeLeader();
        expect(timerManager.startHeartbeatTimer).toHaveBeenCalled();
    });

    it('should send initial heartbeats to all peers when becoming leader', async () => {
        await stateMachine.becomeLeader();
        await vi.waitFor(() => {
            expect(rpcHandler.sendAppendEntries).toHaveBeenCalledTimes(peers.length);
        });
    });
});
