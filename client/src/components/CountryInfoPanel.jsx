import React from 'react';

export default function CountryInfoPanel({ country, onEstablish, onClose, hasMine }) {
  if (!country) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a2e', border: '2px solid #00ff41', padding: '24px',
        maxWidth: '360px', width: '90%', color: '#e2e8f0',
        boxShadow: '0 0 30px rgba(0,255,65,0.1)',
      }}>
        <h3 style={{ margin: '0 0 16px', color: country.color, fontSize: '1.1rem' }}>
          {country.icon || '🌍'} {country.name}
        </h3>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.6' }}>
          <div>在線節點：{country.online || '?'}</div>
          <div>GDP：{country.gdp?.toLocaleString() || '0'} PT/h</div>
          <div>進駐礦場：{country.mineCount || 0}</div>
        </div>
        {onEstablish && (
          <button onClick={onEstablish} style={{
            width: '100%', padding: '10px', background: 'rgba(0,255,65,0.15)',
            border: '1px solid #00ff41', color: '#00ff41', cursor: 'pointer',
            fontFamily: 'monospace', fontWeight: 'bold',
          }}>
            {hasMine ? '⛏️ 前往礦場' : '🚀 派遣至 ' + country.name}
          </button>
        )}
      </div>
    </div>
  );
}
