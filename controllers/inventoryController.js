// controllers/inventoryController.js

const { updateStock } = require('../services/inventoryService');

const inventoryService = require('../services/inventoryService');


// Add Product to Warehouse
exports.addProductToWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.warehouseId;
    const { productData, quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
    }

    const inventoryItem = await inventoryService.addProductToWarehouse(warehouseId, productData, quantity);
    res.status(201).json({ message: 'Product added to warehouse successfully.', data: inventoryItem });
  } catch (error) {
    console.error('Error adding product to warehouse:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove Product from Warehouse
exports.removeProductFromWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.warehouseId;
    const productId = req.params.productId;

    const inventoryItem = await inventoryService.removeProductFromWarehouse(warehouseId, productId);
    res.status(200).json({ message: 'Product removed from warehouse successfully.', data: inventoryItem });
  } catch (error) {
    console.error('Error removing product from warehouse:', error);
    res.status(500).json({ message: error.message });
  }
};

// List Inventory Items for a Warehouse
exports.listInventoryItems = async (req, res) => {
  try {
    const warehouseId = req.params.warehouseId;
    const inventoryItems = await inventoryService.listInventoryItems(warehouseId);
    res.status(200).json({ data: inventoryItems });
  } catch (error) {
    console.error('Error listing inventory items:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get All Warehouses with Inventory Items
exports.getAllWarehousesWithInventory = async (req, res) => {
  try {
    const warehouses = await inventoryService.getAllWarehousesWithInventory();
    res.status(200).json({ data: warehouses });
  } catch (error) {
    console.error('Error fetching warehouses with inventory:', error);
    res.status(500).json({ message: error.message });
  }
};



/**
 * @desc    Adjust stock for a product in a warehouse
 * @route   PATCH /api/warehouses/:id/inventory/:productId/adjust
 * @access  Public (Adjust access as needed)
 */
exports.adjustStock = async (req, res, next) => {
  try {
    const { id: warehouseId, productId } = req.params;
    const { quantity } = req.body; // Quantity to add/remove

    if (typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number.',
      });
    }

    const inventoryItem = await updateStock(warehouseId, productId, quantity);

    res.status(200).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    next(error);
  }
};
