import re

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update lucide-react imports
content = re.sub(
    r"import \{ Globe2, Server, Activity, User, Network, Link as LinkIcon, ShieldCheck, Info, BookOpen, FileText, Database, Code, X, Navigation, Star, Clock, Volume2, VolumeX, Coffee, Users, ChevronDown \} from 'lucide-react';",
    "import { Globe2, Server, Activity, User, Network, Link as LinkIcon, ShieldCheck, Info, BookOpen, FileText, Database, Code, X, Navigation, Star, Clock, Volume2, VolumeX, Coffee, Users, ChevronDown, Zap, Tornado, Coins, Satellite, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';",
    content
)

# 2. Remove getFlagEmoji function completely
content = re.sub(r"function getFlagEmoji\(countryCode\) \{.*?\}\n", "", content, flags=re.DOTALL)

# 3. Replace {getFlagEmoji(user.country)}
content = content.replace("{getFlagEmoji(user.country)}", "<div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><MapPin size={16} /> {user.country || 'UNKNOWN'} 伺服器</div>")

# 4. Replace emojis in GlobalEventBanner
content = content.replace("icon = '⚡';", "icon = <Zap size={18} />;")
content = content.replace("icon = '🌪️';", "icon = <Tornado size={18} />;")
content = content.replace("icon = '💰';", "icon = <Coins size={18} />;")
content = content.replace("icon = '🛰️';", "icon = <Satellite size={18} />;")
content = content.replace("icon = '⚠️';", "icon = <AlertTriangle size={18} />;")

# 5. Replace emojis in DocumentationOverlay
content = content.replace("⚡ 量子爆發 (QUANTUM_BURST)", "<Zap size={20} /> 量子爆發 (QUANTUM_BURST)")
content = content.replace("🌪️ 太陽風暴 (SOLAR_STORM)", "<Tornado size={20} /> 太陽風暴 (SOLAR_STORM)")
content = content.replace("💰 數據淘金潮 (DATA_GOLD_RUSH)", "<Coins size={20} /> 數據淘金潮 (DATA_GOLD_RUSH)")
content = content.replace("🛰️ 衛星連線最佳化 (SATELLITE_ALIGNMENT)", "<Satellite size={20} /> 衛星連線最佳化 (SATELLITE_ALIGNMENT)")
content = content.replace("⚠️ 系統維護模式 (SYSTEM_MAINTENANCE)", "<AlertTriangle size={20} /> 系統維護模式 (SYSTEM_MAINTENANCE)")

# Fix alignment for the h3 elements in DocumentationOverlay
# They currently have string text. When we add the icon, it should align well.
content = content.replace("<h3 style={{ color: '#00d2ff', marginTop: 0, marginBottom: '10px' }}>", "<h3 style={{ color: '#00d2ff', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>")
content = content.replace("<h3 style={{ color: '#ff416c', marginTop: 0, marginBottom: '10px' }}>", "<h3 style={{ color: '#ff416c', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>")
content = content.replace("<h3 style={{ color: '#f8b500', marginTop: 0, marginBottom: '10px' }}>", "<h3 style={{ color: '#f8b500', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>")
content = content.replace("<h3 style={{ color: '#38ef7d', marginTop: 0, marginBottom: '10px' }}>", "<h3 style={{ color: '#38ef7d', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>")
content = content.replace("<h3 style={{ color: '#8e9eab', marginTop: 0, marginBottom: '10px' }}>", "<h3 style={{ color: '#8e9eab', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>")

with open('client/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Icons replaced successfully.")
