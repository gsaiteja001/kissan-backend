const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Subschema for Address
const AddressSchema = new Schema({
  street: { type: String, required: false },
  area: { type: String, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  postalCode: { type: String, required: false },
  country: { type: String, required: false },
}, { _id: false });

// Subschema for Order Items
const OrderItemSchema = new Schema({
  productId: { type: String, required: true, ref: 'Product' },
  variantId: { type: String, required: false, ref: 'Product.variants' },
  productName: { type: String, required: true },
  sku: { type: String, required: false },
  size: { type: String, required: false },
  unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
  finalPrice: { type: Number, required: true, min: [0, 'Final price cannot be negative'] },
  quantity: { type: Number, required: true, default: 1, min: [1, 'Quantity must be at least 1'] },
  totalPrice: { type: Number, required: true, min: [0, 'Total price cannot be negative'] },
  weight: { type: Number, required: false },
  totalItemWeight: { type: Number, required: false },
  hazardous: { type: Boolean, required: false, default: false },
  fragile: { type: Boolean, required: false, default: false },
  itemType: { type: String, required: false, enum: ['Chemical', 'Fertilizer', 'Tool', 'Gardening Equipment', 'Others'] },
}, { _id: false });

// Subschema for Payment Details
const PaymentDetailsSchema = new Schema({
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Cash on Delivery'],
    required: false,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending',
    required: false,
  },
  transactionId: { type: String, required: false },
  amountPaid: { type: Number, required: false, min: [0, 'Amount paid cannot be negative'] },
}, { _id: false });

// Subschema for Shipping Details
const ShippingDetailsSchema = new Schema({
  address: AddressSchema,
  distance: { type: Number, required: false },
  estimatedDeliveryDate: { type: Date, required: false },
  shippingMethod: {
    type: String,
    enum: ['Standard', 'Express', 'Overnight'],
    default: 'Standard',
    required: true,
  },
  trackingNumber: { type: String, required: false },
  carrier: { type: String, required: false },
}, { _id: false });

// Subschema for Order Status History
const OrderStatusHistorySchema = new Schema({
  status: {
    type: String,
    enum: ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
    required: false,
  },
  date: { type: Date, default: Date.now, required: false },
  remarks: { type: String, required: false },
}, { _id: false });

// Main Order Schema
const OrderSchema = new Schema(
  {
    orderId: { type: String, default: uuidv4, unique: true, immutable: true, trim: true },
    farmerId: { type: String, required: false, ref: 'Farmer' },
    orderItems: { 
      type: [OrderItemSchema], 
      required: true, 
      validate: [arrayLimit, '{PATH} must have at least one order item.'] 
    },
    totalQuantity: { type: Number, required: true, min: [0, 'Total quantity cannot be negative'] },
    totalWeight: { type: Number, required: true, min: [0, 'Total weight cannot be negative'] },
    totalPrice: { type: Number, required: true, min: [0, 'Total price cannot be negative'] },
    orderStatus: {
      type: String,
      enum: ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
      default: 'Placed',
      required: true,
    },
    statusHistory: { type: [OrderStatusHistorySchema], required: false, default: [] },
    paymentDetails: { type: PaymentDetailsSchema, required: false },
    shippingDetails: { type: ShippingDetailsSchema, required: false },
    orderDate: { type: Date, default: Date.now, required: true },
    shippedDate: { type: Date, required: false },
    deliveredDate: { type: Date, required: false },
    cancelledDate: { type: Date, required: false },
    returnedDate: { type: Date, required: false },
    reasonForCancellation: { type: String, required: false },
    reasonForReturn: { type: String, required: false },
    customerRemarks: { type: String, required: false },
    adminRemarks: { type: String, required: false },
    fulfillingWarehouse: {
      type: String,
      required: true,
      ref: 'Warehouse',
    },
  },
  { timestamps: true }
);

// Custom validator to ensure at least one order item
function arrayLimit(val) {
  return val.length > 0;
}

