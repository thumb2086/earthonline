const { createVoteSession, castVote, tallyVote, applyEventEndRewards, getEventDuration } = require('../services/eventSystem');

function registerEventHandlers(socket, nspIo, state) {
  socket.on('event_vote', ({ event }) => {
    const user = state.connectedUsers.get(socket.id);
    if (!user) return;
    if (castVote(state, user.username, event)) {
      nspIo.emit('event_vote_update', { username: user.username, event });
    }
  });

  socket.on('event_choice', async ({ choice }) => {
    const user = state.connectedUsers.get(socket.id);
    if (!user || !state.currentGlobalEvent) return;
    const type = state.currentGlobalEvent.type;
    if (!state.eventChoices) state.eventChoices = {};

    if (type === 'SOLAR_STORM' && (choice === 'shelter' || choice === 'ride_out')) {
      if (!state.eventChoices[choice]) state.eventChoices[choice] = [];
      state.eventChoices[choice].push(user.username);
      socket.emit('terminal_response', `[SYS] 你選擇了${choice === 'shelter' ? '避難' : '硬撐'}`);
      if (choice === 'shelter') {
        socket.disconnect(true);
      }
    } else if (type === 'SYSTEM_MAINTENANCE' && (choice === 'assist' || choice === 'ignore')) {
      if (!state.eventChoices[choice]) state.eventChoices[choice] = [];
      state.eventChoices[choice].push(user.username);
      socket.emit('terminal_response', `[SYS] 你選擇了${choice === 'assist' ? '協助維護' : '漠視觀望'}`);
      if (choice === 'assist') {
        // Shorten maintenance by 50%
        state.currentGlobalEvent.endTime = Date.now() + getEventDuration(type) / 2;
      }
    }
  });
}

module.exports = { registerEventHandlers };
