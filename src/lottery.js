import { logTransaction, notify } from './utils.js';

const COST_PER_TICKET = 100;
const NUM_COUNT = 6;
const NUM_MAX = 39;
const PRIZE_TABLE = { 6: 0.5, 5: 0.2, 4: 0.15, 3: 0.1 };

function todayUTC() { return new Date().toISOString().slice(0, 10); }

function generateNumbers() {
  const nums = new Set();
  while (nums.size < NUM_COUNT) nums.add(Math.floor(Math.random() * NUM_MAX) + 1);
  return [...nums].sort((a, b) => a - b);
}

function matchCount(a, b) { return a.filter(x => b.includes(x)).length; }

export async function getCurrentRound(db) {
  let round = await db.prepare("SELECT * FROM lottery_rounds WHERE status = 'open' ORDER BY id DESC LIMIT 1").first();
  if (!round) {
    const last = await db.prepare('SELECT MAX(draw_number) as n FROM lottery_rounds').first();
    const drawNum = (last?.n || 0) + 1;
    await db.prepare("INSERT INTO lottery_rounds (draw_number, winning_numbers, status) VALUES (?, '', 'open')").bind(drawNum).run();
    round = await db.prepare("SELECT * FROM lottery_rounds WHERE status = 'open' ORDER BY id DESC LIMIT 1").first();
  }
  return round;
}

export async function getLotteryStatus(db, userId) {
  const round = await getCurrentRound(db);
  const today = todayUTC();
  const dailyRow = await db.prepare('SELECT * FROM lottery_daily WHERE user_id = ?').bind(userId).first();
  const freeUsed = (dailyRow && dailyRow.date === today) ? (dailyRow.free_used || 0) : 0;
  const myTickets = await db.prepare('SELECT COUNT(*) as c FROM lottery_tickets WHERE round_id = ? AND user_id = ?').bind(round.id, userId).first();
  const totalTickets = await db.prepare('SELECT COUNT(*) as c FROM lottery_tickets WHERE round_id = ?').bind(round.id).first();
  const myTicketsList = await db.prepare('SELECT numbers, prize, matches FROM lottery_tickets WHERE round_id = ? AND user_id = ? ORDER BY created_at DESC').bind(round.id, userId).all();
  return {
    roundId: round.id,
    drawNumber: round.draw_number,
    totalPool: round.total_pool,
    totalTickets: totalTickets?.c || 0,
    myTickets: myTickets?.c || 0,
    myTicketsList: (myTicketsList?.results || []).map(t => ({
      numbers: t.numbers,
      prize: t.prize,
      matches: t.matches,
    })),
    freeUsed,
    cost: COST_PER_TICKET,
  };
}

export async function buyTicket(db, userId, numbers, isFree) {
  const round = await getCurrentRound(db);
    if (isFree) {
    const today = todayUTC();
    const row = await db.prepare('SELECT * FROM lottery_daily WHERE user_id = ?').bind(userId).first();
    const freeUsed = (row && row.date === today) ? (row.free_used || 0) : 0;
    if (freeUsed >= 5) return { error: '今日免費次數已用完' };
    if (row && row.date === today) {
      await db.prepare('UPDATE lottery_daily SET free_used = free_used + 1 WHERE user_id = ?').bind(userId).run();
    } else {
      await db.prepare('INSERT INTO lottery_daily (user_id, date, free_used) VALUES (?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET date = excluded.date, free_used = 1').bind(userId, today).run();
    }
  } else {
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(userId).first();
    if (!wallet || wallet.cash < COST_PER_TICKET) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(COST_PER_TICKET, userId).run();
    await logTransaction(db, userId, 'lottery_cost', -COST_PER_TICKET, '樂透購票');
  }

  const nums = Array.isArray(numbers) ? numbers.sort((a, b) => a - b) : generateNumbers();
  const numsStr = nums.join(',');
  await db.prepare('INSERT INTO lottery_tickets (round_id, user_id, numbers, cost, created_at) VALUES (?, ?, ?, ?, ?)').bind(round.id, userId, numsStr, isFree ? 0 : COST_PER_TICKET, Date.now()).run();
  await db.prepare('UPDATE lottery_rounds SET total_pool = total_pool + ?, total_tickets = total_tickets + 1 WHERE id = ?').bind(isFree ? 0 : COST_PER_TICKET, round.id).run();

  return { success: true, numbers: nums, roundId: round.id };
}

export async function drawLottery(db) {
  const round = await db.prepare("SELECT * FROM lottery_rounds WHERE status = 'open' ORDER BY id DESC LIMIT 1").first();
  if (!round || round.total_tickets === 0) {
    if (round) await db.prepare("UPDATE lottery_rounds SET status = 'drawn', drawn_at = ? WHERE id = ?").bind(Date.now(), round.id).run();
    return { skip: true };
  }

  const winning = generateNumbers();
  await db.prepare("UPDATE lottery_rounds SET winning_numbers = ?, status = 'drawn', drawn_at = ? WHERE id = ?")
    .bind(winning.join(','), Date.now(), round.id).run();

  const tickets = await db.prepare('SELECT * FROM lottery_tickets WHERE round_id = ?').bind(round.id).all();
  const winners = [];

  for (const ticket of tickets.results) {
    const matches = matchCount(ticket.numbers.split(',').map(Number), winning);
    const pct = PRIZE_TABLE[matches] || 0;
    if (pct > 0) {
      const prize = Math.floor(round.total_pool * pct / Math.max(1, tickets.results.filter(t => matchCount(t.numbers.split(',').map(Number), winning) === matches).length));
      await db.prepare('UPDATE lottery_tickets SET prize = ?, matches = ? WHERE id = ?').bind(prize, matches, ticket.id).run();
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(prize, prize, ticket.user_id).run();
      await logTransaction(db, ticket.user_id, 'lottery_prize', prize, `樂透 ${matches} 號中獎`);
      await notify(db, ticket.user_id, 'lottery_prize', `🎰 樂透開獎！你猜中 ${matches} 號，獲得 $${prize.toLocaleString()}`);
      winners.push({ userId: ticket.user_id, matches, prize });
    } else {
      await db.prepare('UPDATE lottery_tickets SET matches = ? WHERE id = ?').bind(matches, ticket.id).run();
    }
  }

  return { winning, totalPool: round.total_pool, winners, totalWinners: winners.length };
}

export async function getLotteryHistory(db, limit = 10) {
  return await db.prepare('SELECT * FROM lottery_rounds WHERE status = ? ORDER BY draw_number DESC LIMIT ?').bind('drawn', limit).all();
}
