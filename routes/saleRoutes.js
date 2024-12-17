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

router.get('/purchases/active/:warehouseId', async (req, res) => {
  const { warehouseId } = req.params;
  const activeStatuses = ['Pending', 'In Transit', 'Partial'];

  try {
    const purchases = await Purchase.find({
      'fulfillments.warehouseId': warehouseId,
      'fulfillments.deliveryStatus': { $in: activeStatuses },
    }).populate('fulfillments.products.product');

    res.json({
      message: `Purchases for Warehouse ID ${warehouseId} fetched successfully.`,
      purchases,
    });
  } catch (error) {
    console.error('Error fetching active purchases:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});



module.exports = router;
