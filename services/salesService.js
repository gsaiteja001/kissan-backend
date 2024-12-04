// services/salesService.js

const mongoose = require('mongoose');
const Sale = require('../modal/Sale');
const InventoryItem = require('../modal/InventoryItem');
const Product = require('../modal/product');
const Warehouse = require('../modal/warehouse');

const StockTransaction = require('../modal/StockTransaction');
const SalesTransaction = require('../modal/SalesTransaction');

const order = require('../modal/order');

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



async function recordSale(order) {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Ensure order has fulfillingWarehouse
    const warehouseId = order.fulfillingWarehouse;

    // Step 1: Check if the warehouse exists
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    // Initialize variables to calculate totals
    const products = [];
    let totalQuantity = 0;
    let subTotal = 0;
    let totalTax = 0; // Modify as per your tax calculations
    let totalOtherCharges = 0; // Modify as per other charges
    let grandTotal = 0;

    // Step 2: Process each item in orderItems
    for (const item of order.orderItems) {
      const { productId, quantity, sizeOption } = item;

      // Step 3: Check if the product exists
      const product = await Product.findOne({ productId }).session(session);
      if (!product) {
        throw new Error(`Product with productId ${productId} not found.`);
      }

      // Step 4: Find the InventoryItem
      const inventoryItem = await InventoryItem.findOne({
        warehouseId,
        productId,
      }).session(session);

      if (!inventoryItem) {
        throw new Error(
          `Inventory item for productId ${productId} not found in warehouse ${warehouseId}.`
        );
      }

      // Step 5: Check if sufficient stock is available
      if (inventoryItem.stockQuantity < quantity) {
        throw new Error(
          `Insufficient stock for productId ${productId}. Available: ${inventoryItem.stockQuantity}, Requested: ${quantity}`
        );
      }

      // Step 6: Update the InventoryItem stock
      inventoryItem.stockQuantity -= quantity;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save({ session });

      // Step 7: Update Product's total stock
      await product.updateTotalStock();

      // Calculate unitPrice (use sizeOption price if available)
      const unitPrice =
        (sizeOption && sizeOption.price) ||
        product.finalPrice ||
        product.price;

      // Calculate totalPrice for the item
      const totalPrice = unitPrice * quantity;

      // Accumulate totals
      totalQuantity += quantity;
      subTotal += totalPrice;

      // Prepare product details for SalesTransaction
      products.push({
        productId,
        quantity,
        unitPrice,
        totalPrice,
        taxes: 0, // Modify as per your tax calculations
        otherCharges: 0, // Modify as per other charges
        totalCost: totalPrice, // totalPrice + taxes + otherCharges
      });
    }

    // Step 8: Calculate grandTotal (modify as per your calculations)
    grandTotal = subTotal + totalTax + totalOtherCharges;

    // Step 9: Create a StockTransaction for Stock Out
    const stockOutTransaction = new StockTransaction({
      transactionType: 'stockOut',
      warehouseId,
      products: products.map((prod) => ({
        productId: prod.productId,
        quantity: prod.quantity,
        unit: 'units', // Adjust unit as necessary
      })),
      performedBy: 'System', // Replace with actual user if available
      notes: `Stock out for Order ${order.orderId}`,
    });
    await stockOutTransaction.save({ session });

    // Step 10: Create a SalesTransaction
    const salesTransaction = new SalesTransaction({
      salesTransactionId: uuidv4(),
      orderId: order.orderId,
      warehouseId,
      saleDate: new Date(),
      products,
      totalQuantity,
      subTotal,
      totalTax,
      totalOtherCharges,
      grandTotal,
      paymentStatus: order.paymentDetails?.paymentStatus || 'Pending',
      paymentDetails: order.paymentDetails,
      notes: order.adminRemarks || '',
      stockTransaction: stockOutTransaction._id,
    });
    await salesTransaction.save({ session });

    // Step 11: Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Optionally, return the salesTransaction
    return salesTransaction;
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
