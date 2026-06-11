import React from 'react';
import EarthGlobe from '../../EarthGlobe';
import ServerRoom from './ServerRoom';
import Nebula from './Nebula';
import RadarTerminal from './RadarTerminal';
import CyberCity from './CyberCity';

const STYLES = [
  { id: 'earth', name: '3D 地球', icon: '🌍' },
  { id: 'server', name: '伺服器機房', icon: '🖥️' },
  { id: 'nebula', name: '星雲宇宙', icon: '🌌' },
  { id: 'radar', name: '雷達終端機', icon: '📡' },
  { id: 'cyber', name: '賽博龐克城市', icon: '🏙️' },
];

const STORAGE_KEY = 'eo_bg_style';

function getSavedStyle() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'earth';
  } catch {
    return 'earth';
  }
}

function saveStyle(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export default function BackgroundRouter(props) {
  const [style, setStyle] = React.useState(getSavedStyle);

  React.useEffect(() => {
    saveStyle(style);
  }, [style]);

  React.useEffect(() => {
    const handler = () => setStyle(getSavedStyle());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setBackground = (id) => {
    setStyle(id);
    saveStyle(id);
  };

  const bgProps = {
    onlineCount: props.onlineCount,
    region: props.region,
    activeEvent: props.activeEvent,
    multiplier: props.multiplier,
    nodes: props.nodes,
    myNodeId: props.myNodeId,
  };

  let bg;
  switch (style) {
    case 'server':
      bg = <ServerRoom {...bgProps} />;
      break;
    case 'nebula':
      bg = <Nebula {...bgProps} />;
      break;
    case 'radar':
      bg = <RadarTerminal {...bgProps} />;
      break;
    case 'cyber':
      bg = <CyberCity {...bgProps} />;
      break;
    default:
      bg = <EarthGlobe {...bgProps} />;
  }

  return (
    <>
      <div className="background-container">
        {bg}
      </div>
      <div className="bg-switcher" style={{
        position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
        display: 'flex', gap: '6px',
      }}>
        {STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => setBackground(s.id)}
            title={s.name}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: style === s.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
              background: style === s.id ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.5)',
              cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              backdropFilter: 'blur(4px)',
            }}
          >
            {s.icon}
          </button>
        ))}
      </div>
    </>
  );
}

export { STYLES, STORAGE_KEY };
