import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import useTimer from '../hooks/useTimer';
import useSocket from '../hooks/useSocket';
import useGameState from '../hooks/useGameState';
import GameEngine from '../engine/GameEngine';
import { loadGameState, saveGameState, startAutoSave } from '../engine/StorageAdapter';
import { getTranslation } from '../i18n';

const GameContext = createContext(null);

export function GameProvider({ children, token, onLogout, region, SOCKET_URL, API_URL, BASE_URL }) {
  const { socket, isConnected, ping } = useSocket(SOCKET_URL, region, token, onLogout);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef(null);
  const autoStopRef = useRef(null);

  const gameStateResult = useGameState(socket, API_URL, BASE_URL);
  const { myNode, setMyNode } = gameStateResult;

  const { lifespan, sessionTime } = useTimer(myNode, socket, region);

  const lang = typeof window !== 'undefined' ? localStorage.getItem('eo_lang') || 'zh' : 'zh';
  const t = (key) => getTranslation(lang, key);

  const [logs, setLogs] = useState([
    { text: `[SYS] ${t('地球在線連線建立中...')}`, time: new Date().toISOString().substring(11, 19) },
    { text: `[SYS] ${t('進入全球節點網路...')}`, time: new Date().toISOString().substring(11, 19) }
  ]);

  const addLog = useCallback((msg, extra = {}) => {
    setLogs(prev => {
      const time = new Date().toISOString().substring(11, 19);
      const logObj = { time, text: typeof msg === 'string' ? msg : msg.text, ...extra };
      if (typeof msg === 'string') {
        logObj.isChat = msg.includes('[CHAT]');
        logObj.isDiscordChat = msg.includes('[DC_CHAT]');
        logObj.isWarning = msg.includes('警告');
      }
      return [...prev, logObj].slice(-150);
    });
  }, []);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    loadGameState().then((saved) => {
      if (saved) {
        engine.importState(saved);
        addLog(`[SYS] 已從本地存檔恢復 (${new Date(saved.savedAt).toLocaleTimeString()})`);
      }
      engine.init({}, region);
      engine.onTick = (state) => {
        saveGameState(state);
      };
      const stopAutoSave = startAutoSave(engine);
      autoStopRef.current = stopAutoSave;
      setEngineReady(true);
    });

    return () => {
      engine.destroy();
      if (autoStopRef.current) autoStopRef.current();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current || !myNode) return;
    engineRef.current.updateFromServer(myNode);
  }, [myNode]);

  useEffect(() => {
    if (!engineRef.current) return;
    if (!isConnected && engineReady) {
      engineRef.current.running = true;
      engineRef.current.startTicker();
      addLog('[SYS] 伺服器斷線，啟動離線模式 — 本地引擎持續運作');
    }
  }, [isConnected, engineReady]);

  const getEngineState = useCallback(() => {
    return engineRef.current ? engineRef.current.exportState() : null;
  }, []);

  const isOfflineMode = !isConnected && engineReady;

  const survivalTime = myNode?.survivalTime || 0;
  const health = myNode?.health ?? 100;
  const pt = myNode?.pt ?? 0;

  useEffect(() => {
    if (!window.electronAPI || !myNode) return;
    const sendPresence = () => {
      const hrs = Math.floor(survivalTime / 3600);
      const mins = Math.floor((survivalTime % 3600) / 60);
      if (window.electronAPI?.updatePresence) {
        window.electronAPI.updatePresence({
          details: `${myNode.nickname || 'Node'} | ${region.toUpperCase()} | ${pt.toLocaleString()} PT`,
          state: `存活 ${hrs}h ${mins}m | 健康度 ${Math.round(health)}%`,
          startTimestamp: Date.now(),
          smallImageKey: 'user_icon',
          smallImageText: myNode.nickname || 'Survivor',
          buttons: [{ label: '加入遊戲', url: 'https://earthonline.qzz.io' }],
        });
      }
      if (window.electronAPI?.setProgress) {
        window.electronAPI.setProgress(health / 100);
      }
    };
    sendPresence();
    const interval = setInterval(sendPresence, 20000);
    return () => clearInterval(interval);
  }, [myNode, region, survivalTime, health, pt]);

  return (
    <GameContext.Provider value={{
      socket, isConnected, ping,
      ...gameStateResult,
      lifespan, sessionTime,
      logs, addLog, setLogs,
      engine: engineRef.current,
      engineReady,
      isOfflineMode,
      getEngineState,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
