import { useRaftSocket } from "./hooks/useRaftSocket";
import { EventFeed } from "./components/EventFeed";
import { ClusterView } from "./components/ClusterView";

export default function App() {
    useRaftSocket();
    return (
        <div style={{ display: 'flex', height: '100vh' }}>
          <ClusterView />
          <div style={{ width: '400px', overflowY: 'scroll' }}>
            <EventFeed />
          </div>
        </div>
    )
}