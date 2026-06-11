const { REGIONS } = require('../config/constants');

const regionStates = {};
const warStats = {};

REGIONS.forEach(region => {
  regionStates[region] = {
    connectedUsers: new Map(),
    currentGlobalEvent: null,
    multiplier: 1.0,
    activeUsers: 0,
    globalProduction: 0,
    socialCompression: '1.000'
  };
  warStats[region] = {
    totalOnlineTime: 0,      // ms accumulated this week
    avgOnlineUsers: 0,       // rolling average
    peakOnlineUsers: 0,
    eventsCompleted: 0,
    totalEvents: 0,
    totalPTEarned: 0,
    sampleCount: 0,
    weekStart: Date.now()
  };
});

function getWarStats() {
  const result = {};
  for (const region of REGIONS) {
    const ws = warStats[region];
    result[region] = {
      ...ws,
      avgOnlineUsers: ws.sampleCount > 0 ? Math.round(ws.avgOnlineUsers / ws.sampleCount) : 0,
      eventRate: ws.totalEvents > 0 ? Math.round((ws.eventsCompleted / ws.totalEvents) * 100) : 0
    };
  }
  return result;
}

function updateWarStats(region, activeUsers, ptEarned, eventActive) {
  const ws = warStats[region];
  if (!ws) return;
  ws.totalOnlineTime += 5000; // one tick = 5s
  ws.avgOnlineUsers += activeUsers;
  ws.sampleCount++;
  if (activeUsers > ws.peakOnlineUsers) ws.peakOnlineUsers = activeUsers;
  ws.totalPTEarned += ptEarned || 0;
  if (eventActive) ws.totalEvents++;
}

function recordEventCompletion(region) {
  const ws = warStats[region];
  if (ws) ws.eventsCompleted++;
}

function resetWarStats() {
  const now = Date.now();
  REGIONS.forEach(region => {
    warStats[region] = {
      totalOnlineTime: 0, avgOnlineUsers: 0, peakOnlineUsers: 0,
      eventsCompleted: 0, totalEvents: 0, totalPTEarned: 0,
      sampleCount: 0, weekStart: now
    };
  });
}

module.exports = regionStates;
module.exports.warStats = warStats;
module.exports.getWarStats = getWarStats;
module.exports.updateWarStats = updateWarStats;
module.exports.recordEventCompletion = recordEventCompletion;
module.exports.resetWarStats = resetWarStats;
