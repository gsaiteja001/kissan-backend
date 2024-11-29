// routes/saleRoutes.js

const express = require('express');
const { handleRecordSale } = require('../controllers/saleController');

const router = express.Router();

// POST /api/sales/record
router.post('/record', handleRecordSale);

module.exports = router;
