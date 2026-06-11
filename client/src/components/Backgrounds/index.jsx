import React from 'react';
import EarthGlobe from '../../EarthGlobe';
import ServerRoom from './ServerRoom';

const STYLES = [
  { id: 'earth', name: '3D 地球', icon: '🌍' },
  { id: 'server', name: '數據海洋', icon: '🌊' },
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
    default:
      bg = <EarthGlobe {...bgProps} />;
  }

  return (
    <>
      <div className="background-container">
        {bg}
      </div>
      <div className="bg-switcher">
        {STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => setBackground(s.id)}
            title={s.name}
            className={`bg-switcher-btn ${style === s.id ? 'active' : ''}`}
          >
            {s.icon}
          </button>
        ))}
      </div>
    </>
  );
}

export { STYLES, STORAGE_KEY };
