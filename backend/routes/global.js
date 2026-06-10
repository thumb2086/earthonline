const express = require('express');
const router = express.Router();
const db = require('../db');
const regionStates = require('../state/regionState');

router.get('/global/stats', async (req, res) => {
  try {
    const region = 'asia';
    const pop = await db.getRegionPopulation(region);
    const state = regionStates[region];
    res.json({
      totalActiveUsers: state ? state.activeUsers : 0,
      totalPopulation: pop,
      globalProduction: state ? state.globalProduction : 0,
      socialCompression: state ? state.socialCompression : '1.000',
      multiplier: state ? state.multiplier : 1.0
    });
  } catch (err) { console.error('[SYS] /global/stats error:', err); res.status(500).json({ error: 'Internal error' }); }
});

module.exports = router;
