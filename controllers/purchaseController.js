const mongoose = require('mongoose');
const Purchase = require('../modal/Purchase');
const StockTransaction = require('../modal/StockTransaction');
const Supplier = require('../modal/Supplier');
const Warehouse = require('../modal/warehouse');
const Product = require('../modal/product');
const InventoryItem = require('../modal/InventoryItem');

/**
 * Handles the creation of a purchase.
 */
exports.createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      supplierId,
      warehouseId,
      products,
      totalQuantity,
      subTotal,
      taxPercentage,
      totalTax,
      totalTransportCharges,
      totalOtherCharges,
      grandTotal,
      paymentStatus,
      paymentDetails,
      notes,
      stockTransaction, // _id from stockIn response
    } = req.body;

    // Basic validation
    if (!supplierId || !warehouseId || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'supplierId, warehouseId and at least one product are required.' });
    }

    // Validate stockTransactionId
    if (!stockTransaction || !mongoose.Types.ObjectId.isValid(stockTransaction)) {
      return res.status(400).json({ error: 'Valid stockTransaction ID is required.' });
    }

    // Find the Supplier
    const supplier = await Supplier.findOne({ supplierId }).session(session);
    if (!supplier) {
      throw new Error('Supplier not found.');
    }

    // Find the Warehouse
    const warehouse = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouse) {
      throw new Error('Warehouse not found.');
    }

    // Find the StockTransaction
    const stockTrans = await StockTransaction.findById(stockTransaction).session(session);
    if (!stockTrans) {
      throw new Error('StockTransaction not found.');
    }

    // Prepare the products array
    const purchaseProducts = products.map(item => ({
      productId: item.id, // Assuming 'id' corresponds to 'productId'
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      taxes: item.taxes,
      transportCharges: item.allocatedTransportCharges,
      otherCharges: item.allocatedOtherCharges,
      totalCost: item.totalCost,
      finalCutoffUnitPrice: item.finalCutoffUnitPrice,
    }));

    // Create the Purchase document
    const purchase = new Purchase({
      supplierId,
      warehouseId,
      products: purchaseProducts,
      totalQuantity,
      subTotal,
      totalTax,
      totalTransportCharges,
      totalOtherCharges,
      grandTotal,
      paymentStatus,
      paymentDetails,
      notes,
      stockTransaction, // Link to the StockTransaction
    });

    await purchase.save({ session });

    // Optionally, you might want to update the payment status or other related data

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Purchase recorded successfully.',
      purchase: {
        purchaseId: purchase.purchaseId,
        supplierId: purchase.supplierId,
        warehouseId: purchase.warehouseId,
        products: purchase.products,
        totalQuantity: purchase.totalQuantity,
        subTotal: purchase.subTotal,
        totalTax: purchase.totalTax,
        totalTransportCharges: purchase.totalTransportCharges,
        totalOtherCharges: purchase.totalOtherCharges,
        grandTotal: purchase.grandTotal,
        paymentStatus: purchase.paymentStatus,
        paymentDetails: purchase.paymentDetails,
        notes: purchase.notes,
        stockTransaction: purchase.stockTransaction,
        purchaseDate: purchase.purchaseDate,
        // Include other fields as necessary
      },
    });
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();

    console.error('Error in createPurchase:', error);
    res.status(500).json({ error: error.message });
  }
};
