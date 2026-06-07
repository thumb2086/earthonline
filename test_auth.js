const { io } = require('socket.io-client');
const fetch = require('node-fetch');

(async () => {
  // 1. Register
  const res = await fetch('https://earthonline.onrender.com/api/asia/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_node_user', password: 'password123' })
  });
  const data = await res.json();
  const token = data.token;
  if (!token) {
    console.error('Failed to get token:', data);
    process.exit(1);
  }
  
  console.log('Got token, connecting to socket...');
  const socket = io('https://earthonline.onrender.com/asia', {
    transports: ['websocket'],
    path: '/socket.io'
  });

  socket.on('connect', () => {
    console.log('Connected! Emitting authenticate...');
    socket.emit('authenticate', { token });
  });

  socket.on('auth_error', (err) => {
    console.error('Auth error:', err);
    process.exit(1);
  });

  socket.on('init_data', (data) => {
    console.log('Success! Received init_data:', data);
    process.exit(0);
  });

  socket.on('connect_error', (err) => {
    console.error('Connect error:', err);
    process.exit(1);
  });

  setTimeout(() => {
    console.log('Timeout waiting for init_data or auth_error');
    process.exit(1);
  }, 10000);
})();
