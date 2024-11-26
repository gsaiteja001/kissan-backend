const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private (Assuming authentication middleware is applied)
router.post('/', orderController.placeOrder);

module.exports = router;
