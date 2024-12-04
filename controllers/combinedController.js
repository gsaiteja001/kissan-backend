// controllers/combinedController.js

exports.stockInAndPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      warehouseId,
      products,
      performedBy,
      notes,
      purchaseDetails, // Contains supplierId, payment details, etc.
    } = req.body;

    // **Stock-In Operation**
    // Similar to your existing stockIn controller
    const stockInTransaction = new StockTransaction({
      transactionType: 'stockIn',
      warehouseId,
      products: products.map((prod) => ({
        productId: prod.productId,
        quantity: prod.quantity,
        unit: prod.unit || 'kg',
      })),
      performedBy: performedBy || 'System',
      notes: notes || '',
    });
    await stockInTransaction.save({ session });

    // Update Inventory Items and Products
    for (const prod of products) {
      const { productId, quantity } = prod;

      // Find or create InventoryItem
      let inventoryItem = await InventoryItem.findOne({ warehouseId, productId }).session(session);
      if (!inventoryItem) {
        inventoryItem = new InventoryItem({ warehouseId, productId, stockQuantity: 0, reorderLevel: 10 });
      }

      // Update stock quantity
      inventoryItem.stockQuantity += quantity;
      inventoryItem.lastUpdated = new Date();
      await inventoryItem.save({ session });

      // Update Product's total stock
      const product = await Product.findOne({ productId }).session(session);
      if (product) {
        await product.updateTotalStock();
      }
    }

    // **Purchase Recording Operation**
    const {
      supplierId,
      paymentStatus,
      paymentDetails,
      purchaseNotes,
      allocatedItems,
      totalQuantity,
      taxPercentage,
      totalTax,
      totalTransportCharges,
      totalOtherCharges,
      grandTotal,
      // ... any other necessary fields
    } = purchaseDetails;

    // Validate and prepare purchase products
    const purchaseProducts = allocatedItems.map((item, index) => {
      if (!item.productId) {
        throw new Error(`purchaseDetails.allocatedItems.${index}.productId is required.`);
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxes: item.taxes,
        transportCharges: item.allocatedTransportCharges,
        otherCharges: item.allocatedOtherCharges,
        totalCost: item.totalCost,
        finalCutoffUnitPrice: item.finalCutoffUnitPrice,
      };
    });

    // Create Purchase Document
    const purchase = new Purchase({
      supplierId,
      warehouseId,
      products: purchaseProducts,
      totalQuantity,
      subTotal: allocatedItems.reduce((acc, item) => acc + item.totalPrice, 0),
      totalTax,
      totalTransportCharges,
      totalOtherCharges,
      grandTotal,
      paymentStatus,
      paymentDetails,
      notes: purchaseNotes,
      stockTransaction: stockInTransaction._id,
    });
    await purchase.save({ session });

    // Link Purchase to StockTransaction
    stockInTransaction.purchase = purchase._id;
    await stockInTransaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Stock In and Purchase recorded successfully.',
      stockTransaction: {
        transactionId: stockInTransaction.transactionId,
        // ... other fields
      },
      purchase: {
        purchaseId: purchase.purchaseId,
        // ... other fields
      },
    });
  } catch (error) {
    // Abort the Transaction on Error
    await session.abortTransaction();
    session.endSession();

    console.error('Error in stockInAndPurchase:', error);
    res.status(500).json({ error: error.message });
  }
};
