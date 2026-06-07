import re
import json

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all Chinese text
matches = re.findall(r'[\u4e00-\u9fa5]+[a-zA-Z0-9\s()]*[\u4e00-\u9fa5]*', content)
# Clean up matches
unique_strings = set()
for m in matches:
    clean_str = m.strip()
    if clean_str and len(clean_str) > 0:
        unique_strings.add(clean_str)

# Some extra common phrases we know are in App.jsx
manual_keys = [
    "地球在線連線建立中...",
    "驗證金鑰已發送，等待授權...",
    "授權過期，請重新登入",
    "確認：節點",
    "登入網路",
    "全球總人口",
    "全球線上人數",
    "全球總掛機時間",
    "伺服器即時負載",
    "連線延遲",
    "伺服器狀態",
    "伺服器微服務叢集計畫",
    "贊助創作者",
    "使用者帳號",
    "總生存時間",
    "健康狀態",
    "網路連線狀態",
    "上傳",
    "下載",
    "封包遺失",
    "區間群聚超載系統",
    "世界頻道 / 系統日誌",
    "輸入訊息，與全球節點交流...",
    "發送",
    "定位我的節點",
    "衛星",
    "暗黑",
    "街道",
    "伺服器微服務升級募資計畫"
]
for k in manual_keys:
    unique_strings.add(k)

# Create a dictionary for zh -> en
zh_en_map = {}
for zh in sorted(unique_strings):
    # Extremely simple placeholder logic, will use AI to translate later or just hardcode some
    zh_en_map[zh] = "TODO"

with open('client/src/i18n_dict.json', 'w', encoding='utf-8') as f:
    json.dump(zh_en_map, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(zh_en_map)} strings.")
