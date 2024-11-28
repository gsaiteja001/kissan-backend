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

router.get('/farmer/:farmerId', orderController.getOrdersWithProductDetails);

router.get('/allOrders', orderController.getAllOrders);

module.exports = router;
