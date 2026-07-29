import { useEffect } from 'react';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize?client_id=1513563333985304596&redirect_uri=https%3A%2F%2Ftwonline.dpdns.org%2Fapi%2Fauth%2Fcb&response_type=code&scope=identify&state=login';

export default function LoginGateway({ onLogin }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
      onLogin(token);
    }
  }, [onLogin]);

  return (
    <div className="login-gateway">
      <div className="login-bg">
        <div className="nasa-bg"></div>
        <div className="nasa-stars">
          {Array.from({ length: 120 }, (_, i) => (
            <div key={i} className="nasa-star" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`, height: `${1 + Math.random() * 2}px`,
              animationDelay: `${Math.random() * 5}s`, animationDuration: `${2 + Math.random() * 4}s`,
            }} />
          ))}
        </div>
        <div className="nasa-earth"></div>
        <div className="nasa-earth-night"></div>
        <div className="nasa-glow"></div>
      </div>
      <div className="login-box">
        <div className="login-earth"></div>
        <h1 style={{ color: 'var(--accent-color)', fontSize: '2.2rem', letterSpacing: 4, marginBottom: 8 }}>
          EARTH ONLINE
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 30 }}>
          Discord 帳號登入
        </p>
        <a href={DISCORD_AUTH_URL} className="discord-btn">
          <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="#fff">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.59,67.59,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
          </svg>
          login with Discord
        </a>
      </div>
    </div>
  );
}
