import { describe, it, expect } from "vitest";
import { isRequestVoteRequestMessage,
        isRequestVoteResponseMessage,
        isAppendEntriesRequestMessage,
        isAppendEntriesResponseMessage,
        RequestVoteRequestMessage,
        RequestVoteResponseMessage,
        AppendEntriesRequestMessage,
        AppendEntriesResponseMessage,
        validateAppendEntriesRequest,
        validateAppendEntriesResponse,
        validateRequestVoteRequest,
        validateRequestVoteResponse
        } from "./RPCTypes";

describe('RPCTypes.ts, isRequestVoteRequestMessage', () => {

    const validMessage: RequestVoteRequestMessage = {
        type: "RequestVote",
        direction: "request",
        payload: {
            term: 1,
            candidateId: "node1",
            lastLogIndex: 0,
            lastLogTerm: 0
        }
    };

    const invalidMessage1 = {
        type: "AppendEntries",
        direction: "request",
        payload: {
            term: 1,
            candidateId: "node1",
            lastLogIndex: 0,
            lastLogTerm: 0
        }
    } as any;

    const invalidMessage2 = {
        type: "RequestVote",
        direction: "response",
        payload: {
            term: 1,
            candidateId: "node1",
            lastLogIndex: 0,
            lastLogTerm: 0
        }
    } as any;

    it('should return true for valid RequestVoteRequestMessage', () => {
        expect(isRequestVoteRequestMessage(validMessage)).toBe(true);
    });

    it('should return false for invalid RequestVoteRequestMessage with wrong type', () => {
        expect(isRequestVoteRequestMessage(invalidMessage1)).toBe(false);
    });

    it('should return false for invalid RequestVoteRequestMessage with wrong direction', () => {
        expect(isRequestVoteRequestMessage(invalidMessage2)).toBe(false);
    });
});

describe('RPCTypes.ts, isRequestVoteResponseMessage', () => {

    const validMessage: RequestVoteResponseMessage = {
        type: "RequestVote",
        direction: "response",
        payload: {
            term: 1,
            voteGranted: true
        }
    };

    const invalidMessage1 = {
        type: "AppendEntries",
        direction: "response",
        payload: {
            term: 1,
            voteGranted: true
        }
    } as any;

    const invalidMessage2 = {
        type: "RequestVote",
        direction: "request",
        payload: {
            term: 1,
            voteGranted: true
        }
    } as any;

    it('should return true for valid RequestVoteResponseMessage', () => {
        expect(isRequestVoteResponseMessage(validMessage)).toBe(true);
    });

    it('should return false for invalid RequestVoteResponseMessage with wrong type', () => {
        expect(isRequestVoteResponseMessage(invalidMessage1)).toBe(false);
    });

    it('should return false for invalid RequestVoteResponseMessage with wrong direction', () => {
        expect(isRequestVoteResponseMessage(invalidMessage2)).toBe(false);
    });
});

describe('RPCTypes.ts, isAppendEntriesRequestMessage', () => {

    const validMessage: AppendEntriesRequestMessage = {
        type: "AppendEntries",
        direction: "request",
        payload: {
            term: 1,
            leaderId: "node1",
            prevLogIndex: 0,
            prevLogTerm: 0,
            entries: [],
            leaderCommit: 0
        }
    };

    const invalidMessage1 = {
        type: "RequestVote",
        direction: "request",
        payload: {
            term: 1,
            leaderId: "node1",
            prevLogIndex: 0,
            prevLogTerm: 0,
            entries: [],
            leaderCommit: 0
        }
    } as any;

    const invalidMessage2 = {
        type: "AppendEntries",
        direction: "response",
        payload: {
            term: 1,
            leaderId: "node1",
            prevLogIndex: 0,
            prevLogTerm: 0,
            entries: [],
            leaderCommit: 0
        }
    } as any;

    it('should return true for valid AppendEntriesRequestMessage', () => {
        expect(isAppendEntriesRequestMessage(validMessage)).toBe(true);
    });

    it('should return false for invalid AppendEntriesRequestMessage with wrong type', () => {
        expect(isAppendEntriesRequestMessage(invalidMessage1)).toBe(false);
    });

    it('should return false for invalid AppendEntriesRequestMessage with wrong direction', () => {
        expect(isAppendEntriesRequestMessage(invalidMessage2)).toBe(false);
    });
});

describe('RPCTypes.ts, isAppendEntriesResponseMessage', () => {

    const validMessage: AppendEntriesResponseMessage = {
        type: "AppendEntries",
        direction: "response",
        payload: {
            term: 1,
            success: true
        }
    };

    const invalidMessage1 = {
        type: "RequestVote",
        direction: "response",
        payload: {
            term: 1,
            success: true
        }
    } as any;

    const invalidMessage2 = {
        type: "AppendEntries",
        direction: "request",
        payload: {
            term: 1,
            success: true
        }
    } as any;

    it('should return true for valid AppendEntriesResponseMessage', () => {
        expect(isAppendEntriesResponseMessage(validMessage)).toBe(true);
    });

    it('should return false for invalid AppendEntriesResponseMessage with wrong type', () => {
        expect(isAppendEntriesResponseMessage(invalidMessage1)).toBe(false);
    });

    it('should return false for invalid AppendEntriesResponseMessage with wrong direction', () => {
        expect(isAppendEntriesResponseMessage(invalidMessage2)).toBe(false);
    });
});

