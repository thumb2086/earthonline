function getToday() {
  return new Date().toISOString().split('T')[0];
}

const TASK_TEMPLATES = [
  { type: 'earn_cash', label: '賺取 $1,000', target: 1000, reward: 500 },
  { type: 'earn_cash', label: '賺取 $5,000', target: 5000, reward: 1500 },
  { type: 'earn_cash', label: '賺取 $10,000', target: 10000, reward: 3000 },
  { type: 'buy_shares', label: '買入 100 股', target: 100, reward: 200 },
  { type: 'buy_shares', label: '買入 500 股', target: 500, reward: 800 },
  { type: 'sell_shares', label: '賣出 100 股', target: 100, reward: 200 },
  { type: 'invest', label: '投資 $1,000', target: 1000, reward: 500 },
  { type: 'deposit', label: '存入 $5,000', target: 5000, reward: 1000 },
  { type: 'hire', label: '僱用 1 名員工', target: 1, reward: 300 },
  { type: 'upgrade', label: '升級 1 次', target: 1, reward: 500 },
];

export async function handleDailyTasks(env, request, path, user) {
  const db = env.DB;
  const today = getToday();

  if (path === '/api/tasks/list') {
    await ensureTodayTasks(db, user.id, today);
    const tasks = await db.prepare('SELECT * FROM daily_tasks WHERE user_id = ? AND date = ?').bind(user.id, today).all();
    return tasks.results;
  }

  if (path === '/api/tasks/claim') {
    const { taskId } = await request.json();
    const task = await db.prepare('SELECT * FROM daily_tasks WHERE id = ? AND user_id = ? AND date = ?').bind(taskId, user.id, today).first();
    if (!task) return { error: '任務不存在' };
    if (task.completed === 0) return { error: '尚未完成' };
    if (task.claimed === 1) return { error: '已領取' };
    await db.prepare('UPDATE daily_tasks SET claimed = 1 WHERE id = ?').bind(taskId).run();
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(task.reward, task.reward, user.id).run();
    return { success: true, reward: task.reward };
  }

  return null;
}

async function ensureTodayTasks(db, userId, today) {
  const existing = await db.prepare('SELECT COUNT(*) as cnt FROM daily_tasks WHERE user_id = ? AND date = ?').bind(userId, today).first();
  if (existing.cnt > 0) return;

  const shuffled = [...TASK_TEMPLATES].sort(() => Math.random() - 0.5);
  for (const tpl of shuffled.slice(0, 5)) {
    await db.prepare('INSERT INTO daily_tasks (user_id, task_type, target_value, reward, date) VALUES (?, ?, ?, ?, ?)').bind(userId, tpl.type, tpl.target, tpl.reward, today).run();
  }
}

export async function updateDailyTaskProgress(db, userId, taskType, value) {
  const today = getToday();
  const tasks = await db.prepare('SELECT * FROM daily_tasks WHERE user_id = ? AND date = ? AND task_type = ? AND completed = 0').bind(userId, today, taskType).all();
  for (const task of tasks.results) {
    const newCurrent = task.current_value + value;
    if (newCurrent >= task.target_value) {
      await db.prepare('UPDATE daily_tasks SET current_value = ?, completed = 1 WHERE id = ?').bind(task.target_value, task.id).run();
    } else {
      await db.prepare('UPDATE daily_tasks SET current_value = ? WHERE id = ?').bind(newCurrent, task.id).run();
    }
  }
}
