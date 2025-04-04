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
  const farmerId = req.params.farmerId; 

  try {
    // Find the farmer
    const farmer = await Farmer.findOne({ farmerId });

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Get all orderIds from currentOrders and completedOrders
    const orderIds = [...(farmer.currentOrders || []), ...(farmer.completedOrders || [])];

    if (orderIds.length === 0) {
      return res.status(200).json({ orders: [] }); 
    }

    // Aggregation pipeline
    const orders = await Order.aggregate([
      {
        $match: {
          orderId: { $in: orderIds },
        },
      },
      {
        $unwind: '$orderItems',
      },
      {
        $lookup: {
          from: 'products', // MongoDB collection name (usually lowercase plural)
          localField: 'orderItems.productId',
          foreignField: 'productId',
          as: 'orderItems.productDetails',
        },
      },
      {
        $unwind: {
          path: '$orderItems.productDetails',
          preserveNullAndEmptyArrays: true, 
        },
      },
      {
        $group: {
          _id: '$_id',
          orderId: { $first: '$orderId' },
          farmerId: { $first: '$farmerId' },
          orderStatus: { $first: '$orderStatus' },
          statusHistory: { $first: '$statusHistory' },
          paymentDetails: { $first: '$paymentDetails' },
          shippingDetails: { $first: '$shippingDetails' },
          orderDate: { $first: '$orderDate' },
          shippedDate: { $first: '$shippedDate' },
          deliveredDate: { $first: '$deliveredDate' },
          cancelledDate: { $first: '$cancelledDate' },
          returnedDate: { $first: '$returnedDate' },
          reasonForCancellation: { $first: '$reasonForCancellation' },
          reasonForReturn: { $first: '$reasonForReturn' },
          customerRemarks: { $first: '$customerRemarks' },
          adminRemarks: { $first: '$adminRemarks' },
          orderItems: {
            $push: {
              productId: '$orderItems.productId',
              productName: '$orderItems.productName',
              sizeOption: '$orderItems.sizeOption',
              quantity: '$orderItems.quantity',
              weight: '$orderItems.weight',
              totalItemWeight: '$orderItems.totalItemWeight',
              hazardous: '$orderItems.hazardous',
              fragile: '$orderItems.fragile',
              itemType: '$orderItems.itemType',
              productDetails: {
                name: '$orderItems.productDetails.name',
                price: '$orderItems.productDetails.price',
                category: '$orderItems.productDetails.category',
                images: '$orderItems.productDetails.images', // Including images array
                // Include other desired fields from Product as needed
              },
            },
          },
          totalQuantity: { $first: '$totalQuantity' },
          totalWeight: { $first: '$totalWeight' },
          totalPrice: { $first: '$totalPrice' },
        },
      },
    ]);

    return res.status(200).json(orders);
  } catch (error) {
    console.error('Error retrieving orders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Controller to get all orders with product details
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      {
        $unwind: '$orderItems',
      },
      {
        $lookup: {
          from: 'products', // Ensure this matches your Product collection name
          localField: 'orderItems.productId',
          foreignField: 'productId',
          as: 'orderItems.productDetails',
        },
      },
      {
        $unwind: {
          path: '$orderItems.productDetails',
          preserveNullAndEmptyArrays: true, 
        },
      },
      {
        $group: {
          _id: '$_id',
          orderId: { $first: '$orderId' },
          farmerId: { $first: '$farmerId' },
          orderStatus: { $first: '$orderStatus' },
          statusHistory: { $first: '$statusHistory' },
          paymentDetails: { $first: '$paymentDetails' },
          shippingDetails: { $first: '$shippingDetails' },
          orderDate: { $first: '$orderDate' },
          shippedDate: { $first: '$shippedDate' },
          deliveredDate: { $first: '$deliveredDate' },
          cancelledDate: { $first: '$cancelledDate' },
          returnedDate: { $first: '$returnedDate' },
          reasonForCancellation: { $first: '$reasonForCancellation' },
          reasonForReturn: { $first: '$reasonForReturn' },
          customerRemarks: { $first: '$customerRemarks' },
          adminRemarks: { $first: '$adminRemarks' },
          orderItems: {
            $push: {
              productId: '$orderItems.productId',
              productName: '$orderItems.productName',
              sizeOption: '$orderItems.sizeOption',
              quantity: '$orderItems.quantity',
              weight: '$orderItems.weight',
              totalItemWeight: '$orderItems.totalItemWeight',
              hazardous: '$orderItems.hazardous',
              fragile: '$orderItems.fragile',
              itemType: '$orderItems.itemType',
              productDetails: {
                name: '$orderItems.productDetails.name',
                price: '$orderItems.productDetails.price',
                category: '$orderItems.productDetails.category',
                images: '$orderItems.productDetails.images',
                // Include other desired fields from Product as needed
              },
            },
          },
          totalQuantity: { $first: '$totalQuantity' },
          totalWeight: { $first: '$totalWeight' },
          totalPrice: { $first: '$totalPrice' },
        },
      },
      {
        $sort: { orderDate: -1 }, // Optional: Sort orders by most recent
      },
    ]);

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Error retrieving all orders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



exports.placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      farmerId,
      orderItems,
      totalQuantity,
      totalWeight,
      totalPrice,
      orderStatus,       // Expected to be 'Placed' or another valid enum value
      paymentDetails,
      statusHistory,     
      customerRemarks,
    } = req.body;

    // Validate farmer existence
    const farmer = await Farmer.findOne({ farmerId }).session(session);
    if (!farmer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Validate each product and check stock for every order item
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
        return res.status(400).json({ message: `Insufficient stock for product ${product.name.en || product.name}` });
      }
    }

    // Create Order – orderId will be automatically generated by the schema (uuidv4)
    const order = new Order({
      farmerId,
      orderItems,       
      totalQuantity,    // These totals will be recalculated in the pre-save hook if needed
      totalWeight,
      totalPrice,
      orderStatus: orderStatus || 'Placed',
      paymentDetails,
      statusHistory,
      customerRemarks,
      // orderDate will default to current date per schema definition
    });

    await order.save({ session });

    // Update the Farmer's order list
    await Farmer.updateOne(
      { farmerId },
      { $push: { currentOrders: order.orderId } },
      { session }
    );

    // Deduct stock quantities for each product in the order
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