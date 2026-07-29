import React, { useMemo } from 'react';
import { useTheme } from '../ThemeContext';

const BG_STYLES = {
  cyberpunk: {
    gradient: 'radial-gradient(ellipse at 50% 0%, #0a2a4a 0%, #0a0e17 50%, #050810 100%)',
    overlay: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)',
    particles: 'grid',
  },
  matrix: {
    gradient: 'radial-gradient(ellipse at 50% 30%, #001a00 0%, #000000 70%)',
    overlay: 'none',
    particles: 'matrix',
  },
  synthwave: {
    gradient: 'radial-gradient(ellipse at 50% 100%, #ff00ff22 0%, #1a0033 40%, #0d001a 100%)',
    overlay: 'none',
    particles: 'grid-horizon',
  },
  light: {
    gradient: 'linear-gradient(180deg, #e8f0fe 0%, #f8fafc 40%, #ffffff 100%)',
    overlay: 'none',
    particles: 'none',
  },
  sunset: {
    gradient: 'radial-gradient(ellipse at 50% 100%, #ff6b3533 0%, #1a0a00 50%, #0d0500 100%)',
    overlay: 'none',
    particles: 'dust',
  },
  ocean: {
    gradient: 'radial-gradient(ellipse at 30% 20%, #003a5c55 0%, #001a2e 50%, #000d1a 100%)',
    overlay: 'none',
    particles: 'bubbles',
  },
  forest: {
    gradient: 'radial-gradient(ellipse at 50% 20%, #1e3a1e44 0%, #0a1a0a 60%, #051005 100%)',
    overlay: 'none',
    particles: 'none',
  },
  midnight: {
    gradient: 'radial-gradient(ellipse at 50% 0%, #12122e 0%, #050510 60%, #020208 100%)',
    overlay: 'none',
    particles: 'stars',
  },
  royal: {
    gradient: 'radial-gradient(ellipse at 50% 30%, #2a1a4a44 0%, #0d0a1a 50%, #06040d 100%)',
    overlay: 'none',
    particles: 'none',
  },
  blood: {
    gradient: 'radial-gradient(ellipse at 50% 100%, #ff000022 0%, #0a0000 50%, #050000 100%)',
    overlay: 'none',
    particles: 'embers',
  },
  pastel: {
    gradient: 'linear-gradient(135deg, #faf5ff 0%, #f0e6ff 30%, #e0f0ff 70%, #f5f0ff 100%)',
    overlay: 'none',
    particles: 'none',
  },
};

function Stars() {
  const stars = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: '#fff',
          animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function GridEffect({ color = 'rgba(0,255,65,0.06)', lineColor = 'rgba(0,255,65,0.04)' }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(${lineColor} 1px, transparent 1px),
        linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px',
      animation: 'gridPulse 8s ease-in-out infinite',
    }} />
  );
}

function GridHorizon() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(90deg, rgba(255,0,255,0.08) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255,0,255,0.08) 1px, transparent 1px)
      `,
      backgroundSize: '80px 40px',
      transform: 'perspective(400px) rotateX(60deg)',
      transformOrigin: 'bottom center',
      maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
    }} />
  );
}

function MatrixRain() {
  const cols = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: (i / 20) * 100,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 3,
      chars: Array.from({ length: 8 }, () => String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))).join('\n'),
    })), []);
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      opacity: 0.15,
    }}>
      {cols.map(c => (
        <div key={c.id} style={{
          position: 'absolute', left: `${c.left}%`, top: '-20%',
          fontFamily: 'monospace', fontSize: '14px', lineHeight: '18px',
          color: '#00ff41', whiteSpace: 'pre',
          animation: `matrixFall ${c.duration}s linear ${c.delay}s infinite`,
        }}>
          {c.chars}
        </div>
      ))}
    </div>
  );
}

function DustParticles() {
  const dust = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 6,
      duration: Math.random() * 8 + 6,
    })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dust.map(d => (
        <div key={d.id} style={{
          position: 'absolute',
          left: `${d.left}%`,
          top: `${d.top}%`,
          width: d.size,
          height: d.size,
          borderRadius: '50%',
          background: 'rgba(255,200,150,0.3)',
          animation: `dustFloat ${d.duration}s ease-in-out ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function BubbleParticles() {
  const bubbles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 8,
      duration: Math.random() * 6 + 5,
    })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {bubbles.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: `${b.left}%`,
          bottom: '-5%',
          width: b.size,
          height: b.size,
          borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.15)',
          background: 'rgba(0,212,255,0.03)',
          animation: `bubbleRise ${b.duration}s ease-in ${b.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function EmberParticles() {
  const embers = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
    })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {embers.map(e => (
        <div key={e.id} style={{
          position: 'absolute',
          left: `${e.left}%`,
          bottom: '0%',
          width: e.size,
          height: e.size,
          borderRadius: '50%',
          background: '#ff4444',
          boxShadow: '0 0 4px #ff2222, 0 0 8px rgba(255,0,0,0.3)',
          animation: `emberRise ${e.duration}s ease-out ${e.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function ScanLines() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
    }} />
  );
}

const PARTICLE_MAP = {
  grid: () => <><GridEffect /><ScanLines /></>,
  matrix: () => <MatrixRain />,
  'grid-horizon': () => <GridHorizon />,
  dust: () => <DustParticles />,
  bubbles: () => <BubbleParticles />,
  stars: () => <Stars />,
  embers: () => <EmberParticles />,
};

export default function GameBackground() {
  const { theme } = useTheme();
  const cfg = BG_STYLES[theme] || BG_STYLES.cyberpunk;
  const ParticleComponent = PARTICLE_MAP[cfg.particles];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      background: cfg.gradient,
      transition: 'background 0.8s ease',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: cfg.overlay }} />
      {ParticleComponent && <ParticleComponent />}
    </div>
  );
}
