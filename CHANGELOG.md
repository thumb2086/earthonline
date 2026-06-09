# 🛠️ 地球在線 EarthOnline — 版本更新日誌

───．───．───．───．───．───．───．───

## [v1.7.1] 主題配色與版面佈局優化

### 🎨 主題視覺重構 (Theming)
- **全部主題改為單色系設計**：每個主題只使用一個色相的深淺變化
  - **Cyberpunk**：青藍色系 (#00e5cc)，深藍黑背景
  - **Matrix**：經典綠 (#00ff41)，純黑背景
  - **Synthwave**：霓虹紫 (#ff00ff)，深紫背景
  - **Light Mode**：標準藍 (#2563eb)，淺灰背景
  - **Sunset**：夕陽橘 (#ff6b35)，深棕背景
- 所有硬編碼顏色替換為 CSS 主題變數 (`var(--accent-color)` / `var(--text-dim)` 等)
- 登入月亮的 box-shadow、雲朵、星星等裝飾元素全面跟隨主題色

### 📖 文字可讀性優化 (Readability)
- 深色主題使用極淺色文字（對比度 > 8:1）
- 淺色主題使用極深色文字（對比度 > 10:1）
- `textDim` 保持同色相中等亮度，輔助文字清晰可辨

### 🐛 版面修復 (Layout Fixes)
- **修復 CountdownBanner 被遮擋**：加入 `isolation: isolate` 與 `flexShrink: 0`
- **修復頂部被裁切**：`.app-container` 加入 `overflow-y: auto`
- **修復資料中心被壓縮**：`.main-content` 改為 `height: calc(100dvh - 120px)`
- **修復 .geographic-matrix 高度鏈**：補上 `height: 100%` 讓子層百分比有參考基準

### 🔘 按鈕亮度調整 (UI Polish)
- 下載電腦版按鈕改為 `surface-color` 背景 + `accent-color` 邊框，不再刺眼
- 側欄與說明書的下載按鈕統一改為 `text-dim` 低調風格

───．───．───．───．───．───．───．───
[ 系統提示 ] 主題配色已全面重置，建議重新整理頁面以獲得最佳視覺體驗。
