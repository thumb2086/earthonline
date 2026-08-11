import { logTransaction, logHourly } from './utils.js';
import { getRates } from './rates.js';

const LOAN_BASE_RATE = 0.0015;

export async function handleBank(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/bank/info') {
    const wallet = await db.prepare('SELECT cash, savings, bank FROM wallets WHERE user_id = ?').bind(user.id).first();
    const loans = await db.prepare("SELECT * FROM loans WHERE user_id = ? AND status = 'active'").bind(user.id).all();
    const totalDebt = loans.results.reduce((s, l) => s + l.remaining, 0);
    const totalInterest = loans.results.reduce((s, l) => s + Math.floor(l.remaining * l.interest_rate), 0);
    const rates = await getRates(db);
    return { ...wallet, loans: loans.results, totalDebt, interestPerMin: totalInterest, savingsRate: rates.savings_rate };
  }
  if (path === '/api/bank/deposit') {
    const { amount } = await request.json();
    if (!Number.isInteger(amount) || amount <= 0) return { error: '金額必須大於 0' };
    const resDep = await db.prepare('UPDATE wallets SET cash = cash - ?, savings = savings + ? WHERE user_id = ? AND cash >= ?').bind(amount, amount, user.id, amount).run();
    if (resDep.meta.changes === 0) return { error: '餘額不足' };
    await logTransaction(db, user.id, 'bank_deposit', -amount, `活存存入 $${amount.toLocaleString()}`);
    return { success: true };
  }

  if (path === '/api/bank/withdraw') {
    const { amount } = await request.json();
    if (!Number.isInteger(amount) || amount <= 0) return { error: '金額必須大於 0' };
    const resWd = await db.prepare('UPDATE wallets SET cash = cash + ?, savings = savings - ? WHERE user_id = ? AND savings >= ?').bind(amount, amount, user.id, amount).run();
    if (resWd.meta.changes === 0) return { error: '活存不足' };
    await logTransaction(db, user.id, 'bank_withdraw', amount, `活存提款 $${amount.toLocaleString()}`);
    return { success: true };
  }

  if (path === '/api/bank/borrow') {
    const { amount } = await request.json();
    if (!Number.isInteger(amount) || amount <= 0) return { error: '金額必須大於 0' };
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

export async function processBankTick(db, logger) {
  const rates = await getRates(db);
  const savingsRate = rates.savings_rate;
  const stmts = [];
  const logs = [];

  // 活存利息: 小數累積到 savings_acc, 滿 $1 才發放
  const users = await db.prepare('SELECT user_id, savings, COALESCE(savings_acc, 0) as acc FROM wallets WHERE savings > 0').all();
  for (const u of users.results) {
    const acc = (u.acc || 0) + u.savings * savingsRate;
    const payout = Math.floor(acc);
    if (payout > 0) {
      stmts.push(db.prepare('UPDATE wallets SET cash = cash + ?, savings_acc = ? WHERE user_id = ?').bind(payout, acc - payout, u.user_id));
      logs.push([u.user_id, 'bank_interest', payout, '活存利息']);
    } else {
      stmts.push(db.prepare('UPDATE wallets SET savings_acc = ? WHERE user_id = ?').bind(acc, u.user_id));
    }
  }

  // 貸款利息: 1 次 batch 預載貸款的錢包現金, 迴圈內零查詢
  const [loansRes, walletsRes] = await db.batch([
    db.prepare("SELECT id, user_id, remaining, interest_rate FROM loans WHERE status = 'active'"),
    db.prepare('SELECT user_id, cash FROM wallets'),
  ]);
  const walletCash = {};
  for (const w of walletsRes.results) walletCash[w.user_id] = w.cash;
  for (const loan of loansRes.results) {
    const interest = Math.floor(loan.remaining * loan.interest_rate);
    const cash = walletCash[loan.user_id];
    if (cash !== undefined && cash >= interest) {
      stmts.push(db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(interest, loan.user_id));
      stmts.push(db.prepare('UPDATE loans SET remaining = remaining + ? WHERE id = ?').bind(interest, loan.id));
      logs.push([loan.user_id, 'loan_interest', -interest, '貸款利息']);
    } else if (cash !== undefined && cash > 0) {
      stmts.push(db.prepare('UPDATE wallets SET cash = 0 WHERE user_id = ?').bind(loan.user_id));
      stmts.push(db.prepare('UPDATE loans SET remaining = remaining + ? WHERE id = ?').bind(interest, loan.id));
      logs.push([loan.user_id, 'loan_interest', -cash, '貸款利息(現金不足)']);
    } else {
      stmts.push(db.prepare('UPDATE loans SET remaining = remaining + ? WHERE id = ?').bind(interest, loan.id));
    }
  }

  if (stmts.length > 0) await db.batch(stmts);
  if (logger) {
    for (const [u, t, a, d] of logs) logger.log(u, t, a, d);
  } else {
    for (const [u, t, a, d] of logs) await logHourly(db, u, t, a, d);
  }
}
