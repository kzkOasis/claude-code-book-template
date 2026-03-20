const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tennis-app-secret-change-in-production';

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Express middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  try {
    req.user = verify(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効です' });
  }
}

// Attach user if token present, but don't block
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try { req.user = verify(auth.slice(7)); } catch {}
  }
  next();
}

module.exports = { sign, verify, requireAuth, optionalAuth };
