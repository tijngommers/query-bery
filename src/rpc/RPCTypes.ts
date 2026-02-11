import { NodeId } from "../core/Config";
import { LogEntry } from "../log/LogEntry";

export interface RequestVoteRequest {
    term: number;
    candidateId: NodeId;
    lastLogIndex: number;
    lastLogTerm: number;
}

export interface RequestVoteResponse {
    term: number;
    voteGranted: boolean;
}

export interface AppendEntriesRequest {
    term: number;
    leaderId: NodeId;
    prevLogIndex: number;
    prevLogTerm: number;
    entries: LogEntry[]; // empty when sending heartbeat
    leaderCommit: number;
}

export interface AppendEntriesResponse {
    term: number;
    success: boolean;
    matchIndex?: number; // last three fields are optimization for leader upon failed append
    conflictIndex?: number;
    conflictTerm?: number;
}

export type RPCRequest = RequestVoteRequest | AppendEntriesRequest;

export type RPCResponse = RequestVoteResponse | AppendEntriesResponse;

export interface RequestVoteRequestMessage {
    type: "RequestVote";
    direction: "request";
    payload: RequestVoteRequest;
}

export interface RequestVoteResponseMessage {
    type: "RequestVote";
    direction: "response";
    payload: RequestVoteResponse;
}

export interface AppendEntriesRequestMessage {
    type: "AppendEntries";
    direction: "request";
    payload: AppendEntriesRequest;
}

export interface AppendEntriesResponseMessage {
    type: "AppendEntries";
    direction: "response";
    payload: AppendEntriesResponse;
}

export type RPCMessage = 
    | RequestVoteRequestMessage
    | RequestVoteResponseMessage
    | AppendEntriesRequestMessage
    | AppendEntriesResponseMessage;

export function isRequestVoteRequestMessage(message: RPCMessage): message is RequestVoteRequestMessage {
    return message.type === "RequestVote" && message.direction === "request";
}

export function isRequestVoteResponseMessage(message: RPCMessage): message is RequestVoteResponseMessage {
    return message.type === "RequestVote" && message.direction === "response";
}

export function isAppendEntriesRequestMessage(message: RPCMessage): message is AppendEntriesRequestMessage {
    return message.type === "AppendEntries" && message.direction === "request";
}

export function isAppendEntriesResponseMessage(message: RPCMessage): message is AppendEntriesResponseMessage {
    return message.type === "AppendEntries" && message.direction === "response";
}

export function validateRequestVoteRequest(request: RequestVoteRequest): void {
    if (!Number.isInteger(request.term) || request.term < 0) {
        throw new Error(`Invalid term: ${request.term}. term must be a non-negative integer.`);
    }

    if (!request.candidateId || typeof request.candidateId !== 'string') {
        throw new Error(`Invalid candidateId: ${request.candidateId}. candidateId must be a non-empty string.`);
    }

    if (!Number.isInteger(request.lastLogIndex) || request.lastLogIndex < 0) {
        throw new Error(`Invalid lastLogIndex: ${request.lastLogIndex}. lastLogIndex must be a non-negative integer.`);
    }

    if (!Number.isInteger(request.lastLogTerm) || request.lastLogTerm < 0) {
        throw new Error(`Invalid lastLogTerm: ${request.lastLogTerm}. lastLogTerm must be a non-negative integer.`);
    }
}

export function validateRequestVoteResponse(response: RequestVoteResponse): void {
    if (!Number.isInteger(response.term) || response.term < 0) {
        throw new Error(`Invalid term: ${response.term}. term must be a non-negative integer.`);
    }

    if (typeof response.voteGranted !== 'boolean') {
        throw new Error(`Invalid voteGranted: ${response.voteGranted}. voteGranted must be a boolean.`);
    }
}

export function validateAppendEntriesRequest(request: AppendEntriesRequest): void {
    if (!Number.isInteger(request.term) || request.term < 0) {
        throw new Error(`Invalid term: ${request.term}. term must be a non-negative integer.`);
    }

    if (!request.leaderId || typeof request.leaderId !== 'string') {
        throw new Error(`Invalid leaderId: ${request.leaderId}. leaderId must be a non-empty string.`);
    }

    if (!Number.isInteger(request.prevLogIndex) || request.prevLogIndex < 0) {
        throw new Error(`Invalid prevLogIndex: ${request.prevLogIndex}. prevLogIndex must be a non-negative integer.`);
    }

    if (!Number.isInteger(request.prevLogTerm) || request.prevLogTerm < 0) {
        throw new Error(`Invalid prevLogTerm: ${request.prevLogTerm}. prevLogTerm must be a non-negative integer.`);
    }

    if (!Number.isInteger(request.leaderCommit) || request.leaderCommit < 0) {
        throw new Error(`Invalid leaderCommit: ${request.leaderCommit}. leaderCommit must be a non-negative integer.`);
    }

    if (!Array.isArray(request.entries) || request.entries.some(entry => typeof entry !== 'object')) {
        throw new Error(`Invalid entries: ${request.entries}. entries must be an array of LogEntry objects.`);
    }
}

export function validateAppendEntriesResponse(response: AppendEntriesResponse): void {
    if (!Number.isInteger(response.term) || response.term < 0) {
        throw new Error(`Invalid term: ${response.term}. term must be a non-negative integer.`);
    }

    if (typeof response.success !== 'boolean') {
        throw new Error(`Invalid success: ${response.success}. success must be a boolean.`);
    }

    if (response.matchIndex !== undefined && (!Number.isInteger(response.matchIndex) || response.matchIndex < 0)) {
        throw new Error(`Invalid matchIndex: ${response.matchIndex}. matchIndex must be a non-negative integer.`);
    }

    if (response.conflictIndex !== undefined && (!Number.isInteger(response.conflictIndex) || response.conflictIndex < 0)) {
        throw new Error(`Invalid conflictIndex: ${response.conflictIndex}. conflictIndex must be a non-negative integer.`);
    }

    if (response.conflictTerm !== undefined && (!Number.isInteger(response.conflictTerm) || response.conflictTerm < 0)) {
        throw new Error(`Invalid conflictTerm: ${response.conflictTerm}. conflictTerm must be a non-negative integer.`);
    }
}

export function validateRPCMessage(message: RPCMessage): void {
    switch (message.type) {
        case "RequestVote":
            if (message.direction === "request") {
                validateRequestVoteRequest(message.payload);
            } else {
                validateRequestVoteResponse(message.payload);
            }
            break;
        case "AppendEntries":
            if (message.direction === "request") {
                validateAppendEntriesRequest(message.payload);
            } else {
                validateAppendEntriesResponse(message.payload);
            }
            break;
        default:
            throw new Error('Unknown RPC message type.');
    }
}

