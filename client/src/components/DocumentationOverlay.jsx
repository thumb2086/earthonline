import { useState, useEffect } from 'react';
import { Database, X, Zap, Tornado, Coins, Satellite, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function DocumentationOverlay({ onClose }) {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pro-doc-overlay">
      <div className="pro-doc-header">
        <div className="pro-doc-logo">
          <Database size={16} color="var(--accent-color)" /> EARTH_ONLINE // MANIFEST_V1.0
        </div>
        <button onClick={onClose} className="pro-doc-close">
          ESC_CLOSE <X size={14} />
        </button>
      </div>

      <div className="pro-doc-body">
        
        <aside className="pro-doc-sidebar">
          <ul>
            <li className={activeSection === 'overview' ? 'active' : ''} onClick={() => scrollTo('overview')}>01. OVERVIEW</li>
            <li className={activeSection === 'architecture' ? 'active' : ''} onClick={() => scrollTo('architecture')}>02. ARCHITECTURE</li>
            <li className={activeSection === 'references' ? 'active' : ''} onClick={() => scrollTo('references')}>03. REFERENCES</li>
            <li className={activeSection === 'discord' ? 'active' : ''} onClick={() => scrollTo('discord')}>04. DISCORD RPC</li>
            <li className={activeSection === 'author' ? 'active' : ''} onClick={() => scrollTo('author')}>05. AUTHOR</li>
            <li className={activeSection === 'events' ? 'active' : ''} onClick={() => scrollTo('events')}>06. GLOBAL EVENTS</li>
            <li className={activeSection === 'changelog' ? 'active' : ''} onClick={() => scrollTo('changelog')}>07. CHANGELOG</li>
            <li className={activeSection === 'admin' ? 'active' : ''} onClick={() => scrollTo('admin')}>08. ADMIN CMDS</li>
          </ul>
        </aside>

        <main className="pro-doc-content">
          <section id="overview">
            <div className="doc-tag">CONCEPT_DOCUMENT</div>
            <h1 className="doc-title">Project Overview</h1>
            <p className="doc-lead">
              {t('「地球在線 (EARTH ONLINE)」是一個基於《三體》概念與賽博龐克美學啟發的實驗性全球網路觀測專案。')}
            </p>
            <div className="doc-text">
              {t('其核心理念在於將全球四散的網路節點（使用者）具象化為實體地理座標上的「觀測站」，並透過即時的雙向 WebSocket 通訊，建構出一個去中心化且具備高度同步性的虛擬拓樸網路。')}
            </div>
            <div className="doc-text">
              {t('本系統嘗試探討在高度資訊化的未來，人類個體如何作為巨型系統架構中的微小神經元運作。每一個登入的帳號，皆代表著為全球伺服器矩陣貢獻運算能力與觀測數據的終端節點。')}
            </div>
          </section>

          <section id="architecture">
            <div className="doc-tag">SYS_ARCHITECTURE</div>
            <h1 className="doc-title">Architecture & Data Files</h1>
            <div className="doc-grid">
              <div className="doc-grid-label">Client (前端)</div>
              <div className="doc-grid-value">{t('React 18, Vite, React-Leaflet (GIS即時渲染)')}</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Server (後端)</div>
              <div className="doc-grid-value">{t('Node.js, Express, Socket.IO (全雙工通訊廣播)')}</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Infrastructure</div>
              <div className="doc-grid-value">{t('Render 雲端運算節點、Cloudflare CDN 全球邊緣加速')}</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Mechanics</div>
              <div className="doc-grid-value">{t('全局掛機時間 (Global Production)、社會總壓迫常數 (Social Compression)')}</div>
            </div>
          </section>

          <section id="references">
            <div className="doc-tag">SOURCES</div>
            <h1 className="doc-title">Reference Sources</h1>
            <div className="doc-grid">
              <div className="doc-grid-label">{t('GIS 圖資')}</div>
              <div className="doc-grid-value">
                <a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noreferrer">Esri World Imagery</a>,{' '}
                <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">OpenStreetMap</a>,{' '}
                <a href="https://carto.com/basemaps/" target="_blank" rel="noreferrer">CartoDB Dark Matter</a>
              </div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">{t('3D 貼圖')}</div>
              <div className="doc-grid-value">
                <a href="https://globe.gl/" target="_blank" rel="noreferrer">ThreeGlobe</a> / NASA Blue Marble
              </div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">{t('API 代理')}</div>
              <div className="doc-grid-value">{t('dcdn.dstn.to (無認證 Discord 資料抓取)')}</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">{t('介面圖示')}</div>
              <div className="doc-grid-value">Lucide React</div>
            </div>
          </section>

          <section id="discord">
            <div className="doc-tag">FEATURE UPDATE</div>
            <h1 className="doc-title">{t('地球在線 - 桌面版客戶端 (Desktop App)')}</h1>
            <div className="doc-text">
{t('為了突破網頁瀏覽器的安全限制，讓玩家能自動在 Discord 上秀出「正在玩 地球在線」並顯示掛機生存時間，我們正式推出了<strong>「地球在線專屬桌面版」</strong>！<br/><br/>只要下載並開啟桌面版，系統就會在背景自動與您的 Discord 連動，無需任何手動設定！')}
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #5865F2' }}>
              <h3 style={{ color: 'var(--info-color)', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t('桌面版專屬功能')}
              </h3>
              <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                <li>{t('✅ <strong>全自動 RPC 連動</strong>：自動更改 Discord 狀態為「正在玩 地球在線」。')}</li>
                <li>{t('✅ <strong>生存時間計時器</strong>：Discord 狀態內建顯示您掛機了多久。')}</li>
                <li>{t('✅ <strong>沉浸式全螢幕體驗</strong>：無邊框、無瀏覽器網址列干擾。')}</li>
                <li>{t('✅ <strong>雙端資料互通</strong>：桌面版與網頁版資料完全同步，隨時切換無縫接軌。')}</li>
              </ul>
              
              <div style={{ marginTop: '25px' }}>
                <a 
                  href="https://github.com/huchialun9-ctrl/earthonline" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--info-color)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(88, 101, 242, 0.4)',
                    transition: 'all 0.3s'
                  }}
                >
                  {t('前往 GitHub 下載桌面版')}
                </a>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  {t('開發者請在專案根目錄下執行 <code>cd desktop && npm start</code> 啟動。')}
                </div>
              </div>
            </div>
          </section>

                    <section id="events">
            <div className="doc-tag">MECHANICS</div>
            <h1 className="doc-title">Global Events (全域事件指南)</h1>
            <div className="doc-text">
              {t('《地球在線》系統會隨機觸發全域事件，影響全體在線節點的生存點數結算。請隨時注意頂部橫幅的警告與提示。')}
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #00d2ff' }}>
              <h3 style={{ color: '#00d2ff', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={20} /> {t('量子爆發 (QUANTUM_BURST)')}</h3>
               <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>2 小時<br/><strong>影響效果：</strong>網路傳輸效能達到極致，所有節點的生存時間與點數累積速度大幅提升為 <strong>3.0 倍</strong>！這是快速累積資源的最佳時機。</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #ff416c' }}>
              <h3 style={{ color: '#ff416c', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Tornado size={20} /> {t('太陽風暴 (SOLAR_STORM)')}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>1 小時<br/><strong>影響效果：</strong>嚴重的干擾事件。在此期間內斷線的節點將被懲罰扣除 <strong>100 點</strong>生存點數。若能成功維持連線直到風暴結束，所有倖存節點將一次性獲得 <strong>200 點</strong>的生存獎勵金。</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #f8b500' }}>
              <h3 style={{ color: '#f8b500', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Coins size={20} /> {t('數據淘金潮 (DATA_GOLD_RUSH)')}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>15 分鐘<br/><strong>影響效果：</strong>極其罕見的短暫爆發期！在此期間，全伺服器點數累積速度將狂飆至 <strong>5.0 倍</strong>！把握這黃金的 15 分鐘！</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #38ef7d' }}>
              <h3 style={{ color: '#38ef7d', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Satellite size={20} /> {t('衛星連線最佳化 (SATELLITE_ALIGNMENT)')}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>2 小時<br/><strong>影響效果：</strong>系統開啟動態負載倍率。基礎倍率為 1.0x，伺服器中<strong>每多 1 位玩家在線，倍率就會額外增加 0.1x</strong>！也就是說，如果有 20 人同時在線，倍率將達到 3.0 倍！號召您的朋友一起上線吧！</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #8e9eab' }}>
              <h3 style={{ color: '#8e9eab', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} /> {t('系統維護模式 (SYSTEM_MAINTENANCE)')}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>30 分鐘<br/><strong>影響效果：</strong>主控台進行冷卻降頻，點數累積速度降為 <strong>0.5 倍</strong>。這是一場耐力賽，如果您選擇不下線並陪伴伺服器度過維護期，結束時系統將發放高達 <strong>500 點</strong>的補償獎勵！</p>
            </div>
          </section>

          <section id="author">
            <div className="doc-tag">CREDITS</div>
            <h1 className="doc-title">Developer Info</h1>
            <div className="doc-text">
              {t('本系統由獨立開發者進行架構設計、UI/UX 規劃與全端程式撰寫。')}
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Author</div>
              <div className="doc-grid-value">{t('胡家綸')} & {t('大拇哥科技')}</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Contact</div>
              <div className="doc-grid-value">
                <a href="mailto:huchialun97@gmail.com">huchialun97@gmail.com</a>
              </div>
            </div>
          </section>

          <section id="changelog">
            <div className="doc-tag">UPDATE_LOG</div>
            <h1 className="doc-title">v1.10 ~ v1.12 更新摘要</h1>
            <div className="doc-text" style={{ lineHeight: '1.8' }}>
              <strong>v1.10 — 經濟重塑</strong><br/>
              • 健康系統重設計：非線性 decay（生存越久 decay 越慢）<br/>
              • 離線恢復：每小時 +5% HP，上限 60%<br/>
              {'• 集體負載：同區 >20 人時 decay 遞增'}<br/>
              • 道具全面重平衡（新價格/效果）+ 2 新道具（網路加速器、備份節點）<br/>
              • 死亡狀態限制：死機只能買/用發電機<br/>
              • 節點升級系統（Lv.1~10）<br/>
              • 區域投資：冷卻/頻寬/防護罩<br/>
              • 排行榜賭注 /BET<br/><br/>

              <strong>v1.11 — 事件 & 目標</strong><br/>
              • 全域事件互動化：投票、事件中選擇、連鎖事件<br/>
              • 每日任務系統（在線/聊天/道具/bonus）<br/>
              • 成就里程碑系統（18 項成就）<br/>
              • 週結算 + 榮譽值系統<br/>
              • Discord 身份組自動發放<br/><br/>

              <strong>v1.12 — 深度新功能</strong><br/>
              • 離線收益系統（離線 3min = 1min 等效收益，每日上限 120min）<br/>
              • 天賦系統（3 系 × 4 天賦 × 3 級，Lv.10 解鎖）
            </div>
          </section>

          <section id="admin">
            <div className="doc-tag">TERMINAL_REFERENCE</div>
            <h1 className="doc-title">管理員終端機指令</h1>
            <div className="doc-text" style={{ lineHeight: '1.8' }}>
              按下 <code>`</code> 開啟終端機，輸入以下指令：<br/><br/>

              <strong>基本指令</strong><br/>
              <code>/HELP</code> — 顯示所有可用指令<br/>
              <code>/STATUS</code> — 顯示伺服器即時狀態<br/>
              <code>/PLAYERS</code> — 列出在線人數<br/><br/>

              <strong>管理員指令</strong><br/>
              <code>/MUTE {'<username>'} {'<minutes>'}</code> — 禁言玩家<br/>
              <code>/UNMUTE {'<username>'}</code> — 解除禁言<br/>
              <code>/DELETE_MSG {'<username>'}</code> — 刪除指定玩家最近訊息<br/>
              <code>/BAN {'<username>'} {'<minutes>'}</code> — 封鎖玩家<br/>
              <code>/UNBAN {'<username>'}</code> — 解除封鎖<br/>
              <code>/GIVE_PTS {'<username>'} {'<amount>'}</code> — 給予點數<br/>
              <code>/MASS_GIVE {'<amount>'}</code> — 批量給予所有在線玩家點數<br/>
              <code>/RESET_ALL</code> — 重置伺服器（謹慎使用）<br/>
              <code>/PAUSE</code> — 暫停/恢復遊戲 tick<br/>
              <code>/SET_MULTIPLIER {'<value>'}</code> — 設定全域倍率<br/>
              <code>/TRIGGER_EVENT {'<type>'}</code> — 手動觸發全域事件<br/><br/>

              <strong>一般玩家指令</strong><br/>
              <code>/INVEST {'<type>'} {'<amount>'}</code> — 投資區域基礎設施（cooling/bandwidth/shield）<br/>
              <code>/BET {'<amount>'}</code> — 下注本週區域排名<br/>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
