import re
import json

with open('client/src/i18n.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add translation keys for 本伺服器總人口
content = content.replace('"全球總人口": "全球總人口",', '"全球總人口": "全球總人口",\n    "本伺服器總人口": "本伺服器總人口",')
content = content.replace('"全球總人口": "Global Population",', '"全球總人口": "Global Population",\n    "本伺服器總人口": "Server Population",')

with open('client/src/i18n.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("i18n added keys")
