const User = require('../models/User');
const { SHOP_ITEMS, ITEM_NAMES } = require('../config/constants');

async function buyItem(username, itemId) {
  const item = SHOP_ITEMS[itemId];
  if (!item) return { success: false, message: '道具不存在！' };

  // Dead players can only buy generators
  const user = await User.findOne({ username }, 'health');
  if (user && user.health <= 0 && itemId !== 'generator') {
    return { success: false, message: '⚠️ 伺服器已死機！僅能購買「備用發電機」或觀看廣告復活。' };
  }

  const result = await User.findOneAndUpdate(
    { username, accumulatedBonusPoints: { $gte: item.cost } },
    { $inc: { accumulatedBonusPoints: -item.cost, [`inventory.${itemId}`]: 1 } },
    { new: true }
  );

  if (!result) return { success: false, message: 'PT 不足！' };

  return {
    success: true,
    message: `✅ 已購買「${ITEM_NAMES[itemId] || itemId}」並存入背包！`,
    inventory: result.inventory ? Object.fromEntries(result.inventory) : {},
    pts: result.accumulatedBonusPoints
  };
}

async function useItem(username, itemId) {
  const item = SHOP_ITEMS[itemId];
  if (!item) return { success: false, message: '道具不存在！' };

  // Dead players can only use generators (revive)
  const userCheck = await User.findOne({ username }, 'health');
  if (userCheck && userCheck.health <= 0 && item.effect !== 'revive') {
    return { success: false, message: '⚠️ 伺服器已死機！請先使用「備用發電機」復活。' };
  }

  const userBefore = await User.findOneAndUpdate(
    { username, [`inventory.${itemId}`]: { $gte: 1 } },
    { $inc: { [`inventory.${itemId}`]: -1 } },
    { new: false }
  );
  if (!userBefore) return { success: false, message: '背包中沒有此道具！' };

  const oldCount = userBefore.inventory?.get(itemId) || 0;
  if (oldCount <= 1) {
    await User.updateOne({ username }, { $unset: { [`inventory.${itemId}`]: '' } });
  }

  let message = '';
  let extraUpdate = null;

  if (item.effect === 'health') {
    const dbUser = await User.findOne({ username });
    if (dbUser.health <= 0) {
      await User.updateOne({ username }, { $inc: { [`inventory.${itemId}`]: 1 } });
      return { success: false, message: '伺服器已死機，無法使用散熱道具！請先用備用發電機。' };
    }
    const newHealth = Math.min(100, dbUser.health + item.value);
    extraUpdate = { $set: { health: newHealth } };
    message = `❤️ 健康度恢復 +${item.value}%（現在 ${Math.floor(newHealth)}%）`;

  } else if (item.effect === 'buff') {
    const expiry = Date.now() + item.duration;
    extraUpdate = { $set: { [`activeBuffs.${item.type}`]: expiry } };
    const minLabel = Math.floor(item.duration / 60000);
    message = item.type === 'overclock'
      ? `⚡ PT 收益 ×2.0 倍，持續 ${minLabel} 分鐘！`
      : item.type === 'cooling'
        ? `❄️ 液態氮冷卻啟動，維護期間降頻免疫，持續 ${minLabel} 分鐘！`
        : `🛡️ 防火牆啟動，${minLabel} 分鐘內免疫衰減！`;

  } else if (item.effect === 'revive') {
    const dbUser = await User.findOne({ username });
    if (dbUser.health > 0) {
      await User.updateOne({ username }, { $inc: { [`inventory.${itemId}`]: 1 } });
      return { success: false, message: '伺服器仍在運作，不需要發電機！' };
    }
    extraUpdate = { $set: { health: item.value } };
    message = `🔋 伺服器強制重啟！健康度恢復至 ${item.value}%`;

  } else if (item.effect === 'cosmetic') {
    extraUpdate = { $set: { [`cosmetics.${itemId}`]: true } };
    message = '🌈 霓虹燈管已安裝，裝飾效果已套用！';

  } else if (item.effect === 'random') {
    const rand = Math.random();
    if (rand < 0.3) {
      extraUpdate = { $inc: { accumulatedTime: 86400 * 1000 } };
      message = '🏆 大吉！獲得 1 天生存時間！';
    } else if (rand < 0.6) {
      extraUpdate = { $inc: { accumulatedBonusPoints: 2000 } };
      message = '💰 中吉！獲得 2000 PT！';
    } else if (rand < 0.9) {
      extraUpdate = { $inc: { accumulatedBonusPoints: 500 } };
      message = '🎁 小吉！回本 500 PT！';
    } else {
      extraUpdate = { $inc: { health: -50 }, $max: { health: 1 } };
      message = '💀 大凶！電腦病毒爆發，健康度 -50%（強制保留 1% 存活）！';
    }
  }

  let finalUser;
  if (extraUpdate) {
    await User.updateOne({ username }, extraUpdate);
  }
  finalUser = await User.findOne({ username });

  return {
    success: true,
    message,
    userState: {
      health: finalUser.health,
      pts: finalUser.accumulatedBonusPoints,
      activeBuffs: finalUser.activeBuffs ? Object.fromEntries(finalUser.activeBuffs) : {},
      inventory: finalUser.inventory ? Object.fromEntries(finalUser.inventory) : {},
      cosmetics: finalUser.cosmetics ? Object.fromEntries(finalUser.cosmetics) : {}
    }
  };
}

module.exports = { buyItem, useItem };
