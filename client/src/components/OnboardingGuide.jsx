import { useState, useEffect } from 'react';

const STEPS = [
  { id: 'income', icon: '⬆️', title: '升級你的設備', desc: '點「升級」tab，升級電腦/伺服器提高每分鐘收入', check: (u) => (u?.levels?.computer || 0) + (u?.levels?.server || 0) + (u?.levels?.ai_assistant || 0) > 0 },
  { id: 'bank', icon: '🏦', title: '把錢存進銀行', desc: '點「銀行」tab，存錢進活存賺利息', check: (u) => (u?.savings || 0) > 0 },
  { id: 'invest', icon: '💼', title: '投資賺被動收入', desc: '點「投資」tab，從低風險的債券開始', check: (u) => (u?.investments?.length || 0) > 0 },
  { id: 'stock', icon: '📈', title: '買賣股票', desc: '點「交易」tab，挑一家看好的公司買入', check: (u) => (u?.stocks?.length || 0) > 0 },
  { id: 'lottery', icon: '🎱', title: '試試手氣', desc: '點「娛樂」tab，每天有 5 次免費樂透和刮刮樂', check: () => false },
  { id: 'login', icon: '📅', title: '每天記得登入', desc: '儀表板頂部可以領每日登入獎勵', check: () => false },
];

export default function OnboardingGuide({ user, collapsed, onCollapse }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('eo_onboard_dismissed') === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const completed = STEPS.filter(s => s.check(user)).length;
  const allDone = completed === STEPS.length;

  return (
    <div className="card mb-12" style={{ borderLeft: '3px solid #3b82f6' }}>
      <div className="flex justify-between items-center">
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          🎓 新手教學 <span className="text-dim" style={{ fontWeight: 400, fontSize: 12 }}>({completed}/{STEPS.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!allDone && <button className="btn btn-sm" onClick={onCollapse}>{collapsed ? '展開' : '收起'}</button>}
          <button className="btn btn-sm" onClick={() => { localStorage.setItem('eo_onboard_dismissed', '1'); setDismissed(true); }}>✕</button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 10 }}>
          {STEPS.map((s, i) => {
            const done = s.check(user);
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                opacity: done ? 0.5 : 1, textDecoration: done ? 'line-through' : 'none',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{done ? '✅' : s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                  <div className="text-dim" style={{ fontSize: 11 }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
          {allDone && (
            <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>
              🎉 全部完成！你已經準備好征服地球了！
            </div>
          )}
        </div>
      )}
    </div>
  );
}
