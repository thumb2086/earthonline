import re

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update LoginGateway to support Region Selection
login_func_old = r"function LoginGateway\(\{ onLogin \}\) \{(.*?)\s+const handleDiscordLogin"
login_state_add = """function LoginGateway({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [region, setRegion] = useState('asia');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check for discord token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
      onLogin(token, 'Discord User', region); 
    }
  }, [onLogin, region]);

  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline.onrender.com';
  const API_URL = `${BASE_URL}/api/${region}`;

  const handleDiscordLogin"""

content = re.sub(login_func_old, login_state_add, content, flags=re.DOTALL)

# Update LoginGateway handleSubmit
login_submit_old = r"onLogin\(data\.token, data\.username\);\s*\} else \{\s*onLogin\(data\.token, data\.user\.username\);\s*\}"
login_submit_new = """onLogin(data.token, data.username, region);
      } else {
        onLogin(data.token, data.user.username, region);
      }"""
content = re.sub(login_submit_old, login_submit_new, content)

# Update LoginGateway UI to add select
form_group_old = r"<div className=\"form-group\">\s*<label>SUBJECT ID \(帳號\)</label>"
region_select_ui = """<div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{color: 'var(--accent-color)'}}>GLOBAL REGION (伺服器分區)</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="terminal-input" style={{appearance: 'auto', background: 'rgba(0,0,0,0.5)', color: 'var(--accent-color)', fontWeight: 'bold'}}>
              <option value="asia">[Asia-East] 亞洲樞紐</option>
              <option value="us">[US-West] 美洲中樞</option>
              <option value="eu">[EU-Central] 歐洲陣列</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>SUBJECT ID (帳號)</label>"""
content = re.sub(form_group_old, region_select_ui, content)

# 2. Update App component state
app_state_old = r"const \[token, setToken\] = useState\(localStorage\.getItem\('eo_token'\)\);\n  const \[username, setUsername\] = useState\(localStorage\.getItem\('eo_username'\)\);"
app_state_new = """const [token, setToken] = useState(localStorage.getItem('eo_token'));
  const [username, setUsername] = useState(localStorage.getItem('eo_username'));
  const [region, setRegion] = useState(localStorage.getItem('eo_region') || 'asia');"""
content = re.sub(app_state_old, app_state_new, content)

# Update App handleLogin
handle_login_old = r"const handleLogin = \(newToken, newUsername\) => \{\n    localStorage\.setItem\('eo_token', newToken\);\n    localStorage\.setItem\('eo_username', newUsername\);\n    setToken\(newToken\);\n    setUsername\(newUsername\);\n  \};"
handle_login_new = """const handleLogin = (newToken, newUsername, newRegion) => {
    localStorage.setItem('eo_token', newToken);
    localStorage.setItem('eo_username', newUsername);
    localStorage.setItem('eo_region', newRegion);
    setToken(newToken);
    setUsername(newUsername);
    setRegion(newRegion);
  };"""
content = re.sub(handle_login_old, handle_login_new, content)

handle_logout_old = r"const handleLogout = \(\) => \{\n    localStorage\.removeItem\('eo_token'\);\n    localStorage\.removeItem\('eo_username'\);\n    setToken\(null\);\n    setUsername\(null\);\n  \};"
handle_logout_new = """const handleLogout = () => {
    localStorage.removeItem('eo_token');
    localStorage.removeItem('eo_username');
    localStorage.removeItem('eo_region');
    setToken(null);
    setUsername(null);
    setRegion(null);
  };"""
content = re.sub(handle_logout_old, handle_logout_new, content)

# Update App rendering to pass region to Dashboard
app_render_old = r"<Dashboard token=\{token\} onLogout=\{handleLogout\} />"
app_render_new = """<Dashboard token={token} onLogout={handleLogout} region={region} />"""
content = re.sub(app_render_old, app_render_new, content)

# 3. Update Dashboard signature and Socket URL
dashboard_sig_old = r"function Dashboard\(\{ token, onLogout \}\) \{"
dashboard_sig_new = """function Dashboard({ token, onLogout, region }) {
  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline.onrender.com';
  const API_URL = `${BASE_URL}/api/${region}`;
  const SOCKET_URL = BASE_URL;"""
content = re.sub(dashboard_sig_old, dashboard_sig_new, content)

