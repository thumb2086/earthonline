import re

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace GlobalEventBanner and getEventGlow
new_banner_code = """  // Global Event Banner Component
  const GlobalEventBanner = () => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      if (!currentEvent || !currentEvent.endTime) return;
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = currentEvent.endTime - now;
        if (diff <= 0) {
          setTimeLeft('即將結束...');
          return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 0) {
          setTimeLeft(`(結束倒數: ${hours}小時 ${minutes}分 ${seconds}秒)`);
        } else {
          setTimeLeft(`(結束倒數: ${minutes}分 ${seconds}秒)`);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [currentEvent]);

    if (!currentEvent) return null;
    
    let bgColor = '';
    let icon = '';
    let text = '';

    switch(currentEvent.type) {
      case 'QUANTUM_BURST':
        bgColor = 'linear-gradient(90deg, #00d2ff, #3a7bd5)';
        icon = '⚡';
        text = '【量子爆發】全伺服器點數累積速度 x 3.0 倍！';
        break;
      case 'SOLAR_STORM':
        bgColor = 'linear-gradient(90deg, #ff416c, #ff4b2b)';
        icon = '🌪️';
        text = '【太陽風暴】網路劇烈波動！期間斷線將扣除 100 點，撐過去可獲 200 點！';
        break;
      case 'DATA_GOLD_RUSH':
        bgColor = 'linear-gradient(90deg, #fceabb, #f8b500)';
        icon = '💰';
        text = '【數據淘金潮】短期爆發！全伺服器點數累積速度飆升至 5.0 倍！';
        break;
      case 'SATELLITE_ALIGNMENT':
        bgColor = 'linear-gradient(90deg, #11998e, #38ef7d)';
        icon = '🛰️';
        text = '【衛星連線最佳化】動態倍率啟動，在線人數越多產出越高！';
        break;
      case 'SYSTEM_MAINTENANCE':
        bgColor = 'linear-gradient(90deg, #8e9eab, #eef2f3)';
        icon = '⚠️';
        text = '【系統維護模式】算力降頻(0.5倍)，維持連線不斷線可獲補償獎勵！';
        break;
    }
      
    return (
      <div style={{
        width: '100%',
        background: bgColor,
        color: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? '#000' : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 20px',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        boxSizing: 'border-box',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        fontWeight: 'bold',
        fontSize: '1rem',
        textShadow: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
        animation: 'pulse 2s infinite'
      }}>
        <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>{icon}</span> {text} 
        <span style={{ marginLeft: '10px', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.9rem', color: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? '#000' : '#fff' }}>{timeLeft}</span>
      </div>
    );
  };

  const getEventGlow = () => {
    if (!currentEvent) return 'none';
    switch(currentEvent.type) {
      case 'QUANTUM_BURST': return 'inset 0 0 80px rgba(0, 210, 255, 0.4)';
      case 'SOLAR_STORM': return 'inset 0 0 80px rgba(255, 65, 108, 0.4)';
      case 'DATA_GOLD_RUSH': return 'inset 0 0 80px rgba(248, 181, 0, 0.4)';
      case 'SATELLITE_ALIGNMENT': return 'inset 0 0 80px rgba(56, 239, 125, 0.4)';
      case 'SYSTEM_MAINTENANCE': return 'inset 0 0 80px rgba(142, 158, 171, 0.4)';
      default: return 'none';
    }
  };"""

content = re.sub(r'  // Global Event Banner Component.*?  const getEventGlow = \(\) => \{.*?\n  \};\n', new_banner_code + '\n', content, flags=re.DOTALL)

# 2. Add 06. GLOBAL EVENTS to sidebar
content = content.replace("onClick={() => scrollTo('author')}>05. AUTHOR</li>", "onClick={() => scrollTo('author')}>05. AUTHOR</li>\n            <li className={activeSection === 'events' ? 'active' : ''} onClick={() => scrollTo('events')}>06. GLOBAL EVENTS</li>")

# 3. Add section to Documentation
events_section = """          <section id="events">
            <div className="doc-tag">MECHANICS</div>
            <h1 className="doc-title">Global Events (全域事件指南)</h1>
            <div className="doc-text">
              《地球在線》系統會隨機觸發全域事件，影響全體在線節點的生存點數結算。請隨時注意頂部橫幅的警告與提示。
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #00d2ff' }}>
              <h3 style={{ color: '#00d2ff', marginTop: 0, marginBottom: '10px' }}>⚡ 量子爆發 (QUANTUM_BURST)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>2 小時<br/><strong>影響效果：</strong>網路傳輸效能達到極致，所有節點的生存時間與點數累積速度大幅提升為 <strong>3.0 倍</strong>！這是快速累積資源的最佳時機。</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #ff416c' }}>
              <h3 style={{ color: '#ff416c', marginTop: 0, marginBottom: '10px' }}>🌪️ 太陽風暴 (SOLAR_STORM)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>1 小時<br/><strong>影響效果：</strong>嚴重的干擾事件。在此期間內斷線的節點將被懲罰扣除 <strong>100 點</strong>生存點數。若能成功維持連線直到風暴結束，所有倖存節點將一次性獲得 <strong>200 點</strong>的生存獎勵金。</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #f8b500' }}>
              <h3 style={{ color: '#f8b500', marginTop: 0, marginBottom: '10px' }}>💰 數據淘金潮 (DATA_GOLD_RUSH)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>15 分鐘<br/><strong>影響效果：</strong>極其罕見的短暫爆發期！在此期間，全伺服器點數累積速度將狂飆至 <strong>5.0 倍</strong>！把握這黃金的 15 分鐘！</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #38ef7d' }}>
              <h3 style={{ color: '#38ef7d', marginTop: 0, marginBottom: '10px' }}>🛰️ 衛星連線最佳化 (SATELLITE_ALIGNMENT)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>2 小時<br/><strong>影響效果：</strong>系統開啟動態負載倍率。基礎倍率為 1.0x，伺服器中<strong>每多 1 位玩家在線，倍率就會額外增加 0.1x</strong>！也就是說，如果有 20 人同時在線，倍率將達到 3.0 倍！號召您的朋友一起上線吧！</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #8e9eab' }}>
              <h3 style={{ color: '#8e9eab', marginTop: 0, marginBottom: '10px' }}>⚠️ 系統維護模式 (SYSTEM_MAINTENANCE)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>30 分鐘<br/><strong>影響效果：</strong>主控台進行冷卻降頻，點數累積速度降為 <strong>0.5 倍</strong>。這是一場耐力賽，如果您選擇不下線並陪伴伺服器度過維護期，結束時系統將發放高達 <strong>500 點</strong>的補償獎勵！</p>
            </div>
          </section>

          <section id="author">"""

content = content.replace('<section id="author">', events_section)

with open('client/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
