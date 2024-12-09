
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
 * @returns {Promise<Object>} - The updated or created InventoryItems.
 */
async function addProductToWarehouse(warehouseId, productData) {
  if (!warehouseId) {
    throw new Error('Warehouse ID is required.');
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the warehouse within the session
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    let product;

    // Check if the product exists
    if (productData.productId) {
      product = await Product.findOne({ productId: productData.productId }).session(session);

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
            const existingVariant = product.variants.find(
              (v) => v.variantId === incomingVariant.variantId
            );
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

    // Save the product with updated/created data within the session
    await product.save({ session });

    // Handle InventoryItem creation or update
    if (productData.variants && Array.isArray(productData.variants)) {
      // Iterate over each variant to create/update InventoryItem
      for (const variant of productData.variants) {
        const { variantId } = variant;

        // Define the query based on variantId
        const inventoryQuery = {
          warehouseId,
          productId: product.productId,
          variantId: variantId || null, // Set to null if variantId is not provided
        };

        // Find or create the InventoryItem using upsert
        await InventoryItem.findOneAndUpdate(
          inventoryQuery,
          {
            $setOnInsert: {
              stockQuantity: 0, // Initialize with zero or any default value
              reorderLevel: 10, // Default reorder level
            },
            $set: {
              lastUpdated: new Date(),
            },
          },
          {
            new: true,
            upsert: true, // Creates the document if it doesn't exist
            session,
          }
        );

        console.log(`InventoryItem ensured for productId ${product.productId} ${variantId ? `and variantId ${variantId}` : ''}.`);
      }
    } else {
      // Handle products without variants
      const inventoryQuery = {
        warehouseId,
        productId: product.productId,
        variantId: null,
      };

      // Find or create the InventoryItem using upsert
      await InventoryItem.findOneAndUpdate(
        inventoryQuery,
        {
          $setOnInsert: {
            stockQuantity: 0, // Initialize with zero or any default value
            reorderLevel: 10, // Default reorder level
          },
          $set: {
            lastUpdated: new Date(),
          },
        },
        {
          new: true,
          upsert: true, // Creates the document if it doesn't exist
          session,
        }
      );

      console.log(`InventoryItem ensured for productId ${product.productId} with no variant.`);
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Fetch the updated or created InventoryItem(s) to return
    let inventoryItems;
    if (productData.variants && Array.isArray(productData.variants)) {
      const variantIds = productData.variants.map((v) => v.variantId || null);
      inventoryItems = await InventoryItem.find({
        warehouseId,
        productId: product.productId,
        variantId: { $in: variantIds },
      }).session(session);
    } else {
      inventoryItems = await InventoryItem.find({
        warehouseId,
        productId: product.productId,
        variantId: null,
      }).session(session);
    }

    return inventoryItems;
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();
    console.error('Error in addProductToWarehouse transaction:', error);
    throw error;
  }
}




/**
 * Adds multiple products (with optional variants) to a warehouse.
 * Ensures each product and variant is properly associated with the warehouse.
 * 
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {Array} products - An array of products with productId and variants.
 * @returns {Promise<Array>} - An array of updated or created InventoryItems.
 */
async function addMultipleProductsToWarehouse(warehouseId, products) {
  if (!warehouseId) {
    throw new Error('Warehouse ID is required.');
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`Adding multiple products to Warehouse ID: ${warehouseId}`);

    // Find the warehouse within the session
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }
    console.log(`Warehouse found: ${warehouseId}`);

    // Validate all products exist
    const productIds = products.map((p) => p.productId);
    const existingProducts = await Product.find({ productId: { $in: productIds } }).session(session);
    const existingProductIds = existingProducts.map((p) => p.productId);

    const missingProducts = productIds.filter((pid) => !existingProductIds.includes(pid));
    if (missingProducts.length > 0) {
      throw new Error(`Products not found: ${missingProducts.join(', ')}`);
    }

    // Iterate over each product to handle variant updates
    for (const productEntry of products) {
      const { productId, variants } = productEntry;

      // Find the product within the session
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Handle variants using ProductSchema methods
      if (variants && Array.isArray(variants)) {
        for (const incomingVariant of variants) {
          const { variantId } = incomingVariant;
          if (!variantId) {
            throw new Error(`Variant must have a variantId for productId ${productId}.`);
          }

          const existingVariant = product.variants.find((v) => v.variantId === variantId);
          if (existingVariant) {
            // Update variant details using the updateVariant method
            await product.updateVariant(existingVariant.variantId, incomingVariant);
          } else {
            // Add new variant using the addVariant method
            await product.addVariant(incomingVariant);
          }
        }
      }

      // Save the product after handling variants within the session
      await product.save({ session });
    }

    // Prepare bulk operations to associate products and variants with the warehouse
    const bulkOps = [];

    for (const productEntry of products) {
      const { productId, variants } = productEntry;

      if (variants && Array.isArray(variants)) {
        for (const variant of variants) {
          bulkOps.push({
            updateOne: {
              filter: {
                warehouseId,
                productId,
                variantId: variant.variantId || null,
              },
              update: {
                $setOnInsert: {
                  stockQuantity: 0, // Initialize with zero or any default value
                  reorderLevel: 10, // Default reorder level
                },
                $set: {
                  lastUpdated: new Date(),
                },
              },
              upsert: true,
            },
          });
        }
      } else {
        // Handle products without variants
        bulkOps.push({
          updateOne: {
            filter: {
              warehouseId,
              productId,
              variantId: null,
            },
            update: {
              $setOnInsert: {
                stockQuantity: 0, // Initialize with zero or any default value
                reorderLevel: 10, // Default reorder level
              },
              $set: {
                lastUpdated: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      // Execute bulk operations within the session
      await InventoryItem.bulkWrite(bulkOps, { session });
      console.log(`Bulk operations executed for Warehouse ID: ${warehouseId}`);
    }

    // Fetch the updated/created inventory items
    let inventoryItems;
    if (products.some(p => p.variants && Array.isArray(p.variants))) {
      const variantFilters = products.flatMap(p => 
        p.variants ? p.variants.map(v => ({ productId: p.productId, variantId: v.variantId || null })) : []
      );

      // Build dynamic query for variants
      const variantQueries = variantFilters.map(f => ({
        warehouseId,
        productId: f.productId,
        variantId: f.variantId,
      }));

      inventoryItems = await InventoryItem.find({
        $or: variantQueries
      }).session(session);
    } else {
      // Fetch products without variants
      inventoryItems = await InventoryItem.find({
        warehouseId,
        productId: { $in: productIds },
        variantId: null,
      }).session(session);
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log(`Successfully added/updated multiple products to Warehouse ID: ${warehouseId}`);

    return inventoryItems;
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();
    console.error(`Transaction aborted due to error: ${error.message}`);
    throw error;
  }
}




/**
 * Removes an entire product from a warehouse's inventory.
 * 
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {String} productId - The ID of the product to remove.
 * @returns {Promise<Object>} - The result of the deletion.
 */
async function removeProductFromWarehouse(warehouseId, productId) {
  // Input Validation
  if (!warehouseId || !productId) {
    throw new Error('Both warehouseId and productId are required.');
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Remove all InventoryItems associated with the product in the warehouse
    const deletionResult = await InventoryItem.deleteMany({
      warehouseId: warehouseId,
      productId: productId,
    }).session(session);

    if (deletionResult.deletedCount === 0) {
      throw new Error('No Inventory items found for the specified product in the warehouse.');
    }

    console.log(`Deleted ${deletionResult.deletedCount} InventoryItem(s) for productId ${productId} from warehouse ${warehouseId}.`);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return {
      message: `Product ${productId} removed from warehouse ${warehouseId} successfully.`,
      deletedCount: deletionResult.deletedCount,
    };
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();
    console.error('Error removing product from warehouse:', error);
    throw error;
  }
}

/**
 * Removes a specific variant from a warehouse's inventory.
 * 
 * @param {String} warehouseId - The ID of the warehouse.
 * @param {String} productId - The ID of the product.
 * @param {String} variantId - The ID of the variant to remove.
 * @returns {Promise<Object>} - The deleted InventoryItem.
 */
async function removeVariantFromWarehouse(warehouseId, productId, variantId) {
  // Input Validation
  if (!warehouseId || !productId || !variantId) {
    throw new Error('warehouseId, productId, and variantId are required.');
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Remove the specific InventoryItem within the session
    const inventoryItem = await InventoryItem.findOneAndDelete(
      {
        warehouseId: warehouseId,
        productId: productId,
        variantId: variantId,
      },
      { session }
    );

    if (!inventoryItem) {
      throw new Error('Inventory item with the specified variant not found.');
    }

    console.log(`Deleted InventoryItem for productId ${productId} and variantId ${variantId} from warehouse ${warehouseId}.`);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return {
      message: `Variant ${variantId} of product ${productId} removed from warehouse ${warehouseId} successfully.`,
      deletedInventoryItem: inventoryItem,
    };
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();
    console.error('Error removing variant from warehouse:', error);
    throw error;
  }
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

    // Fetch Warehouse ObjectIds
    const warehouses = await Warehouse.find({ warehouseId: { $in: warehouseIds } }).select('_id').exec();
    const warehouseObjectIds = warehouses.map(w => w._id);

    console.log(`Found ${warehouseObjectIds.length} Warehouse documents for the provided warehouseIds.`);

    if (warehouseObjectIds.length === 0) {
      console.error('No matching Warehouse documents found.');
      return [];
    }

    // Aggregation
    const products = await InventoryItem.aggregate([
      { $match: { warehouse: { $in: warehouseObjectIds }, stockQuantity: { $gte: 0 } } },
      { $group: { _id: null, uniqueProductIds: { $addToSet: '$productId' } } },
      { $project: { _id: 0, uniqueProductIds: 1 } },
    ]);

    console.log(`Aggregation result: ${JSON.stringify(products)}`);

    if (products.length === 0) {
      console.warn('No products found for the given warehouses with stockQuantity > 0.');
      return [];
    }

    const productIds = products[0].uniqueProductIds;
    console.log(`Found ${productIds.length} unique productIds.`);

    // Cache the productIds
    await setAsync(cacheKey, 600, JSON.stringify(productIds));
    console.log('Cached productIds in Redis.');

    return productIds;
  } catch (error) {
    console.error('Error in getProductIdsFromWarehouses:', error);
    throw error;
  }
};


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

    // Filter productDetails.variants to include only the relevant variant
    {
      $addFields: {
        "productDetails.variants": {
          $filter: {
            input: "$productDetails.variants",
            as: "variant",
            cond: { $eq: ["$$variant.variantId", "$variantId"] }
          }
        }
      }
    },

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

    // Project the desired fields
    {
      $project: {
        _id: 1,
        warehouseId: 1,
        productId: 1,
        variantId: 1,
        stockQuantity: 1,
        reorderLevel: 1,
        lastUpdated: 1,
        createdAt: 1,
        updatedAt: 1,
        // Include product details with only the relevant variant
        product: '$productDetails',
        // Include warehouse details
        warehouse: '$warehouseDetails'
      }
    }
  ]);

  return inventoryItems;
}

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
  removeVariantFromWarehouse,
  listInventoryItems,
  addMultipleProductsToWarehouse,
  getAllWarehousesWithInventory,
  getProductIdsFromWarehouses,
};
