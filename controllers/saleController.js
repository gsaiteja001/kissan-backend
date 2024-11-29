// controllers/saleController.js

const { recordSale } = require('../services/salesService');

/**
 * Controller to handle recording a sale.
 * Expects warehouseId, productId, quantitySold in the request body.
 */
async function handleRecordSale(req, res) {
  const { warehouseId, productId, quantitySold, saleDetails } = req.body;

  try {
    const sale = await recordSale(warehouseId, productId, quantitySold, saleDetails);
    res.status(201).json({
      message: 'Sale recorded successfully.',
      sale,
    });
  } catch (error) {
    console.error('Error recording sale:', error);
    res.status(400).json({
      message: error.message,
    });
  }
}

module.exports = {
  handleRecordSale,
};
