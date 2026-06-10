const { REGIONS } = require('../config/constants');

const regionStates = {};
REGIONS.forEach(region => {
  regionStates[region] = {
    connectedUsers: new Map(),
    currentGlobalEvent: null,
    multiplier: 1.0,
    activeUsers: 0,
    globalProduction: 0,
    socialCompression: '1.000'
  };
});

module.exports = regionStates;
