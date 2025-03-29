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

// New Subschema for Shipping Info Details (moved to OrderItem)
const ShippingInfoDetailsSchema = new Schema({
  shippingId: { type: String, required: false },
  fromAddress: AddressSchema,
  toAddress: AddressSchema,
  estimatedDeliveryDate: { type: Date, required: false },
  estimatedDeliveryTime: { type: String, required: false },
  threesholdDeliveryDate: { type: Date, required: false },
  deliveryType: { type: String, enum: ['Hazardous', 'Fragile'], required: false },
}, { _id: false });

// Subschema for Order Items (updated)
const OrderItemSchema = new Schema({
  orderId: { type: String, required: true }, // Added orderId for each order item
  productId: { type: String, required: true, },
  variantId: { type: String, required: false,  },
  productName: { type: String, required: true },
  sku: { type: String, required: false },
  size: { type: String, required: false },
  unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
  finalPrice: { type: Number, required: true, min: [0, 'Final price cannot be negative'] },
  quantity: { type: Number, required: true, default: 1, min: [1, 'Quantity must be at least 1'] },
  totalPrice: { type: Number, required: true, min: [0, 'Total price cannot be negative'] },
  weight: { type: Number, required: false },
  totalItemWeight: { type: Number, required: false },
  status: {
    type: String,
    enum: ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
    required: false,
  },
  hazardous: { type: Boolean, required: false, default: false },
  fragile: { type: Boolean, required: false, default: false },
  itemType: { type: String, required: false, enum: ['Chemical', 'Fertilizer', 'Tool', 'Gardening Equipment', 'Others'] },
  fulfillingWarehouseId: { type: String, required: true, ref: 'Warehouse' },
  shippingInfoDetails: { type: ShippingInfoDetailsSchema, required: false } // New shipping info per order item
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

// Main Order Schema (removed shippingDetails field)
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
    orderDate: { type: Date, default: Date.now, required: true },
    shippedDate: { type: Date, required: false },
    deliveredDate: { type: Date, required: false },
    cancelledDate: { type: Date, required: false },
    returnedDate: { type: Date, required: false },
    reasonForCancellation: { type: String, required: false },
    reasonForReturn: { type: String, required: false },
    customerRemarks: { type: String, required: false },
    adminRemarks: { type: String, required: false },
    // shippingDetails removed from main OrderSchema
  },
  { timestamps: true }
);

// Custom validator to ensure at least one order item
function arrayLimit(val) {
  return val.length > 0;
}

// Pre-save middleware to calculate totals and assign orderId to orderItems if missing
OrderSchema.pre('save', async function (next) {
  let totalQuantity = 0;
  let totalWeight = 0;
  let totalPrice = 0;

  try {
    for (let item of this.orderItems) {
      // Ensure each order item has the parent orderId
      if (!item.orderId) {
        item.orderId = this.orderId;
      }

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
      item.productName = product.name.en || product.name;

      // Assign SKU from variant or product
      item.sku = variant ? variant.sku : product.sku || '';

      // Assign size from variant
      item.size = variant ? variant.size : '';

      // Assign unitPrice and finalPrice
      item.unitPrice = variant && variant.finalPrice > 0 ? variant.finalPrice : 
                       product.finalPrice > 0 ? product.finalPrice : 
                       product.price || 0;
      item.finalPrice = item.unitPrice;

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

    // Iterate through each OrderItem to handle transactions per warehouse
    for (let item of doc.orderItems) {
      const existingSalesTx = await mongoose.model('SalesTransaction').findOne({ orderId: doc.orderId, productId: item.productId, warehouseId: item.fulfillingWarehouseId }).session(session);
      if (!existingSalesTx) {
        try {
          await createSalesAndStockTransaction(doc, item, session);
        } catch (error) {
          console.error('Error creating SalesTransaction and StockTransaction:', error);
          return next(error);
        }
      }
    }
  }
  next();
});

// Post 'findOneAndUpdate' hook to handle 'Delivered' status
OrderSchema.post('findOneAndUpdate', async function(doc, next) {
  if (!doc) return next();

  if (doc.orderStatus === 'Delivered') {
    const session = this.getOptions().session;
    if (!session) {
      console.error('No session available for creating SalesTransaction and StockTransaction.');
      return next();
    }

    for (let item of doc.orderItems) {
      const existingSalesTx = await mongoose.model('SalesTransaction').findOne({ orderId: doc.orderId, productId: item.productId, warehouseId: item.fulfillingWarehouseId }).session(session);
      if (!existingSalesTx) {
        try {
          await createSalesAndStockTransaction(doc, item, session);
        } catch (error) {
          console.error('Error creating SalesTransaction and StockTransaction:', error);
          return next(error);
        }
      }
    }
  }
  next();
});

// Helper function to create SalesTransaction and StockTransaction
async function createSalesAndStockTransaction(order, item, session) {
  const salesProductsData = [{
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    taxes: 0, // Adjust based on business logic
    otherCharges: 0, // Adjust based on business logic
    totalCost: item.totalCost, // Ensure totalCost is defined or calculate accordingly
  }];

  const SalesTransaction = mongoose.model('SalesTransaction');
  const salesTransaction = new SalesTransaction({
    orderId: order.orderId,
    productId: item.productId,
    warehouseId: item.fulfillingWarehouseId,
    products: salesProductsData,
    paymentStatus: order.paymentDetails ? order.paymentDetails.paymentStatus : 'Pending',
    paymentDetails: order.paymentDetails || {},
    notes: order.adminRemarks || order.customerRemarks || '',
  });
  await salesTransaction.save({ session });

  const stockOutProducts = [{
    productId: item.productId,
    variantId: item.variantId || null,
    quantity: item.quantity,
    unit: 'units', // Adjust based on unit logic
    unitPrice: item.unitPrice,
  }];

  const StockTransaction = mongoose.model('StockTransaction');
  const stockOutTransaction = new StockTransaction({
    transactionType: 'stockOut',
    warehouseId: item.fulfillingWarehouseId,
    products: stockOutProducts,
    performedBy: 'System', // Adjust based on your logic
    notes: `Stock out for order ${order.orderId}, product ${item.productId}`,
    relatedTransactionType: 'SalesTransaction',
    relatedTransaction: salesTransaction._id,
  });
  await stockOutTransaction.save({ session });

  salesTransaction.stockTransaction = stockOutTransaction._id;
  await salesTransaction.save({ session });
}

// Indexes for Optimization
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ farmerId: 1 });
OrderSchema.index({ 'orderItems.fulfillingWarehouseId': 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ orderDate: -1 });

module.exports = mongoose.model('Order', OrderSchema);
