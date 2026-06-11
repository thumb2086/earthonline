import { useEffect, useState, useRef } from 'react';
import { Globe2, Activity, User, Link as LinkIcon, ShieldCheck, Shield, Info, Database, X, Star, Clock, Volume2, VolumeX, Coffee, Users, ChevronDown, Zap, Tornado, Coins, Satellite, Settings, AlertTriangle, CheckCircle, MapPin, Monitor, ShoppingCart, Palette, Trophy } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import Draggable from 'react-draggable';
import DataCenterVisualizer from './DataCenterVisualizer';
import ShopModal from './ShopModal';
import BackpackModal from './BackpackModal';
import LeaderboardModal from './components/Modals/LeaderboardModal';
import Console from './components/Dashboard/Console';
import { GameProvider, useGame } from './context/GameContext';
import CountdownBanner from './components/CountdownBanner';
import DonateBanner from './components/DonateBanner';
import LoginGateway from './components/LoginGateway';
import FourPetalSpiral from './components/FourPetalSpiral';
import './index.css';

const VITE_API = import.meta.env.VITE_API_URL || 'https://earthonline.onrender.com';



function DocumentationOverlay({ onClose }) {
  const { t, language, setLanguage } = useLanguage();
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




function Dashboard({ token, onLogout, region }) {
  const { t, language, setLanguage } = useLanguage();
  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
  const API_URL = `${BASE_URL}/api/${region}`;
  const SOCKET_URL = BASE_URL;
  const game = useGame();
  const { socket, isConnected, ping, nodes, myNode, setMyNode, myRole, globalStats, hubStats, leaderboard, currentEvent, lifespan, sessionTime, logs, addLog } = game;
  const [eventVote, setEventVote] = useState(null); // { options, endTime }
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTarget, setAdminTarget] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allPlayersList, setAllPlayersList] = useState([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [adminPlayerFilter, setAdminPlayerFilter] = useState('all');
  const [showAdRevive, setShowAdRevive] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [adReviveRemaining, setAdReviveRemaining] = useState(3);
  const [currentAd, setCurrentAd] = useState('');
  const [adPlaying, setAdPlaying] = useState(false);
  const [adSlogan, setAdSlogan] = useState('');
  // 管理員面板開啟時自動載入全部玩家名單
  useEffect(() => {
    if (showAdminPanel && socket?.connected) {
      socket.emit('get_all_players');
    }
  }, [showAdminPanel, socket]);

  const [show100Celebration, setShow100Celebration] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showManualBind, setShowManualBind] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementData, setAchievementData] = useState({ unlocked: [], total: 0, all: [] });
  const [showTalentModal, setShowTalentModal] = useState(false);
  const [talentData, setTalentData] = useState({ points: 0, spent: 0, talents: {}, all: {} });
  const [showWarPanel, setShowWarPanel] = useState(false);
  const [warStats, setWarStats] = useState(null);
  const [discordId, setDiscordId] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null); // { message, type } for non-blocking notifications
  const toastTimerRef = useRef(null);
  const { theme, setTheme, themeData: currentThemeData, themes } = useTheme();
  
  const pingStartRef = useRef(0);
  const [socialTab, setSocialTab] = useState('friends'); // 'friends', 'all', 'requests'
  const [socialData, setSocialData] = useState({ allPlayers: [], friends: [], friendRequests: [] });
  const [sortMode, setSortMode] = useState('points');

  // Ref for react-draggable
  const [bgmEnabled, setBgmEnabled] = useState(() => {
    const saved = localStorage.getItem('eo_bgm');
    return saved === null ? true : saved === 'true';
  });
  const audioRef = useRef(null);

  const toggleBgm = () => {
    const newVal = !bgmEnabled;
    setBgmEnabled(newVal);
    localStorage.setItem('eo_bgm', String(newVal));
    if (audioRef.current) {
      if (newVal) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  };

  const audioCtxRef = useRef(null);
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    const val = localStorage.getItem('eo_notifications');
    return val === null ? true : val === 'true';
  });
  const [bgStyle, setBgStyle] = useState(() => localStorage.getItem('eo_bg_style') || 'globe');
  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  };
  const playBeep = (freq = 800, duration = 100, type = 'sine') => {
    if (!notificationEnabled) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch(e) {}
  };

  const [pmTarget, setPmTarget] = useState(null);
  const [pmInput, setPmInput] = useState('');
  const [pmLog, setPmLog] = useState({});
  const [showPm, setShowPm] = useState(false);
  const pmTargetRef = useRef(null);
  const showPmRef = useRef(false);

  useEffect(() => {
    pmTargetRef.current = pmTarget;
    showPmRef.current = showPm;
  }, [pmTarget, showPm]);

  useEffect(() => {
    if (audioRef.current && bgmEnabled) {
      audioRef.current.volume = 0.2;
      audioRef.current.play().catch(() => setBgmEnabled(false));
    }
  }, [bgmEnabled]);

  // Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState(['Earth Online Terminal v1.0.1', 'Type "help" for a list of available commands.']);
  const [terminalInput, setTerminalInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const terminalEndRef = useRef(null);
  const logEndRef = useRef(null);
  const dropdownRef = useRef(null);
  // #11: 廣告計時器 ref，用於 cleanup
  const adTimerRef = useRef(null);
  const adSloganTimerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keydown listener for Terminal + Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (showLeaderboard) setShowLeaderboard(false);
        else if (showDiscordModal) setShowDiscordModal(false);
        else if (showAboutModal) setShowAboutModal(false);
        else if (showSocialModal) setShowSocialModal(false);
        else if (showShopModal) setShowShopModal(false);
        else if (showBackpack) setShowBackpack(false);
        else if (showAccountInfo) setShowAccountInfo(false);
        else if (showThemeMenu) setShowThemeMenu(false);
        else if (showAdminPanel) setShowAdminPanel(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showLeaderboard, showDiscordModal, showAboutModal, showSocialModal, showShopModal, showAccountInfo, showThemeMenu, showAdminPanel, showBackpack]);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, isTerminalOpen]);

  // Scroll chat/log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Fetch online users when admin panel opens
  useEffect(() => {
    if (showAdminPanel && socket) {
      socket.emit('get_online_users');
    }
  }, [showAdminPanel, socket]);

  // Fetch social data when modal opens
  useEffect(() => {
    if (showSocialModal && socket) {
      socket.emit('get_social_data');
    }
  }, [showSocialModal, socket]);

  const [boundDiscord, setBoundDiscord] = useState(null);

  const handleBindDiscord = (e) => {
    e.preventDefault();
    const statePayload = btoa(JSON.stringify({ token, returnTo: window.location.origin }));
    const BACKEND_DOMAIN = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).origin : 'https://earthonline.onrender.com';
    const discordOAuthUrl = `${BACKEND_DOMAIN}/api/auth/discord?state=${statePayload}`;
    window.location.href = discordOAuthUrl;
  };

  const handleBindDiscordManual = async (e) => {
    e.preventDefault();
    if (!discordId) return;
    
    if (!/^\d{17,20}$/.test(discordId)) {
      alert('請輸入您的 Discord「使用者 ID」(17~20碼數字)！');
      return;
    }

    try {
      addLog(`[SYS] 嘗試手動綁定 Discord ID: ${discordId}...`);
      const res = await fetch(`${API_URL}/bind-discord-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, discordId })
      });
      if (res.ok) {
        setBoundDiscord({
          username: discordId,
          avatar: `https://cdn.discordapp.com/embed/avatars/${(BigInt(discordId) >> 22n) % 6n}.png`
        });
        setShowDiscordModal(false);
        addLog(`系統通知：手動綁定成功！`);
      }
    } catch (err) {
      alert('綁定失敗');
    }
  };

  // Register socket event listeners (connection + auth handled by useSocket)
  useEffect(() => {
    if (!socket) return;
    const s = socket;

    addLog(t('驗證金鑰已發送，等待授權...'));
    s.on('auth_error', (data) => {
      const msg = data?.message || t('授權已過期，請重新登入');
      addLog(`[SYSTEM] ${msg}`);
      alert(msg);
      setIsConnected(false);
      onLogout();
    });

    s.on('init_data', async (data) => {
      addLog(`身分確認：節點 [${data.username}] 成功接入全球網路`);
      if (data.discordProfile && data.discordProfile.id) {
        setBoundDiscord({ username: data.discordProfile.username, avatar: data.discordProfile.avatar });
      } else {
        setBoundDiscord(null);
      }
      s.emit('get_achievements');
    });
    s.on('achievement_data', (data) => {
      setAchievementData(data);
    });
    s.on('talent_data', (data) => {
      setTalentData(data);
    });
    s.on('war_stats', (data) => {
      setWarStats(data);
    });

    s.on('terminal_response', (msg) => {
      // #1: 限制 terminalHistory 上限 100 條
      setTerminalHistory(prev => [...prev, msg].slice(-100));
    });

    s.on('global_broadcast', (data) => {
      setTerminalHistory(prev => [...prev, `[BROADCAST] ${data.username}: ${data.message}`].slice(-100));
      addLog(`[CHAT] ${data.username}: ${data.message}`);
    });

    s.on('chat_message', (data) => {
      const adminBadge = data.isAdmin ? ' [管理員]' : '';
      if (data.isDiscord) {
        addLog(`[DC_CHAT] ${data.username}: ${data.message}`);
      } else {
        addLog(`[CHAT]${adminBadge} ${data.username}: ${data.message}`);
      }
      playBeep(1000, 80);
    });

    s.on('social_data', (data) => {
      setSocialData(data);
    });

    s.on('social_data_updated', () => {
      s.emit('get_social_data');
    });

    s.on('friend_online', (data) => {
      addLog(`[SYSTEM] 好友 ${data.username} 上線了！`);
      playBeep(660, 120);
      setTimeout(() => playBeep(880, 120), 140);
    });

    s.on('friend_offline', (data) => {
      addLog(`[SYSTEM] 好友 ${data.username} 離線了`);
    });

    s.on('private_message', (data) => {
      const msg = { from: data.from, text: data.message, time: new Date().toISOString().substring(11, 19), incoming: true };
      setPmLog(prev => ({
        ...prev,
        [data.from]: [...(prev[data.from] || []), msg],
      }));
      addLog(`[PM] ${data.from}: ${data.message}`);
      playBeep(1100, 60);
      if (!showPmRef.current || pmTargetRef.current !== data.from) {
        addLog(`[SYSTEM] 收到來自 ${data.from} 的私訊！`);
      }
    });

    s.on('friend_request_received', (data) => {
      addLog(`[SYSTEM] 收到來自 ${data.from} 的好友邀請！`);
      playBeep(880, 150);
      setTimeout(() => playBeep(1100, 150), 170);
      s.emit('get_social_data');
    });

    s.on('node_connected', (node) => {
      addLog(`警告：偵測到新物理節點活動於座標 [${node.lat.toFixed(2)}, ${node.lon.toFixed(2)}]`);
    });

    s.on('node_disconnected', () => {
      addLog(`通知：節點連線中斷，正在重新計算社會總壓迫常數`);
    });
    
    s.on('all_players_list', (list) => {
      setAllPlayersList(list || []);
    });

    const showToast = (msg, type) => {
      setToast({ message: msg, type });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 5000);
    };

    s.on('buy_result', (data) => {
      if (data.success) {
        addLog(`[SYSTEM] ${data.message}`);
        showToast(data.message, 'success');
        if (data.inventory) {
          setMyNode(prev => prev ? { ...prev, inventory: data.inventory } : prev);
        }
      } else {
        addLog(`[SYSTEM] ⚠️ ${data.message}`);
      }
    });

    s.on('use_item_result', (data) => {
      if (data.success) {
        addLog(`[SYSTEM] ${data.message}`);
        showToast(data.message, 'success');
      } else {
        addLog(`[SYSTEM] ⚠️ ${data.message}`);
      }
    });

    s.on('chat_muted', (data) => {
      addLog(`[SYSTEM] ${data.message}`);
      alert(data.message);
    });

    s.on('chat_banned', (data) => {
      addLog(`[SYSTEM] ${data.message}`);
      alert(data.message);
    });

    s.on('chat_message_deleted', (data) => {
      setLogs(prev => {
        let updated = prev;
        if (data.targetUsername) {
          updated = updated.filter(l => !l.text?.includes(` ${data.targetUsername}: `));
        }
        const time = new Date().toISOString().substring(11, 19);
        updated = [...updated, { text: `[MOD] 管理員 ${data.modUsername} 刪除了一則訊息`, time }];
        if (updated.length > 200) updated = updated.slice(-200);
        return updated;
      });
    });

    s.on('chat_system_message', (data) => {
      addLog(data.message);
    });

    s.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    s.on('ad_revive_result', (data) => {
      setAdPlaying(false);
      if (data.success) {
        addLog(`[SYSTEM] 廣告復活成功！伺服器健康度恢復至 ${data.health}%（今日剩餘 ${data.remaining} 次）`);
        setAdReviveRemaining(data.remaining);
        setShowAdRevive(false);
      } else {
        addLog(`[SYSTEM] 廣告復活失敗：${data.message}`);
      }
    });

    s.on('chat_verification_required', (data) => {
      addLog(`[SYSTEM] ⚠️ ${data.message}`);
      alert('⚠️ ' + data.message);
    });

    return () => {
      if (adTimerRef?.current) clearInterval(adTimerRef.current);
      if (adSloganTimerRef?.current) clearInterval(adSloganTimerRef.current);
      s.removeAllListeners();
    };
  }, [socket]);

  // Format time HH:MM:SS
  const formatTime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`;
  };

  const calculateHealthPercentage = (seconds) => {
    return myNode?.health !== undefined ? myNode.health : 100;
  };

  // Render nodes directly as dots without clustering


  // Global Event Banner Component
  const GlobalEventBanner = () => {
  const { t, language, setLanguage } = useLanguage();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      if (!currentEvent || !currentEvent.endTime) return;
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = currentEvent.endTime - now;
        if (diff <= 0) {
          setTimeLeft(t('即將結束...'));
          return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 0) {
          setTimeLeft(`${t('結束倒數: ')}${hours}${t('小時')}${minutes}${t('分')}${seconds}${t('秒')}`);
        } else {
          setTimeLeft(`${t('結束倒數: ')}${minutes}${t('分')}${seconds}${t('秒')}`);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [currentEvent]);

    if (!currentEvent && !eventVote) return null;

    // Show vote banner
    if (eventVote && !currentEvent) {
      const voteEnd = new Date(eventVote.endTime).toLocaleTimeString();
      return (
        <div style={{
          width: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 20px', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0, gap: '15px', flexWrap: 'wrap'
        }}>
          <span>{t('事件投票進行中！剩餘時間 ')}{(eventVote.options||[]).length}{t('選項')}</span>
          {eventVote.options?.map(opt => (
            <button key={opt} onClick={() => socket?.emit('event_vote', { event: opt })} style={{
              padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
            }}>{opt.replace(/_/g, ' ')}</button>
          ))}
        </div>
      );
    }

    let bgColor = '';
    let icon = '';
    let text = '';

    switch(currentEvent.type) {
      case 'QUANTUM_BURST':
        bgColor = 'linear-gradient(90deg, #00d2ff, #3a7bd5)';
        icon = <Zap size={18} />;
        text = t('【量子爆發】全伺服器點數累積速度 x 3.0 倍！');
        break;
      case 'SOLAR_STORM':
        bgColor = 'linear-gradient(90deg, #ff416c, #ff4b2b)';
        icon = <Tornado size={18} />;
        text = t('【太陽風暴】網路劇烈波動！期間斷線將扣除 100 點，撐過去可獲 200 點！');
        break;
      case 'DATA_GOLD_RUSH':
        bgColor = 'linear-gradient(90deg, #fceabb, #f8b500)';
        icon = <Coins size={18} />;
        text = t('【數據淘金潮】短期爆發！全伺服器點數累積速度飆升至 5.0 倍！');
        break;
      case 'SATELLITE_ALIGNMENT':
        bgColor = 'linear-gradient(90deg, #11998e, #38ef7d)';
        icon = <Satellite size={18} />;
        text = t('【衛星連線最佳化】動態倍率啟動，在線人數越多產出越高！');
        break;
      case 'SYSTEM_MAINTENANCE':
        bgColor = 'linear-gradient(90deg, #8e9eab, #eef2f3)';
        icon = <AlertTriangle size={18} />;
        text = t('【系統維護模式】算力降頻(0.5倍)，維持連線不斷線可獲補償獎勵！');
        break;
      case 'DATA_BLACK_MARKET':
        bgColor = 'linear-gradient(90deg, #667eea, #764ba2)';
        icon = <Coins size={18} />;
        text = t('【數據黑市】稀有事件！限時 5 分鐘，可用 PT 兌換稀有道具！');
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
        animation: 'pulse 2s infinite',
        flexShrink: 0
      }}>
        <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>{icon}</span> {text} 
        <span style={{ marginLeft: '10px', background: 'var(--bg-light)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.9rem', color: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? '#000' : '#fff' }}>{timeLeft}</span>
        {currentEvent.type === 'SOLAR_STORM' && (
          <>
            <button onClick={() => socket?.emit('event_choice', { choice: 'shelter' })} style={{marginLeft:'10px', padding:'4px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', fontWeight:'bold', fontSize:'0.85rem'}}>{t('避難(-50PT)')}</button>
            <button onClick={() => socket?.emit('event_choice', { choice: 'ride_out' })} style={{padding:'4px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,100,100,0.3)', color:'#fff', cursor:'pointer', fontWeight:'bold', fontSize:'0.85rem'}}>{t('硬撐(+400PT -15%HP)')}</button>
          </>
        )}
        {currentEvent.type === 'SYSTEM_MAINTENANCE' && (
          <>
            <button onClick={() => socket?.emit('event_choice', { choice: 'assist' })} style={{marginLeft:'10px', padding:'4px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.4)', background:'rgba(100,200,255,0.2)', color:'#fff', cursor:'pointer', fontWeight:'bold', fontSize:'0.85rem'}}>{t('協助(-100PT,縮短時間)')}</button>
            <button onClick={() => socket?.emit('event_choice', { choice: 'ignore' })} style={{padding:'4px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.1)', color:'#fff', cursor:'pointer', fontWeight:'bold', fontSize:'0.85rem'}}>{t('漠視(+500PT)')}</button>
          </>
        )}
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
      case 'DATA_BLACK_MARKET': return 'inset 0 0 80px rgba(118, 75, 162, 0.4)';
      default: return 'none';
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send_chat', { message: chatInput });
    setChatInput('');
  };

  const handleSendPm = (e) => {
    e.preventDefault();
    if (!pmTarget || !pmInput.trim() || !socket) return;
    socket.emit('send_private_message', { targetUsername: pmTarget, message: pmInput });
    const msg = { from: '我', text: pmInput, time: new Date().toISOString().substring(11, 19), incoming: false };
    setPmLog(prev => ({
      ...prev,
      [pmTarget]: [...(prev[pmTarget] || []), msg],
    }));
    setPmInput('');
  };

  const handleAdminMute = () => {
    if (!socket || !adminTarget.trim()) return;
    const duration = parseInt(document.getElementById('muteDuration')?.value || '5', 10);
    socket.emit('mod_mute_user', { targetUsername: adminTarget.trim(), duration });
    addLog(`[MOD] 發出禁言指令：${adminTarget.trim()} ${duration} 分鐘`);
    setTimeout(() => socket.emit('get_all_players'), 300);
  };

  const handleAdminUnmute = () => {
    if (!socket || !adminTarget.trim()) return;
    socket.emit('mod_unmute_user', { targetUsername: adminTarget.trim() });
    addLog(`[MOD] 發出解禁指令：${adminTarget.trim()}`);
    setTimeout(() => socket.emit('get_all_players'), 300);
  };

  const handleAdminDelete = () => {
    if (!socket || !adminTarget.trim()) return;
    socket.emit('mod_delete_message', { messageId: Date.now().toString(), targetUsername: adminTarget.trim() });
    addLog(`[MOD] 發出刪除訊息指令：${adminTarget.trim()}`);
  };

  const handleAdminBan = () => {
    if (!socket || !adminTarget.trim()) return;
    const duration = parseInt(document.getElementById('banDuration')?.value || '1440', 10);
    socket.emit('mod_ban_user', { targetUsername: adminTarget.trim(), duration });
    addLog(`[MOD] 發出封鎖指令：${adminTarget.trim()} ${duration} 分鐘`);
    setTimeout(() => socket.emit('get_all_players'), 300);
  };

  const handleAdminUnban = () => {
    if (!socket || !adminTarget.trim()) return;
    socket.emit('mod_unban_user', { targetUsername: adminTarget.trim() });
    addLog(`[MOD] 發出解除封鎖指令：${adminTarget.trim()}`);
    setTimeout(() => socket.emit('get_all_players'), 300);
  };

  const [adminPtsAmount, setAdminPtsAmount] = useState(0);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  const handleAdminAddPts = () => {
    if (!socket || !adminTarget.trim() || adminPtsAmount <= 0) return;
    socket.emit('mod_add_pts', { targetUsername: adminTarget.trim(), amount: adminPtsAmount });
    addLog(`[MOD] 給予 ${adminTarget.trim()} ${adminPtsAmount} PT`);
    setTimeout(() => socket.emit('get_all_players'), 300);
    setAdminPtsAmount(0);
  };

  const handleAdminMassAddPts = () => {
    if (!socket || selectedPlayers.size === 0 || adminPtsAmount <= 0) return;
    const targets = [...selectedPlayers];
    targets.forEach(username => {
      socket.emit('mod_add_pts', { targetUsername: username, amount: adminPtsAmount });
    });
    addLog(`[MOD] 批量給予 ${targets.length} 位成員各 ${adminPtsAmount} PT (${targets.join(', ')})`);
    setTimeout(() => socket.emit('get_all_players'), 500);
    setSelectedPlayers(new Set());
    setAdminPtsAmount(0);
  };

  const handleStartAdRevive = () => {
    if (!socket || adReviveRemaining <= 0 || adPlaying) return;
    setAdPlaying(true);
    const ads = ['/ads/zixi_casino.png', '/ads/zixi_app.png'];
    setCurrentAd(ads[Math.floor(Math.random() * ads.length)]);
    setAdSlogan(AD_SLOGANS[0]);
    setAdCountdown(15);
    let sloganIdx = 0;

    // #11: 清除舊計時器（防止重複啟動）
    if (adTimerRef.current) clearInterval(adTimerRef.current);
    if (adSloganTimerRef.current) clearInterval(adSloganTimerRef.current);

    adTimerRef.current = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          clearInterval(adTimerRef.current);
          clearInterval(adSloganTimerRef.current);
          adTimerRef.current = null;
          adSloganTimerRef.current = null;
          socket.emit('ad_revive');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    adSloganTimerRef.current = setInterval(() => {
      sloganIdx = (sloganIdx + 1) % AD_SLOGANS.length;
      setAdSlogan(AD_SLOGANS[sloganIdx]);
    }, 2500);
  };

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    
    const cmd = terminalInput.trim();
    // #1: 鍵入指令時也限制上限
    setTerminalHistory(prev => [...prev, `> ${cmd}`].slice(-100));
    setTerminalInput('');

    const lowerCmd = cmd.toLowerCase();
    if (lowerCmd === 'help') {
      setTerminalHistory(prev => [...prev, 'Available commands: help, ping, whoami, clear, sysinfo, broadcast <msg>'].slice(-100));
    } else if (lowerCmd === 'ping') {
      setTerminalHistory(prev => [...prev, 'Pong! Latency: 12ms'].slice(-100));
    } else if (lowerCmd === 'whoami') {
      setTerminalHistory(prev => [...prev, `Node Identity: ${myNode?.username || 'UNKNOWN'}`].slice(-100));
    } else if (lowerCmd === 'clear') {
      setTerminalHistory([]);
    } else if (lowerCmd === 'sysinfo') {
      setTerminalHistory(prev => [...prev, 'Earth Online Core - 256TB Quantum RAM, Geo-Distributed Matrix Active.'].slice(-100));
    } else {
      // Forward to backend for secret codes
      if (socket) {
        socket.emit('terminal_command', { command: cmd });
      } else {
        setTerminalHistory(prev => [...prev, '[ERROR] NOT CONNECTED TO CORE.'].slice(-100));
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" loop preload="auto" />
      {!myNode ? (
        <FourPetalSpiral text={t('正在連線至全球節點網路...')} />
      ) : (
    <div className="app-container" style={{
      boxShadow: [
        getEventGlow(),
        myNode?.cosmetics?.neon_strip ? 'inset 0 0 60px rgba(255,0,255,0.12), 0 0 30px rgba(255,0,255,0.08)' : ''
      ].filter(Boolean).join(', ') || 'none',
      transition: 'box-shadow 1s ease-in-out'
    }}>
      {show100Celebration && (
        <div className="celebration-overlay">
          <div className="celebration-emoji">🎉</div>
          <div className="celebration-text">{t('伺服器達成 100 人里程碑！')}</div>
        </div>
      )}
      {/* Terminal Overlay */}
      {isTerminalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '50vh',
          background: 'rgba(0, 0, 0, 0.9)', borderBottom: '2px solid #0f0',
          color: '#0f0', fontFamily: 'monospace', padding: '20px', zIndex: 9999,
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
        }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
            {terminalHistory.map((line, i) => (
              <div key={i} style={{ wordBreak: 'break-all', marginBottom: '4px' }}>{line}</div>
            ))}
            <div ref={terminalEndRef} />
          </div>
          <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '10px' }}>
            <span>&gt;</span>
            <input 
              type="text" 
              value={terminalInput}
              onChange={e => setTerminalInput(e.target.value)}
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', color: '#0f0', 
                fontFamily: 'monospace', outline: 'none', fontSize: '1rem'
              }}
            />
          </form>
        </div>
      )}


      <CountdownBanner />
      <GlobalEventBanner />
      {/* Header Panel */}
      <header className="system-header">
        <div className="system-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe2 color="#3b82f6" size={24} /> 
          <span style={{fontWeight: '900', fontSize: '1.3rem', letterSpacing: '0'}}>{t('地球在線')}</span> 
          <span style={{color: '#64748b', fontSize: '0.9rem', marginLeft: '10px'}}>{t('伺服器')}: {region.toUpperCase()} | {t('你的位置')}: {myNode?.country || t('連線中..')}</span>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!window.electronAPI && (
            <a href="https://drive.google.com/uc?export=download&id=1Xji_z7dB5Q16FfSyRvnm2mXqn3n0cAQ2" target="_blank" rel="noopener noreferrer" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: 'var(--success-color)', color: 'white', border: 'none', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)', fontSize: '0.9rem'}}>
              <Monitor size={16} /> {t('下載專屬電腦版')}
            </a>
          )}
          <div className="system-stats" style={{display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <span style={{color: '#64748b'}}>{t('上線人數')}:</span> <strong style={{color: 'var(--success-color)'}}>{globalStats.activeUsers}</strong>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('總人口')}:</span> <strong style={{color: 'var(--text-color)'}}>{globalStats.totalPopulation}</strong>
            </div>
            {!isConnected && <span style={{color: 'var(--danger-color)', fontWeight: 'bold'}}>[{t('已斷線')}]</span>}
          </div>

          <div className={`header-dropdown${dropdownOpen ? ' open' : ''}`} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 15px', borderRadius: '8px',
                background: dropdownOpen ? 'var(--bg-light)' : 'var(--surface-color)',
                border: '1px solid var(--border-color)', color: 'var(--text-color)',
                cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontFamily: 'var(--font-sans)'
              }}
            >
              {t('選單 (Menu)')} <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            <div className="header-dropdown-content">

              <div style={{width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0'}}></div>
              <button onClick={() => { setShowSocialModal(true); setDropdownOpen(false); }} className="dropdown-item">
                <Users size={16} /> {t('社交網路 (Social)')}
              </button>
              <button onClick={() => { setShowShopModal(true); setDropdownOpen(false); }} className="dropdown-item" style={{color: '#38bdf8'}}>
                <ShoppingCart size={16} /> {t('黑市商城 (Shop)')}
              </button>
              <button onClick={() => { setShowBackpack(true); setDropdownOpen(false); }} className="dropdown-item" style={{color: '#22c55e'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><polyline points="8 8 8 5 16 5 16 8"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="9" y1="14" x2="9" y2="17"/><line x1="15" y1="14" x2="15" y2="17"/></svg>
                {t('裝備背包 (Backpack)')}
              </button>
              <button className="dropdown-item" onClick={() => { setShowThemeMenu(!showThemeMenu); setDropdownOpen(false); }}>
                <Palette size={16} /> {t('主題配色 (Themes)')}
              </button>
              <button className="dropdown-item" onClick={() => { setShowSettings(true); setDropdownOpen(false); }}>
                <Settings size={16} /> {t('設定 (Settings)')}
              </button>
              {(myRole === 'admin' || myRole === 'moderator') && (
                <button className="dropdown-item" style={{color: 'var(--danger-color)'}} onClick={() => { setShowAdminPanel(true); setDropdownOpen(false); }}>
                  <Shield size={16} /> {t('管理員功能 (Admin)')}
                </button>
              )}
              <a href="https://discord.gg/6P6NG49Mus" target="_blank" rel="noreferrer" className="dropdown-item" style={{color: 'var(--info-color)'}} onClick={() => setDropdownOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.58,67.58,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                {t('官方 Discord')}
              </a>
              <a href="https://buymeacoffee.com/lucas1126" target="_blank" rel="noreferrer" className="dropdown-item" style={{color: '#FFDD00'}} onClick={() => setDropdownOpen(false)}>
                <Coffee size={16} /> {t('贊助支持 (Donate)')}
              </a>
            </div>
          </div>

          <button onClick={toggleBgm} style={{padding: '5px 12px', borderRadius: '8px', background: bgmEnabled ? 'rgba(0,255,136,0.1)' : 'rgba(255,50,50,0.1)', border: bgmEnabled ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,50,50,0.3)', color: bgmEnabled ? 'var(--success-color)' : 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace'}} title={bgmEnabled ? t('關閉背景音樂') : t('開啟背景音樂')}>
{bgmEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
{bgmEnabled ? 'BGM ON' : 'BGM OFF'}
</button>
          <button onClick={onLogout} className="logout-btn" style={{padding: '5px 15px', borderRadius: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', color: 'var(--danger-color)', cursor: 'pointer'}}>{t('登出 / 切換帳號')}</button>
        </div>
      </header>

      <div className="main-content">
        {/* Left Metrics Terminal */}
        <aside className="metrics-terminal floating-panel">
          <div className="brand-banner" style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '6px'}}>
              <Globe2 size={40} color="var(--accent-color)" className="icon-glow icon-spin" />
            </div>
            <h3 style={{margin: '0', color: 'var(--text-primary)', letterSpacing: '2px', fontSize: '1.1rem'}}>EARTH ONLINE</h3>
          </div>

          <div className="metric-group" style={{padding: '10px 12px', marginBottom: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}} onClick={() => setShowAccountInfo(true)}>
              {boundDiscord ? (
                <img 
                  src={boundDiscord.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt="" 
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                  style={{width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--accent-color)', objectFit: 'cover'}} 
                />
              ) : (
                <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-color)'}}>
                  <User size={20} color="var(--text-secondary)" />
                </div>
              )}
              <div style={{flex: 1, overflow: 'hidden'}}>
                <div style={{color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{myNode?.username}</div>
                {boundDiscord ? (
                  <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>
                    <LinkIcon size={12} color="var(--accent-color)" style={{marginRight: '4px'}}/>
                    {t('已連結 Discord')}
                  </div>
                ) : (
<a href="#" onClick={(e) => { e.preventDefault(); setShowDiscordModal(true); }} style={{fontSize: '0.8rem', color: 'var(--info-color)'}}>
                     {t('連結 Discord')}
                   </a>
                )}
              </div>
            </div>
            <div style={{display: 'flex', gap: '12px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
              <div><span style={{color: '#888'}}>ping </span><strong style={{color: 'var(--text-main)'}}>{ping}ms</strong></div>
              <div><span style={{color: '#888'}}>{t('session')} </span><strong style={{color: '#00ffaa'}}>{formatTime(sessionTime)}</strong></div>
              <div><span style={{color: '#888'}}>{t('status')} </span><strong style={{color: isConnected ? 'var(--success-color)' : 'var(--danger-color)'}}>{isConnected ? t('on') : t('off')}</strong></div>
            </div>
          </div>

          <div style={{display: 'flex', gap: '10px', marginBottom: '8px'}}>
            <div className="metric-group" style={{flex: 1, padding: '10px 12px'}}>
              <div style={{fontSize: '0.75rem', color: '#888', marginBottom: '4px'}}>{t('上線人數')}</div>
              <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--success-color)'}}>{globalStats.activeUsers}</div>
            </div>
            <div className="metric-group" style={{flex: 1, padding: '10px 12px'}}>
              <div style={{fontSize: '0.75rem', color: '#888', marginBottom: '4px'}}>{t('倍率')}</div>
              {(() => {
                const isOverclock = myNode?.activeBuffs?.overclock > Date.now();
                const baseMult = globalStats.multiplier || 1.0;
                const effMult = isOverclock ? baseMult * 2 : baseMult;
                const color = effMult > 1.0 ? 'var(--accent-color)' : 'var(--text-main)';
                const personal = isOverclock ? '⚡' : '';
                return (
                  <div style={{fontSize: '1.3rem', fontWeight: 'bold', color}}>
                    {personal}{effMult.toFixed(1)}x
                  </div>
                );
              })()}
            </div>
            <div className="metric-group" style={{flex: 1, padding: '10px 12px'}}>
              <div style={{fontSize: '0.75rem', color: '#888', marginBottom: '4px'}}>{t('生命')}</div>
              <div style={{fontSize: '1.3rem', fontWeight: 'bold', color: calculateHealthPercentage(lifespan) > 30 ? 'var(--accent-color)' : 'var(--danger-color)'}}>{Math.floor(calculateHealthPercentage(lifespan))}%</div>
            </div>
          </div>

          <div className="metric-group" style={{padding: '10px 12px', marginBottom: '8px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px'}}>
              <span style={{fontSize: '0.8rem', color: '#888'}}>{t('節點等級')}</span>
              <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-color)'}}>
                Lv.{myNode?.level || 1}
                {myNode?.levelProgress?.nextSec && <span style={{fontSize:'0.75rem', color:'#888', marginLeft:'5px'}}>(+{(myNode.levelProgress.progress * 100).toFixed(0)}%)</span>}
              </span>
            </div>
            {myNode?.levelProgress?.nextSec > 0 && (
              <div style={{width:'100%', height:'4px', background:'rgba(255,255,255,0.1)', borderRadius:'2px', marginTop:'4px', overflow:'hidden'}}>
                <div style={{width:`${(myNode.levelProgress.progress * 100).toFixed(1)}%`, height:'100%', background:'var(--accent-color)', borderRadius:'2px', transition:'width 0.3s'}} />
              </div>
            )}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px'}}>
              <span style={{fontSize: '0.8rem', color: '#888'}}>{t('總生存時間')}</span>
              <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-color)'}}>{formatTime(lifespan)}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: '0.8rem', color: '#888'}}>{t('累積點數')}</span>
              <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)'}}>{(myNode?.accumulatedBonusPoints || 0).toLocaleString()}</span>
            </div>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px'}}>
            <div style={{fontSize: '0.8rem', color: '#888', marginBottom: '4px'}}>{t('伺服器：')}{region === 'asia' ? t('亞洲') : region === 'us' ? t('美洲') : t('歐洲')} | node: {myNode?.userId} | {myNode?.country || '--'}</div>
            {globalStats.multiplier > 1.0 && (
              <div style={{fontSize: '0.8rem', color: 'var(--accent-color)'}}>{t('超載中：')}{globalStats.activeUsers} / 5 {t('人')}</div>
            )}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button className="terminal-btn" style={{padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,215,0,0.1)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)'}} onClick={() => setShowLeaderboard(true)}>
              <Activity size={14} /> {t('排行榜')}
            </button>
            <button className="terminal-btn" style={{padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,215,0,0.05)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.2)'}} onClick={() => setShowAchievements(true)}>
              <Trophy size={14} /> {t('成就')}
            </button>
            {(myNode?.level || 1) >= 10 && (
              <button className="terminal-btn" style={{padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(147,51,234,0.1)', color: '#9333EA', border: '1px solid rgba(147,51,234,0.3)'}} onClick={() => { setShowTalentModal(true); if (socket?.connected) socket.emit('get_talent_data'); }}>
                <Zap size={14} /> {t('天賦')}
              </button>
            )}
            <button className="terminal-btn" style={{padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)'}} onClick={() => { setShowWarPanel(true); if (socket?.connected) socket.emit('get_war_stats'); }}>
              <Globe2 size={14} /> {t('區域對抗')}
            </button>
            <button className="terminal-btn" style={{padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}} onClick={() => setShowAboutModal(true)}>
              <Info size={14} /> {t('系統資訊')}
            </button>
          </div>
        </aside>

        {/* Right Geographic Matrix */}
        <main className="geographic-matrix">
          <div className="map-overlays" style={{display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-start'}}>
            <div className="floating-panel" style={{padding: '15px 25px'}}>
              <div className="overlay-item">
                <div className="overlay-title" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Globe2 size={16} /> {t('全球總掛機時間')}
                </div>
                <div className="overlay-value">{formatTime(globalStats.globalProduction)}</div>
              </div>
            </div>
          </div>
          <DataCenterVisualizer 
            lifespan={lifespan} 
            bonusPoints={myNode?.accumulatedBonusPoints || 0} 
            ping={ping}
            onlineCount={globalStats.activeUsers || 0}
            cpuUsage={globalStats.systemHardware?.cpu || 0}
            region={region}
            onOpenSocial={() => setShowSocialModal(true)}
            onOpenAchievements={() => setShowAchievements(true)}
            honor={myNode?.honor || 0}
            weeklyScore={myNode?.weeklyScore || 0}
            bgStyle={bgStyle}
            activeEvent={currentEvent?.type || null}
            multiplier={globalStats.multiplier || 1}
            nodes={nodes}
            myNodeId={myNode?.userId}
          />

                      <Console logs={logs} chatInput={chatInput} setChatInput={setChatInput} socket={socket} pmData={{showPm,pmTarget,pmInput,setPmInput,pmLog}} onClosePm={()=>setShowPm(false)} />
</main>
      </div>

            {/* Leaderboard Modal */}
      <LeaderboardModal show={showLeaderboard} onClose={()=>setShowLeaderboard(false)} leaderboard={leaderboard} sortMode={sortMode} setSortMode={setSortMode} formatTime={formatTime} />

{showDiscordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '500px'}}>
            <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--info-color)'}}>
              <LinkIcon /> {t('連結 Discord 帳號')}
            </h3>
            
            {!showManualBind ? (
              <>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.6'}}>
                  {t('透過官方驗證安全登入，連結後將即時同步您最新的 Discord 大頭貼與暱稱。')}<br/>
                  <span style={{color: 'var(--accent-color)'}}>{t('※ 我們僅會獲取您的公開基本資料，絕對安全。')}</span>
                </p>
                <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center'}}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowManualBind(true); }} style={{color: '#888', fontSize: '0.85rem', marginRight: 'auto', textDecoration: 'underline'}}>{t('無法使用授權？點此手動綁定')}</a>
                  <button type="button" onClick={() => setShowDiscordModal(false)} className="terminal-btn" style={{padding: '10px 15px', background: 'rgba(255,255,255,0.1)'}}>{t('取消')}</button>
                  <button onClick={handleBindDiscord} className="terminal-btn" style={{padding: '10px 20px', background: 'var(--info-color)', color: '#fff', border: 'none', fontWeight: 'bold'}}>
                    {t('🔗 前往 Discord 官方授權')}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleBindDiscordManual}>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px', lineHeight: '1.6'}}>
                  {t('手動輸入需開啟開發者模式，請依照下方圖示指示，對著您的頭像點擊右鍵複製。')}
                </p>
                <div className="discord-mock-menu">
                  <div className="discord-mock-item">{t('編輯個人資料')}</div>
                  <div className="discord-mock-item" style={{color: '#ed4245'}}>{t('請勿打擾')}</div>
                  <div className="discord-mock-item">{t('切換帳號')}</div>
                  <div className="discord-mock-item discord-mock-highlight">{t('複製使用者 ID')}</div>
                </div>
                <input 
                  type="text" 
                  placeholder={t('在此貼上您複製的 ID (例如: 123456789012345678)')} 
                  value={discordId}
                  onChange={e => setDiscordId(e.target.value)}
                  className="terminal-input"
                  style={{marginBottom: '20px', marginTop: '15px', width: '100%', boxSizing: 'border-box'}}
                  required
                />
                <div style={{display: 'flex', gap: '10px'}}>
                  <button type="button" className="terminal-btn" style={{flex: 1, background: 'rgba(255,255,255,0.1)'}} onClick={() => setShowManualBind(false)}>{t('返回')}</button>
                  <button type="submit" className="terminal-btn" style={{flex: 1}}>{t('確認手動綁定')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Full Page About Documentation */}
      {showAboutModal && <DocumentationOverlay onClose={() => setShowAboutModal(false)} />}
      {showSocialModal && <SocialModal onClose={() => setShowSocialModal(false)} socialTab={socialTab} setSocialTab={setSocialTab} socialData={socialData} socket={socket} myNode={myNode} onPmUser={(username) => { setPmTarget(username); setShowPm(true); setShowSocialModal(false); }} toast={toast} />}
      {showShopModal && <ShopModal onClose={() => setShowShopModal(false)} pts={myNode?.accumulatedBonusPoints} onBuy={(id) => { if (socket?.connected) { socket.emit('buy_item', id); } else { alert('連線未就緒，無法購買'); } }} onAdRevive={() => setShowAdRevive(true)} adReviveRemaining={adReviveRemaining} />}
      {showBackpack && <BackpackModal onClose={() => setShowBackpack(false)} inventory={myNode?.inventory} socket={socket} addLog={addLog} />}

      {showAchievements && <AchievementModal data={achievementData} onClose={() => setShowAchievements(false)} />}
      {showTalentModal && <TalentModal data={talentData} onClose={() => setShowTalentModal(false)} socket={socket} />}
      {showWarPanel && <WarPanelModal data={warStats} onClose={() => setShowWarPanel(false)} region={region} />}

      {showAccountInfo && <AccountInfoModal token={token} apiUrl={API_URL} onClose={() => setShowAccountInfo(false)} onLogout={onLogout} />}

      {/* Admin Panel Modal — Full Side Drawer */}
      {showAdminPanel && (() => {
        const filtered = allPlayersList.filter(p => {
          const matchSearch = p.username.toLowerCase().includes(playerSearch.toLowerCase());
          if (!matchSearch) return false;
          if (adminPlayerFilter === 'online') return p.online;
          if (adminPlayerFilter === 'muted')  return p.isMuted;
          if (adminPlayerFilter === 'banned') return p.isBanned;
          return true;
        }).sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
        const selected = allPlayersList.find(p => p.username === adminTarget);

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'flex-end',
          }} onClick={() => setShowAdminPanel(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              width: '680px', maxWidth: '98vw', height: '100vh',
              background: '#0a0e17', borderLeft: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', flexDirection: 'column',
              fontFamily: '"Inter", "Segoe UI", sans-serif',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.7)',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '16px 20px', borderBottom: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.05)', flexShrink: 0,
              }}>
                <Shield size={18} color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '1rem', flex: 1 }}>
                  {t('管理員面板 · Admin Panel')}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: '12px' }}>
                  {t('總玩家數:')} <strong style={{ color: '#e2e8f0' }}>{allPlayersList.length}</strong>　
                  {t('在線:')} <strong style={{ color: '#22c55e' }}>{allPlayersList.filter(p => p.online).length}</strong>
                </span>
                <button onClick={() => setShowAdminPanel(false)} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', cursor: 'pointer', borderRadius: '6px',
                  width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>

              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left: Player List */}
                <div style={{
                  width: '280px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Search + Filter */}
                  <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <input
                      type="text"
                      placeholder={t('🔍 搜尋玩家名稱...')}
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#e2e8f0', borderRadius: '6px', padding: '7px 10px',
                        fontSize: '0.82rem', outline: 'none', marginBottom: '8px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', marginRight: '4px' }}>
                        <input type="checkbox" checked={filtered.length > 0 && selectedPlayers.size === filtered.length} onChange={e => { if (e.target.checked) { setSelectedPlayers(new Set(filtered.map(p => p.username))); } else { setSelectedPlayers(new Set()); } }} style={{ accentColor: '#ef4444' }} />
                        {t('全選')}
                      </label>
                      {[['all',t('全部')],['online',t('在線')],['muted',t('禁言')],['banned',t('封鎖')]].map(([val, label]) => (
                        <button key={val} onClick={() => setAdminPlayerFilter(val)} style={{
                          padding: '3px 9px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer',
                          border: adminPlayerFilter === val ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                          background: adminPlayerFilter === val ? 'rgba(239,68,68,0.15)' : 'transparent',
                          color: adminPlayerFilter === val ? '#ef4444' : '#64748b',
                          transition: 'all 0.15s',
                        }}>{label}</button>
                      ))}
                      <button onClick={() => { if (socket) { socket.emit('get_all_players'); } }} style={{
                        padding: '3px 9px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                        color: '#64748b', marginLeft: 'auto',
                      }}>{t('↺ 刷新')}</button>
            </div>
          </div>

          {/* Player List */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filtered.length === 0 && (
                      <div style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', padding: '24px 12px' }}>
                        {allPlayersList.length === 0 ? t('點擊「刷新」載入玩家名單') : t('無符合結果')}
                      </div>
                    )}
                    {filtered.map(p => (
                      <div
                        key={p.username}
                        style={{
                          padding: '6px 12px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: selectedPlayers.has(p.username) ? 'rgba(34,197,94,0.08)' : adminTarget === p.username ? 'rgba(239,68,68,0.12)' : 'transparent',
                          borderLeft: adminTarget === p.username ? '3px solid #ef4444' : '3px solid transparent',
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                      >
                        <input type="checkbox" checked={selectedPlayers.has(p.username)} onChange={e => { const next = new Set(selectedPlayers); if (e.target.checked) { next.add(p.username); } else { next.delete(p.username); } setSelectedPlayers(next); }} onClick={e => e.stopPropagation()} style={{ accentColor: '#22c55e', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setAdminTarget(p.username)}>
                          {/* Online dot + name row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                              background: p.online ? '#22c55e' : '#334155',
                              boxShadow: p.online ? '0 0 6px #22c55e' : 'none',
                            }} />
                            <span style={{
                              color: selectedPlayers.has(p.username) ? '#4ade80' : adminTarget === p.username ? '#f87171' : '#e2e8f0',
                              fontWeight: '600', fontSize: '0.85rem',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {p.username}
                              {p.role === 'admin' && <span style={{ marginLeft: '5px', color: '#ef4444', fontSize: '0.65rem' }}>[ADMIN]</span>}
                              {p.role === 'moderator' && <span style={{ marginLeft: '5px', color: '#f59e0b', fontSize: '0.65rem' }}>[MOD]</span>}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                            <span style={{ color: '#475569', fontSize: '0.68rem' }}>{p.country}</span>
                            {p.isMuted && <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '0.62rem', padding: '1px 4px', borderRadius: '3px' }}>{t('禁言')}</span>}
                            {p.isBanned && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.62rem', padding: '1px 4px', borderRadius: '3px' }}>{t('封鎖')}</span>}
                          </div>
                        </div>
                        <span style={{ color: '#334155', fontSize: '0.68rem', flexShrink: 0 }}>
                          {(p.pts || 0).toLocaleString()} pt
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Action Panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {!adminTarget && selectedPlayers.size === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#334155', gap: '8px' }}>
                      <Shield size={40} color="#1e293b" />
                      <span style={{ fontSize: '0.9rem' }}>{t('← 從左側選取玩家')}</span>
                    </div>
                  ) : selectedPlayers.size > 0 ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginBottom: '20px', padding: '14px',
                        background: 'rgba(34,197,94,0.07)', borderRadius: '10px',
                        border: '1px solid rgba(34,197,94,0.3)',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#4ade80', fontWeight: '700', fontSize: '1.1rem' }}>
                            {t('已選取')} {selectedPlayers.size} {t('位成員')}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                            {[...selectedPlayers].join(', ')}
                          </div>
                        </div>
                        <button onClick={() => setSelectedPlayers(new Set())} style={{
                          background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.8rem',
                        }}>{t('清除選取')}</button>
                      </div>

                      {/* Mass Give PT */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '1px', marginBottom: '8px' }}>{t('批量發布點數 MASS GIVE PT')}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input type="number" value={adminPtsAmount} onChange={e => setAdminPtsAmount(Math.max(0, parseInt(e.target.value) || 0))} min="1" max="100000" placeholder={t('數量')} style={{ width: '100px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', outline: 'none', fontSize: '0.82rem' }} />
                          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{t('×')} {selectedPlayers.size} {t('人')} = {(adminPtsAmount * selectedPlayers.size).toLocaleString()} PT</span>
                          <button onClick={handleAdminMassAddPts} disabled={adminPtsAmount <= 0} style={{
                            background: adminPtsAmount > 0 ? '#22c55e' : '#334155',
                            color: adminPtsAmount > 0 ? '#000' : '#64748b',
                            border: 'none', padding: '6px 20px', borderRadius: '6px', cursor: adminPtsAmount > 0 ? 'pointer' : 'not-allowed',
                            fontSize: '0.82rem', fontWeight: '600', marginLeft: 'auto',
                          }}>{t('批量發送')}</button>
                        </div>
                      </div>

                      <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: '0.75rem', lineHeight: 1.6 }}>
                        ⚠ {t('將對全部')} {selectedPlayers.size} {t('位已選取成員各發送')} {adminPtsAmount} {t('PT，請確認後再操作。')}
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                      {/* Selected player header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginBottom: '20px', padding: '14px',
                        background: 'rgba(239,68,68,0.07)', borderRadius: '10px',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: selected?.online ? '#22c55e' : '#334155',
                          boxShadow: selected?.online ? '0 0 8px #22c55e' : 'none',
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#f87171', fontWeight: '700', fontSize: '1.1rem' }}>{adminTarget}</div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                            {selected?.country} ·
                            {selected?.online ? <span style={{ color: '#22c55e' }}> {t('在線')}</span> : ` ${t('離線')}`} ·
                            {' '}{(selected?.pts || 0).toLocaleString()} PT
                            {selected?.isMuted && <span style={{ color: '#fbbf24', marginLeft: '8px' }}>{t('⚠ 禁言中')}{selected?.mutedUntil ? ` (${Math.ceil((selected.mutedUntil - Date.now()) / 60000)}${t('分')})` : ''}</span>}
                            {selected?.isBanned && <span style={{ color: '#ef4444', marginLeft: '8px' }}>{t('🚫 封鎖中')}{selected?.bannedUntil ? ` (${Math.ceil((selected.bannedUntil - Date.now()) / 60000)}${t('分')})` : ''}</span>}
                          </div>
                        </div>
                        <button onClick={() => setAdminTarget('')} style={{
                          background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.8rem',
                        }}>{t('取消選取')}</button>
                      </div>

                      {/* Mute */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '1px', marginBottom: '8px' }}>{t('禁言 MUTE')}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select id="muteDuration" defaultValue="5" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}>
                            <option value="1">{t('1 分鐘')}</option>
                            <option value="5">{t('5 分鐘')}</option>
                            <option value="10">{t('10 分鐘')}</option>
                            <option value="30">{t('30 分鐘')}</option>
                            <option value="60">{t('1 小時')}</option>
                            <option value="360">{t('6 小時')}</option>
                            <option value="1440">{t('24 小時')}</option>
                          </select>
                          <button onClick={handleAdminMute} style={{ background: '#b45309', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>{t('禁言')}</button>
                          <button onClick={handleAdminUnmute} style={{ background: '#15803d', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>{t('解除禁言')}</button>
                        </div>
                      </div>

                      {/* Ban */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '1px', marginBottom: '8px' }}>{t('封鎖 BAN')}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select id="banDuration" defaultValue="1440" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}>
                            <option value="60">{t('1 小時')}</option>
                            <option value="360">{t('6 小時')}</option>
                            <option value="1440">{t('24 小時')}</option>
                            <option value="4320">{t('3 天')}</option>
                            <option value="10080">{t('7 天')}</option>
                            <option value="43200">{t('30 天')}</option>
                          </select>
                          <button onClick={handleAdminBan} style={{ background: '#991b1b', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>{t('封鎖')}</button>
                          <button onClick={handleAdminUnban} style={{ background: '#15803d', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>{t('解除封鎖')}</button>
                        </div>
                      </div>

                      {/* Delete message */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '1px', marginBottom: '8px' }}>{t('訊息管理 MESSAGES')}</div>
                        <button onClick={handleAdminDelete} style={{ background: '#92400e', border: 'none', color: '#fff', padding: '6px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>{t('刪除該玩家所有訊息')}</button>
                      </div>

                      <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: '0.75rem', lineHeight: 1.6 }}>
                        {t('⚠ 管理員操作不可復原，請謹慎使用。所有操作均會記錄於系統日誌。')}
                      </div>

                      {/* Give PT */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '1px', marginBottom: '8px' }}>{t('給予點數 GIVE PT')}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input type="number" value={adminPtsAmount} onChange={e => setAdminPtsAmount(Math.max(0, parseInt(e.target.value) || 0))} min="1" max="100000" placeholder={t('數量')} style={{ width: '100px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', outline: 'none', fontSize: '0.82rem' }} />
                          <button onClick={handleAdminAddPts} disabled={!adminTarget.trim() || adminPtsAmount <= 0} style={{
                            background: adminTarget.trim() && adminPtsAmount > 0 ? '#22c55e' : '#334155',
                            color: adminTarget.trim() && adminPtsAmount > 0 ? '#000' : '#64748b',
                            border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: adminTarget.trim() && adminPtsAmount > 0 ? 'pointer' : 'not-allowed',
                            fontSize: '0.82rem', fontWeight: '600'
                           }}>{t('發送 PT')}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}


      {/* Ad Revive Modal */}
      {showAdRevive && (
        <div className="modal-overlay" onClick={() => { if (adCountdown === 0) setShowAdRevive(false); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface-color)', border: '1px solid var(--accent-color)',
            borderRadius: '12px', padding: '24px', maxWidth: '640px', width: '95%',
            textAlign: 'center'
          }}>
            {adCountdown > 0 ? (
              <>
                <div style={{marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', maxHeight: '360px'}}>
                  <a href={AD_LINKS[currentAd] || 'https://zixi-casino.vercel.app/landing'} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                    <img src={currentAd} alt="ad" style={{width: '100%', height: 'auto', display: 'block', borderRadius: '8px', cursor: 'pointer'}} />
                  </a>
                </div>
                <div style={{color: 'var(--accent-color)', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '4px', minHeight: '1.8em', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  {adSlogan?.title || ''}
                </div>
                <div style={{color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '10px', minHeight: '2.4em', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px'}}>
                  {adSlogan?.lines?.map((line, i) => <span key={i}>{line}</span>)}
                </div>
                <div style={{color: 'var(--accent-color)', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '15px'}}>{adCountdown}s</div>
                <div style={{color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '10px'}}>{t('贊助商：子熙生態系')}</div>
                <div style={{width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden'}}>
                  <div style={{width: `${((15 - adCountdown) / 15) * 100}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 1s linear'}} />
                </div>
                <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '15px'}}>{t('觀看完整廣告即可免費復活伺服器')}</div>
              </>
            ) : (
              <>
                <div style={{fontSize: '3rem', marginBottom: '15px'}}>⚡</div>
                <div style={{color: 'var(--text-color)', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px'}}>{t('伺服器已死機！')}</div>
                <div style={{color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '20px'}}>{t('觀看廣告即可免費復活（恢復 50% 健康度）')}</div>
                <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px'}}>{t('今日剩餘次數：')}{adReviveRemaining} / 3</div>
                <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                  <button onClick={handleStartAdRevive} disabled={adReviveRemaining <= 0} style={{
                    background: adReviveRemaining > 0 ? 'var(--accent-color)' : 'var(--border-color)',
                    color: adReviveRemaining > 0 ? '#000' : 'var(--text-dim)',
                    border: 'none', padding: '12px 30px', borderRadius: '8px',
                    fontWeight: 'bold', cursor: adReviveRemaining > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '1rem'
                  }}>
                    {adReviveRemaining > 0 ? t('▶ 觀看廣告復活') : t('今日次數已用完')}
                  </button>
                  <button onClick={() => setShowAdRevive(false)} style={{
                    background: 'transparent', border: '1px solid var(--border-color)',
                    color: 'var(--text-dim)', padding: '12px 20px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '0.9rem'
                  }}>{t('關閉')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showThemeMenu && (
        <div className="modal-overlay" onClick={() => setShowThemeMenu(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface-color, #161d2e)',
            border: '1px solid var(--border-color, #1e293b)',
            borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%',
            color: 'var(--text-color, #e2e8f0)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Palette size={20} /> {t('選擇主題配色')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(themes).map(([key, t]) => (
                <button key={key} onClick={() => { setTheme(key); setShowThemeMenu(false); }} style={{
                  padding: '16px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                  background: theme === key ? t.accent : t.surface,
                  color: theme === key ? '#000' : t.text,
                  border: theme === key ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                  fontWeight: theme === key ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.bg, display: 'inline-block', border: '1px solid ' + t.border }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.text, display: 'inline-block' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface-color)', border: '1px solid var(--accent-color)',
            borderRadius: '12px', padding: '30px', maxWidth: '450px', width: '90%',
            color: 'var(--text-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} /> {t('設定 (Settings)')}
              </h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowSettings(false)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                {t('字體大小 (Font Size):')} {document.documentElement.style.fontSize || '16px'}
              </label>
              <input
                type="range" min="12" max="24" step="1"
                defaultValue={parseInt(localStorage.getItem('eo_fontSize')) || 16}
                onChange={e => {
                  const val = e.target.value;
                  document.documentElement.style.fontSize = val + 'px';
                  localStorage.setItem('eo_fontSize', val);
                }}
                style={{ width: '100%', accentColor: 'var(--accent-color)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>12px</span><span>24px</span>
              </div>
            </div>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('語言 (Language)')}</span>
              <button
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                style={{
                  background: 'var(--bg-light)', border: '1px solid var(--border-color)',
                  color: 'var(--accent-color)', padding: '8px 16px', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-sans)'
                }}
              >
                {language === 'zh' ? 'English' : t('中文')}
              </button>
            </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('通知音效 (Sound Notifications)')}</span>
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={e => {
                  setNotificationEnabled(e.target.checked);
                  localStorage.setItem('eo_notifications', e.target.checked);
                }}
                style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('背景風格')}</span>
              <select value={bgStyle} onChange={e => { setBgStyle(e.target.value); localStorage.setItem('eo_bg_style', e.target.value); }}
                style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-sans)' }}>
                <option value="globe">🌍 3D 地球</option>
                <option value="server">🖥️ 伺服器機房</option>
                <option value="nebula">🌌 星雲</option>
                <option value="radar">📡 雷達終端</option>
                <option value="cyber">🏙️ 賽博城市</option>
              </select>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('切換伺服器')}</span>
              <select value={region} onChange={e => {
                const newRegion = e.target.value;
                if (newRegion !== region && socket?.connected) {
                  socket.once('region_switched', (data) => {
                    if (data.success) {
                      sessionStorage.setItem('eo_region', newRegion);
                      localStorage.setItem('eo_region', newRegion);
                      window.location.reload();
                    } else {
                      alert(data.message);
                    }
                  });
                  socket.emit('switch_region', { newRegion });
                }
              }} style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-sans)' }}>
                <option value="asia">{t('亞洲')}</option>
                <option value="us">{t('美洲')}</option>
                <option value="eu">{t('歐洲')}</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </>
  );
}

