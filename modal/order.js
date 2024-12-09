const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Subschema for Address (if not already defined)
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
  variantId: { type: String, required: false, ref: 'Product.variants' }, // Added variantId reference
  productName: { type: String, required: true }, // Captured at order time
  sku: { type: String, required: false }, // SKU of the variant
  size: { type: String, required: false }, // Size from variant
  unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] }, // Captured at order time
  finalPrice: { type: Number, required: true, min: [0, 'Final price cannot be negative'] }, // Captured at order time
  quantity: { type: Number, required: true, default: 1, min: [1, 'Quantity must be at least 1'] },
  totalPrice: { type: Number, required: true, min: [0, 'Total price cannot be negative'] }, // Calculated
  weight: { type: Number, required: false }, // Weight per item from variant
  totalItemWeight: { type: Number, required: false }, // Calculated: weight * quantity
  hazardous: { type: Boolean, required: false, default: false }, // From product
  fragile: { type: Boolean, required: false, default: false }, // From product
  itemType: { type: String, required: false, enum: ['Chemical', 'Fertilizer', 'Tool', 'Gardening Equipment', 'Others'] }, // From product
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
  distance: { type: Number, required: false }, // Distance in kilometers
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
    orderId: { type: String, default: uuidv4, unique: true, immutable: true, trim: true }, // Made orderId default to UUID
    farmerId: { type: String, required: false, ref: 'Farmer' },
    orderItems: { type: [OrderItemSchema], required: true, validate: [arrayLimit, '{PATH} must have at least one order item.'] },
    totalQuantity: { type: Number, required: true, min: [0, 'Total quantity cannot be negative'] },
    totalWeight: { type: Number, required: true, min: [0, 'Total weight cannot be negative'] }, // Sum of all item weights
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

// Pre-save middleware to calculate totalQuantity, totalWeight, totalPrice, and totalItemWeight
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
      item.productName = product.name.en || product.name; // Assuming English as default language

      // Assign SKU from variant or product
      item.sku = variant ? variant.sku : product.sku || '';

      // Assign size from variant
      item.size = variant ? variant.size : '';

      // Assign unitPrice and finalPrice
      item.unitPrice = variant && variant.finalPrice > 0 ? variant.finalPrice : product.finalPrice > 0 ? product.finalPrice : product.price || 0;
      item.finalPrice = item.unitPrice; // Assuming finalPrice is same as unitPrice at order time

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

// Indexes for Optimization
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ farmerId: 1 });
OrderSchema.index({ fulfillingWarehouse: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ orderDate: -1 });

module.exports = mongoose.model('Order', OrderSchema);
