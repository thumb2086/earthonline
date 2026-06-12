# Earth Online — Hybrid P2P 分散式架構提案

> 目標：讓遊戲不依賴 Render 也能正常運作，甚至完全去中心化。
> 核心思路：**把客戶端當成一等公民，伺服器降級為選配的同步層**。

---

## 為什麼這款遊戲適合 P2P？

| 特性 | Earth Online | 傳統 MMORPG |
|------|-------------|-------------|
| 遊戲循環頻率 | 每 5 秒 tick 一次 | 60 FPS 即時運算 |
| 玩家互動 | 聊天 + 排行榜 + 全球事件投票 | 組隊/PvP/交易 |
| 狀態變更速度 | 慢（PT 緩慢累積、生存時間線性增長） | 快（血量/位置/技能即時變） |
| 離線補償 | 已有機制（離線收益最多 4h） | 通常無 |
| 全域共享狀態 | 僅事件 + 排行榜 | 大量共享 |
| Anti-cheat 需求 | 低（無 PvP、無交易經濟） | 高 |

結論：**這是一款本質上接近單機放置的遊戲，多人只是點綴。** 這讓 P2P 架構非常可行。

---

## 架構總覽：三層遞進去中心化

```
Layer 1: Offline-First 客戶端
  ─ 每個玩家有自己的完整遊戲引擎
  ─ 伺服器掛了照樣能玩、能成長

Layer 2: P2P Mesh 同步層
  ─ WebRTC 直接節點互通
  ─ 聊天、排行榜、全球事件不經中央伺服器

Layer 3: 志願節點池 (選配)
  ─ 社群成員用閒置電腦跑輕量節點
  ─ Render 可以完全關掉
```

每層都可以獨立運作，越上層依賴越少。

---

## Layer 1 — Offline-First 客戶端架構

### 現狀問題
- 客戶端是**純顯示層**，所有邏輯在伺服器
- 斷線 = 遊戲暫停（雖然 timer 繼續跑但狀態不更新）
- 伺服器掛了 = 全部人不能玩

### 改造成「客戶端也跑一份遊戲引擎」

```
目前：                                          改造後：
┌──────────┐    socket events     ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │ ◄─────────────────► │  Server  │    │  Client  │ ──► │  Server  │
│  (顯示)  │                     │ (引擎)   │    │ (引擎+)  │ ◄── │ (備份)   │
└──────────┘                     └──────────┘    │  IndexedDB│     └──────────┘
                                                  │   ─本地持久  │
                                                  └──────────┘
```

### GameEngine.js — 客戶端遊戲引擎

建立 `client/src/engine/GameEngine.js`，把後端 `server.js` 的遊戲邏輯搬過來：

```javascript
class GameEngine {
  constructor() {
    this.state = {
      accumulatedTime: 0,
      accumulatedBonusPoints: 0,
      health: 100,
      inventory: {},        // Map<itemId, count>
      activeBuffs: {},      // Map<buffType, expiry>
      level: 1,
      talents: {},
      quests: {},
      achievements: { unlocked: [], total: 0 },
      weeklyScore: 0,
      honor: 0,
    };
    this.lastTick = Date.now();
    this.offlineEarnings = null;
  }

  // ─── 核心 tick（原本在 server.js 的 processTick）───
  tick() {
    const now = Date.now();
    const delta = (now - this.lastTick) / 1000; // seconds
    this.lastTick = now;

    // 1. 時間累積
    this.state.accumulatedTime += delta * 1000;

    // 2. PT 產出（基礎 1 PT/s + 天賦加成 + Buff 加成 + 礦層加成）
    let ptsPerSec = 1;
    if (this.state.activeBuffs['pts_boost']) ptsPerSec *= 1.5;
    if (this.state.talents['efficiency']) ptsPerSec *= (1 + this.state.talents['efficiency'] * 0.1);
    // ...礦層加成來自 v2.2.3
    this.state.accumulatedBonusPoints += ptsPerSec * delta;

    // 3. 健康度衰減（每 10 秒 -1）
    this.state.health = Math.max(0, this.state.health - delta / 10);

    // 4. Buff 過期檢查
    for (const [type, expiry] of Object.entries(this.state.activeBuffs)) {
      if (now > expiry) delete this.state.activeBuffs[type];
    }

    // 5. 等級進度（每 1h = 1 level）
    const newLevel = Math.floor(this.state.accumulatedTime / 3600000) + 1;
    if (newLevel > this.state.level) {
      this.state.level = newLevel;
      this.state.talentPoints = (this.state.talentPoints || 0) + 1;
    }
  }

  // ─── 離線補償計算（完全本地）───
  computeOfflineEarnings(offlineMs) {
    const cappedMs = Math.min(offlineMs, 4 * 3600 * 1000); // 最多 4h
    const ptsGained = (cappedMs / 1000) * 1; // 基礎 1 PT/s
    const healthRecovery = Math.min(60, (cappedMs / 3600000) * 5); // 每小時 +5%，最多 60%
    return { ptsGained, healthRecovery, offlineMs: cappedMs };
  }

  // ─── 狀態匯出/匯入（給 IndexedDB 持久化）───
  exportState() {
    return { ...this.state, lastSavedAt: Date.now() };
  }

  importState(data) {
    this.state = { ...this.state, ...data };
    this.lastTick = Date.now();
  }
}
```

