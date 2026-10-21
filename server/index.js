require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('Set JWT_SECRET to a random secret of at least 32 characters in .env');
  process.exit(1);
}

const db = new Database(path.join(__dirname, 'app.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 100,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false }));

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const publicUser = u => ({ id: u.id, username: u.username, email: u.email, points: u.points, role: u.role, createdAt: u.created_at });
function tokenFor(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '2h', issuer: 'shivams-real-brand' });
}
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    if (!token) throw new Error('Missing token');
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'shivams-real-brand' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) throw new Error('Unknown user');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in again.' });
  }
}

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (username.length < 2 || username.length > 24) return res.status(400).json({ error: 'Username must be 2–24 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 10 || password.length > 100) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
  if (findByEmail.get(email)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = findByEmail.get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/games/history', auth, (req, res) => {
  const rows = db.prepare('SELECT game, score, created_at AS createdAt FROM game_history WHERE user_id = ? ORDER BY id DESC LIMIT 30').all(req.user.id);
  res.json({ history: rows });
});

app.post('/api/games/history', auth, (req, res) => {
  const allowed = new Set(['Neon Snake', 'Memory Match', 'Tic-Tac-Toe', 'Car Racing', 'Shooting Game', 'Bubble Shooter', 'Football', 'Space Shooter', 'Ludo', 'Chess', 'Flappy Bird', 'Cricket', 'Wingo Demo']);
  const game = String(req.body.game || '');
  const score = Number(req.body.score);
  if (!allowed.has(game) || !Number.isInteger(score) || score < 0 || score > 1000000) return res.status(400).json({ error: 'Invalid game result.' });
  db.prepare('INSERT INTO game_history (user_id, game, score) VALUES (?, ?, ?)').run(req.user.id, game, score);
  res.status(201).json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, name: "Shivam's The Real Brand" }));

app.listen(PORT, () => console.log(`Shivam's The Real Brand running at http://localhost:${PORT}`));
