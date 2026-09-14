#!/usr/bin/env node
// Earth Online CLI — 終端機版遊戲
import readline from 'readline';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { me, incomeInfo, incomeUpgrade, bankInfo, bankDeposit, bankWithdraw, bankBorrow, investmentList, investmentTypes, investmentInvest, investmentWithdraw, stockIndex, stockQuote, stockBuy, stockSell, stockHoldings, leaderboard, transactions, dailyLoginStatus, dailyLoginClaim, employeeList, employeeHire, companyList, health, loginWithToken, setToken, getUser, BASE } from '../src/api.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const CLR = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m' };
const c = (color, s) => `${CLR[color]}${s}${CLR.reset}`;
const line = () => c('dim', '─'.repeat(50));
const money = (n) => `$${(n || 0).toLocaleString()}`;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function menu(options) {
  console.log();
  options.forEach((o, i) => console.log(`  ${c('cyan', `[${i + 1}]`)} ${o.label}`));
  console.log(`  ${c('dim', '[0] 返回')}`);
  const ans = await ask(c('bold', '\n> 選擇: '));
  const idx = parseInt(ans);
  if (idx >= 1 && idx <= options.length) return options[idx - 1].action;
  return null;
}

async function showProfile() {
  const u = await me();
  if (u.error) return console.log(c('red', `❌ ${u.error}`));
  console.log(line());
  console.log(c('bold', `  🪪 ${u.username}`));
  console.log(`  💰 現金 ${money(u.cash)}`);
  console.log(`  🏦 活存 ${money(u.savings)}`);
  console.log(`  📈 累計 ${money(u.total_earned)}`);
  console.log(`  ⬆️  電腦 Lv.${u.levels?.computer || 1} · 伺服器 Lv.${u.levels?.server || 1} · AI Lv.${u.levels?.ai_assistant || 1}`);
  if (u.btc) console.log(`  ₿ BTC ${u.btc}`);
  console.log(line());
}

async function showIncome() {
  const r = await incomeInfo();
  if (r.error) return console.log(c('red', `❌ ${r.error}`));
  console.log(line());
  console.log(c('bold', '  📊 收入資訊'));
  console.log(`  每分鐘 ${money(r.income)}`);
  console.log(`  電腦 Lv.${r.levels?.computer || 1} · 伺服器 Lv.${r.levels?.server || 1} · AI Lv.${r.levels?.ai_assistant || 1}`);
  if (r.upgrades) {
    for (const [k, v] of Object.entries(r.upgrades)) {
      if (v) console.log(`  ⬆️  ${k} 可升級 → ${money(v.cost)}`);
    }
  }
  console.log(line());
  const opts = [];
  if (r.upgrades?.computer) opts.push({ label: `升級電腦 ${money(r.upgrades.computer.cost)}`, action: 'upgrade_computer' });
  if (r.upgrades?.server) opts.push({ label: `升級伺服器 ${money(r.upgrades.server.cost)}`, action: 'upgrade_server' });
  if (r.upgrades?.ai_assistant) opts.push({ label: `升級 AI ${money(r.upgrades.ai_assistant.cost)}`, action: 'upgrade_ai' });
  if (opts.length) {
    const ch = await menu(opts);
    if (ch?.startsWith('upgrade_')) {
      const type = ch.replace('upgrade_', '');
      const res = await incomeUpgrade(type);
      if (res.error) console.log(c('red', `❌ ${res.error}`));
      else console.log(c('green', `✅ 升級成功！${type} Lv.${res.level}`));
    }
  }
}

