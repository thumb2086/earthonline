# earthonline — 開發約束（AGENTS.md）

> **2026-10-18 起：本專案已淘汰，由 `zixi-earth` 取代。**
> 舊資產在 2026-06~13 已換算併入 `zixi-earth/`。
> 這份文件留著是為了理解當初為什麼是這樣，不是操作手冊。

---

## 網域歸屬（2026-10-18 使用者確認）

```
twonline.dpdns.org       →  zixi-earth       ← 網域繼承給 zixi-earth
zixiearth.dpdns.org      →  zixi-earth
aibot.twonline.dpdns.org →  earthonline worker（本專案，唯一還活著的東西）
```

★ **兩個 host 都有 `/api/aibot/*`。**

因為合併時 `src/aibot_queue.js` 也被帶進 `zixi-earth`。
**看網域不會知道是哪個 worker 處理** —— 2026-10-18 實測
`https://twonline.dpdns.org/api/aibot/queue` 會回應（401 或 200），
而那已經是 zixi-earth 了。

---

## ⛔ 與 zixi-earth 共用 Cloudflare account_id

```
account_id = 2513d9129183c9319ad07b504251a69b     ← 與 zixi-earth 相同
```

★ **免費層的 D1 額度是「帳號層級」的。**

所以這個專案的排程寫太多，會**直接吃掉 zixi-earth 的額度**。
這不是理論風險 —— 2026-10-18 就發現：

```jsonc
// wrangler.dev.jsonc 原本
"crons": ["*/10 * * * *"]     // 144 次/天
```

而且我當時的註解寫著「dev.twonline.dpdns.org 不解析 = 可能沒部署」——
**那是錯的**。`wrangler deployments list --name earthonline-dev`
顯示 **10 筆部署紀錄**，cron 一直在跑。

已改為 `"crons": []` 並實測 `wrangler triggers` 確認。

### ★ 一條值得記的教訓

**域名解析不到，推不出「worker 沒部署過」** —— cron trigger 跟 DNS 毫無關係。

這跟「JWT 簽章有效，推不出帳號還存在」是同一類錯誤：
**用一個不相干的訊號去推論另一件事。**

---

## 還沒刪掉的東西（等使用者明確指示）

| 項目 | 現況 | 為什麼沒刪 |
|---|---|---|
| `earthonline` worker（prod） | 活著 | 刪除不可逆 |
| `aibot.twonline.dpdns.org` | 活著 | 等 aibot 全轉到 zixi-earth |
| `earthonline-dev` worker | 活著，cron 已清空 | 同上 |
| `earthonline-db-dev` D1 | 存在 | dev 用 |

★ 刪任何一個都不可逆，所以都留著。

---

## aibot 的驗證（2026-10-18 修好）

原本 `/api/aibot/report` 完全沒有驗證 —— 任何人都能 POST 寫入 D1。
但修好之後**在線上仍是無效的**，因為：

1. `aibotAuth()` 是 `if (!env.AIBOT_TOKEN) return true;`（未設就放行）
2. 而 production 的 secret 清單裡**從來沒有 AIBOT_TOKEN**

所以「開發期便利」在線上是一扇開著的門。實測（修復前）：

    POST /api/aibot/report   （完全沒有 Authorization）
      → HTTP 201 {"id":3,"status":"pending"}

現在改成 **fail-closed**，並在 zixi-earth 那邊也設定了同一個 token
（否則 aibot 會因為本專案淘汰而整個死掉）。

---

## 部署

`wrangler deploy` 在 CJK 路徑下必定 crash（`0xC0000409`）。
走 ASCII 副本：

```bash
cd C:\Users\CPXru\.thumb-work
node sync-eo-ascii.cjs
cd C:\Users\CPXru\eo-deploy-ascii
node node_modules\wrangler\bin\wrangler.js deploy
```

⚠️ `cmd /c mklink` 會把中文來源路徑截斷（報「指定的路徑無效 - Users」），
要用 PowerShell 的 `New-Item -ItemType Junction`。