import { NodeId} from "../core/Config";
import { RPCMessage } from "../rpc/RPCTypes";

export type MessageHandler = (
    from: NodeId,
    message: RPCMessage
) => Promise<RPCMessage | void>;

export interface Transport {
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    send(peerId: NodeId, message: RPCMessage): Promise<RPCMessage | void>;
    onMessage(handler: MessageHandler): void;
}