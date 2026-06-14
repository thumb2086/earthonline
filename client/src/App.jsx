import { useEffect, useState, useRef } from 'react';
import { Globe2, Activity, User, Link as LinkIcon, ShieldCheck, Shield, Info, Database, X, Star, Clock, Volume2, VolumeX, Coffee, Users, ChevronDown, Zap, Tornado, Coins, Satellite, Settings, AlertTriangle, CheckCircle, MapPin, Monitor, ShoppingCart, Palette, Trophy } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import Draggable from 'react-draggable';
import DataCenterVisualizer from './DataCenterVisualizer';
import ShopModal from './ShopModal';
import BackpackModal from './BackpackModal';
import LeaderboardModal from './components/Modals/LeaderboardModal';
import WarPanelModal from './components/Modals/WarPanelModal';
import TalentModal from './components/Modals/TalentModal';
import AchievementModal from './components/Modals/AchievementModal';
import SocialModal from './components/Modals/SocialModal';
import AccountInfoModal from './components/Modals/AccountInfoModal';
import Console from './components/Dashboard/Console';
import { GameProvider, useGame } from './context/GameContext';
import CountdownBanner from './components/CountdownBanner';
import DonateBanner from './components/DonateBanner';
import LoginGateway from './components/LoginGateway';
import FourPetalSpiral from './components/FourPetalSpiral';
import DocumentationOverlay from './components/DocumentationOverlay';
import GameBackground from './components/GameBackground';
import PixelWordArt from './components/PixelWordArt';
import OnboardingGuide from './components/OnboardingGuide';
import FactionSelect from './components/FactionSelect';
import WorldMap from './components/WorldMap';
import CountryInfoPanel from './components/CountryInfoPanel';
import MinePanel from './components/MinePanel';
import LotteryModal from './components/LotteryModal';
import DispatchAnimation from './components/DispatchAnimation';
import MobileLayout from './components/Mobile/MobileLayout';
import './index.css';

const VITE_API = import.meta.env.VITE_API_URL || 'https://earthonline.onrender.com';




