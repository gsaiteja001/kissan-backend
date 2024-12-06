
const inventoryService = require('../services/inventoryService');


// Add Product to Warehouse
exports.addProductToWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.warehouseId;
    const { productData, quantity } = req.body;

    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
    }

    // Add product to warehouse
    const inventoryItem = await inventoryService.addProductToWarehouse(warehouseId, productData, quantity);

    res.status(201).json({
      message: 'Product added to warehouse successfully.',
      data: inventoryItem,
    });
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
 * @desc    Add multiple existing products to a warehouse with respective quantities
 * @route   POST /api/warehouses/products/multiple/:warehouseId
 * @access  Public (Adjust access as needed)
 */
exports.addMultipleProductsToWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { products } = req.body; // Expecting an array of { productId, quantity }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Products array is required and cannot be empty.' });
    }

    // Validate each product entry
    for (const product of products) {
      if (!product.productId || product.quantity == null) { // Allow quantity 0 if needed
        return res.status(400).json({ message: 'Each product must have a productId and quantity.' });
      }
      if (typeof product.quantity !== 'number' || product.quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity for productId ${product.productId}. Quantity must be a positive number.` });
      }
    }

    // Call the service function to handle the logic
    const inventoryItems = await inventoryService.addMultipleProductsToWarehouse(warehouseId, products);

    res.status(201).json({
      message: 'Products added to warehouse successfully.',
      data: inventoryItems,
    });
  } catch (error) {
    console.error('Error adding multiple products to warehouse:', error);
    res.status(500).json({ message: error.message || 'Failed to add products to warehouse.' });
  }
};



/**
 * @desc    Update stock quantity for a product in a warehouse
 * @param   {String} warehouseId - Warehouse ObjectId
 * @param   {String} productId - Product ObjectId
 * @param   {Number} quantity - Quantity to add or remove (use negative to remove)
 * @returns {Object} - Updated InventoryItem
 * @throws  {Error} - Throws error if warehouse or product not found, or insufficient stock
 */
exports.updateStock = async (warehouseId, productId, quantity) => {
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new Error('Invalid warehouse ID.');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid product ID.');
  }

  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error('Warehouse not found.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found.');
  }

  const inventoryItem = await InventoryItem.findOne({
    warehouse: warehouseId,
    product: productId,
  });

  if (!inventoryItem) {
    throw new Error('Inventory item not found for the specified product and warehouse.');
  }

  if (inventoryItem.stockQuantity + quantity < 0) {
    throw new Error('Insufficient stock.');
  }

  inventoryItem.stockQuantity += quantity;
  inventoryItem.lastUpdated = Date.now();

  await inventoryItem.save();

  // Update total stock in Product
  await product.updateTotalStock();

  return inventoryItem;
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

    const inventoryItem = await inventoryService.updateStock(warehouseId, productId, quantity);

    res.status(200).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    next(error);
  }
};
