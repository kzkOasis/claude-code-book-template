const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const { sign, requireAuth } = require('../auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, level = 2, area = '' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: '必須項目を入力してください' });
    if (password.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上' });

    const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ error: 'このメールアドレスは使用済みです' });

    const hash = await bcrypt.hash(password, 10);
    const { id } = await run(
      'INSERT INTO users (name, email, password, level, area) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, level, area]
    );

    const token = sign({ id, name, email });
    res.json({ token, user: { id, name, email, level, area, premium: false } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });

    const token = sign({ id: user.id, name: user.name, email: user.email });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, premium: !!safeUser.premium } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await get('SELECT id,name,email,level,area,bio,avatar,premium,created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    res.json({ ...user, premium: !!user.premium });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name, level, area, bio, avatar } = req.body;
    await run(
      'UPDATE users SET name=COALESCE(?,name), level=COALESCE(?,level), area=COALESCE(?,area), bio=COALESCE(?,bio), avatar=COALESCE(?,avatar) WHERE id=?',
      [name, level, area, bio, avatar, req.user.id]
    );
    const user = await get('SELECT id,name,email,level,area,bio,avatar,premium FROM users WHERE id=?', [req.user.id]);
    res.json({ ...user, premium: !!user.premium });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