// Pre-save middleware to calculate totals
OrderSchema.pre('save', async function (next) {
  let totalQuantity = 0;
  let totalWeight = 0;
  let totalPrice = 0;

  try {
    for (let item of this.orderItems) {
      // Fetch product and variant details
      const product = await mongoose.model('Product').findOne({ productId: item.productId });
      if (!product) {
        throw new Error(`Product with productId ${item.productId} not found.`);
      }

      let variant = null;
      if (item.variantId) {
        variant = product.variants.find(v => v.variantId === item.variantId);
        if (!variant) {
          throw new Error(`Variant with variantId ${item.variantId} not found for productId ${item.productId}.`);
        }
      }

      // Assign productName from ProductSchema
      item.productName = product.name.en || product.name; // Adjust based on localization

      // Assign SKU from variant or product
      item.sku = variant ? variant.sku : product.sku || '';

      // Assign size from variant
      item.size = variant ? variant.size : '';

      // Assign unitPrice and finalPrice
      item.unitPrice = variant && variant.finalPrice > 0 ? variant.finalPrice : 
                       product.finalPrice > 0 ? product.finalPrice : 
                       product.price || 0;
      item.finalPrice = item.unitPrice; // Captured at order time

      // Calculate totalPrice
      item.totalPrice = item.unitPrice * item.quantity;

      // Assign weight from variant or product
      item.weight = variant ? variant.weight : product.weight || 0;

      // Calculate totalItemWeight
      item.totalItemWeight = item.weight * item.quantity;

      // Assign hazardous, fragile, and itemType from product
      item.hazardous = product.hazardous;
      item.fragile = product.fragile;
      item.itemType = product.itemType;

      // Accumulate totals
      totalQuantity += item.quantity;
      totalWeight += item.totalItemWeight;
      totalPrice += item.totalPrice;
    }

    this.totalQuantity = totalQuantity;
    this.totalWeight = totalWeight;
    this.totalPrice = totalPrice;

    next();
  } catch (error) {
    next(error);
  }
});

// Post 'save' hook to handle 'Delivered' status
OrderSchema.post('save', async function(doc, next) {
  if (doc.orderStatus === 'Delivered') {
    const session = this.$session();
    if (!session) {
      console.error('No session available for creating SalesTransaction and StockTransaction.');
      return next();
    }

    // Check if SalesTransaction already exists
    const existingSalesTx = await mongoose.model('SalesTransaction').findOne({ orderId: doc.orderId }).session(session);
    if (!existingSalesTx) {
      try {
        await createSalesAndStockTransaction(doc, session);
      } catch (error) {
        console.error('Error creating SalesTransaction and StockTransaction:', error);
        // Optionally, you can throw an error to rollback the transaction
        return next(error);
      }
    }
  }

  next();
});

// Post 'findOneAndUpdate' hook to handle 'Delivered' status
OrderSchema.post('findOneAndUpdate', async function(doc, next) {
  if (!doc) return next();

  if (doc.orderStatus === 'Delivered') {
    // Access the session from the query options
    const session = this.getOptions().session;
    if (!session) {
      console.error('No session available for creating SalesTransaction and StockTransaction.');
      return next();
    }

    // Check if SalesTransaction already exists
    const existingSalesTx = await mongoose.model('SalesTransaction').findOne({ orderId: doc.orderId }).session(session);
    if (!existingSalesTx) {
      try {
        await createSalesAndStockTransaction(doc, session);
      } catch (error) {
        console.error('Error creating SalesTransaction and StockTransaction:', error);
        // Optionally, throw error to rollback the transaction
        return next(error);
      }
    }
  }

  next();
});

// Helper function to create SalesTransaction and StockTransaction
async function createSalesAndStockTransaction(order, session) {
  // Prepare SalesTransaction data
  const salesProductsData = order.orderItems.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    taxes: 0, // Adjust based on business logic
    otherCharges: 0, // Adjust based on business logic
    totalCost: item.totalCost,
  }));

  // Create SalesTransaction
  const salesTransaction = new mongoose.model('SalesTransaction')({
    orderId: order.orderId,
    warehouseId: order.fulfillingWarehouse,
    products: salesProductsData,
    paymentStatus: order.paymentDetails ? order.paymentDetails.paymentStatus : 'Pending',
    paymentDetails: order.paymentDetails || {},
    notes: order.adminRemarks || order.customerRemarks || '',
  });

  await salesTransaction.save({ session });

  // Prepare StockTransaction data
  const stockOutProducts = order.orderItems.map(item => ({
    productId: item.productId,
    variantId: item.variantId || null,
    quantity: item.quantity,
    unit: 'units', // Adjust based on unit logic
    unitPrice: item.unitPrice,
  }));

  // Create StockTransaction
  const stockOutTransaction = new mongoose.model('StockTransaction')({
    transactionType: 'stockOut',
    warehouseId: order.fulfillingWarehouse,
    products: stockOutProducts,
    performedBy: 'System', // Adjust based on your logic
    notes: `Stock out for order ${order.orderId}`,
    relatedTransactionType: 'SalesTransaction',
    relatedTransaction: salesTransaction._id,
  });

  await stockOutTransaction.save({ session });

  // Link StockTransaction to SalesTransaction
  salesTransaction.stockTransaction = stockOutTransaction._id;
  await salesTransaction.save({ session });
}

// Indexes for Optimization
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ farmerId: 1 });
OrderSchema.index({ fulfillingWarehouse: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ orderDate: -1 });

module.exports = mongoose.model('Order', OrderSchema);
