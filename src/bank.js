import { logTransaction, logHourly } from './utils.js';

const SAVINGS_RATE = 0.0005;
const LOAN_BASE_RATE = 0.0015;

export async function handleBank(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/bank/deposit') {
    const { amount } = await request.json();
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < amount) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ?, savings = savings + ? WHERE user_id = ?').bind(amount, amount, user.id).run();
    await logTransaction(db, user.id, 'bank_deposit', -amount, `活存存入 $${amount.toLocaleString()}`);
    return { success: true };
  }

  if (path === '/api/bank/withdraw') {
    const { amount } = await request.json();
    const wallet = await db.prepare('SELECT savings FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.savings < amount) return { error: '活存不足' };
    await db.prepare('UPDATE wallets SET cash = cash + ?, savings = savings - ? WHERE user_id = ?').bind(amount, amount, user.id).run();
    await logTransaction(db, user.id, 'bank_withdraw', amount, `活存提款 $${amount.toLocaleString()}`);
    return { success: true };
  }

  if (path === '/api/bank/borrow') {
    const { amount } = await request.json();
    const wallet = await db.prepare('SELECT total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet) return { error: '錢包不存在' };
    const maxLoan = Math.floor(wallet.total_earned * 0.5);
    if (amount > maxLoan) return { error: `最高可借 $${maxLoan}` };

    const active = await db.prepare('SELECT COALESCE(SUM(remaining), 0) as total FROM loans WHERE user_id = ? AND status = ?').bind(user.id, 'active').first();
    if (active.total + amount > maxLoan) return { error: '已超過總信用額度' };

    const rate = Math.min(LOAN_BASE_RATE * (1 + amount / 100000), 0.01);
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(amount, user.id).run();
    await db.prepare('INSERT INTO loans (user_id, amount, interest_rate, remaining, borrowed_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, amount, rate, amount, Date.now()).run();
    await logTransaction(db, user.id, 'loan', amount, `借貸 $${amount.toLocaleString()}`);
    return { success: true };
  }

  if (path.startsWith('/api/bank/repay/')) {
    const loanId = parseInt(path.split('/').pop());
    const loan = await db.prepare('SELECT remaining FROM loans WHERE id = ? AND user_id = ? AND status = ?').bind(loanId, user.id, 'active').first();
    if (!loan) return { error: '貸款不存在' };
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < loan.remaining) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(loan.remaining, user.id).run();
    await db.prepare("UPDATE loans SET remaining = 0, status = 'closed' WHERE id = ?").bind(loanId).run();
    await logTransaction(db, user.id, 'loan', -loan.remaining, `償還貸款 $${loan.remaining.toLocaleString()}`);
    return { success: true };
  }

  return null;
}

export async function processBankTick(db) {
  await db.prepare('UPDATE wallets SET cash = cash + CAST(savings * ? AS INTEGER)').bind(SAVINGS_RATE).run();

  const users = await db.prepare('SELECT id, savings FROM wallets WHERE savings > 0').all();
  for (const u of users.results) {
    const interest = Math.floor(u.savings * SAVINGS_RATE);
    if (interest > 0) await logHourly(db, u.id, 'bank_interest', interest, '活存利息');
  }

  const loans = await db.prepare("SELECT id, user_id, remaining, interest_rate FROM loans WHERE status = 'active'").all();
  for (const loan of loans.results) {
    const interest = Math.floor(loan.remaining * loan.interest_rate);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(loan.user_id).first();
    if (wallet && wallet.cash >= interest) {
      await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(interest, loan.user_id).run();
      await db.prepare('UPDATE loans SET remaining = remaining - ? WHERE id = ?').bind(interest, loan.id).run();
    } else if (wallet) {
      await db.prepare('UPDATE wallets SET cash = 0 WHERE user_id = ?').bind(loan.user_id).run();
      await db.prepare('UPDATE loans SET remaining = remaining + ? WHERE id = ?').bind(interest - wallet.cash, loan.id).run();
    } else {
      await db.prepare('UPDATE loans SET remaining = remaining + ? WHERE id = ?').bind(interest, loan.id).run();
    }
  }
}
