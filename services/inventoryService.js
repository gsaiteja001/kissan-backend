
const mongoose = require('mongoose');
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
    // Attempt to find existing product
    product = await Product.findOne({ productId: productData.productId });
    if (!product) {
      // Create a new product since it doesn't exist
      product = new Product(productData);
      await product.save();
    }
  } else {
    // Create a new product without a specified productId
    product = new Product(productData);
    await product.save();
  }

  // Ensure correct referencing using product._id (ObjectId)
  let inventoryItem = await InventoryItem.findOne({
    warehouse: warehouseId,
    product: product._id, // Changed from product.productId to product._id
  });

  if (inventoryItem) {
    // Update existing inventory item
    inventoryItem.stockQuantity += quantity;
    inventoryItem.lastUpdated = Date.now();
  } else {
    // Create a new inventory item
    inventoryItem = new InventoryItem({
      warehouse: warehouseId,
      product: product._id, // Changed from product.productId to product._id
      stockQuantity: quantity,
    });
  }

  await inventoryItem.save();

  // Optionally, update total stock in Product
  // await product.updateTotalStock();

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


/**
 * Adds multiple products to a warehouse with respective quantities.
 */
async function addMultipleProductsToWarehouse(warehouseId, products) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`Adding multiple products to Warehouse ID: ${warehouseId}`);

    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    const inventoryItems = [];

    for (const { productId, quantity } of products) {
      console.log(`Processing Product ID: ${productId} with Quantity: ${quantity}`);

      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Check if InventoryItem exists
      let inventoryItem = await InventoryItem.findOne({
        warehouse: warehouseId,
        product: productId,
      }).session(session);

      if (inventoryItem) {
        // Update existing InventoryItem
        inventoryItem.stockQuantity += quantity;
        inventoryItem.lastUpdated = Date.now();
        await inventoryItem.save({ session });
        console.log(`Updated InventoryItem ID: ${inventoryItem._id}`);
      } else {
        // Create new InventoryItem
        inventoryItem = new InventoryItem({
          warehouse: warehouseId,
          product: productId,
          stockQuantity: quantity,
          // Initialize other fields as needed, e.g., reorderLevel
        });
        await inventoryItem.save({ session });
        console.log(`Created new InventoryItem ID: ${inventoryItem._id}`);
      }

      inventoryItems.push(inventoryItem);

      // Update total stock in Product
      await product.updateTotalStock();
      console.log(`Updated total stock for Product ID: ${product.productId}`);
    }

    await session.commitTransaction();
    session.endSession();

    console.log(`Successfully added multiple products to Warehouse ID: ${warehouseId}`);

    return inventoryItems;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`Transaction aborted due to error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  addStock,
  decreaseStock,
  getStockLevel,
  checkReorderLevels,
  addProductToWarehouse,
  removeProductFromWarehouse,
  listInventoryItems,
  addMultipleProductsToWarehouse,
  getAllWarehousesWithInventory,
};