function AccountInfoModal({ token, apiUrl, onClose, onLogout }) {
  const { t, language, setLanguage } = useLanguage();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingVerify, setIsSendingVerify] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError('伺服器連線失敗'));
  }, [token]);

  const handleGenerateKey = async () => {
    if (isGenerating) return;
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
    if (!info) return;
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
        // Update local info state to reflect the email
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
              <a href="https://earthonline.onrender.com/downloads/EarthOnlineSetup.exe" style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-color)', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px', fontWeight: '600'}}>
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

            {/* Email Binding Section */}
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

function App() {
  const { t, language, setLanguage } = useLanguage();
  const [token, setToken] = useState(localStorage.getItem('eo_token'));
  const [region, setRegion] = useState(localStorage.getItem('eo_region') || 'asia');
  const APP_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

  const handleLogin = (newToken, username, selectedRegion) => {
    localStorage.setItem('eo_token', newToken);
    if (selectedRegion) {
      localStorage.setItem('eo_region', selectedRegion);
      setRegion(selectedRegion);
    }
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('eo_token');
    localStorage.removeItem('eo_region');
    setToken(null);
  };

  if (!token) {
    return <LoginGateway onLogin={handleLogin} />;
  }

  return (
    <GameProvider token={token} onLogout={handleLogout} region={region} SOCKET_URL={APP_BASE_URL} API_URL={APP_BASE_URL + "/api/" + region} BASE_URL={APP_BASE_URL}>
      <Dashboard token={token} onLogout={handleLogout} region={region} />
    </GameProvider>
  );
}

