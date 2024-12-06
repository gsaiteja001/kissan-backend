
const mongoose = require('mongoose');
const Warehouse = require('../modal/warehouse');
const Product = require('../modal/product');
const InventoryItem = require('../modal/InventoryItem');


/**
 * Adds stock to a specific product in a warehouse.
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {String} productId - The ID of the product.
 * @param {Number} quantity - The quantity to add.
 */
async function addStock(warehouseId, productId, quantity) {
  // Validate input parameters
  if (!warehouseId || !productId || typeof quantity !== 'number' || quantity <= 0) {
    throw new Error('Invalid input parameters for adding stock.');
  }

  // Find the inventory item by warehouseId and productId
  let inventoryItem = await InventoryItem.findOne({
    warehouseId: warehouseId,
    productId: productId,
  });

  if (inventoryItem) {
    // Update existing inventory item
    inventoryItem.stockQuantity += quantity;
    inventoryItem.lastUpdated = Date.now();
  } else {
    // Create a new inventory item
    inventoryItem = new InventoryItem({
      warehouseId: warehouseId,
      productId: productId,
      stockQuantity: quantity,
    });
  }

  // Save the inventory item
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
  if (!warehouseId) {
    throw new Error('Warehouse ID is required.');
  }

  const warehouse = await Warehouse.findOne({ warehouseId });
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

  // Find or create inventory item using warehouseId and productId
  let inventoryItem = await InventoryItem.findOne({
    warehouseId: warehouseId,
    productId: product.productId,
  });

  if (inventoryItem) {
    // Update existing inventory item
    inventoryItem.stockQuantity += quantity;
    inventoryItem.lastUpdated = Date.now();
  } else {
    // Create a new inventory item
    inventoryItem = new InventoryItem({
      warehouseId: warehouseId, // Use warehouseId for queries
      productId: product.productId, // Use productId for queries
      stockQuantity: quantity,
    });
  }

  await inventoryItem.save();

  return inventoryItem;
}


/**
 * Adds multiple products to a warehouse with respective quantities.
 * Ensures no duplicates for already existing productId in the inventory.
 * 
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {Array} products - An array of products with productId and quantity.
 * @returns {Array} - An array of updated or created inventory items.
 */
async function addMultipleProductsToWarehouse(warehouseId, products) { 
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`Adding multiple products to Warehouse ID: ${warehouseId}`);

    // Find the warehouse by warehouseId
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }
    console.log(`Warehouse found: ${warehouseId}`);

    // Validate all products exist
    const productIds = products.map(p => p.productId);
    const existingProducts = await Product.find({ productId: { $in: productIds } }).session(session);
    const existingProductIds = existingProducts.map(p => p.productId);
    
    const missingProducts = productIds.filter(pid => !existingProductIds.includes(pid));
    if (missingProducts.length > 0) {
      throw new Error(`Products not found: ${missingProducts.join(', ')}`);
    }

    // Prepare bulk operations with $set to ensure required fields are set
    const bulkOps = products.map(({ productId, quantity }) => ({
      updateOne: {
        filter: { warehouseId, productId },
        update: { 
          $inc: { stockQuantity: quantity }, 
          $set: { 
            lastUpdated: new Date(),
            warehouseId,    // Ensure warehouseId is set
            productId       // Ensure productId is set
          }
        },
        upsert: true,
      }
    }));

    // Execute bulk operations
    const bulkWriteResult = await InventoryItem.bulkWrite(bulkOps, { session });

    // Fetch the updated/created inventory items
    const inventoryItems = await InventoryItem.find({ 
      warehouseId, 
      productId: { $in: productIds } 
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    console.log(`Successfully added/updated multiple products to Warehouse ID: ${warehouseId}`);

    return inventoryItems;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`Transaction aborted due to error: ${error.message}`);
    throw error;
  }
}



// Remove Product from Warehouse
async function removeProductFromWarehouse(warehouseId, productId) {
  if (!warehouseId || !productId) {
    throw new Error('Both warehouseId and productId are required.');
  }

  const inventoryItem = await InventoryItem.findOneAndDelete({
    warehouseId: warehouseId,
    productId: productId,
  });

  if (!inventoryItem) {
    throw new Error('Inventory item not found.');
  }

  // Update total stock in Product
  const product = await Product.findOne({ productId });
  if (product) {
    await product.updateTotalStock();
  }

  return inventoryItem;
}

