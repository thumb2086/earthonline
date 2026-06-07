import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the incorrect assignment with the correct db query
content = content.replace("state.globalProduction = state.multiplier;", "state.globalProduction = await db.getRegionProduction(regionName);")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched state.globalProduction assignment")
