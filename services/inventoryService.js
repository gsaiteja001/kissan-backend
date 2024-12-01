

const Warehouse = require('../modal/warehouse');
const Product = require('../modal/product');
const InventoryItem = require('../modal/InventoryItem');



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
};


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
};



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
};


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
};


const updateWarehouseOccupancy = async (warehouseId) => {
  const totalOccupancy = await InventoryItem.aggregate([
    { $match: { warehouse: warehouseId } },
    { $group: { _id: null, total: { $sum: '$stockQuantity' } } },
  ]);

  const warehouse = await Warehouse.findById(warehouseId);
  if (warehouse) {
    warehouse.currentOccupancy = totalOccupancy.length > 0 ? totalOccupancy[0].total : 0;
    await warehouse.save();
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



// Add Product to Warehouse
async function addProductToWarehouse(warehouseId, productData, quantity) {
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new Error('Invalid warehouse ID.');
  }

  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error('Warehouse not found.');
  }

  let product;

  if (productData.productId) {
    // Check if product exists
    product = await Product.findOne({ productId: productData.productId });
    if (!product) {
      throw new Error('Product with the given productId does not exist.');
    }
  } else {
    // Create a new product
    product = new Product(productData);
    await product.save();
  }

  // Check if InventoryItem exists
  let inventoryItem = await InventoryItem.findOne({
    warehouse: warehouseId,
    product: product._id,
  });

  if (inventoryItem) {
    // Update existing inventory item
    inventoryItem.stockQuantity += quantity;
    inventoryItem.lastUpdated = Date.now();
  } else {
    // Create a new inventory item
    inventoryItem = new InventoryItem({
      warehouse: warehouseId,
      product: product._id,
      stockQuantity: quantity,
    });
  }

  await inventoryItem.save();

  // Update total stock in Product
  await product.updateTotalStock();

  return inventoryItem;
}

// Remove Product from Warehouse
async function removeProductFromWarehouse(warehouseId, productId) {
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new Error('Invalid warehouse ID.');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid product ID.');
  }

  const inventoryItem = await InventoryItem.findOneAndDelete({
    warehouse: warehouseId,
    product: productId,
  });

  if (!inventoryItem) {
    throw new Error('Inventory item not found.');
  }

  // Update total stock in Product
  const product = await Product.findById(productId);
  if (product) {
    await product.updateTotalStock();
  }

  return inventoryItem;
}

// List Inventory Items for a Warehouse
async function listInventoryItems(warehouseId) {
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new Error('Invalid warehouse ID.');
  }

  const inventoryItems = await InventoryItem.find({ warehouse: warehouseId })
    .populate('product')
    .populate('warehouse');

  return inventoryItems;
}

// Get All Warehouses with Inventory Items
async function getAllWarehousesWithInventory() {
  const warehouses = await Warehouse.find({})
    .populate({
      path: 'inventoryItems',
      populate: { path: 'product' },
    });

  return warehouses;
}


module.exports = {
  addStock,
  decreaseStock,
  getStockLevel,
  checkReorderLevels,
  updateStock,
  addProductToWarehouse,
  removeProductFromWarehouse,
  listInventoryItems,
  getAllWarehousesWithInventory,
};
