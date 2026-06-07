import re

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

donate_banner_code = """
const DonateBanner = () => {
  return (
    <div className="floating-panel" style={{ padding: '15px 20px', background: 'rgba(255, 65, 108, 0.1)', border: '1px solid #ff416c', width: '100%', marginTop: '15px' }}>
      <div style={{ fontSize: '0.9rem', color: '#ff416c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
        <Database size={16} /> 伺服器微服務升級募資計畫
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '15px', lineHeight: '1.6' }}>
        為了打造真正的全球無上限微服務架構，我們計畫在 Render 上建立硬體分流叢集（包含獨立的 Redis 與三大洲 Web Service）。<br/>
        <span style={{color: '#38ef7d'}}>優點：</span>真實硬體分流，乘載量無上限。<br/>
        <span style={{color: '#ff416c'}}>缺點：</span>設定較複雜，且 Render 的 Redis 與多台伺服器將產生高昂月費。
      </div>
      <a 
        href="https://buymeacoffee.com/lucas1126" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#ff416c', color: '#fff', padding: '8px 15px',
          borderRadius: '4px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold',
          transition: 'all 0.3s ease'
        }}
      >
        <Coffee size={14} /> 贊助伺服器升級 (Buy Me a Coffee)
      </a>
    </div>
  );
};
"""

# Inject DonateBanner component before Dashboard
content = content.replace("function Dashboard", donate_banner_code + "\nfunction Dashboard")

# Inject <DonateBanner /> into the map overlays
# The map overlays is right before <MapContainer
content = content.replace("<MapContainer", "<DonateBanner />\n          <MapContainer")

with open('client/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("DonateBanner injected successfully.")
