const InventoryItem = require('../models/InventoryItem');



async function addStock(warehouseId, productId, quantity) {
  let inventoryItem = await InventoryItem.findOne({
    warehouse: warehouseId,
    product: productId,
  });

  if (inventoryItem) {
    // Update existing inventory item
    inventoryItem.stockQuantity += quantity;
    inventoryItem.lastUpdated = Date.now();
  } else {
    // Create a new inventory item
    inventoryItem = new InventoryItem({
      warehouse: warehouseId,
      product: productId,
      stockQuantity: quantity,
    });
  }

  await inventoryItem.save();
}


async function decreaseStock(warehouseId, productId, quantitySold) {
  const inventoryItem = await InventoryItem.findOne({
    warehouse: warehouseId,
    product: productId,
  });

  if (!inventoryItem) {
    throw new Error('Inventory item not found');
  }

  if (inventoryItem.stockQuantity < quantitySold) {
    throw new Error('Insufficient stock');
  }

  inventoryItem.stockQuantity -= quantitySold;
  inventoryItem.lastUpdated = Date.now();

  await inventoryItem.save();
}



async function getStockLevel(warehouseId, productId) {
  const inventoryItem = await InventoryItem.findOne({
    warehouse: warehouseId,
    product: productId,
  }).populate('product warehouse');

  if (!inventoryItem) {
    return {
      warehouse: warehouseId,
      product: productId,
      stockQuantity: 0,
    };
  }

  return {
    warehouse: inventoryItem.warehouse.warehouseName,
    product: inventoryItem.product.name,
    stockQuantity: inventoryItem.stockQuantity,
  };
}


async function checkReorderLevels() {
  const itemsToReorder = await InventoryItem.find({
    $expr: { $lte: ["$stockQuantity", "$reorderLevel"] },
  }).populate('product warehouse');

  itemsToReorder.forEach((item) => {
    console.log(
      `Reorder Alert: Product ${item.product.name.en} in warehouse ${item.warehouse.warehouseName} is below reorder level.`
    );
    // TODO: Implement email or notification logic here
  });
}


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





module.exports = {
  addStock,
  decreaseStock,
  getStockLevel,
  checkReorderLevels,
  // ... other inventory-related functions
};