async function listInventoryItems(warehouseId) {
  if (!warehouseId) {
    throw new Error('Warehouse ID is required.');
  }

  const inventoryItems = await InventoryItem.aggregate([
    // Match inventory items for the specified warehouseId
    { $match: { warehouseId: warehouseId } },
    
    // Lookup to join with the Product collection
    {
      $lookup: {
        from: 'products', // Name of the Product collection
        localField: 'productId',
        foreignField: 'productId',
        as: 'productDetails'
      }
    },
    // Unwind the productDetails array
    { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
    
    // Lookup to join with the Warehouse collection
    {
      $lookup: {
        from: 'warehouses', // Name of the Warehouse collection
        localField: 'warehouseId',
        foreignField: 'warehouseId',
        as: 'warehouseDetails'
      }
    },
    // Unwind the warehouseDetails array
    { $unwind: { path: '$warehouseDetails', preserveNullAndEmptyArrays: true } },
    
    // Optionally, project the fields you want to return
    {
      $project: {
        _id: 1,
        warehouseId: 1,
        productId: 1,
        stockQuantity: 1,
        reorderLevel: 1,
        lastUpdated: 1,
        createdAt: 1,
        updatedAt: 1,
        // Include product details
        product: '$productDetails',
        // Include warehouse details
        warehouse: '$warehouseDetails'
      }
    }
  ]);

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
 * Retrieves unique productIds from the InventoryItem collection based on provided warehouseIds.
 * Implements caching to optimize performance.
 * 
 * @param {Array} warehouseIds - Array of warehouseId strings.
 * @returns {Array} - Array of unique productId strings.
 */
const getProductIdsFromWarehouses = async (warehouseIds) => {
  try {
    if (!Array.isArray(warehouseIds) || warehouseIds.length === 0) {
      throw new Error('Invalid warehouseIds provided.');
    }

    // Create a unique cache key based on warehouseIds
    const cacheKey = `productIds:${warehouseIds.sort().join(',')}`;

    // Check if productIds are cached
    const cachedProductIds = await getAsync(cacheKey);
    if (cachedProductIds) {
      return JSON.parse(cachedProductIds);
    }

    // Aggregate to get unique productIds from the specified warehouses
    const products = await InventoryItem.aggregate([
      { $match: { warehouseId: { $in: warehouseIds }, stockQuantity: { $gt: 0 } } },
      { $group: { _id: null, uniqueProductIds: { $addToSet: '$productId' } } },
      { $project: { _id: 0, uniqueProductIds: 1 } },
    ]);

    if (products.length === 0) {
      return [];
    }

    const productIds = products[0].uniqueProductIds;

    // Cache the productIds for 10 minutes (600 seconds)
    await setAsync(cacheKey, 600, JSON.stringify(productIds));

    return productIds;
  } catch (error) {
    console.error('Error in getProductIdsFromWarehouses:', error);
    throw error;
  }
};


/**
 * Adds multiple products to a warehouse with respective quantities.
 */
// async function addMultipleProductsToWarehouse(warehouseId, products) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     console.log(`Adding multiple products to Warehouse ID: ${warehouseId}`);

//     const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
//     if (!warehouse) {
//       throw new Error('Warehouse not found.');
//     }

//     const inventoryItems = [];

//     for (const { productId, quantity } of products) {
//       console.log(`Processing Product ID: ${productId} with Quantity: ${quantity}`);

//       const product = await Product.findOne({ productId }).session(session);
//       if (!product) {
//         throw new Error(`Product not found: ${productId}`);
//       }

//       // Check if InventoryItem exists
//       let inventoryItem = await InventoryItem.findOne({
//         warehouse: warehouseId,
//         product: productId,
//       }).session(session);

//       if (inventoryItem) {
//         // Update existing InventoryItem
//         inventoryItem.stockQuantity += quantity;
//         inventoryItem.lastUpdated = Date.now();
//         await inventoryItem.save({ session });
//         console.log(`Updated InventoryItem ID: ${inventoryItem._id}`);
//       } else {
//         // Create new InventoryItem
//         inventoryItem = new InventoryItem({
//           warehouse: warehouseId,
//           product: productId,
//           stockQuantity: quantity,
//           // Initialize other fields as needed, e.g., reorderLevel
//         });
//         await inventoryItem.save({ session });
//         console.log(`Created new InventoryItem ID: ${inventoryItem._id}`);
//       }

//       inventoryItems.push(inventoryItem);

//       // Update total stock in Product
//       await product.updateTotalStock();
//       console.log(`Updated total stock for Product ID: ${product.productId}`);
//     }

//     await session.commitTransaction();
//     session.endSession();

//     console.log(`Successfully added multiple products to Warehouse ID: ${warehouseId}`);

//     return inventoryItems;
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error(`Transaction aborted due to error: ${error.message}`);
//     throw error;
//   }
// }

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
  getProductIdsFromWarehouses,
};
