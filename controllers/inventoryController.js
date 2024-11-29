// controllers/inventoryController.js

const { updateStock } = require('../services/inventoryService');

/**
 * @desc    Adjust stock for a product in a warehouse
 * @route   PATCH /api/warehouses/:id/inventory/:inventoryId/adjust
 * @access  Public (Adjust access as needed)
 */
exports.adjustStock = async (req, res, next) => {
  try {
    const { id: warehouseId, inventoryId } = req.params;
    const { quantity } = req.body; // Quantity to add/remove

    if (typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number.',
      });
    }

    const inventoryItem = await updateStock(warehouseId, inventoryId, quantity);

    res.status(200).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    next(error);
  }
};
