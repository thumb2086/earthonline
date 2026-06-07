const { io } = require('socket.io-client');

const socket = io('https://earthonline.onrender.com/asia', {
  transports: ['websocket'],
  path: '/socket.io'
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('authenticate', { token: 'invalid_token_but_should_trigger_auth_error' });
});

socket.on('auth_error', (data) => {
  console.log('Auth Error received:', data);
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.log('Connect Error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout waiting for response');
  process.exit(1);
}, 5000);
