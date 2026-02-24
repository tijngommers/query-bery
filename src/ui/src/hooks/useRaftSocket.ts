import { useEffect } from "react";
import { useRaftStore } from "../store/raftStore";
import type { ServerMessage } from "../types/raftTypes";

const ws_url = 'ws://localhost:4001';
const reconnnect_ms = 1000;

export function useRaftSocket() {
    const setNodeIds = useRaftStore((state) => state.setNodeIds);
    const pushEvent = useRaftStore((state) => state.pushEvent);

    useEffect(() => {
        let ws: WebSocket;
        let canceled = false;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        function connect() {
            ws = new WebSocket(ws_url);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data) as ServerMessage;

                if (data.type === "InitialState") {
                    setNodeIds(data.nodeIds);
                    for (const event of [...data.events].reverse()) {
                        pushEvent(event);
                    }
                } else if (data.type === "LiveEvent") {
                    pushEvent(data.event);
                }
            };

            ws.onclose = () => {
                if (!canceled) {
                    reconnectTimer = setTimeout(connect, reconnnect_ms);
                }
            };

            ws.onerror = () => ws.close();
        }

        connect();

        return () => {
            canceled = true;
            clearTimeout(reconnectTimer);
            ws?.close();
        };
    }, [setNodeIds, pushEvent]);
}