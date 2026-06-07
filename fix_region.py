import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace regionStates[region] with regionStates[regionName]
content = content.replace('regionStates[region]', 'regionStates[regionName]')

# Replace `/${region}` with `/${regionName}`
content = content.replace('namespace !== `/${region}`', 'namespace !== `/${regionName}`')

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed region variable reference!")
