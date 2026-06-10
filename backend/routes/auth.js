const express = require('express');
const router = express.Router({ mergeParams: true });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');
const db = require('../db');
const User = require('../models/User');
const discordBot = require('../discordBot');
const { JWT_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL, FRONTEND_URL } = require('../config/env');

const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many registrations from this IP, please try again later' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts, please try again later' } });
const sendVerificationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: { error: 'Too many verification emails sent, please try again later' } });

function obfuscateIp(ip) {
  if (!ip) return '0.0.0.0';
  const ipv4Match = ip.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4Match) return ipv4Match[1] + '.x.x';
  const ipv6Match = ip.match(/^([0-9a-f:]+:[0-9a-f:]+):/i);
  if (ipv6Match) return ipv6Match[1] + ':xxxx:xxxx';
  return 'x.x.x.x';
}

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const trimmedUser = username.trim();
    if (trimmedUser.length < 2 || trimmedUser.length > 20) return res.status(400).json({ error: 'Username must be 2-20 characters' });
    if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(trimmedUser)) return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and Chinese characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    if (await db.findUserByUsername(trimmedUser)) return res.status(400).json({ error: 'Username already exists' });
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const ipCount = await User.countDocuments({ registerIp: ip, createdAt: { $gt: oneDayAgo } });
    if (ipCount >= 3 && ip !== '::1' && ip !== '127.0.0.1') return res.status(400).json({ error: '同一 IP 一天最多只能註冊 3 個帳號。' });
    if (ip !== '::1' && ip !== '127.0.0.1') {
      try {
        const fetch = (await import('node-fetch')).default;
        const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
        const cleanIp = ipv4Regex.test(ip) ? ip : '0.0.0.0';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const ipCheck = await fetch(`https://ip-api.com/json/${cleanIp}?fields=proxy,hosting`, { signal: controller.signal }).then(r => r.json());
        clearTimeout(timeout);
        if (ipCheck.proxy || ipCheck.hosting) return res.status(403).json({ error: '系統偵測到您正在使用 VPN 或代理伺服器，請關閉後再試。' });
      } catch (err) { console.error('[SYS] IP Check failed:', err); }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const recoveryKey = 'EO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const newUser = { id: 'EO-' + Date.now(), username: trimmedUser, password: hashedPassword, registeredAt: Date.now(), recoveryKey, registerIp: ip, homeRegion: req.params.region };
    await db.createUser(newUser);
    const token = jwt.sign({ username: trimmedUser }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Registration successful', recoveryKey, token, username: trimmedUser });
  } catch (err) { next(err); }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await db.findUserByUsernameOrEmail(username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) { next(err); }
});

router.get('/auth/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, createdAt: user.createdAt, accumulatedTime: user.accumulatedTime, accumulatedBonusPoints: user.accumulatedBonusPoints, discord: user.discord, recoveryKey: user.recoveryKey || '未產生', email: user.email, isEmailVerified: user.isEmailVerified });
  } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

router.post('/auth/generate-recovery-key', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.recoveryKey) return res.json({ success: true, recoveryKey: user.recoveryKey, existed: true });
    const recoveryKey = 'EO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    await User.updateOne({ username: user.username }, { recoveryKey });
    res.json({ success: true, recoveryKey });
  } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { username, recoveryKey, newPassword } = req.body;
    if (!username || !recoveryKey || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const user = await db.findUserByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.recoveryKey !== recoveryKey) return res.status(400).json({ error: 'Invalid recovery key' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ username }, { password: hashedPassword });
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) { next(err); }
});

router.post('/auth/delete-account', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await User.deleteOne({ username: user.username });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

router.post('/auth/send-verification', sendVerificationLimiter, async (req, res) => {
  const { email } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader || !email) return res.status(400).json({ error: 'Missing token or email' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) return res.status(400).json({ error: 'Invalid email format' });
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail && existingEmail.username !== user.username) return res.status(400).json({ error: 'Email already in use' });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.email = normalizedEmail;
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    user.isEmailVerified = false;
    await user.save();
    const verifyLink = `${FRONTEND_URL}?verifyToken=${verificationToken}`;
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({ from: `"Earth Online" <${process.env.EMAIL_USER}>`, to: email, subject: 'Verify your Earth Online account', html: `<div style="font-family: sans-serif; padding: 20px; text-align: center;"><h2>Earth Online Verification</h2><p>Click the button below to verify your email address.</p><a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background: #00ffaa; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a><p style="margin-top: 20px; font-size: 12px; color: #888;">Or copy this link: ${verifyLink}</p></div>` });
    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) { console.error(err); res.status(401).json({ error: 'Invalid token or server error' }); }
});

router.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing verification token' });
  try {
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
    if (user.emailVerificationTokenExpires && Date.now() > user.emailVerificationTokenExpires) return res.status(400).json({ error: 'Verification token has expired' });
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error during verification' }); }
});

router.post('/bind-discord-manual', async (req, res) => {
  const { token, discordId, username: globalName, avatar: avatarUrl } = req.body;
  if (!token || !discordId) return res.status(400).json({ error: 'Missing token or discordId' });
  if (!/^\d{17,20}$/.test(discordId)) return res.status(400).json({ error: 'Invalid Discord ID format' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const avatarIndex = (BigInt(discordId) >> 22n) % 6n;
    const profile = { id: discordId, username: globalName || discordId, avatar: avatarUrl || `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png` };
    const success = await db.updateUserDiscord(decoded.username, profile);
    if (success) res.json({ success: true, message: 'Discord ID bound successfully manually' });
    else res.status(404).json({ error: 'User not found' });
  } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
});

module.exports = router;