describe("RPCTypes.ts, validateRequestVoteRequest", () => {

    const validRequest = {
        term: 1,
        candidateId: "node1",
        lastLogIndex: 0,
        lastLogTerm: 0
    };
    const invalidRequest1 = {
        term: "not an integer" as any,
        candidateId: "node1",
        lastLogIndex: 0,
        lastLogTerm: 0
    };
    const invalidRequest2 = {
        term: -1,
        candidateId: "node1",
        lastLogIndex: 0,
        lastLogTerm: 0
    };
    const invalidRequest3 = {
        term: 1,
        candidateId: "",
        lastLogIndex: 0,
        lastLogTerm: 0
    };
    const invalidRequest4 = {
        term: 1,
        candidateId: 123 as any,
        lastLogIndex: 0,
        lastLogTerm: 0
    };
    const invalidRequest5 = {
        term: 1,
        candidateId: "node1",
        lastLogIndex: "not an integer" as any,
        lastLogTerm: 0
    };
    const invalidRequest6 = {
        term: 1,
        candidateId: "node1",
        lastLogIndex: -1,
        lastLogTerm: 0
    };
    const invalidRequest7 = {
        term: 1,
        candidateId: "node1",
        lastLogIndex: 0,
        lastLogTerm: "not an integer" as any
    };
    const invalidRequest8 = {
        term: 1,
        candidateId: "node1",
        lastLogIndex: 0,
        lastLogTerm: -1
     };

    it ('should not throw error for valid RequestVoteRequest', () => {
        expect(() => validateRequestVoteRequest(validRequest)).not.toThrow();
    });

    it('should throw error for non integer term', () => {
        expect(() => validateRequestVoteRequest(invalidRequest1)).toThrow("Invalid term: not an integer. term must be a non-negative integer.");
    });

    it('should throw error for negative term', () => {
        expect(() => validateRequestVoteRequest(invalidRequest2)).toThrow("Invalid term: -1. term must be a non-negative integer.");
    });

    it('should throw error for empty candidateId', () => {
        expect(() => validateRequestVoteRequest(invalidRequest3)).toThrow("Invalid candidateId: . candidateId must be a non-empty string.");
    });

    it('should throw error for non string candidateId', () => {
        expect(() => validateRequestVoteRequest(invalidRequest4)).toThrow("Invalid candidateId: 123. candidateId must be a non-empty string.");
    });

    it('should throw error for non integer lastLogIndex', () => {
        expect(() => validateRequestVoteRequest(invalidRequest5)).toThrow("Invalid lastLogIndex: not an integer. lastLogIndex must be a non-negative integer.");
    });

    it('should throw error for negative lastLogIndex', () => {
        expect(() => validateRequestVoteRequest(invalidRequest6)).toThrow("Invalid lastLogIndex: -1. lastLogIndex must be a non-negative integer.");
    });

    it('should throw error for non integer lastLogTerm', () => {
        expect(() => validateRequestVoteRequest(invalidRequest7)).toThrow("Invalid lastLogTerm: not an integer. lastLogTerm must be a non-negative integer.");
    });

    it('should throw error for negative lastLogTerm', () => {
        expect(() => validateRequestVoteRequest(invalidRequest8)).toThrow("Invalid lastLogTerm: -1. lastLogTerm must be a non-negative integer.");
    });
});

describe('RPCTypes.ts, validateRequestVoteResponse', () => {

    const validResponse = {
        term: 1,
        voteGranted: true
    };
    const invalidResponse1 = {
        term: "not an integer" as any,
        voteGranted: true
    };
    const invalidResponse2 = {
        term: -1,
        voteGranted: true
    };
    const invalidResponse3 = {
        term: 1,
        voteGranted: "not a boolean" as any
     };

    it ('should not throw error for valid RequestVoteResponse', () => {
        expect(() => validateRequestVoteResponse(validResponse)).not.toThrow();
    });

    it('should throw error for non integer term', () => {
        expect(() => validateRequestVoteResponse(invalidResponse1)).toThrow("Invalid term: not an integer. term must be a non-negative integer.");
    });

    it('should throw error for negative term', () => {
        expect(() => validateRequestVoteResponse(invalidResponse2)).toThrow("Invalid term: -1. term must be a non-negative integer.");
    });

    it('should throw error for non boolean voteGranted', () => {
        expect(() => validateRequestVoteResponse(invalidResponse3)).toThrow("Invalid voteGranted: not a boolean. voteGranted must be a boolean.");
    });
});

describe('RPCTypes.ts, validateAppendEntriesRequest', () => {

    const validRequest = {
        term: 1,
        leaderId: "node1",
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 0,
        entries: [],
    };
    const invalidRequest1 = {
        term: "not an integer" as any,
        leaderId: "node1",
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 0,
        entries: [],
    };
    const invalidRequest2 = {
        term: -1,
        leaderId: "node1",
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 0,
        entries: [],
    };

    it ('should not throw error for valid AppendEntriesRequest', () => {
        expect(() => validateAppendEntriesRequest(validRequest)).not.toThrow();
    });

    it('should throw error for non integer term', () => {
        expect(() => validateAppendEntriesRequest(invalidRequest1)).toThrow("Invalid term: not an integer. term must be a non-negative integer.");
    });

    it('should throw error for negative term', () => {
        expect(() => validateAppendEntriesRequest(invalidRequest2)).toThrow("Invalid term: -1. term must be a non-negative integer.");
    });
});

