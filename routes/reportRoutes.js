// routes/reportRoutes.js

const express = require('express');
const { getTopSellingProducts } = require('../controllers/reportController');

const router = express.Router();

// Get top-selling products per warehouse
router.get('/top-selling-products', getTopSellingProducts);

module.exports = router;
