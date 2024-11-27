const Order = require('../modal/order');
const Farmer = require('../modal/farmers');
const Product = require('../modal/product');
const mongoose = require('mongoose');

// Helper function to generate unique order ID
const generateUniqueOrderId = () => {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};


// Controller to get orders with product details
exports.getOrdersWithProductDetails = async (req, res) => {
  const farmerId = req.params.farmerId; // Assuming farmerId is passed as a URL parameter

  try {
    // Find the farmer
    const farmer = await Farmer.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Get all orderIds from currentOrders and completedOrders
    const orderIds = [...farmer.currentOrders, ...farmer.completedOrders];

    // Fetch orders and populate product details
    const orders = await Order.find({ orderId: { $in: orderIds } })
      .populate({
        path: 'orderItems.productId',
        model: 'Product',
      })
      .lean();

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
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

// Controller to update order status
exports.updateOrderStatus = async (req, res) => {
  const { orderId, status, remarks } = req.body;

  // Validate status
  const validStatuses = ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status and add to statusHistory
    order.orderStatus = status;
    order.statusHistory.push({
      status,
      date: new Date(),
      remarks: remarks || '',
    });

    // Update relevant date fields based on status
    switch (status) {
      case 'Shipped':
        order.shippedDate = new Date();
        break;
      case 'Delivered':
        order.deliveredDate = new Date();
        // Move order from currentOrders to completedOrders
        await Farmer.updateOne(
          { farmerId: order.farmerId },
          {
            $pull: { currentOrders: order.orderId },
            $push: { completedOrders: order.orderId },
          }
        );
        break;
      case 'Cancelled':
        order.cancelledDate = new Date();
        order.reasonForCancellation = remarks || '';
        // Remove from currentOrders
        await Farmer.updateOne(
          { farmerId: order.farmerId },
          { $pull: { currentOrders: order.orderId } }
        );
        break;
      case 'Returned':
        order.returnedDate = new Date();
        order.reasonForReturn = remarks || '';
        // Remove from currentOrders or completedOrders and add to returnedOrders
        await Farmer.updateOne(
          { farmerId: order.farmerId },
          {
            $pull: { currentOrders: order.orderId, completedOrders: order.orderId },
            $push: { returnedOrders: order.orderId },
          }
        );
        break;
      default:
        break;
    }

    await order.save();

    return res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

