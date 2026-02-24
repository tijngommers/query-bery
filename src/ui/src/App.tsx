import { useRaftSocket } from "./hooks/useRaftSocket";
import { EventFeed } from "./components/EventFeed";
import { ClusterView } from "./components/ClusterView";
import { NodeDetail } from "./components/NodeDetail";

export default function App() {
    useRaftSocket();
    return (
        <div style={{ display: 'flex', height: '100vh' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <ClusterView />
            <NodeDetail />
          </div>

          <div style={{ width: '400px', overflowY: 'scroll' }}>
            <EventFeed />
          </div>
        </div>
    )
}