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

### 先決條件：Service Worker（頁面離線載入）

> 這是整個 Offline-First 架構的前提：沒有 Service Worker，即便 GameEngine 寫再好，瀏覽器沒網路時連頁面都載入不了。

`earthonline.qzz.io` 是普通網頁，HTML/JS/CSS 都存在 Cloudflare Pages 上。要讓它「離線可用」，需要：

**Service Worker 策略：Cache-First（快取優先）**

```
第一次訪問（有網路）：
  ┌─ 註冊 Service Worker
  └─ SW 安裝時把 client build 結果全部快取到 Cache API
      ├─ 所有 JS bundle
      ├─ CSS
      ├─ HTML (index.html)
      ├─ 字型 / 圖片 / 音效
      └─ manifest.json / icon

後續訪問（無網路）：
  ┌─ 瀏覽器請求頁面
  ├─ SW 攔截請求 → 檢查 Cache API
  │   ├─ 有快取 → 直接回應（立即載入）
  │   └─ 無快取 → 回退到網路（首次或新版本）
  └─ 頁面載入後 GameEngine + IndexedDB 接管
      遊戲狀態完全在本地，不需要伺服器
```

**實作方式：**

建立 `client/sw.js`（約 40 行）：
```javascript
const CACHE = 'earthonline-v1';
const ASSETS = self.__WB_MANIFEST || []; // Vite 自動產出

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
```

在 `client/src/main.jsx` 註冊：
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

**Vite 整合：** 使用 `vite-plugin-pwa` 套件，自動處理 SW 生成、版本管理、manifest.json。

| 整合方式 | 優點 | 缺點 |
|---------|------|------|
| vite-plugin-pwa | 自動處理更新、無需手動維護 hash | 多一個依賴 |
| 手寫 sw.js | 完全控制、無依賴 | 需管理版本更新邏輯 |

建議使用 `vite-plugin-pwa`，產出約 5KB 的 SW，支援自動更新提示。

### 離線遊玩流程（含 Service Worker）