### IndexedDB 持久層

建立 `client/src/engine/StorageAdapter.js`：

```javascript
const DB_NAME = 'EarthOnline';
const DB_VERSION = 1;
const STORE = 'gameState';

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 每 10 秒自動存檔
export async function autoSave(state) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ id: 'main', ...state });
  await tx.done;
}

// 啟動自動存檔間隔
export function startAutoSave(engine) {
  return setInterval(() => {
    autoSave(engine.exportState());
  }, 10000);
}
```

### 離線遊玩流程

```
1. 使用者打開瀏覽器
2. 檢查 localStorage 有無 token
   ├─ 有 → 嘗試連線伺服器
   │        ├─ 成功 → 同步本地引擎 vs 伺服器狀態（取較大值）
   │        └─ 失敗 → 啟動本地引擎 + IndexedDB 繼續玩
   └─ 無 → 顯示登入頁（可選「離線試玩」模式）
```

### 伺服器降級為「同步層」

當 Layer 1 完成後，伺服器就不再是必需品：

| 功能 | Layer 1 行為 | 有伺服器時 |
|------|-------------|-----------|
| PT 累積 | 本機計算 | 同步 + 雙重驗證 |
| 生存時間 | 本機計算 | 同步 |
| 等級/天賦 | 本機計算 | 同步 |
| 商城購物 | 本機扣款 | 同步 + 驗證庫存 |
| 聊天 | 無（等待 Layer 2） | socket.io |
| 排行榜 | 無（等待 Layer 2） | REST API |
| 全球事件 | 無（等待 Layer 2） | socket.io |
| 好友系統 | 無（等待 Layer 2） | socket.io |

### 驗證方式
1. 斷開 WiFi → 遊戲繼續正常運作
2. 重新連線 → 離線期間的 PT/時間/等級正確合併
3. `indexedDB` 中可看到完整 game state

---

## Layer 2 — P2P Mesh 同步層

### WebRTC Mesh Network

不需要中央伺服器，瀏覽器間直接互連。

```
                  ┌─────────┐
                  │  Node A  │
                  └────┬────┘
                       │ RTCPeerConnection
          ┌────────────┼────────────┐
          │            │            │
     ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
     │ Node B  │ │ Node C  │ │ Node D  │
     └─────────┘ └─────────┘ └─────────┘
```

### 信號伺服器（超輕量）

WebRTC 需要信號交換（SDP/ICE），但這個不需要持久連線。

**方案 A：Cloudflare Worker（免費）**
```javascript
// functions/signal.js
// 只是幫兩個 peer 交換 SDP，不儲存任何遊戲狀態
export default {
  async fetch(request, env) {
    // POST /signal 交換信號
    // 完成後立即清除，不留痕跡
  }
}
```

**方案 B：直接用現有 Render 伺服器當信號交換**
- 在 `server.js` 加一個 WebRTC 信號端點
- 即使 Render 慢，信號交換只需幾毫秒

**方案 C（最終目標）：DHT 自動發現**
- libp2p bootstrap nodes
- 完全不需要任何中央伺服器

### 同步哪些資料

| 資料 | 方式 | 頻率 |
|------|------|------|
| 聊天訊息 | Gossip 廣播 | 即時 |
| 排行榜分數 | 定時廣播 + 本地驗證 | 每 30 秒 |
| 全球事件投票 | Gossip + 本地計票 | 事件期間 |
| 節點位置 (lat/lon) | Gossip 廣播 | 每 5 秒 |
| 好友狀態 | Direct P2P | 事件驅動 |

### WebRTCDataChannel 協定

```javascript
// 每個 P2P 訊息格式
{
  type: 'CHAT' | 'SCORE' | 'VOTE' | 'NODE_POSITION' | 'FRIEND_REQUEST',
  from: 'username',
  signature: 'ed25519_signature',  // 防止假冒
  payload: { /* 視 type 而定 */ },
  timestamp: Date.now(),
  seq: 12345  // 有序號防止 replay
}
```

### Gossip 協定（約 30 行）

