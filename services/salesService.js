// services/salesService.js

const mongoose = require('mongoose');
const Sale = require('../modal/Sale');
const InventoryItem = require('../modal/InventoryItem');
const Product = require('../modal/product');
const Warehouse = require('../modal/warehouse');

async function getSalesReport() {
  const salesData = await Sale.aggregate([
    {
      $group: {
        _id: {
          warehouse: '$warehouse',
          product: '$product',
        },
        totalQuantitySold: { $sum: '$quantitySold' },
      },
    },
    {
      $lookup: {
        from: 'warehouses',
        localField: '_id.warehouse',
        foreignField: '_id',
        as: 'warehouse',
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $unwind: '$warehouse',
    },
    {
      $unwind: '$product',
    },
    {
      $project: {
        warehouseName: '$warehouse.warehouseName',
        productName: '$product.name',
        totalQuantitySold: 1,
      },
    },
    {
      $sort: { warehouseName: 1, totalQuantitySold: -1 },
    },
  ]);

  return salesData;
}


/**
 * Records a sale transaction.
 * @param {String} warehouseId - The ObjectId of the warehouse where the sale is made.
 * @param {String} productId - The ObjectId of the product being sold.
 * @param {Number} quantitySold - The quantity of the product sold.
 * @param {Object} [saleDetails] - Additional details about the sale (optional).
 * @returns {Object} - The created Sale document.
 * @throws {Error} - Throws error if the sale cannot be recorded.
 */
async function recordSale(warehouseId, productId, quantitySold, saleDetails = {}) {
  // Validate input parameters
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new Error('Invalid warehouse ID.');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid product ID.');
  }

  if (typeof quantitySold !== 'number' || quantitySold <= 0) {
    throw new Error('Quantity sold must be a positive number.');
  }

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Check if the warehouse exists
    const warehouse = await Warehouse.findById(warehouseId).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    // Step 2: Check if the product exists
    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error('Product not found.');
    }

    // Step 3: Find the InventoryItem
    const inventoryItem = await InventoryItem.findOne({
      warehouse: warehouseId,
      product: productId,
    }).session(session);

    if (!inventoryItem) {
      throw new Error('Inventory item not found in the specified warehouse.');
    }

    // Step 4: Check if sufficient stock is available
    if (inventoryItem.stockQuantity < quantitySold) {
      throw new Error('Insufficient stock for the product in the specified warehouse.');
    }

    // Step 5: Create the Sale record
    const sale = new Sale({
      warehouse: warehouseId,
      product: productId,
      quantitySold,
      ...saleDetails, // Spread any additional sale details
    });

    await sale.save({ session });

    // Step 6: Update the InventoryItem stock
    inventoryItem.stockQuantity -= quantitySold;
    inventoryItem.lastUpdated = new Date();
    await inventoryItem.save({ session });

    // Step 7: Update Product's total stock (if maintained)
    // Assuming Product has a 'stockQuantity' representing total stock across all warehouses
    product.stockQuantity -= quantitySold;
    if (product.stockQuantity < 0) product.stockQuantity = 0; // Prevent negative stock
    await product.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Optionally, populate the sale document before returning
    const populatedSale = await Sale.findById(sale._id)
      .populate('warehouse', 'warehouseName address')
      .populate('product', 'name category')
      .exec();

    return populatedSale;
  } catch (error) {
    // Abort the transaction on error
    await session.abortTransaction();
    session.endSession();
    // Rethrow the error to be handled by the caller
    throw error;
  }
}


module.exports = {
  recordSale,
  getSalesReport,
  // ... other sales-related functions
};
