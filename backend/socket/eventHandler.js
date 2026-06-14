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
      const label = choice === 'shelter' ? '避難' : '硬撐';
      socket.emit('chat_system_message', { message: `✅ 你選擇了「${label}」！${choice === 'shelter' ? '已斷線保護，風暴結束後自動補償。' : '撐過風暴可獲得 200 PT 獎勵！'}` });
      socket.emit('terminal_response', `[SYS] 你選擇了${label}`);
      if (choice === 'shelter') {
        socket.disconnect(true);
      }
    } else if (type === 'SYSTEM_MAINTENANCE' && (choice === 'assist' || choice === 'ignore')) {
      if (!state.eventChoices[choice]) state.eventChoices[choice] = [];
      state.eventChoices[choice].push(user.username);
      const label = choice === 'assist' ? '協助維護' : '漠視觀望';
      socket.emit('chat_system_message', { message: `✅ 你選擇了「${label}」！${choice === 'assist' ? '維護時間將縮短 50%。' : '事件結束後可獲得 500 PT。'}` });
      socket.emit('terminal_response', `[SYS] 你選擇了${label}`);
      if (choice === 'assist') {
        state.currentGlobalEvent.endTime = Date.now() + getEventDuration(type) / 2;
      }
    }
  });
}

module.exports = { registerEventHandlers };
