
const mongoose = require('mongoose');
const Warehouse = require('../modal/warehouse');
const Product = require('../modal/product');
const InventoryItem = require('../modal/InventoryItem');

const { getAsync, setAsync } = require('../redisClient');

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

/**
 * Adds a single product to a warehouse, handling variant properties.
 * Utilizes ProductSchema methods to manage variants.
 * 
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {Object} productData - The product data, including variants.
 * @returns {Promise<Object>} - The updated or created product.
 */
async function addProductToWarehouse(warehouseId, productData) {
  if (!warehouseId) {
    throw new Error('Warehouse ID is required.');
  }

  // Find the warehouse
  const warehouse = await Warehouse.findOne({ warehouseId });
  if (!warehouse) {
    throw new Error('Warehouse not found.');
  }

  let product;

  // Check if the product exists
  if (productData.productId) {
    product = await Product.findOne({ productId: productData.productId });

    if (!product) {
      // Create a new product if it doesn't exist
      product = new Product(productData);
    } else {
      // Update existing product's non-variant fields
      const { variants, ...otherFields } = productData;
      Object.assign(product, otherFields);

      // Handle variants using ProductSchema methods
      if (variants && Array.isArray(variants)) {
        for (const incomingVariant of variants) {
          const existingVariant = product.variants.find(v => v.variantId === incomingVariant.variantId);
          if (existingVariant) {
            // Update variant details using the updateVariant method
            await product.updateVariant(existingVariant.variantId, incomingVariant);
          } else {
            // Add new variant using the addVariant method
            await product.addVariant(incomingVariant);
          }
        }
      }
    }
  } else {
    // If no productId, create a completely new product
    product = new Product(productData);
  }

  // Save the product with updated/created data
  await product.save();

  return product; 
}




/**
 * Adds multiple products to a warehouse, handling their variant properties.
 * Utilizes ProductSchema methods to manage variants.
 * 
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {Array} products - An array of products with productId and variants.
 * @returns {Promise<Array>} - An array of updated or created inventory items.
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

    // Iterate over each product to handle variant updates
    for (const productEntry of products) {
      const { productId, variants } = productEntry;

      // Find the product
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Handle variants using ProductSchema methods
      if (variants && Array.isArray(variants)) {
        for (const incomingVariant of variants) {
          const existingVariant = product.variants.find(v => v.variantId === incomingVariant.variantId);
          if (existingVariant) {
            // Update variant details using the updateVariant method
            await product.updateVariant(existingVariant.variantId, incomingVariant);
          } else {
            // Add new variant using the addVariant method
            await product.addVariant(incomingVariant);
          }
        }
      }

      // Save the product after handling variants
      await product.save({ session });
    }

    // Prepare bulk operations to associate products with the warehouse
    const bulkOps = products.map(({ productId }) => ({
      updateOne: {
        filter: { warehouseId, productId },
        update: { 
          $set: { 
            lastUpdated: new Date(),
            warehouseId,    
            productId    
          }
        },
        upsert: true, 
      }
    }));

    // Execute bulk operations
    await InventoryItem.bulkWrite(bulkOps, { session });

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
  // Input Validation
  if (!warehouseId || !productId) {
    throw new Error('Both warehouseId and productId are required.');
  }

  try {
    // Remove the inventory item associated with the warehouse and product
    const inventoryItem = await InventoryItem.findOneAndDelete({
      warehouseId: warehouseId,
      productId: productId,
    });

    if (!inventoryItem) {
      throw new Error('Inventory item not found.');
    }

    // Find the product by productId
    const product = await Product.findOne({ productId: productId });

    if (product) {
      // Update the total stock quantity based on variants
      await product.updateStockQuantity();
    } else {
      console.warn(`Product with productId ${productId} not found.`);
    }

    return inventoryItem;
  } catch (error) {
    console.error('Error removing product from warehouse:', error);
    throw error; 
  }
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
    const sortedWarehouseIds = warehouseIds.slice().sort(); // Clone and sort to ensure consistency
    const cacheKey = `productIds:${sortedWarehouseIds.join(',')}`;

    // Check if productIds are cached
    const cachedProductIds = await getAsync(cacheKey);
    if (cachedProductIds) {
      console.log('Retrieved productIds from cache.');
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
    console.log('Cached productIds in Redis.');

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
