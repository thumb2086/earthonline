const { checkWeeklyReset, getWeeklyRanking } = require('../services/settlementService');

function registerSettlementHandlers(socket, connectedUsers) {
  socket.on('get_weekly_ranking', async () => {
    const ranking = await getWeeklyRanking();
    socket.emit('weekly_ranking', ranking);
  });

  socket.on('get_settlement_info', async () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const result = await checkWeeklyReset(user.username);
    const ranking = await getWeeklyRanking();
    socket.emit('settlement_info', { ...result, ranking });
  });
}

module.exports = { registerSettlementHandlers };
