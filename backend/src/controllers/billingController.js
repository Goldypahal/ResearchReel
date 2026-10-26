const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/** Only plans with a configured Stripe price can be bought. */
const PLAN_TO_PRICE_MAP = Object.fromEntries(
  Object.entries({
    pro: process.env.STRIPE_PRO_PRICE_ID,
    scholar: process.env.STRIPE_SCHOLAR_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  }).filter(([, price]) => Boolean(price))
);

const billingDisabled = (req, res) =>
  sendError(res, 'Billing is not enabled on this server.', 503, 'BILLING_NOT_CONFIGURED', req);

exports.createCheckoutSession = async (req, res, next) => {
  try {
    if (!stripe) return billingDisabled(req, res);
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
      metadata: { plan },
      subscription_data: { metadata: { plan, user_id: userId } },
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
      hasBillingAccount: Boolean(user.stripe_customer_id),
      billingEnabled: Boolean(stripe),
      availablePlans: Object.keys(PLAN_TO_PRICE_MAP),
    }, 'Subscription status fetched.');
  } catch (error) {
    next(error);
  }
};

/**
 * Stripe webhook. Events are only trusted when their signature verifies against
 * STRIPE_WEBHOOK_SECRET using the raw request body (captured in app.js).
 */
exports.handleWebhook = async (req, res, next) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return billingDisabled(req, res);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan;
      if (userId && plan && PLAN_TO_PRICE_MAP[plan]) {
        await db.query(
          'UPDATE users SET stripe_customer_id = $1, subscription_tier = $2 WHERE id = $3',
          [session.customer, plan, userId]
        );
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await db.query("UPDATE users SET subscription_tier = 'free' WHERE stripe_customer_id = $1", [sub.customer]);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};