# Update socket io initialization
io_init_old = r"const s = io\(SOCKET_URL\);"
io_init_new = """const s = io(SOCKET_URL, { path: `/socket.io/${region}/` });"""
content = re.sub(io_init_old, io_init_new, content)

# Add Global Hub State
global_stats_state_old = r"const \[globalStats, setGlobalStats\] = useState\(\{ activeUsers: 0, totalPopulation: 0, globalProduction: 0, socialCompression: '1\.000' \}\);"
global_stats_state_new = """const [globalStats, setGlobalStats] = useState({ activeUsers: 0, totalPopulation: 0, globalProduction: 0, socialCompression: '1.000' });
  const [hubStats, setHubStats] = useState(null);

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/global/stats`);
        if(res.ok) setHubStats(await res.json());
      } catch(e) {}
    };
    fetchHub();
    const inv = setInterval(fetchHub, 5000);
    return () => clearInterval(inv);
  }, [BASE_URL]);
"""
content = re.sub(global_stats_state_old, global_stats_state_new, content)

# Update API_URL in handleBindDiscord, handleBindDiscordManual, and leaderboard
content = re.sub(r'const baseUrl = API_URL\.replace\(\/\\/\$\/, \'\'\);\n\s*const res = await fetch\(`\$\{baseUrl\}/api/leaderboard', "const res = await fetch(`${API_URL}/leaderboard", content)
# wait, the original was:
# const baseUrl = API_URL.replace(/\/$/, '');
# const res = await fetch(`${baseUrl}/api/leaderboard`
# In my new API_URL, it is already `http://localhost:3001/api/asia`.
# Let's clean up all those manually with python string replacements
content = content.replace("const baseUrl = API_URL.replace(/\\/$/, '');", "")
content = content.replace("`${baseUrl}/api/leaderboard`", "`${API_URL}/leaderboard`")
content = content.replace("`${API_URL}/api/auth/discord", "`${API_URL}/auth/discord")
content = content.replace("`${API_URL}/api/bind-discord-manual", "`${API_URL}/bind-discord-manual")


# 4. Render Global Hub UI in the Geographic Matrix overlays
overlays_old = r"<div className=\"map-overlays\">\s*<div className=\"floating-panel\" style=\{\{display: 'flex', gap: '30px', padding: '15px 25px'\}\}>"
overlays_new = """<div className="map-overlays" style={{display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-start'}}>
            <div className="floating-panel" style={{display: 'flex', gap: '30px', padding: '15px 25px'}}>"""
content = re.sub(overlays_old, overlays_new, content)

hub_ui = """              </div>
            </div>
            
            {hubStats && (
              <div className="floating-panel" style={{padding: '12px 20px', background: 'rgba(0,0,0,0.85)', border: '1px solid #00d2ff'}}>
                <div style={{fontSize: '0.8rem', color: '#00d2ff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <Globe2 size={14}/> GLOBAL HUB (全球總樞紐)
                </div>
                <div style={{display: 'flex', gap: '15px', fontSize: '0.9rem'}}>
                  <div>Asia-East: <strong style={{color: region === 'asia' ? 'var(--accent-color)' : '#fff'}}>{hubStats.regions?.ASIA?.activeUsers || 0}</strong> 人</div>
                  <div>US-West: <strong style={{color: region === 'us' ? 'var(--accent-color)' : '#fff'}}>{hubStats.regions?.US?.activeUsers || 0}</strong> 人</div>
                  <div>EU-Central: <strong style={{color: region === 'eu' ? 'var(--accent-color)' : '#fff'}}>{hubStats.regions?.EU?.activeUsers || 0}</strong> 人</div>
                </div>
                <div style={{marginTop: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                  總計: {hubStats.totalActiveUsers} 人在線 / {hubStats.totalPopulation} 人口
                </div>
              </div>
            )}
"""
content = content.replace("              </div>\n            </div>\n\n          <MapContainer", hub_ui + "\n          <MapContainer")

# Update header title to show region
header_title_old = r"<span style=\{\{color: 'var\(--text-secondary\)'\}\}>// 所在伺服器地區 \[\{myNode\?\.country \|\| '連線中\.\.'\}\]</span>"
header_title_new = """<span style={{color: 'var(--text-secondary)'}}>// {region.toUpperCase()} ARRAY 區域 | 節點所在: [{myNode?.country || '連線中..'}]</span>"""
content = re.sub(header_title_old, header_title_new, content)

with open('client/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Frontend refactored successfully.")