```javascript
class GossipProtocol {
  constructor(peerId) {
    this.peerId = peerId;
    this.seen = new Set();        // 去重
    this.peers = new Map();       // active P2P connections
    this.handlers = new Map();    // message type → handler
  }

  broadcast(type, payload) {
    const msg = {
      id: crypto.randomUUID(),
      from: this.peerId,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.seen.add(msg.id);
    for (const [id, peer] of this.peers) {
      peer.send(JSON.stringify(msg));
    }
  }

  onMessage(data) {
    const msg = JSON.parse(data);
    if (this.seen.has(msg.id)) return;  // 去重
    this.seen.add(msg.id);
    // 廣播給其他 peer (fan-out)
    for (const [id, peer] of this.peers) {
      if (id !== msg.from) peer.send(data);
    }
    // 呼叫 handler
    const handler = this.handlers.get(msg.type);
    if (handler) handler(msg);
  }
}
```

### 排行榜的去中心化

不要中央伺服器排序，用 **Gossip-based Aggregation**：

```
每個節點維護自己的分數
每 30 秒把自己的 (username, weeklyScore) 廣播出去
收到別人的分數後，合併到本地的排序列表
60 秒後，所有節點的分數列表趨於一致（Eventual Consistency）
```

### 全球事件的去中心化

```
1. 任何節點可以提案事件（需要抵押 1000 PT）
2. Gossip 廣播提案
3. 所有節點本地投票
4. 計票在每個節點本地完成（Gossip 確保所有節點看到同樣票數）
5. 贏家事件在所有節點本地觸發
```

### 聊天系統的去中心化

```
1. A 發送聊天訊息（Gossip 廣播）
2. 所有節點收到後加入本地 log
3. 如果沒有新的訊息在 2 秒內收到，視為送達
4. Mod 的刪除/禁言指令也是 Gossip 廣播（需要 signature 驗證 mod 身份）
```

### 驗證方式
1. 關掉 Render 伺服器
2. 開啟 3 個瀏覽器視窗（不同帳號）
3. 聊天訊息在所有視窗同步出現
4. 排行榜在所有視窗趨於一致
5. 全球事件投票在所有視窗正確計票

---

## Layer 3 — 志願節點池

### 概念

社群成員用自己電腦跑一個輕量後端程序，替代 Render。

```
                    ┌──────────────┐
                    │  Discovery   │
                    │  (DNS list)  │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     ┌────┴─────┐    ┌────┴─────┐    ┌────┴─────┐
     │ Node A    │    │ Node B    │    │ Node C    │
     │ (志願者)  │    │ (志願者)  │    │ (志願者)  │
     │ Render    │    │ 自組NAS   │    │ 閒置筆電   │
     └────┬─────┘    └────┬─────┘    └────┬─────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                     ┌─────┴──────┐
                     │  MongoDB   │
                     │  (可選)    │
                     └────────────┘
```

### VolunteerNode.js — 超輕量後端

```javascript
// 只需 200 行，不需要 Express/Socket.io
// 只需要：
// 1. WebSocket server（接受 P2P 轉發）
// 2. MongoDB client（可選，用 SQLite 也可）
// 3. HTTP server（服務 WebRTC 信號交換）
// 4. CRON（週結算）
```

### 節點分級

| 等級 | 功能 | 資源需求 |
|------|------|---------|
| **Light** | 只當 Relay（轉發 P2P 流量） | 50MB RAM |
| **Medium** | Relay + 持久化（可選 MongoDB/SQLite） | 200MB RAM |
| **Full** | Relay + 持久化 + 結算 | 500MB RAM |

### 自動容錯

```
每個客戶端維護一個「節點健康度清單」：
- 如果 Render 回應時間 > 5 秒 → 降級
- 如果 Render 完全無回應 → 切換到志願節點池
- 志願節點也掛了 → 純 P2P 模式（Layer 2 僅 Mesh）
- 全部掛了 → 單機模式（Layer 1）

切換對玩家完全透明，所有狀態在 IndexedDB。
```

### 發現機制

```
1. 硬編碼 bootstrap list（Render 網址 + 3-5 個志願節點）
2. 客戶端連上任一節點，請求完整節點清單
3. 如果所有 bootstrap 都掛了，自動降級到 P2P Mesh
```

---

## 實作路線圖

### v0.1 — Offline-First 核心（2-3 天）

- [x] `GameEngine.js` — 完整的本地遊戲引擎
- [x] `StorageAdapter.js` — IndexedDB 持久化
- [x] 離線遊玩時繼續累積 PT/時間/等級
- [x] 重連時引擎狀態與伺服器合併（取較大值）
- [ ] 設定 -> 開關：「離線模式」（強制不用伺服器）

**驗證**：拔掉網路，玩 5 分鐘，接回網路，離線成長已合併

### v0.2 — WebRTC Mesh 聊天（3-5 天）

