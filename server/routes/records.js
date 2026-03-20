const router = require('express').Router();
const { run, get, all } = require('../db');
const { requireAuth } = require('../auth');

// GET /api/records — 自分の戦績一覧
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await all(
      'SELECT * FROM records WHERE user_id=? ORDER BY played_at DESC',
      [req.user.id]
    );
    const wins = rows.filter(r => r.win).length;
    res.json({
      records: rows,
      stats: {
        total: rows.length,
        wins,
        losses: rows.length - wins,
        rate: rows.length ? Math.round((wins / rows.length) * 100) : null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/records — 戦績追加
router.post('/', requireAuth, async (req, res) => {
  try {
    const { opponent, location = '', win, sets_me, sets_opp, score, played_at } = req.body;
    if (!opponent) return res.status(400).json({ error: '対戦相手を入力してください' });

    const { id } = await run(
      'INSERT INTO records (user_id, opponent, location, win, sets_me, sets_opp, score, played_at) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, opponent, location, win ? 1 : 0, sets_me || 0, sets_opp || 0, score || '', played_at || new Date().toISOString()]
    );
    const record = await get('SELECT * FROM records WHERE id=?', [id]);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/records/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const record = await get('SELECT * FROM records WHERE id=?', [req.params.id]);
    if (!record) return res.status(404).json({ error: '見つかりません' });
    if (record.user_id !== req.user.id) return res.status(403).json({ error: '権限がありません' });
    await run('DELETE FROM records WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
