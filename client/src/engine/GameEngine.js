const BASE_DECAY_PER_TICK = 0.2 / 30;
const TIME_EARNED_PER_TICK = 5000;
const BASE_PT_MULTIPLIER = 25;
const COLLECTIVE_LOAD_THRESHOLD = 20;
const TICK_INTERVAL = 5000;
const LEVEL_PER_HOUR = 1;

export default class GameEngine {
  constructor() {
    this.state = {
      accumulatedTime: 0,
      accumulatedBonusPoints: 0,
      weeklyScore: 0,
      health: 100,
      inventory: {},
      activeBuffs: {},
      level: 1,
      talentPoints: 0,
      talents: {},
      quests: {},
      achievements: { unlocked: [], total: 0 },
      honor: 0,
      username: null,
      region: null,
    };
    this.lastTick = Date.now();
    this.connectedUsers = new Map();
    this.regionName = 'asia';
    this.investments = { cooling: 0, bandwidth: 0, shield: 0 };
    this.multiplier = 1.0;
    this.currentGlobalEvent = null;
    this.running = false;
    this.tickTimer = null;
    this.onTick = null;
  }

  init(initialState = {}, region = 'asia') {
    Object.assign(this.state, initialState);
    this.regionName = region;
    this.lastTick = Date.now();
    this.running = true;
    this.startTicker();
  }

