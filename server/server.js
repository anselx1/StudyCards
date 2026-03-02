const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'studycards_dev_secret_change_in_prod';

// =============================================
// Middleware
// =============================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Auth middleware
async function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query(
            'SELECT id, name, email, plan FROM users WHERE id = $1',
            [decoded.id]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'User not found.' });
        req.user = result.rows[0];
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

// =============================================
// Routes
// =============================================

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/register
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0)
            return res.status(409).json({ error: 'An account with this email already exists.' });

        const password_hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, plan) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, password_hash, 'free']
        );

        const userId = result.rows[0].id;
        const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            token,
            user: { id: userId, name, email, plan: 'free' }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0)
            return res.status(401).json({ error: 'Invalid email or password.' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, plan: user.plan }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// GET /api/me
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

// POST /api/upgrade
app.post('/api/upgrade', requireAuth, async (req, res) => {
    try {
        await pool.query('UPDATE users SET plan = $1 WHERE id = $2', ['pro', req.user.id]);
        return res.json({ success: true, message: 'Upgraded to Pro!' });
    } catch (err) {
        return res.status(500).json({ error: 'Upgrade failed.' });
    }
});

// =============================================
// Start
// =============================================
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`\n✅ StudyCards server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
});
