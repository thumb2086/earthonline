import { useState, useEffect, useRef } from 'react';

export default function useTimer(myNode, socket, region) {
  const [lifespan, setLifespan] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const sessionStartRef = useRef(null);
  const lifespanPausedRef = useRef(false);
  const [lifespanTick, setLifespanTick] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const onPause = () => { lifespanPausedRef.current = true; };
    const onResume = () => { lifespanPausedRef.current = false; };
    const onForceSync = () => {
      setLifespanTick(t => t + 1);
      sessionStartRef.current = Date.now();
      setSessionTime(0);
      if (socket) socket.emit('sync_user');
    };
    socket.on('tick_paused', onPause);
    socket.on('tick_resumed', onResume);
    socket.on('force_sync', onForceSync);
    // Periodically sync accumulatedTime from server to prevent local timer drift
    const syncInt = setInterval(() => {
      if (socket?.connected) socket.emit('sync_user');
    }, 30000);
    return () => { 
      socket.off('tick_paused', onPause); 
      socket.off('tick_resumed', onResume); 
      socket.off('force_sync', onForceSync);
      clearInterval(syncInt);
    };
  }, [socket]);

  useEffect(() => {
    if (!myNode || myNode.accumulatedTime === undefined) return;
    const baseMs = myNode.accumulatedTime || 0;
    const startAt = Date.now();
    setLifespan(Math.floor(baseMs / 1000));
    const id = setInterval(() => {
      if (lifespanPausedRef.current) return;
      setLifespan(Math.floor((baseMs + (Date.now() - startAt) * 1.0) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [myNode, lifespanTick]);

  useEffect(() => {
    if (!myNode) return;
    if (!sessionStartRef.current) sessionStartRef.current = Date.now();
    const interval = setInterval(() => {
      if (lifespanPausedRef.current) return;
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [myNode]);

  return { lifespan, sessionTime };
}
