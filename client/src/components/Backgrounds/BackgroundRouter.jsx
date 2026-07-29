import React from 'react';
import EarthGlobe from './EarthGlobe';
import ServerRoom from './ServerRoom';
import Nebula from './Nebula';
import RadarTerminal from './RadarTerminal';
import CyberCity from './CyberCity';

export default function BackgroundRouter({ style, nodes, myNodeId, stats }) {
  switch(style) {
    case 'server': return <ServerRoom stats={stats} />;
    case 'nebula': return <Nebula />;
    case 'radar': return <RadarTerminal />;
    case 'cyber': return <CyberCity />;
    default: return <EarthGlobe nodes={nodes} myNodeId={myNodeId} onlineCount={stats?.activeUsers || 0} region={stats?.region} />;
  }
}
