import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import DataCenterVisualizer from '../../DataCenterVisualizer';
import Console from '../Dashboard/Console';

export default function MobileGlobe({
  lifespan, myNode, ping, globalStats, region,
  onOpenSocial, onOpenAchievements, honor, weeklyScore,
  bgStyle, currentEvent, nodes, logs, chatInput, setChatInput,
  socket, pmData, onClosePm, t
}) {
  const [showConsole, setShowConsole] = useState(false);

  return (
    <div className="mobile-globe">
      <DataCenterVisualizer
        lifespan={lifespan}
        bonusPoints={myNode?.accumulatedBonusPoints || 0}
        ping={ping}
        onlineCount={globalStats.activeUsers || 0}
        cpuUsage={globalStats.systemHardware?.cpu || 0}
        region={region}
        onOpenSocial={onOpenSocial}
        onOpenAchievements={onOpenAchievements}
        honor={honor}
        weeklyScore={weeklyScore}
        bgStyle={bgStyle}
        activeEvent={currentEvent?.type || null}
        multiplier={globalStats.multiplier || 1}
        nodes={nodes}
        myNodeId={myNode?.userId}
      />

      <button
        className="mobile-globe-chat-btn"
        onClick={() => setShowConsole(!showConsole)}
      >
        {showConsole ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {showConsole && (
        <div className="mobile-globe-console">
          <Console
            logs={logs}
            chatInput={chatInput}
            setChatInput={setChatInput}
            socket={socket}
            pmData={pmData}
            onClosePm={onClosePm}
          />
        </div>
      )}
    </div>
  );
}
