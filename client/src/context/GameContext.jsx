import React, { createContext, useContext, useState, useCallback } from 'react';
import useTimer from '../hooks/useTimer';
import useSocket from '../hooks/useSocket';
import useGameState from '../hooks/useGameState';
import { getTranslation } from '../i18n';

const GameContext = createContext(null);

export function GameProvider({ children, token, onLogout, region, SOCKET_URL, API_URL, BASE_URL }) {
  const { socket, isConnected, ping } = useSocket(SOCKET_URL, region, token, onLogout);
  const { nodes, myNode, setMyNode, myRole, globalStats, hubStats, leaderboard, currentEvent } = useGameState(socket, API_URL, BASE_URL);
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

  return (
    <GameContext.Provider value={{
      socket, isConnected, ping,
      nodes, myNode, setMyNode, myRole, globalStats, hubStats, leaderboard, currentEvent,
      lifespan, sessionTime,
      logs, addLog, setLogs,
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
