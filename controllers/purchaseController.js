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
      stockTransaction, // transactionId from stockIn response
    } = req.body;

    // Basic validation
    if (
      !supplierId ||
      !warehouseId ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({
        error: 'supplierId, warehouseId, and at least one product are required.',
      });
    }

    // Validate stockTransactionId (transactionId)
    if (!stockTransaction || typeof stockTransaction !== 'string') {
      return res.status(400).json({
        error: 'Valid transactionId is required for stockTransaction.',
      });
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

    // Find the StockTransaction by transactionId
    const stockTrans = await StockTransaction.findOne({
      transactionId: stockTransaction,
    }).session(session);
    if (!stockTrans) {
      throw new Error(
        'StockTransaction with the provided transactionId not found.'
      );
    }

    // Prepare the products array for Purchase
    const purchaseProducts = products.map((item, index) => {
      if (!item.productId) {
        throw new Error(`products.${index}.productId is required.`);
      }
      return {
        productId: item.productId, // Use 'productId' directly
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxes: item.taxes,
        transportCharges: item.transportCharges,
        otherCharges: item.otherCharges,
        totalCost: item.totalCost,
        finalCutoffUnitPrice: item.finalCutoffUnitPrice,
      };
    });

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
      stockTransaction: stockTrans._id, // Reference by _id
    });

    await purchase.save({ session });

    // Optionally, you might want to update related documents or perform additional operations here

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Populate the stockTransaction field with transactionId for response clarity
    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate({
        path: 'stockTransaction',
        select: 'transactionId transactionType warehouseId',
      })
      .exec();

    res.status(201).json({
      message: 'Purchase recorded successfully.',
      purchase: {
        purchaseId: populatedPurchase.purchaseId,
        supplierId: populatedPurchase.supplierId,
        warehouseId: populatedPurchase.warehouseId,
        products: populatedPurchase.products,
        totalQuantity: populatedPurchase.totalQuantity,
        subTotal: populatedPurchase.subTotal,
        totalTax: populatedPurchase.totalTax,
        totalTransportCharges: populatedPurchase.totalTransportCharges,
        totalOtherCharges: populatedPurchase.totalOtherCharges,
        grandTotal: populatedPurchase.grandTotal,
        paymentStatus: populatedPurchase.paymentStatus,
        paymentDetails: populatedPurchase.paymentDetails,
        notes: populatedPurchase.notes,
        stockTransaction: {
          transactionId: populatedPurchase.stockTransaction.transactionId,
          transactionType: populatedPurchase.stockTransaction.transactionType,
          warehouseId: populatedPurchase.stockTransaction.warehouseId,
        },
        purchaseDate: populatedPurchase.purchaseDate,
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
