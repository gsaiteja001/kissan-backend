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
      purchaseDate, // Optional, defaults to Date.now in schema
      fulfillments,
      notes,
    } = req.body;

    // Basic validation
    if (
      !supplierId ||
      !fulfillments ||
      !Array.isArray(fulfillments) ||
      fulfillments.length === 0
    ) {
      return res.status(400).json({
        error: 'supplierId and at least one fulfillment are required.',
      });
    }

    // Validate Supplier
    const supplier = await Supplier.findOne({ supplierId }).session(session);
    if (!supplier) {
      throw new Error('Supplier not found.');
    }

    // Validate each Fulfillment
    for (let fIndex = 0; fIndex < fulfillments.length; fIndex++) {
      const fulfillment = fulfillments[fIndex];

      if (!fulfillment.warehouseId) {
        throw new Error(`fulfillments.${fIndex}.warehouseId is required.`);
      }

      // Validate Warehouse
      const warehouse = await Warehouse.findOne({ warehouseId: fulfillment.warehouseId }).session(session);
      if (!warehouse) {
        throw new Error(`Warehouse with ID ${fulfillment.warehouseId} not found in fulfillments.${fIndex}.`);
      }

      if (
        !fulfillment.products ||
        !Array.isArray(fulfillment.products) ||
        fulfillment.products.length === 0
      ) {
        throw new Error(`fulfillments.${fIndex}.products must contain at least one product.`);
      }

      // Validate each Product in Fulfillment
      for (let pIndex = 0; pIndex < fulfillment.products.length; pIndex++) {
        const product = fulfillment.products[pIndex];

        if (!product.productId) {
          throw new Error(`fulfillments.${fIndex}.products.${pIndex}.productId is required.`);
        }

        // Validate Product existence
        const productExists = await Product.findOne({ productId: product.productId }).session(session);
        if (!productExists) {
          throw new Error(`Product with ID ${product.productId} not found in fulfillments.${fIndex}.products.${pIndex}.`);
        }

        if (typeof product.quantity !== 'number' || product.quantity <= 0) {
          throw new Error(`fulfillments.${fIndex}.products.${pIndex}.quantity must be a positive number.`);
        }

        if (typeof product.unitPrice !== 'number' || product.unitPrice < 0) {
          throw new Error(`fulfillments.${fIndex}.products.${pIndex}.unitPrice must be a non-negative number.`);
        }

        // Optionally, validate other fields like taxes, transportCharges, etc.
      }

      // Ensure paymentDetails.paymentMethod is set and valid
      const validPaymentMethods = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Others'];
      if (!fulfillment.paymentDetails || !validPaymentMethods.includes(fulfillment.paymentDetails.paymentMethod)) {
        throw new Error(`fulfillments.${fIndex}.paymentDetails.paymentMethod is invalid or missing.`);
      }
    }

    // Create the Purchase document
    const purchase = new Purchase({
      supplierId,
      purchaseDate, // If not provided, schema defaults to Date.now
      fulfillments,
      notes,
    });

    await purchase.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Populate necessary fields for response
    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate({
        path: 'fulfillments.warehouse', // Use the virtual field
        select: 'warehouseId warehouseName', // Adjust fields as necessary
      })
      .populate({
        path: 'fulfillments.products.product', // Use the virtual field
        select: 'productId name', // Adjust fields as necessary
      })
      .exec();

    res.status(201).json({
      message: 'Purchase recorded successfully.',
      purchase: {
        purchaseId: populatedPurchase.purchaseId,
        supplierId: populatedPurchase.supplierId,
        purchaseDate: populatedPurchase.purchaseDate,
        fulfillments: populatedPurchase.fulfillments.map((fulfillment) => ({
          warehouseId: fulfillment.warehouseId,
          warehouseName: fulfillment.warehouse ? fulfillment.warehouse.warehouseName : null, // Access via virtual
          products: fulfillment.products.map((product) => ({
            productId: product.productId,
            productName: product.product ? product.product.name : null, // Access via virtual
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.totalPrice,
            taxes: product.taxes,
            transportCharges: product.transportCharges,
            otherCharges: product.otherCharges,
            totalCost: product.totalCost,
          })),
          totalQuantity: fulfillment.totalQuantity,
          subTotal: fulfillment.subTotal,
          totalTax: fulfillment.totalTax,
          totalTransportCharges: fulfillment.totalTransportCharges,
          totalOtherCharges: fulfillment.totalOtherCharges,
          grandTotal: fulfillment.grandTotal,
          paymentStatus: fulfillment.paymentStatus,
          paymentDetails: fulfillment.paymentDetails,
          deliveryStatus: fulfillment.deliveryStatus,
          notes: fulfillment.notes,
        })),
        totalQuantity: populatedPurchase.totalQuantity,
        subTotal: populatedPurchase.subTotal,
        totalTax: populatedPurchase.totalTax,
        totalTransportCharges: populatedPurchase.totalTransportCharges,
        totalOtherCharges: populatedPurchase.totalOtherCharges,
        grandTotal: populatedPurchase.grandTotal,
        paymentStatus: populatedPurchase.paymentStatus,
        paymentDetails: populatedPurchase.paymentDetails,
        notes: populatedPurchase.notes,
        purchaseDate: populatedPurchase.purchaseDate,
        // Include other fields as necessary
      },
    });
  } catch (error) {
    // Abort the Transaction on Error if it's still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error('Error in createPurchase:', error);
    res.status(500).json({ error: error.message });
  }
};



