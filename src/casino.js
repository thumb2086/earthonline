import { logTransaction } from './utils.js';

const HOUSE_EDGE = 0.05;

const GAMES = {
  sicbo: { label: '骰寶', minBet: 100, maxBet: 100000 },
  blackjack: { label: '21點', minBet: 500, maxBet: 500000 },
  roulette: { label: '輪盤', minBet: 100, maxBet: 100000 },
  slots: { label: '老虎機', minBet: 100, maxBet: 10000 },
};

function playSicbo(bet) {
  const { type, amount } = bet;
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const d3 = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2 + d3;
  const isTriple = d1 === d2 && d2 === d3;
  let payout = 0;
  if (type === 'big' && total >= 11 && total <= 17 && !isTriple) payout = amount * 2;
  else if (type === 'small' && total >= 4 && total <= 10 && !isTriple) payout = amount * 2;
  else if (type === 'triple' && isTriple) payout = amount * 30;
  else if (type === 'odd' && total % 2 !== 0 && !isTriple) payout = amount * 2;
  else if (type === 'even' && total % 2 === 0 && !isTriple) payout = amount * 2;
  return { game: 'sicbo', dice: [d1, d2, d3], total, win: payout > 0, payout, profit: payout - amount };
}

function drawCard() {
  return [2,3,4,5,6,7,8,9,10,10,10,10,11][Math.floor(Math.random() * 13)];
}

function handValue(hand) {
  let sum = hand.reduce((s, c) => s + c, 0);
  let aces = hand.filter(c => c === 11).length;
  while (sum > 21 && aces > 0) { sum -= 10; aces--; }
  return sum;
}

function playBlackjack(bet) {
  const { amount } = bet;
  let player = [drawCard(), drawCard()];
  let dealer = [drawCard(), drawCard()];
  while (handValue(player) < 17) player.push(drawCard());
  const pv = handValue(player);
  if (pv > 21) return { game: 'blackjack', player, dealer, playerValue: pv, dealerValue: handValue(dealer), win: false, payout: 0, profit: -amount };
  while (handValue(dealer) < 17) dealer.push(drawCard());
  const dv = handValue(dealer);
  let payout = 0;
  const isNatural = player.length === 2 && pv === 21;
  if (dv > 21 || pv > dv) payout = isNatural ? Math.floor(amount * 3.5) : amount * 2;
  else if (pv === dv) payout = amount;
  return { game: 'blackjack', player, dealer, playerValue: pv, dealerValue: dv, win: payout > amount, payout, profit: payout - amount };
}

function playRoulette(bet) {
  const { type, number, amount } = bet;
  const result = Math.floor(Math.random() * 37);
  const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(result);
  let payout = 0;
  if (type === 'number' && number === result) payout = amount * 35;
  else if (type === 'red' && isRed && result > 0) payout = amount * 2;
  else if (type === 'black' && !isRed && result > 0) payout = amount * 2;
  else if (type === 'odd' && result > 0 && result % 2 !== 0) payout = amount * 2;
  else if (type === 'even' && result > 0 && result % 2 === 0) payout = amount * 2;
  else if (type === 'low' && result >= 1 && result <= 18) payout = amount * 2;
  else if (type === 'high' && result >= 19 && result <= 36) payout = amount * 2;
  return { game: 'roulette', result, isRed, win: payout > 0, payout, profit: payout - amount };
}

function playSlots(bet) {
  const { amount } = bet;
  const symbols = ['🍒','🍋','🍊','🍇','💎','🔔','⭐','7️⃣'];
  const r = () => symbols[Math.floor(Math.random() * symbols.length)];
  const s1 = r(), s2 = r(), s3 = r();
  let payout = 0;
  if (s1 === s2 && s2 === s3) {
    if (s1 === '7️⃣') payout = amount * 50;
    else if (s1 === '💎') payout = amount * 20;
    else payout = amount * 10;
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    payout = amount * 3;
  }
  return { game: 'slots', symbols: [s1, s2, s3], win: payout > 0, payout, profit: payout - amount };
}

export async function handleCasino(env, request, path, user) {
  const db = env.DB;
  const method = request.method;

  if (path === '/api/casino/games') return GAMES;

  if (path === '/api/casino/stats') {
    try {
      const total = await db.prepare('SELECT COUNT(*) as games, COALESCE(SUM(amount), 0) as wagered FROM casino_history WHERE user_id = ?').bind(user.id).first();
      const wins = await db.prepare('SELECT COUNT(*) as w, COALESCE(SUM(payout - amount), 0) as profit FROM casino_history WHERE user_id = ? AND payout > amount').bind(user.id).first();
      return { games: total?.games || 0, wagered: total?.wagered || 0, wins: wins?.w || 0, netProfit: wins?.profit || 0 };
    } catch (e) {
      return { games: 0, wagered: 0, wins: 0, netProfit: 0 };
    }
  }

  if (path === '/api/casino/play' && method === 'POST') {
    const { game, amount, betType, number } = await request.json().catch(() => ({}));
    const gameInfo = GAMES[game];
    if (!gameInfo) return { error: '無效遊戲' };
    if (!amount || amount < gameInfo.minBet) return { error: `最低投注 $${gameInfo.minBet.toLocaleString()}` };
    if (amount > gameInfo.maxBet) return { error: `最高投注 $${gameInfo.maxBet.toLocaleString()}` };

    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < amount) return { error: '餘額不足' };

    let result;
    const bet = { amount, type: betType || 'big', number: number || 0 };
    if (game === 'sicbo') result = playSicbo(bet);
    else if (game === 'blackjack') result = playBlackjack(bet);
    else if (game === 'roulette') result = playRoulette(bet);
    else if (game === 'slots') result = playSlots(bet);
    else return { error: '無效遊戲' };

    const profit = result.profit;
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(profit, user.id).run();
    await logTransaction(db, user.id, profit >= 0 ? 'casino_win' : 'casino_lose', profit, `${gameInfo.label} ${result.win ? '贏' : '輸'} $${Math.abs(profit).toLocaleString()}`);
    await db.prepare('INSERT INTO casino_history (user_id, game, amount, payout, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, game, amount, result.payout, Date.now()).run();

    return { ...result, cash: wallet.cash + profit };
  }

  return null;
}
