import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(SOCKET_URL, region, token, onLogout) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState(0);

  useEffect(() => {
    const s = io(`${SOCKET_URL}/${region}`);

    s.on('connect', () => {
      s.emit('authenticate', { token });
      setIsConnected(true);
    });

    s.on('auth_error', (data) => {
      const msg = data?.message || '授權已過期，請重新登入';
      alert(msg);
      setIsConnected(false);
      onLogout();
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Ping/pong
    let pingStart = 0;
    s.on('pong', () => {
      setPing(Date.now() - pingStart);
    });
    const pingInterval = setInterval(() => {
      if (s.connected) {
        pingStart = Date.now();
        s.emit('ping');
      }
    }, 2000);

    setSocket(s);

    return () => {
      clearInterval(pingInterval);
      s.removeAllListeners();
      s.disconnect();
    };
  }, [token, onLogout, region, SOCKET_URL]);

  return { socket, isConnected, ping, setSocket };
}