- [ ] `P2PNetwork.js` — WebRTC 連線管理 + 信號交換
- [ ] `GossipProtocol.js` — 去重廣播
- [ ] P2P 聊天取代 socket.io 聊天
- [ ] 離線時仍可與 LAN 或其他線上玩家聊天

**驗證**：關掉 Render，兩個瀏覽器開不同帳號，互相發送聊天訊息

### v0.3 — P2P 排行榜 + 全球事件（3-5 天）

- [ ] Gossip-based 分數廣播 + 本地排序
- [ ] 去中心化事件提案與投票
- [ ] UI 顯示「P2P 模式」/「伺服器模式」/「混合模式」

**驗證**：關掉 Render，排行榜趨於一致，事件投票正確運作

### v0.4 — 志願節點 + 自動容錯（3-5 天）

- [ ] `VolunteerNode.js` — 輕量後端程序
- [ ] 節點健康度監控 + 自動切換
- [ ] Bootstrap list + 動態發現
- [ ] Render 掛了自動降級（玩家無感）

**驗證**：
1. 在另一台電腦跑 VolunteerNode.js
2. 關掉 Render
3. 客戶端自動連到 VolunteerNode
4. 所有功能正常

### v0.5 — 完全去中心化（長期）

- [ ] libp2p DHT 取代 bootstrap list
- [ ] 去中心化身份（DID）取代 JWT
- [ ] 無任何中央依賴

---

## Render 節省估算

| 階段 | Render 運行時間/月 | 費用節省 |
|------|-------------------|---------|
| 目前 | 720h (24/7) | 基準 |
| v0.1 完成 | 720h (仍需同步層) | 0% |
| v0.2 完成 | 720h | 0% |
| v0.3 完成 | 360h (峰值時開，其他靠 P2P) | 50% |
| v0.4 完成 | 100h (僅備援) | 86% |
| v0.5 完成 | 0h | 100% |

---

## 關鍵技術決策

### 為什麼選 WebRTC 而不是 Socket.io P2P？
- WebRTC 是瀏覽器原生 P2P 技術，不需要中央伺服器轉發
- Socket.io 依賴長連接到中央伺服器
- WebRTC DataChannel 支援 UDP，延遲更低

### 為什麼選 Gossip 而不是 Consensus（如 Raft/Paxos）？
- 遊戲不需要強一致性（排行榜差幾秒沒差）
- Gossip 簡單得多（約 30 行 vs Raft 上千行）
- Eventual Consistency 對放置遊戲完全足夠

### 狀態衝突如何解決？

最簡單的規則：**Last-Writer-Wins (LWW)**

```
客戶端 A: PT = 1500 @ timestamp 1000
客戶端 B: PT = 1600 @ timestamp 1005
→ 合併結果：PT = 1600（因為 B 較新）

如果用 CRDT：
客戶端 A: PT = 1500 + localDelta_A
客戶端 B: PT = 1500 + localDelta_B
→ 合併結果：PT = 1500 + delta_A + delta_B（無衝突）
```

### Anti-cheat 策略

| 攻擊方式 | 防禦 |
|---------|------|
| 偽造本地 PT | 檢查離線時間 × 理論產出是否合理 |
| 修改 JS 加速 | 伺服器端（或志願節點）定期挑戰：計算 hash 驗證時間 |
| 假冒他人身份 | Ed25519 簽名 + 公鑰 pinned to account |
| Replay 攻擊 | 序號 + timestamp 檢查 |
| Sybil 攻擊（開大量分身投票）| 最低遊玩時間門檻 + 人類驗證 |

---

## 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| WebRTC NAT 穿透失敗 | 部分玩家無法 P2P | TURN server (可 cheap 自建) + 降級到 Relay |
| IndexedDB 被清除 | 本地進度遺失 | 伺服器仍可同步（有伺服器時）+ 匯出功能 |
| 瀏覽器 Tab 關閉 | 節點離線 | 這是 idle game，離線有補償很正常 |
| 志願節點惡意行為 | 排行榜/事件被操縱 | 門檻機制 + 多節點驗證 |
| 法律責任 | 社群節點承擔流量 | 僅 relay 不儲存使用者資料 |

---

## 結論

這不是一個遙遠的理想，而是一個**可行的遞進計畫**：

1. **今天就能做**：把遊戲邏輯搬到客戶端（GameEngine.js），讓斷線不中斷遊戲
2. **這週就能做**：WebRTC Mesh 聊天，關掉伺服器也能聊天
3. **下週就能做**：P2P 排行榜 + 事件，關掉伺服器也能看到排名
4. **下個月就能做**：志願節點池，Render 可以關掉 80% 時間

每一步都是獨立可用的改善，不影響現有玩家。

> 「把客戶端當伺服器」不是工程口號，而是 Earth Online 作為放置遊戲的天然優勢。
> 因為它本質上就是單機遊戲，只是剛好有聊天室而已。
