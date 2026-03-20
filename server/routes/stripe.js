const router = require('express').Router();
const { run, get } = require('../db');
const { requireAuth } = require('../auth');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const PREMIUM_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || 'price_monthly';
const PREMIUM_PRICE_YEARLY  = process.env.STRIPE_PRICE_YEARLY  || 'price_yearly';

let stripe;
if (STRIPE_SECRET) {
  stripe = require('stripe')(STRIPE_SECRET);
}

// POST /api/stripe/checkout — サブスクリプション開始
router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe未設定。STRIPE_SECRET_KEYを環境変数に設定してください。' });
  }

  try {
    const { plan = 'yearly' } = req.body;
    const priceId = plan === 'monthly' ? PREMIUM_PRICE_MONTHLY : PREMIUM_PRICE_YEARLY;

    const user = await get('SELECT * FROM users WHERE id=?', [req.user.id]);

    // Stripeカスタマー作成 or 既存取得
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await run('UPDATE users SET stripe_customer_id=? WHERE id=?', [customerId, user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin || 'http://localhost:8080'}/?premium=success`,
      cancel_url:  `${req.headers.origin || 'http://localhost:8080'}/?premium=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/webhook — Stripeからのwebhook
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.sendStatus(400);

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.sendStatus(400);
  }

  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    if (sub.status === 'active' || sub.status === 'trialing') {
      await run('UPDATE users SET premium=1 WHERE stripe_customer_id=?', [sub.customer]);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await run('UPDATE users SET premium=0 WHERE stripe_customer_id=?', [sub.customer]);
  }

  res.json({ received: true });
});

// POST /api/stripe/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe未設定' });

  try {
    const user = await get('SELECT stripe_customer_id FROM users WHERE id=?', [req.user.id]);
    if (!user.stripe_customer_id) return res.status(400).json({ error: 'サブスクリプションが見つかりません' });

    const subs = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active' });
    for (const sub of subs.data) {
      await stripe.subscriptions.cancel(sub.id);
    }
    await run('UPDATE users SET premium=0 WHERE id=?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
