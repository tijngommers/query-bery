import type { MessageArrow, NodeUIState, RaftEvent } from "../types/raftTypes";
import { create } from 'zustand'

interface RaftStore {
    nodeIds: string[];
    events: RaftEvent[];
    nodes: Record<string, NodeUIState>;
    arrows: MessageArrow[];
    setNodeIds: (ids: string[]) => void;
    pushEvent: (event: RaftEvent) => void;
    processEvent: (event: RaftEvent) => void;
    reset: () => void;
}

const makeNode = (nodeId: string): NodeUIState => ({
    nodeId,
    role: "Follower",
    term: 0,
    commitIndex: 0,
    votedFor: null,
    crashed: false,
    logEntries: [],
})

export const useRaftStore = create<RaftStore>((set) => ({
    nodeIds: [],
    events: [],
    nodes: {},
    arrows: [],

    setNodeIds: (ids) => { 
        const nodes: Record<string, NodeUIState> = {};
        for (const id of ids) {
            nodes[id] = makeNode(id);
        }
        set({ nodeIds: ids, nodes });
    },
    pushEvent: (event) => set(
        (state) => ({ events: [event, ...state.events]
            .slice(0, 100) })),
    processEvent: (event) => {
        switch (event.type) {
            case "NodeStateChanged": {
                set(state => ({
                    nodes: {
                        ...state.nodes,
                        [event.nodeId]: {
                            ...state.nodes[event.nodeId],
                            role: event.newState,
                            term: event.term,
                        },
                    },
                }));
                break;
            }
            case "MessageSent": {
                if (event.messageType !== "RequestVote") break;

                const arrow: MessageArrow = {
                    id: event.messageId,
                    fromNodeId: event.fromNodeId,
                    toNodeId: event.toNodeId,
                    messageType: event.messageType,
                    status: "inFlight",
                    createdAt: Date.now(),
                };
                set(state => ({ arrows: [...state.arrows, arrow] }));
                break;
            }

            case "MessageReceived": {

                if (event.messageType !== "RequestVoteResponse") break;

                let returnArrow: MessageArrow;

                setTimeout(() => {
                    returnArrow = {
                        id: event.messageId + "-response",
                        fromNodeId: event.fromNodeId,
                        toNodeId: event.toNodeId,
                        messageType: event.messageType,
                        status: "inFlight",
                        createdAt: Date.now(),
                    };
                    set(state => ({ arrows: [...state.arrows, returnArrow] }));
                }, 1500);


                setTimeout(() => {
                    set(state => ({
                        arrows: state.arrows.filter(arrow => arrow.id !== event.messageId),
                    }));
                }, 1000);

                setTimeout(() => {
                    set(state => ({
                        arrows: state.arrows.filter(arrow => arrow.id !== returnArrow.id),
                    }));
                }, 2500);

                break;
            }

            default:
                break;
        }
    },
    reset: () => set({ nodeIds: [], events: [], nodes: {}, arrows: [] }),
    })
)
