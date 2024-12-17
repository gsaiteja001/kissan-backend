// routes/saleRoutes.js

const express = require('express');
const { handleRecordSale } = require('../controllers/saleController');

const purchaseController = require('../controllers/purchaseController');

const router = express.Router();

// POST /api/sales/record
router.post('/record', handleRecordSale);

// Route for creating a purchase
router.post('/purchase-record/create', purchaseController.createPurchase);

// New Route: Fetch purchases by warehouseId
router.get('/warehouse/:warehouseId', purchaseController.getPurchasesByWarehouseId);

module.exports = router;
