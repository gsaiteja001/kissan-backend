const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private (Assuming authentication middleware is applied)
router.post('/', orderController.placeOrder);

// @route   PUT /api/orders/status
// @desc    Update order status
// @access  Private/Admin (Assuming admin privileges)
router.put('/status', orderController.updateOrderStatus);

router.get('/orders/:farmerId', orderController.getOrdersWithProductDetails);

module.exports = router;