```
1. 使用者打開瀏覽器 → 輸入 earthonline.qzz.io
2. Service Worker 攔截請求
   ├─ 已安裝且快取 → 立即渲染頁面（可離線）
   └─ 首次訪問 → 從 Cloudflare 載入，SW 背景快取
3. 頁面載入後 GameEngine 初始化
4. 檢查 localStorage 有無 token
   ├─ 有 → 嘗試連線伺服器（fetch 可能失敗，因離線）
   │        ├─ 成功 → 同步本地引擎 vs 伺服器狀態（取較大值）
   │        └─ 失敗 → 啟動本地引擎 + IndexedDB 繼續玩
   └─ 無 → 顯示登入頁（可選「離線試玩」模式）
5. 遊戲中：GameEngine 每 5 秒 tick，IndexedDB 每 10 秒存檔
6. 重新連線時：狀態合併（取較大值 + 庫存聯集）
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

---

## 可行性評估

> 基於 2026-06-13 專案審計結果，對 hybrid P2P 架構進行技術與實務可行性分析。

### 專案現狀摘要

| 項目 | 狀態 |
|------|------|
| 客戶端角色 | **純顯示層**，無任何本地遊戲引擎 |
| IndexedDB 使用 | **零** — 無任何本地持久化 |
| 離線能力 | 斷線時客戶端凍結，無法累積任何進度 |
| P2P 實作 | **零** — WebRTC、Gossip 通訊協定均未實作 |
| 伺服器依賴 | **完全依賴** — Render 掛了則全部人無法遊戲 |
| server.js | 790 行（含 auth、socket、game loop、admin 邏輯） |
| App.jsx | 2357 行（單體元件） |

### Layer 1 可行性：★★★★★（立即可行）

**分數：9/10**

| 面向 | 評估 |
|------|------|
| 技術難度 | 低 — 純粹的程式碼搬移 + IndexedDB 封裝 |
| 風險 | 極低 — 不影響現有伺服器邏輯，可逐步上線 |
| 維護成本 | 低 — GameEngine 邏輯與後端一致即可 |
| 對玩家影響 | 正向 — 斷線不再中斷遊戲 |
| 實作時間 | 2-3 天 |

**關鍵考量：**

- **最重要的前提：Service Worker + PWA**。沒有 SW，離線時連頁面都載入不了。這項技術極成熟（caniuse 96%+），使用 `vite-plugin-pwa` 約 30 分鐘可完成整合。
- GameEngine.js 的 tick 邏輯可以直接 mirror `backend/services/gameLoop.js` 的 `processTick`（109 行），但需注意：
  - 離線補償邏輯目前在 `server.js` 的 authenticate 區塊（約 50 行），需獨立為共用函數
  - 成就/任務檢查目前分散在 `achievementService.js` / `questService.js`，客戶端版本需簡化（僅檢查本地可驗證的條件）
- IndexedDB 存檔頻率：10 秒自動存 + 每個關鍵動作（升級、購物）即時存，離線時沒有 flush 問題
- 重新連線合併策略：**取較大值**對 PT/時間足夠安全，但需注意：
  - 庫存（inventory）應採**聯集而非取代**（避免購物後斷線遺失）
  - 成就/任務進度應取最大值
- **建議立即開始 Layer 1，這是風險最低、回報最高的投資**

### Layer 2 可行性：★★★☆☆（可行但有條件）

**分數：6/10**

| 面向 | 評估 |
|------|------|
| 技術難度 | 中高 — WebRTC NAT 穿透、TURN 成本、瀏覽器相容性 |
| 風險 | 中 — 可能部分玩家無法 P2P 連線，需降級方案 |
| 維護成本 | 中 — 需監控 TURN 用量、處理連線問題 |
| 對玩家影響 | 中 — 聊天功能從 socket.io 改為 P2P |
| 實作時間 | 3-5 天（基本 Mesh）、再 3-5 天（排行榜+事件）|

**主要風險：**

1. **NAT 穿透失敗率**：根據 WebRTC 統計，約 8-15% 的連線需要 TURN relay。免費 TURN 方案（如 Google STUN）僅適用 STUN，TURN 需自建或付費。
   - 緩解：使用 Cloudflare TURN（或 coturn 自建，約 $5/mo VPS）
   - 最低成本方案：當 P2P 失敗時降級為 socket.io relay（仍在 Render 上跑）

2. **聊天系統的去中心化代價**：
   - 歷史訊息：P2P 節點離線後歷史訊息遺失，新加入節點無法看到過往聊天
   - 解決方案：每個節點保留最近 N 條訊息的本地 log；或指定志願節點存歷史
   - Mod 管理（刪除/禁言）：需要公鑰基礎設施來驗證 mod 身份，增加複雜度

3. **排行榜收斂時間**：
   - Gossip-based 排行榜需 3-5 個傳播週期才能收斂（約 60-90 秒）
   - 對放置遊戲可接受，但可能引起玩家困惑（「我明明 2000 PT 為什麼榜上只有 1800？」）
   - 建議：顯示「P2P 排行榜（約 60 秒內收斂）」標籤；仍有伺服器時以伺服器為準

4. **瀏覽器 Tab 生命週期**：
   - WebRTC 連線在 Tab 關閉時立即中斷，不像伺服器可以緩衝
   - Mesh 網路會頻繁重組，Gossip fan-out 需處理節點動態加入/離開

**建議策略：** Layer 2 應以**聊天先行**，排行榜和事件留在伺服器（或同時支援兩種模式），不追求完全去中心化。混合模式（聊天 P2P + 分數伺服器）可在降低複雜度的同時達到 Render 節省目標。

### Layer 3 可行性：★★☆☆☆（長期目標）

**分數：3/10**

| 面向 | 評估 |
|------|------|
| 技術難度 | 高 — 安全模型、身份驗證、資料一致性 |
| 風險 | 高 — 惡意節點、法律責任、可靠性 |
| 維護成本 | 高 — 社群管理、節點審核、版本相容性 |
| 對玩家影響 | 不確定 — 取決於社群參與度 |
| 實作時間 | 1-2 個月 |

**關鍵問題：**

1. **惡意節點風險**：志願者節點可以篡改排行榜、偽造事件結果、甚至盜取使用者資料（即便只是 relay，仍可記錄 IP/活動）
   - 緩解：採用「多節點驗證」— 客戶端同時詢問多個節點，比對結果一致性
   - 但這增加了延遲和複雜度

2. **法律責任**：社群成員的機器可能被用於非法活動（作為 relay 節點），專案維護者可能承擔法律風險
   - 緩解：志願節點僅限 relay + 已驗證的程式碼，不儲存使用者資料

3. **可靠性**：社群節點不能保證 SLA，玩家體驗可能不一致
   - 緩解：志願節點僅作為 Render 的輔助，非替代。Render 仍為主要伺服器

4. **MongoDB 授權**：提案中志願節點可選 MongoDB/SQLite，但 MongoDB 的商業授權限制（SSPL）可能不允許社群自由使用
   - 建議：志願節點僅使用 SQLite 或 JSON 檔案

**建議策略：** Layer 3 應降級為「輕量備援節點」而非完整替代 Render。初始版本只需做到：
- Render 掛掉時自動切換到備援節點（可由專案維護者或信任社群成員運作）
- 備援節點只做 relay + 最小狀態維護
- 不求完全去中心化

### 綜合建議

```
優先順序：
  1. Layer 1 (Offline-First) ─── 立即開始 ★★★★★
  2. 混合模式聊天 P2P ───────── v2.0.0 後 ★★★☆☆
  3. 備援節點 (輕量版) ──────── v2.1.0 後 ★★☆☆☆
  4. 完全去中心化 ────────────── 長期目標 ★★☆☆☆
