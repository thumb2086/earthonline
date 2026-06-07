import React, { useMemo, useState, useEffect } from 'react';
import { Server, Activity } from 'lucide-react';
import './datacenter.css';

// 3D 立方體組件
function IsoCube({ w, d, h, left, top, colorClass, frontContent }) {
  return (
    <div className="iso-item" style={{ left: `${left}%`, top: `${top}%` }}>
      <div className="cube" style={{ width: `${w}px`, height: `${d}px`, transform: `translateZ(${h/2}px)` }}>
        <div className={`face front ${colorClass}`} style={{ width: `${w}px`, height: `${h}px`, transform: `rotateX(-90deg) translateZ(${d/2}px)` }}>
          {frontContent}
        </div>
        <div className={`face back ${colorClass}`} style={{ width: `${w}px`, height: `${h}px`, transform: `rotateX(90deg) translateZ(${d/2}px)` }}></div>
        <div className={`face right ${colorClass}`} style={{ width: `${d}px`, height: `${h}px`, transform: `rotateY(90deg) rotateZ(-90deg) translateZ(${w/2}px) translateY(-${d/2}px)` }}></div>
        <div className={`face left ${colorClass}`} style={{ width: `${d}px`, height: `${h}px`, transform: `rotateY(-90deg) rotateZ(90deg) translateZ(${w/2}px) translateY(${d/2}px)` }}></div>
        <div className={`face top ${colorClass}`} style={{ width: `${w}px`, height: `${d}px`, transform: `translateZ(${h/2}px)` }}></div>
      </div>
    </div>
  );
}

// 伺服器機櫃
function ServerRack({ left, top }) {
  const frontContent = (
    <div className="rack-front">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rack-slot">
          <div className={`led ${Math.random() > 0.5 ? 'blink-fast' : 'blink-slow'}`}></div>
          <div className={`led ${Math.random() > 0.5 ? 'blink-fast' : 'blink-slow'}`} style={{ animationDelay: `${Math.random()}s` }}></div>
          <div className={`led ${Math.random() > 0.5 ? 'blink-fast' : 'blink-slow'}`} style={{ animationDelay: `${Math.random()}s` }}></div>
        </div>
      ))}
    </div>
  );
  return <IsoCube w={30} d={30} h={80} left={left} top={top} colorClass="rack-color" frontContent={frontContent} />;
}

export default function DataCenterVisualizer({ lifespan, bonusPoints }) {
  // Level Calculation
  const level = useMemo(() => {
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    if (hours >= 100 || pt >= 5000) return 5;
    if (hours >= 24 || pt >= 1000) return 4;
    if (hours >= 5 || pt >= 200) return 3;
    if (hours >= 1 || pt >= 50) return 2;
    return 1;
  }, [lifespan, bonusPoints]);

  const hashrate = useMemo(() => {
    switch(level) {
      case 1: return '1.5 MH/s';
      case 2: return '45.0 MH/s';
      case 3: return '850.0 GH/s';
      case 4: return '12.5 TH/s';
      case 5: return '1.2 PB/s';
      default: return '0 H/s';
    }
  }, [level]);

  const progressToNext = useMemo(() => {
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    if (level === 1) return Math.min(100, Math.max((hours/1)*100, (pt/50)*100));
    if (level === 2) return Math.min(100, Math.max((hours/5)*100, (pt/200)*100));
    if (level === 3) return Math.min(100, Math.max((hours/24)*100, (pt/1000)*100));
    if (level === 4) return Math.min(100, Math.max((hours/100)*100, (pt/5000)*100));
    return 100;
  }, [level, lifespan, bonusPoints]);

  return (
    <div className="dc-container">
      {/* 浮動狀態面板 */}
      <div className="dc-status-panel floating-panel">
        <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--accent-color)" /> 機房營運狀態
        </h3>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
          設施等級 (Facility Level): <strong style={{ color: '#fff' }}>LV {level}</strong>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          總算力 (Total Hashrate): <strong style={{ color: '#00ffaa' }}>{hashrate}</strong>
        </div>
        
        {level < 5 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>升級進度 (Next Level)</div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progressToNext}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 1s ease' }}></div>
            </div>
          </div>
        )}
        {level >= 5 && (
          <div style={{ color: '#FFD700', fontSize: '0.85rem', fontWeight: 'bold' }}>
            ✨ 已達國家級數據中心規格
          </div>
        )}
      </div>

      {/* 2.5D Isometric Scene */}
      <div className="iso-scene">
        <div className="iso-grid">
          
          {/* Level 1: Desk & Laptop */}
          <IsoCube w={60} d={40} h={5} left={50} top={50} colorClass="desk-color" />
          <div className="iso-item" style={{ left: '50%', top: '50%' }}>
            <div className="laptop-screen" style={{ transform: 'translateZ(15px) rotateX(-70deg) translateY(-10px)' }}>
               <div className="laptop-code"></div>
            </div>
            <div className="laptop-base" style={{ transform: 'translateZ(6px) translateY(-5px)' }}></div>
          </div>

          {/* Level 2: Small Tower Server */}
          {level >= 2 && (
            <IsoCube w={15} d={25} h={30} left={65} top={65} colorClass="tower-color" frontContent={
              <div className="rack-front"><div className="led blink-fast" style={{marginTop: '5px'}}></div></div>
            } />
          )}

          {/* Level 3: First Rack */}
          {level >= 3 && (
            <ServerRack left={30} top={30} />
          )}

          {/* Level 4: More Racks */}
          {level >= 4 && (
            <>
              <ServerRack left={20} top={20} />
              <ServerRack left={40} top={20} />
              <ServerRack left={15} top={40} />
            </>
          )}

          {/* Level 5: Hologram & Max Racks */}
          {level >= 5 && (
            <>
              <ServerRack left={80} top={70} />
              <ServerRack left={70} top={80} />
              <ServerRack left={15} top={80} />
              
              <div className="iso-item" style={{ left: '70%', top: '30%' }}>
                 <div className="hologram-base" style={{ transform: 'translateZ(5px)' }}>
                   <div className="hologram-globe"></div>
                 </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
