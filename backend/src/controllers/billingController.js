const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const db = require('../config/db');

exports.createCheckoutSession = async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user?.id;

    if (!priceId) return res.status(400).json({ success: false, message: 'Price ID is required' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/profile/settings/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/profile/settings/billing?canceled=true`,
      client_reference_id: userId,
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
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

  res.json({ received: true });
};