// Controller to update delivery status of a specific fulfillment
exports.updateDeliveryStatus = async (req, res) => {
  const { purchaseId, fulfillmentIndex } = req.params;
  const { deliveryStatus } = req.body;

  // Define allowed delivery statuses
  const allowedStatuses = ['Pending', 'In Transit', 'Delivered', 'Partial', 'Failed'];

  // Validate new delivery status
  if (!allowedStatuses.includes(deliveryStatus)) {
    return res.status(400).json({
      error: `Invalid delivery status. Allowed statuses are: ${allowedStatuses.join(', ')}`,
    });
  }

  try {
    // Find the purchase by purchaseId
    const purchase = await Purchase.findOne({ purchaseId });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found.' });
    }

    // Validate fulfillmentIndex
    const fulfillmentIdx = parseInt(fulfillmentIndex, 10);
    if (
      isNaN(fulfillmentIdx) ||
      fulfillmentIdx < 0 ||
      fulfillmentIdx >= purchase.fulfillments.length
    ) {
      return res.status(400).json({ error: 'Invalid fulfillment index.' });
    }

    // Update the delivery status
    purchase.fulfillments[fulfillmentIdx].deliveryStatus = deliveryStatus;

    // Optionally, handle side effects based on the new status

    // Save the updated purchase
    await purchase.save();

    res.json({
      message: `Delivery status updated to "${deliveryStatus}" for fulfillment index ${fulfillmentIdx}.`,
      purchase,
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


/**
 * Fetches all purchases associated with a specific warehouseId.
 */
exports.getPurchasesByWarehouseId = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { warehouseId } = req.params;

    // Validate warehouseId
    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId is required in the URL parameter.' });
    }

    // Optionally, verify that the warehouse exists
    const warehouseExists = await Warehouse.findOne({ warehouseId }).session(session);
    if (!warehouseExists) {
      throw new Error(`Warehouse with ID ${warehouseId} not found.`);
    }

    // Fetch purchases where fulfillments contain the given warehouseId
    const purchases = await Purchase.find({ 'fulfillments.warehouseId': warehouseId })
      .populate({
        path: 'fulfillments.warehouse', // Virtual field for Warehouse
        select: 'warehouseId warehouseName', // Adjust fields as necessary
      })
      .populate({
        path: 'fulfillments.products.product', // Virtual field for Product
        select: 'productId name', // Adjust fields as necessary
      })
      .session(session)
      .exec();

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: `Purchases for Warehouse ID ${warehouseId} fetched successfully.`,
      purchases,
    });
  } catch (error) {
    // Abort the transaction if still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error('Error in getPurchasesByWarehouseId:', error);
    res.status(500).json({ error: error.message });
  }
};
