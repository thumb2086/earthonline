import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, X, User } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

export default function AccountInfoModal({ token, apiUrl, onClose, onLogout }) {
  const { t } = useLanguage();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingVerify, setIsSendingVerify] = useState(false);

  useEffect(() => {
    if (!apiUrl) return;
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError('伺服器連線失敗'));
  }, [token, apiUrl]);

  const handleGenerateKey = async () => {
    if (isGenerating || !apiUrl) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${apiUrl}/auth/generate-recovery-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(prev => ({ ...prev, recoveryKey: data.recoveryKey }));
        setShowKey(true);
      } else {
        alert(data.error || '生成失敗');
      }
    } catch (err) {
      alert('連線失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!apiUrl) return;
    const confirmText = prompt('警告：刪除帳號將會永久清除您的所有生存時間與榮譽點數，無法恢復！\n請輸入大寫的 DELETE 來確認刪除：');
    if (confirmText !== 'DELETE') return;
    try {
      const res = await fetch(`${apiUrl}/auth/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('您的帳號已經被永久刪除。');
        onClose();
        if (onLogout) onLogout();
      } else {
        alert(data.error || '刪除失敗');
      }
    } catch (err) {
      alert('連線失敗');
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleSendVerify = async () => {
    if (!info || !apiUrl) return;
    const targetEmail = info.email || emailInput;
    if (!targetEmail) return alert('請輸入電子郵件');
    setIsSendingVerify(true);
    try {
      const res = await fetch(`${apiUrl}/auth/send-verification`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ token, email: targetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        alert('驗證信已送出，請檢查您的信箱（包含垃圾信件匣）。');
        setInfo(prev => ({ ...prev, email: targetEmail, isEmailVerified: false }));
      } else {
        alert(data.error || '發送失敗');
      }
    } catch (err) {
      alert('連線失敗');
    }
    setIsSendingVerify(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        width: '480px', background: 'rgba(18, 20, 25, 0.95)', borderRadius: '16px', padding: '35px',
        border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'var(--font-sans)', color: 'var(--text-main)', position: 'relative'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-color)', fontSize: '1.4rem', fontWeight: '700'}}>
            <User size={22} color="#3b82f6" /> {t('帳號設定與安全')}
          </h2>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            {!window.electronAPI && (
              <a href={window.location.origin + "/downloads/EarthOnlineSetup.exe"} style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-color)', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px', fontWeight: '600'}}>
                {t('📥 下載專屬電腦版')}
              </a>
            )}
            <X size={20} style={{cursor: 'pointer', color: 'var(--text-dim)', transition: 'color 0.2s'}} onClick={onClose} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'} />
          </div>
        </div>
        
        {error ? <div style={{color: 'var(--danger-color)', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px'}}>{error}</div> : !info ? <div style={{color: 'var(--text-dim)', textAlign: 'center', padding: '30px 0'}}>{t('讀取帳戶資訊中...')}</div> : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('代號 (Subject ID)')}</span>
              <strong style={{color: 'var(--text-color)'}}>{info.username}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('連線建立日 (Joined)')}</span>
              <strong style={{color: 'var(--text-color)'}}>{new Date(info.createdAt).toLocaleDateString()}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('累積生存時間')}</span>
              <strong style={{color: 'var(--text-color)'}}>{(info.accumulatedTime / 3600).toFixed(1)} 小時</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('榮譽點數 (PT)')}</span>
              <strong style={{color: 'var(--info-color)'}}>{Number(info.accumulatedBonusPoints || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('Discord 通訊協定')}</span>
              <strong style={{color: info.discord && info.discord.username ? 'var(--info-color)' : 'var(--text-dim)'}}>
                {info.discord && info.discord.username ? info.discord.username : t('未綁定')}
              </strong>
            </div>
            <div style={{marginTop: '25px', padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', borderRadius: '0 8px 8px 0'}}>
              <div style={{color: 'var(--danger-color)', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <ShieldCheck size={18} /> {t('專屬恢復金鑰 (Recovery Key)')}
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.5'}}>
                {t('如果您遺失密碼，這是【唯一】能找回帳號的憑證，請妥善保管並勿洩漏給他人。')}
              </p>
              <div style={{display: 'flex', gap: '10px'}}>
                {info.recoveryKey === t('未產生') ? (
                  <button disabled={isGenerating} style={{flex: 1, padding: '10px', background: isGenerating ? 'var(--text-dim)' : 'var(--danger-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'background 0.2s'}} onClick={handleGenerateKey} onMouseOver={e => { if(!isGenerating) e.currentTarget.style.background = 'var(--danger-color)'; }} onMouseOut={e => { if(!isGenerating) e.currentTarget.style.background = 'var(--danger-color)'; }}>
                    {isGenerating ? t('生成中...') : t('生成專屬金鑰')}
                  </button>
                ) : (
                  <>
                    <input 
                      type={showKey ? "text" : "password"} 
                      value={info.recoveryKey} 
                      readOnly 
                      style={{flex: 1, letterSpacing: showKey ? '1px' : '3px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '6px', outline: 'none'}}
                    />
                    <button style={{padding: '0 15px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'}} onClick={() => setShowKey(!showKey)} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
                      {showKey ? t('隱藏') : t('顯示')}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{marginTop: '15px', padding: '20px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0'}}>
              <div style={{color: 'var(--success-color)', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <ShieldCheck size={18} /> {t('安全信箱綁定')}
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.5'}}>
                {t('綁定信箱可獲得額外的帳號保護，若遺失密碼可透過信箱快速找回。')}
              </p>
              {info.isEmailVerified ? (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)', background: 'rgba(16,185,129,0.1)', padding: '10px 15px', borderRadius: '6px'}}>
                  <CheckCircle size={16} /> <span style={{fontWeight: '500'}}>{t('已綁定：')}{info.email}</span>
                </div>
              ) : info.email ? (
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{color: 'var(--warning-color)', flex: 1, background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '6px'}}>{t('⏳ 等待驗證：')}{info.email}</span>
                  <button style={{padding: '10px 15px', background: 'var(--success-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}} onClick={handleSendVerify} disabled={isSendingVerify}>
                    {isSendingVerify ? t('發送中...') : t('重發驗證信')}
                  </button>
                </div>
              ) : (
                <div style={{display: 'flex', gap: '10px'}}>
                  <input 
                    type="email" 
                    placeholder={t('輸入電子郵件...')} 
                    value={emailInput} 
                    onChange={e => setEmailInput(e.target.value)} 
                    style={{flex: 1, background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px 15px', borderRadius: '6px', outline: 'none'}}
                  />
                  <button style={{padding: '0 20px', background: 'var(--success-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'}} onClick={handleSendVerify} disabled={isSendingVerify} onMouseOver={e => e.currentTarget.style.background = 'var(--success-color)'} onMouseOut={e => e.currentTarget.style.background = 'var(--success-color)'}>
                    {isSendingVerify ? t('發送中...') : t('綁定')}
                  </button>
                </div>
              )}
            </div>

            <div style={{marginTop: '25px', textAlign: 'center'}}>
              <button 
                style={{background: 'transparent', color: 'var(--text-dim)', border: 'none', padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s'}} 
                onClick={handleDeleteAccount}
                onMouseOver={e => e.currentTarget.style.color = 'var(--danger-color)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                {t('刪除帳號 (無法恢復)')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