async function showBank() {
  const r = await bankInfo();
  if (r.error) return console.log(c('red', `❌ ${r.error}`));
  console.log(line());
  console.log(c('bold', '  🏦 銀行'));
  console.log(`  💰 現金 ${money(r.cash)}`);
  console.log(`  🏦 活存 ${money(r.savings)}`);
  console.log(`  💳 債務 ${money(r.totalDebt)}`);
  if (r.loans?.length) {
    console.log(`  📋 貸款 ${r.loans.length} 筆`);
  }
  console.log(line());
  const ch = await menu([
    { label: `存款（活存利率 ${(r.savingsRate * 100).toFixed(2)}%/min）`, action: 'deposit' },
    { label: '提款', action: 'withdraw' },
    { label: '貸款', action: 'borrow' },
  ]);
  if (ch === 'deposit') {
    const amt = parseInt(await ask(c('bold', '  金額: ')));
    if (amt > 0) { const res = await bankDeposit(amt); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 存入 ${money(amt)}`)); }
  } else if (ch === 'withdraw') {
    const amt = parseInt(await ask(c('bold', '  金額: ')));
    if (amt > 0) { const res = await bankWithdraw(amt); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 提出 ${money(amt)}`)); }
  } else if (ch === 'borrow') {
    const amt = parseInt(await ask(c('bold', '  金額: ')));
    if (amt > 0) { const res = await bankBorrow(amt); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 借款 ${money(amt)}`)); }
  }
}

async function showInvestment() {
  const [list, types] = await Promise.all([investmentList(), investmentTypes()]);
  if (list.error) return console.log(c('red', `❌ ${list.error}`));
  console.log(line());
  console.log(c('bold', '  💼 投資組合'));
  if (list.length === 0) {
    console.log(c('dim', '  暫無投資'));
  } else {
    for (const inv of list) {
      const info = types?.find?.(t => t.id === inv.type) || {};
      const daily = inv.dailyEarn || 0;
      console.log(`  ${info.icon || '📦'} ${info.label || inv.type} ${money(inv.amount)} · 日收益 ${money(daily)} · 已領 ${money(inv.total_paid)}`);
    }
  }
  console.log(line());
  const opts = [];
  if (types?.length) {
    for (const t of types) {
      opts.push({ label: `投資 ${t.icon} ${t.label}（${money(t.min)}起）`, action: `invest_${t.id}` });
    }
  }
  if (list.length > 0) opts.push({ label: '贖回', action: 'withdraw' });
  const ch = await menu(opts);
  if (ch?.startsWith('invest_')) {
    const type = ch.replace('invest_', '');
    const amt = parseInt(await ask(c('bold', '  金額: ')));
    if (amt > 0) { const res = await investmentInvest(type, amt); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 投資 ${money(amt)} 到 ${type}`)); }
  } else if (ch === 'withdraw') {
    const id = parseInt(await ask(c('bold', '  投資 ID: ')));
    if (id > 0) { const res = await investmentWithdraw(id); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 贖回成功！退還 ${money(res.refund)}`)); }
  }
}

async function showStock() {
  const [idx, q] = await Promise.all([stockIndex(), stockQuote()]);
  if (idx.error) return console.log(c('red', `❌ ${idx.error}`));
  console.log(line());
  console.log(c('bold', `  📈 大盤指數 ${idx.value}`));
  if (q.price) {
    console.log(`  💹 現價 ${money(q.price)} · 上限 ${q.maxTrade} 股`);
    console.log(`  🏦 系統庫存 ${q.systemInventory} 股 · 流通 ${q.circulating}`);
  }
  console.log(line());
  const ch = await menu([
    { label: `買入（上限 ${q.maxTrade || 0} 股）`, action: 'buy' },
    { label: '賣出', action: 'sell' },
    { label: '查看持股', action: 'holdings' },
  ]);
  if (ch === 'buy') {
    const qty = parseInt(await ask(c('bold', '  數量: ')));
    if (qty > 0) { const res = await stockBuy(1, qty); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 買入 ${qty} 股`)); }
  } else if (ch === 'sell') {
    const qty = parseInt(await ask(c('bold', '  數量: ')));
    if (qty > 0) { const res = await stockSell(1, qty); res.error ? console.log(c('red', `❌ ${res.error}`)) : console.log(c('green', `✅ 賣出 ${qty} 股`)); }
  } else if (ch === 'holdings') {
    const h = await stockHoldings();
    if (Array.isArray(h)) {
      for (const s of h) console.log(`  📊 公司${s.company_id} · ${s.quantity} 股 · 平均 ${money(s.avg_price)}`);
      if (!h.length) console.log(c('dim', '  暫無持股'));
    }
  }
}

async function showLeaderboard() {
  const rows = await leaderboard();
  if (!Array.isArray(rows)) return console.log(c('red', '❌ 查詢失敗'));
  console.log(line());
  console.log(c('bold', '  🏆 排行榜 TOP 10'));
  rows.slice(0, 10).forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    const online = r.online ? c('green', '●') : c('dim', '○');
    console.log(`  ${medal} ${online} ${r.username} ${money(r.worth)} · ${r.stocks}股`);
  });
  console.log(line());
}

async function showTransactions() {
  const txs = await transactions(10);
  if (!Array.isArray(txs)) return console.log(c('red', '❌ 查詢失敗'));
  console.log(line());
  console.log(c('bold', '  📜 最近交易'));
  for (const tx of txs) {
    const t = new Date(tx.created_at).toLocaleString('zh-TW');
    const color = tx.amount >= 0 ? 'green' : 'red';
    console.log(`  ${c('dim', t)} ${c(color, money(tx.amount))} ${tx.description}`);
  }
  console.log(line());
}

async function showEmployee() {
  const emps = await employeeList();
  if (!Array.isArray(emps)) return console.log(c('red', '❌ 查詢失敗'));
  console.log(line());
  console.log(c('bold', '  👷 員工'));
  if (emps.length === 0) console.log(c('dim', '  暫無員工'));
  for (const e of emps) {
    console.log(`  ${e.position} · 效率 ${e.efficiency} · 薪資 ${money(e.salary)}/hr · 產出 ${e.output}`);
  }
  console.log(line());
  const ch = await menu([{ label: '招募員工', action: 'hire' }]);
  if (ch === 'hire') {
    const pos = await ask(c('bold', '  職位 (intern/developer/engineer/expert/manager): '));
    const res = await employeeHire(pos);
    if (res.error) console.log(c('red', `❌ ${res.error}`));
    else console.log(c('green', `✅ 招募 ${pos} 成功！`));
  }
}

