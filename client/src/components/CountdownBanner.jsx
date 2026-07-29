import { useEffect, useState } from 'react';
import { useLanguage } from '../LanguageContext';

function CountdownBanner() {
  const { t, language, setLanguage } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const currentDayUTC = now.getUTCDay();
      const currentHourUTC = now.getUTCHours();
      
      // We are looking for Sunday (0) 16:00:00 UTC (Which is Monday 00:00:00 Asia/Taipei)
      let daysUntilTarget = (0 - currentDayUTC + 7) % 7;
      if (daysUntilTarget === 0 && currentHourUTC >= 16) {
         daysUntilTarget = 7;
      }
      
      const nextTarget = new Date(now);
      nextTarget.setUTCDate(now.getUTCDate() + daysUntilTarget);
      nextTarget.setUTCHours(16, 0, 0, 0);
      
      const diff = nextTarget.getTime() - now.getTime();
      if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };

      return {
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      };
    };

    setTimeLeft(calcTime());
    const intv = setInterval(() => {
      setTimeLeft(calcTime());
    }, 1000);
    return () => clearInterval(intv);
  }, []);

  const format = (num) => num.toString().padStart(2, '0');

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(90deg, #1B2845, #274060, #335C81)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 20px',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      boxSizing: 'border-box',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      gap: '15px',
      flexWrap: 'wrap',
      flexShrink: 0
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: '600'}}>
        <span style={{color: '#ffcc00'}}>✧</span> 
        {t('每週任務結算 — 獲取 ')}<span style={{background: '#ed4245', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>{t('專屬身分組')}</span>{t(' | 距離結算剩餘:')}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '1rem'}}>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.d)}</div>
        <span>:</span>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.h)}</div>
        <span>:</span>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.m)}</div>
        <span>:</span>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.s)}</div>
      </div>
    </div>
  );
}

export default CountdownBanner;