function WarPanelModal({ data, onClose, region }) {
  const { t } = useLanguage();
  if (!data) return null;
  const regions = Object.entries(data).sort(([, a], [, b]) => b.totalOnlineTime - a.totalOnlineTime);
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '700px', width: '95%' }}>
        <h2 style={{ margin: '0 0 20px', color: 'var(--text-color)', fontSize: '1.3rem' }}>{t('區域對抗')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {regions.map(([r, s], i) => (
            <div key={r} style={{ padding: '15px', borderRadius: '8px', background: i === 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)', border: i === 0 ? '1px solid rgba(255,215,0,0.4)' : '1px solid var(--border-color)', position: 'relative' }}>
              {i === 0 && <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#FFD700', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>🏆 1st</div>}
              <h3 style={{ color: r === region ? 'var(--accent-color)' : 'var(--text-color)', margin: '0 0 10px', fontSize: '0.95rem' }}>{r === 'asia' ? t('亞洲') : r === 'us' ? t('美洲') : t('歐洲')}</h3>
              <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.8' }}>
                <div>{t('在線時間')}: {Math.round((s.totalOnlineTime || 0) / 3600000)}h</div>
                <div>{t('平均在線')}: {s.avgOnlineUsers || 0}</div>
                <div>Peak: {s.peakOnlineUsers || 0}</div>
                <div>{t('事件完成率')}: {s.eventRate || 0}%</div>
                <div>PT: {(s.totalPTEarned || 0).toFixed(0)}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 'bold' }}>{t('關閉')}</button>
      </div>
    </div>
  );
}

function TalentModal({ data, onClose, socket }) {
  const { t } = useLanguage();
  const { points, spent, talents, all } = data;
  const [result, setResult] = useState(null);
  const trees = [
    { id: 'survival', name: '🛡️ 生存系', en: 'Survival', talents: ['iron_wall', 'regeneration', 'gecko', 'immortal'] },
    { id: 'production', name: '⚡ 產能系', en: 'Production', talents: ['overclock', 'calculus', 'burst', 'plunder'] },
    { id: 'social', name: '🤝 社交系', en: 'Social', talents: ['rally', 'network', 'resonance', 'leader'] },
  ];
  const handleAssign = (talentId) => {
    if (socket?.connected) {
      socket.emit('assign_talent', { talentId });
      socket.once('talent_result', (res) => setResult(res));
    }
  };
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '800px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.3rem' }}>{t('天賦樹')}</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#9333EA' }}>{t('可用點數')}: {points || 0}</span>
        </div>
        {result && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '6px', background: result.success ? 'rgba(0,255,170,0.1)' : 'rgba(255,65,108,0.1)', border: `1px solid ${result.success ? '#00ffaa' : '#ff416c'}`, color: result.success ? '#00ffaa' : '#ff416c', fontSize: '0.9rem' }}>
            {result.message}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {trees.map(tree => (
            <div key={tree.id}>
              <h3 style={{ color: 'var(--text-color)', margin: '0 0 12px', fontSize: '1rem' }}>{tree.talents.map(id => all[id]).filter(Boolean).length > 0 ? tree.name : tree.en}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tree.talents.map(id => {
                  const def = all[id];
                  if (!def) return null;
                  const lvl = talents[id] || 0;
                  const maxed = lvl >= def.maxLevel;
                  const hasPoint = (points || 0) > 0;
                  return (
                    <div key={id} style={{ padding: '10px', borderRadius: '8px', background: lvl > 0 ? 'rgba(147,51,234,0.1)' : 'rgba(255,255,255,0.03)', border: lvl > 0 ? '1px solid rgba(147,51,234,0.3)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>{def.name || id}</span>
                        <span style={{ color: maxed ? '#FFD700' : '#888', fontSize: '0.8rem' }}>Lv.{lvl}/{def.maxLevel}</span>
                      </div>
                      <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '6px' }}>{def.desc}</div>
                      {!maxed && (
                        <button onClick={() => handleAssign(id)} disabled={!hasPoint} style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: hasPoint ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.05)', color: hasPoint ? '#9333EA' : '#555', cursor: hasPoint ? 'pointer' : 'default' }}>
                          {hasPoint ? `+1 (${(points || 0)} ${t('剩餘')})` : t('點數不足')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {spent > 0 && (
            <button onClick={() => { if (socket?.connected) { socket.emit('reset_talents'); socket.once('talent_result', (res) => setResult(res)); } }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--danger-color)', background: 'rgba(255,65,108,0.1)', color: 'var(--danger-color)', cursor: 'pointer', fontWeight: 'bold' }}>
              {t('重置天賦 (500 PT)')}
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 'bold' }}>{t('關閉')}</button>
        </div>
      </div>
    </div>
  );
}

function AchievementModal({ data, onClose }) {
  const { t } = useLanguage();
  const { unlocked, all } = data;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px', color: 'var(--text-color)', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={22} color="#FFD700" /> {t('成就')}
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#888' }}>{unlocked?.length || 0}/{all?.length || 0}</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(all || []).map(ach => {
            const done = (unlocked || []).includes(ach.id);
            return (
              <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: done ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', border: done ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent', opacity: done ? 1 : 0.4 }}>
                <div style={{ fontSize: '1.5rem' }}>{done ? '🏆' : '🔒'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '0.95rem' }}>{t(ach.name)}</div>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>{t(ach.en)}</div>
                </div>
                {ach.reward > 0 && <div style={{ fontSize: '0.8rem', color: '#FFD700' }}>+{ach.reward} PT</div>}
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{t('關閉')}</button>
      </div>
    </div>
  );
}

function SocialModal({ onClose, socialTab, setSocialTab, socialData, socket, myNode, onPmUser, toast }) {
  const { t, language, setLanguage } = useLanguage();
  const sortedPlayers = [...(socialData.allPlayers || [])].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'rgba(10, 15, 30, 0.95)',
        border: '1px solid var(--accent-color)',
        borderRadius: '10px', padding: '20px', width: '90%', maxWidth: '500px',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)', color: '#fff', position: 'relative',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        <h2 style={{ color: 'var(--accent-color)', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={24} /> {t('社交網路 (Social Matrix)')}
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
          <button onClick={() => setSocialTab('all')} style={{ flex: 1, padding: '8px', background: socialTab === 'all' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'all' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t('全服玩家')}</button>
          <button onClick={() => setSocialTab('friends')} style={{ flex: 1, padding: '8px', background: socialTab === 'friends' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'friends' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t('好友列表')}</button>
          <button onClick={() => setSocialTab('requests')} style={{ flex: 1, padding: '8px', background: socialTab === 'requests' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'requests' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {t('交友邀請')} {socialData.friendRequests?.length > 0 && <span style={{ background: 'var(--danger-color)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '5px' }}>{socialData.friendRequests.length}</span>}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {socialTab === 'all' && (
            sortedPlayers.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>{t('查無資料')}</div> :
            sortedPlayers.map(p => (
              <div key={p.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: p.online ? '#0f0' : '#888', fontWeight: 'bold' }}>●</span>
                  <span>{p.username} [{p.country}]</span>
                </div>
                {p.username !== myNode?.username && !socialData.friends?.find(f => f.username === p.username) && (
                  <button 
                    onClick={(e) => {
                      socket.emit('send_friend_request', { targetUsername: p.username });
                      e.target.disabled = true;
                      e.target.innerText = '✓';
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                      e.target.style.color = '#888';
                      e.target.style.borderColor = '#888';
                    }} 
                    style={{ background: 'rgba(0,255,136,0.2)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    {t('加好友')}
                  </button>
                )}
              </div>
            ))
          )}

          {socialTab === 'friends' && (
            socialData.friends?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>{t('目前沒有好友')}</div> :
            socialData.friends?.map(f => (
              <div key={f.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: f.online ? '#0f0' : '#888', fontWeight: 'bold' }}>●</span>
                  <span>{f.username}</span>
                </div>
                <div>
                <button onClick={() => onPmUser && onPmUser(f.username)} style={{ background: 'rgba(0,255,136,0.2)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '5px' }}>{t('私訊')}</button>
                <button onClick={() => {
                  if (window.confirm(`${t('刪除')} ${f.username}?`)) {
                    socket.emit('remove_friend', { targetUsername: f.username });
                  }
                }} style={{ background: 'rgba(255,65,108,0.2)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{t('刪除')}</button>
                </div>
              </div>
            ))
          )}

          {socialTab === 'requests' && (
            socialData.friendRequests?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>{t('目前沒有邀請')}</div> :
            socialData.friendRequests?.map(req => (
              <div key={req} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <span>{req}{t('想要加您為好友')}</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => socket.emit('accept_friend_request', { targetUsername: req })} style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('接受')}</button>
                  <button onClick={() => socket.emit('reject_friend_request', { targetUsername: req })} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{t('拒絕')}</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Toast Notification — full center overlay */}
      {toast && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{
            background: '#0a0e17', border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,170,0.3)' : 'rgba(255,65,100,0.3)'}`,
            borderRadius: '16px', padding: '30px 40px',
            textAlign: 'center', maxWidth: '420px',
            boxShadow: toast.type === 'success'
              ? '0 0 60px rgba(0,255,170,0.12), 0 20px 60px rgba(0,0,0,0.5)'
              : '0 0 60px rgba(255,65,100,0.12), 0 20px 60px rgba(0,0,0,0.5)',
            animation: 'popIn 0.25s ease',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
              {toast.type === 'success' ? '✅' : '⚠️'}
            </div>
            <div style={{
              color: toast.type === 'success' ? '#00ffaa' : '#ff416c',
              fontWeight: 'bold', fontSize: '1.2rem',
              lineHeight: 1.5, marginBottom: '16px',
            }}>
              {toast.message}
            </div>
            <div style={{ color: '#555', fontSize: '0.8rem', letterSpacing: '1px' }}>
              {t('視窗將自動關閉...')}
            </div>
          </div>
        </div>
      )}

      {/* Footer / Open Source Badge */}
      <div style={{ position: 'fixed', bottom: '15px', left: '0', width: '100%', textAlign: 'center', pointerEvents: 'none', zIndex: 9999 }}>
        <a href="https://github.com/huchialun9-ctrl/earthonline" target="_blank" rel="noreferrer" style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--panel-bg)', padding: '6px 14px', borderRadius: '20px', textDecoration: 'none', color: 'var(--text-dim)', fontSize: '0.8rem', backdropFilter: 'blur(4px)', border: '1px solid var(--border-color)', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background='var(--bg-light)'; e.currentTarget.style.color='var(--text-color)'}} onMouseLeave={e => {e.currentTarget.style.background='var(--panel-bg)'; e.currentTarget.style.color='var(--text-dim)'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          Open Source on GitHub
          <img src="https://img.shields.io/github/license/huchialun9-ctrl/earthonline?style=flat-square&color=blue" alt="MIT License" style={{ height: '14px', marginLeft: '4px' }} />
        </a>
      </div>
    </div>
  );
}


export default App;