```

| 階段 | Render 節省 | 實作成本 | 風險 |
|------|------------|---------|------|
| Layer 1 完成 | 0%（但仍改善 UX） | 低 | 極低 |
| Layer 1 + 聊天 P2P | 30%（可非尖峰關 Render） | 中 | 中低 |
| + 備援節點 | 70%（Render 僅備援） | 中高 | 中 |
| 完全去中心化 | 100% | 高 | 高 |

**最終結論：** Hybrid P2P 的方向正確，但 Layer 1 的 Offline-First 應是唯一立即投入資源的項目。Layer 2 和 Layer 3 需要更多設計和驗證，建議在 v2.0.0 主力功能完成後再評估。

---

## 可行方案（修正後）

### 短期（v1.14.x → v2.0.0）— Offline-First 優先

不再等待完整 P2P 實作，先讓客戶端具備離線能力：

#### 實作項目

**Phase A: Service Worker + GameEngine.js + StorageAdapter.js**
- 使用 `vite-plugin-pwa` 整合 Service Worker（Cache-First 策略，所有 JS/CSS/HTML/字型快取）
- 從 `backend/services/gameLoop.js` 複製 processTick 邏輯到 `client/src/engine/GameEngine.js`
- 建立 `client/src/engine/StorageAdapter.js`（IndexedDB 封裝）
- 每 10 秒自動存檔，關鍵操作（購物/升級）即時存
- `useGameState.js` 整合 GameEngine — 伺服器在線時以伺服器為準，離線時本機運作

**Phase B: 狀態合併策略**
- 重新連線時：accumulatedTime / PT / level 取最大值
- inventory：合併（伺服器庫存 + 離線期間新增）
- achievements / quests：取進度較大值
- activeBuffs：取較晚 expiry
- 衝突記錄寫入 `localStorage.conflictLog` 供除錯

**Phase C: 離線模式 UI**
- 斷線時顯示「離線模式」標籤，不再顯示 loading spinner
- 離線期間仍可開啟商城（但無法購買）、檢視背包、聊天（僅本地 log）
- 連線恢復時顯示離線收益摘要

### 中期（v2.0.x 主力功能完成後）— 選擇性 P2P

#### 實作項目

**Phase D: WebRTC 聊天（選擇性啟用）**
- 使用 Cloudflare Worker 做信號交換（免費方案每日 10 萬請求已足夠）
- 聊天走 P2P，但保留 socket.io 聊天作為 fallback
- 玩家可在設定中選擇「P2P 聊天」/「伺服器聊天」

**Phase E: 備援節點（Light 版本）**
- 建立 `desktop/VolunteerNode.js` — 僅 100-150 行
- 功能：WebSocket relay + 可選 SQLite 持久化
- 僅供專案維護者和信任社群使用（非公開志願者計劃）
- Render 健康度監控 + 自動切換

### Render 節省估算（修正版）

| 階段 | Render 運行時間/月 | 費用節省 | 備註 |
|------|-------------------|---------|------|
| 目前 | 720h (24/7) | 基準 | — |
| Phase A 完成 | 720h | 0% | 但仍可關 Render 維護 |
| Phase B 完成 | 720h | 0% | 維護時玩家無感 |
| Phase D 完成 | 500h (離峰時關) | 30% | 聊天不依賴 Render |
| Phase E 完成 | 200h (僅備援) | 72% | Render 每月約 $7→$2 |
| 完全去中心化 | 0h | 100% | 長期目標 |

---

## v2.0.0 版本更新計劃（融合版）

> 將 hybrid-p2p-architecture.md 的分散式方案與 plan.md / v2.0.0-planning.md 的原有更新內容整合為統一的版本規劃。
> 核心原則：Offline-First 先行，原有功能並行開發，P2P 作為選擇性優化。

### 版本路線圖（融合後）

```
v1.14.0 (正式發布)
  │
  ├── v2.0.0 (Offline-First 核心 + Pixel Art 視覺重設計)
  │   ├── 離線遊戲引擎 (Phase A + B)
  │   ├── 登入與條約頁點陣化
  │   ├── 導航欄與選單點陣化
  │   ├── 3D 像素藝術字元件
  │   └── 登入公約與引導流程
  │
  ├── v2.1.0 (滿版地圖 + 派遣掛機)
  │   ├── 2D 像素世界地圖
  │   ├── 跨國派遣礦場
  │   ├── 五大礦層升級
  │   └── 萬人開採動畫
  │
  ├── v2.2.0 (全服秘寶抽獎)
  │   ├── 抽獎系統核心
  │   ├── 神物庫存管理
  │   └── 神物效果與轉生
  │
  ├── v2.3.0 (真實數據 + P2P 聊天)
  │   ├── 真實在線人數 (Redis)
  │   ├── 國家 GDP 連動
  │   ├── 全服氣運排行
  │   └── WebRTC 聊天 (Phase D)
  │
  └── v2.4.0 (反作弊 + 備援節點)
      ├── 後端資產驗證
      ├── 安全抽獎校驗
      └── 備援節點輕量版 (Phase E)
