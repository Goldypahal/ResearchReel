const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/checkout', authMiddleware, billingController.createCheckoutSession);
router.get('/subscription', authMiddleware, billingController.getSubscriptionStatus);
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleWebhook);

module.exports = router;
