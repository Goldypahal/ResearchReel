const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/checkout', authMiddleware, billingController.createCheckoutSession);


/**
 * @swagger
 * /api/v1/billing/webhook:
 *   post:
 *     summary: Stripe Webhook handler
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook', express.raw({type: 'application/json'}), billingController.handleWebhook);

module.exports = router;
