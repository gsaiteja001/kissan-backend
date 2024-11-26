const Order = require('../model/Order');
const Farmer = require('../model/farmers');
const Product = require('../model/product');
const mongoose = require('mongoose');

// Helper function to generate unique order ID
const generateUniqueOrderId = () => {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// Controller to place an order
exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      farmerId,
      orderItems,
      paymentDetails,
      shippingDetails,
    } = req.body;

    // Validate farmer existence
    const farmer = await Farmer.findOne({ farmerId }).session(session);
    if (!farmer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Validate each product and check stock
    for (let item of orderItems) {
      const product = await Product.findOne({ productId: item.productId }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      if (product.stockQuantity < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: `Insufficient stock for product ${product.name.en}` });
      }

      // Optionally, validate sizeOption and other fields
    }

    // Create Order
    const order = new Order({
      orderId: generateUniqueOrderId(),
      farmerId,
      orderItems,
      paymentDetails,
      shippingDetails,
      statusHistory: [{
        status: 'Placed',
        date: new Date(),
        remarks: 'Order placed successfully.',
      }],
    });

    await order.save({ session });

    // Update Farmer's order lists
    await Farmer.updateOne(
      { farmerId },
      { $push: { currentOrders: order.orderId } },
      { session }
    );

    // Deduct stock quantities
    for (let item of orderItems) {
      await Product.updateOne(
        { productId: item.productId },
        { $inc: { stockQuantity: -item.quantity } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error placing order:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
