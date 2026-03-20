const router = require('express').Router();
const { run, get, all } = require('../db');
const { requireAuth } = require('../auth');

// GET /api/messages  — スレッド一覧
router.get('/', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    // 各相手との最新メッセージを取得
    const threads = await all(`
      SELECT
        CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END as partner_id,
        MAX(created_at) as last_at,
        MAX(id) as last_msg_id
      FROM messages
      WHERE sender_id=? OR receiver_id=?
      GROUP BY partner_id
      ORDER BY last_at DESC
    `, [me, me, me]);

    const result = [];
    for (const t of threads) {
      const partner = await get('SELECT id,name,avatar,premium FROM users WHERE id=?', [t.partner_id]);
      const lastMsg = await get('SELECT * FROM messages WHERE id=?', [t.last_msg_id]);
      const unread = await get(
        'SELECT COUNT(*) as n FROM messages WHERE sender_id=? AND receiver_id=? AND read=0',
        [t.partner_id, me]
      );
      result.push({
        partner: { ...partner, premium: !!partner.premium },
        last_message: lastMsg,
        unread_count: unread.n,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:userId  — 特定ユーザーとの会話
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const me = req.user.id;
    const other = parseInt(req.params.userId);
    const msgs = await all(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m JOIN users u ON u.id=m.sender_id
      WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
      ORDER BY m.created_at ASC
    `, [me, other, other, me]);

    // 既読にする
    await run('UPDATE messages SET read=1 WHERE sender_id=? AND receiver_id=? AND read=0', [other, me]);

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/:userId  — メッセージ送信
router.post('/:userId', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'メッセージを入力してください' });

    const receiver_id = parseInt(req.params.userId);
    const receiver = await get('SELECT id FROM users WHERE id=?', [receiver_id]);
    if (!receiver) return res.status(404).json({ error: 'ユーザーが見つかりません' });

    const { id } = await run(
      'INSERT INTO messages (sender_id, receiver_id, body) VALUES (?,?,?)',
      [req.user.id, receiver_id, body.trim()]
    );
    const msg = await get('SELECT * FROM messages WHERE id=?', [id]);
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/unread/count
router.get('/unread/count', requireAuth, async (req, res) => {
  try {
    const row = await get('SELECT COUNT(*) as n FROM messages WHERE receiver_id=? AND read=0', [req.user.id]);
    res.json({ count: row.n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
