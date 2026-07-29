import React from 'react';
import EarthGlobe from '../../EarthGlobe';

const STYLES = [
  { id: 'earth', name: '3D 地球', icon: '🌍' },
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

  const bgProps = {
    onlineCount: props.onlineCount,
    region: props.region,
    activeEvent: props.activeEvent,
    multiplier: props.multiplier,
    nodes: props.nodes,
    myNodeId: props.myNodeId,
  };

  return (
    <div className="background-container">
      <EarthGlobe {...bgProps} />
    </div>
  );
}
