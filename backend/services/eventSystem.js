const User = require('../models/User');
const { GLOBAL_EVENT_TYPES } = require('../config/constants');

function getRandomEvent() {
  return GLOBAL_EVENT_TYPES[Math.floor(Math.random() * GLOBAL_EVENT_TYPES.length)];
}

function getEventMultiplier(type, connectedUserCount) {
  switch (type) {
    case 'QUANTUM_BURST': return 3.0;
    case 'DATA_GOLD_RUSH': return 5.0;
    case 'DATA_BLACK_MARKET': return 3.0;
    case 'SYSTEM_MAINTENANCE': return 0.5;
    case 'SATELLITE_ALIGNMENT': return 1.0 + (connectedUserCount * 0.1);
    default: return 1.0;
  }
}

function getEventDuration(type) {
  switch (type) {
    case 'QUANTUM_BURST': return 2 * 60 * 60 * 1000;
    case 'SATELLITE_ALIGNMENT': return 2 * 60 * 60 * 1000;
    case 'DATA_BLACK_MARKET': return 5 * 60 * 1000;
    case 'SYSTEM_MAINTENANCE': return 30 * 60 * 1000;
    case 'DATA_GOLD_RUSH': return 15 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

async function applyEventEndRewards(type, connectedUsers, eventChoices) {
  if (connectedUsers.size === 0) return;
  const usernames = Array.from(connectedUsers.values()).map(u => u.username);

  if (type === 'SOLAR_STORM') {
    if (eventChoices) {
      // Shelter: disconnect 10min, -50PT, health unchanged
      if (eventChoices.shelter?.length) {
        await User.updateMany(
          { username: { $in: eventChoices.shelter } },
          { $inc: { accumulatedBonusPoints: -50 } }
        ).catch(console.error);
      }
      // Ride out: stay connected, +400PT, -15% HP
      if (eventChoices.rideOut?.length) {
        await User.updateMany(
          { username: { $in: eventChoices.rideOut } },
          { $inc: { accumulatedBonusPoints: 400, health: -15 } }
        ).catch(console.error);
      }
    } else {
      await User.updateMany(
        { username: { $in: usernames } },
        { $inc: { accumulatedBonusPoints: 200 } }
      ).catch(console.error);
    }
  } else if (type === 'SYSTEM_MAINTENANCE') {
    if (eventChoices) {
      // Assist: pay 100PT, shorten maintenance by 50%
      if (eventChoices.assist?.length) {
        await User.updateMany(
          { username: { $in: eventChoices.assist } },
          { $inc: { accumulatedBonusPoints: -100 } }
        ).catch(console.error);
      }
      // Ignore: normal wait, get 500PT
      if (eventChoices.ignore?.length) {
        await User.updateMany(
          { username: { $in: eventChoices.ignore } },
          { $inc: { accumulatedBonusPoints: 500 } }
        ).catch(console.error);
      }
    } else {
      await User.updateMany(
        { username: { $in: usernames } },
        { $inc: { accumulatedBonusPoints: 500 } }
      ).catch(console.error);
    }
  }
}

function createVoteSession(state, nsp) {
  const options = [];
  const pool = [...GLOBAL_EVENT_TYPES];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    options.push(pool.splice(idx, 1)[0]);
  }
  state.eventVote = {
    options,
    votes: {},
    endTime: Date.now() + 120000, // 2 min
    triggered: false
  };
  nsp.emit('event_vote_start', { options, endTime: state.eventVote.endTime });
}

function castVote(state, username, selectedEvent) {
  if (!state.eventVote || Date.now() >= state.eventVote.endTime) return false;
  if (!state.eventVote.options.includes(selectedEvent)) return false;
  state.eventVote.votes[username] = selectedEvent;
  return true;
}

function tallyVote(state) {
  if (!state.eventVote) return null;
  const tally = {};
  Object.values(state.eventVote.votes).forEach(event => {
    tally[event] = (tally[event] || 0) + 1;
  });
  let winner = state.eventVote.options[0];
  let maxVotes = 0;
  state.eventVote.options.forEach(opt => {
    if ((tally[opt] || 0) > maxVotes) {
      maxVotes = tally[opt];
      winner = opt;
    }
  });
  state.eventVote = null;
  return winner;
}

module.exports = {
  getRandomEvent,
  getEventDuration,
  getEventMultiplier,
  applyEventEndRewards,
  createVoteSession,
  castVote,
  tallyVote
};