function Dashboard({ token, onLogout, region }) {
  const { t, language, setLanguage } = useLanguage();
  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline.onrender.com';
  const API_URL = `${BASE_URL}/api/${region}`;
  const SOCKET_URL = BASE_URL;
  const game = useGame();
  const { socket, isConnected, ping, nodes, myNode, setMyNode, myRole, globalStats, hubStats, leaderboard, currentEvent, lifespan, sessionTime, logs, addLog, isOfflineMode, engineReady, getEngineState } = game;
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
  const AD_SLOGANS = [
    { title: '🔥 子熙 Casino — 百萬獎金等你拿', lines: ['註冊即送 1000 籌碼', '邀請好友再拿 500'] },
    { title: '📱 子熙生態系 APP', lines: ['一鍵管理所有節點', '即時通知 + 遠端監控'] },
    { title: '⚡ 高速 VPS 限時優惠', lines: ['全球節點延遲 <20ms', '使用折扣碼 EARTH20'] },
    { title: '🎰 每日免費轉輪盤', lines: ['子熙 Casino 每天送', '最高 10000 籌碼！'] },
  ];
  const AD_LINKS = {
    '/ads/zixi_casino.png': 'https://zixi-casino.vercel.app/landing',
    '/ads/zixi_app.png': 'https://zixi-casino.vercel.app/app',
  };
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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return localStorage.getItem('eo_onboarding_done') !== 'true'; } catch { return true; }
  });
  const [showFactionSelect, setShowFactionSelect] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showDispatchAnim, setShowDispatchAnim] = useState(false);
  const [dispatchedCountry, setDispatchedCountry] = useState(null);
  const [mines, setMines] = useState([]);
  const [showLottery, setShowLottery] = useState(false);
  const [lotteryInventory, setLotteryInventory] = useState([]);
  const [lastLotteryResult, setLastLotteryResult] = useState(null);
  const [toast, setToast] = useState(null); // { message, type } for non-blocking notifications
  const toastTimerRef = useRef(null);
  const showToast = (msg, type) => {
    setToast({ message: msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  };
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

  const [mobileTab, setMobileTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [offlineState, setOfflineState] = useState(null);
  useEffect(() => {
    if (!isOfflineMode || !engineReady) { setOfflineState(null); return; }
    const id = setInterval(() => {
      const st = getEngineState?.();
      if (st) setOfflineState(st);
    }, 1000);
    return () => clearInterval(id);
  }, [isOfflineMode, engineReady, getEngineState]);

  const muteDurationRef = useRef(null);
  const banDurationRef = useRef(null);

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

  // Mine socket handlers
  useEffect(() => {
    if (!socket) return;
    const hMinesState = (data) => {
      setDispatchedCountry(null);
      if (Array.isArray(data)) {
        setMines(data);
        const newest = data.reduce((a, b) => a.startedAt > b.startedAt ? a : b, data[0]);
        if (newest) {
          showToast(`🚀 已在 ${newest.country} 建立礦場！Lv.${newest.level} 開始自動挖礦`, 'success');
          addLog(`[SYS] ✅ 已在 ${newest.country} 建立礦場（Lv.${newest.level}）`);
        }
      } else if (data) {
        setMines([data]);
        showToast(`🚀 已在 ${data.country} 建立礦場！Lv.${data.level} 開始自動挖礦`, 'success');
        addLog(`[SYS] ✅ 已在 ${data.country} 建立礦場（Lv.${data.level}）`);
      }
    };
    const hMineUpgrade = (data) => {
      if (data.success) {
        addLog(`[SYS] 礦場升級至 Lv.${data.level}（${data.name}）`);
        showToast(`⛏️ 礦場升級成功！Lv.${data.level} ${data.name}`, 'success');
      } else {
        addLog(`[SYS] 礦場升級失敗：${data.error}`);
        showToast(`❌ 礦場升級失敗：${data.error}`, 'error');
      }
    };
    const hMineEstablished = (data) => {
      addLog(`[SYS] ${data.username} 已在 ${data.country} 建立礦場！`);
    };
    socket.on('mines_state', hMinesState);
    socket.on('mine_state', hMinesState);
    socket.on('mine_upgrade_result', hMineUpgrade);
    socket.on('mine_established', hMineEstablished);
    return () => {
      socket.off('mines_state', hMinesState);
      socket.off('mine_state', hMinesState);
      socket.off('mine_upgrade_result', hMineUpgrade);
      socket.off('mine_established', hMineEstablished);
    };
  }, [socket]);

  // Lottery socket handlers
  useEffect(() => {
    if (!socket) return;
    const hResult = (data) => {
      setLastLotteryResult(data);
      if (data.success && data.artifact) {
        addLog(`[SYS] 抽中【${data.artifact.rarity}】遺物 (×${data.artifact.multiplier})`);
      }
    };
    const hInv = (data) => setLotteryInventory(data || []);
    const hSmelt = (data) => {
      if (data.success) addLog(`[SYS] 熔煉遺物回收 ${data.refund} PT`);
      else addLog(`[SYS] 熔煉失敗：${data.error}`);
      if (socket) socket.emit('lottery_inventory');
    };
    socket.on('lottery_result', hResult);
    socket.on('lottery_inventory', hInv);
    socket.on('lottery_smelt_result', hSmelt);
    return () => {
      socket.off('lottery_result', hResult);
      socket.off('lottery_inventory', hInv);
      socket.off('lottery_smelt_result', hSmelt);
    };
  }, [socket]);

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
      if (data.message?.startsWith('✅')) showToast(data.message, 'success');
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
    const duration = parseInt(muteDurationRef.current?.value || '5', 10);
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
    const duration = parseInt(banDurationRef.current?.value || '1440', 10);
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
      position: 'relative',
      boxShadow: [
        getEventGlow(),
        myNode?.cosmetics?.neon_strip ? 'inset 0 0 60px rgba(255,0,255,0.12), 0 0 30px rgba(255,0,255,0.08)' : ''
      ].filter(Boolean).join(', ') || 'none',
      transition: 'box-shadow 1s ease-in-out'
    }}>
      <GameBackground />
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
          <Globe2 color="#f59e0b" size={24} /> 
          <PixelWordArt text={t('地球在線')} size={20} color="#f59e0b" depth={2} />
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
            {!isConnected && isOfflineMode && (
              <span style={{color: 'var(--warning-color)', fontWeight: 'bold', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'}}>
                ⚡ {t('離線模式')}
              </span>
            )}
            {!isConnected && !engineReady && <span style={{color: 'var(--danger-color)', fontWeight: 'bold'}}>[{t('已斷線')}]</span>}
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
              <button className="dropdown-item" style={{color: '#f59e0b'}} onClick={() => { setShowLottery(true); setDropdownOpen(false); if (socket?.connected) socket.emit('lottery_inventory'); }}>
                🎲 {t('秘寶抽獎')}
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

          <button onClick={() => setShowWorldMap(true)} style={{padding: '5px 12px', borderRadius: '8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace'}}>
            🌍 {t('世界地圖')}
          </button>
          <button onClick={toggleBgm} style={{padding: '5px 12px', borderRadius: '8px', background: bgmEnabled ? 'rgba(0,255,136,0.1)' : 'rgba(255,50,50,0.1)', border: bgmEnabled ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,50,50,0.3)', color: bgmEnabled ? 'var(--success-color)' : 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace'}} title={bgmEnabled ? t('關閉背景音樂') : t('開啟背景音樂')}>
{bgmEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
{bgmEnabled ? 'BGM ON' : 'BGM OFF'}
</button>
          <button onClick={onLogout} className="logout-btn" style={{padding: '5px 15px', borderRadius: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', color: 'var(--danger-color)', cursor: 'pointer'}}>{t('登出 / 切換帳號')}</button>
        </div>
      </header>

      {isMobile ? (
        <MobileLayout
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          t={t}
          myNode={myNode}
          lifespan={lifespan}
          isOfflineMode={isOfflineMode}
          offlineState={offlineState}
          globalStats={globalStats}
          socket={socket}
          logs={logs}
          chatInput={chatInput}
          setChatInput={setChatInput}
          addLog={addLog}
          ping={ping}
          nodes={nodes}
          currentEvent={currentEvent}
          bgStyle={bgStyle}
          setBgStyle={setBgStyle}
          theme={theme}
          themes={themes}
          setTheme={setTheme}
          bgmEnabled={bgmEnabled}
          toggleBgm={toggleBgm}
          notificationEnabled={notificationEnabled}
          setNotificationEnabled={setNotificationEnabled}
          boundDiscord={boundDiscord}
          myRole={myRole}
          honor={myNode?.honor || 0}
          weeklyScore={myNode?.weeklyScore || 0}
          region={region}
          onLogout={onLogout}
          onOpenShop={() => setShowShopModal(true)}
          onOpenBackpack={() => setShowBackpack(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenTalent={() => { setShowTalentModal(true); if (socket?.connected) socket.emit('get_talent_data'); }}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenWar={() => { setShowWarPanel(true); if (socket?.connected) socket.emit('get_war_stats'); }}
          onOpenAbout={() => setShowAboutModal(true)}
          onOpenAccountInfo={() => setShowAccountInfo(true)}
          onOpenDiscordBind={() => setShowDiscordModal(true)}
          onOpenSocial={() => setShowSocialModal(true)}
          pmData={{ showPm, pmTarget, pmInput, setPmInput, pmLog }}
          onClosePm={() => setShowPm(false)}
          language={language}
          setLanguage={setLanguage}
        />
      ) : (
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
              <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-color)'}}>
                {isOfflineMode && offlineState ? formatTime(offlineState.accumulatedTime) : formatTime(lifespan)}
              </span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: '0.8rem', color: '#888'}}>{t('累積點數')}</span>
              <span style={{fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)'}}>
                {isOfflineMode && offlineState ? Math.floor(offlineState.accumulatedBonusPoints).toLocaleString() : (myNode?.accumulatedBonusPoints || 0).toLocaleString()}
              </span>
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
      )}

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
                          <select ref={muteDurationRef} defaultValue="5" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}>
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
                          <select ref={banDurationRef} defaultValue="1440" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none' }}>
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
            {window.electronAPI && (
              <>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('無邊框視窗')}</span>
                  <button
                    onClick={async () => {
                      const frameless = await window.electronAPI.toggleFrameless();
                      addLog(`[SYS] 無邊框模式: ${frameless ? '開啟' : '關閉'}（下次啟動生效）`);
                    }}
                    style={{
                      background: 'var(--bg-light)', border: '1px solid var(--border-color)',
                      color: 'var(--accent-color)', padding: '4px 12px', borderRadius: '6px',
                      cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-sans)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {t('切換 (重啟生效)')}
                  </button>
                </div>
                <div style={{ marginTop: '10px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  {t('視窗位置與大小會自動記憶')}
                </div>
              </>
            )}
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

      {showOnboarding && myNode && (
        <OnboardingGuide onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('eo_onboarding_done', 'true');
          setShowFactionSelect(true);
        }} />
      )}

      {showFactionSelect && myNode && (
        <div className="modal-overlay" onClick={() => setShowFactionSelect(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a1a2e', border: '2px solid #00ff41', padding: '30px',
            maxWidth: '420px', width: '90%', borderRadius: '0',
            boxShadow: '0 0 40px rgba(0,255,65,0.15)',
          }}>
            <FactionSelect
              existingFaction={null}
              onSelect={(faction) => {
                if (socket?.connected) socket.emit('select_faction', faction);
                setShowFactionSelect(false);
                if (window.electronAPI) {
                  window.electronAPI.updatePresence({ details: `陣營: ${faction}`, state: '探索地球在線' });
                }
                showToast(`✅ 已選擇陣營：${faction}`, 'success');
              }}
              onSkip={() => setShowFactionSelect(false)}
            />
          </div>
        </div>
      )}

      {showWorldMap && myNode && (
        <div className="modal-overlay" onClick={() => setShowWorldMap(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90vw', height: '80vh', maxWidth: '800px',
            background: '#0a1628', border: '2px solid #00ff41',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
              onClick={() => setShowWorldMap(false)}>✕</div>
            <WorldMap
              players={nodes || []}
              onCountryClick={(c) => setSelectedCountry(c)}
              style={{ width: '100%', height: '100%' }}
            />
            {selectedCountry && (
              <CountryInfoPanel
                country={selectedCountry}
                hasMine={mines.some(m => m.country === selectedCountry.name)}
                dispatching={dispatchedCountry === selectedCountry.name}
                onEstablish={(countryName) => {
                  const hasMineInCountry = mines.some(m => m.country === countryName);
                  if (!hasMineInCountry && socket?.connected) {
                    setDispatchedCountry(countryName);
                    setShowDispatchAnim(true);
                    socket.emit('establish_mine', { country: countryName });
                    setTimeout(() => setDispatchedCountry(null), 5000);
                  }
                  setShowWorldMap(false);
                  setSelectedCountry(null);
                  if (hasMineInCountry) setTimeout(() => {
                    if (socket?.connected) {
                      socket.emit('get_mine', { country: countryName });
                      showToast('⛏️ 前往礦場', 'success');
                    }
                  }, 300);
                }}
                onClose={() => setSelectedCountry(null)}
              />
            )}
          </div>
        </div>
      )}

      {mines.length > 0 && socket?.connected && (
        <MinePanel
          mines={mines}
          pt={myNode?.accumulatedBonusPoints || 0}
          onUpgrade={(mineId) => socket.emit('upgrade_mine', { mineId })}
          onClose={() => setMines([])}
        />
      )}

      {showLottery && (
        <LotteryModal
          pt={myNode?.accumulatedBonusPoints || 0}
          artifacts={lotteryInventory}
          lastResult={lastLotteryResult}
          onDraw={() => { if (socket?.connected) socket.emit('lottery_draw'); }}
          onSmelt={(id) => { if (socket?.connected) socket.emit('lottery_smelt', id); }}
          onClose={() => { setShowLottery(false); setLastLotteryResult(null); }}
        />
      )}

      {showDispatchAnim && dispatchedCountry && (
        <DispatchAnimation
          country={dispatchedCountry}
          onComplete={() => setShowDispatchAnim(false)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99999,
          background: toast.type === 'success' ? 'rgba(0,255,65,0.12)' : 'rgba(255,65,100,0.12)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,65,0.4)' : 'rgba(255,65,100,0.4)'}`,
          borderRadius: '8px', padding: '12px 20px',
          color: toast.type === 'success' ? '#00ff41' : '#ff416c',
          fontFamily: 'monospace', fontSize: '0.85rem',
          backdropFilter: 'blur(8px)',
          boxShadow: toast.type === 'success'
            ? '0 0 20px rgba(0,255,65,0.2)'
            : '0 0 20px rgba(255,65,100,0.2)',
          animation: 'popIn 0.3s ease-out',
          maxWidth: '360px',
          pointerEvents: 'none',
        }}>
          {toast.message}
        </div>
      )}
    </div>
      )}
    </>
  );
}

function App() {
  const { t, language, setLanguage } = useLanguage();
  const [token, setToken] = useState(localStorage.getItem('eo_token'));
  const [region, setRegion] = useState(localStorage.getItem('eo_region') || 'asia');
  const APP_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline-7odc.onrender.com';

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

export default App;
