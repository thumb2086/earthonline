import React, { useState } from 'react';
import PixelWordArt from './PixelWordArt';

const STEPS = [
  {
    title: '🌐 全球節點網路',
    desc: '您的伺服器是地球在線全球網路中的一個節點。維持健康度、累積 PT，成為最強大的節點。',
  },
  {
    title: '❤️ 健康度管理',
    desc: '健康度會隨時間自然衰減，歸零即死機。使用道具、防火牆或備份節點來延續生存。',
  },
  {
    title: '💎 PT 經濟系統',
    desc: '掛機產生 PT，可在黑市購買道具。參與全域事件可獲得額外 PT 獎勵。',
  },
  {
    title: '👥 社交與陣營',
    desc: '與其他節點交流、加好友、私訊。未來可選擇陣營，參與區域對抗。',
  },
  {
    title: '🎮 快捷操作',
    desc: '按 ESC 開啟系統選單。F 全螢幕，M 靜音。右上方選單可切換主題與設定。',
  },
];

export default function OnboardingGuide({ onClose }) {
  const [step, setStep] = useState(0);

  const current = STEPS[step];

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a2e', border: '2px solid #00ff41', padding: '30px',
        maxWidth: '420px', width: '90%', borderRadius: '0',
        boxShadow: '0 0 40px rgba(0,255,65,0.15)',
        color: '#e2e8f0',
      }}>
        <div style={{ marginBottom: '20px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
          {step + 1} / {STEPS.length}
        </div>

        <div style={{ fontSize: '1.1rem', marginBottom: '12px', textAlign: 'center', minHeight: '60px' }}>
          {current.title}
        </div>

        <div style={{
          fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px',
          background: 'rgba(0,0,0,0.3)', padding: '16px', borderLeft: '3px solid #00ff41',
        }}>
          {current.desc}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{
              padding: '8px 20px', background: step === 0 ? 'transparent' : 'rgba(0,255,65,0.1)',
              border: '1px solid rgba(0,255,65,0.3)', color: step === 0 ? '#334155' : '#00ff41',
              cursor: step === 0 ? 'default' : 'pointer', fontFamily: 'monospace',
            }}
          >
            ← 上一步
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              style={{
                padding: '8px 20px', background: 'rgba(0,255,65,0.15)',
                border: '1px solid #00ff41', color: '#00ff41', cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              下一步 →
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', background: '#00ff41', border: 'none',
                color: '#000', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace',
              }}
            >
              開始遊戲
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