```

### v2.0.0 — Offline-First + Pixel Art 視覺重設計

> 這是整個融合計畫的起點，目標是讓遊戲不再完全依賴伺服器，同時完成視覺重設計。

#### v2.0.0a — Service Worker + GameEngine.js（Phase A）✅ 已完成

- **做什麼：** 整合 `vite-plugin-pwa`（injectManifest 模式），Service Worker 自動注入 precache manifest。建立 `client/src/engine/GameEngine.js`（mirror backend gameLoop），建立 `client/src/engine/StorageAdapter.js`（IndexedDB 封裝）。`main.jsx` 改用 `virtual:pwa-register` 自動註冊 SW 並支援版本更新提示。
- **改哪個檔案：** `client/sw.js`（重寫，支援 __WB_MANIFEST）、`client/public/manifest.json`（新建）、`client/vite.config.js`（加入 VitePWA 插件）、`client/src/main.jsx`（改用 registerSW）、`client/package.json`（vite-plugin-pwa 相依）、`client/src/engine/GameEngine.js`（新建）、`client/src/engine/StorageAdapter.js`（新建）
- **驗證：** 關掉 WiFi → 重開瀏覽器 → 輸入 earthonline.qzz.io → 頁面正常載入 → 離線 tick 正常執行 → PT/時間/等級正確累積

#### v2.0.0b — IndexedDB 持久層（Phase A）✅ 已完成

- **做什麼：** 已整合至 StorageAdapter.js，支援 `saveGameState`、`loadGameState`、`startAutoSave`（每 10 秒自動存檔）。
- **改哪個檔案：** `client/src/engine/StorageAdapter.js`（已建立）
- **驗證：** 關閉頁籤後重開，離線期間的進度正確還原

#### v2.0.0c — 離線模式整合（Phase B）✅ 已完成

- **做什麼：** 修改 `GameContext.jsx` 整合 GameEngine + StorageAdapter。啟動時從 IndexedDB 讀取存檔，發動機開始 tick。伺服器連線時接收 `user_state_update` 同步引擎。斷線時自動切換離線模式，引擎持續運作。提供 `isOfflineMode`、`getEngineState()` 給元件使用。
- **改哪個檔案：** `client/src/context/GameContext.jsx`（重寫）
- **驗證：** 拔掉網路 → 遊戲繼續運作（PT/時間持續累積）→ 接回網路 → 離線成長合併至伺服器

#### v2.0.0d — 離線模式 UI（Phase C）✅ 已完成

- **做什麼：** 斷線時 Header 顯示「⚡ 離線模式」標籤（橙色警告風格），而非紅色「已斷線」。側邊欄 PT/累積時間在離線時顯示本地引擎數值。加入 `offlineState` 每秒同步引擎狀態至 UI。
- **改哪個檔案：** `client/src/App.jsx`（新增 offlineState state + 離線 UI 切換）
- **驗證：** 斷線時顯示「⚡ 離線模式」，PT/時間持續跳動，無凍結畫面

#### v2.0.0e — 行動版排版修正 ✅ 已完成

- **做什麼：** 重構整個 mobile CSS。合併重複的 768px media query（原本有兩段互相衝突的規則），新增 480px 小螢幕斷點。修正：Header 垂直堆疊、選單不溢出、Modal 從底部彈出（bottom-sheet 風格）、地圖佔 40-50vh 不是滿版、觸控按鈕至少 36px 高、底欄 log 縮小。
- **改哪個檔案：** `client/src/index.css`（重寫 Mobile media query，新增 480px & 1024px 斷點）
- **驗證：** iPhone SE / Android 小螢幕上 Header 不重疊、Modal 可操作、地圖可縮放、按鈕可點擊

#### v2.0.0e — 登入頁點陣化（原 v2.0.1）

- **做什麼：** 登入頁背景改為深褐色粗糙礦岩點陣紋理，中央登入框為深灰色半透明面板，亮綠色發光邊框。底部條約改為深邃草地綠點陣條。
- **改哪個檔案：** `client/src/index.css`、`client/src/components/LoginGateway.jsx`
- **驗證：** 登入頁呈現礦岩紋理 + 亮綠邊框

#### v2.0.0f — 導航欄點陣化（原 v2.0.2）

- **做什麼：** 導航欄改為深石磚灰點陣紋理，左側 LOGO 改為黃色立體爆裂紋藝術字。下拉選單改為深灰色格子物品欄視覺。
- **改哪個檔案：** `client/src/App.jsx`、`client/src/index.css`
- **驗證：** 導航欄呈現石磚灰點陣 + 黃色爆裂紋

#### v2.0.0g — PixelWordArt 元件（原 v2.0.3）

- **做什麼：** 建立 `<PixelWordArt>` 元件（多重 text-shadow + linear-gradient），全站標題套用。
- **改哪個檔案：** `client/src/components/PixelWordArt.jsx`（新建）、`client/src/App.jsx`
- **驗證：** 所有標題呈現 3D 立體像素字效果

#### v2.0.0h — 登入公約流程（原 v2.1.1）

- **做什麼：** 強制公約勾選、Discord 一鍵登入整合、後端記錄 covenantAccepted。
- **改哪個檔案：** `client/src/components/LoginGateway.jsx`、`backend/models/User.js`、`backend/routes/auth.js`、`client/src/i18n.js`
- **驗證：** 未勾約時按鈕禁用，勾約後可登入

#### v2.0.0i — 引導式文檔（原 v2.1.2）

- **做什麼：** 登入後單頁引導頁，三大陣營介紹 + 點陣化照片。
- **改哪個檔案：** `client/src/components/OnboardingGuide.jsx`（新建）、`client/src/components/FactionSelect.jsx`（新建）、`client/src/App.jsx`、`client/src/i18n.js`
- **驗證：** 登入後先看到引導頁，可選擇陣營

### v2.1.0 — 滿版世界地圖與派遣掛機

#### v2.1.0a — 2D 像素世界地圖（原 v2.2.1）

- **做什麼：** 滿畫面 2D 像素世界地圖（含各國國旗），支援自由拖曳與滾輪縮放，點陣紋理疊加。
- **改哪個檔案：** `client/src/components/WorldMap.jsx`（新建）、`client/src/App.jsx`
- **驗證：** 地圖可拖曳縮放，各國位置正確，點陣風格

#### v2.1.0b — 跨國派遣礦場（原 v2.2.2）

- **做什麼：** 點擊國家彈出情報窗（在線人數、GDP/秒、已進駐玩家數），點擊「建立礦場」開始自動掛機。
- **改哪個檔案：** `client/src/components/CountryInfoPanel.jsx`（新建）、`client/src/App.jsx`、`backend/socket/gameHandler.js`
- **驗證：** 派遣後掛機金幣跳動，資料庫更新

#### v2.1.0c — 五大礦層升級（原 v2.2.3）

- **做什麼：** Lv.1 碎石地層 → Lv.5 地球星核，指數級產出公式。前端顯示當前礦層與升級按鈕。
- **改哪個檔案：** `backend/config/constants.js`、`backend/services/mineService.js`（新建）、`client/src/components/MinePanel.jsx`（新建）
- **驗證：** 升級花費與產出符合指數曲線，動畫播放

#### v2.1.0d — 萬人開採動畫（原 v2.2.4）

- **做什麼：** 十字鎬像素敲擊動畫，數量與進駐玩家數成正比。
- **改哪個檔案：** `client/src/components/PickaxeAnimation.jsx`（新建）、`client/src/components/WorldMap.jsx`
- **驗證：** 有玩家的國家上方出現十字鎬動畫

### v2.2.0 — 全服限量秘寶抽獎

#### v2.2.0a — 抽獎系統核心（原 v2.3.1）

- **做什麼：** 抽獎 API（Common 89.99% / Epic 9.9% / Mythic 0.1% / Unique 0.001%），安全隨機數、方塊加載動畫。
- **改哪個檔案：** `backend/services/lotteryService.js`（新建）、`client/src/components/LotteryModal.jsx`（新建）、`backend/config/constants.js`
- **驗證：** 抽獎機率符合設定，資金正確扣除

#### v2.2.0b — 神物庫存管理（原 v2.3.2）

- **做什麼：** MongoDB 行級鎖（findOneAndUpdate 原子操作），庫存歸零即拒發。管理介面設定限量。
- **改哪個檔案：** `backend/services/lotteryService.js`
- **驗證：** 高併發不超發，庫存 0 時回傳錯誤

#### v2.2.0c — 神物效果與轉生（原 v2.3.3）

- **做什麼：** 史詩 +5%、神話 +20% 掛機速度；全服廣播 + Discord 通知。熔煉轉生系統。
- **改哪個檔案：** `backend/services/gameLoop.js`、`backend/discordBot.js`、`client/src/components/LotteryModal.jsx`
- **驗證：** 神物效果正確，轉生後產出加成生效

### v2.3.0 — 真實數據 + P2P 聊天

#### v2.3.0a — 真實在線人數統計（原 v2.4.1）

- **做什麼：** Redis Set 統計每個國家當前在線玩家，切換國家時實時 +1/-1。
- **改哪個檔案：** `backend/services/redisService.js`（新建）、`backend/server.js`、`backend/socket/gameHandler.js`
- **驗證：** 切換國家後 Redis Set 正確增減

#### v2.3.0b — 國家 GDP 即時加總（原 v2.4.2）

- **做什麼：** 點擊國家顯示的總產出/秒由該國所有在線玩家真實開採時薪加總，每秒更新。
- **改哪個檔案：** `backend/services/gdpService.js`（新建）、`client/src/components/CountryInfoPanel.jsx`
- **驗證：** 高階玩家進駐後 GDP 暴漲，離開後下跌

#### v2.3.0c — 全服氣運值排行（原 v2.4.3）

- **做什麼：** 每 5 分鐘 SUM 三大陣營神物權重 + 轉生次數，第一名陣營地圖金色粒子特效。
- **改哪個檔案：** `backend/services/luckService.js`（新建）、`client/src/components/WorldMap.jsx`
- **驗證：** 氣運排行第一的陣營顯示金色粒子特效

#### v2.3.0d — WebRTC 聊天（Phase D，P2P 選擇性啟用）

- **做什麼：** 實作 WebRTC Mesh 聊天，Gossip 廣播 + 去重。使用現有 Render 伺服器做信號交換（或 Cloudflare Worker）。保留 socket.io 聊天作為 fallback。設定頁新增「P2P 聊天」開關。
- **改哪個檔案：** `client/src/engine/P2PNetwork.js`（新建）、`client/src/engine/GossipProtocol.js`（新建，可合併）、`backend/server.js`（新增信號端點）、`client/src/hooks/useSocket.js`、`client/src/App.jsx`、`client/src/i18n.js`
- **驗證：** 關掉 Render 後兩個瀏覽器可互發聊天；開啟 Render 時聊天正常

### v2.4.0 — 反作弊 + 備援節點

#### v2.4.0a — 後端資產驗證（原 v2.5.1）

- **做什麼：** 升級/抽獎時後端根據「上次存檔時間 × 理論每秒產出」重算，拒絕前端偽造數據。
- **改哪個檔案：** `backend/services/validationService.js`（新建）、`backend/services/gameLoop.js`
- **驗證：** 修改前端請求數值被後端拒絕

#### v2.4.0b — 安全抽獎校驗（原 v2.5.2）

- **做什麼：** 抽獎亂數由 crypto.randomBytes() 生成，前端僅播放動畫。
- **改哪個檔案：** `backend/services/lotteryService.js`
- **驗證：** 前後端結果一致，無法偽造

#### v2.4.0c — 備援節點輕量版（Phase E）

- **做什麼：** 建立 `desktop/VolunteerNode.js`（100-150 行），功能：WebSocket relay + SQLite 持久化（可選）。Render 健康度監控 + 自動切換客戶端連線。不設公開志願者計劃，僅由維護者或信任社群運作。
- **改哪個檔案：** `desktop/VolunteerNode.js`（新建）、`desktop/package.json`、`client/src/hooks/useSocket.js`（新增節點健康度邏輯）
- **驗證：** 關掉 Render，客戶端自動切換到備援節點，所有核心功能正常

### v1.14.0 — 正式發布（前置任務）

> 在開始 v2.0.0 之前，須先完成 v1.14.0 發布。以下為從 plan.md 承接的未完成任務。

#### 執行前確認

完成 v1.12.4 區域對抗系統的未完成項目、以及 v1.13.x 所有安全/效能修正。

- [ ] **v1.12.4b** 區域結算 + 獎勵（backend）— 整合 warStats 到 settlementService
- [ ] **v1.12.4c** 前端區域對抗面板（frontend）
- [ ] **v1.12.5a** 背景架構 + Style 1 保留
- [ ] **v1.12.5b** Style 2: 伺服器機房
- [ ] **v1.12.5c** Style 3~5 + 切換 UI
- [ ] **v1.13.1a** 修復外洩 secrets
- [ ] **v1.13.1b** 修復 CORS 與啟用 helmet
- [ ] **v1.13.1c** 修復 crash.log 與 IP 洩漏
- [ ] **v1.13.1d** 修復 terminalHandler 未定義變數
- [ ] **v1.13.1e** 移除重複程式碼
- [ ] **v1.13.1f** 清理未使用 import
- [ ] **v1.13.2a** MongoDB Indexes
- [ ] **v1.13.2b** 快取層
- [ ] **v1.13.2c** App.jsx 組件拆分
- [ ] **v1.13.2d** 統一 Discord 角色分配
- [ ] **v1.13.3a** ESLint + Prettier
- [ ] **v1.13.3b** Rate Limiting 補完
- [ ] **v1.13.3c** 離線補償防重複
- [ ] **v1.13.4a** 大量連線模擬
- [ ] **v1.13.4b** 邊界情況驗證
- [ ] **v1.13.4c** 完整回歸測試
- [ ] **v1.14.0a** 更新 README.md
- [ ] **v1.14.0b** 更新 AGENTS.md
- [ ] **v1.14.0c** 更新 CHANGELOG
- [ ] **v1.14.0d** dev → main merge + CF Pages 部署

### 總版本時程表

| 版本 | 主題 | 預計天數 | 相依性 | 優先級 |
|------|------|---------|--------|--------|
| v1.14.0 | 正式發布（承接 plan.md 未完成項） | 14 天 | v1.12.3 | High |
| v2.0.0a | Service Worker + vite-plugin-pwa + GameEngine + StorageAdapter | 2 天 | v1.14.0 | High | ✅ |
| v2.0.0b | IndexedDB 持久層 | 1 天 | v2.0.0a | High | ✅ |
| v2.0.0c | 離線模式整合 (GameContext) | 2 天 | v2.0.0b | High | ✅ |
| v2.0.0d | 離線模式 UI (App.jsx) | 1 天 | v2.0.0c | Medium | ✅ |
| v2.0.0e | 行動版排版修正 | 1 天 | — | High | ✅ |
| v2.0.0f | 登入頁點陣化 | 2 天 | — | Medium |
| v2.0.0f | 導航欄點陣化 | 2 天 | — | Medium |
| v2.0.0g | PixelWordArt 元件 | 1 天 | — | Low |
| v2.0.0h | 登入公約流程 | 2 天 | v2.0.0e | Medium |
| v2.0.0i | 引導式文檔 | 3 天 | v2.0.0h | Medium |
| v2.1.0a | 像素世界地圖 | 4 天 | v2.0.0i | High |
| v2.1.0b | 跨國派遣礦場 | 3 天 | v2.1.0a | High |
| v2.1.0c | 五大礦層升級 | 3 天 | v2.1.0b | High |
| v2.1.0d | 萬人開採動畫 | 2 天 | v2.1.0b | Low |
| v2.2.0a | 抽獎系統核心 | 3 天 | v2.1.0c | High |
| v2.2.0b | 神物庫存管理 | 2 天 | v2.2.0a | High |
| v2.2.0c | 神物效果與轉生 | 3 天 | v2.2.0b | Medium |
| v2.3.0a | Redis 在線統計 | 2 天 | v2.1.0a | Medium |
| v2.3.0b | 國家 GDP 連動 | 2 天 | v2.3.0a | Medium |
| v2.3.0c | 全服氣運排行 | 2 天 | v2.3.0b | Low |
| v2.3.0d | WebRTC 聊天 | 4 天 | v2.0.0c | Medium |
| v2.4.0a | 後端資產驗證 | 2 天 | v2.0.0a | Medium |
| v2.4.0b | 安全抽獎校驗 | 1 天 | v2.2.0a | Medium |
| v2.4.0c | 備援節點輕量版 | 3 天 | v2.3.0d | Low |

**總計：24 個子版本，約 60 個工作日（~3 個月）**

### Render 節省時間表（更新版）

| 版本完成後 | Render 運行/月 | 節省 | 關鍵理由 |
|-----------|---------------|------|---------|
| 目前 | 720h | 基準 | 完全依賴 |
| v1.14.0 | 720h | 0% | 安全修正 + 重構，仍完全依賴 |
| v2.0.0d (Offline-First) | 720h | 0% | 玩家離線可玩，但伺服器仍需為連線玩家服務 |
| v2.0.0i (全部 v2.0.0) | 720h | 0% | 仍需要伺服器做資料持久化 |
| v2.3.0d (P2P 聊天) | 500h | ~30% | 離峰時聊天不依賴 Render |
| v2.4.0c (備援節點) | 200h | ~72% | Render 可關閉大部分時間，僅備援 |

> 最終 Render 每月費用從約 $7 降至約 $2（備援模式下）。

### 版本標記規則

```
✅ = 已完成（v1.8.x ~ v1.12.3 認定完成）
⬜ = 待執行
🔄 = 進行中
⚠️ = 阻塞
```

### 風險登記

| 風險 | 影響版本 | 可能性 | 影響 | 緩解措施 |
|------|---------|--------|------|---------|
| WebRTC NAT 穿透失敗率高 | v2.3.0d | 中 | 部分玩家無法 P2P | TURN server + 降級至 socket.io |
| IndexedDB 被使用者清除 | v2.0.0a-v2.0.0c | 低 | 本地進度遺失 | 伺服器同步作為備份 |
| 礦層經濟平衡失調 | v2.1.0c | 中 | 遊戲進程破壞 | 上線後監控數據並調整參數 |
| Secret 再次外洩 | v1.14.0 | 低 | 安全事件 | 嚴格遵守 AGENTS.md Secrets 鐵則 |
| 志願節點惡意行為 | v2.4.0c | 低 | 資料被篡改 | 僅限信任節點 + 多節點驗證 |
| 瀏覽器 Tab 生命週期限制 | v2.3.0d | 中 | P2P 網路頻繁重組 | 離線補償機制已存在 |

---

> 最後更新：2026-06-13
> 分支：dev
