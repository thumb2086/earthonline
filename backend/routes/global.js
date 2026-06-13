const express = require('express');
const router = express.Router();
const db = require('../db');
const regionStates = require('../state/regionState');

router.get('/global/stats', async (req, res) => {
  try {
    const region = req.query.region;
    if (region && regionStates[region]) {
      const pop = await db.getRegionPopulation(region);
      const state = regionStates[region];
      res.json({
        totalActiveUsers: state.activeUsers,
        totalPopulation: pop,
        globalProduction: state.globalProduction,
        socialCompression: state.socialCompression,
        multiplier: state.multiplier
      });
    } else {
      const pops = await db.getAllRegionsPopulation();
      const totalPop = Object.values(pops).reduce((a, b) => a + b, 0);
      const totalActive = Object.values(regionStates).reduce((a, s) => a + (s.activeUsers || 0), 0);
      const totalProd = Object.values(regionStates).reduce((a, s) => a + (s.globalProduction || 0), 0);
      res.json({
        totalActiveUsers: totalActive,
        totalPopulation: totalPop,
        globalProduction: totalProd,
        socialCompression: '1.000',
        multiplier: 1.0
      });
    }
  } catch (err) { console.error('[SYS] /global/stats error:', err); res.status(500).json({ error: 'Internal error' }); }
});

module.exports = router;
