const db = require('../db');

async function runStartupMigrations() {
  try {
    await db.migrateOfflineTime();
  } catch (err) {
    console.error('[SYS] Migration failed:', err);
  }
}

module.exports = { runStartupMigrations };
