const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const PLAN_TO_PRICE_MAP = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
  scholar: process.env.STRIPE_SCHOLAR_PRICE_ID || 'price_scholar_monthly',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!plan || !PLAN_TO_PRICE_MAP[plan]) {
      return sendError(res, 'Invalid subscription plan specified.', 400, 'VALIDATION_ERROR', req);
    }

    const priceId = PLAN_TO_PRICE_MAP[plan];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?canceled=true`,
      client_reference_id: userId,
    });

    return sendSuccess(res, { url: session.url, sessionId: session.id }, 'Checkout session created.');
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      'SELECT subscription_tier, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0] || {};
    return sendSuccess(res, {
      plan: user.subscription_tier || 'free',
      stripeCustomerId: user.stripe_customer_id || null
    }, 'Subscription status fetched.');
  } catch (error) {
    next(error);
  }
};

exports.handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = req.body;
    }
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const customerId = session.customer;

    if (userId) {
      await db.query(
        'UPDATE users SET stripe_customer_id = $1, subscription_tier = $2 WHERE id = $3',
        [customerId, 'pro', userId]
      );
    }
  }

  return res.status(200).json({ received: true });
};
