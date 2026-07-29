import React from 'react';

export default function PixelWordArt({ text, size = 32, color = '#00ff41', depth = 4, shadowColor, className, style }) {
  const shadow = shadowColor || color;
  const shadows = [];
  for (let i = 1; i <= depth; i++) {
    shadows.push(`${i * 2}px ${i * 2}px 0 ${shadow}`);
  }
  shadows.push(`0 0 ${size * 0.3}px ${color}`);
  shadows.push(`0 0 ${size * 0.6}px ${color}`);

  return (
    <span className={className} style={{
      display: 'inline-block',
      fontFamily: '"MadouFMG", monospace',
      fontSize: size,
      fontWeight: 'bold',
      color: '#fff',
      textShadow: shadows.join(', '),
      letterSpacing: '2px',
      imageRendering: 'pixelated',
      ...style,
    }}>
      {text}
    </span>
  );
}
