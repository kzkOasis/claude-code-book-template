const router = require('express').Router();
const { run, get, all } = require('../db');
const { requireAuth, optionalAuth } = require('../auth');

// GET /api/posts  (全員閲覧可)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { level, area, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level, u.premium as user_premium,
             (SELECT COUNT(*) FROM applications WHERE post_id=p.id AND status='pending') as applicants
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.status = 'open'
    `;
    const params = [];

    if (level) {
      sql += ' AND p.level_min <= ? AND p.level_max >= ?';
      params.push(level, level);
    }
    if (area) {
      sql += ' AND p.location LIKE ?';
      params.push(`%${area}%`);
    }

    sql += ' ORDER BY u.premium DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = await all(sql, params);

    // 自分の申込み状況を付与
    const myApps = req.user
      ? await all('SELECT post_id FROM applications WHERE user_id=?', [req.user.id])
      : [];
    const myAppIds = new Set(myApps.map(a => a.post_id));

    res.json(posts.map(p => ({
      ...p,
      tags: JSON.parse(p.tags || '[]'),
      user_premium: !!p.user_premium,
      applied: myAppIds.has(p.id),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, body = '', date_str, time_slot, location, level_min = 1, level_max = 5, tags = [] } = req.body;
    if (!title || !date_str || !time_slot || !location) return res.status(400).json({ error: '必須項目を入力してください' });

    const { id } = await run(
      'INSERT INTO posts (user_id, title, body, date_str, time_slot, location, level_min, level_max, tags) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.user.id, title, body, date_str, time_slot, location, level_min, level_max, JSON.stringify(tags)]
    );
    const post = await get('SELECT * FROM posts WHERE id=?', [id]);
    res.status(201).json({ ...post, tags: JSON.parse(post.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await get('SELECT * FROM posts WHERE id=?', [req.params.id]);
    if (!post) return res.status(404).json({ error: '投稿が見つかりません' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: '権限がありません' });
    await run('DELETE FROM posts WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/apply  (参加申込み)
router.post('/:id/apply', requireAuth, async (req, res) => {
  try {
    const post = await get('SELECT * FROM posts WHERE id=? AND status="open"', [req.params.id]);
    if (!post) return res.status(404).json({ error: '募集が見つかりません' });
    if (post.user_id === req.user.id) return res.status(400).json({ error: '自分の募集には申込めません' });

    const { message = '' } = req.body;
    try {
      await run('INSERT INTO applications (post_id, user_id, message) VALUES (?,?,?)',
        [req.params.id, req.user.id, message]);
    } catch {
      return res.status(409).json({ error: 'すでに申込み済みです' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/mine  (自分の投稿一覧)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const posts = await all(`
      SELECT p.*, (SELECT COUNT(*) FROM applications WHERE post_id=p.id AND status='pending') as applicants
      FROM posts p WHERE p.user_id=? ORDER BY p.created_at DESC`, [req.user.id]);
    res.json(posts.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
