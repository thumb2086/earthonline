import React, { useState, useRef, useCallback, useEffect } from 'react';

const PIXEL = 6;
const MAP_W = 160;
const MAP_H = 80;

const CONTINENTS = [
  { name: '北美', color: '#4ade80', blocks: [[20,15],[21,15],[22,15],[23,15],[20,16],[24,16],[20,17],[24,17],[20,18],[21,18],[22,18],[23,18],[24,18],[20,19],[24,19],[20,20],[21,20],[22,20],[23,20],[24,20],[20,21],[24,21],[21,22],[22,22],[23,22],[22,23],[22,24],[22,25],[22,26]] },
  { name: '南美', color: '#22c55e', blocks: [[27,30],[28,30],[27,31],[28,31],[27,32],[28,32],[27,33],[28,33],[27,34],[28,34],[27,35],[28,35],[26,36],[27,36],[28,36],[26,37],[27,37],[26,38],[27,38],[26,39],[27,39],[26,40],[27,40],[25,41],[26,41],[25,42]] },
  { name: '歐洲', color: '#60a5fa', blocks: [[72,18],[73,18],[74,18],[75,18],[76,18],[72,19],[76,19],[72,20],[73,20],[74,20],[75,20],[76,20],[72,21],[76,21],[73,22],[74,22],[75,22],[73,23],[74,23]] },
  { name: '非洲', color: '#f59e0b', blocks: [[73,28],[74,28],[75,28],[73,29],[75,29],[73,30],[74,30],[75,30],[73,31],[75,31],[73,32],[74,32],[75,32],[72,33],[73,33],[74,33],[72,34],[73,34],[72,35],[73,35],[72,36],[73,36],[72,37]] },
  { name: '亞洲', color: '#f87171', blocks: [[80,15],[81,15],[82,15],[83,15],[84,15],[85,15],[86,15],[87,15],[80,16],[87,16],[80,17],[87,17],[80,18],[81,18],[82,18],[83,18],[84,18],[85,18],[86,18],[87,18],[78,19],[79,19],[80,19],[87,19],[88,19],[89,19],[90,19],[78,20],[90,20],[78,21],[79,21],[80,21],[81,21],[82,21],[83,21],[84,21],[85,21],[86,21],[87,21],[88,21],[89,21],[90,21],[78,22],[90,22],[78,23],[79,23],[80,23],[81,23],[82,23],[83,23],[84,23],[85,23],[86,23],[87,23],[88,23],[89,23],[90,23],[80,24],[81,24],[82,24],[83,24],[84,24],[85,24],[86,24],[87,24],[80,25],[81,25],[82,25],[83,25],[84,25],[85,25],[82,26],[83,26],[84,26]] },
  { name: '大洋洲', color: '#38bdf8', blocks: [[100,45],[101,45],[102,45],[100,46],[102,46],[100,47],[101,47],[102,47],[100,48],[101,48],[100,49],[101,49]] },
];

const WATER_COLOR = '#0a1628';

export default function WorldMap({ players = [], onCountryClick, style }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const continentMap = {};
  CONTINENTS.forEach(c => c.blocks.forEach(([bx, by]) => { continentMap[`${bx},${by}`] = c; }));

  const handleMouseDown = useCallback((e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleClick = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = Math.floor((e.clientX - rect.left - offset.x) / PIXEL);
    const my = Math.floor((e.clientY - rect.top - offset.y) / PIXEL);
    const key = `${mx},${my}`;
    if (continentMap[key]) onCountryClick?.(continentMap[key]);
  }, [offset, continentMap, onCountryClick]);

  const playerCoords = {};
  players.forEach(p => {
    if (p.lat && p.lon) {
      const px = Math.floor((p.lon + 180) / 360 * MAP_W);
      const py = Math.floor((90 - p.lat) / 180 * MAP_H);
      playerCoords[`${px},${py}`] = (playerCoords[`${px},${py}`] || 0) + 1;
    }
  });

  return (
    <div ref={containerRef} style={{
      position: 'relative', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab',
      background: WATER_COLOR, ...style,
    }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <div style={{
        position: 'absolute', left: offset.x, top: offset.y,
        imageRendering: 'pixelated',
      }}>
        {CONTINENTS.map(cont =>
          cont.blocks.map(([bx, by], i) => (
            <div key={`${cont.name}-${i}`} style={{
              position: 'absolute',
              left: bx * PIXEL, top: by * PIXEL,
              width: PIXEL, height: PIXEL,
              background: cont.color,
              border: '1px solid rgba(0,0,0,0.3)',
              boxSizing: 'border-box',
            }} />
          ))
        )}
        {Object.entries(playerCoords).map(([key, count]) => {
          const [px, py] = key.split(',').map(Number);
          return (
            <div key={`p-${key}`} style={{
              position: 'absolute',
              left: px * PIXEL + 1, top: py * PIXEL + 1,
              width: 4, height: 4, borderRadius: '50%',
              background: '#00ff41',
              boxShadow: '0 0 4px #00ff41',
            }} />
          );
        })}
      </div>
    </div>
  );
}