async function mainMenu() {
  console.log(c('bold', '\n🌍 ═══ Earth Online CLI ═══'));
  while (true) {
    const u = await me();
    if (u.error) { console.log(c('red', `❌ ${u.error}`)); break; }
    console.log(c('dim', `\n  👤 ${u.username} · 💰 ${money(u.cash)} · 🏦 ${money(u.savings)} · 📈 ${money(u.total_earned)}`));
    const ch = await menu([
      { label: '🪪 個人資料', action: 'profile' },
      { label: '📊 收入 / 升級', action: 'income' },
      { label: '🏦 銀行', action: 'bank' },
      { label: '💼 投資', action: 'investment' },
      { label: '📈 股票', action: 'stock' },
      { label: '👷 員工', action: 'employee' },
      { label: '🏆 排行榜', action: 'leaderboard' },
      { label: '📜 交易紀錄', action: 'transactions' },
      { label: '🎁 每日簽到', action: 'daily' },
      { label: '❌ 離開', action: 'quit' },
    ]);
    if (!ch || ch === 'quit') { console.log(c('dim', '\n  再見！🌍\n')); break; }
    try {
      if (ch === 'profile') await showProfile();
      else if (ch === 'income') await showIncome();
      else if (ch === 'bank') await showBank();
      else if (ch === 'investment') await showInvestment();
      else if (ch === 'stock') await showStock();
      else if (ch === 'employee') await showEmployee();
      else if (ch === 'leaderboard') await showLeaderboard();
      else if (ch === 'transactions') await showTransactions();
      else if (ch === 'daily') {
        const s = await dailyLoginStatus();
        console.log(`  連續 ${s.streak} 天 · ${s.todayClaimed ? c('green', '已簽到') : c('yellow', '未簽到')}`);
        if (!s.todayClaimed) {
          const res = await dailyLoginClaim();
          if (res.error) console.log(c('red', `❌ ${res.error}`));
          else console.log(c('green', `✅ 簽到成功！+${money(res.reward)}`));
        }
      }
    } catch (e) { console.log(c('red', `❌ ${e.message}`)); }
    await ask('\n' + c('dim', '  按 Enter 返回選單...'));
  }
}

// ─── OAuth Auto Login ───
const PORT = 31415;

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref();
}

async function waitForToken() {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const token = url.searchParams.get('token');
      if (token) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>✅ 登入成功！</h2><p>可以關閉這個頁面。</p></body></html>');
        srv.close();
        resolve(token);
      } else {
        res.writeHead(404); res.end('Waiting...');
      }
    });
    srv.listen(PORT, () => {
      setTimeout(() => { try { srv.close(); } catch {} resolve(null); }, 60000);
    });
  });
}

// ─── Start ───
console.log(c('bold', '\n🌍 Earth Online CLI v1.1.0'));
console.log(c('dim', `  連線到 ${BASE}...`));

try {
  const h = await health();
  if (!h.status) { console.log(c('red', '❌ 無法連線到伺服器')); process.exit(1); }
} catch { console.log(c('red', '❌ 網路錯誤')); process.exit(1); }

console.log(c('green', '  ✅ 伺服器連線成功\n'));
console.log('  1. 🔵 Discord 登入');
console.log('  2. 🔴 Google 登入');
console.log('  3. 📋 手動貼 Token');

const choice = await ask(c('bold', '\n> 選擇: '));
let token;

if (choice === '1' || choice === '2') {
  const provider = choice === '1' ? 'discord' : 'google';
  console.log(c('cyan', `\n  🌐 正在開啟 ${provider === 'discord' ? 'Discord' : 'Google'} 登入...`));
  console.log(c('dim', '  瀏覽器登入後會自動帶回 token\n'));

  const tokenPromise = waitForToken();
  const authUrl = `${BASE}/api/auth/${provider}?cli=1`;
  openBrowser(authUrl);
  token = await tokenPromise;
} else {
  console.log(c('dim', '\n  到網站登入 → F12 Console → localStorage.getItem("token")'));
  token = await ask(c('bold', '  Token: '));
  token = token.trim();
}

if (!token) { console.log(c('red', '❌ 登入逾時或取消')); process.exit(1); }
const r = await loginWithToken(token);
if (r.error) { console.log(c('red', `❌ ${r.error}`)); process.exit(1); }
console.log(c('green', `  ✅ 歡迎 ${r.username}！`));
await mainMenu();
rl.close();
process.exit(0);