  startTicker() {
    this.stopTicker();
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  stopTicker() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  updateFromServer(serverData) {
    if (!serverData) return;
    const merged = { ...this.state };
    for (const key of Object.keys(serverData)) {
      if (key === 'inventory') {
        merged.inventory = { ...this.state.inventory, ...serverData.inventory };
      } else if (key === 'activeBuffs') {
        const existing = this.state.activeBuffs || {};
        const incoming = serverData.activeBuffs || {};
        merged.activeBuffs = {};
        for (const k of Object.keys({ ...existing, ...incoming })) {
          merged.activeBuffs[k] = Math.max(existing[k] || 0, incoming[k] || 0);
        }
      } else if (key === 'achievements') {
        const existingSet = new Set(this.state.achievements?.unlocked || []);
        const incomingArr = serverData.achievements?.unlocked || [];
        incomingArr.forEach((id) => existingSet.add(id));
        merged.achievements = {
          unlocked: Array.from(existingSet),
          total: serverData.achievements?.total || this.state.achievements?.total || 0,
        };
      } else if (key === 'quests') {
        merged.quests = { ...this.state.quests, ...serverData.quests };
      } else if (key === 'talents') {
        merged.talents = { ...this.state.talents, ...serverData.talents };
      } else if (typeof serverData[key] === 'number' && typeof this.state[key] === 'number') {
        merged[key] = Math.max(this.state[key], serverData[key]);
      } else {
        merged[key] = serverData[key];
      }
    }
    this.state = merged;
  }

  importState(data) {
    if (!data) return;
    this.state = { ...this.state, ...data };
    this.lastTick = Date.now();
  }

  exportState() {
    return { ...this.state, lastSavedAt: Date.now() };
  }

  tick() {
    if (!this.running) return;
    const now = Date.now();
    const delta = (now - this.lastTick) / 1000;
    this.lastTick = now;

    const healthPct = Math.max(0, (this.state.health || 0) / 100);
    const onlineCount = this.connectedUsers.size;
    const decayReduction = 1 - (this.investments?.cooling || 0) * 0.05;
    const ptBonus = 1 + (this.investments?.bandwidth || 0) * 0.02;
    const eventBonus = this.multiplier > 1.0 ? (this.multiplier - 1.0) : 0;
    const loadMultiplier = onlineCount > COLLECTIVE_LOAD_THRESHOLD
      ? 1 + (onlineCount - COLLECTIVE_LOAD_THRESHOLD) * 0.01
      : 1;

    let isDead = (this.state.health || 0) <= 0;
    let decay = 0;

    if (!isDead) {
      const firewallActive = this.state.activeBuffs?.firewall > now;
      if (!firewallActive) {
        const survivalHours = (this.state.accumulatedTime || 0) / 3600000;
        const curveMultiplier = 1 / Math.sqrt(Math.max(survivalHours, 0.1));
        decay = BASE_DECAY_PER_TICK * curveMultiplier * loadMultiplier * decayReduction;

        const hasCooling = this.state.activeBuffs?.cooling > now;
        const hasQuantumCooling = this.state.activeBuffs?.quantum_cooling > now;
        if (hasCooling) decay *= 0.5;
        if (hasQuantumCooling) decay *= 0.7;
      }
    }

    if (isDead) {
      const hasBackup = this.state.cosmetics?.backup_node;
      if (hasBackup) {
        this.state.health = 30;
        this.state.cosmetics = { ...this.state.cosmetics, backup_node: undefined };
        isDead = false;
      }
    }

    // Passive health recovery when low (online, caps at 50)
    let recovery = 0;
    if (!isDead && (this.state.health || 0) > 0 && (this.state.health || 0) < 50) {
      const room = 50 - (this.state.health || 0);
      recovery = Math.min(room, (this.state.health || 0) < 25 ? 0.2 : 0.1);
    }

    let ptPerTick = 0;
    let timeEarned = 0;

    if (!isDead) {
      ptPerTick = healthPct * BASE_PT_MULTIPLIER * ptBonus;
      ptPerTick += eventBonus * 0.05;

      if (this.state.activeBuffs?.overclock > now) {
        ptPerTick *= 2;
      }

      if (this.state.activeBuffs?.speed > now) {
        ptPerTick *= 1.66;
      }

      if (this.state.activeBuffs?.generator_boost > now) {
        ptPerTick += 0.05;
      }

      const hasCooling = this.state.activeBuffs?.cooling > now;
      if (hasCooling && this.currentGlobalEvent?.type === 'SYSTEM_MAINTENANCE') {
        decay = 0;
        ptPerTick += 0.05;
      }

      timeEarned = TIME_EARNED_PER_TICK;
    }

    if (decay > 0) {
      this.state.health = Math.max(0, (this.state.health || 0) - decay);
    }
    if (recovery > 0) {
      this.state.health = Math.min(50, (this.state.health || 0) + recovery);
    }
    if (ptPerTick > 0) {
      this.state.accumulatedBonusPoints = (this.state.accumulatedBonusPoints || 0) + ptPerTick;
      this.state.weeklyScore = (this.state.weeklyScore || 0) + ptPerTick;
    }
    if (timeEarned > 0) {
      this.state.accumulatedTime = (this.state.accumulatedTime || 0) + timeEarned;
    }

    const newLevel = Math.floor((this.state.accumulatedTime || 0) / 3600000) + 1;
    if (newLevel > (this.state.level || 1)) {
      const gained = newLevel - (this.state.level || 1);
      this.state.level = newLevel;
      this.state.talentPoints = (this.state.talentPoints || 0) + gained;
    }

    for (const [type, expiry] of Object.entries(this.state.activeBuffs || {})) {
      if (now > expiry) {
        delete this.state.activeBuffs[type];
      }
    }

    if (this.onTick) this.onTick(this.exportState());
  }

  computeOfflineEarnings(offlineMs) {
    const cappedMs = Math.min(offlineMs, 4 * 3600 * 1000);
    const ptsGained = (cappedMs / 1000) * (1 / 3);
    const healthRecovery = Math.min(60, (cappedMs / 3600000) * 5);
    return { ptsGained, healthRecovery, offlineMs: cappedMs };
  }

  applyOfflineEarnings(offlineMs) {
    const earnings = this.computeOfflineEarnings(offlineMs);
    this.state.accumulatedBonusPoints = (this.state.accumulatedBonusPoints || 0) + earnings.ptsGained;
    this.state.accumulatedTime = (this.state.accumulatedTime || 0) + Math.min(offlineMs, 120 * 60000);
    this.state.health = Math.min(100, (this.state.health || 0) + earnings.healthRecovery);
    return earnings;
  }

  destroy() {
    this.stopTicker();
    this.running = false;
  }
}
