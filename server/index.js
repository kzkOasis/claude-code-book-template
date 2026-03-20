const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { init } = require('./db');

const app  = express();
const PORT = process.env.PORT || 8080;

// Stripe webhook needs raw body BEFORE json parser
app.use('/api/stripe/webhook', require('express').raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/posts',   require('./routes/posts'));
app.use('/api/messages',require('./routes/messages'));
app.use('/api/records', require('./routes/records'));
app.use('/api/stripe',  require('./routes/stripe'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーエラー' });
});

init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🎾 TennisMatch server running → http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
